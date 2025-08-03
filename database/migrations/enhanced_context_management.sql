-- Enhanced Context Management System for CrewFlow
-- Implements persistent context tracking, conversational memory, and intelligent context awareness
-- Focus on Shopify AI Store Manager functionality

-- =====================================================
-- 1. Enhanced chat_threads table with context features
-- =====================================================

-- Add new columns to existing chat_threads table
ALTER TABLE public.chat_threads 
ADD COLUMN IF NOT EXISTS session_id TEXT,
ADD COLUMN IF NOT EXISTS context_summary TEXT,
ADD COLUMN IF NOT EXISTS store_context_snapshot JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS conversation_phase TEXT DEFAULT 'introduction' 
    CHECK (conversation_phase IN ('introduction', 'working', 'handoff', 'completion')),
ADD COLUMN IF NOT EXISTS user_intent TEXT,
ADD COLUMN IF NOT EXISTS priority_score INTEGER DEFAULT 5 CHECK (priority_score >= 1 AND priority_score <= 10);

-- Create index for session-based queries
CREATE INDEX IF NOT EXISTS idx_chat_threads_session ON public.chat_threads(user_id, session_id);
CREATE INDEX IF NOT EXISTS idx_chat_threads_activity ON public.chat_threads(user_id, last_activity_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_threads_priority ON public.chat_threads(user_id, priority_score DESC);

-- =====================================================
-- 2. Conversation Sessions table
-- =====================================================

CREATE TABLE IF NOT EXISTS public.conversation_sessions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    session_id TEXT NOT NULL,
    
    -- Store context
    store_id TEXT,
    store_name TEXT,
    store_context JSONB DEFAULT '{}'::jsonb,
    
    -- Session metadata
    session_metadata JSONB DEFAULT '{}'::jsonb,
    user_agent TEXT,
    ip_address INET,
    
    -- Active conversation tracking
    active_thread_id UUID REFERENCES public.chat_threads(id) ON DELETE SET NULL,
    thread_count INTEGER DEFAULT 0,
    message_count INTEGER DEFAULT 0,
    
    -- Session state
    is_active BOOLEAN DEFAULT TRUE,
    last_interaction_type TEXT,
    last_store_action TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '30 days'),
    
    -- Constraints
    UNIQUE(user_id, session_id)
);

-- Create indexes for conversation_sessions
CREATE INDEX idx_conversation_sessions_user_active ON public.conversation_sessions(user_id, is_active);
CREATE INDEX idx_conversation_sessions_session_id ON public.conversation_sessions(session_id);
CREATE INDEX idx_conversation_sessions_activity ON public.conversation_sessions(user_id, last_activity_at DESC);
CREATE INDEX idx_conversation_sessions_expires ON public.conversation_sessions(expires_at);

-- =====================================================
-- 3. Enhanced chat_history table
-- =====================================================

-- Add context-aware columns to existing chat_history table
ALTER TABLE public.chat_history 
ADD COLUMN IF NOT EXISTS session_id TEXT,
ADD COLUMN IF NOT EXISTS context_metadata JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS store_state_snapshot JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS message_importance_score INTEGER DEFAULT 5 
    CHECK (message_importance_score >= 1 AND message_importance_score <= 10),
ADD COLUMN IF NOT EXISTS user_intent TEXT,
ADD COLUMN IF NOT EXISTS ai_confidence_score DECIMAL(3,2) DEFAULT 0.85 
    CHECK (ai_confidence_score >= 0.0 AND ai_confidence_score <= 1.0),
ADD COLUMN IF NOT EXISTS response_quality_score DECIMAL(3,2),
ADD COLUMN IF NOT EXISTS context_used JSONB DEFAULT '{}'::jsonb;

-- Create indexes for enhanced chat_history
CREATE INDEX IF NOT EXISTS idx_chat_history_session ON public.chat_history(user_id, session_id);
CREATE INDEX IF NOT EXISTS idx_chat_history_importance ON public.chat_history(thread_id, message_importance_score DESC);
CREATE INDEX IF NOT EXISTS idx_chat_history_intent ON public.chat_history(user_id, user_intent);

-- =====================================================
-- 4. Conversation Context table
-- =====================================================

