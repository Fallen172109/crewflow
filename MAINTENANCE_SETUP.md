# CrewFlow Automated Maintenance Mode System

## 🚀 Overview

CrewFlow now features an **automated maintenance mode system** that intelligently manages site accessibility based on your deployment environment. This system ensures your site is protected during deployments while allowing seamless development access.

## ✨ Key Features

- **🏠 Localhost Bypass**: Automatically disabled during local development
- **🚀 Production Auto-Enable**: Automatically enabled on production deployments
- **🔧 Manual Override**: Full manual control when needed
- **🔑 Password Bypass**: Authorized access during maintenance
- **📊 Smart Detection**: Environment-aware decision making
- **🔄 Backward Compatible**: Works with existing configurations

## 🎯 How It Works

### Automatic Behavior

1. **Local Development** (`localhost:3000`):
   - Maintenance mode is **automatically disabled**
   - Full application access for developers
   - No manual configuration needed

2. **Production Deployments** (`crewflow.ai`):
   - Maintenance mode is **automatically enabled**
   - Visitors see the maintenance screen
   - Developers can bypass with password

3. **Preview Deployments** (Vercel previews):
   - Maintenance mode is **disabled by default**
   - Can be enabled via configuration

### Manual Override System

The system provides multiple levels of control:

1. **Highest Priority**: `MAINTENANCE_MODE_OVERRIDE`
2. **Automated Logic**: Environment-based decisions
3. **Legacy Fallback**: `MAINTENANCE_MODE` variable

## ⚙️ Configuration

### Environment Variables

Add these variables to your `.env.local` (development) and Vercel environment (production):

```bash
# =============================================================================
# AUTOMATED MAINTENANCE MODE SYSTEM
# =============================================================================

# Enable/disable automated maintenance mode (default: true)
AUTO_MAINTENANCE_MODE=true

# Manual override for maintenance mode (takes highest priority)
# Set to 'true' to force maintenance mode ON
# Set to 'false' to force maintenance mode OFF
# Leave empty or unset to use automated logic
MAINTENANCE_MODE_OVERRIDE=

# Legacy maintenance mode control (used when AUTO_MAINTENANCE_MODE=false)
MAINTENANCE_MODE=false

# Maintenance mode password for bypass access (default: CrewFlow2025!)
MAINTENANCE_PASSWORD=CrewFlow2025!

# Allow localhost to bypass maintenance mode (default: true)
LOCALHOST_BYPASS=true

# Enable maintenance mode on production deployments (default: true)
MAINTENANCE_ON_PRODUCTION=true

# Enable maintenance mode on preview deployments (default: false)
MAINTENANCE_ON_PREVIEW=false
```

### Quick Setup

1. **For Development**: No setup needed! The system automatically detects localhost.

2. **For Production**:
   - Set `MAINTENANCE_PASSWORD=CrewFlow2025!` in Vercel
   - The system will automatically enable maintenance mode on deployments

3. **For Manual Control**:
   - Set `MAINTENANCE_MODE_OVERRIDE=true` to force maintenance ON
   - Set `MAINTENANCE_MODE_OVERRIDE=false` to force maintenance OFF

## 🚀 Deployment Workflow

### Automated Workflow (Recommended)

1. **Develop Locally**:
   ```bash
   npm run dev
   # Maintenance mode automatically disabled on localhost
   ```

2. **Deploy to Production**:
   ```bash
   git add .
   git commit -m "Your changes"
   git push origin main
   # Maintenance mode automatically enabled on crewflow.ai
   ```

3. **Access During Maintenance**:
   - Visit `https://crewflow.ai`
   - Enter password: `CrewFlow2025!`
   - Access granted for your session

4. **Disable Maintenance** (when ready):
   - Go to Vercel Dashboard → Environment Variables
   - Set `MAINTENANCE_MODE_OVERRIDE=false`
   - Redeploy or wait for next deployment

### Manual Control Options

#### Force Maintenance Mode ON
```bash
# In Vercel environment variables
MAINTENANCE_MODE_OVERRIDE=true
```

#### Force Maintenance Mode OFF
```bash
# In Vercel environment variables
MAINTENANCE_MODE_OVERRIDE=false
```

