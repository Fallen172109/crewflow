-- AI Feedback and Learning System Database Schema
-- Enables self-learning capabilities and response quality improvement

-- AI Response Feedback Table
CREATE TABLE IF NOT EXISTS public.ai_response_feedback (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    message_id UUID REFERENCES public.chat_history(id) ON DELETE CASCADE NOT NULL,
    agent_id TEXT NOT NULL,
    thread_id UUID REFERENCES public.chat_threads(id) ON DELETE CASCADE,
    
    -- Feedback data
    rating INTEGER CHECK (rating >= 1 AND rating <= 5) NOT NULL,
    feedback_type TEXT CHECK (feedback_type IN ('thumbs_up', 'thumbs_down', 'star_rating')) NOT NULL,
    feedback_text TEXT,
    was_helpful BOOLEAN NOT NULL DEFAULT FALSE,
    improvement_suggestions TEXT,
    
    -- Quality metrics
    response_quality_score DECIMAL(3,2) CHECK (response_quality_score >= 0 AND response_quality_score <= 1),
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_for_learning BOOLEAN DEFAULT FALSE,
    processed_at TIMESTAMP WITH TIME ZONE
);

-- AI Learning Patterns Table
CREATE TABLE IF NOT EXISTS public.ai_learning_patterns (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    
    -- Pattern classification
    pattern_type TEXT NOT NULL CHECK (pattern_type IN (
        'successful_response', 
        'failed_response', 
        'user_preference', 
        'technical_accuracy',
        'communication_style',
        'response_structure'
    )),
    
    -- Pattern data (JSONB for flexibility)
    pattern_data JSONB NOT NULL,
    
    -- Pattern metrics
    confidence_score DECIMAL(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1) NOT NULL,
    usage_frequency INTEGER DEFAULT 1,
    success_impact DECIMAL(3,2) DEFAULT 0, -- Can be negative for failure patterns
    
    -- Timestamps
    identified_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_validated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE
);

-- Prompt Versions Table for A/B Testing
CREATE TABLE IF NOT EXISTS public.prompt_versions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    agent_id TEXT NOT NULL,
    
    -- Version info
    version_number INTEGER NOT NULL,
    prompt_type TEXT NOT NULL DEFAULT 'system_prompt',
    
    -- Prompt content
    prompt_content TEXT NOT NULL,
    improvement_reason TEXT,
    
    -- Performance metrics
    performance_score DECIMAL(3,2) DEFAULT 0,
    usage_count INTEGER DEFAULT 0,
    success_rate DECIMAL(3,2) DEFAULT 0,
    average_rating DECIMAL(3,2) DEFAULT 0,
    
    -- Status
    is_active BOOLEAN DEFAULT FALSE,
    is_testing BOOLEAN DEFAULT FALSE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    activated_at TIMESTAMP WITH TIME ZONE,
    retired_at TIMESTAMP WITH TIME ZONE,
    
    -- Constraints
    UNIQUE(agent_id, version_number)
);

