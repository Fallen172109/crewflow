// API Route: Test AI Framework
// Test endpoint to verify AI framework functionality

import { NextRequest, NextResponse } from 'next/server'
import { runDiagnostics } from '@/lib/ai/test-framework'

export async function GET(request: NextRequest) {
  try {
    console.log('🚀 Starting AI Framework Diagnostics...')
    
    const diagnostics = await runDiagnostics()
    
    const summary = {
      status: diagnostics.configuration.isValid ? 'healthy' : 'configuration_issues',
      timestamp: new Date().toISOString(),
      configuration: diagnostics.configuration,
      frameworks: {
        total: diagnostics.frameworkTests.length,
        successful: diagnostics.frameworkTests.filter(t => t.success).length,
        failed: diagnostics.frameworkTests.filter(t => !t.success).length,
        results: diagnostics.frameworkTests
      },
      environment: {
        required: {
          total: Object.keys(diagnostics.environmentVariables.required).length,
          configured: Object.values(diagnostics.environmentVariables.required).filter(Boolean).length,
          missing: Object.entries(diagnostics.environmentVariables.required)
            .filter(([_, configured]) => !configured)
            .map(([key, _]) => key)
        },
        optional: {
          total: Object.keys(diagnostics.environmentVariables.optional).length,
          configured: Object.values(diagnostics.environmentVariables.optional).filter(Boolean).length
        }
      }
    }

    return NextResponse.json(summary, { 
      status: summary.status === 'healthy' ? 200 : 500 
    })

  } catch (error) {
    console.error('AI Framework test error:', error)
    return NextResponse.json(
      { 
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { framework, message, agentId } = await request.json()
    
    if (!framework || !message || !agentId) {
      return NextResponse.json(
        { error: 'Missing required parameters: framework, message, agentId' },
        { status: 400 }
      )
    }

    // Import here to avoid circular dependencies
    const { processAgentMessage } = await import('@/lib/ai')
    const { getAgent } = await import('@/lib/agents')
    
    const agent = getAgent(agentId)
    if (!agent) {
      return NextResponse.json(
        { error: `Agent not found: ${agentId}` },
        { status: 404 }
      )
    }

    const startTime = Date.now()
    const response = await processAgentMessage(
      agent,
      message,
      undefined,
      `You are ${agent.name}, a ${agent.title} specialist. Keep your response concise for testing purposes.`
    )

    return NextResponse.json({
      ...response,
      testMetadata: {
        requestedFramework: framework,
        actualFramework: response.framework,
        agentId: agent.id,
        agentName: agent.name,
        totalLatency: Date.now() - startTime
      }
    })

  } catch (error) {
    console.error('AI Framework test error:', error)
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false
      },
      { status: 500 }
    )
  }
}
