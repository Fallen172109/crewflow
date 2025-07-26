-- Automation and Scheduling Tables
-- Tables for managing scheduled tasks, executions, and automation workflows

-- Scheduled Tasks Table
CREATE TABLE IF NOT EXISTS scheduled_tasks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    agent_id TEXT NOT NULL,
    
    -- Task configuration
    name TEXT NOT NULL,
    description TEXT,
    task_type TEXT NOT NULL CHECK (task_type IN (
        'inventory_check', 'price_optimization', 'order_fulfillment', 
        'marketing_automation', 'data_sync', 'custom'
    )),
    
    -- Scheduling
    frequency TEXT NOT NULL CHECK (frequency IN ('hourly', 'daily', 'weekly', 'monthly', 'custom')),
    cron_expression TEXT,
    timezone TEXT DEFAULT 'UTC',
    
    -- Configuration
    enabled BOOLEAN DEFAULT TRUE,
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    max_retries INTEGER DEFAULT 3,
    timeout INTEGER DEFAULT 300000, -- 5 minutes in milliseconds
    
    -- Parameters and conditions
    parameters JSONB DEFAULT '{}'::jsonb,
    conditions JSONB DEFAULT '{}'::jsonb,
    
    -- Execution tracking
    last_run TIMESTAMP WITH TIME ZONE,
    next_run TIMESTAMP WITH TIME ZONE,
    run_count INTEGER DEFAULT 0,
    success_count INTEGER DEFAULT 0,
    failure_count INTEGER DEFAULT 0,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_cron_for_custom CHECK (
        frequency != 'custom' OR cron_expression IS NOT NULL
    )
);

-- Task Executions Table
CREATE TABLE IF NOT EXISTS task_executions (
    id TEXT PRIMARY KEY,
    task_id UUID REFERENCES scheduled_tasks(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    agent_id TEXT NOT NULL,
    
    -- Execution details
    status TEXT NOT NULL CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
    started_at TIMESTAMP WITH TIME ZONE NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE,
    duration INTEGER, -- milliseconds
    
    -- Results and errors
    result JSONB,
    error TEXT,
    logs TEXT[] DEFAULT ARRAY[]::TEXT[],
    
    -- Resource usage
    resources_used JSONB DEFAULT '{
        "requests": 0,
        "cost": 0,
        "processingTime": 0
    }'::jsonb,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Automation Workflows Table
CREATE TABLE IF NOT EXISTS automation_workflows (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    
    -- Workflow details
    name TEXT NOT NULL,
    description TEXT,
    category TEXT DEFAULT 'custom',
    
    -- Workflow definition
    trigger_config JSONB NOT NULL, -- What triggers this workflow
    steps JSONB NOT NULL, -- Array of workflow steps
    
    -- Configuration
    enabled BOOLEAN DEFAULT TRUE,
    version INTEGER DEFAULT 1,
    
    -- Execution settings
    max_concurrent_runs INTEGER DEFAULT 1,
    timeout INTEGER DEFAULT 600000, -- 10 minutes
    retry_policy JSONB DEFAULT '{
        "maxRetries": 3,
        "backoffMultiplier": 2,
        "initialDelay": 1000
    }'::jsonb,
    
    -- Statistics
    total_runs INTEGER DEFAULT 0,
    successful_runs INTEGER DEFAULT 0,
    failed_runs INTEGER DEFAULT 0,
    last_run_at TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Workflow Executions Table
CREATE TABLE IF NOT EXISTS workflow_executions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    workflow_id UUID REFERENCES automation_workflows(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    
    -- Execution details
    status TEXT NOT NULL CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
    trigger_data JSONB, -- Data that triggered the workflow
    
    -- Timing
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    duration INTEGER, -- milliseconds
    
    -- Step tracking
    current_step INTEGER DEFAULT 0,
    completed_steps INTEGER DEFAULT 0,
    total_steps INTEGER NOT NULL,
    step_results JSONB DEFAULT '[]'::jsonb,
    
    -- Results and errors
    final_result JSONB,
    error_message TEXT,
    execution_logs JSONB DEFAULT '[]'::jsonb,
    
    -- Resource usage
    resources_consumed JSONB DEFAULT '{
        "apiCalls": 0,
        "cost": 0,
        "processingTime": 0,
        "agentsInvolved": []
    }'::jsonb
);

