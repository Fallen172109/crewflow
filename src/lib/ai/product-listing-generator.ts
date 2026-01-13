// AI-Powered Product Listing Generation
// Creates comprehensive Shopify product listings with SEO optimization, pricing strategies, and marketing insights

import OpenAI from 'openai'
import { getAIConfig } from './config'
import { ProductImageAnalysis } from './product-image-analysis'

export interface ProductListingRequest {
  productName?: string
  description?: string
  imageAnalysis?: ProductImageAnalysis
  targetMarket?: string
  priceRange?: string
  brandStyle?: string
  competitorInfo?: string
  storeContext?: {
    currency: string
    plan: string
    niche: string
    averageOrderValue?: number
  }
}

export interface GeneratedProductListing {
  title: string
  description: string
  shortDescription: string
  price: number
  compareAtPrice?: number
  category: string
  productType: string
  tags: string[]
  seoTitle: string
  seoDescription: string
  variants: ProductVariant[]
  images: ProductImage[]
  specifications: ProductSpecification[]
  marketingCopy: MarketingCopy
  pricingStrategy: PricingStrategy
  competitiveAnalysis?: CompetitiveAnalysis
}

export interface ProductVariant {
  title: string
  price: number
  compareAtPrice?: number
  sku?: string
  inventory_quantity: number
  weight?: number
  requires_shipping: boolean
  taxable: boolean
  option1?: string
  option2?: string
  option3?: string
}

export interface ProductImage {
  src?: string
  alt: string
  position: number
  variantIds?: number[]
}

export interface ProductSpecification {
  name: string
  value: string
  group: string
}

export interface MarketingCopy {
  headlines: string[]
  bulletPoints: string[]
  socialMediaCaptions: string[]
  emailSubjectLines: string[]
  adCopy: string[]
  valuePropositions: string[]
}

export interface PricingStrategy {
  basePrice: number
  reasoning: string
  pricePoints: {
    economy: number
    standard: number
    premium: number
  }
  discountSuggestions: {
    type: string
    percentage: number
    occasion: string
  }[]
  bundleOpportunities: string[]
}

export interface CompetitiveAnalysis {
  averageMarketPrice: number
  pricePosition: 'budget' | 'mid-range' | 'premium'
  differentiators: string[]
  competitiveAdvantages: string[]
  marketGaps: string[]
}

const PRODUCT_LISTING_PROMPT = `You are an expert e-commerce product listing specialist with deep knowledge of Shopify, SEO, conversion optimization, and digital marketing. Create comprehensive, high-converting product listings that maximize visibility and sales.

## Core Responsibilities:

### 1. SEO Optimization
- Create search-engine friendly titles with primary keywords
- Write meta descriptions that improve click-through rates
- Generate relevant tags for product discoverability
- Optimize content for voice search and mobile users

### 2. Conversion Optimization
- Write compelling product descriptions that address customer pain points
- Create benefit-focused copy that drives purchase decisions
- Structure information for easy scanning and comprehension
- Include social proof elements and trust signals

### 3. Pricing Strategy
- Analyze market positioning and competitive landscape
- Suggest optimal pricing based on value perception
- Recommend pricing psychology techniques
- Identify upselling and cross-selling opportunities

### 4. Marketing Integration
- Create copy suitable for multiple marketing channels
- Generate social media content variations
- Develop email marketing subject lines and content
- Provide advertising copy for paid campaigns

### 5. Technical Optimization
- Structure variants for inventory management
- Optimize for Shopify's search and filtering systems
- Ensure mobile-first content presentation
- Consider international markets and localization

## Quality Standards:
- All content must be original and plagiarism-free
- Maintain consistent brand voice and tone
- Ensure factual accuracy and realistic claims
- Follow e-commerce best practices and legal requirements
- Optimize for both human readers and search engines

## Response Requirements:
Provide a comprehensive JSON response with all elements needed for immediate Shopify implementation. Include detailed reasoning for pricing and positioning decisions.`

export class ProductListingGenerator {
  private openai: OpenAI
  private model: string = 'gpt-5'

