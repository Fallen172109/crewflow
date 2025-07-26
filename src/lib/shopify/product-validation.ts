// Product validation utilities for Shopify integration

export interface ProductData {
  id?: string
  title: string
  description: string
  price?: number
  category?: string
  tags?: string[]
  variants?: ProductVariant[]
  images?: string[]
  status?: 'draft' | 'active' | 'archived'
}

export interface ProductVariant {
  id?: string
  title: string
  price: number
  inventory_quantity?: number
  sku?: string
  weight?: number
  requires_shipping?: boolean
}

export interface ValidationError {
  field: string
  message: string
  code: string
}

export interface ValidationResult {
  isValid: boolean
  errors: ValidationError[]
  warnings: string[]
}

// Shopify-specific validation rules
const SHOPIFY_LIMITS = {
  title: {
    maxLength: 255,
    minLength: 1
  },
  description: {
    maxLength: 65535,
    minLength: 1
  },
  tags: {
    maxCount: 250,
    maxLength: 255
  },
  variants: {
    maxCount: 100
  },
  images: {
    maxCount: 250,
    maxFileSize: 20 * 1024 * 1024, // 20MB
    allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
  },
  price: {
    min: 0.01,
    max: 999999.99
  },
  sku: {
    maxLength: 255
  }
}

