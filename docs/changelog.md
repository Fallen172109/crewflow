# Changelog

All notable changes to CrewFlow will be documented in this file.

---

## 2026-01-13 - Public Release Preparation & Deployment

### Summary
Prepared the codebase for public GitHub release and deployed to Vercel production.

### Actions Completed

#### 1. Temp File Cleanup
- Deleted 251 `tmpclaude-*` temporary files
- Removed `nul` file (Windows reserved name)

#### 2. .gitignore Updates
```
# Claude Code artifacts
.claude/
tmpclaude-*
```

#### 3. README.md Complete Rewrite
- Added feature comparison table (CrewFlow vs Shopify native)
- Documented core differentiating features:
  - AI Image Generator (DALL-E 3)
  - Competitive Research Hub (Perplexity)
  - Approval Workflows
  - Bulk CSV Import
  - Multi-Store Analytics
- Added quick start guide
- Added security section with rate limits
- Added target user segments

#### 4. Security Audit for Public Release
- Verified `.env.local` NOT tracked in git
- No hardcoded API keys in source code
- Replaced real Facebook App IDs in documentation with `YOUR_FACEBOOK_APP_ID`
- Files sanitized:
  - `docs/deployment/CREWFLOW_AI_DEPLOYMENT_STRATEGY.md`
  - `docs/facebook-page-management-upgrade.md`
  - `docs/migration/CREWFLOW_AI_MIGRATION_CHECKLIST.md`

#### 5. Next.js Security Update
- Updated from 15.3.3 to 15.5.9
- Fixed CVE-2025-66478 vulnerability
- Required for Vercel deployment

#### 6. Git Commits
| Commit | Message |
|--------|---------|
| `b41a1b1` | feat: Add differentiating features beyond Shopify native AI |
| `eb357c7` | fix: Update Next.js to 15.5.9 to address CVE-2025-66478 |

#### 7. Vercel Deployment
- **Status**: ✅ Ready
- **Production URL**: https://crewflow.ai
- **Deployment URL**: https://crewflow-production-1xkdyqz74-kamil-borzeckis-projects.vercel.app

### Files Changed Summary
- **279 files changed**
- **16,657 insertions**
- **37,269 deletions**
- Net reduction of ~20,000 lines (removed deprecated code)

### Repository Status
- **Safe for public release** - No secrets in tracked files
- **GitHub**: https://github.com/Fallen172109/crewflow.git
- **Branch**: main

---

## 2026-01-13 - Backend Agent: Bulk Import Security Fixes & Product Creation

**Task:** Fixed critical security vulnerabilities and API contract mismatch in the bulk import API at `/api/bulk-import`

### Security Fixes

**1. CSV Injection Vulnerability (CRITICAL)**
- **Issue:** No sanitization for formula injection in CSV fields that could execute malicious formulas in spreadsheet applications
- **Fix:** Added `sanitizeForCSVInjection()` function that removes leading formula characters (`=`, `+`, `-`, `@`, `\t`, `\r`)
- **Applied to:** title, description, vendor, tags fields
- **Impact:** Prevents formula injection attacks when CSV data is exported or displayed

**2. XSS via HTML Description (CRITICAL)**
- **Issue:** Description field allowed arbitrary HTML including `<script>`, `<iframe>`, event handlers (onclick, onerror), and javascript: URLs
- **Fix:** Added `sanitizeHTML()` function with:
  - Whitelist of safe tags: `b`, `i`, `strong`, `em`, `br`, `p`, `ul`, `ol`, `li`, `h1-h6`, `span`, `div`, `a`
  - Removal of dangerous tags: `<script>`, `<iframe>`, `<object>`, `<embed>`, `<link>`, `<style>`
  - Removal of event handlers: `onclick`, `onerror`, `onload`, etc.
  - Sanitization of dangerous URL protocols: `javascript:`, `vbscript:`, `data:text/html`
- **Impact:** Prevents XSS attacks through product descriptions

**3. Missing storeId UUID Validation (HIGH)**
- **Issue:** No format validation on storeId parameter, could allow injection or malformed IDs
- **Fix:** Added UUID format validation using regex pattern before database queries
- **Impact:** Rejects invalid store IDs with clear error message before database access

### API Contract Fix

**4. productData JSON Handling (CRITICAL)**
- **Issue:** Frontend sends individual `productData` JSON objects but backend only accepted CSV `file` uploads
- **Fix:** Added dual-mode handling in POST endpoint:
  - If `productData` is provided: Parse JSON, validate, create single product in Shopify, return `{ success: true, productId: string }`
  - If `file` is provided: Process CSV bulk import as before
- **Impact:** Frontend can now create individual products via the bulk import API

### Product Creation Fix

**5. No Shopify Product Creation (CRITICAL)**
- **Issue:** Backend validated CSV data but never actually created products in Shopify
- **Fix:** Added `createShopifyProduct()` function that:
  - Gets store's shop_domain from database
  - Initializes Shopify Admin API
  - Creates product with all variant data (price, SKU, barcode, inventory, weight)
  - Products created as "draft" status for safety
  - Returns created product ID on success
- **Integration:** CSV bulk import now creates products in Shopify for valid rows (in 'create' or 'upsert' mode)
- **Impact:** Products are actually created in Shopify, not just validated

### File Size Alignment

**6. File Size Limit Mismatch (HIGH)**
- **Issue:** Backend allowed 10MB but frontend restricted to 5MB
- **Fix:** Changed `MAX_FILE_SIZE` from 10MB to 5MB to match frontend
- **Impact:** Consistent file size limits between frontend and backend

### Files Changed
- `src/app/api/bulk-import/route.ts`:
  - Added security constants (`UUID_REGEX`, `SAFE_HTML_TAGS`, `DANGEROUS_HTML_PATTERNS`)
  - Added `sanitizeForCSVInjection()` function
  - Added `sanitizeHTML()` function
  - Added `isValidUUID()` function
  - Added `SingleProductResponse` and `ProductDataInput` interfaces
  - Added `validateProductDataInput()` function for JSON validation
  - Added `createShopifyProduct()` function for Shopify API integration
  - Added `handleSingleProductCreation()` handler for productData JSON requests
  - Added `handleCSVBulkImport()` handler for CSV file requests
  - Modified `validateProductRow()` to apply sanitization
  - Modified POST handler to route between CSV and JSON modes
  - Fixed file size limit from 10MB to 5MB

