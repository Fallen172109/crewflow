/**
 * Test suite for intelligent agent routing system
 */

import { analyzeDomain, shouldReferToSpecialist, generateReferralResponse } from '../agent-routing'
import { AGENTS } from '../../agents'

describe('Agent Routing System', () => {
  const availableAgents = Object.values(AGENTS)
  const coralAgent = AGENTS.coral
  const splashAgent = AGENTS.splash
  const anchorAgent = AGENTS.anchor

  describe('analyzeDomain', () => {
    test('should detect social media domain', () => {
      const message = "I need help creating a social media strategy for Instagram and Facebook"
      const analysis = analyzeDomain(message)
      
      expect(analysis.primaryDomain).toBe('social')
      expect(analysis.confidence).toBeGreaterThan(0.5)
      expect(analysis.keywords).toContain('social media')
      expect(analysis.requiresSpecialist).toBe(true)
    })

    test('should detect financial domain', () => {
      const message = "Can you help me analyze our budget and create a financial forecast?"
      const analysis = analyzeDomain(message)
      
      expect(analysis.primaryDomain).toBe('finance')
      expect(analysis.confidence).toBeGreaterThan(0.5)
      expect(analysis.requiresSpecialist).toBe(true)
    })

    test('should detect technical domain', () => {
      const message = "I'm having issues with API integration and database connectivity"
      const analysis = analyzeDomain(message)
      
      expect(analysis.primaryDomain).toBe('technical')
      expect(analysis.confidence).toBeGreaterThan(0.5)
      expect(analysis.requiresSpecialist).toBe(true)
    })

    test('should handle basic questions with low confidence', () => {
      const message = "Hello, how are you?"
      const analysis = analyzeDomain(message)
      
      expect(analysis.confidence).toBeLessThan(0.5)
      expect(analysis.complexity).toBe('basic')
      expect(analysis.requiresSpecialist).toBe(false)
    })

    test('should determine complexity correctly', () => {
      const simpleMessage = "What is social media?"
      const complexMessage = "I need a comprehensive social media automation workflow with advanced analytics integration for multi-platform content distribution and engagement optimization"
      
      const simpleAnalysis = analyzeDomain(simpleMessage)
      const complexAnalysis = analyzeDomain(complexMessage)
      
      expect(simpleAnalysis.complexity).toBe('basic')
      expect(complexAnalysis.complexity).toBe('advanced')
    })
  })

  describe('shouldReferToSpecialist', () => {
    test('should refer social media questions from customer support agent', () => {
      const message = "I need help with Instagram marketing strategy and content calendar"
      const domainAnalysis = analyzeDomain(message)
      const referralDecision = shouldReferToSpecialist(coralAgent, domainAnalysis, availableAgents)
      
      expect(referralDecision.shouldRefer).toBe(true)
      expect(referralDecision.targetAgent?.id).toBe('splash')
      expect(referralDecision.confidence).toBeGreaterThan(0.5)
    })

    test('should not refer questions within agent domain', () => {
      const message = "I need help with customer support workflows and ticket management"
      const domainAnalysis = analyzeDomain(message)
      const referralDecision = shouldReferToSpecialist(coralAgent, domainAnalysis, availableAgents)
      
      expect(referralDecision.shouldRefer).toBe(false)
    })

    test('should not refer basic questions', () => {
      const message = "What is social media?"
      const domainAnalysis = analyzeDomain(message)
      const referralDecision = shouldReferToSpecialist(coralAgent, domainAnalysis, availableAgents)
      
      expect(referralDecision.shouldRefer).toBe(false)
    })

    test('should refer supply chain questions to Anchor', () => {
      const message = "I need help with inventory management and supplier optimization"
      const domainAnalysis = analyzeDomain(message)
      const referralDecision = shouldReferToSpecialist(coralAgent, domainAnalysis, availableAgents)
      
      expect(referralDecision.shouldRefer).toBe(true)
      expect(referralDecision.targetAgent?.id).toBe('anchor')
    })
  })

  describe('generateReferralResponse', () => {
    test('should generate maritime-themed referral response', () => {
      const message = "I need help with social media strategy"
      const domainAnalysis = analyzeDomain(message)
      const referralDecision = shouldReferToSpecialist(coralAgent, domainAnalysis, availableAgents)
      
      if (referralDecision.shouldRefer) {
        const referralResponse = generateReferralResponse(coralAgent, referralDecision, message)
        
        expect(referralResponse.response).toContain('Splash')
        expect(referralResponse.response).toContain('specialist')
        expect(referralResponse.response).toMatch(/ahoy|navigator|crew|maritime|chart|course/i)
        expect(referralResponse.targetAgentId).toBe('splash')
        expect(referralResponse.targetAgentName).toBe('Splash')
      }
    })

    test('should include referral reason in response', () => {
      const message = "I need help with financial analysis and budgeting"
      const domainAnalysis = analyzeDomain(message)
      const referralDecision = shouldReferToSpecialist(coralAgent, domainAnalysis, availableAgents)
      
      if (referralDecision.shouldRefer) {
        const referralResponse = generateReferralResponse(coralAgent, referralDecision, message)
        
        expect(referralResponse.response).toContain(referralDecision.reason)
        expect(referralResponse.referralReason).toBe(referralDecision.reason)
      }
    })
  })

  describe('Edge Cases', () => {
    test('should handle empty messages', () => {
      const message = ""
      const analysis = analyzeDomain(message)
      
      expect(analysis.primaryDomain).toBe('general')
      expect(analysis.confidence).toBe(0)
      expect(analysis.requiresSpecialist).toBe(false)
    })

    test('should handle messages with multiple domains', () => {
      const message = "I need help with social media marketing and financial budgeting for my campaign"
      const analysis = analyzeDomain(message)
      
      // Should pick the domain with highest keyword count
      expect(['social', 'finance', 'marketing']).toContain(analysis.primaryDomain)
      expect(analysis.confidence).toBeGreaterThan(0)
    })

    test('should not refer when no suitable specialist exists', () => {
      // Create a mock agent with no matching specialist
      const mockAgent = { ...coralAgent, id: 'unknown' }
      const message = "I need help with unknown domain expertise"
      const domainAnalysis = { ...analyzeDomain(message), primaryDomain: 'unknown' }
      const referralDecision = shouldReferToSpecialist(mockAgent, domainAnalysis, availableAgents)
      
      expect(referralDecision.shouldRefer).toBe(false)
    })
  })

  describe('Integration Tests', () => {
    test('should complete full routing workflow', () => {
      const message = "I need comprehensive social media automation with advanced analytics"
      
      // Step 1: Analyze domain
      const domainAnalysis = analyzeDomain(message)
      expect(domainAnalysis.primaryDomain).toBe('social')
      expect(domainAnalysis.complexity).toBe('advanced')
      
      // Step 2: Check if referral is needed
      const referralDecision = shouldReferToSpecialist(coralAgent, domainAnalysis, availableAgents)
      expect(referralDecision.shouldRefer).toBe(true)
      expect(referralDecision.targetAgent?.id).toBe('splash')
      
      // Step 3: Generate referral response
      const referralResponse = generateReferralResponse(coralAgent, referralDecision, message)
      expect(referralResponse.response).toBeTruthy()
      expect(referralResponse.targetAgentId).toBe('splash')
    })
  })
})