  constructor() {
    const aiConfig = getAIConfig()
    this.openai = new OpenAI({
      apiKey: aiConfig.openai.apiKey
    })
  }

  async generateProductListing(request: ProductListingRequest): Promise<GeneratedProductListing> {
    try {
      const {
        productName,
        description,
        imageAnalysis,
        targetMarket,
        priceRange,
        brandStyle,
        competitorInfo,
        storeContext
      } = request

      // Build comprehensive context for generation
      let contextPrompt = PRODUCT_LISTING_PROMPT

      // Add store context
      if (storeContext) {
        contextPrompt += `\n\nStore Context:
- Currency: ${storeContext.currency}
- Plan: ${storeContext.plan}
- Niche: ${storeContext.niche}
- Average Order Value: ${storeContext.averageOrderValue ? `$${storeContext.averageOrderValue}` : 'Unknown'}`
      }

      // Add image analysis insights
      if (imageAnalysis) {
        contextPrompt += `\n\nAI Image Analysis Insights:
- Product: ${imageAnalysis.productName}
- Category: ${imageAnalysis.category}
- Features: ${imageAnalysis.features.join(', ')}
- Materials: ${imageAnalysis.materials.join(', ')}
- Colors: ${imageAnalysis.colors.join(', ')}
- Style: ${imageAnalysis.style}
- Target Audience: ${imageAnalysis.targetAudience}
- Quality Score: ${imageAnalysis.qualityAssessment.score}/10
- Suggested Price: $${imageAnalysis.suggestedPrice.min}-$${imageAnalysis.suggestedPrice.max}
- SEO Keywords: ${imageAnalysis.seoKeywords.join(', ')}
- Marketing Angles: ${imageAnalysis.marketingAngles.join(', ')}`
      }

      // Add additional context
      if (targetMarket) {
        contextPrompt += `\n\nTarget Market: ${targetMarket}`
      }
      if (priceRange) {
        contextPrompt += `\n\nDesired Price Range: ${priceRange}`
      }
      if (brandStyle) {
        contextPrompt += `\n\nBrand Style: ${brandStyle}`
      }
      if (competitorInfo) {
        contextPrompt += `\n\nCompetitor Information: ${competitorInfo}`
      }

      // Create the generation request
      const userPrompt = `Generate a comprehensive Shopify product listing for the following product:

Product Name: ${productName || imageAnalysis?.productName || 'Product'}
Description: ${description || 'Generate based on analysis'}

Requirements:
1. Create an SEO-optimized title (60 characters max)
2. Write a compelling product description (200-400 words)
3. Generate a short description for previews (50-100 words)
4. Suggest optimal pricing with reasoning
5. Create relevant product variants if applicable
6. Generate comprehensive tags for discoverability
7. Provide marketing copy for multiple channels
8. Include technical specifications where relevant
9. Suggest competitive positioning strategy

Please provide a detailed JSON response with all elements structured for immediate Shopify implementation.`

      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: contextPrompt
          },
          {
            role: 'user',
            content: userPrompt
          }
        ],
        max_tokens: 4000,
        temperature: 0.3 // Lower temperature for more consistent, professional output
      })

      const generatedContent = response.choices[0]?.message?.content
      if (!generatedContent) {
        throw new Error('No content generated from AI')
      }

      // Parse the JSON response
      let listing: GeneratedProductListing
      try {
        // Extract JSON from response
        const jsonMatch = generatedContent.match(/\{[\s\S]*\}/)
        const jsonText = jsonMatch ? jsonMatch[0] : generatedContent
        listing = JSON.parse(jsonText)
      } catch (parseError) {
        // If JSON parsing fails, create structured response from text
        listing = this.parseTextResponse(generatedContent, request)
      }

      // Validate and enhance the listing
      return this.validateAndEnhanceListing(listing, request)

    } catch (error) {
      console.error('Error generating product listing:', error)
      throw new Error(`Failed to generate product listing: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  private parseTextResponse(text: string, request: ProductListingRequest): GeneratedProductListing {
    // Fallback parser for when JSON parsing fails
    const productName = request.productName || request.imageAnalysis?.productName || 'Product'
    const basePrice = request.imageAnalysis?.suggestedPrice?.min || 29.99

    return {
      title: this.extractValue(text, 'title', productName),
      description: this.extractValue(text, 'description', 'Product description pending'),
      shortDescription: this.extractValue(text, 'short description', 'Brief product overview'),
      price: basePrice,
      category: request.imageAnalysis?.category || 'General',
      productType: request.imageAnalysis?.category || 'General',
      tags: this.extractList(text, 'tags'),
      seoTitle: this.extractValue(text, 'seo title', productName),
      seoDescription: this.extractValue(text, 'seo description', 'Product description'),
      variants: [{
        title: 'Default Title',
        price: basePrice,
        inventory_quantity: 100,
        requires_shipping: true,
        taxable: true
      }],
      images: [{
        alt: productName,
        position: 1
      }],
      specifications: [],
      marketingCopy: {
        headlines: [productName],
        bulletPoints: request.imageAnalysis?.features || [],
        socialMediaCaptions: [],
        emailSubjectLines: [],
        adCopy: [],
        valuePropositions: []
      },
      pricingStrategy: {
        basePrice,
        reasoning: 'Based on image analysis and market research',
        pricePoints: {
          economy: basePrice * 0.8,
          standard: basePrice,
          premium: basePrice * 1.3
        },
        discountSuggestions: [],
        bundleOpportunities: []
      }
    }
  }

  private extractValue(text: string, key: string, defaultValue: string): string {
    const regex = new RegExp(`${key}[:\\s]*([^\\n\\r]+)`, 'i')
    const match = text.match(regex)
    return match ? match[1].trim() : defaultValue
  }

  private extractList(text: string, key: string): string[] {
    const regex = new RegExp(`${key}[:\\s]*([^\\n\\r]+)`, 'i')
    const match = text.match(regex)
    if (match) {
      return match[1].split(',').map(item => item.trim()).filter(item => item.length > 0)
    }
    return []
  }

  private validateAndEnhanceListing(listing: GeneratedProductListing, request: ProductListingRequest): GeneratedProductListing {
    // Ensure all required fields are present with sensible defaults
    return {
      title: listing.title || request.productName || 'Product',
      description: listing.description || 'Product description pending',
      shortDescription: listing.shortDescription || listing.description?.substring(0, 100) + '...' || 'Brief description',
      price: listing.price || request.imageAnalysis?.suggestedPrice?.min || 29.99,
      compareAtPrice: listing.compareAtPrice,
      category: listing.category || request.imageAnalysis?.category || 'General',
      productType: listing.productType || listing.category || 'General',
      tags: listing.tags || request.imageAnalysis?.tags || [],
      seoTitle: listing.seoTitle || listing.title,
      seoDescription: listing.seoDescription || listing.shortDescription,
      variants: listing.variants || [{
        title: 'Default Title',
        price: listing.price || 29.99,
        inventory_quantity: 100,
        requires_shipping: true,
        taxable: true
      }],
      images: listing.images || [{
        alt: listing.title,
        position: 1
      }],
      specifications: listing.specifications || [],
      marketingCopy: listing.marketingCopy || {
        headlines: [listing.title],
        bulletPoints: [],
        socialMediaCaptions: [],
        emailSubjectLines: [],
        adCopy: [],
        valuePropositions: []
      },
      pricingStrategy: listing.pricingStrategy || {
        basePrice: listing.price || 29.99,
        reasoning: 'Standard pricing strategy',
        pricePoints: {
          economy: (listing.price || 29.99) * 0.8,
          standard: listing.price || 29.99,
          premium: (listing.price || 29.99) * 1.3
        },
        discountSuggestions: [],
        bundleOpportunities: []
      },
      competitiveAnalysis: listing.competitiveAnalysis
    }
  }
}

// Factory function to create generator instance
export function createProductListingGenerator(): ProductListingGenerator {
  return new ProductListingGenerator()
}

// Utility function for quick listing generation
export async function generateProductListing(request: ProductListingRequest): Promise<GeneratedProductListing> {
  const generator = createProductListingGenerator()
  return generator.generateProductListing(request)
}