### Database Tables
- None (existing tables used)

### New Endpoints
- POST `/api/bulk-import` now accepts:
  - `productData` (JSON string) for single product creation
  - Returns `{ success: true, productId: string }` on success

### Breaking Changes
- None (existing CSV upload functionality preserved)

### Notes
- Products are created as "draft" status for review before publishing
- CSV bulk import includes rate limiting delay (100ms) for large imports (>10 products)
- Creation results are included in bulk import response as `creationResults` array
- All sanitization is applied before validation, ensuring clean data in database

---

## 2026-01-13 - Frontend Agent: Bulk Import Critical Bug Fixes

**Task:** Fixed five critical UI issues in the Bulk CSV Import page at `/dashboard/bulk-import`

### Bug Fixes

**1. skipFirstRow Toggle Bug (HIGH)**
- **Issue:** Both branches of the ternary returned `0`, making the toggle non-functional
- **Fix:** Changed `skipFirstRow ? 0 : 0` to `skipFirstRow ? 1 : 0`
- **Impact:** Skip header toggle now correctly skips the template/instructions row

**2. React Fragment Key Warning (MEDIUM)**
- **Issue:** Fragments inside `.map()` lacked keys, causing React warnings
- **Fix:** Changed `<>` fragments to `<React.Fragment key={row.rowNumber}>`
- **Impact:** Eliminated console warnings and improved React reconciliation

**3. No Cancel/Abort During Import (CRITICAL)**
- **Issue:** Users could not cancel a running import, getting stuck in importing state
- **Fix:**
  - Added `AbortController` ref for import session management
  - Added `importCancelled` state to track cancellation
  - Added `cancelImport()` function to trigger abort
  - Added "Cancel Import" button visible during importing state
  - Import now gracefully stops and shows partial results when cancelled
- **Impact:** Users can now cancel long-running imports and see what was imported

**4. No Timeout on Fetch (HIGH)**
- **Issue:** Fetch calls could hang indefinitely on slow/failing requests
- **Fix:** Added 30-second timeout per product using separate AbortController
- **Impact:** Prevents UI from hanging; times out with clear error message

**5. CSV Injection Sanitization (MEDIUM)**
- **Issue:** No protection against formula injection attacks in CSV values
- **Fix:** Added `sanitizeForCSVInjection()` function that strips leading `=+\-@\t\r` characters
- **Impact:** Prevents potential spreadsheet formula injection attacks from malicious CSV data

### Files Changed
- `src/app/dashboard/bulk-import/page.tsx`:
  - Line 3: Added `React` import for Fragment
  - Line 196-202: Added `sanitizeForCSVInjection()` helper function
  - Line 210: Added `importCancelled` state
  - Line 213: Added `abortControllerRef` ref
  - Line 300: Fixed `dataStartIndex` calculation
  - Line 322-324: Applied CSV sanitization during row mapping
  - Lines 329-436: Rewrote `startImport()` with abort/timeout support
  - Lines 432-436: Added `cancelImport()` function
  - Line 460: Reset `importCancelled` in `resetImport()`
  - Lines 685, 791: Fixed React Fragment keys
  - Lines 927-936: Added Cancel Import button in importing state
  - Lines 940-968: Updated complete state to show cancellation message

### Dependencies Added
- None

### Build Verification
- Build passes successfully
- Page size: 12.7 kB (slight increase due to abort/cancel functionality)

### Notes
- Cancel functionality properly cleans up AbortController to prevent memory leaks
- Timeout errors display "Request timed out after 30 seconds" for clarity
- Partial import results are preserved and shown when import is cancelled
- CSV sanitization is applied to all values during parsing, before validation

---

## 2026-01-13 - Frontend Agent: Bulk CSV Product Import Dashboard

**Task:** Created a distinctive, production-grade UI for Bulk CSV Product Import at `/dashboard/bulk-import`

### Design Direction: "Data Flow Terminal"

Industrial command center meets modern data visualization - a sleek terminal interface where data flows like liquid through a pipeline. Deep slate backgrounds with emerald/green accents matching Shopify brand, with atmospheric gradient overlays and subtle grid patterns.

### Features Implemented

**CSV Upload Zone:**
- Drag & drop area with animated data flow lines
- File type validation (CSV only)
- File size validation (5MB max)
- Visual feedback on drag over with scale animation
- File name and size display after selection

**Import Configuration:**
- Store selector integration via ShopifyStoreContext
- Three import modes with visual cards:
  - Create New (only create new products)
  - Update Existing (only update by SKU match)
  - Upsert (create or update as needed)
- Toggle for skipping header row
- Each mode has icon, title, description, and selection indicator

**CSV Preview & Validation:**
- Summary cards showing: Total Rows, Valid, Invalid, Warnings
- Column mapping display with visual status indicators
- Required columns marked with red indicators if missing
- Data preview table with first 50 rows
- Row numbers with monospace font
- Per-row validation status badges (Valid/Error/Warn)
- Expandable rows showing all fields and error details
- Click any row to expand/collapse details

**Import Progress:**
- Animated progress bar with shimmer effect
- Percentage display with monospace font
- Live success/failure counters
- Spinning loader with pulsing ring animation

**Import Complete:**
- Summary display with success/error counts
- Conditional icon (checkmark for all success, warning for partial)
- Detailed import log with per-product status
- Links to view successfully imported products
- "Import More" and "View All Products" actions

**CSV Template Download:**
- Download button in header area
- Generates proper CSV with all 12 columns
- Includes example data row with realistic values

**State Machine:**
- Initial (empty upload zone)
- File Selected (configuration options)
- Parsing (animated loading state)
- Preview (validation results & data table)
- Importing (progress tracking)
- Complete (results summary)

### Design Highlights

- "Data Flow Terminal" aesthetic - industrial precision meets modern data viz
- Deep slate background (slate-900/800) with emerald accent colors
- Atmospheric background with gradient blurs and subtle dot grid pattern
- Animated vertical "data flow" lines in upload zone
- Monospace typography for data/numbers, clean sans-serif for UI
- Color-coded validation: emerald for valid, red for errors, amber for warnings
- Smooth transitions between all states
- Loading states with pulsing animations and bouncing dots
- Progress bar with animated shimmer overlay
- Expandable table rows with full field details
- Error/warning lists with bullet indicators
- Responsive design with proper overflow handling

