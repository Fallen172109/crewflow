-- Shopify Integration Database Migration
-- Extends the database schema to support comprehensive Shopify e-commerce automation

BEGIN;

-- Create Shopify stores table for multi-store support
CREATE TABLE IF NOT EXISTS public.shopify_stores (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    integration_id UUID REFERENCES public.api_connections(id) ON DELETE CASCADE NOT NULL,
    
    -- Shopify store information
    shopify_store_id BIGINT NOT NULL,
    shop_domain TEXT NOT NULL,
    store_name TEXT NOT NULL,
    store_email TEXT,
    currency TEXT NOT NULL DEFAULT 'USD',
    timezone TEXT,
    plan_name TEXT,
    
    -- Store configuration
    primary_location_id BIGINT,
    multi_location_enabled BOOLEAN DEFAULT FALSE,
    taxes_included BOOLEAN DEFAULT FALSE,
    
    -- Store status and metadata
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    last_sync TIMESTAMP WITH TIME ZONE,
    sync_status TEXT DEFAULT 'pending' CHECK (sync_status IN ('pending', 'syncing', 'completed', 'error')),
    sync_error TEXT,
    
    -- Store metrics (cached for performance)
    total_products INTEGER DEFAULT 0,
    total_orders INTEGER DEFAULT 0,
    total_customers INTEGER DEFAULT 0,
    monthly_revenue DECIMAL(10,2) DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(user_id, shop_domain),
    UNIQUE(shopify_store_id, shop_domain)
);

-- Create Shopify webhooks configuration table
CREATE TABLE IF NOT EXISTS public.shopify_webhooks (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    store_id UUID REFERENCES public.shopify_stores(id) ON DELETE CASCADE NOT NULL,
    
    -- Webhook configuration
    shopify_webhook_id BIGINT,
    topic TEXT NOT NULL,
    address TEXT NOT NULL,
    format TEXT DEFAULT 'json' CHECK (format IN ('json', 'xml')),
    api_version TEXT DEFAULT '2024-01',
    
    -- Webhook status
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'error')),
    last_triggered TIMESTAMP WITH TIME ZONE,
    error_count INTEGER DEFAULT 0,
    last_error TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(store_id, topic)
);

-- Create Shopify webhook events log table
CREATE TABLE IF NOT EXISTS public.shopify_webhook_events (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    store_id UUID REFERENCES public.shopify_stores(id) ON DELETE CASCADE NOT NULL,
    webhook_id UUID REFERENCES public.shopify_webhooks(id) ON DELETE SET NULL,
    
    -- Event details
    topic TEXT NOT NULL,
    shopify_webhook_id TEXT,
    event_data JSONB NOT NULL,
    
    -- Processing status
    processed BOOLEAN DEFAULT FALSE,
    processed_at TIMESTAMP WITH TIME ZONE,
    processing_error TEXT,
    retry_count INTEGER DEFAULT 0,
    
    -- Event metadata
    shop_domain TEXT NOT NULL,
    event_id TEXT, -- Shopify's event ID if available
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Indexes for performance
    INDEX idx_shopify_webhook_events_store_topic (store_id, topic),
    INDEX idx_shopify_webhook_events_processed (processed, created_at),
    INDEX idx_shopify_webhook_events_shop_domain (shop_domain)
);

-- Create Shopify automation rules table
CREATE TABLE IF NOT EXISTS public.shopify_automation_rules (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    store_id UUID REFERENCES public.shopify_stores(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    
    -- Rule configuration
    rule_name TEXT NOT NULL,
    rule_description TEXT,
    trigger_event TEXT NOT NULL, -- e.g., 'orders/create', 'inventory_levels/update'
    conditions JSONB DEFAULT '{}', -- Conditions for rule execution
    actions JSONB NOT NULL, -- Actions to perform
    
    -- Rule status
    enabled BOOLEAN DEFAULT TRUE,
    last_executed TIMESTAMP WITH TIME ZONE,
    execution_count INTEGER DEFAULT 0,
    success_count INTEGER DEFAULT 0,
    error_count INTEGER DEFAULT 0,
    last_error TEXT,
    
    -- Agent assignment
    assigned_agent_id TEXT, -- Which CrewFlow agent handles this rule
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create Shopify sync status table for tracking data synchronization
CREATE TABLE IF NOT EXISTS public.shopify_sync_status (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    store_id UUID REFERENCES public.shopify_stores(id) ON DELETE CASCADE NOT NULL,
    
    -- Sync configuration
    entity_type TEXT NOT NULL, -- 'products', 'orders', 'customers', etc.
    last_sync_at TIMESTAMP WITH TIME ZONE,
    next_sync_at TIMESTAMP WITH TIME ZONE,
    sync_frequency INTERVAL DEFAULT '1 hour',
    
    -- Sync status
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'error')),
    records_synced INTEGER DEFAULT 0,
    records_failed INTEGER DEFAULT 0,
    error_message TEXT,
    
    -- Sync metadata
    last_cursor TEXT, -- For pagination
    sync_settings JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(store_id, entity_type)
);

-- Add Shopify-specific action permissions
INSERT INTO public.action_permissions (user_id, integration_id, action_type, enabled, max_frequency, restrictions)
SELECT 
    u.id as user_id,
    'shopify' as integration_id,
    action_type,
    enabled,
    max_frequency,
    restrictions
