import { NextRequest, NextResponse } from 'next/server'
import { getAIConfig } from '@/lib/ai/config'

export async function GET(request: NextRequest) {
  try {
    const config = getAIConfig()
    
    return NextResponse.json({
      openaiKey: config.openai.apiKey ? `${config.openai.apiKey.substring(0, 10)}...` : null,
      openaiKeyLength: config.openai.apiKey?.length || 0,
      perplexityKey: config.perplexity.apiKey ? `${config.perplexity.apiKey.substring(0, 10)}...` : null,
      anthropicKey: config.anthropic.apiKey ? `${config.anthropic.apiKey.substring(0, 10)}...` : null,
      otherKeys: {
        openaiModel: config.openai.model,
        perplexityModel: config.perplexity.model,
        anthropicModel: config.anthropic.model
      },
      envVars: {
        nodeEnv: process.env.NODE_ENV,
        hasOpenaiKey: !!process.env.OPENAI_API_KEY,
        hasPerplexityKey: !!process.env.PERPLEXITY_API_KEY,
        hasAnthropicKey: !!process.env.ANTHROPIC_API_KEY
      }
    })

  } catch (error) {
    console.error('Environment test error:', error)
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}
