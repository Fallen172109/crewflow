-- Maritime Agent Integration Database Tables
-- Tables for cross-agent context, action logging, and enhanced feedback

-- Cross-Agent Context Management
CREATE TABLE IF NOT EXISTS cross_agent_contexts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  thread_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  current_agent JSONB NOT NULL,
  previous_agents JSONB DEFAULT '[]'::jsonb,
  interaction_history JSONB DEFAULT '[]'::jsonb,
  shared_context JSONB DEFAULT '{}'::jsonb,
  conversation_phase TEXT DEFAULT 'introduction' CHECK (conversation_phase IN ('introduction', 'working', 'handoff', 'completion')),
  last_agent_switch TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, thread_id)
);

-- Agent Interactions Log
CREATE TABLE IF NOT EXISTS agent_interactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  thread_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  agent_name TEXT NOT NULL,
  message_id TEXT NOT NULL,
  user_message TEXT NOT NULL,
  agent_response TEXT NOT NULL,
  task_type TEXT NOT NULL,
  confidence DECIMAL(3,2) DEFAULT 0.0,
  actions_taken JSONB DEFAULT '[]'::jsonb,
  context_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Shopify Action Logs
CREATE TABLE IF NOT EXISTS shopify_action_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  store_id TEXT NOT NULL,
  action_id TEXT NOT NULL,
  action_type TEXT NOT NULL CHECK (action_type IN ('product', 'inventory', 'order', 'customer', 'analytics', 'settings')),
  action_name TEXT NOT NULL,
  parameters JSONB DEFAULT '{}'::jsonb,
  success BOOLEAN NOT NULL,
  result JSONB DEFAULT '{}'::jsonb,
  error TEXT,
  affected_resources JSONB DEFAULT '[]'::jsonb,
  execution_time_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agent Routing Decisions Log
CREATE TABLE IF NOT EXISTS agent_routing_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  thread_id TEXT NOT NULL,
  message TEXT NOT NULL,
  intent_analysis JSONB NOT NULL,
  selected_agent_id TEXT NOT NULL,
  selected_agent_name TEXT NOT NULL,
  routing_confidence DECIMAL(3,2) NOT NULL,
  routing_reason TEXT NOT NULL,
  fallback_agents JSONB DEFAULT '[]'::jsonb,
  requires_multi_agent BOOLEAN DEFAULT FALSE,
  estimated_complexity TEXT CHECK (estimated_complexity IN ('low', 'medium', 'high')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enhanced AI Response Feedback (extends existing table)
-- Add columns to existing ai_response_feedback table if they don't exist
DO $$ 
BEGIN
  -- Add agent routing context
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_response_feedback' AND column_name = 'selected_agent_id') THEN
    ALTER TABLE ai_response_feedback ADD COLUMN selected_agent_id TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_response_feedback' AND column_name = 'routing_confidence') THEN
    ALTER TABLE ai_response_feedback ADD COLUMN routing_confidence DECIMAL(3,2);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_response_feedback' AND column_name = 'agent_handoff_occurred') THEN
    ALTER TABLE ai_response_feedback ADD COLUMN agent_handoff_occurred BOOLEAN DEFAULT FALSE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_response_feedback' AND column_name = 'maritime_personality_rating') THEN
    ALTER TABLE ai_response_feedback ADD COLUMN maritime_personality_rating INTEGER CHECK (maritime_personality_rating BETWEEN 1 AND 5);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_response_feedback' AND column_name = 'response_adaptation_applied') THEN
    ALTER TABLE ai_response_feedback ADD COLUMN response_adaptation_applied BOOLEAN DEFAULT FALSE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_response_feedback' AND column_name = 'adaptation_reason') THEN
    ALTER TABLE ai_response_feedback ADD COLUMN adaptation_reason TEXT;
  END IF;
END $$;

-- User Response Patterns (for adaptive responses)
CREATE TABLE IF NOT EXISTS user_response_patterns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_id TEXT NOT NULL,
  preferred_response_style TEXT DEFAULT 'conversational' CHECK (preferred_response_style IN ('concise', 'detailed', 'technical', 'conversational')),
  average_rating DECIMAL(3,2) DEFAULT 3.5,
  common_feedback_themes JSONB DEFAULT '[]'::jsonb,
  successful_response_patterns JSONB DEFAULT '[]'::jsonb,
  improvement_areas JSONB DEFAULT '[]'::jsonb,
  maritime_personality_preference INTEGER DEFAULT 4 CHECK (maritime_personality_preference BETWEEN 1 AND 5),
  total_interactions INTEGER DEFAULT 0,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, agent_id)
);

-- Agent Performance Analytics
CREATE TABLE IF NOT EXISTS agent_performance_analytics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id TEXT NOT NULL,
  agent_name TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_interactions INTEGER DEFAULT 0,
  average_rating DECIMAL(3,2) DEFAULT 0.0,
  successful_handoffs INTEGER DEFAULT 0,
  failed_handoffs INTEGER DEFAULT 0,
  actions_executed INTEGER DEFAULT 0,
  actions_successful INTEGER DEFAULT 0,
  average_response_time_ms INTEGER DEFAULT 0,
  user_satisfaction_score DECIMAL(3,2) DEFAULT 0.0,
  maritime_personality_score DECIMAL(3,2) DEFAULT 0.0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(agent_id, date)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_cross_agent_contexts_user_thread ON cross_agent_contexts(user_id, thread_id);
