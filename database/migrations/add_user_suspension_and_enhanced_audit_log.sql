-- Migration: Add User Suspension and Enhanced Audit Logging
-- Run this in your Supabase SQL editor to update existing database

-- Add suspension fields to users table
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS suspended BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
ADD COLUMN IF NOT EXISTS suspended_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS suspension_reason TEXT DEFAULT NULL;

-- Create admin action types enum
DO $$ BEGIN
    CREATE TYPE admin_action_type AS ENUM (
        'USER_MANAGEMENT',
        'SUBSCRIPTION_MANAGEMENT',
        'SYSTEM_ACCESS',
        'DATA_EXPORT',
        'SECURITY_ACTION',
        'CONFIGURATION_CHANGE'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Drop existing admin_audit_log table if it exists and recreate with new structure
DROP TABLE IF EXISTS public.admin_audit_log CASCADE;

-- Create enhanced admin audit log table
CREATE TABLE public.admin_audit_log (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    admin_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    action TEXT NOT NULL,
    action_type admin_action_type NOT NULL,
    target_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    target_user_email TEXT,
    details JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    success BOOLEAN DEFAULT TRUE,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on admin audit log
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Admins can view audit logs" ON public.admin_audit_log
    FOR SELECT USING (public.is_admin());

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_admin_id ON public.admin_audit_log(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_target_user ON public.admin_audit_log(target_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_action_type ON public.admin_audit_log(action_type);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_created_at ON public.admin_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_suspended ON public.users(suspended) WHERE suspended = TRUE;

-- Update the admin logging function
CREATE OR REPLACE FUNCTION public.log_admin_action(
    p_admin_id UUID,
    p_action TEXT,
    p_action_type admin_action_type,
    p_target_user_id UUID DEFAULT NULL,
    p_details JSONB DEFAULT '{}',
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_success BOOLEAN DEFAULT TRUE,
    p_error_message TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    log_id UUID;
    target_email TEXT;
BEGIN
    -- Get target user email if target_user_id is provided
    IF p_target_user_id IS NOT NULL THEN
        SELECT email INTO target_email
        FROM public.users
        WHERE id = p_target_user_id;
    END IF;

    INSERT INTO public.admin_audit_log (
        admin_id, action, action_type, target_user_id, target_user_email,
        details, ip_address, user_agent, success, error_message
    )
    VALUES (
        p_admin_id, p_action, p_action_type, p_target_user_id, target_email,
        p_details, p_ip_address, p_user_agent, p_success, p_error_message
    )
    RETURNING id INTO log_id;

    RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to suspend user
CREATE OR REPLACE FUNCTION public.suspend_user(
    p_admin_id UUID,
    p_target_user_id UUID,
    p_reason TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    target_user_record RECORD;
BEGIN
    -- Get target user info
    SELECT * INTO target_user_record
    FROM public.users
    WHERE id = p_target_user_id;

    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;

    -- Prevent admin from suspending themselves
    IF p_target_user_id = p_admin_id THEN
        RETURN FALSE;
    END IF;

    -- Update user suspension status
    UPDATE public.users
    SET
        suspended = TRUE,
        suspended_at = NOW(),
        suspended_by = p_admin_id,
        suspension_reason = p_reason,
        updated_at = NOW()
    WHERE id = p_target_user_id;

    -- Log the action
    PERFORM public.log_admin_action(
        p_admin_id,
        'SUSPEND_USER',
        'SECURITY_ACTION'::admin_action_type,
        p_target_user_id,
        jsonb_build_object(
            'reason', p_reason,
            'previous_status', jsonb_build_object(
                'suspended', target_user_record.suspended,
                'subscription_tier', target_user_record.subscription_tier,
                'subscription_status', target_user_record.subscription_status
            )
        )
    );

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to unsuspend user
CREATE OR REPLACE FUNCTION public.unsuspend_user(
    p_admin_id UUID,
    p_target_user_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    target_user_record RECORD;
BEGIN
    -- Get target user info
    SELECT * INTO target_user_record
    FROM public.users
    WHERE id = p_target_user_id;

    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;

    -- Update user suspension status
    UPDATE public.users
    SET
        suspended = FALSE,
        suspended_at = NULL,
        suspended_by = NULL,
        suspension_reason = NULL,
        updated_at = NOW()
    WHERE id = p_target_user_id;

    -- Log the action
    PERFORM public.log_admin_action(
        p_admin_id,
        'UNSUSPEND_USER',
        'SECURITY_ACTION'::admin_action_type,
        p_target_user_id,
        jsonb_build_object(
            'previous_suspension', jsonb_build_object(
                'suspended_at', target_user_record.suspended_at,
                'suspended_by', target_user_record.suspended_by,
                'suspension_reason', target_user_record.suspension_reason
            )
        )
    );

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update existing admin functions to use new logging format (backward compatibility)
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
    action_type_mapped admin_action_type;
BEGIN
    -- Map old actions to new action types for backward compatibility
    CASE
        WHEN p_action IN ('SUSPEND_USER', 'UNSUSPEND_USER', 'DELETE_USER') THEN
            action_type_mapped := 'SECURITY_ACTION';
        WHEN p_action IN ('UPDATE_SUBSCRIPTION', 'CHANGE_PLAN') THEN
            action_type_mapped := 'SUBSCRIPTION_MANAGEMENT';
        WHEN p_action IN ('PROMOTE_TO_ADMIN', 'UPDATE_USER', 'VIEW_USER') THEN
            action_type_mapped := 'USER_MANAGEMENT';
        WHEN p_action IN ('VIEW_USERS', 'VIEW_SYSTEM_ANALYTICS', 'VIEW_ALL_USERS') THEN
            action_type_mapped := 'SYSTEM_ACCESS';
        ELSE
            action_type_mapped := 'USER_MANAGEMENT';
    END CASE;

    RETURN public.log_admin_action(
        p_admin_id, p_action, action_type_mapped, p_target_user_id,
        p_details, p_ip_address, p_user_agent, TRUE, NULL
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the admin logging function
CREATE OR REPLACE FUNCTION public.log_admin_action(
    p_admin_id UUID,
    p_action TEXT,
    p_action_type admin_action_type,
    p_target_user_id UUID DEFAULT NULL,
    p_details JSONB DEFAULT '{}',
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_success BOOLEAN DEFAULT TRUE,
    p_error_message TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    log_id UUID;
    target_email TEXT;
BEGIN
    -- Get target user email if target_user_id is provided
    IF p_target_user_id IS NOT NULL THEN
        SELECT email INTO target_email
        FROM public.users
        WHERE id = p_target_user_id;
    END IF;

    INSERT INTO public.admin_audit_log (
        admin_id, action, action_type, target_user_id, target_user_email, 
        details, ip_address, user_agent, success, error_message
    )
    VALUES (
        p_admin_id, p_action, p_action_type, p_target_user_id, target_email,
        p_details, p_ip_address, p_user_agent, p_success, p_error_message
    )
    RETURNING id INTO log_id;

    RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to suspend user
CREATE OR REPLACE FUNCTION public.suspend_user(
    p_admin_id UUID,
    p_target_user_id UUID,
    p_reason TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    target_user_record RECORD;
BEGIN
    -- Get target user info
    SELECT * INTO target_user_record
    FROM public.users
    WHERE id = p_target_user_id;
    
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- Prevent admin from suspending themselves
    IF p_target_user_id = p_admin_id THEN
        RETURN FALSE;
    END IF;
    
    -- Update user suspension status
    UPDATE public.users
    SET 
        suspended = TRUE,
        suspended_at = NOW(),
        suspended_by = p_admin_id,
        suspension_reason = p_reason,
        updated_at = NOW()
    WHERE id = p_target_user_id;
    
    -- Log the action
    PERFORM public.log_admin_action(
        p_admin_id,
        'SUSPEND_USER',
        'SECURITY_ACTION'::admin_action_type,
        p_target_user_id,
        jsonb_build_object(
            'reason', p_reason,
            'previous_status', jsonb_build_object(
                'suspended', target_user_record.suspended,
                'subscription_tier', target_user_record.subscription_tier,
                'subscription_status', target_user_record.subscription_status
            )
        )
    );
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to unsuspend user
CREATE OR REPLACE FUNCTION public.unsuspend_user(
    p_admin_id UUID,
    p_target_user_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    target_user_record RECORD;
BEGIN
    -- Get target user info
    SELECT * INTO target_user_record
    FROM public.users
    WHERE id = p_target_user_id;
    
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- Update user suspension status
    UPDATE public.users
    SET 
        suspended = FALSE,
        suspended_at = NULL,
        suspended_by = NULL,
        suspension_reason = NULL,
        updated_at = NOW()
    WHERE id = p_target_user_id;
    
    -- Log the action
    PERFORM public.log_admin_action(
        p_admin_id,
        'UNSUSPEND_USER',
        'SECURITY_ACTION'::admin_action_type,
        p_target_user_id,
        jsonb_build_object(
            'previous_suspension', jsonb_build_object(
                'suspended_at', target_user_record.suspended_at,
                'suspended_by', target_user_record.suspended_by,
                'suspension_reason', target_user_record.suspension_reason
            )
        )
    );
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update existing admin functions to use new logging format (backward compatibility)
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
    action_type_mapped admin_action_type;
BEGIN
    -- Map old actions to new action types for backward compatibility
    CASE 
        WHEN p_action IN ('SUSPEND_USER', 'UNSUSPEND_USER', 'DELETE_USER') THEN
            action_type_mapped := 'SECURITY_ACTION';
        WHEN p_action IN ('UPDATE_SUBSCRIPTION', 'CHANGE_PLAN') THEN
            action_type_mapped := 'SUBSCRIPTION_MANAGEMENT';
        WHEN p_action IN ('PROMOTE_TO_ADMIN', 'UPDATE_USER', 'VIEW_USER') THEN
            action_type_mapped := 'USER_MANAGEMENT';
        WHEN p_action IN ('VIEW_USERS', 'VIEW_SYSTEM_ANALYTICS', 'VIEW_ALL_USERS') THEN
            action_type_mapped := 'SYSTEM_ACCESS';
        ELSE
            action_type_mapped := 'USER_MANAGEMENT';
    END CASE;

    RETURN public.log_admin_action(
        p_admin_id, p_action, action_type_mapped, p_target_user_id, 
        p_details, p_ip_address, p_user_agent, TRUE, NULL
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
