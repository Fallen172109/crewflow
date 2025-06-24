-- Add Admin System to CrewFlow
-- This migration adds admin roles and functionality to existing CrewFlow installations
-- Run this in your Supabase SQL editor after the main schema

-- Add user role enum type
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('user', 'admin');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add role column to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS role user_role DEFAULT 'user';

-- Create admin helper function
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = user_id AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add admin policies for full access to all data
CREATE POLICY "Admins can view all users" ON public.users
    FOR SELECT USING (public.is_admin());

CREATE POLICY "Admins can update all users" ON public.users
    FOR UPDATE USING (public.is_admin());

CREATE POLICY "Admins can view all agent usage" ON public.agent_usage
    FOR ALL USING (public.is_admin());

CREATE POLICY "Admins can view all chat history" ON public.chat_history
    FOR ALL USING (public.is_admin());

CREATE POLICY "Admins can view all API connections" ON public.api_connections
    FOR ALL USING (public.is_admin());

CREATE POLICY "Admins can view all subscription history" ON public.subscription_history
    FOR ALL USING (public.is_admin());

-- Create admin audit log table
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    admin_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    action TEXT NOT NULL,
    target_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    details JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on admin audit log
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Admins can view audit logs" ON public.admin_audit_log
    FOR SELECT USING (public.is_admin());

-- Function to log admin actions
CREATE OR REPLACE FUNCTION public.log_admin_action(
    p_admin_id UUID,
    p_action TEXT,
    p_target_user_id UUID DEFAULT NULL,
    p_details JSONB DEFAULT '{}',
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    log_id UUID;
BEGIN
    INSERT INTO public.admin_audit_log (
        admin_id, action, target_user_id, details, ip_address, user_agent
    )
    VALUES (
        p_admin_id, p_action, p_target_user_id, p_details, p_ip_address, p_user_agent
    )
    RETURNING id INTO log_id;
    
    RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create system-wide analytics view for admins
CREATE OR REPLACE VIEW public.admin_system_overview AS
SELECT 
    (SELECT COUNT(*) FROM public.users) as total_users,
    (SELECT COUNT(*) FROM public.users WHERE role = 'admin') as admin_users,
    (SELECT COUNT(*) FROM public.users WHERE subscription_status = 'active') as active_subscribers,
    (SELECT COUNT(*) FROM public.users WHERE created_at >= NOW() - INTERVAL '30 days') as new_users_30d,
    (SELECT COUNT(*) FROM public.agent_usage WHERE created_at >= NOW() - INTERVAL '30 days') as requests_30d,
    (SELECT COUNT(DISTINCT user_id) FROM public.agent_usage WHERE created_at >= NOW() - INTERVAL '7 days') as active_users_7d;

-- Grant admin access to the overview
CREATE POLICY "Admins can view system overview" ON public.admin_system_overview
    FOR SELECT USING (public.is_admin());

-- Create function to promote user to admin (for initial setup)
CREATE OR REPLACE FUNCTION public.promote_to_admin(user_email TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    user_id UUID;
BEGIN
    -- Find user by email
    SELECT id INTO user_id FROM public.users WHERE email = user_email;
    
    IF user_id IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Update user role to admin
    UPDATE public.users SET role = 'admin' WHERE id = user_id;
    
    -- Log the promotion
    INSERT INTO public.admin_audit_log (admin_id, action, target_user_id, details)
    VALUES (user_id, 'SELF_PROMOTION', user_id, '{"method": "email_promotion"}'::jsonb);
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Instructions for setting up your admin account:
-- 1. Run this migration in Supabase SQL editor
-- 2. Replace 'your-email@example.com' with your actual email and run:
--    SELECT public.promote_to_admin('your-email@example.com');
-- 3. Verify with: SELECT email, role FROM public.users WHERE role = 'admin';
