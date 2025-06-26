-- Add task_type field to chat_history table for chat isolation
-- This enables proper separation of crew_ability, business_automation, and general chats

-- Add the task_type column
ALTER TABLE public.chat_history 
ADD COLUMN task_type TEXT DEFAULT 'general';

-- Update existing records to have 'general' task_type
UPDATE public.chat_history 
SET task_type = 'general' 
WHERE task_type IS NULL;

-- Add a check constraint to ensure valid task_type values
ALTER TABLE public.chat_history 
ADD CONSTRAINT chat_history_task_type_check 
CHECK (task_type IN ('general', 'crew_ability', 'business_automation'));

-- Create an index for better query performance when filtering by task_type
CREATE INDEX idx_chat_history_task_type ON public.chat_history(user_id, agent_name, task_type, timestamp);

-- Update the existing index to include task_type for better performance
DROP INDEX IF EXISTS idx_chat_history_user_agent;
CREATE INDEX idx_chat_history_user_agent_task ON public.chat_history(user_id, agent_name, task_type, timestamp DESC);
