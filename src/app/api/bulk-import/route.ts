import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClientWithCookies } from '@/lib/supabase/server'
import { createLogger } from '@/lib/logger'
import { createShopifyAPI, ShopifyProduct } from '@/lib/integrations/shopify-admin-api'

const log = createLogger('BulkImportAPI')

// ==================== Security Constants ====================

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Maximum rows allowed in a single import to prevent DoS
const MAX_IMPORT_ROWS = 500

// Whitelist of safe HTML tags for product descriptions
const SAFE_HTML_TAGS = ['b', 'i', 'strong', 'em', 'br', 'p', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'span', 'div', 'a']

// Dangerous HTML patterns to remove
const DANGEROUS_HTML_PATTERNS = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
  /<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi,
  /<embed\b[^>]*>/gi,
  /<link\b[^>]*>/gi,
  /<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi,
  /\bon\w+\s*=\s*["'][^"']*["']/gi, // Event handlers like onclick, onerror, etc.
  /\bon\w+\s*=\s*[^\s>]*/gi, // Event handlers without quotes
  /javascript\s*:/gi, // javascript: URLs
  /vbscript\s*:/gi, // vbscript: URLs
  /data\s*:\s*text\/html/gi, // data: URLs with HTML
  /\bstyle\s*=\s*["'][^"']*["']/gi, // Inline style attributes (CSS injection prevention)
  /\bstyle\s*=\s*[^\s>]*/gi, // Inline style attributes without quotes
]

// ==================== Type Definitions ====================

interface ParsedProductRow {
  rowNumber: number
  valid: boolean
  errors?: string[]
  data: {
    title: string
    description: string
    vendor: string
    product_type: string
    tags: string
    price: number
    compare_at_price?: number
    sku?: string
    barcode?: string
    inventory_quantity: number
    weight?: number
    weight_unit?: string
  }
}

interface BulkImportResponse {
  success: boolean
  data?: {
    totalRows: number
    validRows: number
    invalidRows: number
    products: ParsedProductRow[]
    warnings: string[]
  }
  error?: {
    code: string
    message: string
    details?: unknown
  }
}

interface ImportHistoryRecord {
  id: string
  user_id: string
  store_id: string
  filename: string
  mode: 'create' | 'update' | 'upsert'
  total_rows: number
  valid_rows: number
  invalid_rows: number
  status: 'pending' | 'processing' | 'completed' | 'failed'
  created_at: string
  completed_at?: string
  error_message?: string
}

// Response type for single product creation
interface SingleProductResponse {
  success: boolean
  productId?: string
  error?: {
    code: string
    message: string
    details?: unknown
  }
}

// Input type for productData JSON submission
interface ProductDataInput {
  title: string
  description?: string
  vendor?: string
  product_type?: string
  tags?: string
  price: number
  compare_at_price?: number
  sku?: string
  barcode?: string
  inventory_quantity?: number
  weight?: number
  weight_unit?: string
}

// ==================== Security Sanitization Utilities ====================

/**
 * Sanitize a string to prevent CSV formula injection attacks.
 * Removes leading characters that could trigger formula execution in spreadsheet applications.
 * @param value - The string to sanitize
 * @returns Sanitized string with leading formula characters removed
 */
function sanitizeForCSVInjection(value: string): string {
  if (!value) return value
  // Characters that trigger formula execution: = + - @ TAB CR
  if (/^[=+\-@\t\r]/.test(value)) {
    return value.substring(1)
  }
  return value
}

/**
 * Sanitize HTML content to prevent XSS attacks.
 * Removes dangerous tags, event handlers, and malicious URLs.
 * @param html - The HTML string to sanitize
 * @returns Sanitized HTML string
 */
function sanitizeHTML(html: string): string {
  if (!html) return html

  let sanitized = html

  // Remove all dangerous patterns
  for (const pattern of DANGEROUS_HTML_PATTERNS) {
    sanitized = sanitized.replace(pattern, '')
  }

  // Remove any remaining non-whitelisted tags (but keep their content)
  // This regex matches opening and closing tags
  sanitized = sanitized.replace(/<\/?([a-zA-Z][a-zA-Z0-9]*)\b[^>]*>/gi, (match, tagName) => {
    const lowerTag = tagName.toLowerCase()
    // Keep whitelisted tags
    if (SAFE_HTML_TAGS.includes(lowerTag)) {
      // For anchor tags, sanitize the href attribute
      if (lowerTag === 'a') {
        // Remove javascript: and other dangerous protocols from href
        return match.replace(/href\s*=\s*["']?\s*(javascript|vbscript|data):[^"'>\s]*/gi, 'href="#"')
      }
      return match
    }
    // Remove non-whitelisted tags
    return ''
  })

  return sanitized.trim()
}

/**
 * Validate UUID format for store ID
 * @param id - The string to validate as UUID
 * @returns Boolean indicating if the string is a valid UUID
 */
function isValidUUID(id: string): boolean {
  return UUID_REGEX.test(id)
}

// ==================== CSV Parsing Utilities ====================

/**
 * Parse a CSV line handling quoted fields with commas inside them
 */
function parseCSVLine(line: string): string[] {
  const fields: string[] = []
  let currentField = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    const nextChar = line[i + 1]

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote inside quoted field
        currentField += '"'
        i++ // Skip the next quote
      } else {
        // Toggle quote state
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      // End of field
      fields.push(currentField.trim())
      currentField = ''
    } else {
      currentField += char
    }
  }

  // Don't forget the last field
  fields.push(currentField.trim())

  return fields
}

