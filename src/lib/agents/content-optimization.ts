// AI-Powered Content Optimization for Flint Agent
// Handles product description, title, and SEO optimization

interface OptimizationParams {
  currentTitle: string
  currentDescription: string
  targetKeywords: string[]
  tone: 'professional' | 'casual' | 'playful' | 'urgent' | 'friendly' | 'authoritative'
  platform: string
  maxTitleLength: number
  maxDescriptionLength: number
  includeFeatures: boolean
  includeBenefits: boolean
  includeCallToAction: boolean
  productType?: string
  vendor?: string
  tags?: string
}

interface OptimizedContent {
  title: string
  description: string
  handle: string
  tags: string[]
  keywords_used: string[]
  seo_score: number
  meta_description: string
}

interface ContentVariation {
  title: string
  description: string
  focus: string
  tone: string
}

interface SEOAnalysis {
  overall_score: number
  title_score: number
  description_score: number
  keyword_density: { [key: string]: number }
  recommendations: string[]
  missing_elements: string[]
}

// Generate optimized product content using AI
export async function generateOptimizedContent(params: OptimizationParams): Promise<OptimizedContent> {
  const {
    currentTitle,
    currentDescription,
    targetKeywords,
    tone,
    platform,
    maxTitleLength,
    maxDescriptionLength,
    includeFeatures,
    includeBenefits,
    includeCallToAction,
    productType,
    vendor,
    tags
  } = params

  // Create optimization prompt
  const prompt = `
You are an expert e-commerce copywriter and SEO specialist. Optimize the following product content:

CURRENT CONTENT:
Title: ${currentTitle}
Description: ${currentDescription}
Product Type: ${productType || 'Not specified'}
Vendor: ${vendor || 'Not specified'}
Current Tags: ${tags || 'None'}

OPTIMIZATION REQUIREMENTS:
- Target Keywords: ${targetKeywords.join(', ')}
- Tone: ${tone}
- Platform: ${platform}
- Max Title Length: ${maxTitleLength} characters
- Max Description Length: ${maxDescriptionLength} characters
- Include Features: ${includeFeatures}
- Include Benefits: ${includeBenefits}
- Include Call-to-Action: ${includeCallToAction}

INSTRUCTIONS:
1. Create an SEO-optimized title that includes primary keywords naturally
2. Write a compelling product description that:
   - Uses target keywords naturally (avoid keyword stuffing)
   - Highlights key features and benefits
   - Matches the specified tone
   - Includes a strong call-to-action if requested
   - Is scannable with bullet points or short paragraphs
3. Generate relevant tags for better discoverability
4. Create a URL-friendly handle
5. Write a meta description for search engines

Return the response in this exact JSON format:
{
  "title": "optimized title here",
  "description": "optimized description with HTML formatting",
  "handle": "url-friendly-handle",
  "tags": ["tag1", "tag2", "tag3"],
  "keywords_used": ["keyword1", "keyword2"],
  "seo_score": 85,
  "meta_description": "meta description for search engines"
}
`

  try {
    // In a real implementation, this would call OpenAI API
    // For now, we'll create a mock response based on the input
    const optimizedTitle = optimizeTitle(currentTitle, targetKeywords, maxTitleLength)
    const optimizedDescription = optimizeDescription(currentDescription, targetKeywords, tone, maxDescriptionLength, includeFeatures, includeBenefits, includeCallToAction)
    const handle = generateHandle(optimizedTitle)
    const optimizedTags = generateTags(currentTitle, currentDescription, targetKeywords, productType)
    const keywordsUsed = findUsedKeywords(optimizedTitle + ' ' + optimizedDescription, targetKeywords)
    const seoScore = calculateSEOScore(optimizedTitle, optimizedDescription, targetKeywords)
    const metaDescription = generateMetaDescription(optimizedDescription, targetKeywords)

    return {
      title: optimizedTitle,
      description: optimizedDescription,
      handle,
      tags: optimizedTags,
      keywords_used: keywordsUsed,
      seo_score: seoScore,
      meta_description: metaDescription
    }
  } catch (error) {
    console.error('Content optimization error:', error)
    throw new Error('Failed to optimize content')
  }
}

