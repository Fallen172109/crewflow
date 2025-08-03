// Agent Integration Test API
// Endpoint to test the maritime agent integration system

import { NextRequest, NextResponse } from 'next/server'
import { AgentIntegrationTester } from '@/lib/ai/agent-integration-test'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const testType = searchParams.get('type') || 'basic'

    const tester = new AgentIntegrationTester()

    switch (testType) {
      case 'smoke':
        const smokeTestResult = await tester.runSmokeTest()
        return NextResponse.json({
          success: true,
          testType: 'smoke',
          result: smokeTestResult,
          message: smokeTestResult ? 
            'Maritime agent integration is working correctly' : 
            'Maritime agent integration has issues'
        })

      case 'health':
        const healthStatus = await tester.testAgentEndpointHealth()
        const healthResults = Object.fromEntries(healthStatus)
        const healthyAgents = Array.from(healthStatus.values()).filter(Boolean).length
        const totalAgents = healthStatus.size

        return NextResponse.json({
          success: true,
          testType: 'health',
          results: healthResults,
          summary: {
            healthy: healthyAgents,
            total: totalAgents,
            healthPercentage: (healthyAgents / totalAgents) * 100
          }
        })

      case 'expertise':
        const expertiseMapping = tester.testAgentExpertiseMapping()
        return NextResponse.json({
          success: true,
          testType: 'expertise',
          results: expertiseMapping,
          summary: {
            totalAgents: expertiseMapping.length,
            agentIds: expertiseMapping.map(e => e.agentId)
          }
        })

      case 'cross-agent':
        const crossAgentResults = await tester.testCrossAgentScenarios()
        const crossAgentPassed = crossAgentResults.filter(r => r.success).length
        
        return NextResponse.json({
          success: true,
          testType: 'cross-agent',
          results: crossAgentResults,
          summary: {
            total: crossAgentResults.length,
            passed: crossAgentPassed,
            failed: crossAgentResults.length - crossAgentPassed,
            passRate: (crossAgentPassed / crossAgentResults.length) * 100
          }
        })

      case 'full':
      case 'basic':
      default:
        const integrationResults = await tester.runIntegrationTests()
        const passedTests = integrationResults.filter(r => r.success).length
        const report = tester.generateTestReport(integrationResults)

        return NextResponse.json({
          success: true,
          testType: 'full',
          results: integrationResults,
          report,
          summary: {
            total: integrationResults.length,
            passed: passedTests,
            failed: integrationResults.length - passedTests,
            passRate: (passedTests / integrationResults.length) * 100,
            averageExecutionTime: integrationResults.reduce((sum, r) => sum + r.executionTime, 0) / integrationResults.length,
            averageConfidence: integrationResults.reduce((sum, r) => sum + r.confidence, 0) / integrationResults.length
          }
        })
    }
  } catch (error) {
    console.error('Agent integration test error:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Failed to run agent integration tests'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { message, userId = 'test-user', agentId = 'shopify-ai', threadId = 'test-thread' } = await request.json()

    if (!message) {
      return NextResponse.json({
        success: false,
        error: 'Message is required'
      }, { status: 400 })
    }

    const tester = new AgentIntegrationTester()
    
    // Test single message routing and processing
    const startTime = Date.now()
    
    // Get routing decision
    const routingDecision = tester['agentRouter'].routeToAgent(
      message,
      {
        primaryIntent: {
          type: 'general_query',
          category: 'shopify_management'
        },
        confidence: 0.8,
        complexity: 'medium',
        urgency: 'normal',
        requiredInformation: []
      }
    )

    // Process through orchestrator
    const orchestratorResponse = await tester['orchestrator'].processMessage({
      message,
      userId,
      agentId,
      threadId,
      context: { storeId: 'test-store' }
    })

    const executionTime = Date.now() - startTime

    return NextResponse.json({
      success: true,
      message: 'Single message test completed',
      input: {
        message,
        userId,
        agentId,
        threadId
      },
      routing: {
        selectedAgent: routingDecision.selectedAgent.id,
        agentName: routingDecision.selectedAgent.name,
        confidence: routingDecision.confidence,
        reasoning: routingDecision.reasoning,
        fallbackAgents: routingDecision.fallbackAgents.map(a => a.id),
        estimatedComplexity: routingDecision.estimatedComplexity
      },
      response: {
        content: orchestratorResponse.response,
        maritimePersonality: orchestratorResponse.maritimePersonality,
        suggestedActions: orchestratorResponse.suggestedActions.slice(0, 3), // First 3 suggestions
        confidence: orchestratorResponse.confidence
      },
      performance: {
        executionTime,
        tokensUsed: orchestratorResponse.conversationState?.tokensUsed || 0
      }
    })
  } catch (error) {
    console.error('Single message test error:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Failed to process single message test'
    }, { status: 500 })
  }
}

// Health check for the test endpoint itself
export async function HEAD() {
  return new NextResponse(null, { 
    status: 200,
    headers: {
      'X-Agent-Integration-Test': 'Available',
      'X-Test-Types': 'smoke,health,expertise,cross-agent,full,basic'
    }
  })
}
