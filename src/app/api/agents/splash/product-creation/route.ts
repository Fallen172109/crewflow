import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClientWithCookies } from '@/lib/supabase/server'
import { getAIConfig } from '@/lib/ai/config'
import { ChatOpenAI } from '@langchain/openai'
import { HumanMessage, SystemMessage } from '@langchain/core/messages'
import { generateImage } from '@/lib/ai/image-generation'
import { getModelForProductCreation, logCostEstimate } from '@/lib/ai/model-config'
import { analyzeProductImages, createProductImageAnalyzer } from '@/lib/ai/product-image-analysis'
import { analyzeFiles } from '@/lib/ai/file-analysis'
import { generateProductListing, createProductListingGenerator } from '@/lib/ai/product-listing-generator'

interface ProductPreview {
  title: string
  description: string
  price?: number
  images?: string[]
  category?: string
  tags?: string[]
  variants?: Array<{
    title: string
    price: number
    inventory_quantity?: number
  }>
}

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 Product Creation API - Starting authentication check')
    const supabase = await createSupabaseServerClientWithCookies()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    console.log('🔍 Product Creation API - Auth result:', {
      hasUser: !!user,
      userId: user?.id,
      userError: userError?.message
    })

    if (!user || userError) {
      console.log('❌ Product Creation API - Authentication failed:', userError?.message || 'No user')
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { message, attachments, images, imageAnalysis: providedImageAnalysis, storeId, storeCurrency, storePlan } = body

    if (!storeId) {
      return NextResponse.json(
        { error: 'Store ID is required' },
        { status: 400 }
      )
    }

    // Initialize AI service
    const aiConfig = getAIConfig()
    if (!aiConfig.openai.apiKey) {
      return NextResponse.json({
        response: "I apologize, but the AI service is not properly configured. Please contact support.",
        productPreview: null
      })
    }

    // Use GPT-4 for optimal product creation quality
    const modelConfig = getModelForProductCreation()

    const llm = new ChatOpenAI({
      apiKey: aiConfig.openai.apiKey,
      model: modelConfig.name,
      maxTokens: modelConfig.maxTokens,
      temperature: modelConfig.temperature
    })

    // Log cost estimate for development
    logCostEstimate(modelConfig.name, 500, 800, 'Product Creation')

    // Analyze attachments if present
    let imageAnalysis = ''
    let detailedProductAnalysis: any = null

    // Process both traditional attachments and new image uploads
    const allAttachments = [...(attachments || []), ...(images || [])]
    if (allAttachments.length > 0) {
      const imageAttachments = allAttachments.filter((att: any) => att.fileType?.startsWith('image/') || att.type?.startsWith('image/'))

      if (imageAttachments.length > 0) {
        try {
          console.log('🖼️ Processing product images:', imageAttachments.length)

          // Use existing image analysis if available from the new image upload system
          if (providedImageAnalysis && providedImageAnalysis.analysisResults && providedImageAnalysis.analysisResults.length > 0) {
            console.log('📊 Using existing image analysis results')
            const primaryAnalysis = providedImageAnalysis.analysisResults[0]
            imageAnalysis = `\n\nImage Analysis Summary:
- Total Images: ${providedImageAnalysis.totalImages}
- Primary Image: ${primaryAnalysis.fileName}
- Description: ${primaryAnalysis.description}
- Product Relevance: ${primaryAnalysis.relevance}
- Suggested Tags: ${primaryAnalysis.tags.join(', ')}
- E-commerce Suitable: ${primaryAnalysis.suitableForProduct ? 'Yes' : 'No'}
- Combined Insights: ${providedImageAnalysis.combinedInsights}`
          } else {
            // Fallback to traditional image analysis for backward compatibility
            console.log('🔄 Using traditional image analysis')
            const normalizedAttachments = imageAttachments.map((att: any) => ({
              ...att,
              publicUrl: att.publicUrl || att.url,
              fileName: att.fileName || att.name,
              fileType: att.fileType || att.type
            }))

            // Use advanced AI image analysis for product details
            const analyzer = createProductImageAnalyzer()
            const analyses = await analyzer.analyzeMultipleImages(normalizedAttachments, message)

            if (analyses.length > 0) {
              detailedProductAnalysis = analyses[0] // Use first analysis as primary
              imageAnalysis = `\n\nDetailed Image Analysis:
- Product: ${detailedProductAnalysis.productName}
- Category: ${detailedProductAnalysis.category}
- Features: ${detailedProductAnalysis.features.join(', ')}
- Colors: ${detailedProductAnalysis.colors.join(', ')}
- Materials: ${detailedProductAnalysis.materials.join(', ')}
- Target Audience: ${detailedProductAnalysis.targetAudience}
- Suggested Price Range: $${detailedProductAnalysis.suggestedPrice.min}-$${detailedProductAnalysis.suggestedPrice.max}
- Quality Score: ${detailedProductAnalysis.qualityAssessment.score}/10
- SEO Keywords: ${detailedProductAnalysis.seoKeywords.join(', ')}
- Marketing Angles: ${detailedProductAnalysis.marketingAngles.join(', ')}`
            }
          }
        } catch (error) {
          console.error('Error analyzing product images:', error)
          console.error('Image attachments:', imageAttachments.map(att => ({
            fileName: att.fileName || att.name,
            fileType: att.fileType || att.type,
            hasUrl: !!(att.publicUrl || att.url),
            url: att.publicUrl || att.url
          })))
          imageAnalysis = `\n\nImage Analysis: User has uploaded ${imageAttachments.length} product image(s). Basic analysis available.`
        }
      }

      // Also analyze non-image attachments
      try {
        const fileAnalysis = await analyzeFiles(attachments)
        if (fileAnalysis.length > 0) {
          const nonImageFiles = fileAnalysis.filter(f => f.fileType !== 'image')
          if (nonImageFiles.length > 0) {
            imageAnalysis += `\n\nAdditional Files: ${nonImageFiles.map(f => f.summary).join(', ')}`
          }
        }
      } catch (error) {
        console.error('Error analyzing files:', error)
      }
    }

    // Determine if user wants immediate upload to Shopify
    const lowerMessage = message.toLowerCase()
    const shouldAutoPublish = lowerMessage.includes('upload') ||
                             lowerMessage.includes('publish') ||
                             lowerMessage.includes('add to store') ||
                             lowerMessage.includes('upload to store') ||
                             lowerMessage.includes('publish to store') ||
                             lowerMessage.includes('create product') ||
                             lowerMessage.includes('turn this into a product') ||
                             lowerMessage.includes('turn into a product') ||
                             lowerMessage.includes('make this a product') ||
                             lowerMessage.includes('add it to') ||
                             lowerMessage.includes('put it on')

    // Build enhanced system prompt for product creation
    let systemPrompt = `You are Splash, CrewFlow's creative AI assistant specializing in Shopify product creation. You help merchants create compelling product listings from images or descriptions using advanced AI analysis.

Store Context:
- Store Currency: ${storeCurrency || 'USD'}
- Store Plan: ${storePlan || 'Basic'}

Your Enhanced Capabilities:
1. AI-powered image analysis for detailed product insights
2. Generate SEO-optimized product titles (60 chars max)
3. Write persuasive, benefit-focused product descriptions
4. Intelligent pricing based on visual quality assessment and market analysis
5. Create relevant product categories and searchable tags
6. Generate product variants based on visual analysis
7. Suggest marketing angles and target audience insights

Guidelines:
- Use AI image analysis insights when available
- Create titles that are both SEO-friendly and compelling
- Write descriptions that emphasize benefits and solve customer problems
- Price based on perceived quality, materials, and market positioning
- Include relevant, searchable tags for discoverability
- Consider store plan limitations for features
- Always provide a structured product preview
- When user requests upload/publish, create complete product details immediately

${detailedProductAnalysis ? `
AI Image Analysis Available:
- Detected Product: ${detailedProductAnalysis.productName}
- Category: ${detailedProductAnalysis.category}
- Quality Score: ${detailedProductAnalysis.qualityAssessment.score}/10
- Suggested Price Range: $${detailedProductAnalysis.suggestedPrice.min}-$${detailedProductAnalysis.suggestedPrice.max}
- Target Audience: ${detailedProductAnalysis.targetAudience}
- Key Features: ${detailedProductAnalysis.features.slice(0, 5).join(', ')}
- SEO Keywords: ${detailedProductAnalysis.seoKeywords.slice(0, 8).join(', ')}
- Marketing Angles: ${detailedProductAnalysis.marketingAngles.slice(0, 3).join(', ')}

Use this analysis to create an optimized product listing that leverages these insights.
` : ''}

${shouldAutoPublish ? `
IMPORTANT: The user has requested to upload/publish this product to their Shopify store. Create a complete, ready-to-publish product listing with all necessary details including:
- Professional product title
- Compelling description with benefits
- Competitive pricing based on analysis
- Relevant category and tags
- Proper variants and inventory

Do not ask for additional information - use your AI analysis and best practices to create a complete listing.
` : ''}

Response Format:
Provide a conversational response explaining what you've created, followed by a structured product preview in JSON format.

PRODUCT_PREVIEW_START
{
  "title": "SEO-optimized product title",
  "description": "Compelling product description with benefits and features",
  "price": 29.99,
  "category": "Product Category",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
  "variants": [
    {
      "title": "Default Title",
      "price": 29.99,
      "inventory_quantity": 100
    }
  ]
}
PRODUCT_PREVIEW_END

Always include the PRODUCT_PREVIEW_START and PRODUCT_PREVIEW_END markers with valid JSON between them.`

    // Generate comprehensive product listing using enhanced AI
    let productPreview: ProductPreview | null = null
    let aiResponse = ''

    if (detailedProductAnalysis) {
      // Use advanced product listing generator with image analysis
      try {
        const listingGenerator = createProductListingGenerator()
        const generatedListing = await listingGenerator.generateProductListing({
          productName: detailedProductAnalysis.productName,
          description: message,
          imageAnalysis: detailedProductAnalysis,
          storeContext: {
            currency: storeCurrency || 'USD',
            plan: storePlan || 'basic',
            niche: 'general'
          }
        })

        // Convert to ProductPreview format
        productPreview = {
          title: generatedListing.title,
          description: generatedListing.description,
          price: generatedListing.price,
          category: generatedListing.category,
          tags: generatedListing.tags,
          variants: generatedListing.variants.map(v => ({
            title: v.title,
            price: v.price,
            inventory_quantity: v.inventory_quantity
          }))
        }

        aiResponse = `🎯 **Excellent! I've analyzed your product image and created a comprehensive listing.**

Based on my AI image analysis, I've identified this as a **${detailedProductAnalysis.productName}** with a quality score of **${detailedProductAnalysis.qualityAssessment.score}/10**.

## 🔍 **What I Found:**
- **Category**: ${detailedProductAnalysis.category}
- **Target Audience**: ${detailedProductAnalysis.targetAudience}
- **Key Features**: ${detailedProductAnalysis.features.slice(0, 3).join(', ')}
- **Materials**: ${detailedProductAnalysis.materials.join(', ')}
- **Colors**: ${detailedProductAnalysis.colors.join(', ')}

## 💰 **Pricing Strategy:**
I've suggested **$${generatedListing.price}** based on:
- Visual quality assessment (${detailedProductAnalysis.qualityAssessment.score}/10)
- Market positioning analysis
- Target audience purchasing power
- ${generatedListing.pricingStrategy.reasoning}

## 🚀 **SEO & Marketing:**
- **SEO Keywords**: ${detailedProductAnalysis.seoKeywords.slice(0, 5).join(', ')}
- **Marketing Angles**: ${detailedProductAnalysis.marketingAngles.slice(0, 2).join(', ')}
- **Tags**: ${generatedListing.tags.slice(0, 5).join(', ')}

The listing is optimized for conversions and includes compelling copy that highlights benefits over features.${shouldAutoPublish ? ' I\'ll now upload this product to your Shopify store!' : ' Ready to create this product in your store?'}`

      } catch (error) {
        console.error('Error with advanced listing generation:', error)
        // Fall back to basic generation
      }
    }

    // Fallback to basic generation if advanced method failed or no image analysis
    if (!productPreview) {
      const userPrompt = `Please help me create a Shopify product listing.

User Request: ${message}${imageAnalysis}

${shouldAutoPublish ?
  'The user wants to upload/publish this product to their Shopify store. Create a complete, professional product listing with all necessary details. Use your best judgment for pricing, descriptions, and categories based on the image analysis. Do not ask for additional information - create a ready-to-publish listing now.' :
  'Please analyze this request and create a complete product listing with title, description, pricing, category, and tags. Make it compelling and ready to sell!'
}`

      const response = await llm.invoke([
        new SystemMessage(systemPrompt),
        new HumanMessage(userPrompt)
      ])

      const rawResponse = response.content as string

      // Extract product preview from response
      const previewMatch = rawResponse.match(/PRODUCT_PREVIEW_START\s*([\s\S]*?)\s*PRODUCT_PREVIEW_END/)

      if (previewMatch) {
        try {
          productPreview = JSON.parse(previewMatch[1].trim())
        } catch (error) {
          console.error('Error parsing product preview:', error)
        }
      }

      // Clean response (remove the JSON part for display)
      aiResponse = rawResponse.replace(/PRODUCT_PREVIEW_START[\s\S]*?PRODUCT_PREVIEW_END/, '').trim()
    }

    // Generate product image if none provided and user requested it
    let generatedImageUrl = null
    if (!attachments?.length && productPreview && message.toLowerCase().includes('generate image')) {
      try {
        const imagePrompt = `A high-quality product photo of ${productPreview.title} on a clean white background, professional e-commerce style, well-lit, detailed`
        const imageResult = await generateImage({
          prompt: imagePrompt,
          style: 'Photographic',
          aspectRatio: 'Square (1:1)',
          quality: 'hd',
          userId: user.id
        })
        if (imageResult.imageUrl) {
          generatedImageUrl = imageResult.imageUrl
          if (productPreview.images) {
            productPreview.images.push(imageResult.imageUrl)
          } else {
            productPreview.images = [imageResult.imageUrl]
          }
        }
      } catch (error) {
        console.error('Error generating product image:', error)
      }
    }

    // Add uploaded images to product preview
    if (productPreview && images && images.length > 0) {
      const productImages = images
        .filter((img: any) => img.useForProduct && img.publicUrl)
        .map((img: any) => img.publicUrl)

      if (productImages.length > 0) {
        if (productPreview.images) {
          productPreview.images = [...productImages, ...productPreview.images]
        } else {
          productPreview.images = productImages
        }
        console.log('🖼️ Added uploaded images to product:', productImages.length)
      }
    }

    // Store the product creation session for potential publishing
    if (productPreview) {
      await supabase.from('product_drafts').insert({
        user_id: user.id,
        store_id: storeId,
        title: productPreview.title,
        description: productPreview.description,
        price: productPreview.price,
        category: productPreview.category,
        tags: productPreview.tags,
        variants: productPreview.variants,
        images: productPreview.images,
        uploaded_images: images ? images.filter((img: any) => img.useForProduct) : [],
        created_at: new Date().toISOString()
      })
    }

    // Auto-publish to Shopify if user requested upload/publish
    let publishedProduct = null
    if (shouldAutoPublish && productPreview) {
      try {
        const { createShopifyAPI } = await import('@/lib/integrations/shopify-admin-api')
        const shopifyAPI = await createShopifyAPI(user.id)

        if (shopifyAPI) {
          // Prepare product for Shopify
          const shopifyProduct = {
            title: productPreview.title,
            body_html: productPreview.description,
            product_type: productPreview.category,
            tags: productPreview.tags?.join(', ') || '',
            variants: productPreview.variants?.map(variant => ({
              title: variant.title || 'Default Title',
              price: variant.price?.toString() || productPreview.price?.toString() || '0.00',
              inventory_quantity: variant.inventory_quantity || 100,
              inventory_management: 'shopify',
              inventory_policy: 'deny'
            })) || [{
              title: 'Default Title',
              price: productPreview.price?.toString() || '0.00',
              inventory_quantity: 100,
              inventory_management: 'shopify',
              inventory_policy: 'deny'
            }],
            images: productPreview.images?.map((url, index) => ({
              src: url,
              position: index + 1
            })) || []
          }

          // Create product in Shopify
          publishedProduct = await shopifyAPI.createProduct(shopifyProduct)

          if (publishedProduct) {
            // Update draft status
            await supabase
              .from('product_drafts')
              .update({
                published: true,
                shopify_product_id: publishedProduct.id,
                published_at: new Date().toISOString()
              })
              .eq('user_id', user.id)
              .eq('store_id', storeId)
              .eq('title', productPreview.title)

            // Get store info for URLs
            const { data: store } = await supabase
              .from('shopify_stores')
              .select('shop_domain, store_name')
              .eq('id', storeId)
              .eq('user_id', user.id)
              .single()

            // Update AI response to include success message
            aiResponse += `\n\n✅ **Product Successfully Published to Shopify!**\n\n**${publishedProduct.title}** has been added to your ${store?.store_name || 'Shopify'} store.\n\n🔗 [View in Shopify Admin](https://admin.shopify.com/store/${store?.shop_domain?.replace('.myshopify.com', '') || 'your-store'}/products/${publishedProduct.id})\n\nYour product is now live and ready for customers!`
          }
        }
      } catch (error) {
        console.error('Error auto-publishing product:', error)
        aiResponse += `\n\n⚠️ Product created successfully, but there was an issue publishing to Shopify. You can manually publish it from the product preview.`
      }
    }

    return NextResponse.json({
      response: aiResponse,
      productPreview,
      generatedImage: generatedImageUrl,
      publishedProduct,
      autoPublished: !!publishedProduct
    })

  } catch (error) {
    console.error('Error in product creation:', error)
    return NextResponse.json(
      { 
        response: "I apologize, but I encountered an error while creating your product. Please try again or contact support if the issue persists.",
        productPreview: null
      },
      { status: 500 }
    )
  }
}
