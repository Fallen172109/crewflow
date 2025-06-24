// OAuth Integration Testing & Validation System
// Comprehensive testing for OAuth flows and integration health

import { createOAuthManager } from './oauth'
import { getIntegration, getProductionReadyIntegrations, validateIntegrationConfig } from './config'
import { createErrorHandler } from './error-handler'
import { createSupabaseServerClient } from '../supabase'

export interface TestResult {
  success: boolean
  testName: string
  duration: number
  error?: string
  details?: any
  timestamp: Date
}

export interface IntegrationTestSuite {
  integrationId: string
  integrationName: string
  tests: TestResult[]
  overallSuccess: boolean
  totalDuration: number
  passedTests: number
  failedTests: number
}

export interface ValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
  score: number // 0-100
  recommendations: string[]
}

export interface HealthCheckResult {
  integrationId: string
  healthy: boolean
  issues: string[]
  lastChecked: Date
  responseTime?: number
  apiVersion?: string
  rateLimitStatus?: {
    remaining: number
    resetTime: Date
  }
}

export class IntegrationTester {
  private oauthManager = createOAuthManager()
  private errorHandler = createErrorHandler()

  // Test OAuth configuration for a specific integration
  async testOAuthConfiguration(integrationId: string): Promise<TestResult> {
    const startTime = Date.now()
    const testName = `OAuth Configuration Test - ${integrationId}`

    try {
      const integration = getIntegration(integrationId)
      if (!integration) {
        throw new Error('Integration not found')
      }

      // Validate configuration
      const validation = validateIntegrationConfig(integration)
      if (!validation.valid) {
        throw new Error(`Configuration invalid: ${validation.errors.join(', ')}`)
      }

      // Check OAuth client configuration
      const configStatus = this.oauthManager.getConfigurationStatus()
      if (!configStatus.configured.includes(integrationId)) {
        throw new Error('OAuth client credentials not configured')
      }

      return {
        success: true,
        testName,
        duration: Date.now() - startTime,
        details: {
          configurationValid: true,
          clientConfigured: true,
          warnings: validation.warnings
        },
        timestamp: new Date()
      }
    } catch (error) {
      return {
        success: false,
        testName,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      }
    }
  }

  // Test OAuth authorization URL generation
  async testAuthUrlGeneration(integrationId: string, userId: string): Promise<TestResult> {
    const startTime = Date.now()
    const testName = `Auth URL Generation Test - ${integrationId}`

    try {
      const authUrl = this.oauthManager.generateAuthUrl(integrationId, userId)
      
      // Validate URL structure
      const url = new URL(authUrl)
      const requiredParams = ['client_id', 'response_type', 'redirect_uri', 'state']
      const missingParams = requiredParams.filter(param => !url.searchParams.has(param))
      
      if (missingParams.length > 0) {
        throw new Error(`Missing required parameters: ${missingParams.join(', ')}`)
      }

      return {
        success: true,
        testName,
        duration: Date.now() - startTime,
        details: {
          authUrl,
          parameters: Object.fromEntries(url.searchParams),
          urlValid: true
        },
        timestamp: new Date()
      }
    } catch (error) {
      return {
        success: false,
        testName,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      }
    }
  }

  // Test API endpoint connectivity
  async testApiConnectivity(integrationId: string): Promise<TestResult> {
    const startTime = Date.now()
    const testName = `API Connectivity Test - ${integrationId}`

    try {
      const integration = getIntegration(integrationId)
      if (!integration) {
        throw new Error('Integration not found')
      }

      // Test basic connectivity to API endpoint
      const response = await fetch(integration.endpoints.api, {
        method: 'HEAD',
        headers: {
          'User-Agent': 'CrewFlow/1.0 (Health Check)'
        }
      })

      const responseTime = Date.now() - startTime

      return {
        success: response.ok || response.status === 401, // 401 is expected without auth
        testName,
        duration: responseTime,
        details: {
          status: response.status,
          statusText: response.statusText,
          responseTime,
          headers: Object.fromEntries(response.headers.entries())
        },
        timestamp: new Date()
      }
    } catch (error) {
      return {
        success: false,
        testName,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Network error',
        timestamp: new Date()
      }
    }
  }

  // Test database connectivity and schema
  async testDatabaseSchema(): Promise<TestResult> {
    const startTime = Date.now()
    const testName = 'Database Schema Test'

    try {
      const supabase = createSupabaseServerClient()

      // Test oauth_integrations table
      const { data: integrations, error: integrationsError } = await supabase
        .from('oauth_integrations')
        .select('id')
        .limit(1)

      if (integrationsError) {
        throw new Error(`oauth_integrations table error: ${integrationsError.message}`)
      }

      // Test oauth_audit_log table
      const { data: auditLog, error: auditError } = await supabase
        .from('oauth_audit_log')
        .select('id')
        .limit(1)

      if (auditError) {
        throw new Error(`oauth_audit_log table error: ${auditError.message}`)
      }

      // Test database functions
      const { data: functionTest, error: functionError } = await supabase
        .rpc('mark_tokens_expired')

      if (functionError) {
        throw new Error(`Database function error: ${functionError.message}`)
      }

      return {
        success: true,
        testName,
        duration: Date.now() - startTime,
        details: {
          tablesAccessible: true,
          functionsWorking: true,
          schemaValid: true
        },
        timestamp: new Date()
      }
    } catch (error) {
      return {
        success: false,
        testName,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Database error',
        timestamp: new Date()
      }
    }
  }

