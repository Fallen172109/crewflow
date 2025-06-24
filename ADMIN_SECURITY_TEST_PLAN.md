# CrewFlow Admin System Security Test Plan

## 🔒 Security Testing Checklist

This document outlines comprehensive security tests to verify that the admin system is properly secured and non-admin users cannot access admin features.

## 📋 Pre-Test Setup

### Required Test Accounts
1. **Admin Account**: User with `role = 'admin'`
2. **Regular User Account**: User with `role = 'user'`
3. **Unauthenticated**: No logged-in user

### Test Environment
- [ ] Database migration applied (`add_admin_system.sql`)
- [ ] Environment variables configured
- [ ] Admin account promoted successfully
- [ ] Application running locally or in test environment

## 🛡️ Database Security Tests

### Row Level Security (RLS) Verification

#### Test 1: Admin Data Access
**Objective**: Verify admins can access all user data
```sql
-- As admin user, should return all users
SELECT * FROM public.users;

-- Should return all agent usage data
SELECT * FROM public.agent_usage;

-- Should return all chat history
SELECT * FROM public.chat_history;
```
**Expected**: ✅ Admin sees all data across all users

#### Test 2: Regular User Data Isolation
**Objective**: Verify regular users only see their own data
```sql
-- As regular user, should only return own record
SELECT * FROM public.users;

-- Should only return own usage data
SELECT * FROM public.agent_usage;

-- Should only return own chat history
SELECT * FROM public.chat_history;
```
**Expected**: ✅ User only sees their own data

#### Test 3: Admin Audit Log Access
**Objective**: Verify only admins can access audit logs
```sql
-- As admin user
SELECT * FROM public.admin_audit_log;

-- As regular user (should fail or return empty)
SELECT * FROM public.admin_audit_log;
```
**Expected**: ✅ Only admins can access audit logs

## 🌐 API Security Tests

### Admin API Endpoints

#### Test 4: Admin Promotion Endpoint
**Endpoint**: `POST /api/admin/promote`

**Test 4a: Valid Admin Key**
```json
{
  "email": "test@example.com",
  "adminKey": "correct-admin-key"
}
```
**Expected**: ✅ 200 - User promoted successfully

**Test 4b: Invalid Admin Key**
```json
{
  "email": "test@example.com",
  "adminKey": "wrong-key"
}
```
**Expected**: ✅ 401 - Invalid admin promotion key

**Test 4c: Missing Admin Key**
```json
{
  "email": "test@example.com"
}
```
**Expected**: ✅ 400 - Admin key required

#### Test 5: Admin-Only API Routes
**Objective**: Verify admin routes reject non-admin users

**Test with Regular User Token**:
- Try accessing admin-specific API endpoints
- Should return 403 Forbidden or redirect

**Test with No Authentication**:
- Try accessing admin API endpoints
- Should return 401 Unauthorized

## 🖥️ Frontend Security Tests

### Route Protection

#### Test 6: Admin Dashboard Access
**URL**: `/admin`

**Test 6a: As Admin User**
- Navigate to `/admin`
- **Expected**: ✅ Admin dashboard loads successfully

**Test 6b: As Regular User**
- Navigate to `/admin`
- **Expected**: ✅ Redirected to `/dashboard` or access denied

**Test 6c: As Unauthenticated User**
- Navigate to `/admin`
- **Expected**: ✅ Redirected to login page

#### Test 7: Admin Sub-Routes
**URLs**: `/admin/users`, `/admin/analytics`, `/admin/system`

**For each route, test**:
- Admin access: ✅ Should work
- Regular user: ✅ Should be blocked/redirected
- Unauthenticated: ✅ Should redirect to login

#### Test 8: Admin Setup Page
**URL**: `/admin-setup`

**Test 8a: With Valid Admin Key**
- Enter correct promotion key
- **Expected**: ✅ Account promoted, redirected to admin dashboard

**Test 8b: With Invalid Admin Key**
- Enter incorrect promotion key
- **Expected**: ✅ Error message displayed, no promotion

**Test 8c: Already Admin User**
- Try to promote already-admin account
- **Expected**: ✅ Error message about already being admin

### Component Security

#### Test 9: Admin Components
**Objective**: Verify admin components don't render for non-admin users

