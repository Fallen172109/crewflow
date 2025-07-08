-- Create Shopify OAuth and Store Management Tables
-- This migration creates the missing tables required for Shopify OAuth integration

-- OAuth States Table for secure OAuth flow
CREATE TABLE IF NOT EXISTS oauth_states (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    state TEXT NOT NULL UNIQUE,
    shop_domain TEXT NOT NULL,
    integration_type TEXT DEFAULT 'shopify',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Shopify Stores Table for multi-store management
CREATE TABLE IF NOT EXISTS shopify_stores (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    shop_domain TEXT NOT NULL,
    store_name TEXT NOT NULL,
    store_email TEXT,
    currency TEXT DEFAULT 'USD',
    timezone TEXT,
    plan_name TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    is_primary BOOLEAN DEFAULT FALSE,
    connected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_sync_at TIMESTAMP WITH TIME ZONE,
    sync_status TEXT DEFAULT 'never' CHECK (sync_status IN ('never', 'syncing', 'synced', 'error')),
    sync_error TEXT,
    sync_data JSONB DEFAULT '{}'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb,
    permissions JSONB DEFAULT '{
        "read_products": true,
        "write_products": true,
        "read_orders": true,
        "write_orders": true,
        "read_customers": true,
        "write_customers": false,
        "read_analytics": true,
        "read_inventory": true,
        "write_inventory": true
    }'::jsonb,
    agent_access JSONB DEFAULT '{
        "anchor": {"enabled": true, "permissions": ["inventory_management", "order_fulfillment", "supplier_management"]},
        "pearl": {"enabled": true, "permissions": ["market_analysis", "customer_behavior_analysis", "product_research"]},
        "flint": {"enabled": true, "permissions": ["product_optimization", "discount_management", "abandoned_cart_recovery"]},
        "beacon": {"enabled": true, "permissions": ["customer_service", "order_tracking"]},
        "splash": {"enabled": true, "permissions": ["content_creation", "brand_consistency"]},
        "drake": {"enabled": true, "permissions": ["business_intelligence", "expansion_planning"]}
    }'::jsonb,
    UNIQUE(user_id, shop_domain)
);

-- API Connections Table (create if not exists, update if exists)
CREATE TABLE IF NOT EXISTS api_connections (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    integration_id TEXT NOT NULL,
    store_id UUID REFERENCES shopify_stores(id) ON DELETE CASCADE,
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    shop_domain TEXT,
    status TEXT DEFAULT 'connected' CHECK (status IN ('connected', 'disconnected', 'error', 'expired')),
    connected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    last_used_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}'::jsonb,
    UNIQUE(user_id, integration_id, shop_domain)
);

-- Webhook Configurations Table
CREATE TABLE IF NOT EXISTS webhook_configs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    store_id UUID REFERENCES shopify_stores(id) ON DELETE CASCADE,
    webhook_id BIGINT NOT NULL,
    topic TEXT NOT NULL,
    address TEXT NOT NULL,
    format TEXT DEFAULT 'json',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(store_id, webhook_id)
);

-- Webhook Events Table for processing
CREATE TABLE IF NOT EXISTS webhook_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    store_id UUID REFERENCES shopify_stores(id) ON DELETE CASCADE,
    topic TEXT NOT NULL,
    shop_domain TEXT NOT NULL,
    webhook_id BIGINT,
    payload JSONB NOT NULL,
    processed BOOLEAN DEFAULT FALSE,
    processed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_oauth_states_user_id ON oauth_states(user_id);
CREATE INDEX IF NOT EXISTS idx_oauth_states_state ON oauth_states(state);
CREATE INDEX IF NOT EXISTS idx_oauth_states_expires_at ON oauth_states(expires_at);

CREATE INDEX IF NOT EXISTS idx_shopify_stores_user_id ON shopify_stores(user_id);
CREATE INDEX IF NOT EXISTS idx_shopify_stores_shop_domain ON shopify_stores(shop_domain);
CREATE INDEX IF NOT EXISTS idx_shopify_stores_is_primary ON shopify_stores(user_id, is_primary) WHERE is_primary = TRUE;

CREATE INDEX IF NOT EXISTS idx_api_connections_user_id ON api_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_api_connections_integration ON api_connections(user_id, integration_id);
CREATE INDEX IF NOT EXISTS idx_api_connections_shop_domain ON api_connections(shop_domain);

CREATE INDEX IF NOT EXISTS idx_webhook_events_store_id ON webhook_events(store_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_processed ON webhook_events(processed, created_at);
CREATE INDEX IF NOT EXISTS idx_webhook_events_topic ON webhook_events(topic);

-- RLS Policies
ALTER TABLE oauth_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopify_stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;

-- OAuth States Policies
CREATE POLICY "Users can manage their own OAuth states" ON oauth_states
    FOR ALL USING (auth.uid() = user_id);

-- Shopify Stores Policies
CREATE POLICY "Users can manage their own stores" ON shopify_stores
    FOR ALL USING (auth.uid() = user_id);

-- API Connections Policies
CREATE POLICY "Users can manage their own API connections" ON api_connections
    FOR ALL USING (auth.uid() = user_id);

-- Webhook Configs Policies
CREATE POLICY "Users can manage webhooks for their stores" ON webhook_configs
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM shopify_stores 
            WHERE shopify_stores.id = webhook_configs.store_id 
            AND shopify_stores.user_id = auth.uid()
        )
    );

-- Webhook Events Policies
CREATE POLICY "Users can view webhook events for their stores" ON webhook_events
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM shopify_stores 
            WHERE shopify_stores.id = webhook_events.store_id 
            AND shopify_stores.user_id = auth.uid()
        )
    );

-- Functions for cleanup and maintenance
CREATE OR REPLACE FUNCTION cleanup_expired_oauth_states()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM oauth_states 
    WHERE expires_at < NOW() OR used = TRUE;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to ensure only one primary store per user
CREATE OR REPLACE FUNCTION ensure_single_primary_store()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_primary = TRUE THEN
        -- Remove primary status from other stores for this user
        UPDATE shopify_stores 
        SET is_primary = FALSE 
        WHERE user_id = NEW.user_id 
        AND id != NEW.id 
        AND is_primary = TRUE;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to maintain single primary store
CREATE TRIGGER trigger_ensure_single_primary_store
    BEFORE INSERT OR UPDATE ON shopify_stores
    FOR EACH ROW
    EXECUTE FUNCTION ensure_single_primary_store();

-- Grant necessary permissions
GRANT ALL ON oauth_states TO authenticated;
GRANT ALL ON shopify_stores TO authenticated;
GRANT ALL ON api_connections TO authenticated;
GRANT ALL ON webhook_configs TO authenticated;
GRANT SELECT ON webhook_events TO authenticated;
