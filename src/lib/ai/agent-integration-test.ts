// Agent Integration Test
// Tests the maritime agent integration with existing endpoints

import { EnhancedChatOrchestrator } from './enhanced-chat-orchestrator'
import { MaritimeAgentRouter } from './maritime-agent-router'
import { AgentEndpointBridge } from './agent-endpoint-bridge'
import { AGENTS } from '@/lib/agents'

export interface AgentIntegrationTestResult {
  testName: string
  success: boolean
  selectedAgent: string
  confidence: number
  reasoning: string
  response: string
  executionTime: number
  errors?: string[]
}

export class AgentIntegrationTester {
  private orchestrator: EnhancedChatOrchestrator
  private agentRouter: MaritimeAgentRouter
  private agentBridge: AgentEndpointBridge

  constructor() {
    this.orchestrator = new EnhancedChatOrchestrator()
    this.agentRouter = new MaritimeAgentRouter()
    this.agentBridge = new AgentEndpointBridge()
  }

  /**
   * Run comprehensive agent integration tests
   */
  async runIntegrationTests(): Promise<AgentIntegrationTestResult[]> {
    const testCases = [
      {
        name: 'Inventory Management Routing',
        message: 'I need to update my inventory levels for low stock products',
        expectedAgent: 'anchor'
      },
      {
        name: 'Product Research Routing',
        message: 'Help me research trending products in my niche',
        expectedAgent: 'sage'
      },
      {
        name: 'Store Operations Routing',
        message: 'Set up automated workflows for order processing',
        expectedAgent: 'helm'
      },
      {
        name: 'Financial Analysis Routing',
        message: 'Analyze my pricing strategy and profit margins',
        expectedAgent: 'ledger'
      },
      {
        name: 'Technical Support Routing',
        message: 'My Shopify integration is having performance issues',
        expectedAgent: 'patch'
      },
      {
        name: 'Market Intelligence Routing',
        message: 'What are the latest market trends in e-commerce?',
        expectedAgent: 'pearl'
      },
      {
        name: 'Sales Optimization Routing',
        message: 'Improve my conversion rates and sales funnel',
        expectedAgent: 'flint'
      },
      {
        name: 'Project Management Routing',
        message: 'Plan a product launch campaign with timeline',
        expectedAgent: 'beacon'
      },
      {
        name: 'Product Creation Routing',
        message: 'Create a new product listing with images',
        expectedAgent: 'splash'
      },
      {
        name: 'Customer Service Routing',
        message: 'Handle customer complaints and improve satisfaction',
        expectedAgent: 'drake'
      }
    ]

    const results: AgentIntegrationTestResult[] = []

    for (const testCase of testCases) {
      const result = await this.runSingleTest(testCase)
      results.push(result)
    }

    return results
  }

