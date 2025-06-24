-- OAuth Schema Migration Script
-- Migrates from api_connections to enhanced oauth_integrations table
-- Run this script carefully in production

BEGIN;

-- Step 1: Create backup of existing data
CREATE TABLE IF NOT EXISTS api_connections_backup AS 
SELECT * FROM api_connections;

-- Step 2: Migrate existing data to new oauth_integrations table
INSERT INTO oauth_integrations (
  user_id,
  integration_id,
  integration_name,
  integration_category,
  access_token_encrypted,
  status,
  created_at,
  updated_at,
  connected_at
)
SELECT 
  user_id,
  service_name as integration_id,
  INITCAP(REPLACE(service_name, '-', ' ')) as integration_name,
  CASE 
    WHEN service_name IN ('facebook-business', 'facebook-ads', 'twitter', 'linkedin') THEN 'social'
    WHEN service_name IN ('google-ads') THEN 'advertising'
    WHEN service_name IN ('salesforce', 'hubspot') THEN 'crm'
    WHEN service_name IN ('shopify') THEN 'ecommerce'
    WHEN service_name IN ('mailchimp') THEN 'marketing'
    WHEN service_name IN ('slack', 'discord') THEN 'communication'
    WHEN service_name IN ('jira', 'asana', 'monday') THEN 'project-management'
    ELSE 'other'
  END as integration_category,
  api_key_encrypted as access_token_encrypted,
  CASE connection_status::text
    WHEN 'connected' THEN 'connected'
    WHEN 'disconnected' THEN 'disconnected'
    ELSE 'error'
  END as status,
  created_at,
  updated_at,
  CASE 
    WHEN connection_status::text = 'connected' THEN created_at
    ELSE NULL
  END as connected_at
FROM api_connections
ON CONFLICT (user_id, integration_id) DO NOTHING;

-- Step 3: Verify migration
DO $$
DECLARE
  old_count INTEGER;
  new_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO old_count FROM api_connections;
  SELECT COUNT(*) INTO new_count FROM oauth_integrations;
  
  RAISE NOTICE 'Migration Summary:';
  RAISE NOTICE 'Old api_connections records: %', old_count;
  RAISE NOTICE 'New oauth_integrations records: %', new_count;
  
  IF new_count < old_count THEN
    RAISE WARNING 'Some records may not have been migrated. Please review.';
  END IF;
END $$;

-- Step 4: Create view for backward compatibility (optional)
CREATE OR REPLACE VIEW api_connections_view AS
SELECT 
  id,
  user_id,
  integration_id as service_name,
  access_token_encrypted as api_key_encrypted,
  status::text as connection_status,
  created_at,
  updated_at
FROM oauth_integrations;

COMMIT;

-- Note: After verifying the migration is successful, you can drop the old table:
-- DROP TABLE api_connections CASCADE;
