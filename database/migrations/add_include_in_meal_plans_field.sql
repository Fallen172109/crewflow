-- Migration: Add include_in_meal_plans field to user_pantry_items table
-- This migration adds the include_in_meal_plans boolean field to existing pantry items
-- Run this migration after the main meal planning schema has been created

-- Add the include_in_meal_plans column to existing user_pantry_items table
ALTER TABLE public.user_pantry_items 
ADD COLUMN IF NOT EXISTS include_in_meal_plans BOOLEAN DEFAULT TRUE;

-- Update any existing records to have include_in_meal_plans = TRUE by default
UPDATE public.user_pantry_items 
SET include_in_meal_plans = TRUE 
WHERE include_in_meal_plans IS NULL;

-- Add comment to document the field
COMMENT ON COLUMN public.user_pantry_items.include_in_meal_plans IS 'Controls whether this pantry item should be considered when generating meal plans';
