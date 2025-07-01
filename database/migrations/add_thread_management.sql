-- Add thread management to chat system
-- This enables multiple concurrent conversations with each agent

-- Create threads table
CREATE TABLE IF NOT EXISTS public.chat_threads (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    agent_name TEXT NOT NULL,
    task_type TEXT NOT NULL DEFAULT 'general',
    title TEXT NOT NULL,
    context TEXT, -- Initial context provided by user
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT chat_threads_task_type_check 
    CHECK (task_type IN ('general', 'business_automation'))
);

-- Add thread_id to chat_history table
ALTER TABLE public.chat_history 
ADD COLUMN thread_id UUID REFERENCES public.chat_threads(id) ON DELETE CASCADE;

-- Create index for better performance
CREATE INDEX idx_chat_threads_user_agent ON public.chat_threads(user_id, agent_name);
CREATE INDEX idx_chat_threads_active ON public.chat_threads(user_id, is_active);
CREATE INDEX idx_chat_history_thread ON public.chat_history(thread_id);

-- Enable RLS on chat_threads
ALTER TABLE public.chat_threads ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for chat_threads
CREATE POLICY "Users can view their own threads" ON public.chat_threads
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own threads" ON public.chat_threads
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own threads" ON public.chat_threads
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own threads" ON public.chat_threads
    FOR DELETE USING (auth.uid() = user_id);

-- Admin policies for chat_threads
CREATE POLICY "Admins can view all threads" ON public.chat_threads
    FOR ALL USING (public.is_admin());

-- Update chat_history RLS to include thread-based access
DROP POLICY IF EXISTS "Users can view their own chat history" ON public.chat_history;
CREATE POLICY "Users can view their own chat history" ON public.chat_history
    FOR SELECT USING (
        auth.uid() = user_id OR
        (thread_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.chat_threads
            WHERE id = thread_id AND user_id = auth.uid()
        ))
    );

-- Create file attachments table for chat threads and messages
CREATE TABLE IF NOT EXISTS public.chat_attachments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    thread_id UUID REFERENCES public.chat_threads(id) ON DELETE CASCADE,
    message_id UUID REFERENCES public.chat_history(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_type TEXT NOT NULL, -- MIME type
    file_size BIGINT NOT NULL, -- Size in bytes
    storage_path TEXT NOT NULL, -- Path in Supabase storage
    public_url TEXT, -- Public URL for access
    upload_status TEXT DEFAULT 'uploading' CHECK (upload_status IN ('uploading', 'completed', 'failed')),
    metadata JSONB DEFAULT '{}', -- Additional file metadata (dimensions, etc.)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Ensure attachment belongs to either a thread or a message, but not both
    CONSTRAINT chat_attachments_context_check
    CHECK ((thread_id IS NOT NULL AND message_id IS NULL) OR (thread_id IS NULL AND message_id IS NOT NULL))
);

-- Create indexes for better performance
CREATE INDEX idx_chat_attachments_user ON public.chat_attachments(user_id);
CREATE INDEX idx_chat_attachments_thread ON public.chat_attachments(thread_id);
CREATE INDEX idx_chat_attachments_message ON public.chat_attachments(message_id);
CREATE INDEX idx_chat_attachments_created_at ON public.chat_attachments(created_at DESC);

-- Enable RLS on chat_attachments
ALTER TABLE public.chat_attachments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for chat_attachments
CREATE POLICY "Users can view their own attachments" ON public.chat_attachments
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own attachments" ON public.chat_attachments
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own attachments" ON public.chat_attachments
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own attachments" ON public.chat_attachments
    FOR DELETE USING (auth.uid() = user_id);

-- Function to automatically update thread updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_thread_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.chat_threads 
    SET updated_at = NOW() 
    WHERE id = NEW.thread_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update thread timestamp when new messages are added
CREATE TRIGGER update_thread_timestamp_trigger
    AFTER INSERT ON public.chat_history
    FOR EACH ROW
    WHEN (NEW.thread_id IS NOT NULL)
    EXECUTE FUNCTION public.update_thread_timestamp();