/**
 * Parse CSV content into rows
 */
function parseCSV(content: string): { headers: string[]; rows: string[][] } {
  // Normalize line endings
  const normalizedContent = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n')

  // Split into lines, filter out empty lines
  const lines = normalizedContent.split('\n').filter(line => line.trim() !== '')

  if (lines.length === 0) {
    return { headers: [], rows: [] }
  }

  // First line is headers
  const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase().trim())

  // Remaining lines are data rows
  const rows = lines.slice(1).map(line => parseCSVLine(line))

  return { headers, rows }
}

// ==================== Validation Utilities ====================

const EXPECTED_HEADERS = [
  'title',
  'description',
  'vendor',
  'product_type',
  'tags',
  'price',
  'compare_at_price',
  'sku',
  'barcode',
  'inventory_quantity',
  'weight',
  'weight_unit'
]

const REQUIRED_FIELDS = ['title', 'price']

const VALID_WEIGHT_UNITS = ['g', 'kg', 'oz', 'lb']

/**
 * Validate CSV headers against expected format
 */
function validateHeaders(headers: string[]): { valid: boolean; warnings: string[]; errors: string[] } {
  const warnings: string[] = []
  const errors: string[] = []

  // Check for required headers
  const missingRequired = REQUIRED_FIELDS.filter(field => !headers.includes(field))
  if (missingRequired.length > 0) {
    errors.push(`Missing required headers: ${missingRequired.join(', ')}`)
  }

  // Check for unknown headers
  const unknownHeaders = headers.filter(h => !EXPECTED_HEADERS.includes(h))
  if (unknownHeaders.length > 0) {
    warnings.push(`Unknown headers will be ignored: ${unknownHeaders.join(', ')}`)
  }

  // Check for missing optional headers
  const missingOptional = EXPECTED_HEADERS.filter(h => !headers.includes(h) && !REQUIRED_FIELDS.includes(h))
  if (missingOptional.length > 0) {
    warnings.push(`Optional headers not provided (defaults will be used): ${missingOptional.join(', ')}`)
  }

  return {
    valid: errors.length === 0,
    warnings,
    errors
  }
}

/**
 * Validate and parse a single product row
 */