**Components to Test**:
- `AdminSidebar`
- `AdminHeader`
- `AdminUsersTable`
- Admin action buttons

**Expected**: ✅ Components either don't render or show access denied

#### Test 10: Navigation Security
**Objective**: Verify admin navigation items don't appear for regular users

**Test**: Check main navigation, sidebar, and quick actions
**Expected**: ✅ No admin links visible to regular users

## 🔐 Authentication & Authorization Tests

### Middleware Protection

#### Test 11: Middleware Route Protection
**Objective**: Verify middleware blocks unauthorized access

**Test Routes**:
- `/admin/*` - Should require authentication
- `/dashboard/*` - Should require authentication
- Public routes - Should work without authentication

**Expected**: ✅ Proper redirects and access control

#### Test 12: Token Validation
**Objective**: Verify admin functions validate user tokens

**Tests**:
- Expired tokens
- Invalid tokens
- Missing tokens
- Tampered tokens

**Expected**: ✅ All invalid tokens rejected

### Session Management

#### Test 13: Admin Session Persistence
**Objective**: Verify admin sessions work correctly

**Tests**:
- Login as admin, navigate admin pages
- Refresh browser, verify still admin
- Logout, verify admin access removed

**Expected**: ✅ Proper session handling

#### Test 14: Role Changes
**Objective**: Verify role changes take effect immediately

**Test**:
1. Demote admin to user (via database)
2. Try to access admin features
3. Promote user to admin
4. Verify admin access granted

**Expected**: ✅ Role changes reflected immediately

## 🚨 Security Vulnerability Tests

### Injection Attacks

#### Test 15: SQL Injection Prevention
**Objective**: Verify database queries are parameterized

**Test**: Try SQL injection in:
- User search fields
- Filter parameters
- Admin promotion email field

**Expected**: ✅ No SQL injection possible

#### Test 16: XSS Prevention
**Objective**: Verify user input is properly sanitized

**Test**: Try XSS payloads in:
- User profile fields
- Search inputs
- Admin form fields

**Expected**: ✅ No XSS execution

### Authorization Bypass

#### Test 17: Direct Object Reference
**Objective**: Verify users can't access other users' data directly

**Test**:
- Try accessing `/admin/users/{other-user-id}`
- Try API calls with other user IDs
- Try modifying URL parameters

**Expected**: ✅ Access denied for unauthorized data

#### Test 18: Privilege Escalation
**Objective**: Verify users can't escalate their privileges

**Test**:
- Try modifying role in browser dev tools
- Try API calls to change own role
- Try bypassing admin checks

**Expected**: ✅ No privilege escalation possible

## 📊 Test Results Documentation

### Test Execution Checklist

For each test, document:
- [ ] Test executed
- [ ] Result (Pass/Fail)
- [ ] Notes/Issues found
- [ ] Remediation needed

### Security Issues Found

| Test # | Issue Description | Severity | Status | Fix Applied |
|--------|------------------|----------|---------|-------------|
|        |                  |          |         |             |

### Final Security Assessment

- [ ] All database RLS policies working correctly
- [ ] All API endpoints properly protected
- [ ] All frontend routes secured
- [ ] All admin components access-controlled
- [ ] No security vulnerabilities found
- [ ] Admin system ready for production

## 🔧 Remediation Guidelines

### If Tests Fail

1. **Database Issues**: Check RLS policies and permissions
2. **API Issues**: Verify authentication middleware
3. **Frontend Issues**: Check role-based rendering
4. **Security Issues**: Review input validation and sanitization

### Security Best Practices Verified

- [ ] Principle of least privilege applied
- [ ] Defense in depth implemented
- [ ] Input validation and sanitization
- [ ] Proper error handling (no information leakage)
- [ ] Audit logging for admin actions
- [ ] Secure session management

## ✅ Production Readiness

Once all tests pass:
- [ ] Security review completed
- [ ] All vulnerabilities addressed
- [ ] Admin system tested thoroughly
- [ ] Documentation updated
- [ ] Ready for production deployment

## 🚀 Deployment Security Checklist

Before deploying to production:
- [ ] Environment variables secured
- [ ] Database migrations applied
- [ ] Admin promotion key rotated
- [ ] SSL/TLS certificates configured
- [ ] Monitoring and alerting set up
- [ ] Backup and recovery tested
