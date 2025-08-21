-- Add image support to chat system
-- This enables image uploads, analysis, and display in chat conversations

-- Create chat_images table for dedicated image storage tracking
CREATE TABLE IF NOT EXISTS public.chat_images (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    thread_id UUID REFERENCES public.chat_threads(id) ON DELETE CASCADE,
    message_id UUID REFERENCES public.chat_history(id) ON DELETE CASCADE,
    
    -- Image file information
    file_name TEXT NOT NULL,
    original_name TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type TEXT NOT NULL,
    
    -- Storage information
    storage_path TEXT NOT NULL UNIQUE,
    bucket_name TEXT DEFAULT 'chat-images',
    public_url TEXT,
    signed_url TEXT,
    url_expires_at TIMESTAMP WITH TIME ZONE,
    
    -- Image metadata
    width INTEGER,
    height INTEGER,
    format TEXT,
    
    -- AI Analysis results
    analysis_completed BOOLEAN DEFAULT FALSE,
    analysis_description TEXT,
    analysis_tags TEXT[], -- Array of suggested tags
    quality_score DECIMAL(3,2), -- 0.00 to 1.00
    suitable_for_ecommerce BOOLEAN,
    detected_objects TEXT[],
    dominant_colors TEXT[],
    image_style TEXT,
    image_mood TEXT,
    
    -- Product integration
    use_for_product BOOLEAN DEFAULT FALSE,
    product_relevance TEXT,
    
    -- Status and timestamps
    upload_status TEXT DEFAULT 'uploading' CHECK (upload_status IN ('uploading', 'completed', 'failed', 'analyzing')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    analyzed_at TIMESTAMP WITH TIME ZONE,
    
    -- Constraints
    CONSTRAINT chat_images_context_check
    CHECK ((thread_id IS NOT NULL AND message_id IS NULL) OR (thread_id IS NULL AND message_id IS NOT NULL))
);

-- Create indexes for better performance
CREATE INDEX idx_chat_images_user ON public.chat_images(user_id);
CREATE INDEX idx_chat_images_thread ON public.chat_images(thread_id);
CREATE INDEX idx_chat_images_message ON public.chat_images(message_id);
CREATE INDEX idx_chat_images_created_at ON public.chat_images(created_at DESC);
CREATE INDEX idx_chat_images_upload_status ON public.chat_images(upload_status);
CREATE INDEX idx_chat_images_analysis ON public.chat_images(analysis_completed, analyzed_at);
CREATE INDEX idx_chat_images_product_use ON public.chat_images(use_for_product) WHERE use_for_product = TRUE;

-- Enable RLS on chat_images
ALTER TABLE public.chat_images ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for chat_images
CREATE POLICY "Users can view their own images" ON public.chat_images
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own images" ON public.chat_images
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own images" ON public.chat_images
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own images" ON public.chat_images
    FOR DELETE USING (auth.uid() = user_id);

-- Add image_context column to chat_history for storing image analysis context
ALTER TABLE public.chat_history 
ADD COLUMN IF NOT EXISTS image_context JSONB DEFAULT NULL;

-- Add comment to explain the image_context column
COMMENT ON COLUMN public.chat_history.image_context IS 'Stores AI analysis context for images attached to this message';

-- Create function to update image URL expiration
CREATE OR REPLACE FUNCTION public.refresh_image_signed_url(
    image_id UUID,
    new_signed_url TEXT,
    expires_at TIMESTAMP WITH TIME ZONE
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE public.chat_images 
    SET 
        signed_url = new_signed_url,
        url_expires_at = expires_at,
        updated_at = NOW()
    WHERE id = image_id AND user_id = auth.uid();
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to mark image analysis as completed
CREATE OR REPLACE FUNCTION public.complete_image_analysis(
    image_id UUID,
    analysis_data JSONB
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE public.chat_images 
    SET 
        analysis_completed = TRUE,
        analysis_description = analysis_data->>'description',
        analysis_tags = ARRAY(SELECT jsonb_array_elements_text(analysis_data->'suggestedTags')),
        quality_score = (analysis_data->>'qualityScore')::DECIMAL,
        suitable_for_ecommerce = (analysis_data->>'suitableForEcommerce')::BOOLEAN,
        detected_objects = ARRAY(SELECT jsonb_array_elements_text(analysis_data->'detectedObjects')),
        dominant_colors = ARRAY(SELECT jsonb_array_elements_text(analysis_data->'colors')),
        image_style = analysis_data->>'style',
        image_mood = analysis_data->>'mood',
        product_relevance = analysis_data->>'productRelevance',
        analyzed_at = NOW(),
        updated_at = NOW(),
        upload_status = 'completed'
    WHERE id = image_id AND user_id = auth.uid();
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get images for a thread with fresh URLs
CREATE OR REPLACE FUNCTION public.get_thread_images(thread_uuid UUID)
RETURNS TABLE (
    id UUID,
    file_name TEXT,
    original_name TEXT,
    storage_path TEXT,
    public_url TEXT,
    width INTEGER,
    height INTEGER,
    analysis_description TEXT,
    analysis_tags TEXT[],
    quality_score DECIMAL,
    suitable_for_ecommerce BOOLEAN,
    use_for_product BOOLEAN,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ci.id,
        ci.file_name,
        ci.original_name,
        ci.storage_path,
        ci.public_url,
        ci.width,
        ci.height,
        ci.analysis_description,
        ci.analysis_tags,
        ci.quality_score,
        ci.suitable_for_ecommerce,
        ci.use_for_product,
        ci.created_at
    FROM public.chat_images ci
    WHERE ci.thread_id = thread_uuid 
      AND ci.user_id = auth.uid()
      AND ci.upload_status = 'completed'
    ORDER BY ci.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_chat_images_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_chat_images_timestamp_trigger
    BEFORE UPDATE ON public.chat_images
    FOR EACH ROW
    EXECUTE FUNCTION public.update_chat_images_timestamp();

-- Create storage bucket for chat images (if not exists)
-- Note: This needs to be run manually in Supabase dashboard or via API
-- INSERT INTO storage.buckets (id, name, public) VALUES ('chat-images', 'chat-images', false);

-- Create storage policies for chat-images bucket
-- Note: These need to be created in Supabase dashboard or via API
/*
-- Policy: Users can upload their own images
CREATE POLICY "Users can upload images" ON storage.objects
FOR INSERT WITH CHECK (
    bucket_id = 'chat-images' 
    AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Users can view their own images
CREATE POLICY "Users can view own images" ON storage.objects
FOR SELECT USING (
    bucket_id = 'chat-images' 
    AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Users can delete their own images
CREATE POLICY "Users can delete own images" ON storage.objects
FOR DELETE USING (
    bucket_id = 'chat-images' 
    AND auth.uid()::text = (storage.foldername(name))[1]
);
*/