function validateProductRow(
  row: string[],
  headers: string[],
  rowNumber: number
): ParsedProductRow {
  const errors: string[] = []
  const data: Record<string, unknown> = {}

  // Create a mapping from header to value
  const rowData: Record<string, string> = {}
  headers.forEach((header, index) => {
    rowData[header] = row[index] || ''
  })

  // Validate and parse title (required) - sanitize for CSV injection
  let title = rowData['title']?.trim() || ''
  title = sanitizeForCSVInjection(title)
  if (!title) {
    errors.push('Title is required')
  } else if (title.length > 255) {
    errors.push('Title must be 255 characters or less')
  }
  data.title = title

  // Validate and parse description (optional) - sanitize for XSS and CSV injection
  let description = rowData['description']?.trim() || ''
  description = sanitizeForCSVInjection(description)
  description = sanitizeHTML(description)
  data.description = description

  // Validate and parse vendor (optional) - sanitize for CSV injection
  let vendor = rowData['vendor']?.trim() || ''
  vendor = sanitizeForCSVInjection(vendor)
  data.vendor = vendor

  // Validate and parse product_type (optional)
  data.product_type = rowData['product_type']?.trim() || ''

  // Validate and parse tags (optional) - sanitize for CSV injection
  let tags = rowData['tags']?.trim() || ''
  tags = sanitizeForCSVInjection(tags)
  data.tags = tags

  // Validate and parse price (required)
  const priceStr = rowData['price']?.trim()
  if (!priceStr) {
    errors.push('Price is required')
    data.price = 0
  } else {
    const price = parseFloat(priceStr)
    if (isNaN(price)) {
      errors.push('Price must be a valid number')
      data.price = 0
    } else if (price < 0) {
      errors.push('Price cannot be negative')
      data.price = 0
    } else {
      data.price = Math.round(price * 100) / 100 // Round to 2 decimal places
    }
  }

  // Validate and parse compare_at_price (optional)
  const compareAtPriceStr = rowData['compare_at_price']?.trim()
  if (compareAtPriceStr) {
    const compareAtPrice = parseFloat(compareAtPriceStr)
    if (isNaN(compareAtPrice)) {
      errors.push('Compare at price must be a valid number')
    } else if (compareAtPrice < 0) {
      errors.push('Compare at price cannot be negative')
    } else if (compareAtPrice <= (data.price as number)) {
      errors.push('Compare at price should be greater than price')
    } else {
      data.compare_at_price = Math.round(compareAtPrice * 100) / 100
    }
  }

  // Validate and parse SKU (optional)
  const sku = rowData['sku']?.trim()
  if (sku) {
    if (sku.length > 255) {
      errors.push('SKU must be 255 characters or less')
    } else {
      data.sku = sku
    }
  }

  // Validate and parse barcode (optional)
  const barcode = rowData['barcode']?.trim()
  if (barcode) {
    // Basic barcode validation (common formats: UPC-12, EAN-13, EAN-8)
    if (!/^[\d\-]+$/.test(barcode)) {
      errors.push('Barcode must contain only digits and hyphens')
    } else {
      data.barcode = barcode.replace(/-/g, '')
    }
  }

  // Validate and parse inventory_quantity (optional, defaults to 0)
  const inventoryStr = rowData['inventory_quantity']?.trim()
  if (inventoryStr) {
    const inventory = parseInt(inventoryStr, 10)
    if (isNaN(inventory)) {
      errors.push('Inventory quantity must be a valid integer')
      data.inventory_quantity = 0
    } else if (inventory < 0) {
      errors.push('Inventory quantity cannot be negative')
      data.inventory_quantity = 0
    } else {
      data.inventory_quantity = inventory
    }
  } else {
    data.inventory_quantity = 0
  }

  // Validate and parse weight (optional)
  const weightStr = rowData['weight']?.trim()
  if (weightStr) {
    const weight = parseFloat(weightStr)
    if (isNaN(weight)) {
      errors.push('Weight must be a valid number')
    } else if (weight < 0) {
      errors.push('Weight cannot be negative')
    } else {
      data.weight = weight
    }
  }

  // Validate and parse weight_unit (optional)
  const weightUnit = rowData['weight_unit']?.trim().toLowerCase()
  if (weightUnit) {
    if (!VALID_WEIGHT_UNITS.includes(weightUnit)) {
      errors.push(`Weight unit must be one of: ${VALID_WEIGHT_UNITS.join(', ')}`)
    } else {
      data.weight_unit = weightUnit
    }
  } else if (data.weight !== undefined) {
    // Default weight unit if weight is provided
    data.weight_unit = 'kg'
  }

  return {
    rowNumber,
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined,
    data: data as ParsedProductRow['data']
  }
}

// ==================== Store Validation ====================

/**
 * Verify user owns the store
 */
async function verifyStoreOwnership(
  storeId: string,
  userId: string
): Promise<{ valid: boolean; error?: string; storeName?: string }> {
  try {
    const supabase = await createSupabaseServerClientWithCookies()

    const { data: store, error } = await supabase
      .from('shopify_stores')
      .select('id, store_name, shop_domain')
      .eq('id', storeId)
      .eq('user_id', userId)
      .single()

    if (error || !store) {
      return {
        valid: false,
        error: 'Store not found or you do not have access to this store'
      }
    }

    return {
      valid: true,
      storeName: store.store_name || store.shop_domain
    }
  } catch (error) {
    log.error('Error verifying store ownership:', error)
    return {
      valid: false,
      error: 'Failed to verify store ownership'
    }
  }
}

// ==================== Import History ====================

/**
 * Save import history record
 */
async function saveImportHistory(
  userId: string,
  storeId: string,
  filename: string,
  mode: 'create' | 'update' | 'upsert',
  totalRows: number,
  validRows: number,
  invalidRows: number,
  status: 'pending' | 'completed' | 'failed',
  errorMessage?: string
): Promise<void> {
  try {
    const supabase = await createSupabaseServerClientWithCookies()

    const { error } = await supabase
      .from('bulk_import_history')
      .insert({
        user_id: userId,
        store_id: storeId,
        filename,
        mode,
        total_rows: totalRows,
        valid_rows: validRows,
        invalid_rows: invalidRows,
        status,
        error_message: errorMessage,
        completed_at: status === 'completed' || status === 'failed' ? new Date().toISOString() : null
      })

    if (error) {
      // Log but don't fail the request if history saving fails
      // Table might not exist yet
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        log.debug('bulk_import_history table does not exist, skipping history save')
      } else {
        log.warn('Failed to save import history:', error)
      }
    }
  } catch (error) {
    log.warn('Error saving import history:', error)
  }
}

