-- Manual User Sync Migration
-- This script manually syncs users from auth.users to public.users
-- Run this in your Supabase SQL editor

-- Step 1: Check current state
SELECT 'BEFORE SYNC - auth.users count' as status, COUNT(*) as count FROM auth.users WHERE email IS NOT NULL
UNION ALL
SELECT 'BEFORE SYNC - public.users count' as status, COUNT(*) as count FROM public.users;

-- Step 2: Show which users exist in auth but not in public
SELECT 
    'MISSING FROM public.users' as status,
    au.id,
    au.email,
    au.created_at as auth_created_at
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL 
AND au.email IS NOT NULL
AND au.email_confirmed_at IS NOT NULL; -- Only sync confirmed users

-- Step 3: Insert missing users into public.users
INSERT INTO public.users (id, email, role, created_at, updated_at)
SELECT 
    au.id,
    au.email,
    'user' as role, -- Default role
    au.created_at,
    au.updated_at
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL 
AND au.email IS NOT NULL
AND au.email_confirmed_at IS NOT NULL -- Only sync confirmed users
ON CONFLICT (id) DO NOTHING; -- Prevent duplicates

-- Step 4: Verify the sync worked
SELECT 'AFTER SYNC - auth.users count' as status, COUNT(*) as count FROM auth.users WHERE email IS NOT NULL AND email_confirmed_at IS NOT NULL
UNION ALL
SELECT 'AFTER SYNC - public.users count' as status, COUNT(*) as count FROM public.users;

-- Step 5: Show all synced users
SELECT 
    pu.id,
    pu.email,
    pu.role,
    pu.subscription_tier,
    pu.subscription_status,
    pu.created_at,
    CASE 
        WHEN au.email_confirmed_at IS NOT NULL THEN 'Confirmed'
        ELSE 'Unconfirmed'
    END as email_status
FROM public.users pu
JOIN auth.users au ON pu.id = au.id
ORDER BY pu.created_at;

-- Step 6: Check for any remaining issues
SELECT 
    'Users in auth but not in public' as issue_type,
    COUNT(*) as count
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL 
AND au.email IS NOT NULL
AND au.email_confirmed_at IS NOT NULL

UNION ALL

SELECT 
    'Users in public but not in auth' as issue_type,
    COUNT(*) as count
FROM public.users pu
LEFT JOIN auth.users au ON pu.id = au.id
WHERE au.id IS NULL;

-- Step 7: Optional - Set up your admin account
-- Replace 'your-email@example.com' with your actual email
-- UPDATE public.users 
-- SET role = 'admin', subscription_tier = 'enterprise', subscription_status = 'active'
-- WHERE email = 'borzeckikamil7@gmail.com';

-- Step 8: Verify trigger is working for future users
-- Check if the trigger exists
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_created';
