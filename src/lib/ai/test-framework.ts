// AI Framework Testing Utility
// Use this to test that all AI frameworks are working correctly

import { processAgentMessage } from './index'
import { getAgent } from '../agents'
import { validateAIConfig, getAIConfig } from './config'

export interface FrameworkTestResult {
  framework: string
  success: boolean
  response?: string
  error?: string
  latency?: number
}

export async function testAllFrameworks(): Promise<FrameworkTestResult[]> {
  const results: FrameworkTestResult[] = []
  
  // Test LangChain
  try {
    const coral = getAgent('coral')
    if (coral) {
      const startTime = Date.now()
      const response = await processAgentMessage(
        coral,
        "Hello, can you help me with a simple customer support question?",
        undefined,
        "You are a helpful customer support specialist. Keep your response brief."
      )
      
      results.push({
        framework: 'LangChain',
        success: response.success,
        response: response.response,
        error: response.error,
        latency: Date.now() - startTime
      })
    }
  } catch (error) {
    results.push({
      framework: 'LangChain',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }

  // Test Perplexity AI
  try {
    const pearl = getAgent('pearl')
    if (pearl) {
      const startTime = Date.now()
      const response = await processAgentMessage(
        pearl,
        "What are the latest trends in AI technology?",
        undefined,
        "You are a content specialist. Provide a brief overview of current AI trends."
      )
      
      results.push({
        framework: 'Perplexity AI',
        success: response.success,
        response: response.response,
        error: response.error,
        latency: Date.now() - startTime
      })
    }
  } catch (error) {
    results.push({
      framework: 'Perplexity AI',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }

  // Test AutoGen
  try {
    const flint = getAgent('flint')
    if (flint) {
      const startTime = Date.now()
      const response = await processAgentMessage(
        flint,
        "Create a simple workflow for processing customer feedback",
        undefined,
        "You are a workflow automation specialist. Provide a brief workflow outline."
      )
      
      results.push({
        framework: 'AutoGen',
        success: response.success,
        response: response.response,
        error: response.error,
        latency: Date.now() - startTime
      })
    }
  } catch (error) {
    results.push({
      framework: 'AutoGen',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }

  // Test Hybrid Framework
  try {
    const mariner = getAgent('mariner') // Hybrid agent
    if (mariner) {
      const startTime = Date.now()
      const response = await processAgentMessage(
        mariner,
        "Research current marketing automation trends and create a campaign strategy",
        undefined,
        "You are a marketing automation specialist. Provide insights and strategy."
      )
      
      results.push({
        framework: 'Hybrid',
        success: response.success,
        response: response.response,
        error: response.error,
        latency: Date.now() - startTime
      })
    }
  } catch (error) {
    results.push({
      framework: 'Hybrid',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }

  return results
}

export function validateConfiguration(): { isValid: boolean; errors: string[]; warnings: string[] } {
  const config = getAIConfig()
  const validation = validateAIConfig(config)
  
  const warnings: string[] = []
  
  // Check for optional configurations
  if (!config.anthropic.apiKey) {
    warnings.push('Anthropic API key not configured - Claude models will not be available')
  }
  
  if (!process.env.NEXT_PUBLIC_APP_URL) {
    warnings.push('NEXT_PUBLIC_APP_URL not set - OAuth integrations may not work correctly')
  }

  return {
    isValid: validation.isValid,
    errors: validation.errors,
    warnings
  }
}

export function getRequiredEnvironmentVariables(): string[] {
  return [
    'OPENAI_API_KEY',
    'PERPLEXITY_API_KEY',
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY'
  ]
}

export function getOptionalEnvironmentVariables(): string[] {
  return [
    'ANTHROPIC_API_KEY',
    'OPENAI_MODEL',
    'ANTHROPIC_MODEL', 
    'PERPLEXITY_MODEL',
    'NEXT_PUBLIC_APP_URL',
    // OAuth client IDs and secrets
    'SALESFORCE_CLIENT_ID',
    'SALESFORCE_CLIENT_SECRET',
    'HUBSPOT_CLIENT_ID',
    'HUBSPOT_CLIENT_SECRET',
    'SHOPIFY_CLIENT_ID',
    'SHOPIFY_CLIENT_SECRET',
    'GOOGLE_ADS_CLIENT_ID',
    'GOOGLE_ADS_CLIENT_SECRET',
    'FACEBOOK_ADS_CLIENT_ID',
    'FACEBOOK_ADS_CLIENT_SECRET',
    'SLACK_CLIENT_ID',
    'SLACK_CLIENT_SECRET'
  ]
}

export async function runDiagnostics(): Promise<{
  configuration: ReturnType<typeof validateConfiguration>
  frameworkTests: FrameworkTestResult[]
  environmentVariables: {
    required: { [key: string]: boolean }
    optional: { [key: string]: boolean }
  }
}> {
  console.log('🔍 Running CrewFlow AI Framework Diagnostics...')
  
  // Check configuration
  const configuration = validateConfiguration()
  console.log('📋 Configuration validation:', configuration.isValid ? '✅ Valid' : '❌ Invalid')
  
  // Check environment variables
  const required = getRequiredEnvironmentVariables()
  const optional = getOptionalEnvironmentVariables()
  
  const environmentVariables = {
    required: {} as { [key: string]: boolean },
    optional: {} as { [key: string]: boolean }
  }
  
  required.forEach(envVar => {
    environmentVariables.required[envVar] = !!process.env[envVar]
  })
  
  optional.forEach(envVar => {
    environmentVariables.optional[envVar] = !!process.env[envVar]
  })
  
  console.log('🔑 Environment variables check complete')
  
  // Test frameworks
  console.log('🧪 Testing AI frameworks...')
  const frameworkTests = await testAllFrameworks()
  
  frameworkTests.forEach(test => {
    console.log(`${test.framework}: ${test.success ? '✅' : '❌'} ${test.latency ? `(${test.latency}ms)` : ''}`)
    if (test.error) {
      console.log(`  Error: ${test.error}`)
    }
  })
  
  return {
    configuration,
    frameworkTests,
    environmentVariables
  }
}
