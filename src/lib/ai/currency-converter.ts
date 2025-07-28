// Currency Conversion Service
// Handles currency conversion and localization for pricing recommendations

export interface CurrencyConversionRequest {
  amount: number
  fromCurrency: string
  toCurrency: string
}

export interface CurrencyConversionResult {
  originalAmount: number
  convertedAmount: number
  fromCurrency: string
  toCurrency: string
  exchangeRate: number
  timestamp: string
  source: string
}

export interface CurrencyFormatOptions {
  currency: string
  locale?: string
  minimumFractionDigits?: number
  maximumFractionDigits?: number
}

// Exchange rates (in production, these would come from a real API)
// For now, using approximate rates as of 2024
const EXCHANGE_RATES: Record<string, Record<string, number>> = {
  USD: {
    PLN: 4.0,
    EUR: 0.85,
    GBP: 0.73,
    CAD: 1.25,
    AUD: 1.35,
    JPY: 110,
    CHF: 0.88,
    SEK: 9.5,
    NOK: 9.8,
    DKK: 6.3
  },
  EUR: {
    USD: 1.18,
    PLN: 4.7,
    GBP: 0.86,
    CAD: 1.47,
    AUD: 1.59,
    JPY: 129,
    CHF: 1.04,
    SEK: 11.2,
    NOK: 11.5,
    DKK: 7.4
  },
  PLN: {
    USD: 0.25,
    EUR: 0.21,
    GBP: 0.18,
    CAD: 0.31,
    AUD: 0.34,
    JPY: 27.5,
    CHF: 0.22,
    SEK: 2.4,
    NOK: 2.5,
    DKK: 1.6
  },
  GBP: {
    USD: 1.37,
    EUR: 1.16,
    PLN: 5.5,
    CAD: 1.71,
    AUD: 1.85,
    JPY: 151,
    CHF: 1.21,
    SEK: 13.0,
    NOK: 13.4,
    DKK: 8.6
  }
}

export class CurrencyConverter {
  private static instance: CurrencyConverter
  private exchangeRates: Record<string, Record<string, number>>

  constructor() {
    this.exchangeRates = EXCHANGE_RATES
  }

  static getInstance(): CurrencyConverter {
    if (!CurrencyConverter.instance) {
      CurrencyConverter.instance = new CurrencyConverter()
    }
    return CurrencyConverter.instance
  }

  /**
   * Convert amount from one currency to another
   */
  async convertCurrency(request: CurrencyConversionRequest): Promise<CurrencyConversionResult> {
    const { amount, fromCurrency, toCurrency } = request

    // If same currency, return as-is
    if (fromCurrency === toCurrency) {
      return {
        originalAmount: amount,
        convertedAmount: amount,
        fromCurrency,
        toCurrency,
        exchangeRate: 1,
        timestamp: new Date().toISOString(),
        source: 'no_conversion_needed'
      }
    }

    // Get exchange rate
    const exchangeRate = this.getExchangeRate(fromCurrency, toCurrency)
    const convertedAmount = Math.round((amount * exchangeRate) * 100) / 100

    return {
      originalAmount: amount,
      convertedAmount,
      fromCurrency,
      toCurrency,
      exchangeRate,
      timestamp: new Date().toISOString(),
      source: 'internal_rates'
    }
  }

  /**
   * Get exchange rate between two currencies
   */
  private getExchangeRate(fromCurrency: string, toCurrency: string): number {
    const fromRates = this.exchangeRates[fromCurrency.toUpperCase()]
    if (!fromRates) {
      console.warn(`Exchange rate not found for ${fromCurrency}, using 1:1`)
      return 1
    }

    const rate = fromRates[toCurrency.toUpperCase()]
    if (!rate) {
      console.warn(`Exchange rate not found for ${fromCurrency} to ${toCurrency}, using 1:1`)
      return 1
    }

    return rate
  }

  /**
   * Format currency amount for display
   */
  formatCurrency(amount: number, options: CurrencyFormatOptions): string {
    const { currency, locale = 'en-US', minimumFractionDigits = 2, maximumFractionDigits = 2 } = options

    // Special handling for PLN (Polish Złoty)
    if (currency.toUpperCase() === 'PLN') {
      return new Intl.NumberFormat('pl-PL', {
        style: 'currency',
        currency: 'PLN',
        minimumFractionDigits,
        maximumFractionDigits
      }).format(amount)
    }

    // Handle other currencies
    const currencyLocales: Record<string, string> = {
      USD: 'en-US',
      EUR: 'de-DE',
      GBP: 'en-GB',
      CAD: 'en-CA',
      AUD: 'en-AU',
      JPY: 'ja-JP',
      CHF: 'de-CH',
      SEK: 'sv-SE',
      NOK: 'nb-NO',
      DKK: 'da-DK'
    }

    const currencyLocale = currencyLocales[currency.toUpperCase()] || locale

    try {
      return new Intl.NumberFormat(currencyLocale, {
        style: 'currency',
        currency: currency.toUpperCase(),
        minimumFractionDigits,
        maximumFractionDigits
      }).format(amount)
    } catch (error) {
      console.warn(`Error formatting currency ${currency}:`, error)
      return `${amount.toFixed(2)} ${currency.toUpperCase()}`
    }
  }

