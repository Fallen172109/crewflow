// Price Research Functionality Tests
// Tests the enhanced AI agent capabilities for real-time web research and price analysis

import { describe, it, expect } from '@jest/globals'
import { currencyConverter, convertCurrency, formatCurrency, getSupportedCurrencies, getCurrencySymbol } from '@/lib/ai/currency-converter'

describe('Price Research Functionality', () => {

  describe('Currency Conversion', () => {
    it('should convert USD to PLN correctly', async () => {
      const result = await convertCurrency({
        amount: 100,
        fromCurrency: 'USD',
        toCurrency: 'PLN'
      })

      expect(result.convertedAmount).toBeGreaterThan(100) // PLN should be higher value
      expect(result.fromCurrency).toBe('USD')
      expect(result.toCurrency).toBe('PLN')
      expect(result.exchangeRate).toBeGreaterThan(1)
    })

    it('should format PLN currency correctly', () => {
      const formatted = formatCurrency(95.50, { currency: 'PLN' })
      expect(formatted).toContain('95,50')
      expect(formatted).toContain('zł')
    })

    it('should handle same currency conversion', async () => {
      const result = await convertCurrency({
        amount: 100,
        fromCurrency: 'PLN',
        toCurrency: 'PLN'
      })

      expect(result.convertedAmount).toBe(100)
      expect(result.exchangeRate).toBe(1)
    })
  })


})

  describe('Currency Support', () => {
    it('should support all major currencies', () => {
      const supportedCurrencies = getSupportedCurrencies()

      expect(supportedCurrencies).toContain('PLN')
      expect(supportedCurrencies).toContain('USD')
      expect(supportedCurrencies).toContain('EUR')
      expect(supportedCurrencies).toContain('GBP')
    })

    it('should provide correct currency symbols', () => {
      expect(getCurrencySymbol('PLN')).toBe('zł')
      expect(getCurrencySymbol('USD')).toBe('$')
      expect(getCurrencySymbol('EUR')).toBe('€')
      expect(getCurrencySymbol('GBP')).toBe('£')
    })
  })
})