### Files Changed
- `src/app/dashboard/bulk-import/page.tsx`: New file - Complete Bulk CSV Import page (920+ lines)
- `src/components/dashboard/DashboardSidebar.tsx`: Added "Bulk Import" navigation item with spreadsheet icon

### Dependencies Used
- `lucide-react` icons (Upload, FileSpreadsheet, CheckCircle, XCircle, Download, AlertTriangle, ArrowRight, Loader2, ChevronDown, ChevronUp, RotateCcw, Package, Zap, Database, ArrowUpRight, FileText, Trash2)
- `@/contexts/ShopifyStoreContext` for store selection

### API Integration
- POST `/api/bulk-import` with FormData (file, storeId, mode, productData)
- Client-side CSV parsing with proper quote handling
- Client-side validation before server submission

### Build Verification
- Build passes successfully
- Page size: 12.4 kB
- Route: `/dashboard/bulk-import` (static)

### Notes
- Follows established dashboard patterns from products, orders, and research pages
- Uses green-500/emerald primary color scheme consistent with Shopify theme
- All states handled: loading, error, empty (no store), populated
- Mobile-responsive with proper overflow scrolling for data table
- CSV column reference section visible in initial/file-selected states
- Custom shimmer animation for progress bar

---

## 2026-01-13 - Backend Agent: Bulk CSV Product Import API

**Task:** Create API endpoint for bulk CSV product import at `/api/bulk-import`

### API Endpoints

**POST `/api/bulk-import`**
Process CSV file for bulk product import preview and validation.

Accepts multipart/form-data with:
- `file`: CSV file (required, max 10MB)
- `storeId`: Store ID to import to (required)
- `mode`: 'create' | 'update' | 'upsert' (required)

**Expected CSV Format:**
```csv
title,description,vendor,product_type,tags,price,compare_at_price,sku,barcode,inventory_quantity,weight,weight_unit
"Product Name","Description text","Brand Name","Category","tag1,tag2",29.99,39.99,"SKU123","1234567890",100,1.5,"kg"
```

Response format:
```typescript
{
  success: true,
  data: {
    totalRows: number,
    validRows: number,
    invalidRows: number,
    products: Array<{
      rowNumber: number,
      valid: boolean,
      errors?: string[],
      data: { title, description, price, ... }
    }>,
    warnings: string[]
  }
}
```

**GET `/api/bulk-import`**
Get import history for the authenticated user.

Query parameters:
- `limit` (optional): number (default: 20, max: 100)

Response format:
```typescript
{
  success: true,
  data: ImportHistoryRecord[],
  meta: { count: number, limit: number }
}
```

### Features Implemented

**CSV Parsing:**
- Custom CSV parser handling quoted fields with commas
- Escaped quotes within fields (double quotes)
- Normalized line endings (CRLF, CR, LF)
- Header validation against expected columns

**Validation:**
- Required fields: title, price
- Price validation (positive number, 2 decimal places)
- Compare at price validation (must be > price)
- SKU length limit (255 chars)
- Barcode format validation (digits and hyphens)
- Inventory quantity validation (non-negative integer)
- Weight unit validation (g, kg, oz, lb)
- Title length limit (255 chars)

**Security:**
- User authentication via Supabase
- Store ownership verification
- File type validation (CSV only)
- File size limit (10MB)

**Error Handling:**
- Standard error response format with codes
- Graceful handling if history table doesn't exist
- Detailed row-by-row validation errors

### Files Changed
- `src/app/api/bulk-import/route.ts`: New file - Complete API endpoint (700+ lines)

### Database Tables
- `bulk_import_history` - Optional table for storing import history (gracefully handles if missing)

### Dependencies Used
- `@/lib/supabase/server` - createSupabaseServerClientWithCookies for auth
- `@/lib/logger` - createLogger for structured logging

### Breaking Changes
- None