CREATE TABLE IF NOT EXISTS public.conversation_context (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    thread_id UUID REFERENCES public.chat_threads(id) ON DELETE CASCADE,
    session_id TEXT,
    
    -- Context classification
    context_type TEXT NOT NULL CHECK (context_type IN (
        'summary', 'intent', 'store_state', 'user_preference', 
        'conversation_phase', 'action_history', 'business_context'
    )),
    
    -- Context data
    context_data JSONB NOT NULL,
    context_summary TEXT,
    
    -- Relevance and priority
    relevance_score INTEGER DEFAULT 5 CHECK (relevance_score >= 1 AND relevance_score <= 10),
    priority_level TEXT DEFAULT 'medium' CHECK (priority_level IN ('low', 'medium', 'high', 'critical')),
    
    -- Temporal relevance
    valid_from TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    valid_until TIMESTAMP WITH TIME ZONE,
    last_accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    access_count INTEGER DEFAULT 0,
    
    -- Metadata
    source_message_id UUID REFERENCES public.chat_history(id) ON DELETE SET NULL,
    created_by_agent TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for conversation_context
CREATE INDEX idx_conversation_context_thread ON public.conversation_context(thread_id, context_type);
CREATE INDEX idx_conversation_context_session ON public.conversation_context(user_id, session_id);
CREATE INDEX idx_conversation_context_relevance ON public.conversation_context(thread_id, relevance_score DESC);
CREATE INDEX idx_conversation_context_priority ON public.conversation_context(user_id, priority_level, relevance_score DESC);
CREATE INDEX idx_conversation_context_temporal ON public.conversation_context(valid_from, valid_until);

-- =====================================================
-- 5. Context Summaries table
-- =====================================================

CREATE TABLE IF NOT EXISTS public.context_summaries (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    thread_id UUID REFERENCES public.chat_threads(id) ON DELETE CASCADE,
    session_id TEXT,
    
    -- Summary details
    summary_type TEXT NOT NULL CHECK (summary_type IN (
        'conversation', 'session', 'store_activity', 'user_behavior', 'business_insights'
    )),
    summary_text TEXT NOT NULL,
    summary_data JSONB DEFAULT '{}'::jsonb,
    
    -- Time range covered
    covers_from TIMESTAMP WITH TIME ZONE NOT NULL,
    covers_until TIMESTAMP WITH TIME ZONE NOT NULL,
    message_count INTEGER DEFAULT 0,
    
    -- Quality metrics
    completeness_score DECIMAL(3,2) DEFAULT 0.80,
    accuracy_score DECIMAL(3,2) DEFAULT 0.85,
    
    -- Usage tracking
    last_used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    usage_count INTEGER DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for context_summaries
CREATE INDEX idx_context_summaries_thread ON public.context_summaries(thread_id, summary_type);
CREATE INDEX idx_context_summaries_session ON public.context_summaries(user_id, session_id);
CREATE INDEX idx_context_summaries_temporal ON public.context_summaries(covers_from, covers_until);
CREATE INDEX idx_context_summaries_usage ON public.context_summaries(user_id, last_used_at DESC);

-- =====================================================
-- 6. Enable Row Level Security (RLS)
-- =====================================================

-- Enable RLS on new tables
ALTER TABLE public.conversation_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_context ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.context_summaries ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for conversation_sessions
CREATE POLICY "Users can manage their own sessions" ON public.conversation_sessions
    FOR ALL USING (auth.uid() = user_id);

-- Create RLS policies for conversation_context
CREATE POLICY "Users can manage their own context" ON public.conversation_context
    FOR ALL USING (auth.uid() = user_id);

-- Create RLS policies for context_summaries
CREATE POLICY "Users can manage their own summaries" ON public.context_summaries
    FOR ALL USING (auth.uid() = user_id);

-- =====================================================
-- 7. Utility Functions
-- =====================================================

-- Function to update last_activity_at automatically
CREATE OR REPLACE FUNCTION update_last_activity()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_activity_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic last_activity_at updates
CREATE TRIGGER update_chat_threads_activity
    BEFORE UPDATE ON public.chat_threads
    FOR EACH ROW EXECUTE FUNCTION update_last_activity();

CREATE TRIGGER update_conversation_sessions_activity
    BEFORE UPDATE ON public.conversation_sessions
    FOR EACH ROW EXECUTE FUNCTION update_last_activity();

-- Function to clean up expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM public.conversation_sessions 
    WHERE expires_at < NOW() AND is_active = FALSE;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 8. Initial Data Migration
-- =====================================================

-- Update existing chat_threads with session_ids based on creation patterns
UPDATE public.chat_threads 
SET session_id = CONCAT('legacy-', user_id, '-', DATE_TRUNC('day', created_at)::date)
WHERE session_id IS NULL;

-- Update existing chat_history with session_ids
UPDATE public.chat_history 
SET session_id = (
    SELECT session_id 
    FROM public.chat_threads 
    WHERE chat_threads.id = chat_history.thread_id
)
WHERE session_id IS NULL AND thread_id IS NOT NULL;

-- Set default importance scores based on message type
UPDATE public.chat_history 
SET message_importance_score = CASE 
    WHEN message_type = 'user' THEN 6
    WHEN message_type = 'agent' THEN 5
    ELSE 5
END
WHERE message_importance_score IS NULL;

COMMIT;