/**
 * Get import history for user
 */
async function getImportHistory(
  userId: string,
  limit: number = 20
): Promise<ImportHistoryRecord[]> {
  try {
    const supabase = await createSupabaseServerClientWithCookies()

    const { data, error } = await supabase
      .from('bulk_import_history')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      // Return empty array if table doesn't exist
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        log.debug('bulk_import_history table does not exist')
        return []
      }
      throw error
    }

    return data || []
  } catch (error) {
    log.error('Error fetching import history:', error)
    return []
  }
}

// ==================== Shopify Product Creation ====================

/**
 * Validate and sanitize a single product data input
 */
function validateProductDataInput(data: ProductDataInput): { valid: boolean; errors: string[]; sanitizedData: ProductDataInput } {
  const errors: string[] = []
  const sanitizedData: ProductDataInput = { ...data }

  // Sanitize and validate title
  let title = (data.title || '').trim()
  title = sanitizeForCSVInjection(title)
  if (!title) {
    errors.push('Title is required')
  } else if (title.length > 255) {
    errors.push('Title must be 255 characters or less')
  }
  sanitizedData.title = title

  // Sanitize description
  if (data.description) {
    let description = data.description.trim()
    description = sanitizeForCSVInjection(description)
    description = sanitizeHTML(description)
    sanitizedData.description = description
  }

  // Sanitize vendor
  if (data.vendor) {
    sanitizedData.vendor = sanitizeForCSVInjection(data.vendor.trim())
  }

  // Sanitize tags
  if (data.tags) {
    sanitizedData.tags = sanitizeForCSVInjection(data.tags.trim())
  }

  // Validate price
  if (data.price === undefined || data.price === null) {
    errors.push('Price is required')
  } else if (typeof data.price !== 'number' || isNaN(data.price)) {
    errors.push('Price must be a valid number')
  } else if (data.price < 0) {
    errors.push('Price cannot be negative')
  } else {
    sanitizedData.price = Math.round(data.price * 100) / 100
  }

  // Validate compare_at_price
  if (data.compare_at_price !== undefined && data.compare_at_price !== null) {
    if (typeof data.compare_at_price !== 'number' || isNaN(data.compare_at_price)) {
      errors.push('Compare at price must be a valid number')
    } else if (data.compare_at_price < 0) {
      errors.push('Compare at price cannot be negative')
    } else if (data.compare_at_price <= data.price) {
      errors.push('Compare at price should be greater than price')
    } else {
      sanitizedData.compare_at_price = Math.round(data.compare_at_price * 100) / 100
    }
  }

  // Validate SKU
  if (data.sku && data.sku.length > 255) {
    errors.push('SKU must be 255 characters or less')
  }

  // Validate barcode
  if (data.barcode && !/^[\d\-]+$/.test(data.barcode)) {
    errors.push('Barcode must contain only digits and hyphens')
  }

  // Validate inventory_quantity
  if (data.inventory_quantity !== undefined) {
    if (typeof data.inventory_quantity !== 'number' || !Number.isInteger(data.inventory_quantity)) {
      errors.push('Inventory quantity must be a valid integer')
    } else if (data.inventory_quantity < 0) {
      errors.push('Inventory quantity cannot be negative')
    }
  }

  // Validate weight unit
  if (data.weight_unit && !VALID_WEIGHT_UNITS.includes(data.weight_unit.toLowerCase())) {
    errors.push(`Weight unit must be one of: ${VALID_WEIGHT_UNITS.join(', ')}`)
  }

  return {
    valid: errors.length === 0,
    errors,
    sanitizedData
  }
}

/**
 * Find existing product by SKU
 */
async function findProductBySKU(
  shopifyAPI: Awaited<ReturnType<typeof createShopifyAPI>>,
  sku: string
): Promise<ShopifyProduct | null> {
  if (!shopifyAPI || !sku) return null

  try {
    // Search for products with matching SKU
    const products = await shopifyAPI.getProducts(250)

    for (const product of products) {
      if (product.variants) {
        for (const variant of product.variants) {
          if (variant.sku && variant.sku.toLowerCase() === sku.toLowerCase()) {
            return product
          }
        }
      }
    }

    return null
  } catch (error) {
    log.error('Error finding product by SKU:', error)
    return null
  }
}

/**
 * Update an existing product in Shopify
 */
