-- Agent Permission Settings Table
-- Stores user preferences for agent autonomous actions and approval requirements

CREATE TABLE IF NOT EXISTS agent_permission_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    agent_id TEXT NOT NULL,
    agent_name TEXT NOT NULL,
    integration_id TEXT NOT NULL,
    integration_name TEXT NOT NULL,
    
    -- Approval settings
    always_require_confirmation BOOLEAN DEFAULT FALSE,
    auto_approve_low_risk BOOLEAN DEFAULT TRUE,
    auto_approve_medium_risk BOOLEAN DEFAULT FALSE,
    
    -- Action limits
    max_autonomous_actions INTEGER DEFAULT 10,
    autonomous_action_frequency TEXT DEFAULT 'daily' CHECK (autonomous_action_frequency IN ('hourly', 'daily', 'weekly')),
    
    -- Restricted actions (JSON array of action types)
    restricted_actions JSONB DEFAULT '[]'::jsonb,
    
    -- Emergency controls
    emergency_stop_enabled BOOLEAN DEFAULT TRUE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure unique combination per user/agent/integration
    UNIQUE(user_id, agent_id, integration_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_agent_permission_settings_user_id ON agent_permission_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_permission_settings_agent_id ON agent_permission_settings(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_permission_settings_integration_id ON agent_permission_settings(integration_id);

-- Enable RLS (Row Level Security)
ALTER TABLE agent_permission_settings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own agent permission settings" ON agent_permission_settings
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own agent permission settings" ON agent_permission_settings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own agent permission settings" ON agent_permission_settings
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own agent permission settings" ON agent_permission_settings
    FOR DELETE USING (auth.uid() = user_id);

-- Function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_agent_permission_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_agent_permission_settings_updated_at
    BEFORE UPDATE ON agent_permission_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_agent_permission_settings_updated_at();

-- Insert default settings for existing users (optional)
-- This can be run after the table is created to populate defaults for existing users
/*
INSERT INTO agent_permission_settings (user_id, agent_id, agent_name, integration_id, integration_name)
SELECT 
    u.id as user_id,
    'anchor' as agent_id,
    'Anchor' as agent_name,
    'shopify' as integration_id,
    'Shopify' as integration_name
FROM auth.users u
WHERE NOT EXISTS (
    SELECT 1 FROM agent_permission_settings aps 
    WHERE aps.user_id = u.id AND aps.agent_id = 'anchor' AND aps.integration_id = 'shopify'
);

-- Repeat for other agents
INSERT INTO agent_permission_settings (user_id, agent_id, agent_name, integration_id, integration_name)
SELECT 
    u.id as user_id,
    agent_data.agent_id,
    agent_data.agent_name,
    'shopify' as integration_id,
    'Shopify' as integration_name
FROM auth.users u
CROSS JOIN (
    VALUES 
        ('pearl', 'Pearl'),
        ('flint', 'Flint'),
        ('splash', 'Splash'),
        ('drake', 'Drake')
) AS agent_data(agent_id, agent_name)
WHERE NOT EXISTS (
    SELECT 1 FROM agent_permission_settings aps 
    WHERE aps.user_id = u.id 
    AND aps.agent_id = agent_data.agent_id 
    AND aps.integration_id = 'shopify'
);
*/