-- Inter-Agent Collaboration Table
CREATE TABLE IF NOT EXISTS agent_collaborations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    
    -- Collaboration details
    initiating_agent_id TEXT NOT NULL,
    target_agent_id TEXT NOT NULL,
    collaboration_type TEXT NOT NULL CHECK (collaboration_type IN (
        'delegation', 'consultation', 'data_sharing', 'joint_task'
    )),
    
    -- Task details
    task_description TEXT NOT NULL,
    task_data JSONB DEFAULT '{}'::jsonb,
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    
    -- Status tracking
    status TEXT DEFAULT 'pending' CHECK (status IN (
        'pending', 'accepted', 'in_progress', 'completed', 'rejected', 'failed'
    )),
    
    -- Results
    result JSONB,
    feedback TEXT,
    
    -- Timing
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    responded_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Automation Triggers Table
CREATE TABLE IF NOT EXISTS automation_triggers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    
    -- Trigger configuration
    name TEXT NOT NULL,
    trigger_type TEXT NOT NULL CHECK (trigger_type IN (
        'schedule', 'webhook', 'data_change', 'threshold', 'event', 'manual'
    )),
    
    -- Trigger conditions
    conditions JSONB NOT NULL,
    
    -- Associated actions
    workflow_id UUID REFERENCES automation_workflows(id) ON DELETE CASCADE,
    task_id UUID REFERENCES scheduled_tasks(id) ON DELETE CASCADE,
    
    -- Configuration
    enabled BOOLEAN DEFAULT TRUE,
    cooldown_period INTEGER DEFAULT 0, -- seconds between triggers
    
    -- Statistics
    trigger_count INTEGER DEFAULT 0,
    last_triggered_at TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT trigger_has_action CHECK (
        workflow_id IS NOT NULL OR task_id IS NOT NULL
    )
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_scheduled_tasks_user_id ON scheduled_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_tasks_enabled ON scheduled_tasks(enabled) WHERE enabled = true;
CREATE INDEX IF NOT EXISTS idx_scheduled_tasks_next_run ON scheduled_tasks(next_run) WHERE enabled = true;
CREATE INDEX IF NOT EXISTS idx_scheduled_tasks_agent_id ON scheduled_tasks(agent_id);

CREATE INDEX IF NOT EXISTS idx_task_executions_task_id ON task_executions(task_id);
CREATE INDEX IF NOT EXISTS idx_task_executions_user_id ON task_executions(user_id);
CREATE INDEX IF NOT EXISTS idx_task_executions_status ON task_executions(status);
CREATE INDEX IF NOT EXISTS idx_task_executions_started_at ON task_executions(started_at);

CREATE INDEX IF NOT EXISTS idx_automation_workflows_user_id ON automation_workflows(user_id);
CREATE INDEX IF NOT EXISTS idx_automation_workflows_enabled ON automation_workflows(enabled) WHERE enabled = true;
CREATE INDEX IF NOT EXISTS idx_automation_workflows_category ON automation_workflows(category);

