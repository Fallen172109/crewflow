-- Apply meal planning migration to add missing fields
-- This script adds the new food preference fields to existing user_meal_profiles table

-- Add new columns if they don't exist
DO $$ 
BEGIN
    -- Add food_likes column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'user_meal_profiles' 
                   AND column_name = 'food_likes') THEN
        ALTER TABLE public.user_meal_profiles ADD COLUMN food_likes TEXT;
    END IF;

    -- Add food_dislikes column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'user_meal_profiles' 
                   AND column_name = 'food_dislikes') THEN
        ALTER TABLE public.user_meal_profiles ADD COLUMN food_dislikes TEXT;
    END IF;

    -- Add preferred_diet_type column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'user_meal_profiles' 
                   AND column_name = 'preferred_diet_type') THEN
        ALTER TABLE public.user_meal_profiles ADD COLUMN preferred_diet_type TEXT;
    END IF;

    -- Add age column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'user_meal_profiles' 
                   AND column_name = 'age') THEN
        ALTER TABLE public.user_meal_profiles ADD COLUMN age INTEGER CHECK (age >= 13 AND age <= 120);
    END IF;

    -- Add gender column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'user_meal_profiles' 
                   AND column_name = 'gender') THEN
        ALTER TABLE public.user_meal_profiles ADD COLUMN gender TEXT CHECK (gender IN ('male', 'female', 'other'));
    END IF;
END $$;

-- Create cleanup function for 30-day retention policy
CREATE OR REPLACE FUNCTION cleanup_old_meal_plans()
RETURNS void AS $$
BEGIN
    -- Delete meal plans older than 30 days
    DELETE FROM public.user_meal_plans 
    WHERE created_at < NOW() - INTERVAL '30 days';
    
    -- Log the cleanup
    RAISE NOTICE 'Cleaned up meal plans older than 30 days at %', NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION cleanup_old_meal_plans() TO authenticated;

-- Note: To enable automatic cleanup, you would need to set up a cron job:
-- SELECT cron.schedule('cleanup-meal-plans', '0 2 * * *', 'SELECT cleanup_old_meal_plans();');
-- This requires the pg_cron extension to be enabled in your Supabase project.

COMMIT;
