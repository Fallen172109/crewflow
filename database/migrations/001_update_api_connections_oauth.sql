-- Migration: Update api_connections table for OAuth support
-- Run this in your Supabase SQL editor to update existing database

-- First, update the connection_status enum to include 'expired'
ALTER TYPE connection_status ADD VALUE IF NOT EXISTS 'expired';

-- Add new columns to api_connections table
ALTER TABLE public.api_connections 
ADD COLUMN IF NOT EXISTS integration_id TEXT,
ADD COLUMN IF NOT EXISTS access_token TEXT,
ADD COLUMN IF NOT EXISTS refresh_token TEXT,
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS token_type TEXT DEFAULT 'Bearer',
ADD COLUMN IF NOT EXISTS scope TEXT,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'disconnected',
ADD COLUMN IF NOT EXISTS connected_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS last_sync TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS error TEXT,
ADD COLUMN IF NOT EXISTS facebook_user_id TEXT,
ADD COLUMN IF NOT EXISTS facebook_pages JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS facebook_business_id TEXT;

-- Migrate existing data: set integration_id based on service_name
UPDATE public.api_connections 
SET integration_id = service_name 
WHERE integration_id IS NULL;

-- Make integration_id NOT NULL after migration
ALTER TABLE public.api_connections 
ALTER COLUMN integration_id SET NOT NULL;

-- Drop the old unique constraint and create new one
ALTER TABLE public.api_connections 
DROP CONSTRAINT IF EXISTS api_connections_user_id_service_name_key;

-- Add new unique constraint
ALTER TABLE public.api_connections 
ADD CONSTRAINT api_connections_user_id_integration_id_key 
UNIQUE (user_id, integration_id);

-- Update existing connection_status values to new status column
UPDATE public.api_connections 
SET status = connection_status::text 
WHERE status = 'disconnected';

-- Create indexes for better performance on new columns
CREATE INDEX IF NOT EXISTS idx_api_connections_integration_id ON public.api_connections(integration_id);
CREATE INDEX IF NOT EXISTS idx_api_connections_status ON public.api_connections(status);
CREATE INDEX IF NOT EXISTS idx_api_connections_expires_at ON public.api_connections(expires_at);
CREATE INDEX IF NOT EXISTS idx_api_connections_facebook_user_id ON public.api_connections(facebook_user_id);

-- Update RLS policies to work with new schema
-- (The existing policies should still work as they use user_id)

COMMENT ON TABLE public.api_connections IS 'Stores OAuth and API key connections for third-party integrations';
COMMENT ON COLUMN public.api_connections.integration_id IS 'Unique identifier for the integration (e.g., facebook-business, salesforce)';
COMMENT ON COLUMN public.api_connections.access_token IS 'OAuth access token (encrypted)';
COMMENT ON COLUMN public.api_connections.refresh_token IS 'OAuth refresh token (encrypted)';
COMMENT ON COLUMN public.api_connections.facebook_pages IS 'JSON array of connected Facebook pages with metadata';
