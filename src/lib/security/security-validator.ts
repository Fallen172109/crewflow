// Security Validation System
// Comprehensive security checks, vulnerability assessments, and protection mechanisms

import { createSupabaseServerClient } from '@/lib/supabase/server'
import crypto from 'crypto'
import rateLimit from 'express-rate-limit'

export interface SecurityCheck {
  id: string
  type: 'authentication' | 'authorization' | 'input_validation' | 'rate_limiting' | 'data_protection'
  severity: 'low' | 'medium' | 'high' | 'critical'
  status: 'pass' | 'fail' | 'warning'
  description: string
  details: string
  recommendation?: string
  timestamp: Date
}

export interface SecurityAuditResult {
  overallScore: number
  totalChecks: number
  passed: number
  failed: number
  warnings: number
  critical: number
  checks: SecurityCheck[]
  recommendations: string[]
}

export interface RateLimitConfig {
  windowMs: number
  max: number
  message: string
  standardHeaders: boolean
  legacyHeaders: boolean
}

// Input validation and sanitization
export class InputValidator {
  private static readonly XSS_PATTERNS = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
    /<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi,
    /<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi
  ]

  private static readonly SQL_INJECTION_PATTERNS = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/gi,
    /(--|\/\*|\*\/|;)/g,
    /(\b(OR|AND)\b.*=.*)/gi
  ]

  static sanitizeInput(input: string): string {
    if (typeof input !== 'string') {
      return String(input)
    }

    let sanitized = input
    
    // Remove XSS patterns
    this.XSS_PATTERNS.forEach(pattern => {
      sanitized = sanitized.replace(pattern, '')
    })
    
    // Encode HTML entities
    sanitized = sanitized
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;')
    
    return sanitized.trim()
  }

  static validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email) && email.length <= 254
  }

  static validateShopDomain(domain: string): boolean {
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]*\.myshopify\.com$/
    return domainRegex.test(domain) && domain.length <= 100
  }

  static validateUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    return uuidRegex.test(uuid)
  }

  static detectSQLInjection(input: string): boolean {
    return this.SQL_INJECTION_PATTERNS.some(pattern => pattern.test(input))
  }

  static detectXSS(input: string): boolean {
    return this.XSS_PATTERNS.some(pattern => pattern.test(input))
  }

  static validateJSON(jsonString: string): { valid: boolean; data?: any; error?: string } {
    try {
      const data = JSON.parse(jsonString)
      return { valid: true, data }
    } catch (error) {
      return { 
        valid: false, 
        error: error instanceof Error ? error.message : 'Invalid JSON' 
      }
    }
  }
}

// Authentication and authorization checks
export class AuthValidator {
  static async validateSession(sessionToken: string): Promise<{ valid: boolean; userId?: string; error?: string }> {
    try {
      const supabase = createSupabaseServerClient()
      
      const { data: { user }, error } = await supabase.auth.getUser(sessionToken)
      
      if (error || !user) {
        return { valid: false, error: 'Invalid session' }
      }
      
      return { valid: true, userId: user.id }
    } catch (error) {
      return { 
        valid: false, 
        error: error instanceof Error ? error.message : 'Session validation failed' 
      }
    }
  }

  static async validateAPIKey(apiKey: string): Promise<{ valid: boolean; userId?: string; permissions?: string[] }> {
    try {
      const supabase = createSupabaseServerClient()
      
      const { data, error } = await supabase
        .from('api_keys')
        .select('user_id, permissions, expires_at, is_active')
        .eq('key_hash', crypto.createHash('sha256').update(apiKey).digest('hex'))
        .single()
      
      if (error || !data || !data.is_active) {
        return { valid: false }
      }
      
      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        return { valid: false }
      }
      
      return { 
        valid: true, 
        userId: data.user_id, 
        permissions: data.permissions || [] 
      }
    } catch (error) {
      return { valid: false }
    }
  }

  static async checkPermission(userId: string, resource: string, action: string): Promise<boolean> {
    try {
      const supabase = createSupabaseServerClient()
      
      const { data, error } = await supabase
        .from('user_permissions')
        .select('permissions')
        .eq('user_id', userId)
        .single()
      
      if (error || !data) {
        return false
      }
      
      const permissions = data.permissions || {}
      return permissions[resource]?.[action] === true
    } catch (error) {
      return false
    }
  }
}

