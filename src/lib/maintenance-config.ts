/**
 * Maintenance Mode Configuration Logic for CrewFlow
 * 
 * Handles automated maintenance mode decisions based on environment,
 * manual overrides, and safety constraints.
 */

import { 
  getEnvironmentContext, 
  shouldBypassMaintenance, 
  shouldAutoEnableMaintenance,
  getEnvironmentDescription,
  logEnvironmentContext
} from './environment'

export interface MaintenanceStatus {
  maintenanceMode: boolean
  reason: string
  environment: string
  canBypass: boolean
  overrideActive: boolean
  autoModeEnabled: boolean
}

/**
 * Determines the current maintenance mode status
 */
export function getMaintenanceStatus(): MaintenanceStatus {
  const env = getEnvironmentContext()
  
  // Log environment context for debugging
  if (process.env.NODE_ENV === 'development') {
    logEnvironmentContext()
  }
  
  // Check for manual override first (highest priority)
  const manualOverride = process.env.MAINTENANCE_MODE_OVERRIDE
  if (manualOverride !== undefined && manualOverride !== '') {
    const isMaintenanceMode = manualOverride === 'true'
    return {
      maintenanceMode: isMaintenanceMode,
      reason: `Manual override: ${manualOverride}`,
      environment: getEnvironmentDescription(),
      canBypass: true,
      overrideActive: true,
      autoModeEnabled: false
    }
  }
  
  // Check if automated maintenance mode is disabled
  const autoMaintenanceEnabled = process.env.AUTO_MAINTENANCE_MODE !== 'false'
  if (!autoMaintenanceEnabled) {
    // Fall back to legacy MAINTENANCE_MODE environment variable
    const legacyMaintenanceMode = process.env.MAINTENANCE_MODE === 'true'
    return {
      maintenanceMode: legacyMaintenanceMode,
      reason: `Auto-maintenance disabled, using legacy MAINTENANCE_MODE: ${legacyMaintenanceMode}`,
      environment: getEnvironmentDescription(),
      canBypass: true,
      overrideActive: false,
      autoModeEnabled: false
    }
  }
  
  // Check if environment should bypass maintenance (localhost/development)
  if (shouldBypassMaintenance()) {
    return {
      maintenanceMode: false,
      reason: `Environment bypass: ${getEnvironmentDescription()}`,
      environment: getEnvironmentDescription(),
      canBypass: true,
      overrideActive: false,
      autoModeEnabled: true
    }
  }
  
  // Check if maintenance should be automatically enabled
  const shouldAutoEnable = shouldAutoEnableMaintenance()
  if (shouldAutoEnable) {
    return {
      maintenanceMode: true,
      reason: `Auto-enabled for ${getEnvironmentDescription()} deployment`,
      environment: getEnvironmentDescription(),
      canBypass: true,
      overrideActive: false,
      autoModeEnabled: true
    }
  }
  
  // Default: check legacy MAINTENANCE_MODE or disable
  const legacyMaintenanceMode = process.env.MAINTENANCE_MODE === 'true'
  return {
    maintenanceMode: legacyMaintenanceMode,
    reason: legacyMaintenanceMode 
      ? `Legacy MAINTENANCE_MODE enabled`
      : `No maintenance conditions met`,
    environment: getEnvironmentDescription(),
    canBypass: true,
    overrideActive: false,
    autoModeEnabled: true
  }
}

/**
 * Validates maintenance mode configuration
 */
export function validateMaintenanceConfig(): {
  isValid: boolean
  warnings: string[]
  errors: string[]
} {
  const warnings: string[] = []
  const errors: string[] = []
  
  // Check for required environment variables
  if (!process.env.MAINTENANCE_PASSWORD) {
    errors.push('MAINTENANCE_PASSWORD environment variable is not set')
  }
  
  // Check for conflicting configurations
  const hasManualOverride = process.env.MAINTENANCE_MODE_OVERRIDE !== undefined
  const hasLegacyMode = process.env.MAINTENANCE_MODE !== undefined
  const hasAutoMode = process.env.AUTO_MAINTENANCE_MODE !== undefined
  
  if (hasManualOverride && hasLegacyMode) {
    warnings.push('Both MAINTENANCE_MODE_OVERRIDE and MAINTENANCE_MODE are set. Override takes precedence.')
  }
  
  if (hasAutoMode && process.env.AUTO_MAINTENANCE_MODE === 'false' && hasManualOverride) {
    warnings.push('AUTO_MAINTENANCE_MODE is disabled but MAINTENANCE_MODE_OVERRIDE is set.')
  }
  
  // Validate boolean values
  const booleanEnvVars = [
    'AUTO_MAINTENANCE_MODE',
    'MAINTENANCE_MODE',
    'MAINTENANCE_MODE_OVERRIDE',
    'LOCALHOST_BYPASS',
    'MAINTENANCE_ON_PRODUCTION',
    'MAINTENANCE_ON_PREVIEW'
  ]
  
  for (const envVar of booleanEnvVars) {
    const value = process.env[envVar]
    if (value !== undefined && value !== 'true' && value !== 'false' && value !== '') {
      warnings.push(`${envVar} should be 'true', 'false', or empty. Current value: '${value}'`)
    }
  }
  
  return {
    isValid: errors.length === 0,
    warnings,
    errors
  }
}

/**
 * Gets maintenance mode configuration summary for debugging
 */
export function getMaintenanceConfigSummary(): Record<string, any> {
  const env = getEnvironmentContext()
  const status = getMaintenanceStatus()
  const validation = validateMaintenanceConfig()
  
  return {
    status,
    environment: env,
    validation,
    environmentVariables: {
      AUTO_MAINTENANCE_MODE: process.env.AUTO_MAINTENANCE_MODE,
      MAINTENANCE_MODE: process.env.MAINTENANCE_MODE,
      MAINTENANCE_MODE_OVERRIDE: process.env.MAINTENANCE_MODE_OVERRIDE,
      LOCALHOST_BYPASS: process.env.LOCALHOST_BYPASS,
      MAINTENANCE_ON_PRODUCTION: process.env.MAINTENANCE_ON_PRODUCTION,
      MAINTENANCE_ON_PREVIEW: process.env.MAINTENANCE_ON_PREVIEW,
      MAINTENANCE_PASSWORD: process.env.MAINTENANCE_PASSWORD ? '[SET]' : '[NOT SET]',
      NODE_ENV: process.env.NODE_ENV,
      VERCEL_ENV: process.env.VERCEL_ENV,
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL
    }
  }
}
