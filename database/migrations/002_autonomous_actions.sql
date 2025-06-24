-- Migration: Add Autonomous Actions Support
-- Enables AI agents to perform actions autonomously with user permissions

-- Table for tracking autonomous actions performed by AI agents
CREATE TABLE IF NOT EXISTS public.agent_actions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    agent_id TEXT NOT NULL, -- e.g., 'splash', 'coral', 'anchor'
    integration_id TEXT NOT NULL, -- e.g., 'facebook-business', 'google-ads'
    action_type TEXT NOT NULL, -- e.g., 'create_post', 'reply_comment', 'create_ad'
    action_description TEXT NOT NULL,
    status TEXT DEFAULT 'completed', -- 'pending', 'executing', 'completed', 'failed'
    
    -- Action metadata
    metadata JSONB DEFAULT '{}', -- Stores action details, results, errors
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Indexing for performance
    CONSTRAINT valid_status CHECK (status IN ('pending', 'executing', 'completed', 'failed'))
);

-- Table for managing user permissions for autonomous actions
CREATE TABLE IF NOT EXISTS public.action_permissions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    integration_id TEXT NOT NULL,
    action_type TEXT NOT NULL,
    enabled BOOLEAN DEFAULT false,
    
    -- Rate limiting
    max_frequency TEXT, -- 'hourly', 'daily', 'weekly'
    restrictions JSONB DEFAULT '{}', -- Custom restrictions like maxActions, timeWindows
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure unique permission per user/integration/action
    UNIQUE(user_id, integration_id, action_type)
);

-- Table for scheduled autonomous actions
CREATE TABLE IF NOT EXISTS public.autonomous_actions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    agent_id TEXT NOT NULL,
    integration_id TEXT NOT NULL,
    action_type TEXT NOT NULL,
    action_data JSONB NOT NULL, -- The data needed to execute the action
    
    -- Scheduling
    status TEXT DEFAULT 'pending',
    scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
    executed_at TIMESTAMP WITH TIME ZONE,
    
    -- Results
    result JSONB,
    error TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT valid_autonomous_status CHECK (status IN ('pending', 'executing', 'completed', 'failed', 'cancelled'))
);

-- Table for OAuth audit logging (enhanced)
CREATE TABLE IF NOT EXISTS public.oauth_audit_log (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    integration_id TEXT NOT NULL,
    event_type TEXT NOT NULL, -- 'connection_attempt', 'connection_completed', 'connection_failed', 'token_refresh'
    event_description TEXT,
    
    -- Request metadata
    ip_address INET,
    user_agent TEXT,
    
    -- OAuth specific data
    scopes_requested TEXT[],
    scopes_granted TEXT[],
    error_code TEXT,
    error_message TEXT,
    
    -- Additional metadata
    metadata JSONB DEFAULT '{}',
    
    -- Timestamp
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_agent_actions_user_id ON public.agent_actions(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_actions_agent_id ON public.agent_actions(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_actions_integration_id ON public.agent_actions(integration_id);
CREATE INDEX IF NOT EXISTS idx_agent_actions_created_at ON public.agent_actions(created_at);

CREATE INDEX IF NOT EXISTS idx_action_permissions_user_id ON public.action_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_action_permissions_integration_id ON public.action_permissions(integration_id);

CREATE INDEX IF NOT EXISTS idx_autonomous_actions_user_id ON public.autonomous_actions(user_id);
CREATE INDEX IF NOT EXISTS idx_autonomous_actions_scheduled_for ON public.autonomous_actions(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_autonomous_actions_status ON public.autonomous_actions(status);

CREATE INDEX IF NOT EXISTS idx_oauth_audit_log_user_id ON public.oauth_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_oauth_audit_log_integration_id ON public.oauth_audit_log(integration_id);
CREATE INDEX IF NOT EXISTS idx_oauth_audit_log_created_at ON public.oauth_audit_log(created_at);

-- Row Level Security (RLS) policies
ALTER TABLE public.agent_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.action_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.autonomous_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.oauth_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for agent_actions
CREATE POLICY "Users can view their own agent actions" ON public.agent_actions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert agent actions" ON public.agent_actions
    FOR INSERT WITH CHECK (true);

-- RLS Policies for action_permissions
CREATE POLICY "Users can view their own action permissions" ON public.action_permissions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own action permissions" ON public.action_permissions
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "System can insert action permissions" ON public.action_permissions
    FOR INSERT WITH CHECK (true);

-- RLS Policies for autonomous_actions
CREATE POLICY "Users can view their own autonomous actions" ON public.autonomous_actions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can manage autonomous actions" ON public.autonomous_actions
    FOR ALL WITH CHECK (true);

-- RLS Policies for oauth_audit_log
CREATE POLICY "Users can view their own OAuth audit log" ON public.oauth_audit_log
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert OAuth audit log" ON public.oauth_audit_log
    FOR INSERT WITH CHECK (true);

-- Function to automatically grant default permissions when user connects an integration
CREATE OR REPLACE FUNCTION grant_default_autonomous_permissions()
RETURNS TRIGGER AS $$
BEGIN
    -- Grant default permissions for Facebook Business
    IF NEW.integration_id = 'facebook-business' AND NEW.status = 'connected' THEN
        INSERT INTO public.action_permissions (user_id, integration_id, action_type, enabled, max_frequency, restrictions)
        VALUES 
            (NEW.user_id, 'facebook-business', 'create_post', true, 'daily', '{"maxActions": 5}'),
            (NEW.user_id, 'facebook-business', 'reply_comment', true, 'hourly', '{"maxActions": 20}'),
            (NEW.user_id, 'facebook-business', 'get_insights', true, 'hourly', '{"maxActions": 100}')
        ON CONFLICT (user_id, integration_id, action_type) DO NOTHING;
    END IF;
    
    -- Grant default permissions for other integrations as they're added
    -- Add more integration-specific permissions here
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically grant permissions when user connects an integration
CREATE TRIGGER trigger_grant_default_permissions
    AFTER INSERT OR UPDATE ON public.api_connections
    FOR EACH ROW
    WHEN (NEW.status = 'connected')
    EXECUTE FUNCTION grant_default_autonomous_permissions();

-- Function to clean up old audit logs (optional, for maintenance)
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs()
RETURNS void AS $$
BEGIN
    DELETE FROM public.oauth_audit_log 
    WHERE created_at < NOW() - INTERVAL '90 days';
    
    DELETE FROM public.agent_actions 
    WHERE created_at < NOW() - INTERVAL '180 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comments for documentation
COMMENT ON TABLE public.agent_actions IS 'Tracks all actions performed by AI agents autonomously';
COMMENT ON TABLE public.action_permissions IS 'Manages user permissions for autonomous AI agent actions';
COMMENT ON TABLE public.autonomous_actions IS 'Scheduled autonomous actions to be executed by AI agents';
COMMENT ON TABLE public.oauth_audit_log IS 'Audit trail for OAuth connections and token operations';

COMMENT ON COLUMN public.agent_actions.metadata IS 'Stores action details, results, and error information in JSON format';
COMMENT ON COLUMN public.action_permissions.restrictions IS 'Custom restrictions like rate limits, time windows, etc.';
COMMENT ON COLUMN public.autonomous_actions.action_data IS 'The data payload needed to execute the scheduled action';