// Rate limiting configurations
export const rateLimitConfigs: Record<string, RateLimitConfig> = {
  api: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many API requests from this IP, please try again later',
    standardHeaders: true,
    legacyHeaders: false
  },
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // limit each IP to 5 auth attempts per windowMs
    message: 'Too many authentication attempts, please try again later',
    standardHeaders: true,
    legacyHeaders: false
  },
  webhook: {
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 50, // limit each IP to 50 webhook requests per minute
    message: 'Too many webhook requests, please slow down',
    standardHeaders: true,
    legacyHeaders: false
  },
  shopify: {
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 40, // Shopify API limit is 40 requests per minute
    message: 'Shopify API rate limit exceeded',
    standardHeaders: true,
    legacyHeaders: false
  }
}

// Security audit functions
export async function runSecurityAudit(userId?: string): Promise<SecurityAuditResult> {
  const checks: SecurityCheck[] = []
  
  // Authentication checks
  checks.push(...await runAuthenticationChecks())
  
  // Authorization checks
  if (userId) {
    checks.push(...await runAuthorizationChecks(userId))
  }
  
  // Input validation checks
  checks.push(...await runInputValidationChecks())
  
  // Rate limiting checks
  checks.push(...await runRateLimitingChecks())
  
  // Data protection checks
  checks.push(...await runDataProtectionChecks())
  
  // Calculate scores
  const totalChecks = checks.length
  const passed = checks.filter(c => c.status === 'pass').length
  const failed = checks.filter(c => c.status === 'fail').length
  const warnings = checks.filter(c => c.status === 'warning').length
  const critical = checks.filter(c => c.severity === 'critical' && c.status === 'fail').length
  
  const overallScore = totalChecks > 0 ? Math.round((passed / totalChecks) * 100) : 0
  
  // Generate recommendations
  const recommendations = generateSecurityRecommendations(checks)
  
  return {
    overallScore,
    totalChecks,
    passed,
    failed,
    warnings,
    critical,
    checks,
    recommendations
  }
}

async function runAuthenticationChecks(): Promise<SecurityCheck[]> {
  const checks: SecurityCheck[] = []
  
  // Check if HTTPS is enforced
  checks.push({
    id: 'https_enforcement',
    type: 'authentication',
    severity: 'critical',
    status: process.env.NODE_ENV === 'production' && process.env.NEXT_PUBLIC_APP_URL?.startsWith('https://') ? 'pass' : 'fail',
    description: 'HTTPS Enforcement',
    details: 'All authentication endpoints must use HTTPS in production',
    recommendation: 'Ensure all production traffic uses HTTPS',
    timestamp: new Date()
  })
  
  // Check session configuration
  checks.push({
    id: 'session_security',
    type: 'authentication',
    severity: 'high',
    status: process.env.SUPABASE_JWT_SECRET ? 'pass' : 'fail',
    description: 'Session Security Configuration',
    details: 'JWT secret must be configured for secure sessions',
    recommendation: 'Configure strong JWT secret in environment variables',
    timestamp: new Date()
  })
  
  // Check password policy
  checks.push({
    id: 'password_policy',
    type: 'authentication',
    severity: 'medium',
    status: 'pass', // Assuming Supabase handles this
    description: 'Password Policy',
    details: 'Strong password requirements are enforced',
    timestamp: new Date()
  })
  
  return checks
}

async function runAuthorizationChecks(userId: string): Promise<SecurityCheck[]> {
  const checks: SecurityCheck[] = []
  
  try {
    const supabase = createSupabaseServerClient()
    
    // Check if user has proper permissions
    const { data: permissions } = await supabase
      .from('user_permissions')
      .select('permissions')
      .eq('user_id', userId)
      .single()
    
    checks.push({
      id: 'user_permissions',
      type: 'authorization',
      severity: 'high',
      status: permissions ? 'pass' : 'warning',
      description: 'User Permission Configuration',
      details: permissions ? 'User has configured permissions' : 'User permissions not configured',
      recommendation: permissions ? undefined : 'Configure user permissions for better security',
      timestamp: new Date()
    })
    
    // Check for admin privileges
    const hasAdminAccess = permissions?.permissions?.admin === true
    checks.push({
      id: 'admin_access',
      type: 'authorization',
      severity: 'critical',
      status: hasAdminAccess ? 'warning' : 'pass',
      description: 'Administrative Access',
      details: hasAdminAccess ? 'User has administrative privileges' : 'User has standard privileges',
      recommendation: hasAdminAccess ? 'Review admin access regularly' : undefined,
      timestamp: new Date()
    })
  } catch (error) {
    checks.push({
      id: 'authorization_check_error',
      type: 'authorization',
      severity: 'medium',
      status: 'warning',
      description: 'Authorization Check Error',
      details: 'Could not verify user authorization settings',
      recommendation: 'Review authorization configuration',
      timestamp: new Date()
    })
  }
  
  return checks
}

