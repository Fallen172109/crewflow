/**
 * Environment Detection Utilities for CrewFlow
 * 
 * Provides utilities to detect the current deployment environment
 * and make decisions based on hosting context.
 */

export interface EnvironmentContext {
  isLocalhost: boolean
  isProduction: boolean
  isPreview: boolean
  isDevelopment: boolean
  isVercel: boolean
  deploymentUrl?: string
  vercelEnv?: string
  nodeEnv: string
}

/**
 * Detects the current environment context
 */
export function getEnvironmentContext(): EnvironmentContext {
  const nodeEnv = process.env.NODE_ENV || 'development'
  const vercelEnv = process.env.VERCEL_ENV
  const vercelUrl = process.env.VERCEL_URL
  const appUrl = process.env.NEXT_PUBLIC_APP_URL
  
  // Detect localhost/development environment
  const isLocalhost = Boolean(
    // Check if app URL contains localhost
    appUrl?.includes('localhost') ||
    appUrl?.includes('127.0.0.1') ||
    // Check if we're in development mode without Vercel URL
    (nodeEnv === 'development' && !vercelUrl) ||
    // Check for common development ports
    appUrl?.includes(':3000') ||
    appUrl?.includes(':3001')
  )
  
  // Detect Vercel environments
  const isVercel = Boolean(vercelUrl || vercelEnv)
  const isProduction = vercelEnv === 'production'
  const isPreview = vercelEnv === 'preview'
  const isDevelopment = nodeEnv === 'development'
  
  return {
    isLocalhost,
    isProduction,
    isPreview,
    isDevelopment,
    isVercel,
    deploymentUrl: vercelUrl || appUrl,
    vercelEnv,
    nodeEnv
  }
}

/**
 * Checks if the current environment should bypass maintenance mode
 */
export function shouldBypassMaintenance(): boolean {
  const env = getEnvironmentContext()
  
  // Always bypass maintenance in localhost/development
  if (env.isLocalhost) {
    return true
  }
  
  // Check for explicit localhost bypass setting
  const localhostBypass = process.env.LOCALHOST_BYPASS !== 'false'
  if (env.isDevelopment && localhostBypass) {
    return true
  }
  
  return false
}

/**
 * Determines if maintenance mode should be automatically enabled
 */
export function shouldAutoEnableMaintenance(): boolean {
  const env = getEnvironmentContext()
  
  // Never auto-enable maintenance on localhost
  if (env.isLocalhost) {
    return false
  }
  
  // Check if auto maintenance is disabled
  const autoMaintenanceEnabled = process.env.AUTO_MAINTENANCE_MODE !== 'false'
  if (!autoMaintenanceEnabled) {
    return false
  }
  
  // Enable maintenance on production deployments by default
  if (env.isProduction) {
    const maintenanceOnProduction = process.env.MAINTENANCE_ON_PRODUCTION !== 'false'
    return maintenanceOnProduction
  }
  
  // Enable maintenance on preview deployments if configured
  if (env.isPreview) {
    const maintenanceOnPreview = process.env.MAINTENANCE_ON_PREVIEW === 'true'
    return maintenanceOnPreview
  }
  
  return false
}

/**
 * Gets a human-readable description of the current environment
 */
export function getEnvironmentDescription(): string {
  const env = getEnvironmentContext()
  
  if (env.isLocalhost) {
    return 'Local Development'
  }
  
  if (env.isProduction) {
    return 'Production (Vercel)'
  }
  
  if (env.isPreview) {
    return 'Preview (Vercel)'
  }
  
  if (env.isDevelopment) {
    return 'Development'
  }
  
  return 'Unknown Environment'
}

/**
 * Logs environment context for debugging
 */
export function logEnvironmentContext(): void {
  const env = getEnvironmentContext()
  
  console.log('🌍 Environment Context:', {
    description: getEnvironmentDescription(),
    isLocalhost: env.isLocalhost,
    isProduction: env.isProduction,
    isPreview: env.isPreview,
    isDevelopment: env.isDevelopment,
    isVercel: env.isVercel,
    deploymentUrl: env.deploymentUrl,
    vercelEnv: env.vercelEnv,
    nodeEnv: env.nodeEnv,
    shouldBypass: shouldBypassMaintenance(),
    shouldAutoEnable: shouldAutoEnableMaintenance()
  })
}
