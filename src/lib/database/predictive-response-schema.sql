-- Predictive Response System Database Schema
-- Tables for storing predictions, preloaded responses, and analytics

-- Table for storing prediction analytics
CREATE TABLE IF NOT EXISTS prediction_analytics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    predictions JSONB NOT NULL,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    session_context JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table for storing preloaded responses
CREATE TABLE IF NOT EXISTS preloaded_responses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    question_id TEXT NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    agent_id TEXT NOT NULL,
    response_text TEXT NOT NULL,
    confidence DECIMAL(3,2) NOT NULL,
    generated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    context JSONB,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Indexes for performance
    INDEX idx_preloaded_responses_user_agent (user_id, agent_id),
    INDEX idx_preloaded_responses_expires (expires_at),
    INDEX idx_preloaded_responses_question (question_id)
);

-- Table for storing predictive job metrics
CREATE TABLE IF NOT EXISTS predictive_job_metrics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    job_id TEXT NOT NULL UNIQUE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    agent_id TEXT NOT NULL,
    prediction_id TEXT NOT NULL,
    prediction_question TEXT NOT NULL,
    prediction_category TEXT NOT NULL,
    prediction_probability DECIMAL(3,2) NOT NULL,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    duration_ms INTEGER NOT NULL,
    success BOOLEAN NOT NULL,
    error_message TEXT,
    tokens_used INTEGER DEFAULT 0,
    cache_hit BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Indexes for analytics
    INDEX idx_predictive_jobs_user_time (user_id, start_time),
    INDEX idx_predictive_jobs_success (success),
    INDEX idx_predictive_jobs_category (prediction_category)
);

-- Table for storing prediction accuracy analytics
CREATE TABLE IF NOT EXISTS prediction_accuracy_analytics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    time_range_hours INTEGER NOT NULL,
    total_predictions INTEGER NOT NULL,
    total_actual_questions INTEGER NOT NULL,
    accuracy_score DECIMAL(5,2) NOT NULL,
    category_accuracy JSONB,
    analyzed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Indexes for reporting
    INDEX idx_accuracy_analytics_user_time (user_id, analyzed_at),
    INDEX idx_accuracy_analytics_score (accuracy_score)
);

-- Table for storing user prediction patterns (for learning)
CREATE TABLE IF NOT EXISTS user_prediction_patterns (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    pattern_type TEXT NOT NULL, -- 'common_followups', 'topic_transitions', etc.
    pattern_data JSONB NOT NULL,
    confidence DECIMAL(3,2) DEFAULT 0.5,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Unique constraint to prevent duplicates
    UNIQUE(user_id, pattern_type),
    
    -- Index for lookups
    INDEX idx_user_patterns_user_type (user_id, pattern_type)
);

-- Table for caching prediction contexts
CREATE TABLE IF NOT EXISTS prediction_contexts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    thread_id TEXT,
    session_id TEXT,
    context_hash TEXT NOT NULL,
    context_data JSONB NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Indexes for performance
    INDEX idx_prediction_contexts_hash (context_hash),
    INDEX idx_prediction_contexts_expires (expires_at),
    INDEX idx_prediction_contexts_user_thread (user_id, thread_id)
);

-- Row Level Security (RLS) Policies

-- Enable RLS on all tables
ALTER TABLE prediction_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE preloaded_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE predictive_job_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE prediction_accuracy_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_prediction_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE prediction_contexts ENABLE ROW LEVEL SECURITY;

-- Policies for prediction_analytics
CREATE POLICY "Users can view their own prediction analytics" ON prediction_analytics
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own prediction analytics" ON prediction_analytics
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policies for preloaded_responses
CREATE POLICY "Users can view their own preloaded responses" ON preloaded_responses
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert preloaded responses" ON preloaded_responses
    FOR INSERT WITH CHECK (true); -- System service inserts

CREATE POLICY "System can delete expired preloaded responses" ON preloaded_responses
    FOR DELETE USING (expires_at < NOW());

-- Policies for predictive_job_metrics
CREATE POLICY "Users can view their own job metrics" ON predictive_job_metrics
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert job metrics" ON predictive_job_metrics
    FOR INSERT WITH CHECK (true); -- System service inserts

-- Policies for prediction_accuracy_analytics
CREATE POLICY "Users can view their own accuracy analytics" ON prediction_accuracy_analytics
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert accuracy analytics" ON prediction_accuracy_analytics
    FOR INSERT WITH CHECK (true); -- System service inserts

