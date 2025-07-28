// AI-Powered Product Image Analysis
// Extracts detailed product information from uploaded images using OpenAI Vision API

import OpenAI from 'openai'
import { getAIConfig } from './config'
import { UploadedFile } from '@/components/ui/FileUpload'
import { createWebPriceResearcher, type PriceResearchRequest, type PriceResearchResult } from './web-price-research'
import { currencyConverter, formatCurrency } from './currency-converter'

export interface ProductImageAnalysis {
  productName: string
  category: string
  description: string
  features: string[]
  suggestedPrice: {
    min: number
    max: number
    currency: string
    reasoning: string
  }
  colors: string[]
  materials: string[]
  style: string
  targetAudience: string
  seasonality: string
  tags: string[]
  variants: ProductVariant[]
  seoKeywords: string[]
  marketingAngles: string[]
  competitorComparison?: string
  qualityAssessment: {
    score: number // 1-10
    factors: string[]
  }
  priceResearch?: PriceResearchResult // Enhanced with real-time competitive analysis
}

export interface ProductVariant {
  type: 'color' | 'size' | 'style' | 'material'
  name: string
  options: string[]
  priceModifier?: number // percentage change from base price
}

export interface ImageAnalysisRequest {
  imageUrl: string
  fileName: string
  additionalContext?: string
  targetMarket?: string
  priceRange?: string
  brandStyle?: string
  storeCurrency?: string // Currency for price research
  enablePriceResearch?: boolean // Whether to conduct real-time price research
}

const PRODUCT_ANALYSIS_PROMPT = `You are an expert e-commerce product analyst with deep knowledge of retail, marketing, and consumer behavior. Analyze the provided product image and extract comprehensive information for creating a Shopify product listing.

## CRITICAL INSTRUCTIONS:
🔍 **ACCURACY FIRST**: Look very carefully at the image. Examine every visible detail before making product identification decisions. If you see a dress, call it a dress. If you see jewelry, call it jewelry. Do not make assumptions.

💰 **CURRENCY PRESERVATION**: If the user mentions a specific currency (like PLN, EUR, GBP, etc.), preserve that exact currency in your analysis. Do not convert to USD unless explicitly requested.

## Analysis Requirements:

### 1. Product Identification (CRITICAL)
- Look carefully at the image and identify the EXACT product type and category
- Determine the primary function and use case based on what you actually see
- Assess the target demographic and market segment
- Double-check your identification before proceeding

### 2. Visual Analysis
- Describe all visible features, materials, and design elements
- Identify colors, textures, patterns, and finishes
- Assess build quality and craftsmanship from visual cues
- Note any branding, logos, or distinctive design elements

### 3. Market Positioning
- Suggest appropriate pricing based on visual quality assessment
- PRESERVE any currency mentioned by the user (PLN, EUR, etc.)
- Identify target audience and demographics
- Recommend seasonal positioning and marketing timing
- Compare to similar products in the market

### 4. E-commerce Optimization
- Generate SEO-friendly product titles and descriptions
- Suggest relevant tags and categories
- Identify potential product variants (colors, sizes, styles)
- Recommend complementary products for cross-selling

### 5. Marketing Strategy
- Identify key selling points and unique value propositions
- Suggest marketing angles and messaging strategies
- Recommend social media and advertising approaches
- Identify potential customer pain points this product solves

## Response Format:
Provide a detailed JSON response with all the information structured for immediate use in product creation. Be specific, actionable, and commercially focused.

## Quality Standards:
- Base pricing suggestions on visible quality indicators
- Ensure descriptions are compelling yet accurate
- Focus on benefits, not just features
- Consider current market trends and consumer preferences
- Provide realistic and achievable recommendations
- MAINTAIN currency context from user input

Analyze the image thoroughly and provide comprehensive insights for successful product listing creation.`

export class ProductImageAnalyzer {
  private openai: OpenAI
  private model: string = 'gpt-4o' // Updated to current vision model

  constructor() {
    const aiConfig = getAIConfig()
    this.openai = new OpenAI({
      apiKey: aiConfig.openai.apiKey
    })
  }

