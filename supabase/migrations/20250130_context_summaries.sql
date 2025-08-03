-- Create context_summaries table for Smart Context Compression
-- This table stores AI-generated summaries of conversation history to improve performance

CREATE TABLE IF NOT EXISTS context_summaries (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  thread_id TEXT NOT NULL,
  time_range_start TIMESTAMPTZ NOT NULL,
  time_range_end TIMESTAMPTZ NOT NULL,
  summary TEXT NOT NULL,
  key_topics TEXT[] DEFAULT '{}',
  important_decisions TEXT[] DEFAULT '{}',
  relevance_score DECIMAL(3,2) DEFAULT 0.5 CHECK (relevance_score >= 0 AND relevance_score <= 1),
  message_count INTEGER DEFAULT 0,
  tokens_compressed INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_context_summaries_user_thread 
  ON context_summaries(user_id, thread_id);

CREATE INDEX IF NOT EXISTS idx_context_summaries_relevance 
  ON context_summaries(user_id, relevance_score DESC);

CREATE INDEX IF NOT EXISTS idx_context_summaries_time_range 
  ON context_summaries(user_id, time_range_start, time_range_end);

CREATE INDEX IF NOT EXISTS idx_context_summaries_created_at 
  ON context_summaries(created_at DESC);

-- Add RLS policies
ALTER TABLE context_summaries ENABLE ROW LEVEL SECURITY;

-- Users can only access their own summaries
CREATE POLICY "Users can view own context summaries" 
  ON context_summaries FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own context summaries" 
  ON context_summaries FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own context summaries" 
  ON context_summaries FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own context summaries" 
  ON context_summaries FOR DELETE 
  USING (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_context_summaries_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER context_summaries_updated_at
  BEFORE UPDATE ON context_summaries
  FOR EACH ROW
  EXECUTE FUNCTION update_context_summaries_updated_at();

-- Add compression metadata to existing chat_history table (if not exists)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'chat_history' AND column_name = 'relevance_score'
  ) THEN
    ALTER TABLE chat_history ADD COLUMN relevance_score DECIMAL(3,2) DEFAULT 0.5;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'chat_history' AND column_name = 'compressed'
  ) THEN
    ALTER TABLE chat_history ADD COLUMN compressed BOOLEAN DEFAULT FALSE;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'chat_history' AND column_name = 'summary_id'
  ) THEN
    ALTER TABLE chat_history ADD COLUMN summary_id TEXT REFERENCES context_summaries(id);
  END IF;
END $$;

-- Create index for relevance scoring on chat_history
CREATE INDEX IF NOT EXISTS idx_chat_history_relevance 
  ON chat_history(user_id, relevance_score DESC) 
  WHERE archived = FALSE;

-- Create index for compressed messages
CREATE INDEX IF NOT EXISTS idx_chat_history_compressed 
  ON chat_history(user_id, compressed, timestamp DESC) 
  WHERE archived = FALSE;

-- Add comment explaining the table purpose
COMMENT ON TABLE context_summaries IS 'Stores AI-generated summaries of conversation history for Smart Context Compression. Improves chat performance by reducing the amount of historical data that needs to be loaded.';

COMMENT ON COLUMN context_summaries.relevance_score IS 'AI-calculated relevance score (0-1) used for filtering and prioritization';
COMMENT ON COLUMN context_summaries.message_count IS 'Number of original messages that were compressed into this summary';
COMMENT ON COLUMN context_summaries.tokens_compressed IS 'Estimated token count of the original messages that were compressed';
COMMENT ON COLUMN context_summaries.key_topics IS 'Array of key topics discussed in the summarized conversation segment';
COMMENT ON COLUMN context_summaries.important_decisions IS 'Array of important decisions or actions taken in the summarized segment';