// Generate content variations
export async function generateContentVariations(params: {
  title: string
  description: string
  targetKeywords: string[]
  tone: string
  variationCount: number
}): Promise<ContentVariation[]> {
  const variations: ContentVariation[] = []
  const tones = ['professional', 'casual', 'playful', 'urgent', 'friendly']
  const focuses = ['features', 'benefits', 'emotional', 'technical', 'lifestyle']

  for (let i = 0; i < params.variationCount; i++) {
    const variationTone = tones[i % tones.length]
    const focus = focuses[i % focuses.length]
    
    variations.push({
      title: optimizeTitle(params.title, params.targetKeywords, 70, variationTone),
      description: optimizeDescription(params.description, params.targetKeywords, variationTone, 320, true, true, true, focus),
      focus,
      tone: variationTone
    })
  }

  return variations
}

// Analyze SEO content
export async function analyzeSEOContent(params: {
  title: string
  description: string
  targetKeywords: string[]
}): Promise<SEOAnalysis> {
  const { title, description, targetKeywords } = params
  
  const titleScore = analyzeTitleSEO(title, targetKeywords)
  const descriptionScore = analyzeDescriptionSEO(description, targetKeywords)
  const keywordDensity = calculateKeywordDensity(title + ' ' + description, targetKeywords)
  
  const recommendations = []
  const missingElements = []
  
  if (titleScore < 70) {
    recommendations.push('Include primary keyword in title')
    recommendations.push('Keep title under 60 characters')
  }
  
  if (descriptionScore < 70) {
    recommendations.push('Include target keywords naturally in description')
    recommendations.push('Add more descriptive content')
  }
  
  if (!title.includes(targetKeywords[0])) {
    missingElements.push('Primary keyword in title')
  }
  
  if (!description.toLowerCase().includes('buy') && !description.toLowerCase().includes('shop') && !description.toLowerCase().includes('order')) {
    missingElements.push('Call-to-action')
  }

  return {
    overall_score: Math.round((titleScore + descriptionScore) / 2),
    title_score: titleScore,
    description_score: descriptionScore,
    keyword_density: keywordDensity,
    recommendations,
    missing_elements: missingElements
  }
}

// Helper functions
function optimizeTitle(title: string, keywords: string[], maxLength: number, tone: string = 'professional'): string {
  const primaryKeyword = keywords[0] || ''
  let optimized = title
  
  // Add primary keyword if not present
  if (primaryKeyword && !title.toLowerCase().includes(primaryKeyword.toLowerCase())) {
    optimized = `${primaryKeyword} - ${title}`
  }
  
  // Truncate if too long
  if (optimized.length > maxLength) {
    optimized = optimized.substring(0, maxLength - 3) + '...'
  }
  
  return optimized
}

function optimizeDescription(
  description: string, 
  keywords: string[], 
  tone: string, 
  maxLength: number,
  includeFeatures: boolean,
  includeBenefits: boolean,
  includeCallToAction: boolean,
  focus: string = 'general'
): string {
  let optimized = description
  
  // Add keywords naturally if missing
  keywords.forEach(keyword => {
    if (!optimized.toLowerCase().includes(keyword.toLowerCase())) {
      optimized += ` This ${keyword} offers exceptional value.`
    }
  })
  
  // Add call-to-action if requested
  if (includeCallToAction && !optimized.toLowerCase().includes('buy') && !optimized.toLowerCase().includes('shop')) {
    optimized += ' Shop now for the best deals!'
  }
  
  // Truncate if too long
  if (optimized.length > maxLength) {
    optimized = optimized.substring(0, maxLength - 3) + '...'
  }
  
  return optimized
}

function generateHandle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
}

