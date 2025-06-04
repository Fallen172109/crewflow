# CrewFlow Maintenance Mode Setup

## 🔒 Site Protection Options

Your CrewFlow site is now equipped with multiple protection options during development:

### Option 1: Environment-Based Maintenance Mode (Implemented)

I've implemented a custom maintenance mode system that you can control via environment variables.

**How it works:**
- When `MAINTENANCE_MODE=true`, visitors see a beautiful maintenance page
- Authorized users can enter the password `CrewFlow2024!` to access the site
- Access is stored in the browser session

**To Enable/Disable:**

1. **In Vercel Dashboard:**
   - Go to your CrewFlow project settings
   - Navigate to Environment Variables
   - Add these variables:
     ```
     MAINTENANCE_MODE=true
     MAINTENANCE_PASSWORD=CrewFlow2024!
     ```
   - Redeploy your site

2. **To Disable Later:**
   - Change `MAINTENANCE_MODE=false` in Vercel
   - Or remove the variable entirely
   - Redeploy

### Option 2: Vercel Password Protection (Recommended for Simplicity)

1. Go to your Vercel dashboard
2. Select your CrewFlow project
3. Go to Settings → General
4. Scroll to "Password Protection"
5. Enable and set a password
6. Anyone visiting needs this password

### Option 3: Make Repository Private + Vercel Preview URLs

1. Make your GitHub repository private
2. Use Vercel's preview URLs for testing
3. Only share preview URLs with trusted people

## 🚀 Current Setup

✅ Maintenance mode components created
✅ API endpoint for password verification
✅ Environment variables configured
✅ Beautiful maritime-themed maintenance page

## 🔧 Next Steps

1. **Choose your protection method** (I recommend Option 1 or 2)
2. **Set environment variables in Vercel** if using maintenance mode
3. **Test the protection** by visiting your site
4. **Continue development** - you can toggle maintenance mode on/off anytime

## 🎨 Maintenance Page Features

- Maritime-themed design matching your brand
- Password protection with session storage
- Loading states and error handling
- Responsive design
- Professional "coming soon" messaging
- Developer access portal

## 📝 Password Information

**Current Password:** `CrewFlow2024!`

You can change this by updating the `MAINTENANCE_PASSWORD` environment variable in Vercel.

## 🔄 To Deploy Changes

After setting up environment variables in Vercel:

```bash
# Push any additional changes
git add .
git commit -m "Add maintenance mode protection"
git push origin main
```

Vercel will automatically redeploy with the new environment variables.

---

**Need help?** The maintenance mode is fully implemented and ready to use. Just set the environment variables in Vercel and your site will be protected!
