-- CrewFlow Database Schema
-- Run this in your Supabase SQL editor

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types
CREATE TYPE subscription_tier AS ENUM ('starter', 'professional', 'enterprise');
CREATE TYPE subscription_status AS ENUM ('active', 'inactive', 'cancelled', 'past_due');
CREATE TYPE message_type AS ENUM ('user', 'agent');
CREATE TYPE connection_status AS ENUM ('connected', 'disconnected', 'error');

-- Users table (extends Supabase auth.users)
CREATE TABLE public.users (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT NOT NULL,
    subscription_tier subscription_tier DEFAULT NULL,
    subscription_status subscription_status DEFAULT NULL,
    stripe_customer_id TEXT DEFAULT NULL,
    stripe_subscription_id TEXT DEFAULT NULL,
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

-- API connections
CREATE TABLE public.api_connections (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    service_name TEXT NOT NULL,
    api_key_encrypted TEXT NOT NULL,
    connection_status connection_status DEFAULT 'disconnected',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, service_name)
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
