import { NextRequest, NextResponse } from 'next/server'
import { createImageGenerationService, type ImageGenerationRequest } from '@/lib/ai/image-generation'

export async function POST(request: NextRequest) {
  try {
    const { prompt, style, aspectRatio, quality } = await request.json()

    console.log('🧪 Testing prompt enhancement for different styles')
    
    const imageService = createImageGenerationService()
    
    // Test the same prompt with different styles
    const testPrompt = prompt || 'A person working at a computer desk'
    const styles = ['Photorealistic', 'Digital Art', 'Oil Painting', 'Watercolor', 'Sketch', 'Cartoon', 'Abstract']
    
    const results = []
    
    for (const testStyle of styles) {
      // Access the private enhancePrompt method through reflection for testing
      const enhancedPrompt = (imageService as any).enhancePrompt(
        testPrompt,
        testStyle,
        aspectRatio || 'Square (1:1)',
        false,
        undefined
      )
      
      results.push({
        style: testStyle,
        originalPrompt: testPrompt,
        enhancedPrompt: enhancedPrompt,
        promptLength: enhancedPrompt.length
      })
    }

    // If a specific style was requested, also test that one
    if (style && !styles.includes(style)) {
      const enhancedPrompt = (imageService as any).enhancePrompt(
        testPrompt,
        style,
        aspectRatio || 'Square (1:1)',
        false,
        undefined
      )
      
      results.push({
        style: style,
        originalPrompt: testPrompt,
        enhancedPrompt: enhancedPrompt,
        promptLength: enhancedPrompt.length
      })
    }

    // Analyze the differences between styles
    const styleAnalysis = results.map(result => {
      const enhancement = result.enhancedPrompt.replace(result.originalPrompt, '').trim()
      const styleKeywords = enhancement.split(',').map(k => k.trim()).filter(k => k.length > 0)

      return {
        ...result,
        addedKeywords: styleKeywords,
        keywordCount: styleKeywords.length,
        hasStyleSpecificTerms: styleKeywords.some(k =>
          k.toLowerCase().includes(result.style.toLowerCase()) ||
          (result.style === 'Photorealistic' && (k.includes('photo') || k.includes('realistic'))) ||
          (result.style === 'Digital Art' && k.includes('digital')) ||
          (result.style === 'Oil Painting' && k.includes('oil')) ||
          (result.style === 'Watercolor' && k.includes('watercolor')) ||
          (result.style === 'Sketch' && k.includes('sketch')) ||
          (result.style === 'Cartoon' && k.includes('cartoon')) ||
          (result.style === 'Abstract' && k.includes('abstract'))
        )
      }
    })

    return NextResponse.json({
      success: true,
      testPrompt,
      results: styleAnalysis,
      summary: {
        totalStyles: results.length,
        averagePromptLength: Math.round(results.reduce((sum, r) => sum + r.promptLength, 0) / results.length),
        uniqueEnhancements: new Set(results.map(r => r.enhancedPrompt)).size,
        stylesWithSpecificTerms: styleAnalysis.filter(r => r.hasStyleSpecificTerms).length,
        averageKeywordsAdded: Math.round(styleAnalysis.reduce((sum, r) => sum + r.keywordCount, 0) / styleAnalysis.length)
      }
    })

  } catch (error) {
    console.error('❌ Prompt enhancement test error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 })
  }
}