async function updateShopifyProduct(
  userId: string,
  storeId: string,
  productId: string,
  productData: ProductDataInput
): Promise<{ success: boolean; productId?: string; error?: string }> {
  try {
    // Get store details to get shop domain
    const supabase = await createSupabaseServerClientWithCookies()
    const { data: store, error: storeError } = await supabase
      .from('shopify_stores')
      .select('shop_domain')
      .eq('id', storeId)
      .eq('user_id', userId)
      .single()

    if (storeError || !store) {
      return { success: false, error: 'Store not found' }
    }

    // Initialize Shopify API
    const shopifyAPI = await createShopifyAPI(userId, undefined, store.shop_domain)
    if (!shopifyAPI) {
      return { success: false, error: 'Failed to initialize Shopify API' }
    }

    // Get existing product to get variant IDs
    const existingProduct = await shopifyAPI.getProduct(productId)
    if (!existingProduct) {
      return { success: false, error: 'Product not found' }
    }

    // Build update object
    const updateData: Partial<ShopifyProduct> = {
      title: productData.title,
      body_html: productData.description || existingProduct.body_html,
      vendor: productData.vendor || existingProduct.vendor,
      product_type: productData.product_type || existingProduct.product_type,
      tags: productData.tags || existingProduct.tags
    }

    // Update the product
    const updatedProduct = await shopifyAPI.updateProduct(productId, updateData)

    // Update the first variant with price/inventory data
    if (existingProduct.variants && existingProduct.variants.length > 0) {
      const variantId = existingProduct.variants[0].id
      const variantUpdate: Record<string, unknown> = {}

      if (productData.price !== undefined) {
        variantUpdate.price = productData.price.toString()
      }
      if (productData.compare_at_price !== undefined) {
        variantUpdate.compare_at_price = productData.compare_at_price.toString()
      }
      if (productData.sku !== undefined) {
        variantUpdate.sku = productData.sku
      }
      if (productData.barcode !== undefined) {
        variantUpdate.barcode = productData.barcode.replace(/-/g, '')
      }
      if (productData.weight !== undefined) {
        variantUpdate.weight = productData.weight
      }
      if (productData.weight_unit !== undefined) {
        variantUpdate.weight_unit = productData.weight_unit
      }

      if (Object.keys(variantUpdate).length > 0) {
        await shopifyAPI.updateVariant(variantId.toString(), variantUpdate)
      }

      // Update inventory if provided
      if (productData.inventory_quantity !== undefined) {
        const variant = existingProduct.variants[0]
        if (variant.inventory_item_id) {
          try {
            // Get inventory levels for this item
            const inventoryLevels = await shopifyAPI.getInventoryLevels([variant.inventory_item_id.toString()])
            if (inventoryLevels.length > 0) {
              await shopifyAPI.updateInventoryLevel(
                variant.inventory_item_id.toString(),
                inventoryLevels[0].location_id,
                productData.inventory_quantity
              )
            }
          } catch (invError) {
            log.warn('Failed to update inventory:', invError)
            // Don't fail the whole operation for inventory update failure
          }
        }
      }
    }

    log.info('Product updated in Shopify', {
      productId: updatedProduct.id,
      title: updatedProduct.title
    })

    return {
      success: true,
      productId: updatedProduct.id.toString()
    }
  } catch (error) {
    log.error('Failed to update Shopify product:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update product'
    }
  }
}

/**
 * Create a product in Shopify
 */
async function createShopifyProduct(
  userId: string,
  storeId: string,
  productData: ProductDataInput
): Promise<{ success: boolean; productId?: string; error?: string }> {
  try {
    // Get store details to get shop domain
    const supabase = await createSupabaseServerClientWithCookies()
    const { data: store, error: storeError } = await supabase
      .from('shopify_stores')
      .select('shop_domain')
      .eq('id', storeId)
      .eq('user_id', userId)
      .single()

    if (storeError || !store) {
      return { success: false, error: 'Store not found' }
    }

    // Initialize Shopify API
    const shopifyAPI = await createShopifyAPI(userId, undefined, store.shop_domain)
    if (!shopifyAPI) {
      return { success: false, error: 'Failed to initialize Shopify API' }
    }

    // Build Shopify product object
    const shopifyProduct: Partial<ShopifyProduct> = {
      title: productData.title,
      body_html: productData.description || '',
      vendor: productData.vendor || '',
      product_type: productData.product_type || '',
      tags: productData.tags || '',
      status: 'draft', // Create as draft for safety
      variants: [
        {
          price: productData.price.toString(),
          compare_at_price: productData.compare_at_price?.toString(),
          sku: productData.sku || undefined,
          barcode: productData.barcode?.replace(/-/g, '') || undefined,
          inventory_quantity: productData.inventory_quantity ?? 0,
          weight: productData.weight ?? 0,
          weight_unit: productData.weight_unit || 'kg',
          inventory_management: 'shopify',
          inventory_policy: 'deny',
          requires_shipping: true,
          taxable: true
        } as any
      ]
    }

    // Create the product in Shopify
    const createdProduct = await shopifyAPI.createProduct(shopifyProduct as ShopifyProduct)

    log.info('Product created in Shopify', {
      productId: createdProduct.id,
      title: createdProduct.title
    })

    return {
      success: true,
      productId: createdProduct.id.toString()
    }
  } catch (error) {
    log.error('Failed to create Shopify product:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create product'
    }
  }
}