CREATE INDEX IF NOT EXISTS idx_workflow_executions_workflow_id ON workflow_executions(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_user_id ON workflow_executions(user_id);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_status ON workflow_executions(status);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_started_at ON workflow_executions(started_at);

CREATE INDEX IF NOT EXISTS idx_agent_collaborations_user_id ON agent_collaborations(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_collaborations_initiating_agent ON agent_collaborations(initiating_agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_collaborations_target_agent ON agent_collaborations(target_agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_collaborations_status ON agent_collaborations(status);

CREATE INDEX IF NOT EXISTS idx_automation_triggers_user_id ON automation_triggers(user_id);
CREATE INDEX IF NOT EXISTS idx_automation_triggers_enabled ON automation_triggers(enabled) WHERE enabled = true;
CREATE INDEX IF NOT EXISTS idx_automation_triggers_type ON automation_triggers(trigger_type);

-- Enable RLS (Row Level Security)
ALTER TABLE scheduled_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_collaborations ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_triggers ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can manage their own scheduled tasks" ON scheduled_tasks
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own task executions" ON task_executions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own automation workflows" ON automation_workflows
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own workflow executions" ON workflow_executions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own agent collaborations" ON agent_collaborations
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own automation triggers" ON automation_triggers
    FOR ALL USING (auth.uid() = user_id);

-- Functions for task statistics
CREATE OR REPLACE FUNCTION increment_task_success(task_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE scheduled_tasks 
    SET 
        run_count = run_count + 1,
        success_count = success_count + 1,
        updated_at = NOW()
    WHERE id = task_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION increment_task_failure(task_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE scheduled_tasks 
    SET 
        run_count = run_count + 1,
        failure_count = failure_count + 1,
        updated_at = NOW()
    WHERE id = task_id;
END;
$$ LANGUAGE plpgsql;

-- Function to update workflow statistics
CREATE OR REPLACE FUNCTION update_workflow_stats(workflow_id UUID, success BOOLEAN)
RETURNS VOID AS $$
BEGIN
    UPDATE automation_workflows 
    SET 
        total_runs = total_runs + 1,
        successful_runs = CASE WHEN success THEN successful_runs + 1 ELSE successful_runs END,
        failed_runs = CASE WHEN NOT success THEN failed_runs + 1 ELSE failed_runs END,
        last_run_at = NOW(),
        updated_at = NOW()
    WHERE id = workflow_id;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up old executions
CREATE OR REPLACE FUNCTION cleanup_old_executions()
RETURNS VOID AS $$
BEGIN
    -- Delete task executions older than 30 days
    DELETE FROM task_executions 
    WHERE started_at < NOW() - INTERVAL '30 days';
    
    -- Delete workflow executions older than 30 days
    DELETE FROM workflow_executions 
    WHERE started_at < NOW() - INTERVAL '30 days';
    
    -- Delete completed collaborations older than 7 days
    DELETE FROM agent_collaborations 
    WHERE status IN ('completed', 'rejected', 'failed') 
    AND completed_at < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;

-- Autonomous Actions Table
CREATE TABLE IF NOT EXISTS autonomous_actions (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    agent_id TEXT NOT NULL,

    -- Action details
    action_type TEXT NOT NULL,
    action_data JSONB NOT NULL DEFAULT '{}'::jsonb,

    -- Trigger configuration
    trigger_conditions JSONB DEFAULT '[]'::jsonb,

    -- Scheduling
    schedule JSONB NOT NULL DEFAULT '{"type": "immediate"}'::jsonb,
    scheduled_for TIMESTAMP WITH TIME ZONE,

    -- Status and priority
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending', 'scheduled', 'executing', 'completed', 'failed', 'cancelled'
    )),
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),

    -- Approval workflow
    approval_required BOOLEAN DEFAULT FALSE,
    approval_status TEXT CHECK (approval_status IN ('pending', 'approved', 'rejected')),

    -- Execution tracking
    executed_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,

    -- Dependencies and organization
    dependencies TEXT[] DEFAULT ARRAY[]::TEXT[],
    tags TEXT[] DEFAULT ARRAY[]::TEXT[],

    -- Results and errors
    result JSONB,
    error_message TEXT,

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for autonomous actions
CREATE INDEX IF NOT EXISTS idx_autonomous_actions_user_id ON autonomous_actions(user_id);
CREATE INDEX IF NOT EXISTS idx_autonomous_actions_agent_id ON autonomous_actions(agent_id);
CREATE INDEX IF NOT EXISTS idx_autonomous_actions_status ON autonomous_actions(status);
CREATE INDEX IF NOT EXISTS idx_autonomous_actions_scheduled_for ON autonomous_actions(scheduled_for) WHERE scheduled_for IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_autonomous_actions_priority ON autonomous_actions(priority);
CREATE INDEX IF NOT EXISTS idx_autonomous_actions_approval ON autonomous_actions(approval_required, approval_status) WHERE approval_required = true;

-- Enable RLS for autonomous actions
ALTER TABLE autonomous_actions ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for autonomous actions
CREATE POLICY "Users can manage their own autonomous actions" ON autonomous_actions
    FOR ALL USING (auth.uid() = user_id);

-- Create triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_scheduled_tasks_updated_at
    BEFORE UPDATE ON scheduled_tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_automation_workflows_updated_at
    BEFORE UPDATE ON automation_workflows
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_automation_triggers_updated_at
    BEFORE UPDATE ON automation_triggers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