  /**
   * Convert and format price range
   */
  async convertAndFormatPriceRange(
    minPrice: number,
    maxPrice: number,
    fromCurrency: string,
    toCurrency: string,
    locale?: string
  ): Promise<string> {
    const minConversion = await this.convertCurrency({
      amount: minPrice,
      fromCurrency,
      toCurrency
    })

    const maxConversion = await this.convertCurrency({
      amount: maxPrice,
      fromCurrency,
      toCurrency
    })

    const formattedMin = this.formatCurrency(minConversion.convertedAmount, {
      currency: toCurrency,
      locale
    })

    const formattedMax = this.formatCurrency(maxConversion.convertedAmount, {
      currency: toCurrency,
      locale
    })

    return `${formattedMin} - ${formattedMax}`
  }

  /**
   * Get supported currencies
   */
  getSupportedCurrencies(): string[] {
    return Object.keys(this.exchangeRates)
  }

  /**
   * Check if currency is supported
   */
  isCurrencySupported(currency: string): boolean {
    return this.getSupportedCurrencies().includes(currency.toUpperCase())
  }

  /**
   * Get currency symbol
   */
  getCurrencySymbol(currency: string): string {
    const symbols: Record<string, string> = {
      USD: '$',
      EUR: '€',
      GBP: '£',
      PLN: 'zł',
      CAD: 'C$',
      AUD: 'A$',
      JPY: '¥',
      CHF: 'CHF',
      SEK: 'kr',
      NOK: 'kr',
      DKK: 'kr'
    }

    return symbols[currency.toUpperCase()] || currency.toUpperCase()
  }

  /**
   * Convert multiple prices to target currency
   */
  async convertPriceArray(
    prices: number[],
    fromCurrency: string,
    toCurrency: string
  ): Promise<number[]> {
    const conversions = await Promise.all(
      prices.map(price => this.convertCurrency({
        amount: price,
        fromCurrency,
        toCurrency
      }))
    )

    return conversions.map(conversion => conversion.convertedAmount)
  }
}

// Utility functions for easy access
export const currencyConverter = CurrencyConverter.getInstance()

export async function convertCurrency(request: CurrencyConversionRequest): Promise<CurrencyConversionResult> {
  return currencyConverter.convertCurrency(request)
}

export function formatCurrency(amount: number, options: CurrencyFormatOptions): string {
  return currencyConverter.formatCurrency(amount, options)
}

export async function convertAndFormatPriceRange(
  minPrice: number,
  maxPrice: number,
  fromCurrency: string,
  toCurrency: string,
  locale?: string
): Promise<string> {
  return currencyConverter.convertAndFormatPriceRange(minPrice, maxPrice, fromCurrency, toCurrency, locale)
}

export function getSupportedCurrencies(): string[] {
  return currencyConverter.getSupportedCurrencies()
}

export function isCurrencySupported(currency: string): boolean {
  return currencyConverter.isCurrencySupported(currency)
}

export function getCurrencySymbol(currency: string): string {
  return currencyConverter.getCurrencySymbol(currency)
}

// Helper function to detect currency from text
export function detectCurrencyFromText(text: string): string | null {
  const currencyPatterns = [
    { pattern: /(\d+(?:\.\d{2})?)\s*PLN|(\d+(?:\.\d{2})?)\s*zł/i, currency: 'PLN' },
    { pattern: /\$(\d+(?:\.\d{2})?)|(\d+(?:\.\d{2})?)\s*USD/i, currency: 'USD' },
    { pattern: /€(\d+(?:\.\d{2})?)|(\d+(?:\.\d{2})?)\s*EUR/i, currency: 'EUR' },
    { pattern: /£(\d+(?:\.\d{2})?)|(\d+(?:\.\d{2})?)\s*GBP/i, currency: 'GBP' }
  ]

  for (const { pattern, currency } of currencyPatterns) {
    if (pattern.test(text)) {
      return currency
    }
  }

  return null
}
