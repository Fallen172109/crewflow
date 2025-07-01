-- Create agent_referrals table for tracking cross-agent referrals
CREATE TABLE IF NOT EXISTS agent_referrals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_agent_id TEXT NOT NULL,
  target_agent_id TEXT NOT NULL,
  original_message TEXT NOT NULL,
  domain_detected TEXT NOT NULL,
  confidence_score DECIMAL(3,2) NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 1),
  referral_reason TEXT NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  session_id TEXT,
  thread_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_agent_referrals_user_id ON agent_referrals(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_referrals_source_agent ON agent_referrals(source_agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_referrals_target_agent ON agent_referrals(target_agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_referrals_domain ON agent_referrals(domain_detected);
CREATE INDEX IF NOT EXISTS idx_agent_referrals_timestamp ON agent_referrals(timestamp);
CREATE INDEX IF NOT EXISTS idx_agent_referrals_thread_id ON agent_referrals(thread_id);

-- Create RLS policies
ALTER TABLE agent_referrals ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own referrals
CREATE POLICY "Users can view their own referrals" ON agent_referrals
  FOR SELECT USING (auth.uid() = user_id);

-- Policy: Users can insert their own referrals
CREATE POLICY "Users can insert their own referrals" ON agent_referrals
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: Admin users can view all referrals
CREATE POLICY "Admin users can view all referrals" ON agent_referrals
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.user_id = auth.uid() 
      AND user_profiles.role = 'admin'
    )
  );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_agent_referrals_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_agent_referrals_updated_at
  BEFORE UPDATE ON agent_referrals
  FOR EACH ROW
  EXECUTE FUNCTION update_agent_referrals_updated_at();

-- Create function for creating the table (used by the analytics module)
CREATE OR REPLACE FUNCTION create_referral_table()
RETURNS void AS $$
BEGIN
  -- This function is a placeholder since the table is created by this migration
  -- It's used by the referral analytics module to ensure the table exists
  RAISE NOTICE 'Agent referrals table already exists';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON agent_referrals TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
