-- Sync Existing Users Migration
-- This migration syncs existing users from auth.users to public.users
-- Run this in your Supabase SQL editor to fix the missing users issue

-- Insert missing users from auth.users into public.users
INSERT INTO public.users (id, email, created_at, updated_at)
SELECT 
    au.id,
    au.email,
    au.created_at,
    au.updated_at
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL
AND au.email IS NOT NULL;

-- Verify the sync worked
SELECT 
    'auth.users' as table_name,
    COUNT(*) as user_count
FROM auth.users
WHERE email IS NOT NULL

UNION ALL

SELECT 
    'public.users' as table_name,
    COUNT(*) as user_count
FROM public.users;

-- Show any users that might still be missing
SELECT 
    au.id,
    au.email,
    au.created_at,
    'Missing from public.users' as status
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL
AND au.email IS NOT NULL;