-- Response Quality Metrics Table
CREATE TABLE IF NOT EXISTS public.response_quality_metrics (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    message_id UUID REFERENCES public.chat_history(id) ON DELETE CASCADE NOT NULL,
    agent_id TEXT NOT NULL,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    
    -- Quality scores
    technical_accuracy_score DECIMAL(3,2),
    helpfulness_score DECIMAL(3,2),
    clarity_score DECIMAL(3,2),
    completeness_score DECIMAL(3,2),
    overall_quality_score DECIMAL(3,2),
    
    -- Response characteristics
    response_length INTEGER,
    has_code_examples BOOLEAN DEFAULT FALSE,
    has_step_by_step BOOLEAN DEFAULT FALSE,
    has_links BOOLEAN DEFAULT FALSE,
    technical_terms_count INTEGER DEFAULT 0,
    
    -- Context
    user_experience_level TEXT CHECK (user_experience_level IN ('beginner', 'intermediate', 'expert')),
    task_complexity TEXT CHECK (task_complexity IN ('simple', 'moderate', 'complex')),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User Communication Preferences Table (Enhanced)
CREATE TABLE IF NOT EXISTS public.user_communication_preferences (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    agent_id TEXT NOT NULL,
    
    -- Learned preferences
    preferred_response_length TEXT CHECK (preferred_response_length IN ('concise', 'moderate', 'comprehensive')) DEFAULT 'moderate',
    preferred_communication_style TEXT CHECK (preferred_communication_style IN ('direct', 'detailed', 'conversational')) DEFAULT 'direct',
    technical_level TEXT CHECK (technical_level IN ('basic', 'intermediate', 'advanced')) DEFAULT 'intermediate',
    
    -- Behavioral preferences
    wants_explanations BOOLEAN DEFAULT TRUE,
    prefers_alternatives BOOLEAN DEFAULT TRUE,
    likes_step_by_step BOOLEAN DEFAULT TRUE,
    prefers_code_examples BOOLEAN DEFAULT FALSE,
    
    -- Learning data
    total_interactions INTEGER DEFAULT 0,
    positive_feedback_count INTEGER DEFAULT 0,
    negative_feedback_count INTEGER DEFAULT 0,
    average_rating DECIMAL(3,2) DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id, agent_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_ai_response_feedback_user_agent ON public.ai_response_feedback(user_id, agent_id);
CREATE INDEX IF NOT EXISTS idx_ai_response_feedback_rating ON public.ai_response_feedback(rating, was_helpful);
CREATE INDEX IF NOT EXISTS idx_ai_response_feedback_created_at ON public.ai_response_feedback(created_at);
CREATE INDEX IF NOT EXISTS idx_ai_response_feedback_processing ON public.ai_response_feedback(processed_for_learning, created_at);

CREATE INDEX IF NOT EXISTS idx_ai_learning_patterns_type ON public.ai_learning_patterns(pattern_type, is_active);
CREATE INDEX IF NOT EXISTS idx_ai_learning_patterns_confidence ON public.ai_learning_patterns(confidence_score, success_impact);
CREATE INDEX IF NOT EXISTS idx_ai_learning_patterns_usage ON public.ai_learning_patterns(usage_frequency, last_validated);

CREATE INDEX IF NOT EXISTS idx_prompt_versions_agent ON public.prompt_versions(agent_id, is_active);
CREATE INDEX IF NOT EXISTS idx_prompt_versions_performance ON public.prompt_versions(performance_score, success_rate);

CREATE INDEX IF NOT EXISTS idx_response_quality_metrics_agent ON public.response_quality_metrics(agent_id, overall_quality_score);
CREATE INDEX IF NOT EXISTS idx_response_quality_metrics_user ON public.response_quality_metrics(user_id, created_at);

CREATE INDEX IF NOT EXISTS idx_user_communication_preferences_user_agent ON public.user_communication_preferences(user_id, agent_id);

-- Enable RLS on all tables
ALTER TABLE public.ai_response_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_learning_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prompt_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.response_quality_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_communication_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ai_response_feedback
CREATE POLICY "Users can view their own feedback" ON public.ai_response_feedback
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own feedback" ON public.ai_response_feedback
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own feedback" ON public.ai_response_feedback
    FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for ai_learning_patterns (Admin only for direct access)
CREATE POLICY "Admins can manage learning patterns" ON public.ai_learning_patterns
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- RLS Policies for prompt_versions (Admin only)
CREATE POLICY "Admins can manage prompt versions" ON public.prompt_versions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- RLS Policies for response_quality_metrics
CREATE POLICY "Users can view their own quality metrics" ON public.response_quality_metrics
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert quality metrics" ON public.response_quality_metrics
    FOR INSERT WITH CHECK (true); -- Allow system to insert

-- RLS Policies for user_communication_preferences
CREATE POLICY "Users can view their own preferences" ON public.user_communication_preferences
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own preferences" ON public.user_communication_preferences
    FOR ALL USING (auth.uid() = user_id);

-- Functions for analytics and insights

-- Function to get user feedback summary
CREATE OR REPLACE FUNCTION get_user_feedback_summary(p_user_id UUID, p_agent_id TEXT DEFAULT NULL)
RETURNS TABLE (
    total_feedback BIGINT,
    average_rating NUMERIC,
    positive_feedback_rate NUMERIC,
    recent_trend TEXT,
    most_common_improvement TEXT
) AS $$
BEGIN
    RETURN QUERY
    WITH feedback_stats AS (
        SELECT 
            COUNT(*) as total,
            AVG(rating) as avg_rating,
            COUNT(*) FILTER (WHERE rating >= 4) as positive_count,
            COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') as recent_count,
            COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '14 days' AND created_at <= NOW() - INTERVAL '7 days') as prev_week_count
        FROM public.ai_response_feedback
        WHERE user_id = p_user_id 
        AND (p_agent_id IS NULL OR agent_id = p_agent_id)
        AND created_at > NOW() - INTERVAL '30 days'
    ),
    improvement_suggestions AS (
        SELECT improvement_suggestions, COUNT(*) as suggestion_count
        FROM public.ai_response_feedback
        WHERE user_id = p_user_id 
        AND (p_agent_id IS NULL OR agent_id = p_agent_id)
        AND improvement_suggestions IS NOT NULL
        AND created_at > NOW() - INTERVAL '30 days'
        GROUP BY improvement_suggestions
        ORDER BY suggestion_count DESC
        LIMIT 1
    )
    SELECT 
        fs.total,
        ROUND(fs.avg_rating, 2),
        ROUND((fs.positive_count::NUMERIC / NULLIF(fs.total, 0)) * 100, 1),
        CASE 
            WHEN fs.recent_count > fs.prev_week_count THEN 'improving'
            WHEN fs.recent_count < fs.prev_week_count THEN 'declining'
            ELSE 'stable'
        END,
        COALESCE(ims.improvement_suggestions, 'No common suggestions')
    FROM feedback_stats fs
    LEFT JOIN improvement_suggestions ims ON true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get learning pattern insights
CREATE OR REPLACE FUNCTION get_learning_pattern_insights(p_agent_id TEXT DEFAULT NULL)
RETURNS TABLE (
    pattern_type TEXT,
    pattern_count BIGINT,
    avg_confidence NUMERIC,
    avg_success_impact NUMERIC,
    most_frequent_pattern JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        alp.pattern_type,
        COUNT(*) as pattern_count,
        ROUND(AVG(alp.confidence_score), 3) as avg_confidence,
        ROUND(AVG(alp.success_impact), 3) as avg_success_impact,
        (
            SELECT pattern_data 
            FROM public.ai_learning_patterns 
            WHERE pattern_type = alp.pattern_type 
            AND (p_agent_id IS NULL OR pattern_data->>'agentId' = p_agent_id)
            ORDER BY usage_frequency DESC 
            LIMIT 1
        ) as most_frequent_pattern
    FROM public.ai_learning_patterns alp
    WHERE alp.is_active = true
    AND (p_agent_id IS NULL OR alp.pattern_data->>'agentId' = p_agent_id)
    GROUP BY alp.pattern_type
    ORDER BY pattern_count DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically update user communication preferences
CREATE OR REPLACE FUNCTION update_user_communication_preferences()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_communication_preferences (
        user_id, 
        agent_id, 
        total_interactions,
        positive_feedback_count,
        negative_feedback_count,
        average_rating
    )
    VALUES (
        NEW.user_id,
        NEW.agent_id,
        1,
        CASE WHEN NEW.rating >= 4 THEN 1 ELSE 0 END,
        CASE WHEN NEW.rating <= 2 THEN 1 ELSE 0 END,
        NEW.rating
    )
    ON CONFLICT (user_id, agent_id) DO UPDATE SET
        total_interactions = user_communication_preferences.total_interactions + 1,
        positive_feedback_count = user_communication_preferences.positive_feedback_count + 
            CASE WHEN NEW.rating >= 4 THEN 1 ELSE 0 END,
        negative_feedback_count = user_communication_preferences.negative_feedback_count + 
            CASE WHEN NEW.rating <= 2 THEN 1 ELSE 0 END,
        average_rating = (
            (user_communication_preferences.average_rating * user_communication_preferences.total_interactions) + NEW.rating
        ) / (user_communication_preferences.total_interactions + 1),
        updated_at = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER update_user_preferences_trigger
    AFTER INSERT ON public.ai_response_feedback
    FOR EACH ROW
    EXECUTE FUNCTION update_user_communication_preferences();
