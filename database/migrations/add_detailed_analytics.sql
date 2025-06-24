-- Add detailed analytics tables for comprehensive usage tracking
-- This extends the existing agent_usage table with more granular data

-- Create detailed usage tracking table
CREATE TABLE IF NOT EXISTS public.agent_usage_detailed (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    agent_id TEXT NOT NULL,
    message_type TEXT NOT NULL CHECK (message_type IN ('chat', 'preset_action')),
    tokens_used INTEGER DEFAULT 0,
    cost DECIMAL(10,4) DEFAULT 0,
    response_time DECIMAL(8,3) DEFAULT 0, -- in seconds
    success BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}',
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create performance metrics summary table
CREATE TABLE IF NOT EXISTS public.agent_performance_metrics (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    agent_id TEXT NOT NULL,
    date DATE NOT NULL,
    total_requests INTEGER DEFAULT 0,
    successful_requests INTEGER DEFAULT 0,
    failed_requests INTEGER DEFAULT 0,
    total_tokens INTEGER DEFAULT 0,
    total_cost DECIMAL(10,4) DEFAULT 0,
    avg_response_time DECIMAL(8,3) DEFAULT 0,
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
    total_requests INTEGER DEFAULT 0,
    total_cost DECIMAL(12,4) DEFAULT 0,
    avg_response_time DECIMAL(8,3) DEFAULT 0,
    success_rate DECIMAL(5,2) DEFAULT 0,
    popular_agents JSONB DEFAULT '[]',
    framework_usage JSONB DEFAULT '{}',
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

CREATE INDEX IF NOT EXISTS idx_agent_performance_metrics_user_date 
ON public.agent_performance_metrics(user_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_agent_performance_metrics_agent_date 
ON public.agent_performance_metrics(agent_id, date DESC);

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
        date,
        total_requests,
        successful_requests,
        failed_requests,
        total_tokens,
        total_cost,
        avg_response_time,
        popular_actions
    )
    SELECT 
        user_id,
        agent_id,
        p_date,
        COUNT(*) as total_requests,
        COUNT(*) FILTER (WHERE success = true) as successful_requests,
        COUNT(*) FILTER (WHERE success = false) as failed_requests,
        SUM(tokens_used) as total_tokens,
        SUM(cost) as total_cost,
        AVG(response_time) as avg_response_time,
        COALESCE(
            jsonb_agg(
                DISTINCT (metadata->>'action')
            ) FILTER (WHERE metadata->>'action' IS NOT NULL),
            '[]'::jsonb
        ) as popular_actions
    FROM public.agent_usage_detailed
    WHERE DATE(timestamp) = p_date
    GROUP BY user_id, agent_id
    ON CONFLICT (user_id, agent_id, date)
    DO UPDATE SET
        total_requests = EXCLUDED.total_requests,
        successful_requests = EXCLUDED.successful_requests,
        failed_requests = EXCLUDED.failed_requests,
        total_tokens = EXCLUDED.total_tokens,
        total_cost = EXCLUDED.total_cost,
        avg_response_time = EXCLUDED.avg_response_time,
        popular_actions = EXCLUDED.popular_actions,
        updated_at = NOW();

    -- Aggregate system-wide analytics
    INSERT INTO public.system_analytics (
        date,
        total_users,
        active_users,
        total_requests,
        total_cost,
        avg_response_time,
        success_rate,
        popular_agents,
        framework_usage
    )
    SELECT 
        p_date,
        (SELECT COUNT(DISTINCT id) FROM public.users WHERE DATE(created_at) <= p_date) as total_users,
        COUNT(DISTINCT user_id) as active_users,
        COUNT(*) as total_requests,
        SUM(cost) as total_cost,
        AVG(response_time) as avg_response_time,
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
