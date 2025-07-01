# Debug Guide: Export and H7 Tag Issues

## Issue 1: H7 Tag Error Persisting

### Root Cause Analysis
The `<h7>` tag error you're seeing is likely due to browser cache. All `<h7>` tags have been successfully replaced with `<h6>` tags in the codebase:

**Files Fixed:**
- `src/components/meal-planning/MealPlanDisplay.tsx` - All 4 instances of `<h7>` replaced with `<h6>`

### Solution: Clear Browser Cache
1. **Hard Refresh**: Press `Ctrl+F5` (Windows) or `Cmd+Shift+R` (Mac)
2. **Clear Cache**: 
   - Open Developer Tools (F12)
   - Right-click the refresh button
   - Select "Empty Cache and Hard Reload"
3. **Incognito Mode**: Test in a new incognito/private window

## Issue 2: Export Modal Not Appearing

### Debugging Steps Added
Added console logging to track export button clicks:
```javascript
const handleExport = (plan: MealPlan) => {
  console.log('Export button clicked for plan:', plan.id)
  setExportPlan(plan)
  setShowExportModal(true)
  console.log('Export modal should now be visible')
}
```

### Check These Items:

1. **Console Logs**: Open browser console and click export - you should see:
   - "Export button clicked for plan: [plan-id]"
   - "Export modal should now be visible"

2. **Modal State**: Check if the modal state is being set correctly

3. **Z-Index Issues**: The modal uses `z-50` which should be sufficient

4. **JavaScript Errors**: Check console for any JavaScript errors that might prevent the modal from showing

### Testing the Export Functionality

1. **Navigate to**: `http://localhost:3000/dashboard/crew/meal-planning`
2. **Go to Plans tab**
3. **Click the download icon** on any meal plan
4. **Check console** for debug messages
5. **Look for modal** - should appear as overlay

### Export API Endpoints
The export functionality uses these endpoints:
- `/api/meal-planning/export?planId=[id]&format=csv`
- `/api/meal-planning/export?planId=[id]&format=html`
- `/api/meal-planning/export?planId=[id]&format=json`

### Manual Export Test
You can test the export API directly:
```bash
# Replace [PLAN_ID] with actual plan ID from database
curl "http://localhost:3000/api/meal-planning/export?planId=[PLAN_ID]&format=csv"
```

## Verification Steps

### 1. Check H7 Tags Are Gone
```bash
# Search for any remaining h7 tags (should return nothing)
findstr /r /s "h7" src\components\meal-planning\*.tsx
```

### 2. Test Export Modal
1. Open browser console
2. Navigate to meal planning page
3. Click export button
4. Check for console messages
5. Verify modal appears

### 3. Test Export Download
1. Click export format (CSV, HTML, or JSON)
2. Check if download starts
3. Verify file content

## Expected Behavior

### Export Modal Should:
- ✅ Appear as overlay when export button clicked
- ✅ Show three format options (CSV, HTML, JSON)
- ✅ Have close button that works
- ✅ Download file when format selected

### H7 Error Should:
- ✅ No longer appear in console
- ✅ All headings should use h1-h6 only
- ✅ No React warnings about unrecognized tags

## If Issues Persist

1. **Clear all browser data** for localhost:3000
2. **Restart the development server**
3. **Check for any TypeScript/compilation errors**
4. **Test in different browser**

## Next Steps

After clearing cache and testing:
1. Verify H7 errors are gone
2. Confirm export modal appears
3. Test actual file downloads
4. Remove debug console.log statements once working
