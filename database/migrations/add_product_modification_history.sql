-- Add product modification history tracking
-- This enables tracking of AI-powered product modifications for analytics and rollback capabilities

-- Create product modification history table
CREATE TABLE IF NOT EXISTS public.product_modification_history (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    store_id TEXT NOT NULL,
    product_title TEXT NOT NULL,
    original_product JSONB NOT NULL,
    modified_product JSONB NOT NULL,
    modification_request TEXT NOT NULL,
    modifications JSONB NOT NULL DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_product_modification_history_user_store ON public.product_modification_history(user_id, store_id);
CREATE INDEX idx_product_modification_history_product ON public.product_modification_history(user_id, store_id, product_title);
CREATE INDEX idx_product_modification_history_created ON public.product_modification_history(created_at);

-- Enable RLS on product_modification_history
ALTER TABLE public.product_modification_history ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for product_modification_history
CREATE POLICY "Users can view their own modification history" ON public.product_modification_history
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own modification history" ON public.product_modification_history
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own modification history" ON public.product_modification_history
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own modification history" ON public.product_modification_history
    FOR DELETE USING (auth.uid() = user_id);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_modification_history_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update timestamp on modification history updates
CREATE TRIGGER update_modification_history_timestamp_trigger
    BEFORE UPDATE ON public.product_modification_history
    FOR EACH ROW
    EXECUTE FUNCTION public.update_modification_history_timestamp();

-- Create product drafts table if it doesn't exist (for storing temporary product data)
CREATE TABLE IF NOT EXISTS public.product_drafts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    store_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10,2),
    category TEXT,
    tags JSONB DEFAULT '[]',
    variants JSONB DEFAULT '[]',
    images JSONB DEFAULT '[]',
    published BOOLEAN DEFAULT FALSE,
    shopify_product_id BIGINT,
    published_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for product drafts
CREATE INDEX idx_product_drafts_user_store ON public.product_drafts(user_id, store_id);
CREATE INDEX idx_product_drafts_published ON public.product_drafts(user_id, published);
CREATE INDEX idx_product_drafts_created ON public.product_drafts(created_at);

-- Enable RLS on product_drafts
ALTER TABLE public.product_drafts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for product_drafts
CREATE POLICY "Users can view their own product drafts" ON public.product_drafts
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own product drafts" ON public.product_drafts
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own product drafts" ON public.product_drafts
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own product drafts" ON public.product_drafts
    FOR DELETE USING (auth.uid() = user_id);

-- Function to automatically update product drafts timestamp
CREATE OR REPLACE FUNCTION public.update_product_drafts_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update timestamp on product drafts updates
CREATE TRIGGER update_product_drafts_timestamp_trigger
    BEFORE UPDATE ON public.product_drafts
    FOR EACH ROW
    EXECUTE FUNCTION public.update_product_drafts_timestamp();

-- Create function to clean up old modification history (optional, for maintenance)
CREATE OR REPLACE FUNCTION public.cleanup_old_modification_history(days_to_keep INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM public.product_modification_history 
    WHERE created_at < NOW() - INTERVAL '1 day' * days_to_keep;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Create function to get modification statistics
CREATE OR REPLACE FUNCTION public.get_modification_stats(user_uuid UUID, store_id_param TEXT DEFAULT NULL)
RETURNS TABLE (
    total_modifications BIGINT,
    unique_products BIGINT,
    avg_modifications_per_product NUMERIC,
    most_modified_product TEXT,
    modification_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    WITH stats AS (
        SELECT 
            COUNT(*) as total_mods,
            COUNT(DISTINCT product_title) as unique_prods,
            ROUND(COUNT(*)::NUMERIC / NULLIF(COUNT(DISTINCT product_title), 0), 2) as avg_mods
        FROM public.product_modification_history 
        WHERE user_id = user_uuid 
        AND (store_id_param IS NULL OR store_id = store_id_param)
    ),
    top_product AS (
        SELECT 
            product_title,
            COUNT(*) as mod_count
        FROM public.product_modification_history 
        WHERE user_id = user_uuid 
        AND (store_id_param IS NULL OR store_id = store_id_param)
        GROUP BY product_title 
        ORDER BY COUNT(*) DESC 
        LIMIT 1
    )
    SELECT 
        s.total_mods,
        s.unique_prods,
        s.avg_mods,
        COALESCE(tp.product_title, 'None'),
        COALESCE(tp.mod_count, 0)
    FROM stats s
    LEFT JOIN top_product tp ON true;
END;
$$ LANGUAGE plpgsql;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.product_modification_history TO authenticated;
GRANT ALL ON public.product_drafts TO authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_old_modification_history TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_modification_stats TO authenticated;

-- Add comments for documentation
COMMENT ON TABLE public.product_modification_history IS 'Tracks AI-powered product modifications for analytics and rollback capabilities';
COMMENT ON TABLE public.product_drafts IS 'Stores temporary product data before publishing to Shopify';
COMMENT ON FUNCTION public.cleanup_old_modification_history IS 'Removes modification history older than specified days (default 90)';
COMMENT ON FUNCTION public.get_modification_stats IS 'Returns modification statistics for a user and optionally a specific store';