CREATE INDEX IF NOT EXISTS idx_cross_agent_contexts_updated ON cross_agent_contexts(updated_at);

CREATE INDEX IF NOT EXISTS idx_agent_interactions_user_thread ON agent_interactions(user_id, thread_id);
CREATE INDEX IF NOT EXISTS idx_agent_interactions_agent ON agent_interactions(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_interactions_created ON agent_interactions(created_at);

CREATE INDEX IF NOT EXISTS idx_shopify_action_logs_user_store ON shopify_action_logs(user_id, store_id);
CREATE INDEX IF NOT EXISTS idx_shopify_action_logs_action_type ON shopify_action_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_shopify_action_logs_created ON shopify_action_logs(created_at);

CREATE INDEX IF NOT EXISTS idx_agent_routing_logs_user_thread ON agent_routing_logs(user_id, thread_id);
CREATE INDEX IF NOT EXISTS idx_agent_routing_logs_agent ON agent_routing_logs(selected_agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_routing_logs_created ON agent_routing_logs(created_at);

CREATE INDEX IF NOT EXISTS idx_user_response_patterns_user_agent ON user_response_patterns(user_id, agent_id);
CREATE INDEX IF NOT EXISTS idx_user_response_patterns_updated ON user_response_patterns(last_updated);

CREATE INDEX IF NOT EXISTS idx_agent_performance_analytics_agent_date ON agent_performance_analytics(agent_id, date);
CREATE INDEX IF NOT EXISTS idx_agent_performance_analytics_date ON agent_performance_analytics(date);

-- Row Level Security (RLS) Policies
ALTER TABLE cross_agent_contexts ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopify_action_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_routing_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_response_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_performance_analytics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user data access
CREATE POLICY "Users can access their own cross-agent contexts" ON cross_agent_contexts
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can access their own agent interactions" ON agent_interactions
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can access their own Shopify action logs" ON shopify_action_logs
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can access their own routing logs" ON agent_routing_logs
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can access their own response patterns" ON user_response_patterns
  FOR ALL USING (auth.uid() = user_id);

-- Agent performance analytics can be read by all authenticated users (for system insights)
CREATE POLICY "Authenticated users can read agent performance analytics" ON agent_performance_analytics
  FOR SELECT USING (auth.role() = 'authenticated');

-- Functions for automatic updates
CREATE OR REPLACE FUNCTION update_cross_agent_context_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_cross_agent_contexts_timestamp
  BEFORE UPDATE ON cross_agent_contexts
  FOR EACH ROW
  EXECUTE FUNCTION update_cross_agent_context_timestamp();

CREATE OR REPLACE FUNCTION update_user_response_pattern_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_updated = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_response_patterns_timestamp
  BEFORE UPDATE ON user_response_patterns
  FOR EACH ROW
  EXECUTE FUNCTION update_user_response_pattern_timestamp();

-- Function to update agent performance analytics
CREATE OR REPLACE FUNCTION update_agent_performance_analytics(
  p_agent_id TEXT,
  p_agent_name TEXT,
  p_rating DECIMAL DEFAULT NULL,
  p_handoff_success BOOLEAN DEFAULT NULL,
  p_action_executed BOOLEAN DEFAULT NULL,
  p_action_success BOOLEAN DEFAULT NULL,
  p_response_time_ms INTEGER DEFAULT NULL,
  p_maritime_score DECIMAL DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO agent_performance_analytics (
    agent_id, 
    agent_name, 
    total_interactions,
    average_rating,
    successful_handoffs,
    failed_handoffs,
    actions_executed,
    actions_successful,
    average_response_time_ms,
    maritime_personality_score
  )
  VALUES (
    p_agent_id,
    p_agent_name,
    1,
    COALESCE(p_rating, 0),
    CASE WHEN p_handoff_success = TRUE THEN 1 ELSE 0 END,
    CASE WHEN p_handoff_success = FALSE THEN 1 ELSE 0 END,
    CASE WHEN p_action_executed = TRUE THEN 1 ELSE 0 END,
    CASE WHEN p_action_success = TRUE THEN 1 ELSE 0 END,
    COALESCE(p_response_time_ms, 0),
    COALESCE(p_maritime_score, 0)
  )
  ON CONFLICT (agent_id, date)
  DO UPDATE SET
    total_interactions = agent_performance_analytics.total_interactions + 1,
    average_rating = (agent_performance_analytics.average_rating * agent_performance_analytics.total_interactions + COALESCE(p_rating, 0)) / (agent_performance_analytics.total_interactions + 1),
    successful_handoffs = agent_performance_analytics.successful_handoffs + CASE WHEN p_handoff_success = TRUE THEN 1 ELSE 0 END,
    failed_handoffs = agent_performance_analytics.failed_handoffs + CASE WHEN p_handoff_success = FALSE THEN 1 ELSE 0 END,
    actions_executed = agent_performance_analytics.actions_executed + CASE WHEN p_action_executed = TRUE THEN 1 ELSE 0 END,
    actions_successful = agent_performance_analytics.actions_successful + CASE WHEN p_action_success = TRUE THEN 1 ELSE 0 END,
    average_response_time_ms = (agent_performance_analytics.average_response_time_ms + COALESCE(p_response_time_ms, 0)) / 2,
    maritime_personality_score = (agent_performance_analytics.maritime_personality_score + COALESCE(p_maritime_score, 0)) / 2;
END;
$$ LANGUAGE plpgsql;

-- Grant necessary permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
