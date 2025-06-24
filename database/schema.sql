-- CrewFlow Database Schema
-- Run this in your Supabase SQL editor

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types
CREATE TYPE subscription_tier AS ENUM ('starter', 'professional', 'enterprise');
CREATE TYPE subscription_status AS ENUM ('active', 'inactive', 'cancelled', 'past_due');
CREATE TYPE message_type AS ENUM ('user', 'agent');
CREATE TYPE connection_status AS ENUM ('connected', 'disconnected', 'error', 'expired');
CREATE TYPE user_role AS ENUM ('user', 'admin');

-- Users table (extends Supabase auth.users)
CREATE TABLE public.users (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT NOT NULL,
    role user_role DEFAULT 'user',
    subscription_tier subscription_tier DEFAULT NULL,
    subscription_status subscription_status DEFAULT NULL,
    stripe_customer_id TEXT DEFAULT NULL,
    stripe_subscription_id TEXT DEFAULT NULL,
    suspended BOOLEAN DEFAULT FALSE,
    suspended_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    suspended_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    suspension_reason TEXT DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Agent usage tracking
CREATE TABLE public.agent_usage (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    agent_name TEXT NOT NULL,
    requests_used INTEGER DEFAULT 0,
    month_year TEXT NOT NULL, -- Format: YYYY-MM
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, agent_name, month_year)
);

-- Chat history
CREATE TABLE public.chat_history (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    agent_name TEXT NOT NULL,
    message_type message_type NOT NULL,
    content TEXT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    archived BOOLEAN DEFAULT FALSE
);

-- API connections (updated for OAuth support)
CREATE TABLE public.api_connections (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    integration_id TEXT NOT NULL, -- e.g., 'facebook-business', 'salesforce', etc.
    service_name TEXT NOT NULL, -- Legacy field, kept for backward compatibility

    -- OAuth fields
    access_token TEXT, -- OAuth access token (encrypted)
    refresh_token TEXT, -- OAuth refresh token (encrypted)
    expires_at TIMESTAMP WITH TIME ZONE, -- Token expiration time
    token_type TEXT DEFAULT 'Bearer', -- Token type (usually Bearer)
    scope TEXT, -- Granted scopes

    -- Legacy API key field (for non-OAuth integrations)
    api_key_encrypted TEXT,

    -- Connection metadata
    status TEXT DEFAULT 'disconnected', -- 'connected', 'disconnected', 'error', 'expired'
    connected_at TIMESTAMP WITH TIME ZONE,
    last_sync TIMESTAMP WITH TIME ZONE,
    error TEXT, -- Last error message if any

    -- Facebook-specific fields
    facebook_user_id TEXT, -- Facebook user ID
    facebook_pages JSONB DEFAULT '[]', -- Array of connected Facebook pages
    facebook_business_id TEXT, -- Facebook Business Manager ID

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, integration_id)
);

-- Subscription history
CREATE TABLE public.subscription_history (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    stripe_subscription_id TEXT NOT NULL,
    tier subscription_tier NOT NULL,
    status TEXT NOT NULL,
    period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_agent_usage_user_month ON public.agent_usage(user_id, month_year);
CREATE INDEX idx_chat_history_user_agent ON public.chat_history(user_id, agent_name);
CREATE INDEX idx_chat_history_timestamp ON public.chat_history(timestamp DESC);
CREATE INDEX idx_api_connections_user ON public.api_connections(user_id);
CREATE INDEX idx_subscription_history_user ON public.subscription_history(user_id);
CREATE INDEX idx_admin_audit_log_admin_id ON public.admin_audit_log(admin_id);
CREATE INDEX idx_admin_audit_log_target_user ON public.admin_audit_log(target_user_id);
CREATE INDEX idx_admin_audit_log_action_type ON public.admin_audit_log(action_type);
CREATE INDEX idx_admin_audit_log_created_at ON public.admin_audit_log(created_at DESC);
CREATE INDEX idx_users_suspended ON public.users(suspended) WHERE suspended = TRUE;

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agent_usage_updated_at BEFORE UPDATE ON public.agent_usage
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_api_connections_updated_at BEFORE UPDATE ON public.api_connections
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) policies
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_history ENABLE ROW LEVEL SECURITY;

-- Users can only see their own data
CREATE POLICY "Users can view own profile" ON public.users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.users
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can view own agent usage" ON public.agent_usage
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own chat history" ON public.chat_history
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own API connections" ON public.api_connections
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own subscription history" ON public.subscription_history
    FOR SELECT USING (auth.uid() = user_id);

-- Function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email)
    VALUES (NEW.id, NEW.email);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user registration
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to get or create agent usage record
CREATE OR REPLACE FUNCTION public.get_or_create_agent_usage(
    p_user_id UUID,
    p_agent_name TEXT,
    p_month_year TEXT
)
RETURNS public.agent_usage AS $$
DECLARE
    usage_record public.agent_usage;
BEGIN
    SELECT * INTO usage_record
    FROM public.agent_usage
    WHERE user_id = p_user_id
    AND agent_name = p_agent_name
    AND month_year = p_month_year;
    
    IF NOT FOUND THEN
        INSERT INTO public.agent_usage (user_id, agent_name, month_year, requests_used)
        VALUES (p_user_id, p_agent_name, p_month_year, 0)
        RETURNING * INTO usage_record;
    END IF;
    
    RETURN usage_record;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment agent usage
CREATE OR REPLACE FUNCTION public.increment_agent_usage(
    p_user_id UUID,
    p_agent_name TEXT
)
RETURNS INTEGER AS $$
DECLARE
    current_month TEXT;
    new_count INTEGER;
BEGIN
    current_month := TO_CHAR(NOW(), 'YYYY-MM');
    
    INSERT INTO public.agent_usage (user_id, agent_name, month_year, requests_used)
    VALUES (p_user_id, p_agent_name, current_month, 1)
    ON CONFLICT (user_id, agent_name, month_year)
    DO UPDATE SET 
        requests_used = public.agent_usage.requests_used + 1,
        updated_at = NOW()
    RETURNING requests_used INTO new_count;
    
    RETURN new_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Admin helper function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.users
        WHERE id = user_id AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Admin policies for full access to all data
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

-- Create admin action types enum
CREATE TYPE admin_action_type AS ENUM (
    'USER_MANAGEMENT',
    'SUBSCRIPTION_MANAGEMENT',
    'SYSTEM_ACCESS',
    'DATA_EXPORT',
    'SECURITY_ACTION',
    'CONFIGURATION_CHANGE'
);

-- Admin audit log table
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

-- Function to log admin actions
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
