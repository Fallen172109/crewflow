-- Add detailed analytics tables for comprehensive AI usage tracking
-- This extends the existing agent_usage table with more granular data

-- Create detailed usage tracking table with enhanced fields for AI analytics
CREATE TABLE IF NOT EXISTS public.agent_usage_detailed (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    agent_id TEXT NOT NULL,
    agent_name TEXT NOT NULL,
    framework TEXT NOT NULL CHECK (framework IN ('langchain', 'perplexity', 'autogen', 'hybrid')),
    provider TEXT NOT NULL CHECK (provider IN ('openai', 'perplexity', 'anthropic', 'google', 'other')),
    message_type TEXT NOT NULL CHECK (message_type IN ('chat', 'preset_action', 'tool_execution')),
    input_tokens INTEGER DEFAULT 0,
    output_tokens INTEGER DEFAULT 0,
    total_tokens INTEGER GENERATED ALWAYS AS (input_tokens + output_tokens) STORED,
    cost_usd DECIMAL(10,6) DEFAULT 0,
    response_time_ms INTEGER DEFAULT 0,
    success BOOLEAN DEFAULT true,
    error_message TEXT DEFAULT NULL,
    request_metadata JSONB DEFAULT '{}',
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create performance metrics summary table for daily aggregations
CREATE TABLE IF NOT EXISTS public.agent_performance_metrics (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    agent_id TEXT NOT NULL,
    agent_name TEXT NOT NULL,
    framework TEXT NOT NULL,
    provider TEXT NOT NULL,
    date DATE NOT NULL,
    total_requests INTEGER DEFAULT 0,
    successful_requests INTEGER DEFAULT 0,
    failed_requests INTEGER DEFAULT 0,
    total_input_tokens INTEGER DEFAULT 0,
    total_output_tokens INTEGER DEFAULT 0,
    total_tokens INTEGER DEFAULT 0,
    total_cost_usd DECIMAL(10,6) DEFAULT 0,
    avg_response_time_ms INTEGER DEFAULT 0,
    popular_actions JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, agent_id, date)
);