  /**
   * Run a single agent routing test
   */
  private async runSingleTest(testCase: {
    name: string
    message: string
    expectedAgent: string
  }): Promise<AgentIntegrationTestResult> {
    const startTime = Date.now()
    const errors: string[] = []

    try {
      // Test the routing decision
      const routingDecision = this.agentRouter.routeToAgent(
        testCase.message,
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

      // Check if routing is correct
      const routingCorrect = routingDecision.selectedAgent.id === testCase.expectedAgent
      if (!routingCorrect) {
        errors.push(`Expected ${testCase.expectedAgent}, got ${routingDecision.selectedAgent.id}`)
      }

      // Test the full orchestrator
      const orchestratorResponse = await this.orchestrator.processMessage({
        message: testCase.message,
        userId: 'test-user-123',
        agentId: 'shopify-ai',
        threadId: 'test-thread-456',
        context: { storeId: 'test-store-789' }
      })

      const executionTime = Date.now() - startTime

      return {
        testName: testCase.name,
        success: errors.length === 0,
        selectedAgent: routingDecision.selectedAgent.id,
        confidence: routingDecision.confidence,
        reasoning: routingDecision.reasoning,
        response: orchestratorResponse.response.substring(0, 200) + '...',
        executionTime,
        errors: errors.length > 0 ? errors : undefined
      }
    } catch (error) {
      const executionTime = Date.now() - startTime
      errors.push(error instanceof Error ? error.message : 'Unknown error')

      return {
        testName: testCase.name,
        success: false,
        selectedAgent: 'error',
        confidence: 0,
        reasoning: 'Test execution failed',
        response: 'Error occurred during test',
        executionTime,
        errors
      }
    }
  }

  /**
   * Test agent endpoint health
   */
  async testAgentEndpointHealth(): Promise<Map<string, boolean>> {
    return await this.agentBridge.batchHealthCheck()
  }

  /**
   * Test agent expertise mapping
   */
  testAgentExpertiseMapping(): { agentId: string; expertise: any }[] {
    const allExpertise = this.agentRouter.getAllAgentExpertise()
    
    return allExpertise.map(expertise => ({
      agentId: expertise.agentId,
      expertise: {
        shopifyCapabilities: expertise.shopifyCapabilities,
        primaryDomains: expertise.primaryDomains,
        complexityLevel: expertise.complexityLevel,
        maritimePersonality: expertise.maritimePersonality
      }
    }))
  }

  /**
   * Test cross-agent routing scenarios
   */
  async testCrossAgentScenarios(): Promise<AgentIntegrationTestResult[]> {
    const crossAgentScenarios = [
      {
        name: 'Inventory to Financial Analysis',
        messages: [
          'Check my current inventory levels',
          'Now analyze the financial impact of this inventory'
        ],
        expectedAgents: ['anchor', 'ledger']
      },
      {
        name: 'Research to Product Creation',
        messages: [
          'Research trending products in electronics',
          'Create a product listing based on this research'
        ],
        expectedAgents: ['sage', 'splash']
      },
      {
        name: 'Technical Issue to Operations',
        messages: [
          'Fix my Shopify API integration errors',
          'Set up monitoring to prevent future issues'
        ],
        expectedAgents: ['patch', 'helm']
      }
    ]

    const results: AgentIntegrationTestResult[] = []

    for (const scenario of crossAgentScenarios) {
      for (let i = 0; i < scenario.messages.length; i++) {
        const message = scenario.messages[i]
        const expectedAgent = scenario.expectedAgents[i]
        
        const result = await this.runSingleTest({
          name: `${scenario.name} - Step ${i + 1}`,
          message,
          expectedAgent
        })
        
        results.push(result)
      }
    }

    return results
  }

  /**
   * Generate test report
   */
  generateTestReport(results: AgentIntegrationTestResult[]): string {
    const totalTests = results.length
    const passedTests = results.filter(r => r.success).length
    const failedTests = totalTests - passedTests
    const averageExecutionTime = results.reduce((sum, r) => sum + r.executionTime, 0) / totalTests
    const averageConfidence = results.reduce((sum, r) => sum + r.confidence, 0) / totalTests

    let report = `# Maritime Agent Integration Test Report\n\n`
    report += `## Summary\n`
    report += `- **Total Tests**: ${totalTests}\n`
    report += `- **Passed**: ${passedTests} (${((passedTests / totalTests) * 100).toFixed(1)}%)\n`
    report += `- **Failed**: ${failedTests} (${((failedTests / totalTests) * 100).toFixed(1)}%)\n`
    report += `- **Average Execution Time**: ${averageExecutionTime.toFixed(0)}ms\n`
    report += `- **Average Routing Confidence**: ${(averageConfidence * 100).toFixed(1)}%\n\n`

    report += `## Test Results\n\n`
    
    results.forEach(result => {
      const status = result.success ? '✅' : '❌'
      report += `### ${status} ${result.testName}\n`
      report += `- **Selected Agent**: ${result.selectedAgent}\n`
      report += `- **Confidence**: ${(result.confidence * 100).toFixed(1)}%\n`
      report += `- **Reasoning**: ${result.reasoning}\n`
      report += `- **Execution Time**: ${result.executionTime}ms\n`
      
      if (result.errors && result.errors.length > 0) {
        report += `- **Errors**: ${result.errors.join(', ')}\n`
      }
      
      report += `- **Response Preview**: ${result.response}\n\n`
    })

    // Agent expertise summary
    const expertiseMapping = this.testAgentExpertiseMapping()
    report += `## Agent Expertise Mapping\n\n`
    
    expertiseMapping.forEach(({ agentId, expertise }) => {
      const agent = AGENTS[agentId]
      if (agent) {
        report += `### ${agent.name} (${agent.title})\n`
        report += `- **Shopify Capabilities**: ${expertise.shopifyCapabilities.join(', ')}\n`
        report += `- **Primary Domains**: ${expertise.primaryDomains.join(', ')}\n`
        report += `- **Complexity Level**: ${expertise.complexityLevel}\n`
        report += `- **Maritime Personality**: ${expertise.maritimePersonality}\n\n`
      }
    })

    return report
  }

  /**
   * Run quick smoke test
   */
  async runSmokeTest(): Promise<boolean> {
    try {
      const testMessage = "Help me manage my Shopify store inventory"
      
      const response = await this.orchestrator.processMessage({
        message: testMessage,
        userId: 'smoke-test-user',
        agentId: 'shopify-ai',
        threadId: 'smoke-test-thread'
      })

      return response.selectedAgent !== undefined && 
             response.routingDecision !== undefined &&
             response.response.length > 0
    } catch (error) {
      console.error('Smoke test failed:', error)
      return false
    }
  }
}
