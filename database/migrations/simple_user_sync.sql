-- Simple User Sync - Run these queries one by one in Supabase SQL Editor

-- 1. First, check what users exist in auth.users
SELECT id, email, email_confirmed_at, created_at 
FROM auth.users 
WHERE email IS NOT NULL 
ORDER BY created_at;

-- 2. Check what users exist in public.users
SELECT id, email, role, subscription_tier, created_at 
FROM public.users 
ORDER BY created_at;

-- 3. Insert missing users (run this to sync them)
INSERT INTO public.users (id, email, role, created_at, updated_at)
SELECT 
    id,
    email,
    'user' as role,
    created_at,
    updated_at
FROM auth.users
WHERE email IS NOT NULL
AND id NOT IN (SELECT id FROM public.users)
ON CONFLICT (id) DO NOTHING;

-- 4. Verify the sync worked
SELECT 
    pu.id,
    pu.email,
    pu.role,
    pu.subscription_tier,
    pu.subscription_status,
    pu.created_at
FROM public.users pu
ORDER BY pu.created_at;

-- 5. Set your admin account (replace with your email)
UPDATE public.users 
SET 
    role = 'admin',
    subscription_tier = 'enterprise',
    subscription_status = 'active'
WHERE email = 'borzeckikamil7@gmail.com';