-- Policies for user_prediction_patterns
CREATE POLICY "Users can view their own prediction patterns" ON user_prediction_patterns
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own prediction patterns" ON user_prediction_patterns
    FOR ALL USING (auth.uid() = user_id);

-- Policies for prediction_contexts
CREATE POLICY "Users can view their own prediction contexts" ON prediction_contexts
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can manage prediction contexts" ON prediction_contexts
    FOR ALL USING (true); -- System service manages

-- Functions for cleanup and maintenance

-- Function to clean up expired entries
CREATE OR REPLACE FUNCTION cleanup_expired_predictions()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER := 0;
BEGIN
    -- Clean up expired preloaded responses
    DELETE FROM preloaded_responses WHERE expires_at < NOW();
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Clean up expired prediction contexts
    DELETE FROM prediction_contexts WHERE expires_at < NOW();
    
    -- Clean up old prediction analytics (older than 30 days)
    DELETE FROM prediction_analytics WHERE generated_at < NOW() - INTERVAL '30 days';
    
    -- Clean up old job metrics (older than 7 days)
    DELETE FROM predictive_job_metrics WHERE start_time < NOW() - INTERVAL '7 days';
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user prediction statistics
CREATE OR REPLACE FUNCTION get_user_prediction_stats(target_user_id UUID, hours_back INTEGER DEFAULT 24)
RETURNS TABLE (
    total_predictions INTEGER,
    total_preloaded INTEGER,
    cache_hit_rate DECIMAL,
    average_accuracy DECIMAL,
    top_categories JSONB
) AS $$
BEGIN
    RETURN QUERY
    WITH prediction_stats AS (
        SELECT 
            COUNT(*)::INTEGER as pred_count,
            COALESCE(AVG(accuracy_score), 0) as avg_accuracy
        FROM prediction_analytics pa
        LEFT JOIN prediction_accuracy_analytics paa ON pa.user_id = paa.user_id
        WHERE pa.user_id = target_user_id 
        AND pa.generated_at > NOW() - (hours_back || ' hours')::INTERVAL
    ),
    preload_stats AS (
        SELECT 
            COUNT(*)::INTEGER as preload_count,
            COUNT(CASE WHEN (metadata->>'cacheHit')::BOOLEAN THEN 1 END)::DECIMAL / 
            NULLIF(COUNT(*), 0) as hit_rate
        FROM preloaded_responses
        WHERE user_id = target_user_id
        AND generated_at > NOW() - (hours_back || ' hours')::INTERVAL
    ),
    category_stats AS (
        SELECT jsonb_agg(
            jsonb_build_object(
                'category', prediction_category,
                'count', category_count
            ) ORDER BY category_count DESC
        ) as categories
        FROM (
            SELECT 
                prediction_category,
                COUNT(*) as category_count
            FROM predictive_job_metrics
            WHERE user_id = target_user_id
            AND start_time > NOW() - (hours_back || ' hours')::INTERVAL
            GROUP BY prediction_category
            LIMIT 5
        ) cat_counts
    )
    SELECT 
        COALESCE(ps.pred_count, 0),
        COALESCE(pls.preload_count, 0),
        COALESCE(pls.hit_rate, 0),
        COALESCE(ps.avg_accuracy, 0),
        COALESCE(cs.categories, '[]'::jsonb)
    FROM prediction_stats ps
    CROSS JOIN preload_stats pls
    CROSS JOIN category_stats cs;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create indexes for better performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_prediction_analytics_user_generated 
    ON prediction_analytics (user_id, generated_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_preloaded_responses_user_generated 
    ON preloaded_responses (user_id, generated_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_job_metrics_user_start 
    ON predictive_job_metrics (user_id, start_time DESC);

-- Grant necessary permissions
GRANT SELECT, INSERT ON prediction_analytics TO authenticated;
GRANT SELECT ON preloaded_responses TO authenticated;
GRANT SELECT ON predictive_job_metrics TO authenticated;
GRANT SELECT ON prediction_accuracy_analytics TO authenticated;
GRANT ALL ON user_prediction_patterns TO authenticated;
GRANT SELECT ON prediction_contexts TO authenticated;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION cleanup_expired_predictions() TO service_role;
GRANT EXECUTE ON FUNCTION get_user_prediction_stats(UUID, INTEGER) TO authenticated;
