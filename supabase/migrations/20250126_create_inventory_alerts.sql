-- Create inventory alerts table for tracking low stock notifications
-- This prevents spam alerts and tracks inventory monitoring history

CREATE TABLE IF NOT EXISTS inventory_alerts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    store_id UUID REFERENCES shopify_stores(id) ON DELETE CASCADE NOT NULL,
    
    -- Product identification
    product_id BIGINT NOT NULL, -- Shopify product ID
    variant_id BIGINT, -- Shopify variant ID (optional)
    inventory_item_id BIGINT NOT NULL, -- Shopify inventory item ID
    location_id BIGINT NOT NULL, -- Shopify location ID
    
    -- Product details (cached for performance)
    product_title TEXT NOT NULL,
    variant_title TEXT,
    sku TEXT,
    
    -- Alert configuration
    threshold_quantity INTEGER NOT NULL DEFAULT 10,
    current_quantity INTEGER NOT NULL DEFAULT 0,
    alert_triggered BOOLEAN DEFAULT FALSE,
    alert_level TEXT DEFAULT 'low' CHECK (alert_level IN ('low', 'critical', 'out_of_stock')),
    
    -- Tracking timestamps
    last_checked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_alert_sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Alert metadata
    alert_count INTEGER DEFAULT 0, -- Number of times alert has been sent
    suppressed_until TIMESTAMP WITH TIME ZONE, -- Suppress alerts until this time
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Constraints
    UNIQUE(user_id, store_id, inventory_item_id, location_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_inventory_alerts_user_store ON inventory_alerts(user_id, store_id);
CREATE INDEX IF NOT EXISTS idx_inventory_alerts_product ON inventory_alerts(product_id, variant_id);
CREATE INDEX IF NOT EXISTS idx_inventory_alerts_threshold ON inventory_alerts(current_quantity, threshold_quantity) WHERE alert_triggered = false;
CREATE INDEX IF NOT EXISTS idx_inventory_alerts_last_checked ON inventory_alerts(last_checked_at);
CREATE INDEX IF NOT EXISTS idx_inventory_alerts_suppressed ON inventory_alerts(suppressed_until) WHERE suppressed_until IS NOT NULL;

-- Create marketing snippets table for Flint agent
CREATE TABLE IF NOT EXISTS marketing_snippets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    store_id UUID REFERENCES shopify_stores(id) ON DELETE CASCADE,
    
    -- Content details
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    content_type TEXT NOT NULL CHECK (content_type IN ('product_description', 'ad_copy', 'social_post', 'email_subject', 'seo_title', 'meta_description')),
    platform TEXT CHECK (platform IN ('instagram', 'facebook', 'twitter', 'google_ads', 'email', 'shopify', 'general')),
    
    -- Associated product (optional)
    product_id BIGINT,
    product_title TEXT,
    
    -- Content metadata
    character_count INTEGER GENERATED ALWAYS AS (LENGTH(content)) STORED,
    word_count INTEGER,
    keywords TEXT[],
    tone TEXT CHECK (tone IN ('professional', 'casual', 'playful', 'urgent', 'friendly', 'authoritative')),
    
    -- Usage tracking
    used_count INTEGER DEFAULT 0,
    last_used_at TIMESTAMP WITH TIME ZONE,
    is_favorite BOOLEAN DEFAULT FALSE,
    
    -- AI generation metadata
    ai_model TEXT,
    generation_prompt TEXT,
    generation_cost DECIMAL(10,6) DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- User plan restrictions
    plan_tier TEXT DEFAULT 'starter' CHECK (plan_tier IN ('starter', 'professional', 'enterprise'))
);

-- Create indexes for marketing snippets
CREATE INDEX IF NOT EXISTS idx_marketing_snippets_user ON marketing_snippets(user_id);
CREATE INDEX IF NOT EXISTS idx_marketing_snippets_store ON marketing_snippets(store_id);
CREATE INDEX IF NOT EXISTS idx_marketing_snippets_type ON marketing_snippets(content_type, platform);
CREATE INDEX IF NOT EXISTS idx_marketing_snippets_product ON marketing_snippets(product_id) WHERE product_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_marketing_snippets_favorites ON marketing_snippets(user_id, is_favorite) WHERE is_favorite = true;
CREATE INDEX IF NOT EXISTS idx_marketing_snippets_recent ON marketing_snippets(user_id, created_at DESC);

-- Create RLS policies for inventory_alerts
ALTER TABLE inventory_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own inventory alerts" ON inventory_alerts
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own inventory alerts" ON inventory_alerts
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own inventory alerts" ON inventory_alerts
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own inventory alerts" ON inventory_alerts
    FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for marketing_snippets
ALTER TABLE marketing_snippets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own marketing snippets" ON marketing_snippets
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own marketing snippets" ON marketing_snippets
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own marketing snippets" ON marketing_snippets
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own marketing snippets" ON marketing_snippets
    FOR DELETE USING (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_inventory_alerts_updated_at BEFORE UPDATE ON inventory_alerts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_marketing_snippets_updated_at BEFORE UPDATE ON marketing_snippets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