function generateTags(title: string, description: string, keywords: string[], productType?: string): string[] {
  const tags = new Set<string>()
  
  // Add keywords as tags
  keywords.forEach(keyword => tags.add(keyword.toLowerCase()))
  
  // Add product type
  if (productType) {
    tags.add(productType.toLowerCase())
  }
  
  // Extract potential tags from title and description
  const words = (title + ' ' + description).toLowerCase().split(/\s+/)
  words.forEach(word => {
    if (word.length > 3 && !['the', 'and', 'for', 'with', 'this', 'that'].includes(word)) {
      tags.add(word)
    }
  })
  
  return Array.from(tags).slice(0, 10) // Limit to 10 tags
}

function findUsedKeywords(content: string, keywords: string[]): string[] {
  return keywords.filter(keyword => 
    content.toLowerCase().includes(keyword.toLowerCase())
  )
}

function calculateSEOScore(title: string, description: string, keywords: string[]): number {
  let score = 0
  
  // Title optimization (40 points)
  if (title.length <= 60) score += 10
  if (keywords[0] && title.toLowerCase().includes(keywords[0].toLowerCase())) score += 20
  if (title.length >= 30) score += 10
  
  // Description optimization (40 points)
  if (description.length >= 150) score += 10
  if (description.length <= 320) score += 10
  const keywordCount = keywords.filter(k => description.toLowerCase().includes(k.toLowerCase())).length
  score += Math.min(keywordCount * 5, 20)
  
  // General optimization (20 points)
  if (description.includes('!') || description.includes('?')) score += 5 // Engaging punctuation
  if (description.toLowerCase().includes('buy') || description.toLowerCase().includes('shop')) score += 10 // CTA
  if (keywords.length > 0) score += 5
  
  return Math.min(score, 100)
}

function analyzeTitleSEO(title: string, keywords: string[]): number {
  let score = 0
  
  if (title.length <= 60) score += 30
  if (title.length >= 30) score += 20
  if (keywords[0] && title.toLowerCase().includes(keywords[0].toLowerCase())) score += 40
  if (title.split(' ').length >= 4) score += 10
  
  return Math.min(score, 100)
}

function analyzeDescriptionSEO(description: string, keywords: string[]): number {
  let score = 0
  
  if (description.length >= 150) score += 20
  if (description.length <= 320) score += 20
  
  const keywordCount = keywords.filter(k => description.toLowerCase().includes(k.toLowerCase())).length
  score += Math.min(keywordCount * 15, 45)
  
  if (description.toLowerCase().includes('buy') || description.toLowerCase().includes('shop')) score += 15
  
  return Math.min(score, 100)
}

function calculateKeywordDensity(content: string, keywords: string[]): { [key: string]: number } {
  const density: { [key: string]: number } = {}
  const words = content.toLowerCase().split(/\s+/)
  const totalWords = words.length
  
  keywords.forEach(keyword => {
    const keywordWords = keyword.toLowerCase().split(/\s+/)
    let count = 0
    
    for (let i = 0; i <= words.length - keywordWords.length; i++) {
      const phrase = words.slice(i, i + keywordWords.length).join(' ')
      if (phrase === keyword.toLowerCase()) {
        count++
      }
    }
    
    density[keyword] = totalWords > 0 ? (count / totalWords) * 100 : 0
  })
  
  return density
}

function generateMetaDescription(description: string, keywords: string[]): string {
  const plainText = description.replace(/<[^>]*>/g, '') // Remove HTML tags
  const primaryKeyword = keywords[0] || ''
  
  let meta = plainText
  
  // Ensure primary keyword is included
  if (primaryKeyword && !meta.toLowerCase().includes(primaryKeyword.toLowerCase())) {
    meta = `${primaryKeyword} - ${meta}`
  }
  
  // Truncate to 160 characters
  if (meta.length > 160) {
    meta = meta.substring(0, 157) + '...'
  }
  
  return meta
}
