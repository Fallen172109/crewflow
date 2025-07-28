-- Enhanced Conversational Memory System
-- Provides persistent context, user preferences, and learning capabilities

-- User preferences table
CREATE TABLE IF NOT EXISTS public.user_preferences (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    preferences JSONB NOT NULL DEFAULT '{
        "communicationStyle": "friendly",
        "responseLength": "detailed",
        "preferredActions": [],
        "avoidedTopics": [],
        "timezone": "UTC",
        "language": "en",
        "businessContext": {
            "experienceLevel": "intermediate"
        }
    }'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Conversation states table
CREATE TABLE IF NOT EXISTS public.conversation_states (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    agent_id TEXT NOT NULL,
    thread_id UUID REFERENCES public.chat_threads(id) ON DELETE CASCADE,
    session_id TEXT NOT NULL,
    state JSONB NOT NULL DEFAULT '{
        "currentTopic": "general",
        "pendingActions": [],
        "contextVariables": {},
        "lastIntent": "greeting",
        "confidence": 0.5,
        "conversationPhase": "greeting"
    }'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Conversation interactions table for learning
CREATE TABLE IF NOT EXISTS public.conversation_interactions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    agent_id TEXT NOT NULL,
    thread_id UUID REFERENCES public.chat_threads(id) ON DELETE CASCADE,
    session_id TEXT NOT NULL,
    intent TEXT NOT NULL,
    action TEXT NOT NULL,
    outcome TEXT NOT NULL CHECK (outcome IN ('success', 'failure', 'partial')),
    user_satisfaction INTEGER CHECK (user_satisfaction >= 1 AND user_satisfaction <= 5),
    context TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User learning data table
CREATE TABLE IF NOT EXISTS public.user_learning_data (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    agent_id TEXT NOT NULL,
    learning_data JSONB NOT NULL DEFAULT '{
        "successfulPatterns": [],
        "failedPatterns": [],
        "userBehaviorInsights": [],
        "preferredSolutions": {},
        "timeBasedPatterns": {}
    }'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, agent_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_conversation_states_user_agent 
ON public.conversation_states(user_id, agent_id);

CREATE INDEX IF NOT EXISTS idx_conversation_states_thread 
ON public.conversation_states(thread_id);

CREATE INDEX IF NOT EXISTS idx_conversation_interactions_user_agent 
ON public.conversation_interactions(user_id, agent_id);

CREATE INDEX IF NOT EXISTS idx_conversation_interactions_created_at 
ON public.conversation_interactions(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_learning_data_user_agent 
ON public.user_learning_data(user_id, agent_id);

-- RLS policies
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_learning_data ENABLE ROW LEVEL SECURITY;

-- User preferences policies
CREATE POLICY "Users can view their own preferences" ON public.user_preferences
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences" ON public.user_preferences
    FOR ALL USING (auth.uid() = user_id);

-- Conversation states policies
CREATE POLICY "Users can view their own conversation states" ON public.conversation_states
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own conversation states" ON public.conversation_states
    FOR ALL USING (auth.uid() = user_id);

-- Conversation interactions policies
CREATE POLICY "Users can view their own interactions" ON public.conversation_interactions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own interactions" ON public.conversation_interactions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- User learning data policies
CREATE POLICY "Users can view their own learning data" ON public.user_learning_data
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own learning data" ON public.user_learning_data
    FOR ALL USING (auth.uid() = user_id);

-- Functions for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for automatic timestamp updates
CREATE TRIGGER update_user_preferences_updated_at 
    BEFORE UPDATE ON public.user_preferences 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_conversation_states_updated_at 
    BEFORE UPDATE ON public.conversation_states 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_learning_data_updated_at 
    BEFORE UPDATE ON public.user_learning_data 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to clean up old conversation interactions (keep last 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_interactions()
RETURNS void AS $$
BEGIN
    DELETE FROM public.conversation_interactions 
    WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- Function to get user conversation insights
CREATE OR REPLACE FUNCTION get_user_conversation_insights(p_user_id UUID, p_agent_id TEXT DEFAULT NULL)
RETURNS TABLE (
    total_interactions BIGINT,
    success_rate NUMERIC,
    most_common_intent TEXT,
    avg_satisfaction NUMERIC,
    peak_usage_hour INTEGER
) AS $$
BEGIN
    RETURN QUERY
    WITH interaction_stats AS (
        SELECT 
            COUNT(*) as total,
            COUNT(*) FILTER (WHERE outcome = 'success') as successes,
            MODE() WITHIN GROUP (ORDER BY intent) as common_intent,
            AVG(user_satisfaction) as avg_sat,
            MODE() WITHIN GROUP (ORDER BY EXTRACT(HOUR FROM created_at)) as peak_hour
        FROM public.conversation_interactions
        WHERE user_id = p_user_id 
        AND (p_agent_id IS NULL OR agent_id = p_agent_id)
        AND created_at > NOW() - INTERVAL '30 days'
    )
    SELECT 
        total,
        CASE WHEN total > 0 THEN ROUND((successes::NUMERIC / total::NUMERIC) * 100, 2) ELSE 0 END,
        common_intent,
        ROUND(avg_sat, 2),
        peak_hour::INTEGER
    FROM interaction_stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.user_preferences TO authenticated;
GRANT ALL ON public.conversation_states TO authenticated;
GRANT ALL ON public.conversation_interactions TO authenticated;
GRANT ALL ON public.user_learning_data TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_conversation_insights TO authenticated;
