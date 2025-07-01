-- Add age and gender fields to user_meal_profiles table
-- These fields are needed for accurate calorie calculations

-- Add age field (for BMR calculations)
ALTER TABLE public.user_meal_profiles 
ADD COLUMN IF NOT EXISTS age INTEGER CHECK (age >= 13 AND age <= 120);

-- Add gender field (for BMR calculations)
ALTER TABLE public.user_meal_profiles 
ADD COLUMN IF NOT EXISTS gender TEXT CHECK (gender IN ('male', 'female', 'other'));

-- Add comment to explain usage
COMMENT ON COLUMN public.user_meal_profiles.age IS 'User age for BMR calculations (13-120 years)';
COMMENT ON COLUMN public.user_meal_profiles.gender IS 'User gender for BMR calculations (male/female/other)';