  // Run comprehensive test suite for an integration
  async runIntegrationTestSuite(integrationId: string, userId: string): Promise<IntegrationTestSuite> {
    const integration = getIntegration(integrationId)
    const startTime = Date.now()

    const tests: TestResult[] = []

    // Run all tests
    tests.push(await this.testOAuthConfiguration(integrationId))
    tests.push(await this.testAuthUrlGeneration(integrationId, userId))
    tests.push(await this.testApiConnectivity(integrationId))

    const passedTests = tests.filter(t => t.success).length
    const failedTests = tests.filter(t => !t.success).length

    return {
      integrationId,
      integrationName: integration?.name || integrationId,
      tests,
      overallSuccess: failedTests === 0,
      totalDuration: Date.now() - startTime,
      passedTests,
      failedTests
    }
  }

  // Run tests for all production-ready integrations
  async runFullTestSuite(userId: string): Promise<{
    suites: IntegrationTestSuite[]
    overallResults: {
      totalIntegrations: number
      passedIntegrations: number
      failedIntegrations: number
      totalTests: number
      passedTests: number
      failedTests: number
      totalDuration: number
    }
    systemTests: TestResult[]
  }> {
    const integrations = getProductionReadyIntegrations()
    const suites: IntegrationTestSuite[] = []
    const systemTests: TestResult[] = []

    // Run system-wide tests
    systemTests.push(await this.testDatabaseSchema())

    // Run tests for each integration
    for (const integration of integrations) {
      const suite = await this.runIntegrationTestSuite(integration.id, userId)
      suites.push(suite)
    }

    // Calculate overall results
    const totalTests = suites.reduce((sum, suite) => sum + suite.tests.length, 0) + systemTests.length
    const passedTests = suites.reduce((sum, suite) => sum + suite.passedTests, 0) + 
                       systemTests.filter(t => t.success).length
    const failedTests = totalTests - passedTests
    const totalDuration = suites.reduce((sum, suite) => sum + suite.totalDuration, 0) +
                          systemTests.reduce((sum, test) => sum + test.duration, 0)

    return {
      suites,
      overallResults: {
        totalIntegrations: integrations.length,
        passedIntegrations: suites.filter(s => s.overallSuccess).length,
        failedIntegrations: suites.filter(s => !s.overallSuccess).length,
        totalTests,
        passedTests,
        failedTests,
        totalDuration
      },
      systemTests
    }
  }

  // Validate integration health for a connected integration
  async validateIntegrationHealth(userId: string, integrationId: string): Promise<HealthCheckResult> {
    const startTime = Date.now()

    try {
      const testResult = await this.oauthManager.testConnection(userId, integrationId)
      const responseTime = Date.now() - startTime

      return {
        integrationId,
        healthy: testResult.healthy,
        issues: testResult.error ? [testResult.error] : [],
        lastChecked: new Date(),
        responseTime
      }
    } catch (error) {
      return {
        integrationId,
        healthy: false,
        issues: [error instanceof Error ? error.message : 'Unknown error'],
        lastChecked: new Date(),
        responseTime: Date.now() - startTime
      }
    }
  }

  // Generate integration validation report
  async generateValidationReport(integrationId: string): Promise<ValidationResult> {
    const integration = getIntegration(integrationId)
    if (!integration) {
      return {
        valid: false,
        errors: ['Integration not found'],
        warnings: [],
        score: 0,
        recommendations: ['Check integration ID and configuration']
      }
    }

    const configValidation = validateIntegrationConfig(integration)
    const configStatus = this.oauthManager.getConfigurationStatus()
    
    let score = 0
    const recommendations: string[] = []

    // Base configuration (40 points)
    if (configValidation.valid) {
      score += 40
    } else {
      recommendations.push('Fix configuration errors')
    }

    // OAuth setup (30 points)
    if (configStatus.configured.includes(integrationId)) {
      score += 30
    } else {
      recommendations.push('Configure OAuth client credentials')
    }

    // Production readiness (20 points)
    if (integration.productionReady) {
      score += 20
    } else {
      recommendations.push('Complete production readiness checklist')
    }

    // Security features (10 points)
    if (integration.oauthConfig?.pkceSupported) {
      score += 5
    }
    if (integration.features?.webhooks) {
      score += 5
    }

    if (score < 70) {
      recommendations.push('Integration needs improvement before production use')
    }

    return {
      valid: configValidation.valid && score >= 70,
      errors: configValidation.errors,
      warnings: configValidation.warnings,
      score,
      recommendations
    }
  }
}

// Create tester instance
export function createIntegrationTester(): IntegrationTester {
  return new IntegrationTester()
}