FROM public.users u
CROSS JOIN (
    VALUES 
        ('product_create', true, 'daily', '{"maxActions": 10}'),
        ('product_update', true, 'hourly', '{"maxActions": 50}'),
        ('inventory_update', true, 'hourly', '{"maxActions": 100}'),
        ('order_fulfill', true, 'hourly', '{"maxActions": 25}'),
        ('customer_create', true, 'daily', '{"maxActions": 20}'),
        ('price_update', false, 'daily', '{"maxActions": 5, "requiresApproval": true}'),
        ('bulk_operations', false, 'daily', '{"maxActions": 2, "requiresApproval": true}'),
        ('webhook_create', true, 'daily', '{"maxActions": 10}'),
        ('analytics_read', true, 'hourly', '{"maxActions": 200}'),
        ('marketing_campaign', false, 'daily', '{"maxActions": 3, "requiresApproval": true}')
) AS default_permissions(action_type, enabled, max_frequency, restrictions)
ON CONFLICT (user_id, integration_id, action_type) DO NOTHING;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_shopify_stores_user_id ON public.shopify_stores(user_id);
CREATE INDEX IF NOT EXISTS idx_shopify_stores_shop_domain ON public.shopify_stores(shop_domain);
CREATE INDEX IF NOT EXISTS idx_shopify_stores_status ON public.shopify_stores(status);

CREATE INDEX IF NOT EXISTS idx_shopify_webhooks_store_id ON public.shopify_webhooks(store_id);
CREATE INDEX IF NOT EXISTS idx_shopify_webhooks_topic ON public.shopify_webhooks(topic);
CREATE INDEX IF NOT EXISTS idx_shopify_webhooks_status ON public.shopify_webhooks(status);

CREATE INDEX IF NOT EXISTS idx_shopify_automation_rules_store_id ON public.shopify_automation_rules(store_id);
CREATE INDEX IF NOT EXISTS idx_shopify_automation_rules_trigger_event ON public.shopify_automation_rules(trigger_event);
CREATE INDEX IF NOT EXISTS idx_shopify_automation_rules_enabled ON public.shopify_automation_rules(enabled);

CREATE INDEX IF NOT EXISTS idx_shopify_sync_status_store_id ON public.shopify_sync_status(store_id);
CREATE INDEX IF NOT EXISTS idx_shopify_sync_status_entity_type ON public.shopify_sync_status(entity_type);
CREATE INDEX IF NOT EXISTS idx_shopify_sync_status_next_sync ON public.shopify_sync_status(next_sync_at);

-- Enable Row Level Security (RLS)
ALTER TABLE public.shopify_stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shopify_webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shopify_webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shopify_automation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shopify_sync_status ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own Shopify stores" ON public.shopify_stores
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own Shopify stores" ON public.shopify_stores
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view webhooks for their stores" ON public.shopify_webhooks
    FOR SELECT USING (
        store_id IN (SELECT id FROM public.shopify_stores WHERE user_id = auth.uid())
    );

CREATE POLICY "Users can manage webhooks for their stores" ON public.shopify_webhooks
    FOR ALL USING (
        store_id IN (SELECT id FROM public.shopify_stores WHERE user_id = auth.uid())
    );

CREATE POLICY "Users can view webhook events for their stores" ON public.shopify_webhook_events
    FOR SELECT USING (
        store_id IN (SELECT id FROM public.shopify_stores WHERE user_id = auth.uid())
    );

CREATE POLICY "System can insert webhook events" ON public.shopify_webhook_events
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can view their automation rules" ON public.shopify_automation_rules
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their automation rules" ON public.shopify_automation_rules
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view sync status for their stores" ON public.shopify_sync_status
    FOR SELECT USING (
        store_id IN (SELECT id FROM public.shopify_stores WHERE user_id = auth.uid())
    );

CREATE POLICY "System can manage sync status" ON public.shopify_sync_status
    FOR ALL WITH CHECK (true);

-- Create functions for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_shopify_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_shopify_stores_updated_at
    BEFORE UPDATE ON public.shopify_stores
    FOR EACH ROW EXECUTE FUNCTION update_shopify_updated_at();

CREATE TRIGGER update_shopify_webhooks_updated_at
    BEFORE UPDATE ON public.shopify_webhooks
    FOR EACH ROW EXECUTE FUNCTION update_shopify_updated_at();

CREATE TRIGGER update_shopify_automation_rules_updated_at
    BEFORE UPDATE ON public.shopify_automation_rules
    FOR EACH ROW EXECUTE FUNCTION update_shopify_updated_at();

CREATE TRIGGER update_shopify_sync_status_updated_at
    BEFORE UPDATE ON public.shopify_sync_status
    FOR EACH ROW EXECUTE FUNCTION update_shopify_updated_at();

-- Add comments for documentation
COMMENT ON TABLE public.shopify_stores IS 'Stores information about connected Shopify stores for each user';
COMMENT ON TABLE public.shopify_webhooks IS 'Configuration and status of Shopify webhooks for real-time synchronization';
COMMENT ON TABLE public.shopify_webhook_events IS 'Log of all webhook events received from Shopify stores';
COMMENT ON TABLE public.shopify_automation_rules IS 'User-defined automation rules for Shopify store management';
COMMENT ON TABLE public.shopify_sync_status IS 'Tracks synchronization status for different Shopify data entities';

COMMIT;
