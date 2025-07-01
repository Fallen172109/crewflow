-- Meal Planning Schema Migration
-- Creates comprehensive tables for meal planning functionality

-- User meal planning profiles
CREATE TABLE IF NOT EXISTS public.user_meal_profiles (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    
    -- Physical characteristics
    height_value DECIMAL(5,2), -- e.g., 175.5
    height_unit TEXT CHECK (height_unit IN ('cm', 'ft_in', 'inches', 'm')) DEFAULT 'cm',
    weight_value DECIMAL(8,2), -- e.g., 70.5 (increased precision for grams)
    weight_unit TEXT CHECK (weight_unit IN ('kg', 'lbs', 'g', 'oz', 'stone')) DEFAULT 'kg',
    age INTEGER CHECK (age >= 13 AND age <= 120), -- For BMR calculations
    gender TEXT CHECK (gender IN ('male', 'female', 'other')), -- For BMR calculations
    
    -- Goals and timeline
    primary_goal TEXT CHECK (primary_goal IN ('weight_loss', 'weight_gain', 'muscle_building', 'maintenance', 'athletic_performance', 'health_improvement')) NOT NULL,
    target_date DATE,
    timeline_duration_days INTEGER,
    
    -- Activity and lifestyle
    activity_level TEXT CHECK (activity_level IN ('sedentary', 'lightly_active', 'moderately_active', 'very_active', 'extremely_active')) NOT NULL,
    household_size INTEGER DEFAULT 1 CHECK (household_size > 0),
    
    -- Preferences
    preferred_meal_count INTEGER DEFAULT 3 CHECK (preferred_meal_count BETWEEN 2 AND 6),
    max_cooking_time_minutes INTEGER DEFAULT 60,
    budget_range TEXT CHECK (budget_range IN ('budget', 'moderate', 'premium', 'no_limit')),

    -- Food preferences
    food_likes TEXT, -- Free-form text for favorite foods and ingredients
    food_dislikes TEXT, -- Free-form text for foods to avoid (non-medical)
    preferred_diet_type TEXT, -- Overall diet approach (keto, mediterranean, etc.)
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id)
);

-- Dietary restrictions and preferences
CREATE TABLE IF NOT EXISTS public.user_dietary_restrictions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    
    restriction_type TEXT CHECK (restriction_type IN ('allergy', 'dietary_preference', 'medical_restriction', 'religious_restriction')) NOT NULL,
    restriction_value TEXT NOT NULL, -- e.g., 'nuts', 'dairy', 'vegetarian', 'low_sodium'
    severity TEXT CHECK (severity IN ('mild', 'moderate', 'severe', 'absolute')) DEFAULT 'moderate',
    notes TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id, restriction_type, restriction_value)
);

-- Pantry management
CREATE TABLE IF NOT EXISTS public.user_pantry_items (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,

    ingredient_name TEXT NOT NULL,
    quantity DECIMAL(8,2),
    unit TEXT, -- e.g., 'cups', 'kg', 'pieces', 'bottles'
    category TEXT CHECK (category IN ('protein', 'vegetables', 'fruits', 'grains', 'dairy', 'pantry_staples', 'spices', 'condiments', 'frozen', 'canned')) NOT NULL,

    -- Expiration tracking
    expiration_date DATE,
    purchase_date DATE DEFAULT CURRENT_DATE,

    -- Status
    status TEXT CHECK (status IN ('available', 'running_low', 'expired', 'used_up')) DEFAULT 'available',

    -- Meal plan integration
    include_in_meal_plans BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Meal plan history
CREATE TABLE IF NOT EXISTS public.user_meal_plans (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    
    -- Plan metadata
    plan_name TEXT,
    plan_duration_days INTEGER NOT NULL,
    generated_for_date DATE DEFAULT CURRENT_DATE,
    
    -- Plan data (JSON structure from MealPlanningService)
    plan_data JSONB NOT NULL,
    
    -- User preferences snapshot at time of generation
    preferences_snapshot JSONB NOT NULL,
    
    -- Usage tracking
    is_active BOOLEAN DEFAULT TRUE,
    completion_status TEXT CHECK (completion_status IN ('active', 'completed', 'abandoned', 'modified')) DEFAULT 'active',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Cuisine preferences (separate table for flexibility)
CREATE TABLE IF NOT EXISTS public.user_cuisine_preferences (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    
    cuisine_type TEXT NOT NULL, -- e.g., 'italian', 'asian', 'mediterranean', 'mexican'
    preference_level TEXT CHECK (preference_level IN ('love', 'like', 'neutral', 'dislike', 'avoid')) DEFAULT 'like',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id, cuisine_type)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_meal_profiles_user_id ON public.user_meal_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_dietary_restrictions_user_id ON public.user_dietary_restrictions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_dietary_restrictions_type ON public.user_dietary_restrictions(restriction_type);
CREATE INDEX IF NOT EXISTS idx_user_pantry_items_user_id ON public.user_pantry_items(user_id);
CREATE INDEX IF NOT EXISTS idx_user_pantry_items_category ON public.user_pantry_items(category);
CREATE INDEX IF NOT EXISTS idx_user_pantry_items_expiration ON public.user_pantry_items(expiration_date);
CREATE INDEX IF NOT EXISTS idx_user_meal_plans_user_id ON public.user_meal_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_user_meal_plans_active ON public.user_meal_plans(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_user_cuisine_preferences_user_id ON public.user_cuisine_preferences(user_id);

-- Create updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_meal_profiles_updated_at BEFORE UPDATE ON public.user_meal_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_pantry_items_updated_at BEFORE UPDATE ON public.user_pantry_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_meal_plans_updated_at BEFORE UPDATE ON public.user_meal_plans
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE public.user_meal_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_dietary_restrictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_pantry_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_meal_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_cuisine_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Users can only access their own data
CREATE POLICY "Users can view own meal profile" ON public.user_meal_profiles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own meal profile" ON public.user_meal_profiles
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own dietary restrictions" ON public.user_dietary_restrictions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own dietary restrictions" ON public.user_dietary_restrictions
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own pantry items" ON public.user_pantry_items
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own pantry items" ON public.user_pantry_items
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own meal plans" ON public.user_meal_plans
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own meal plans" ON public.user_meal_plans
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own cuisine preferences" ON public.user_cuisine_preferences
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own cuisine preferences" ON public.user_cuisine_preferences
    FOR ALL USING (auth.uid() = user_id);

-- 30-day retention policy for meal plans
-- Function to clean up old meal plans
CREATE OR REPLACE FUNCTION cleanup_old_meal_plans()
RETURNS void AS $$
BEGIN
    -- Delete meal plans older than 30 days
    DELETE FROM public.user_meal_plans
    WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a scheduled job to run cleanup daily (requires pg_cron extension)
-- Note: This requires the pg_cron extension to be enabled
-- SELECT cron.schedule('cleanup-meal-plans', '0 2 * * *', 'SELECT cleanup_old_meal_plans();');