  async analyzeProductImage(request: ImageAnalysisRequest): Promise<ProductImageAnalysis> {
    try {
      const {
        imageUrl,
        fileName,
        additionalContext,
        targetMarket,
        priceRange,
        brandStyle,
        storeCurrency = 'PLN',
        enablePriceResearch = true
      } = request

      // Build context for analysis
      let contextPrompt = PRODUCT_ANALYSIS_PROMPT

      if (additionalContext) {
        contextPrompt += `\n\nAdditional Context: ${additionalContext}`

        // Extract currency information from context
        const currencyMatch = additionalContext.match(/(\d+)\s*(PLN|EUR|GBP|USD|CAD|AUD|JPY|CHF|SEK|NOK|DKK)/i)
        if (currencyMatch) {
          const [, amount, currency] = currencyMatch
          contextPrompt += `\n\n🚨 IMPORTANT: User mentioned price as ${amount} ${currency.toUpperCase()}. Use this EXACT currency in your analysis. Do NOT convert to USD.`
        }
      }

      if (targetMarket) {
        contextPrompt += `\n\nTarget Market: ${targetMarket}`
      }

      if (priceRange) {
        contextPrompt += `\n\nDesired Price Range: ${priceRange}`
      }

      if (brandStyle) {
        contextPrompt += `\n\nBrand Style: ${brandStyle}`
      }

      // Add currency context for pricing
      contextPrompt += `\n\n💰 PRICING CURRENCY: All prices should be provided in ${storeCurrency}. This is the store's configured currency.`

      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: contextPrompt
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Please analyze this product image (${fileName}) and provide comprehensive e-commerce insights in JSON format.`
              },
              {
                type: 'image_url',
                image_url: {
                  url: imageUrl,
                  detail: 'high'
                }
              }
            ]
          }
        ],
        max_tokens: 4000,
        temperature: 0.3 // Lower temperature for more consistent analysis
      })

      const analysisText = response.choices[0]?.message?.content
      if (!analysisText) {
        throw new Error('No analysis received from AI')
      }

      // Parse JSON response
      let analysis: ProductImageAnalysis
      try {
        // Extract JSON from response (in case there's additional text)
        const jsonMatch = analysisText.match(/\{[\s\S]*\}/)
        const jsonText = jsonMatch ? jsonMatch[0] : analysisText
        analysis = JSON.parse(jsonText)
      } catch (parseError) {
        // If JSON parsing fails, create structured response from text
        analysis = this.parseTextAnalysis(analysisText, fileName)
      }

      // Validate and enhance the analysis
      const enhancedAnalysis = this.validateAndEnhanceAnalysis(analysis)

      // Conduct real-time price research if enabled
      if (enablePriceResearch) {
        try {
          console.log('Conducting price research for:', enhancedAnalysis.productName)
          const priceResearch = await this.conductPriceResearch(enhancedAnalysis, storeCurrency)
          enhancedAnalysis.priceResearch = priceResearch

          // Update suggested price with research data
          if (priceResearch.recommendedPrice) {
            enhancedAnalysis.suggestedPrice = {
              min: priceResearch.recommendedPrice.min,
              max: priceResearch.recommendedPrice.max,
              currency: storeCurrency,
              reasoning: `${priceResearch.recommendedPrice.reasoning} Based on analysis of ${priceResearch.competitorData.length} similar products.`
            }
          }
        } catch (priceError) {
          console.error('Price research failed:', priceError)
          // Continue without price research if it fails
        }
      }

      return enhancedAnalysis

    } catch (error) {
      console.error('Error analyzing product image:', error)
      throw new Error(`Failed to analyze product image: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  private async conductPriceResearch(analysis: ProductImageAnalysis, storeCurrency: string): Promise<PriceResearchResult> {
    const priceResearcher = createWebPriceResearcher()

    const researchRequest: PriceResearchRequest = {
      productName: analysis.productName,
      category: analysis.category,
      description: analysis.description,
      features: analysis.features,
      colors: analysis.colors,
      materials: analysis.materials,
      style: analysis.style,
      targetMarket: analysis.targetAudience,
      storeCurrency
    }

    return await priceResearcher.researchProductPricing(researchRequest)
  }

  async analyzeMultipleImages(
    images: UploadedFile[],
    context?: string,
    storeCurrency: string = 'PLN',
    enablePriceResearch: boolean = true
  ): Promise<ProductImageAnalysis[]> {
    const analyses: ProductImageAnalysis[] = []

    console.log('Analyzing multiple images:', images.length)

    for (const image of images) {
      console.log('Processing image:', {
        fileName: image.fileName,
        fileType: image.fileType,
        hasPublicUrl: !!image.publicUrl,
        publicUrl: image.publicUrl?.substring(0, 100) + '...'
      })

      if (image.fileType?.startsWith('image/') && image.publicUrl) {
        try {
          const analysis = await this.analyzeProductImage({
            imageUrl: image.publicUrl,
            fileName: image.fileName,
            additionalContext: context,
            storeCurrency,
            enablePriceResearch
          })
          analyses.push(analysis)
          console.log('Successfully analyzed image:', image.fileName)
        } catch (error) {
          console.error(`Error analyzing image ${image.fileName}:`, error)
          // Continue with other images even if one fails
        }
      } else {
        console.warn('Skipping image due to missing data:', {
          fileName: image.fileName,
          hasFileType: !!image.fileType,
          isImageType: image.fileType?.startsWith('image/'),
          hasPublicUrl: !!image.publicUrl
        })
      }
    }

    console.log('Image analysis complete. Analyzed:', analyses.length, 'out of', images.length)
    return analyses
  }

  private parseTextAnalysis(text: string, fileName: string): ProductImageAnalysis {
    // Fallback parser for when JSON parsing fails
    // Extract key information from text response
    
    return {
      productName: this.extractValue(text, 'product name', fileName.replace(/\.[^/.]+$/, '')),
      category: this.extractValue(text, 'category', 'General'),
      description: this.extractValue(text, 'description', 'Product description based on image analysis'),
      features: this.extractList(text, 'features'),
      suggestedPrice: {
        min: 10,
        max: 50,
        currency: 'USD',
        reasoning: 'Price estimate based on visual assessment'
      },
      colors: this.extractList(text, 'colors'),
      materials: this.extractList(text, 'materials'),
      style: this.extractValue(text, 'style', 'Modern'),
      targetAudience: this.extractValue(text, 'target audience', 'General consumers'),
      seasonality: this.extractValue(text, 'season', 'Year-round'),
      tags: this.extractList(text, 'tags'),
      variants: [],
      seoKeywords: this.extractList(text, 'keywords'),
      marketingAngles: this.extractList(text, 'marketing'),
      qualityAssessment: {
        score: 7,
        factors: ['Visual assessment from image']
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

  private validateAndEnhanceAnalysis(analysis: ProductImageAnalysis): ProductImageAnalysis {
    // Ensure all required fields are present with defaults
    return {
      productName: analysis.productName || 'Untitled Product',
      category: analysis.category || 'General',
      description: analysis.description || 'Product description pending',
      features: analysis.features || [],
      suggestedPrice: analysis.suggestedPrice || {
        min: 10,
        max: 50,
        currency: 'USD',
        reasoning: 'Default price range'
      },
      colors: analysis.colors || [],
      materials: analysis.materials || [],
      style: analysis.style || 'Modern',
      targetAudience: analysis.targetAudience || 'General consumers',
      seasonality: analysis.seasonality || 'Year-round',
      tags: analysis.tags || [],
      variants: analysis.variants || [],
      seoKeywords: analysis.seoKeywords || [],
      marketingAngles: analysis.marketingAngles || [],
      competitorComparison: analysis.competitorComparison,
      qualityAssessment: analysis.qualityAssessment || {
        score: 7,
        factors: ['Visual assessment']
      }
    }
  }
}

// Factory function to create analyzer instance
export function createProductImageAnalyzer(): ProductImageAnalyzer {
  return new ProductImageAnalyzer()
}

// Utility function for quick image analysis
export async function analyzeProductImages(
  images: UploadedFile[],
  context?: string,
  storeCurrency: string = 'PLN',
  enablePriceResearch: boolean = true
): Promise<ProductImageAnalysis[]> {
  const analyzer = createProductImageAnalyzer()
  return analyzer.analyzeMultipleImages(images, context, storeCurrency, enablePriceResearch)
}
