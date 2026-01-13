/**
 * Environment-aware logging utility for CrewFlow
 *
 * Usage:
 *   import { logger } from '@/lib/logger'
 *   logger.debug('Some debug message', { data })
 *   logger.info('Info message')
 *   logger.warn('Warning message')
 *   logger.error('Error message', error)
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LoggerConfig {
  enabled: boolean
  level: LogLevel
  prefix?: string
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
}

class Logger {
  private config: LoggerConfig

  constructor(config?: Partial<LoggerConfig>) {
    const isDevelopment = process.env.NODE_ENV === 'development'

    this.config = {
      enabled: config?.enabled ?? isDevelopment,
      level: config?.level ?? (isDevelopment ? 'debug' : 'error'),
      prefix: config?.prefix ?? '[CrewFlow]'
    }
  }

  private shouldLog(level: LogLevel): boolean {
    if (!this.config.enabled && level !== 'error') {
      return false
    }
    return LOG_LEVELS[level] >= LOG_LEVELS[this.config.level]
  }

  private formatMessage(level: LogLevel, message: string): string {
    const timestamp = new Date().toISOString()
    return `${this.config.prefix} [${level.toUpperCase()}] ${timestamp}: ${message}`
  }

  debug(message: string, ...args: any[]): void {
    if (this.shouldLog('debug')) {
      console.log(this.formatMessage('debug', message), ...args)
    }
  }

  info(message: string, ...args: any[]): void {
    if (this.shouldLog('info')) {
      console.info(this.formatMessage('info', message), ...args)
    }
  }

  warn(message: string, ...args: any[]): void {
    if (this.shouldLog('warn')) {
      console.warn(this.formatMessage('warn', message), ...args)
    }
  }

  error(message: string, ...args: any[]): void {
    // Errors always log regardless of environment
    console.error(this.formatMessage('error', message), ...args)
  }

  /**
   * Create a child logger with a specific prefix
   */
  child(prefix: string): Logger {
    return new Logger({
      ...this.config,
      prefix: `${this.config.prefix} [${prefix}]`
    })
  }
}

// Singleton instance for general use
export const logger = new Logger()

// Factory function to create loggers for specific modules
export function createLogger(module: string): Logger {
  return logger.child(module)
}

// Quick check if debug logging is enabled
export const isDebugEnabled = (): boolean => {
  return process.env.NODE_ENV === 'development'
}