// ==================== API Handlers ====================

/**
 * POST /api/bulk-import
 *
 * Process bulk product import via CSV file OR create single product via JSON.
 *
 * Accepts multipart/form-data with either:
 *
 * Option 1 - CSV Bulk Import:
 * - file: CSV file (required for bulk)
 * - storeId: Store ID to import to (required)
 * - mode: 'create' | 'update' | 'upsert' (required for bulk)
 *
 * Option 2 - Single Product Creation:
 * - productData: JSON string with product data (required for single)
 * - storeId: Store ID to import to (required)
 *
 * When productData is provided, creates a single product and returns:
 * { success: true, productId: string }
 */
export async function POST(request: NextRequest): Promise<NextResponse<BulkImportResponse | SingleProductResponse>> {
  try {
    // Authenticate user
    const supabase = await createSupabaseServerClientWithCookies()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      log.warn('Unauthorized access attempt to bulk import endpoint')
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required'
          }
        },
        { status: 401 }
      )
    }

    log.debug('Bulk import request received', { userId: user.id })

    // Parse form data
    let formData: FormData
    try {
      formData = await request.formData()
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'Request must be multipart/form-data'
          }
        },
        { status: 400 }
      )
    }

    // Get storeId first (required for both modes)
    const storeId = formData.get('storeId')
    if (!storeId || typeof storeId !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'MISSING_STORE_ID',
            message: 'Store ID is required'
          }
        },
        { status: 400 }
      )
    }

    // Validate storeId is a valid UUID format
    if (!isValidUUID(storeId)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_STORE_ID',
            message: 'Invalid store ID format'
          }
        },
        { status: 400 }
      )
    }

    // Verify store ownership
    const storeVerification = await verifyStoreOwnership(storeId, user.id)
    if (!storeVerification.valid) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'STORE_ACCESS_DENIED',
            message: storeVerification.error || 'Store not found or access denied'
          }
        },
        { status: 403 }
      )
    }

    log.debug('Store ownership verified', { storeId, storeName: storeVerification.storeName })

    // Check if productData is provided (single product creation mode)
    const productDataStr = formData.get('productData')
    if (productDataStr && typeof productDataStr === 'string') {
      return handleSingleProductCreation(user.id, storeId, productDataStr)
    }

    // Otherwise, handle CSV bulk import
    return handleCSVBulkImport(user.id, storeId, formData)

  } catch (error) {
    log.error('Error processing bulk import:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to process bulk import'
        }
      },
      { status: 500 }
    )
  }
}

/**
 * Handle single product creation from JSON productData
 */
async function handleSingleProductCreation(
  userId: string,
  storeId: string,
  productDataStr: string
): Promise<NextResponse<SingleProductResponse>> {
  // Parse JSON product data
  let productData: ProductDataInput
  try {
    productData = JSON.parse(productDataStr)
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INVALID_PRODUCT_DATA',
          message: 'productData must be valid JSON'
        }
      },
      { status: 400 }
    )
  }

  // Validate the product data
  const validation = validateProductDataInput(productData)
  if (!validation.valid) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: validation.errors.join('; '),
          details: validation.errors
        }
      },
      { status: 400 }
    )
  }

  log.info('Creating single product', {
    userId,
    storeId,
    title: validation.sanitizedData.title
  })

  // Create the product in Shopify
  const result = await createShopifyProduct(userId, storeId, validation.sanitizedData)

  if (!result.success) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'SHOPIFY_ERROR',
          message: result.error || 'Failed to create product in Shopify'
        }
      },
      { status: 500 }
    )
  }

  return NextResponse.json({
    success: true,
    productId: result.productId
  })
}

/**
 * Handle CSV bulk import
 */