-- Create system-wide analytics table for admin insights
CREATE TABLE IF NOT EXISTS public.system_analytics (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    date DATE NOT NULL UNIQUE,
    total_users INTEGER DEFAULT 0,
    active_users INTEGER DEFAULT 0,
    new_users INTEGER DEFAULT 0,
    total_requests INTEGER DEFAULT 0,
    successful_requests INTEGER DEFAULT 0,
    failed_requests INTEGER DEFAULT 0,
    total_input_tokens INTEGER DEFAULT 0,
    total_output_tokens INTEGER DEFAULT 0,
    total_tokens INTEGER DEFAULT 0,
    total_cost_usd DECIMAL(12,6) DEFAULT 0,
    cost_by_provider JSONB DEFAULT '{}',
    avg_response_time_ms INTEGER DEFAULT 0,
    success_rate DECIMAL(5,2) DEFAULT 0,
    popular_agents JSONB DEFAULT '[]',
    framework_usage JSONB DEFAULT '{}',
    provider_usage JSONB DEFAULT '{}',
    top_users_by_usage JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_agent_usage_detailed_user_timestamp 
ON public.agent_usage_detailed(user_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_agent_usage_detailed_agent_timestamp 
ON public.agent_usage_detailed(agent_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_agent_usage_detailed_success
ON public.agent_usage_detailed(success, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_agent_usage_detailed_framework
ON public.agent_usage_detailed(framework);

CREATE INDEX IF NOT EXISTS idx_agent_usage_detailed_provider
ON public.agent_usage_detailed(provider);

CREATE INDEX IF NOT EXISTS idx_agent_usage_detailed_message_type
ON public.agent_usage_detailed(message_type);

CREATE INDEX IF NOT EXISTS idx_agent_usage_detailed_cost
ON public.agent_usage_detailed(cost_usd DESC);

CREATE INDEX IF NOT EXISTS idx_agent_usage_detailed_tokens
ON public.agent_usage_detailed(total_tokens DESC);

CREATE INDEX IF NOT EXISTS idx_agent_performance_metrics_user_date
ON public.agent_performance_metrics(user_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_agent_performance_metrics_agent_date
ON public.agent_performance_metrics(agent_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_agent_performance_metrics_framework
ON public.agent_performance_metrics(framework);

CREATE INDEX IF NOT EXISTS idx_agent_performance_metrics_provider
ON public.agent_performance_metrics(provider);

CREATE INDEX IF NOT EXISTS idx_system_analytics_date
ON public.system_analytics(date DESC);

-- Create updated_at trigger for performance metrics
CREATE TRIGGER update_agent_performance_metrics_updated_at
    BEFORE UPDATE ON public.agent_performance_metrics
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_system_analytics_updated_at
    BEFORE UPDATE ON public.system_analytics
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE public.agent_usage_detailed ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_analytics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for agent_usage_detailed
CREATE POLICY "Users can view their own detailed usage" ON public.agent_usage_detailed
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own detailed usage" ON public.agent_usage_detailed
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all detailed usage" ON public.agent_usage_detailed
    FOR ALL USING (public.is_admin());

-- RLS Policies for agent_performance_metrics
CREATE POLICY "Users can view their own performance metrics" ON public.agent_performance_metrics
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all performance metrics" ON public.agent_performance_metrics
    FOR ALL USING (public.is_admin());

-- RLS Policies for system_analytics (admin only)
CREATE POLICY "Admins can view system analytics" ON public.system_analytics
    FOR ALL USING (public.is_admin());

-- Function to aggregate daily performance metrics
CREATE OR REPLACE FUNCTION public.aggregate_daily_performance_metrics(
    p_date DATE DEFAULT CURRENT_DATE - INTERVAL '1 day'
)
RETURNS VOID AS $$
BEGIN
    -- Aggregate user-agent performance for the specified date
    INSERT INTO public.agent_performance_metrics (
        user_id,
        agent_id,
        agent_name,
        framework,
        provider,
        date,
        total_requests,
        successful_requests,
        failed_requests,
        total_input_tokens,
        total_output_tokens,
        total_tokens,
        total_cost_usd,
        avg_response_time_ms,
        popular_actions
    )
    SELECT
        user_id,
        agent_id,
        agent_name,
        framework,
        provider,
        p_date,
        COUNT(*) as total_requests,
        COUNT(*) FILTER (WHERE success = true) as successful_requests,
        COUNT(*) FILTER (WHERE success = false) as failed_requests,
        SUM(input_tokens) as total_input_tokens,
        SUM(output_tokens) as total_output_tokens,
        SUM(total_tokens) as total_tokens,
        SUM(cost_usd) as total_cost_usd,
        AVG(response_time_ms) as avg_response_time_ms,
        COALESCE(
            jsonb_agg(
                DISTINCT (request_metadata->>'action')
            ) FILTER (WHERE request_metadata->>'action' IS NOT NULL),
            '[]'::jsonb
        ) as popular_actions
    FROM public.agent_usage_detailed
    WHERE DATE(timestamp) = p_date
    GROUP BY user_id, agent_id, agent_name, framework, provider
    ON CONFLICT (user_id, agent_id, date)
    DO UPDATE SET
        total_requests = EXCLUDED.total_requests,
        successful_requests = EXCLUDED.successful_requests,
        failed_requests = EXCLUDED.failed_requests,
        total_input_tokens = EXCLUDED.total_input_tokens,
        total_output_tokens = EXCLUDED.total_output_tokens,
        total_tokens = EXCLUDED.total_tokens,
        total_cost_usd = EXCLUDED.total_cost_usd,
        avg_response_time_ms = EXCLUDED.avg_response_time_ms,
        popular_actions = EXCLUDED.popular_actions,
        updated_at = NOW();

    -- Aggregate system-wide analytics
    INSERT INTO public.system_analytics (
        date,
        total_users,
        active_users,
        new_users,
        total_requests,
        successful_requests,
        failed_requests,
        total_input_tokens,
        total_output_tokens,
        total_tokens,
        total_cost_usd,
        cost_by_provider,
        avg_response_time_ms,
        success_rate,
        popular_agents,
        framework_usage,
        provider_usage,
        top_users_by_usage
    )
    SELECT
        p_date,
        (SELECT COUNT(DISTINCT id) FROM public.users WHERE DATE(created_at) <= p_date) as total_users,
        COUNT(DISTINCT user_id) as active_users,
        (SELECT COUNT(DISTINCT id) FROM public.users WHERE DATE(created_at) = p_date) as new_users,
        COUNT(*) as total_requests,
        COUNT(*) FILTER (WHERE success = true) as successful_requests,
        COUNT(*) FILTER (WHERE success = false) as failed_requests,
        SUM(input_tokens) as total_input_tokens,
        SUM(output_tokens) as total_output_tokens,
        SUM(total_tokens) as total_tokens,
        SUM(cost_usd) as total_cost_usd,
        jsonb_object_agg(provider, provider_cost) as cost_by_provider,
        AVG(response_time_ms) as avg_response_time_ms,
        (COUNT(*) FILTER (WHERE success = true) * 100.0 / COUNT(*)) as success_rate,
        jsonb_build_object(
            'agents',
            jsonb_agg(
                jsonb_build_object(
                    'agent_id', agent_id,
                    'requests', agent_requests
                )
                ORDER BY agent_requests DESC
            )
        ) as popular_agents,
        jsonb_build_object(
            'frameworks',
            jsonb_object_agg(
                CASE agent_id
                    WHEN 'coral' THEN 'langchain'
                    WHEN 'mariner' THEN 'hybrid'
                    WHEN 'tide' THEN 'autogen'
                    WHEN 'morgan' THEN 'langchain'
                    WHEN 'pearl' THEN 'perplexity'
                    WHEN 'splash' THEN 'hybrid'
                    WHEN 'flint' THEN 'autogen'
                    WHEN 'drake' THEN 'hybrid'
                    WHEN 'sage' THEN 'langchain'
                    WHEN 'anchor' THEN 'hybrid'
                    WHEN 'beacon' THEN 'autogen'
                    WHEN 'helm' THEN 'langchain'
                    WHEN 'ledger' THEN 'langchain'
                    WHEN 'patch' THEN 'langchain'
                    ELSE 'unknown'
                END,
                agent_requests
            )
        ) as framework_usage
    FROM (
        SELECT 
            user_id,
            agent_id,
            COUNT(*) as agent_requests
        FROM public.agent_usage_detailed
        WHERE DATE(timestamp) = p_date
        GROUP BY user_id, agent_id
    ) daily_stats
    ON CONFLICT (date)
    DO UPDATE SET
        total_users = EXCLUDED.total_users,
        active_users = EXCLUDED.active_users,
        total_requests = EXCLUDED.total_requests,
        total_cost = EXCLUDED.total_cost,
        avg_response_time = EXCLUDED.avg_response_time,
        success_rate = EXCLUDED.success_rate,
        popular_agents = EXCLUDED.popular_agents,
        framework_usage = EXCLUDED.framework_usage,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user analytics summary
CREATE OR REPLACE FUNCTION public.get_user_analytics_summary(
    p_user_id UUID,
    p_days INTEGER DEFAULT 30
)
RETURNS TABLE (
    total_requests BIGINT,
    total_cost NUMERIC,
    avg_response_time NUMERIC,
    success_rate NUMERIC,
    most_used_agent TEXT,
    agent_breakdown JSONB
) AS $$
BEGIN
    RETURN QUERY
    WITH user_stats AS (
        SELECT 
            COUNT(*) as total_reqs,
            SUM(cost) as total_cost_sum,
            AVG(response_time) as avg_resp_time,
            (COUNT(*) FILTER (WHERE success = true) * 100.0 / COUNT(*)) as success_pct
        FROM public.agent_usage_detailed
        WHERE user_id = p_user_id
        AND timestamp >= NOW() - (p_days || ' days')::INTERVAL
    ),
    agent_stats AS (
        SELECT 
            agent_id,
            COUNT(*) as requests,
            SUM(cost) as cost,
            AVG(response_time) as avg_response_time,
            (COUNT(*) FILTER (WHERE success = true) * 100.0 / COUNT(*)) as success_rate
        FROM public.agent_usage_detailed
        WHERE user_id = p_user_id
        AND timestamp >= NOW() - (p_days || ' days')::INTERVAL
        GROUP BY agent_id
        ORDER BY requests DESC
    )
    SELECT 
        us.total_reqs,
        ROUND(us.total_cost_sum, 4),
        ROUND(us.avg_resp_time, 3),
        ROUND(us.success_pct, 2),
        (SELECT agent_id FROM agent_stats LIMIT 1),
        jsonb_agg(
            jsonb_build_object(
                'agent_id', as_table.agent_id,
                'requests', as_table.requests,
                'cost', ROUND(as_table.cost, 4),
                'avg_response_time', ROUND(as_table.avg_response_time, 3),
                'success_rate', ROUND(as_table.success_rate, 2)
            )
        )
    FROM user_stats us
    CROSS JOIN agent_stats as_table
    GROUP BY us.total_reqs, us.total_cost_sum, us.avg_resp_time, us.success_pct;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON public.agent_usage_detailed TO authenticated;
GRANT SELECT ON public.agent_performance_metrics TO authenticated;
GRANT SELECT ON public.system_analytics TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_analytics_summary TO authenticated;
