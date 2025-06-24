# CrewFlow Admin System Setup Guide

## 🔐 Complete Admin System Implementation

Your CrewFlow platform now has a comprehensive admin system that provides full oversight and management capabilities. Here's how to set it up and use it.

## 📋 What's Included

### ✅ Database Schema Updates
- **Admin role system** with `user` and `admin` roles
- **Admin audit logging** for all administrative actions
- **Row Level Security (RLS)** policies for admin access
- **System analytics** tables and views

### ✅ Authentication & Authorization
- **Role-based access control** with admin privileges
- **Secure admin promotion** system
- **Middleware protection** for admin routes
- **Admin-specific helper functions**

### ✅ Admin Dashboard Features
- **User Management**: View, edit, and manage all user accounts
- **System Analytics**: Platform-wide usage, performance, and revenue metrics
- **Agent Monitoring**: Track AI agent performance and usage
- **Subscription Oversight**: Manage billing and subscription tiers
- **Audit Logging**: Complete history of admin actions
- **System Health**: Monitor platform performance and uptime

## 🚀 Setup Instructions

### Step 1: Database Migration

1. **Run the admin system migration** in your Supabase SQL editor:
   ```sql
   -- Copy and paste the contents of database/migrations/add_admin_system.sql
   ```

2. **Verify the migration** by checking that these tables exist:
   - `users` table has a `role` column
   - `admin_audit_log` table exists
   - Admin RLS policies are active

### Step 2: Environment Variables

Add these environment variables to your `.env.local` and production environment:

```env
# Admin System Configuration
ADMIN_PROMOTION_KEY=your-super-secure-admin-key-here

# Make sure you have these existing variables
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
```

**Important**: Choose a strong, unique `ADMIN_PROMOTION_KEY` and keep it secure!

### Step 3: Promote Your Account to Admin

#### Option A: Using the Web Interface (Recommended)

1. **Make sure you have a user account** in CrewFlow
2. **Navigate to** `/admin-setup` in your browser
3. **Enter your admin promotion key** and submit
4. **You'll be redirected** to the admin dashboard

#### Option B: Using Supabase SQL Editor

```sql
-- Replace 'your-email@example.com' with your actual email
SELECT public.promote_to_admin('your-email@example.com');

-- Verify the promotion worked
SELECT email, role FROM public.users WHERE role = 'admin';
```

### Step 4: Access Your Admin Dashboard

Once promoted, you can access the admin dashboard at:
- **Admin Dashboard**: `/admin`
- **User Management**: `/admin/users`
- **Analytics**: `/admin/analytics`
- **System Settings**: `/admin/system`

## 🛡️ Security Features

### Multi-Layer Protection
1. **Database Level**: RLS policies ensure only admins can access admin data
2. **API Level**: Admin routes verify role before allowing access
3. **UI Level**: Admin components check permissions
4. **Middleware**: Route protection for `/admin/*` paths

### Audit Logging
Every admin action is logged with:
- Admin user ID and email
- Action performed
- Target user (if applicable)
- Timestamp and IP address
- Additional context details

### Role Verification
- Admin status is verified at multiple levels
- Non-admin users are redirected away from admin areas
- Admin functions require proper authentication

## 📊 Admin Capabilities

### User Management
- **View all users** with filtering and search
- **Edit user profiles** and subscription details
- **Manage subscriptions** and billing status
- **View user activity** and usage patterns
- **Suspend or delete** user accounts

### System Analytics
- **Platform metrics**: Users, revenue, API usage
- **Agent performance**: Usage stats and health monitoring
- **Revenue tracking**: MRR, ARR, conversion rates
- **System health**: Uptime, response times, error rates

### Subscription Management
- **View all subscriptions** and billing details
- **Modify user plans** and subscription status
- **Handle billing issues** and disputes
- **Track revenue metrics** and growth

## 🔧 Customization Options

### Adding New Admin Features
1. **Create new admin routes** in `/app/admin/`
2. **Add navigation items** in `AdminSidebar.tsx`
3. **Implement admin functions** in `admin-auth.ts`
4. **Add audit logging** for new actions

### Modifying Permissions
- Edit RLS policies in the database
- Update role checks in `admin-auth.ts`
- Modify middleware protection rules

### Custom Analytics
- Add new metrics to `getSystemAnalytics()`
- Create custom dashboard components
- Implement additional reporting features

## 🚨 Important Security Notes

### Admin Promotion Key
- **Keep the promotion key secure** and don't share it
- **Use a strong, unique key** (minimum 32 characters)
- **Rotate the key periodically** for security
- **Only promote trusted accounts** to admin

### Access Control
- **Admin access is permanent** once granted
- **Only promote accounts you fully trust**
- **Monitor admin actions** through audit logs
- **Regularly review admin user list**

### Production Deployment
- **Set environment variables** in your hosting platform
- **Ensure database migrations** are applied
- **Test admin functionality** before going live
- **Monitor system performance** after deployment

## 📞 Support & Troubleshooting

### Common Issues

**Can't access admin dashboard:**
- Verify your account has `role = 'admin'` in the database
- Check that environment variables are set correctly
- Ensure database migration was applied successfully

**Admin promotion fails:**
- Verify `ADMIN_PROMOTION_KEY` is set in environment
- Check that the user account exists in the database
- Ensure the promotion key matches exactly

**Permission errors:**
- Verify RLS policies are active on all tables
- Check that `SUPABASE_SERVICE_ROLE_KEY` is set
- Ensure admin functions use the admin client

### Getting Help
If you encounter issues:
1. Check the browser console for error messages
2. Review server logs for backend errors
3. Verify database schema and policies
4. Test with a fresh user account

## 🎉 You're All Set!

Your CrewFlow platform now has a complete admin system with:
- ✅ Secure role-based access control
- ✅ Comprehensive user management
- ✅ Detailed system analytics
- ✅ Complete audit logging
- ✅ Professional admin interface

Navigate to `/admin-setup` to promote your account and start managing your CrewFlow platform!