async function handleCSVBulkImport(
  userId: string,
  storeId: string,
  formData: FormData
): Promise<NextResponse<BulkImportResponse>> {
  // Get and validate file
  const file = formData.get('file')
  if (!file || !(file instanceof File)) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'MISSING_FILE',
          message: 'CSV file is required (or provide productData for single product creation)'
        }
      },
      { status: 400 }
    )
  }

  // Validate file type
  const filename = file.name.toLowerCase()
  if (!filename.endsWith('.csv')) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INVALID_FILE_TYPE',
          message: 'File must be a CSV file'
        }
      },
      { status: 400 }
    )
  }

  // Validate file size (max 5MB - matches frontend limit)
  const MAX_FILE_SIZE = 5 * 1024 * 1024
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'FILE_TOO_LARGE',
          message: 'File size must be less than 5MB'
        }
      },
      { status: 400 }
    )
  }

  // Get and validate mode
  const mode = formData.get('mode')
  if (!mode || !['create', 'update', 'upsert'].includes(mode as string)) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INVALID_MODE',
          message: 'Mode must be one of: create, update, upsert'
        }
      },
      { status: 400 }
    )
  }

  // Read and parse CSV content
  let csvContent: string
  try {
    csvContent = await file.text()
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'FILE_READ_ERROR',
          message: 'Failed to read CSV file'
        }
      },
      { status: 400 }
    )
  }

  // Check for empty file
  if (!csvContent.trim()) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'EMPTY_FILE',
          message: 'CSV file is empty'
        }
      },
      { status: 400 }
    )
  }

  // Parse CSV
  const { headers, rows } = parseCSV(csvContent)

  // Check for empty headers
  if (headers.length === 0) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'NO_HEADERS',
          message: 'CSV file must have a header row'
        }
      },
      { status: 400 }
    )
  }

  // Validate headers
  const headerValidation = validateHeaders(headers)
  if (!headerValidation.valid) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INVALID_HEADERS',
          message: headerValidation.errors.join('; '),
          details: { headers, errors: headerValidation.errors }
        }
      },
      { status: 400 }
    )
  }

  // Check for empty data
  if (rows.length === 0) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'NO_DATA_ROWS',
          message: 'CSV file must have at least one data row'
        }
      },
      { status: 400 }
    )
  }

  // Check for maximum rows limit (DoS prevention)
  if (rows.length > MAX_IMPORT_ROWS) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'TOO_MANY_ROWS',
          message: `CSV file contains ${rows.length} rows, which exceeds the maximum limit of ${MAX_IMPORT_ROWS}. Please split your file into smaller batches.`
        }
      },
      { status: 400 }
    )
  }

  // Validate each row
  const products: ParsedProductRow[] = rows.map((row, index) =>
    validateProductRow(row, headers, index + 2) // +2 because row 1 is headers, and we want 1-indexed
  )

  const validProducts = products.filter(p => p.valid)
  const invalidProducts = products.filter(p => !p.valid)

  // Collect all warnings
  const warnings: string[] = [...headerValidation.warnings]

  // Add warning if there are many invalid rows
  if (invalidProducts.length > 0) {
    const invalidPercentage = Math.round((invalidProducts.length / products.length) * 100)
    if (invalidPercentage > 50) {
      warnings.push(`Warning: ${invalidPercentage}% of rows have validation errors`)
    }
  }

  // Add warning for large imports
  if (products.length > 1000) {
    warnings.push('Large import detected. Consider splitting into smaller batches for better performance.')
  }

  log.info('CSV parsing completed', {
    userId,
    storeId,
    mode,
    totalRows: products.length,
    validRows: validProducts.length,
    invalidRows: invalidProducts.length
  })

  // Process products in Shopify based on mode
  let createdCount = 0
  let updatedCount = 0
  let skippedCount = 0
  let failedCount = 0
  const operationResults: Array<{
    rowNumber: number
    success: boolean
    operation: 'created' | 'updated' | 'skipped' | 'failed'
    productId?: string
    error?: string
  }> = []

  if (validProducts.length > 0) {
    log.info('Starting Shopify product processing', { count: validProducts.length, mode })

    // Get store details and initialize Shopify API once for efficiency
    const supabase = await createSupabaseServerClientWithCookies()
    const { data: store } = await supabase
      .from('shopify_stores')
      .select('shop_domain')
      .eq('id', storeId)
      .eq('user_id', userId)
      .single()

    let shopifyAPI: Awaited<ReturnType<typeof createShopifyAPI>> | null = null
    if (store) {
      shopifyAPI = await createShopifyAPI(userId, undefined, store.shop_domain)
    }

    for (const product of validProducts) {
      const productInput: ProductDataInput = {
        title: product.data.title,
        description: product.data.description,
        vendor: product.data.vendor,
        product_type: product.data.product_type,
        tags: product.data.tags,
        price: product.data.price,
        compare_at_price: product.data.compare_at_price,
        sku: product.data.sku,
        barcode: product.data.barcode,
        inventory_quantity: product.data.inventory_quantity,
        weight: product.data.weight,
        weight_unit: product.data.weight_unit
      }

      try {
        // For update and upsert modes, try to find existing product by SKU
        let existingProduct: ShopifyProduct | null = null
        if ((mode === 'update' || mode === 'upsert') && productInput.sku && shopifyAPI) {
          existingProduct = await findProductBySKU(shopifyAPI, productInput.sku)
        }

        if (mode === 'create') {
          // Create mode: always create new products
          const result = await createShopifyProduct(userId, storeId, productInput)
          operationResults.push({
            rowNumber: product.rowNumber,
            success: result.success,
            operation: result.success ? 'created' : 'failed',
            productId: result.productId,
            error: result.error
          })
          if (result.success) {
            createdCount++
          } else {
            failedCount++
          }
        } else if (mode === 'update') {
          // Update mode: only update existing products, skip if not found
          if (existingProduct) {
            const result = await updateShopifyProduct(userId, storeId, existingProduct.id.toString(), productInput)
            operationResults.push({
              rowNumber: product.rowNumber,
              success: result.success,
              operation: result.success ? 'updated' : 'failed',
              productId: result.productId,
              error: result.error
            })
            if (result.success) {
              updatedCount++
            } else {
              failedCount++
            }
          } else {
            // Product not found - skip in update mode
            operationResults.push({
              rowNumber: product.rowNumber,
              success: false,
              operation: 'skipped',
              error: productInput.sku
                ? `Product with SKU "${productInput.sku}" not found`
                : 'SKU required for update mode'
            })
            skippedCount++
          }
        } else if (mode === 'upsert') {
          // Upsert mode: update if exists, create if not
          if (existingProduct) {
            const result = await updateShopifyProduct(userId, storeId, existingProduct.id.toString(), productInput)
            operationResults.push({
              rowNumber: product.rowNumber,
              success: result.success,
              operation: result.success ? 'updated' : 'failed',
              productId: result.productId,
              error: result.error
            })
            if (result.success) {
              updatedCount++
            } else {
              failedCount++
            }
          } else {
            const result = await createShopifyProduct(userId, storeId, productInput)
            operationResults.push({
              rowNumber: product.rowNumber,
              success: result.success,
              operation: result.success ? 'created' : 'failed',
              productId: result.productId,
              error: result.error
            })
            if (result.success) {
              createdCount++
            } else {
              failedCount++
            }
          }
        }

        // Small delay to avoid rate limiting
        if (validProducts.length > 10) {
          await new Promise(resolve => setTimeout(resolve, 100))
        }
      } catch (error) {
        operationResults.push({
          rowNumber: product.rowNumber,
          success: false,
          operation: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        })
        failedCount++
      }
    }

    log.info('Shopify product processing completed', {
      mode,
      createdCount,
      updatedCount,
      skippedCount,
      failedCount
    })
  }

  // Determine overall status
  const successCount = createdCount + updatedCount
  const overallStatus = successCount > 0
    ? 'completed'
    : (validProducts.length > 0 && failedCount === validProducts.length ? 'failed' : 'completed')

  // Save import history
  await saveImportHistory(
    userId,
    storeId,
    file.name,
    mode as 'create' | 'update' | 'upsert',
    products.length,
    validProducts.length,
    invalidProducts.length,
    overallStatus,
    invalidProducts.length === products.length ? 'All rows have validation errors' : undefined
  )

  // Add operation summary to warnings
  if (failedCount > 0) {
    warnings.push(`${failedCount} product(s) failed to process`)
  }
  if (skippedCount > 0) {
    warnings.push(`${skippedCount} product(s) skipped (not found for update)`)
  }
  if (createdCount > 0) {
    warnings.push(`Successfully created ${createdCount} product(s) in Shopify`)
  }
  if (updatedCount > 0) {
    warnings.push(`Successfully updated ${updatedCount} product(s) in Shopify`)
  }

  return NextResponse.json({
    success: true,
    data: {
      totalRows: products.length,
      validRows: validProducts.length,
      invalidRows: invalidProducts.length,
      products,
      warnings,
      operationSummary: {
        created: createdCount,
        updated: updatedCount,
        skipped: skippedCount,
        failed: failedCount
      },
      ...(operationResults.length > 0 && { operationResults })
    }
  })
}

/**
 * GET /api/bulk-import
 *
 * Get import history for the authenticated user.
 *
 * Query params:
 * - limit: number (optional, default: 20, max: 100)
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Authenticate user
    const supabase = await createSupabaseServerClientWithCookies()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      log.warn('Unauthorized access attempt to bulk import history endpoint')
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required'
          }
        },
        { status: 401 }
      )
    }

    // Get limit from query params
    const { searchParams } = new URL(request.url)
    const limitStr = searchParams.get('limit') || '20'
    const parsedLimit = parseInt(limitStr, 10)
    const limit = isNaN(parsedLimit) ? 20 : Math.min(Math.max(parsedLimit, 1), 100)

    log.debug('Fetching import history', { userId: user.id, limit })

    const history = await getImportHistory(user.id, limit)

    return NextResponse.json({
      success: true,
      data: history,
      meta: {
        count: history.length,
        limit
      }
    })

  } catch (error) {
    log.error('Error fetching import history:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to fetch import history'
        }
      },
      { status: 500 }
    )
  }
}