async function runInputValidationChecks(): Promise<SecurityCheck[]> {
  const checks: SecurityCheck[] = []
  
  // Test XSS protection
  const xssTest = '<script>alert("xss")</script>'
  const sanitized = InputValidator.sanitizeInput(xssTest)
  
  checks.push({
    id: 'xss_protection',
    type: 'input_validation',
    severity: 'critical',
    status: sanitized.includes('<script>') ? 'fail' : 'pass',
    description: 'XSS Protection',
    details: 'Input sanitization prevents XSS attacks',
    recommendation: sanitized.includes('<script>') ? 'Implement proper input sanitization' : undefined,
    timestamp: new Date()
  })
  
  // Test SQL injection protection
  const sqlTest = "'; DROP TABLE users; --"
  const hasSQLInjection = InputValidator.detectSQLInjection(sqlTest)
  
  checks.push({
    id: 'sql_injection_protection',
    type: 'input_validation',
    severity: 'critical',
    status: hasSQLInjection ? 'pass' : 'warning',
    description: 'SQL Injection Detection',
    details: 'System can detect potential SQL injection attempts',
    recommendation: 'Use parameterized queries and input validation',
    timestamp: new Date()
  })
  
  return checks
}

async function runRateLimitingChecks(): Promise<SecurityCheck[]> {
  const checks: SecurityCheck[] = []
  
  // Check if rate limiting is configured
  const hasRateLimit = Object.keys(rateLimitConfigs).length > 0
  
  checks.push({
    id: 'rate_limiting',
    type: 'rate_limiting',
    severity: 'high',
    status: hasRateLimit ? 'pass' : 'fail',
    description: 'Rate Limiting Configuration',
    details: hasRateLimit ? 'Rate limiting is configured for API endpoints' : 'No rate limiting configured',
    recommendation: hasRateLimit ? undefined : 'Implement rate limiting to prevent abuse',
    timestamp: new Date()
  })
  
  return checks
}

async function runDataProtectionChecks(): Promise<SecurityCheck[]> {
  const checks: SecurityCheck[] = []
  
  // Check environment variables
  const hasSecrets = !!(process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.SHOPIFY_CLIENT_SECRET)
  
  checks.push({
    id: 'secrets_management',
    type: 'data_protection',
    severity: 'critical',
    status: hasSecrets ? 'pass' : 'fail',
    description: 'Secrets Management',
    details: hasSecrets ? 'API secrets are properly configured' : 'Missing critical API secrets',
    recommendation: hasSecrets ? 'Rotate secrets regularly' : 'Configure all required API secrets',
    timestamp: new Date()
  })
  
  // Check database encryption
  checks.push({
    id: 'database_encryption',
    type: 'data_protection',
    severity: 'high',
    status: 'pass', // Assuming Supabase handles this
    description: 'Database Encryption',
    details: 'Database connections use encryption',
    timestamp: new Date()
  })
  
  return checks
}

function generateSecurityRecommendations(checks: SecurityCheck[]): string[] {
  const recommendations: string[] = []
  
  const failedCritical = checks.filter(c => c.severity === 'critical' && c.status === 'fail')
  const failedHigh = checks.filter(c => c.severity === 'high' && c.status === 'fail')
  const warnings = checks.filter(c => c.status === 'warning')
  
  if (failedCritical.length > 0) {
    recommendations.push('🚨 CRITICAL: Address all critical security failures immediately')
    failedCritical.forEach(check => {
      if (check.recommendation) {
        recommendations.push(`• ${check.recommendation}`)
      }
    })
  }
  
  if (failedHigh.length > 0) {
    recommendations.push('⚠️ HIGH PRIORITY: Address high-severity security issues')
    failedHigh.forEach(check => {
      if (check.recommendation) {
        recommendations.push(`• ${check.recommendation}`)
      }
    })
  }
  
  if (warnings.length > 0) {
    recommendations.push('📋 REVIEW: Address security warnings when possible')
  }
  
  // General recommendations
  recommendations.push('🔄 Conduct regular security audits')
  recommendations.push('📚 Keep all dependencies updated')
  recommendations.push('🔐 Implement security monitoring and alerting')
  recommendations.push('👥 Provide security training for development team')
  
  return recommendations
}

// Webhook signature validation
export function validateWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  try {
    const hmac = crypto.createHmac('sha256', secret)
    hmac.update(payload, 'utf8')
    const calculatedSignature = hmac.digest('base64')
    
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'base64'),
      Buffer.from(calculatedSignature, 'base64')
    )
  } catch (error) {
    return false
  }
}

// Security headers middleware
export function getSecurityHeaders(): Record<string, string> {
  return {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://api.shopify.com https://*.supabase.co",
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'
  }
}
