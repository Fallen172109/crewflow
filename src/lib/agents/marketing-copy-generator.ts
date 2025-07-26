// AI-Powered Marketing Copy Generation for Flint Agent
// Handles platform-specific marketing content creation

interface MarketingCopyParams {
  product: {
    title: string
    body_html?: string
    product_type?: string
    vendor?: string
    tags?: string
  }
  platform: string
  contentType: string
  tone: string
  includeHashtags: boolean
  includeCallToAction: boolean
  maxLength: number
  targetAudience: string
  promotionType?: string
  discountCode?: string
  urgency: boolean
}

interface GeneratedCopy {
  content: string
  hashtags?: string[]
  keywords?: string[]
  callToAction?: string
  characterCount: number
  wordCount: number
  platformOptimized: boolean
}

// Platform-specific character limits
const PLATFORM_LIMITS = {
  instagram: {
    post: 2200,
    story: 160,
    reel: 2200
  },
  facebook: {
    post: 63206,
    ad: 125,
    story: 160
  },
  twitter: {
    post: 280,
    thread: 280
  },
  linkedin: {
    post: 3000,
    article: 125000
  },
  tiktok: {
    post: 2200,
    bio: 80
  },
  google_ads: {
    headline: 30,
    description: 90
  },
  email: {
    subject: 50,
    preview: 90,
    body: 20000
  },
  shopify: {
    title: 70,
    description: 320,
    meta_description: 160
  }
}

// Generate marketing copy using AI
export async function generateMarketingCopy(params: MarketingCopyParams): Promise<GeneratedCopy> {
  const {
    product,
    platform,
    contentType,
    tone,
    includeHashtags,
    includeCallToAction,
    maxLength,
    targetAudience,
    promotionType,
    discountCode,
    urgency
  } = params

  // Create platform-specific prompt
  const prompt = createMarketingPrompt(params)
  
  // In a real implementation, this would call OpenAI API
  // For now, we'll create a mock response based on the input
  const generatedContent = await generateContentMock(params)
  
  return {
    content: generatedContent.content,
    hashtags: generatedContent.hashtags,
    keywords: generatedContent.keywords,
    callToAction: generatedContent.callToAction,
    characterCount: generatedContent.content.length,
    wordCount: generatedContent.content.split(/\s+/).length,
    platformOptimized: true
  }
}

// Get platform-specific character limits
export function getPlatformMaxLength(platform: string, contentType: string): number {
  const platformLimits = PLATFORM_LIMITS[platform as keyof typeof PLATFORM_LIMITS]
  if (!platformLimits) return 280 // Default to Twitter length
  
  const typeLimit = platformLimits[contentType as keyof typeof platformLimits]
  return typeLimit || Object.values(platformLimits)[0] // Return first available limit
}

// Create marketing prompt for AI
function createMarketingPrompt(params: MarketingCopyParams): string {
  const {
    product,
    platform,
    contentType,
    tone,
    includeHashtags,
    includeCallToAction,
    maxLength,
    targetAudience,
    promotionType,
    discountCode,
    urgency
  } = params

  return `
Create ${platform} ${contentType} copy for the following product:

PRODUCT DETAILS:
- Title: ${product.title}
- Description: ${product.body_html?.replace(/<[^>]*>/g, '') || 'No description available'}
- Type: ${product.product_type || 'Not specified'}
- Brand: ${product.vendor || 'Not specified'}

COPY REQUIREMENTS:
- Platform: ${platform}
- Content Type: ${contentType}
- Tone: ${tone}
- Target Audience: ${targetAudience}
- Max Length: ${maxLength} characters
- Include Hashtags: ${includeHashtags}
- Include Call-to-Action: ${includeCallToAction}
- Promotion Type: ${promotionType || 'None'}
- Discount Code: ${discountCode || 'None'}
- Create Urgency: ${urgency}

PLATFORM-SPECIFIC GUIDELINES:
${getPlatformGuidelines(platform, contentType)}

Create engaging, ${tone} copy that:
1. Highlights key product benefits
2. Resonates with ${targetAudience}
3. Follows ${platform} best practices
4. Stays within ${maxLength} character limit
5. ${includeHashtags ? 'Includes relevant hashtags' : 'No hashtags needed'}
6. ${includeCallToAction ? 'Includes strong call-to-action' : 'No call-to-action needed'}
7. ${urgency ? 'Creates sense of urgency' : 'Maintains steady pace'}
`
}