### Notes
- Table `bulk_import_history` is optional - endpoint works without it
- Import history saving is non-blocking (logs warning if table doesn't exist)
- Large imports (>1000 rows) trigger a warning recommendation to split batches
- All validation errors are returned per-row for easy UI display

---

## 2026-01-13 - Frontend Agent: Approval Workflows Dashboard

**Task:** Created a distinctive, production-grade UI for Approval Workflows at `/dashboard/approvals`

### Features Implemented

**Stats Overview Cards:**
- Pending Approvals (with pulsing indicator when active)
- Approved count (last 30 days)
- Rejected count (last 30 days)
- Average Response Time

**Pending Approvals Queue:**
- Approval request cards with risk-level color coding
- Risk level badges: low (green), medium (amber), high (orange), critical (red with pulse animation)
- Impact summary: affected items, estimated cost, reversibility indicator
- Real-time countdown timers for expiration
- Expandable details section with trigger event context
- Approve/Reject actions with confirmation modals
- Optional conditions input for approvals (high/critical risk)
- Optional rejection reason input

**Approval History Tab:**
- Past approvals/rejections list
- Status badges: approved (green), rejected (red), expired (gray), executed (blue)
- Timestamps and agent info

**Design Highlights:**
- "Mission Control" aesthetic - NASA command center meets modern fintech security dashboard
- Deep slate background with atmospheric grid pattern
- Emerald accent glows and radial gradients
- Monospace typography for data elements
- Critical risk cards have pulsing red border animation
- Loading skeletons for all data states
- Empty states with encouraging messaging
- Auto-refresh every 30 seconds
- Smooth slide-in animations for notifications

### Files Changed
- `src/app/dashboard/approvals/page.tsx`: New file - Complete Approval Workflows page (920+ lines)
- `src/components/dashboard/DashboardSidebar.tsx`: Added "Approvals" navigation item with shield check icon

### Dependencies Used
- `lucide-react` icons (Shield, ShieldCheck, ShieldX, ShieldAlert, Clock, AlertTriangle, Zap, CheckCircle, XCircle, Timer, Activity, etc.)
- `@/lib/auth-context` for user authentication

### API Integration
- GET `/api/approvals?type=pending` - Fetch pending approvals
- GET `/api/approvals?type=history&limit=20` - Fetch approval history
- GET `/api/approvals?type=stats` - Fetch approval statistics
- POST `/api/approvals` - Submit approval/rejection decision

### Build Verification
- Build passes successfully
- Page size: 7.38 kB
- Route: `/dashboard/approvals` (static)

### Notes
- Follows established dashboard patterns from research and products pages
- Uses green-500 primary color scheme consistent with Shopify theme
- All states handled: loading, error, empty, populated
- Risk levels have distinct visual treatments (colors, animations)
- High-risk approvals require confirmation step
- Mobile-responsive with adaptive grid layouts

---

## 2026-01-13 - Backend Agent: Approval Workflows API

**Task:** Create API endpoint for approval workflows at `/api/approvals`

### API Endpoints

**GET `/api/approvals`**
Fetch approvals and stats for authenticated user.

Query parameters:
- `type` (required): `'pending'` | `'history'` | `'stats'`
- `limit` (optional): number (for history, default: 50, max: 200)

Response format:
```typescript
{
  success: boolean,
  data: ApprovalRequest[] | ApprovalStats,
  error?: string
}
```

**POST `/api/approvals`**
Respond to an approval request (approve or reject).

Request body:
```typescript
{
  requestId: string,           // Required
  decision: 'approve' | 'reject',  // Required
  reason?: string,             // Optional
  conditions?: string[]        // Optional (for approve)
}
```

Response format:
```typescript
{
  success: boolean,
  data?: {
    requestId: string,
    decision: string,
    processedAt: string
  },
  error?: string
}
```

### Files Changed
- `src/app/api/approvals/route.ts`: New file - Complete API endpoint with GET and POST handlers

### Dependencies Used
- `@/lib/agents/approval-workflow` - getPendingApprovals, getApprovalHistory, getApprovalStats, processApprovalResponse
- `@/lib/logger` - createLogger for structured logging
- `@/lib/supabase/server` - createSupabaseServerClientWithCookies for auth

### Database Tables
- `approval_requests` - Table for storing approval requests (gracefully handles if missing)

### Breaking Changes
- None

### Notes
- Endpoint requires authentication via Supabase
- Gracefully handles missing `approval_requests` table (returns empty arrays/stats)
- All input validation implemented with clear error messages
- Follows established API patterns from `/api/research/competitive`

---

## 2026-01-13 - Frontend Agent: Competitive Intelligence Hub

**Task:** Created a distinctive, production-grade UI for the Competitive Intelligence Hub at `/dashboard/research`

### Features Implemented

**Research Type Selector:**
- Three research modes with color-coded cards: Price Research (emerald), Competitor Analysis (blue), Market Research (violet)
- Visual selection indicators with smooth transitions
- Each mode has dedicated input forms

**Dynamic Input Forms:**

*Price Research Form:*
- Product name (required)
- Category (required)
- Description (textarea)
- Features (tag input with add/remove functionality)
- Currency selector (USD, EUR, GBP, PLN, CAD, AUD)

*Competitor Analysis Form:*
- Company name (required)
- Industry (required)

*Market Research Form:*
- Market/niche (required)
- Timeframe selector (Current State, 6-Month Outlook, 1-Year Projection)

**Results Display:**

*Price Research Results:*
- Summary cards: Average Price, Price Range, Market Position, Demand Level
- Recommended pricing section with min/optimal/max values and reasoning
- Competitor data table with source, product, price, and similarity score bar
- Market insights section with seasonality and trends
- Sources list with external links

*Competitor/Market Analysis Results:*
- Full markdown-rendered response
- Sources list with clickable links

**Research History:**
- Toggle-able history sidebar
- Recent research items with type icon and timestamp
- Click to reload past results

**Design Highlights:**
- "Strategic Intelligence Command" aesthetic - sophisticated data dashboard feel
- Atmospheric background with gradient blurs and subtle grid pattern
- Color-coded research types (emerald/blue/violet)
- Animated loading states with pulsing indicators
- Smooth slide-in animations for results
- Responsive layout (xl breakpoint grid)
- Empty state with feature highlights

### Files Changed
- `src/app/dashboard/research/page.tsx`: New file - Complete Competitive Intelligence Hub page (850+ lines)
- `src/components/dashboard/DashboardSidebar.tsx`: Added "Research Hub" navigation item with chart icon

### Dependencies Used
- `lucide-react` icons (Search, TrendingUp, DollarSign, BarChart3, Building2, Globe, etc.)
- `react-markdown` for rendering competitor/market analysis responses
- `@/lib/auth-context` for user authentication

### API Integration
- POST `/api/research/competitive` with type-specific payloads
- Handles three response formats: pricing data, analysis content, research content

### Build Verification
- Build passes successfully
- Page size: 8.11 kB
- Route: `/dashboard/research` (static)

### Notes
- Follows established dashboard patterns from analytics and products pages
- Uses green-500 primary color scheme consistent with Shopify theme
- All states handled: loading, error, empty, populated
- Results stored in client-side history (20 most recent)
- Mobile-responsive with stacked layout on smaller screens

---

## 2026-01-13 - Backend Agent: Competitive Research API

**Task:** Create API endpoint for competitive research at `/api/research/competitive`

### API Endpoints

**POST `/api/research/competitive`**
Performs competitive research based on request type:
- `price_research` - Analyze pricing for a product using WebPriceResearcher
- `competitor_analysis` - Analyze competitors using PerplexityAgent
- `market_research` - Conduct market research using PerplexityAgent

Request body format:
```typescript
{
  type: 'price_research' | 'competitor_analysis' | 'market_research',
  // For price_research:
  productName?: string,
  category?: string,
  description?: string,
  features?: string[],
  currency?: string,
  // For competitor_analysis:
  company?: string,
  industry?: string,
  // For market_research:
  market?: string,
  timeframe?: string
}
```

Response format:
```typescript
{
  success: boolean,
  data?: { type: string, ... },
  error?: string
}
```

**GET `/api/research/competitive`**
Returns research history for authenticated user. Query parameters:
- `limit` (default: 20, max: 100)
- `offset` (default: 0)
- `type` (optional filter: price_research | competitor_analysis | market_research)

### Files Changed
- `src/app/api/research/competitive/route.ts`: New file - Complete API endpoint with POST and GET handlers

### Dependencies Used
- `@/lib/ai/web-price-research` - WebPriceResearcher and researchProductPricing
- `@/lib/ai/perplexity` - PerplexityAgent for competitor and market analysis
- `@/lib/logger` - createLogger for structured logging
- `@/lib/supabase/server` - createSupabaseServerClientWithCookies for auth

### Database Tables
- `research_history` - Optional table for storing research history (gracefully handles if missing)

### Breaking Changes
- None

### Notes
- Endpoint requires authentication via Supabase
- Research history saving is non-blocking (logs warning if table doesn't exist)
- Uses ResearchAgent interface locally to avoid dependency on deleted `@/lib/agents.ts`
- All input validation implemented with clear error messages

---

## 2026-01-13 - Backend Agent: Image Generations Table

**Task:** Create database migration for image_generations table to store AI-generated image history

### Database Changes

**Table: `public.image_generations`**
- Stores user AI-generated image history with prompts, styles, and generation metadata
- Foreign key to `auth.users(id)` with CASCADE delete

**Columns:**
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() |
| user_id | UUID | NOT NULL, FK to auth.users |
| prompt | TEXT | NOT NULL |
| style | TEXT | nullable |
| aspect_ratio | TEXT | nullable |
| quality | TEXT | nullable |
| image_url | TEXT | nullable |
| image_path | TEXT | nullable |
| revised_prompt | TEXT | nullable |
| tokens_used | INTEGER | nullable |
| latency_ms | INTEGER | nullable |
| model | TEXT | nullable |
| metadata | JSONB | DEFAULT '{}' |
| created_at | TIMESTAMPTZ | DEFAULT now() |

**Indexes:**
- `idx_image_generations_user_id` - Fast user lookup
- `idx_image_generations_created_at` - Sorted by creation time DESC
- `idx_image_generations_user_created` - Composite for user + time queries

**RLS Policies:**
- `Users can view their own image generations` - SELECT
- `Users can insert their own image generations` - INSERT
- `Users can update their own image generations` - UPDATE
- `Users can delete their own image generations` - DELETE

### Files Changed
- `src/components/dashboard/DashboardSidebar.tsx`: Added "Image Generator" navigation item with image icon, linking to `/dashboard/image-generator`

### Database Migrations
- `create_image_generations_table` - Applied via Supabase MCP

### Storage Buckets
- `generated-images` bucket already exists (no action required)

### New Endpoints
- None (table only - API endpoints to be created separately)

### Breaking Changes
- None

### Notes
- The `/dashboard/image-generator` page does not exist yet - Frontend Agent should create it
- Storage bucket `generated-images` is already configured and ready for use
- RLS policies ensure complete user data isolation

---

## 2026-01-13 - Frontend Agent: AI Image Generator Dashboard

**Task:** Created a production-ready AI Image Generator dashboard page with modern, polished UI

**Files changed:**
- `src/app/dashboard/image-generator/page.tsx`: New page - Complete AI image generation interface with:
  - Large prompt textarea with character count
  - 7 art style options (Photorealistic, Digital Art, Oil Painting, Watercolor, Sketch, Cartoon, Abstract)
  - 4 aspect ratio options (Square 1:1, Portrait 3:4, Landscape 4:3, Wide 16:9)
  - Quality toggle (Standard/HD)
  - Animated generation state with spinner and progress indicators
  - Generated image display with hover overlay and download functionality
  - Generation history grid with thumbnail previews
  - Empty states for both preview and history
  - Error and success message handling with auto-dismiss
  - Pro tips section for better results
  - Fully responsive design (mobile to desktop)

**Dependencies added:** None (uses existing Lucide icons and Next.js Image component)

**Notes:**
- Design follows "Digital Atelier" aesthetic - sophisticated creative studio vibe
- Matches existing dashboard patterns from analytics and products pages
- Uses green-500 primary color scheme consistent with Shopify theme
- API integration expects POST/GET at `/api/images/generate`
- All states handled: loading, error, empty, populated
- Keyboard accessible and screen reader friendly

---

## 2026-01-13 - Security Audit & DebugFix Cycle

### Overview
Comprehensive security audit and code quality review using parallel agent analysis. All critical and high-priority issues have been resolved.

### Security Fixes

#### 1. Hardcoded Maintenance Password (CRITICAL)
**File:** `middleware.ts`
- **Problem:** Default password "CrewFlow2025!" was hardcoded as fallback
- **Fix:** Now requires `MAINTENANCE_PASSWORD` environment variable to be set
- **Impact:** Admin bypass is disabled if env var is not configured (security-first approach)

#### 2. Unauthenticated Health Endpoint (HIGH)
**File:** `src/app/api/chat/route.ts`
- **Problem:** GET endpoints (health, types, analytics) were publicly accessible
- **Fix:** All GET actions now require authentication via `requireAuthAPI()`
- **Impact:** Unauthenticated requests return 401 status

#### 3. CORS Wildcard Vulnerability (HIGH)
**File:** `src/app/api/chat/route.ts`
- **Problem:** `Access-Control-Allow-Origin: *` allowed any origin
- **Fix:** Origin validation against `CORS_ALLOWED_ORIGINS` env var + localhost
- **Impact:** Only explicitly allowed origins can make cross-origin requests

#### 4. Webhook Signature Timing Attack (CRITICAL)
**File:** `src/lib/integrations/shopify-admin-api.ts`
- **Problem:** Direct string comparison (`===`) vulnerable to timing attacks
- **Fix:** Uses `crypto.timingSafeEqual()` for constant-time comparison
- **Impact:** Prevents attackers from deducing signatures via response timing

#### 5. Debug Information Exposure (HIGH)
**File:** `src/app/api/chat/route.ts`
- **Problem:** Debug info included in all API responses (internal structure exposed)
- **Fix:** Debug object only included when `NODE_ENV === 'development'`
- **Impact:** Production responses contain only necessary data

### Code Quality Fixes

#### 6. createShopifyAPI Parameter Mismatch (CRITICAL)
**Files:** `shopify-ai.ts`, `ai-store-manager.ts`
- **Problem:** Parameters passed in wrong order: `(shopDomain, accessToken)` instead of `(userId, accessToken?, shopDomain?)`
- **Fix:** Corrected parameter order in all call sites
- **Impact:** API initialization now works correctly

#### 7. Missing shopDomain in Multi-Store Routes (CRITICAL)
**Files:** 6 API route files
- **Problem:** Routes called `createShopifyAPI(userId)` without shopDomain, causing cross-store data leakage
- **Fix:** All routes now pass `storeData.shop_domain` as third parameter
- **Impact:** Multi-store users get correct store data
- **Affected Routes:**
  - `products/[productId]/route.ts` (GET, DELETE)
  - `orders/route.ts` (GET)
  - `orders/[orderId]/route.ts` (GET)
  - `orders/[orderId]/fulfill/route.ts` (POST)
  - `orders/[orderId]/cancel/route.ts` (POST)

#### 8. Missing read_products Permission Check (HIGH)
**File:** `src/app/api/shopify/stores/[storeId]/products/[productId]/route.ts`
- **Problem:** GET handler didn't verify `read_products` permission
- **Fix:** Added permission check before fetching product
- **Impact:** Consistent permission enforcement

#### 9. Non-Existent Method Calls (HIGH)
**Files:** `shopify-ai.ts`, `ai-store-manager.ts`
- **Problem:** Called `getStoreInfo()` and `getOrderStatistics()` which don't exist
- **Fix:** Changed to `getShop()` which exists in ShopifyAdminAPI class
- **Impact:** Store context loading now works

#### 10. Pagination Bounds Validation (MEDIUM)
**File:** `src/app/api/shopify/stores/[storeId]/orders/route.ts`
- **Problem:** No validation on `limit` parameter (could be negative or exceed Shopify max)
- **Fix:** Validates and clamps to range 1-250 (Shopify API limit)
- **Impact:** Prevents invalid API requests

### Files Modified

| File | Changes |
|------|---------|
| `middleware.ts` | Secure password handling |
| `src/app/api/chat/route.ts` | Auth, CORS, debug info |
| `src/lib/chat/handlers/shopify-ai.ts` | API params, method calls |
| `src/lib/chat/handlers/ai-store-manager.ts` | API params, method calls (2 locations) |
| `src/lib/integrations/shopify-admin-api.ts` | Timing-safe webhook validation |
| `src/app/api/shopify/stores/[storeId]/orders/route.ts` | Pagination, shopDomain |
| `src/app/api/shopify/stores/[storeId]/orders/[orderId]/route.ts` | shopDomain |
| `src/app/api/shopify/stores/[storeId]/orders/[orderId]/fulfill/route.ts` | shopDomain |
| `src/app/api/shopify/stores/[storeId]/orders/[orderId]/cancel/route.ts` | shopDomain |
| `src/app/api/shopify/stores/[storeId]/products/[productId]/route.ts` | shopDomain, permission |

### Environment Variables Required

After this update, the following environment variables should be configured:

```env
# Required for maintenance mode bypass
MAINTENANCE_PASSWORD=your-secure-password-here

# Optional: Comma-separated list of allowed CORS origins
CORS_ALLOWED_ORIGINS=https://yourdomain.com,https://app.yourdomain.com
```

### AI Model Configuration

GPT-5 model references retained across 10 files as per user request:
- `src/lib/ai/config.ts`
- `src/lib/ai/model-config.ts`
- `src/lib/ai/autogen.ts`
- `src/lib/ai/langchain-working.ts`
- `src/lib/ai/advanced-intent-recognition.ts`
- `src/lib/ai/product-listing-generator.ts`
- `src/lib/ai/smart-context-compressor.ts`
- `src/lib/agents/shopify-capabilities.ts`
- `src/lib/ai-cost-calculator.ts`
- `src/lib/ai-usage-tracker.ts`

### Verification

- ✅ Build passes (`npm run build`)
- ✅ Dev server runs (`npm run dev`)
- ✅ All security fixes verified via parallel QA agents
- ✅ API routes integrity confirmed

### Known Lower-Priority Items (Future Cleanup)

These items were identified but don't affect functionality:
- Console.log statements in production code (should use logger)
- Inconsistent agent name casing (`shopify_ai` vs `shopify-ai`)
- Magic numbers without named constants
- Some redundant code paths

---

## 2026-01-13 - Shopify Green Theme Redesign

### Changed

#### Complete Color Theme Migration
Migrated the entire codebase from orange/amber color scheme to green/emerald for Shopify-themed branding.

**Color Mappings Applied:**
- Tailwind CSS classes: `orange-*` to `green-*` (50 through 900 shades)
- Amber to Emerald: `amber-50` to `emerald-50`, `amber-100` to `emerald-100`, etc.
- Hex colors: `#f97316`, `#FF6A3D`, `#ff6a3d` to `#5BBF46`
- Hex colors: `#ea580c` to `#4ca83c`
- HSL constants: `CREWFLOW_ORANGE_HUE` to `CREWFLOW_GREEN_HUE`

**Files Updated (50+ components and pages):**

*Assistant Components:*
- `ProductPreviewDock.tsx` - Focus rings, button colors
- `StoreChatPanel.tsx` - Gradients, buttons, badges
- `ThreadsSidebar.tsx` - Highlight colors
- `AIStoreAssistantLayout.tsx` - Icon colors
- `QuickActionsBar.tsx` - Hover states
- `StoreSelector.tsx` - Focus states

*Admin Components:*
- `AdminSidebar.tsx`, `AdminHeader.tsx`
- `AdminAuditLog.tsx`, `AdminAnalyticsCharts.tsx`, `AdminAnalyticsAgents.tsx`
- `AdminUsersTable.tsx`, `AdminUsersFilters.tsx`
- `AdminUserProfile.tsx`, `AdminUserActivity.tsx`, `AdminUserSubscription.tsx`
- `AdminSystemHealth.tsx`, `AdminRecentActivity.tsx`, `AdminOverviewCards.tsx`
- `UsageAnalyticsTable.tsx`, `UsageAnalyticsSummary.tsx`, `UsageAnalyticsFilters.tsx`
- `PredictiveResponseStats.tsx`, `AICacheMonitor.tsx`, `ReferralAnalytics.tsx`

*Integration Components:*
- `IntegrationHub.tsx`, `TokenManager.tsx`
- `ProductionConfig.tsx`, `PermissionsManager.tsx`, `ErrorRecovery.tsx`

*UI Components:*
- `beams-background.tsx` - HSL hue constant
- `spotlight-card.tsx` - Removed orange glow option
- `MaintenanceMode.tsx`, `MaintenanceWrapper.tsx`, `MaintenanceClient.tsx`
- `MaintenanceTypewriter.tsx`, `SimpleMaintenanceText.tsx`
- `MarkdownRenderer.tsx`

*Access/Usage Components:*
- `TierGate.tsx`, `UsageLimitEnforcer.tsx`
- `UpgradePromptBanner.tsx`, `UpgradePromptModal.tsx`
- `PlanInfoCard.tsx`, `UsageTrackingWidget.tsx`

*Analytics Components:*
- `RealTimeMetrics.tsx`, `AgentPerformanceMonitor.tsx`

*Chat Components:*
- `ImageRenderer.tsx`, `ImageMessageDisplay.tsx`

*Other Components:*
- `WorkflowBuilder.tsx`, `CrewAbilityInputModal.tsx`, `AnimatedBoat.tsx`
- `PlanManagementInterface.tsx`, `AgentPermissionsSettings.tsx`

*Page Files:*
- `src/app/page.tsx` - Loading spinner color
- `install/page.tsx`, `admin-setup/page.tsx`, `data-deletion/page.tsx`
- `agents-dashboard/page.tsx`, `shopify/setup/page.tsx`
- `stores/[storeId]/manage/page.tsx`
- `admin/users/page.tsx`, `admin/users/[userId]/page.tsx`
- `admin/usage-analytics/page.tsx`, `admin/audit-logs/page.tsx`
- `integrations/shopify/error/page.tsx`, `test/shopify-integration/page.tsx`

*Library Files:*
- `tier-enforcement.ts` - Color property values
- `predictive-response-checker.ts` - Agent color definitions
- `resend-service.ts` - Email template gradients and buttons
- `notification-system.ts` - Email HTML styling

**Dependencies:** None added

**Notes:** All orange color references have been replaced with green equivalents to align with Shopify's brand identity. The changes are purely visual and do not affect functionality.

---

## [Unreleased] - What Still Needs To Be Done

### High Priority - Core Features

#### Inventory Management
- [ ] **Inventory Page** - View and manage stock levels
  - Create: `src/app/dashboard/inventory/page.tsx`
- [ ] **Inventory API** - Get/update inventory levels
  - Create: `src/app/api/shopify/stores/[storeId]/inventory/route.ts`
- [ ] **Locations API** - Get store locations
  - Create: `src/app/api/shopify/stores/[storeId]/locations/route.ts`

#### Customer Management
- [ ] **Customers Page** - Customer list with search and details
  - Create: `src/app/dashboard/customers/page.tsx`
- [ ] **Customers API** - CRUD operations for customers
  - Create: `src/app/api/shopify/stores/[storeId]/customers/route.ts`

#### Billing & Payments
- [ ] **Billing Management** - Currently shows "coming soon" message
  - Location: `src/app/dashboard/settings/page.tsx:289`

### Medium Priority - Enhancements

#### Custom Hooks
- [ ] **useInventory hook** - Inventory data fetching and management
- [ ] **useCustomers hook** - Customer data fetching and search

#### AI Assistant
- [ ] **AI Assistant Sidebar** - Context-aware help on all pages
  - Create: `src/components/shopify/AIAssistantSidebar.tsx`

### Completed - Previously Listed as TODO

#### Products Management ✅
- [x] **DELETE endpoint** for products - COMPLETED 2026-01-12
  - Endpoint: `src/app/api/shopify/stores/[storeId]/products/[productId]/route.ts`
  - Frontend: Real delete API call in `handleDelete()`

#### Orders Management ✅
- [x] **View Order Details Modal** - COMPLETED 2026-01-12
  - Full order detail modal with customer info, line items, totals
- [x] **Fulfill Order API** - COMPLETED 2026-01-12
  - Endpoint: `src/app/api/shopify/stores/[storeId]/orders/[orderId]/fulfill/route.ts`
- [x] **Cancel Order API** - COMPLETED 2026-01-12
  - Endpoint: `src/app/api/shopify/stores/[storeId]/orders/[orderId]/cancel/route.ts`

---

## 2026-01-12 - Phase 3 & 4 Complete: Components, Hooks, and API Routes

### Added

#### Reusable DataTable Component
**File:** `src/components/ui/DataTable.tsx`
- Generic TypeScript component with type-safe columns
- Loading skeleton with configurable row count
- Error and empty state handling
- Sortable columns with ascending/descending toggle
- Pagination with configurable items per page
- Mobile-responsive card view
- Row click handler support

#### Custom React Hooks
**File:** `src/hooks/useProducts.ts`
- Product data fetching with AbortController for race conditions
- Filtering by status, search query
- Sorting with multiple columns
- Pagination logic
- Helper functions: formatCurrency, formatDate, getStatusColor

**File:** `src/hooks/useOrders.ts`
- Order data fetching with AbortController
- Filtering by fulfillment status, financial status, search
- Sorting and pagination
- Stats calculation (total, unfulfilled, fulfilled, revenue)
- Revenue excludes cancelled/refunded/voided orders

**File:** `src/hooks/index.ts`
- Centralized export for all hooks

#### API Routes - Products
**File:** `src/app/api/shopify/stores/[storeId]/products/[productId]/route.ts`
- `GET` - Fetch single product details
- `DELETE` - Delete product with permission check (write_products)

#### API Routes - Orders
**File:** `src/app/api/shopify/stores/[storeId]/orders/[orderId]/route.ts`
- `GET` - Fetch order details with customer info, line items

**File:** `src/app/api/shopify/stores/[storeId]/orders/[orderId]/fulfill/route.ts`
- `POST` - Fulfill order with optional tracking info
- Supports: trackingNumber, trackingCompany, trackingUrl, notifyCustomer

**File:** `src/app/api/shopify/stores/[storeId]/orders/[orderId]/cancel/route.ts`
- `POST` - Cancel order with reason
- Valid reasons: customer, fraud, inventory, declined, other
- Supports: notifyCustomer, refund flags

### Changed

#### Orders Page Enhancements
**File:** `src/app/dashboard/orders/page.tsx`
- Order Details modal with full order information
- Real fulfill/cancel API calls (no more placeholders)
- Revenue calculation excludes cancelled/refunded orders
- Loading guards on manual refresh

#### Products Page Enhancements
**File:** `src/app/dashboard/products/page.tsx`
- Real delete API call with confirmation modal
- Improved duplicate: copies vendor, images, variants, creates as draft

#### Dashboard Layout Fix
**File:** `src/app/dashboard/layout.tsx`
- Added ShopifyStoreProvider wrapper (was missing, caused runtime error)

#### Shopify Admin API
**File:** `src/lib/integrations/shopify-admin-api.ts`
- Added `deleteProduct(productId)` method
- Added `cancelOrder(orderId, reason, email, refund)` method

---

## 2026-01-12 - Major Platform Consolidation

### Strategic Pivot
Consolidated CrewFlow from a multi-agent platform to a **Shopify-focused e-commerce management platform**.

### Removed
- **20+ Agent Endpoints**: Anchor, Beacon, Coral, Drake, Flint, Helm, Ledger, Mariner, Morgan, Patch, Pearl, Sage, Tide, Splash
- **Meal Planning System**: Auto-generate, export, generate, history, modify, pantry, profile endpoints
- **Debug/Admin Pages**: debug-admin, debug-maintenance, debug-auth, session-test
- **Agent UI Components**: AgentInterface, ApprovalPrompt, ThreadManager (old), ThreadContextEditor
- **Meal Planning UI**: CrewProfileNavigator, MealPlanDisplay, MealPlanningChatInterface

### Added

#### Orders Management Page
**File:** `src/app/dashboard/orders/page.tsx` (878 lines)

- Order listing with customer name, total, fulfillment status, payment status
- Filters: fulfillment status (unfulfilled, fulfilled, partially fulfilled, cancelled)
- Filters: payment status (paid, pending, refunded, etc.)
- Search by order number or customer name
- Sortable columns with ascending/descending toggle
- Pagination (10 items per page)
- Quick actions: View details, Fulfill order, Cancel order (placeholders)
- Summary stats: Total orders, unfulfilled count, fulfilled count, total revenue
- Time-ago formatting and error handling

#### Products Management Page
**File:** `src/app/dashboard/products/page.tsx` (862 lines)

- Product listing with thumbnail images, title, price, status, inventory
- Filtering by status (active, draft, archived)
- Search by product title/vendor/type/tags
- Sortable columns (title, price, status, inventory, updated_at)
- Pagination (10 items per page)
- Quick actions: Edit (links to AI assistant), Duplicate (via API), Delete (placeholder)
- Loading skeletons, error states, empty states
- AI Assistant prompt for natural language product management

#### Thread Manager Component
**File:** `src/components/shopify/ThreadManager.tsx`

- Manages persistent chat threads for Shopify AI
- Thread list with relative timestamps
- Thread renaming/editing capability
- Thread deletion with confirmation
- New conversation button
- Integrates with `/api/chat/threads` endpoints

#### Logger Utility
**File:** `src/lib/logger.ts`

- Environment-aware logging (development vs production)
- Log levels: debug, info, warn, error
- Consistent timestamp and prefix formatting
- Child logger support for module-specific logging

### Changed

#### Middleware Simplification
**File:** `middleware.ts`

- Removed `/api/debug/environment` from public paths
- Cleaner maintenance mode implementation
- Cookies-based admin bypass

#### Chat Router Streamlining
**File:** `src/lib/chat/router.ts`

- Removed GeneralAgentHandler, MealPlanningHandler
- Retained ShopifyAIHandler, AIStoreManagerHandler
- Added professional logging via `createLogger()`
- Lazy-loaded handlers for performance

#### Dashboard Sidebar
**File:** `src/components/dashboard/DashboardSidebar.tsx`

- Updated navigation to reflect Shopify-focused features
- Removed crew/agent navigation items

---

## 2026-01-11 - Security & Authentication Fixes

### Fixed
- **Shopify OAuth callback 500 errors** - Migrated to unified Supabase SSR client
- **Authentication session mismatch** - Fixed client/server session sync issues
- **Shopify product response naming conflict** - Build fix

### Security
- Scrubbed Shopify secrets from repository
- Secure Shopify token storage with Supabase
- Improved product publishing URLs

### Changed
- Simplified maintenance middleware
- Session token validation improvements

---

## Recent Commits Reference

| Commit | Description |
|--------|-------------|
| `9c8d82b` | Fix Shopify product response naming conflict (build fix) |
| `8958409` | Secure Shopify token storage & fix callback 500 |
| `23118b9` | Fix Shopify OAuth with unified Supabase SSR client |
| `8dad3bb` | Scrub Shopify secrets from repo |
| `0aa4394` | Fix authentication session mismatch |

---

## Tech Stack

- **Frontend**: Next.js 15.3.3 (Turbopack), React 19, TypeScript, Tailwind CSS, Lucide icons
- **Backend**: Next.js API routes, OpenAI (via LangChain)
- **Database**: Supabase (PostgreSQL + Auth + SSR)
- **State Management**: React Context API (ShopifyStoreContext)
- **Integrations**: Shopify Admin API (REST + GraphQL)

---

## Project Structure Overview

```
CrewFlow - Shopify Store Management Platform
├── src/app/
│   ├── dashboard/
│   │   ├── page.tsx           # Store overview
│   │   ├── products/          # Product management
│   │   ├── orders/            # Order management
│   │   ├── inventory/         # [TODO] Inventory management
│   │   ├── customers/         # [TODO] Customer management
│   │   ├── analytics/         # Store analytics
│   │   ├── settings/          # Store settings & OAuth
│   │   └── shopify/           # AI Assistant chat
│   └── api/shopify/stores/[storeId]/
│       ├── products/          # Product CRUD
│       ├── orders/            # Order management
│       └── inventory/         # [TODO] Inventory levels
├── src/components/
│   ├── shopify/               # Shopify-specific components
│   ├── dashboard/             # Dashboard layout components
│   └── ui/                    # Reusable UI components (DataTable)
├── src/hooks/                 # Custom React hooks
│   ├── useProducts.ts
│   ├── useOrders.ts
│   └── index.ts
├── src/lib/
│   ├── integrations/shopify-admin-api.ts  # Shopify API client
│   ├── chat/                  # AI chat handlers
│   └── supabase/              # Database client
└── src/contexts/              # React contexts
    └── ShopifyStoreContext.tsx
```

## Current Platform Focus

CrewFlow is a **Shopify-focused e-commerce management platform** that provides:
- Dashboard-first UX with data tables for products, orders, inventory
- AI Assistant as a helper for natural language store management
- Real-time Shopify store synchronization via OAuth

**Removed Features (Jan 2026):**
- Multi-agent system (14+ agents)
- Meal planning, fitness, productivity modules
- Debug/admin panels