#### Disable Automation (Use Legacy Mode)
```bash
# In Vercel environment variables
AUTO_MAINTENANCE_MODE=false
MAINTENANCE_MODE=true  # or false
```

## 🔧 Advanced Configuration

### Environment-Specific Settings

```bash
# Production deployments
MAINTENANCE_ON_PRODUCTION=true    # Enable maintenance on production (default)
MAINTENANCE_ON_PRODUCTION=false   # Disable maintenance on production

# Preview deployments
MAINTENANCE_ON_PREVIEW=false      # Disable maintenance on previews (default)
MAINTENANCE_ON_PREVIEW=true       # Enable maintenance on previews

# Development environment
LOCALHOST_BYPASS=true             # Allow localhost bypass (default)
LOCALHOST_BYPASS=false            # Force maintenance even on localhost
```

### Custom Password

```bash
# Change the bypass password
MAINTENANCE_PASSWORD=YourCustomPassword123!
```

## 🎨 Maintenance Page Features

- **Maritime-themed design** matching CrewFlow brand
- **Typewriter animation** with "We are under development"
- **Password bypass system** with session storage
- **Responsive design** for all devices
- **Loading states** and error handling
- **Professional messaging** for visitors

## 📊 Debugging & Monitoring

### Debug Information (Development Only)

```bash
# Check maintenance status with debug info
curl -X POST http://localhost:3000/api/maintenance-status
```

### Environment Detection

The system automatically detects:
- **Localhost**: `localhost:3000`, `127.0.0.1:3000`
- **Development**: `NODE_ENV=development`
- **Production**: `VERCEL_ENV=production`
- **Preview**: `VERCEL_ENV=preview`

### Logging

In development mode, the system logs:
- Environment detection results
- Maintenance mode decisions
- Configuration validation
- Override status

## 🧪 Testing Guide

### Test Local Development
```bash
npm run dev
# Visit http://localhost:3000
# Should show full application (no maintenance screen)
```

### Test Production Deployment
```bash
git push origin main
# Visit https://crewflow.ai
# Should show maintenance screen
# Enter password: CrewFlow2025!
# Should grant access
```

### Test Manual Override
```bash
# In Vercel: Set MAINTENANCE_MODE_OVERRIDE=false
# Visit https://crewflow.ai
# Should show full application (no maintenance screen)
```

## 🚨 Troubleshooting

### Common Issues

**Maintenance mode not working on production:**
- Check `AUTO_MAINTENANCE_MODE` is not set to `false`
- Verify `MAINTENANCE_ON_PRODUCTION` is not set to `false`
- Check for `MAINTENANCE_MODE_OVERRIDE` setting

**Can't bypass with password:**
- Verify `MAINTENANCE_PASSWORD` is set correctly
- Check browser console for errors
- Try clearing browser cache/session storage

**Maintenance mode showing on localhost:**
- Check `LOCALHOST_BYPASS` is not set to `false`
- Verify `NEXT_PUBLIC_APP_URL` contains `localhost`
- Check `NODE_ENV=development`

### Debug Commands

```bash
# Check environment variables
echo $AUTO_MAINTENANCE_MODE
echo $MAINTENANCE_MODE_OVERRIDE
echo $NEXT_PUBLIC_APP_URL

# Test API endpoint
curl https://crewflow.ai/api/maintenance-status

# Debug mode (development only)
curl -X POST http://localhost:3000/api/maintenance-status
```

## 📋 Migration from Legacy System

If you're upgrading from the old maintenance system:

1. **Keep existing variables** (they still work as fallbacks)
2. **Add new variables** for automation
3. **Test thoroughly** in both environments
4. **Update deployment procedures** to use new workflow

### Legacy Compatibility

The system maintains full backward compatibility:
- `MAINTENANCE_MODE=true/false` still works
- Existing password system unchanged
- All current functionality preserved

## 🎯 Best Practices

1. **Always test locally first** before deploying
2. **Use manual override sparingly** - let automation handle most cases
3. **Monitor deployment logs** for maintenance mode decisions
4. **Keep password secure** and change it periodically
5. **Document any custom configurations** for your team

---

**🚀 Your automated maintenance mode system is now ready!** The system will intelligently protect your site during deployments while allowing seamless development access.