// Get platform-specific guidelines
function getPlatformGuidelines(platform: string, contentType: string): string {
  const guidelines = {
    instagram: {
      post: 'Use engaging visuals, relevant hashtags (5-10), and storytelling approach. Include emojis for personality.',
      story: 'Keep it short, visual, and interactive. Use stickers and polls when possible.',
      reel: 'Focus on trending topics, use popular music, and create shareable moments.'
    },
    facebook: {
      post: 'Encourage engagement with questions, use native video when possible, and create community feel.',
      ad: 'Clear value proposition, strong visuals, and direct call-to-action.',
      story: 'Authentic, behind-the-scenes content that builds connection.'
    },
    twitter: {
      post: 'Concise, witty, and conversation-starting. Use relevant hashtags (1-2) and mentions.',
      thread: 'Break complex ideas into digestible tweets with clear narrative flow.'
    },
    linkedin: {
      post: 'Professional tone, industry insights, and thought leadership approach.',
      article: 'In-depth analysis, professional insights, and actionable takeaways.'
    },
    tiktok: {
      post: 'Trendy, authentic, and entertaining. Use popular sounds and hashtags.',
      bio: 'Catchy, memorable, and includes key information about brand.'
    },
    google_ads: {
      headline: 'Clear benefit, includes keywords, and compelling offer.',
      description: 'Specific details, unique selling points, and strong CTA.'
    },
    email: {
      subject: 'Compelling, personalized, and creates curiosity without being spammy.',
      preview: 'Complements subject line and provides additional context.',
      body: 'Scannable format, clear value proposition, and single focused CTA.'
    },
    shopify: {
      title: 'SEO-optimized, includes key benefits, and clear product identification.',
      description: 'Detailed features, benefits, and purchasing information.',
      meta_description: 'SEO-focused summary that encourages clicks from search results.'
    }
  }

  const platformGuides = guidelines[platform as keyof typeof guidelines]
  if (!platformGuides) return 'Follow general best practices for engaging content.'
  
  const typeGuide = platformGuides[contentType as keyof typeof platformGuides]
  return typeGuide || Object.values(platformGuides)[0]
}

// Mock content generation (replace with actual AI API call)
async function generateContentMock(params: MarketingCopyParams): Promise<{
  content: string
  hashtags?: string[]
  keywords?: string[]
  callToAction?: string
}> {
  const {
    product,
    platform,
    contentType,
    tone,
    includeHashtags,
    includeCallToAction,
    maxLength,
    promotionType,
    discountCode,
    urgency
  } = params

  let content = ''
  let hashtags: string[] = []
  let keywords: string[] = []
  let callToAction = ''

  // Generate base content
  if (tone === 'urgent' || urgency) {
    content = `🚨 LIMITED TIME! Don't miss out on ${product.title}! `
  } else if (tone === 'playful') {
    content = `✨ Say hello to your new favorite: ${product.title}! `
  } else if (tone === 'professional') {
    content = `Discover the exceptional quality of ${product.title}. `
  } else {
    content = `Check out ${product.title} - `
  }

  // Add product benefits
  if (product.body_html) {
    const description = product.body_html.replace(/<[^>]*>/g, '').substring(0, 100)
    content += `${description}... `
  } else {
    content += `the perfect addition to your collection. `
  }

  // Add promotion if available
  if (promotionType && discountCode) {
    content += `Use code ${discountCode} for exclusive savings! `
  }

  // Add call-to-action
  if (includeCallToAction) {
    const ctas = {
      instagram: 'Shop now (link in bio) 🛍️',
      facebook: 'Shop Now →',
      twitter: 'Get yours today!',
      linkedin: 'Learn more about this solution.',
      tiktok: 'Link in bio! 💫',
      email: 'Shop Now',
      shopify: 'Add to Cart'
    }
    callToAction = ctas[platform as keyof typeof ctas] || 'Shop Now!'
    content += callToAction
  }

  // Add hashtags
  if (includeHashtags && platform !== 'email') {
    hashtags = generateHashtags(product, platform)
    if (platform === 'instagram' || platform === 'tiktok') {
      content += '\n\n' + hashtags.map(tag => `#${tag}`).join(' ')
    }
  }

  // Extract keywords
  keywords = extractKeywords(product)

  // Truncate if too long
  if (content.length > maxLength) {
    content = content.substring(0, maxLength - 3) + '...'
  }

  return {
    content,
    hashtags,
    keywords,
    callToAction
  }
}

// Generate relevant hashtags
function generateHashtags(product: any, platform: string): string[] {
  const hashtags = new Set<string>()
  
  // Add product-based hashtags
  if (product.title) {
    const titleWords = product.title.toLowerCase().split(/\s+/)
    titleWords.forEach(word => {
      if (word.length > 3) {
        hashtags.add(word.replace(/[^a-z0-9]/g, ''))
      }
    })
  }

  // Add category hashtags
  if (product.product_type) {
    hashtags.add(product.product_type.toLowerCase().replace(/\s+/g, ''))
  }

  // Add brand hashtags
  if (product.vendor) {
    hashtags.add(product.vendor.toLowerCase().replace(/\s+/g, ''))
  }

  // Add platform-specific hashtags
  const platformHashtags = {
    instagram: ['instagood', 'photooftheday', 'shopping', 'style'],
    tiktok: ['fyp', 'viral', 'trending', 'musthave'],
    twitter: ['deals', 'shopping', 'newproduct'],
    linkedin: ['business', 'professional', 'quality']
  }

  const platformTags = platformHashtags[platform as keyof typeof platformHashtags] || []
  platformTags.forEach(tag => hashtags.add(tag))

  return Array.from(hashtags).slice(0, 10)
}

// Extract keywords from product
function extractKeywords(product: any): string[] {
  const keywords = new Set<string>()
  
  if (product.title) {
    const titleWords = product.title.toLowerCase().split(/\s+/)
    titleWords.forEach(word => {
      if (word.length > 3 && !['the', 'and', 'for', 'with'].includes(word)) {
        keywords.add(word)
      }
    })
  }

  if (product.product_type) {
    keywords.add(product.product_type.toLowerCase())
  }

  if (product.vendor) {
    keywords.add(product.vendor.toLowerCase())
  }

  return Array.from(keywords).slice(0, 5)
}