export function validateProduct(product: ProductData): ValidationResult {
  const errors: ValidationError[] = []
  const warnings: string[] = []

  // Validate title
  if (!product.title || !product.title.trim()) {
    errors.push({
      field: 'title',
      message: 'Product title is required',
      code: 'TITLE_REQUIRED'
    })
  } else if (product.title.length > SHOPIFY_LIMITS.title.maxLength) {
    errors.push({
      field: 'title',
      message: `Title must be ${SHOPIFY_LIMITS.title.maxLength} characters or less`,
      code: 'TITLE_TOO_LONG'
    })
  } else if (product.title.length < 10) {
    warnings.push('Consider making the title more descriptive (at least 10 characters)')
  }

  // Validate description
  if (!product.description || !product.description.trim()) {
    errors.push({
      field: 'description',
      message: 'Product description is required',
      code: 'DESCRIPTION_REQUIRED'
    })
  } else if (product.description.length > SHOPIFY_LIMITS.description.maxLength) {
    errors.push({
      field: 'description',
      message: `Description must be ${SHOPIFY_LIMITS.description.maxLength} characters or less`,
      code: 'DESCRIPTION_TOO_LONG'
    })
  } else if (product.description.length < 50) {
    warnings.push('Consider adding more detail to the description (at least 50 characters)')
  }

  // Validate pricing
  if (product.price !== undefined) {
    if (product.price < SHOPIFY_LIMITS.price.min) {
      errors.push({
        field: 'price',
        message: `Price must be at least $${SHOPIFY_LIMITS.price.min}`,
        code: 'PRICE_TOO_LOW'
      })
    } else if (product.price > SHOPIFY_LIMITS.price.max) {
      errors.push({
        field: 'price',
        message: `Price must be less than $${SHOPIFY_LIMITS.price.max}`,
        code: 'PRICE_TOO_HIGH'
      })
    }
  }

  // Validate variants
  if (product.variants && product.variants.length > 0) {
    if (product.variants.length > SHOPIFY_LIMITS.variants.maxCount) {
      errors.push({
        field: 'variants',
        message: `Cannot have more than ${SHOPIFY_LIMITS.variants.maxCount} variants`,
        code: 'TOO_MANY_VARIANTS'
      })
    }

    product.variants.forEach((variant, index) => {
      const variantErrors = validateVariant(variant, index)
      errors.push(...variantErrors)
    })

    // Check for duplicate variant titles
    const variantTitles = product.variants.map(v => v.title.toLowerCase())
    const duplicates = variantTitles.filter((title, index) => variantTitles.indexOf(title) !== index)
    if (duplicates.length > 0) {
      errors.push({
        field: 'variants',
        message: 'Variant titles must be unique',
        code: 'DUPLICATE_VARIANT_TITLES'
      })
    }
  } else if (!product.price) {
    errors.push({
      field: 'price',
      message: 'Either set a base price or add variants with pricing',
      code: 'NO_PRICING'
    })
  }

  // Validate tags
  if (product.tags && product.tags.length > 0) {
    if (product.tags.length > SHOPIFY_LIMITS.tags.maxCount) {
      errors.push({
        field: 'tags',
        message: `Cannot have more than ${SHOPIFY_LIMITS.tags.maxCount} tags`,
        code: 'TOO_MANY_TAGS'
      })
    }

    product.tags.forEach((tag, index) => {
      if (tag.length > SHOPIFY_LIMITS.tags.maxLength) {
        errors.push({
          field: `tags[${index}]`,
          message: `Tag "${tag}" is too long (max ${SHOPIFY_LIMITS.tags.maxLength} characters)`,
          code: 'TAG_TOO_LONG'
        })
      }
    })

    // Check for duplicate tags
    const uniqueTags = [...new Set(product.tags.map(tag => tag.toLowerCase()))]
    if (uniqueTags.length !== product.tags.length) {
      warnings.push('Duplicate tags detected and will be removed')
    }
  }

  // Validate images
  if (product.images && product.images.length > 0) {
    if (product.images.length > SHOPIFY_LIMITS.images.maxCount) {
      errors.push({
        field: 'images',
        message: `Cannot have more than ${SHOPIFY_LIMITS.images.maxCount} images`,
        code: 'TOO_MANY_IMAGES'
      })
    }
  } else {
    warnings.push('Consider adding product images to improve conversion rates')
  }

  // SEO and marketing warnings
  if (!product.category) {
    warnings.push('Adding a product category helps with organization and SEO')
  }

  if (!product.tags || product.tags.length === 0) {
    warnings.push('Adding tags helps customers find your products')
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}

function validateVariant(variant: ProductVariant, index: number): ValidationError[] {
  const errors: ValidationError[] = []

  // Validate variant title
  if (!variant.title || !variant.title.trim()) {
    errors.push({
      field: `variants[${index}].title`,
      message: 'Variant title is required',
      code: 'VARIANT_TITLE_REQUIRED'
    })
  }

  // Validate variant price
  if (variant.price < SHOPIFY_LIMITS.price.min) {
    errors.push({
      field: `variants[${index}].price`,
      message: `Variant price must be at least $${SHOPIFY_LIMITS.price.min}`,
      code: 'VARIANT_PRICE_TOO_LOW'
    })
  } else if (variant.price > SHOPIFY_LIMITS.price.max) {
    errors.push({
      field: `variants[${index}].price`,
      message: `Variant price must be less than $${SHOPIFY_LIMITS.price.max}`,
      code: 'VARIANT_PRICE_TOO_HIGH'
    })
  }

  // Validate SKU
  if (variant.sku && variant.sku.length > SHOPIFY_LIMITS.sku.maxLength) {
    errors.push({
      field: `variants[${index}].sku`,
      message: `SKU must be ${SHOPIFY_LIMITS.sku.maxLength} characters or less`,
      code: 'SKU_TOO_LONG'
    })
  }

  // Validate inventory
  if (variant.inventory_quantity !== undefined && variant.inventory_quantity < 0) {
    errors.push({
      field: `variants[${index}].inventory_quantity`,
      message: 'Inventory quantity cannot be negative',
      code: 'NEGATIVE_INVENTORY'
    })
  }

  return errors
}

export function sanitizeProduct(product: ProductData): ProductData {
  const sanitized: ProductData = {
    ...product,
    title: product.title?.trim() || '',
    description: product.description?.trim() || '',
    category: product.category?.trim() || undefined
  }

  // Remove duplicate tags and trim
  if (sanitized.tags) {
    const uniqueTags = [...new Set(sanitized.tags.map(tag => tag.trim().toLowerCase()))]
      .filter(tag => tag.length > 0)
    sanitized.tags = uniqueTags
  }

  // Sanitize variants
  if (sanitized.variants) {
    sanitized.variants = sanitized.variants.map(variant => ({
      ...variant,
      title: variant.title?.trim() || '',
      sku: variant.sku?.trim() || undefined
    }))
  }

  return sanitized
}

export function validateImageFile(file: File): ValidationResult {
  const errors: ValidationError[] = []
  const warnings: string[] = []

  // Check file type
  if (!SHOPIFY_LIMITS.images.allowedTypes.includes(file.type)) {
    errors.push({
      field: 'image',
      message: 'Invalid image format. Supported formats: JPEG, PNG, GIF, WebP',
      code: 'INVALID_IMAGE_FORMAT'
    })
  }

  // Check file size
  if (file.size > SHOPIFY_LIMITS.images.maxFileSize) {
    errors.push({
      field: 'image',
      message: `Image file size must be less than ${SHOPIFY_LIMITS.images.maxFileSize / (1024 * 1024)}MB`,
      code: 'IMAGE_TOO_LARGE'
    })
  }

  // Recommendations
  if (file.size > 1024 * 1024) { // 1MB
    warnings.push('Consider compressing the image for faster loading')
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}

export function generateProductSuggestions(product: ProductData): string[] {
  const suggestions: string[] = []

  // Title suggestions
  if (product.title.length < 30) {
    suggestions.push('Consider making the title more descriptive and keyword-rich')
  }

  // Description suggestions
  if (product.description.length < 100) {
    suggestions.push('Add more details about features, benefits, and use cases')
  }

  // Pricing suggestions
  if (product.price && product.price % 1 !== 0) {
    const roundedPrice = Math.round(product.price)
    if (Math.abs(product.price - roundedPrice) < 0.05) {
      suggestions.push(`Consider pricing at $${roundedPrice} for psychological appeal`)
    }
  }

  // SEO suggestions
  if (!product.tags || product.tags.length < 3) {
    suggestions.push('Add more tags to improve discoverability')
  }

  // Variant suggestions
  if (!product.variants || product.variants.length === 0) {
    suggestions.push('Consider adding variants for different sizes, colors, or options')
  }

  return suggestions
}

export const VALIDATION_MESSAGES = {
  TITLE_REQUIRED: 'Product title is required',
  TITLE_TOO_LONG: 'Title is too long',
  DESCRIPTION_REQUIRED: 'Product description is required',
  DESCRIPTION_TOO_LONG: 'Description is too long',
  PRICE_TOO_LOW: 'Price is too low',
  PRICE_TOO_HIGH: 'Price is too high',
  NO_PRICING: 'Product needs pricing information',
  TOO_MANY_VARIANTS: 'Too many variants',
  TOO_MANY_TAGS: 'Too many tags',
  TOO_MANY_IMAGES: 'Too many images',
  DUPLICATE_VARIANT_TITLES: 'Variant titles must be unique',
  VARIANT_TITLE_REQUIRED: 'Variant title is required',
  VARIANT_PRICE_TOO_LOW: 'Variant price is too low',
  VARIANT_PRICE_TOO_HIGH: 'Variant price is too high',
  SKU_TOO_LONG: 'SKU is too long',
  TAG_TOO_LONG: 'Tag is too long',
  NEGATIVE_INVENTORY: 'Inventory cannot be negative',
  INVALID_IMAGE_FORMAT: 'Invalid image format',
  IMAGE_TOO_LARGE: 'Image file is too large'
}
