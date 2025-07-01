// Unit conversion utilities for meal planning
// Handles conversions between metric and imperial units

export type WeightUnit = 'kg' | 'g' | 'lbs' | 'oz' | 'stone'
export type HeightUnit = 'cm' | 'm' | 'ft_in' | 'inches'

// Weight conversion factors to kilograms
const WEIGHT_TO_KG: Record<WeightUnit, number> = {
  kg: 1,
  g: 0.001,
  lbs: 0.453592,
  oz: 0.0283495,
  stone: 6.35029
}

// Height conversion factors to centimeters
const HEIGHT_TO_CM: Record<HeightUnit, number> = {
  cm: 1,
  m: 100,
  ft_in: 30.48, // Assuming input is in feet
  inches: 2.54
}

// Unit display names
export const WEIGHT_UNIT_LABELS: Record<WeightUnit, string> = {
  kg: 'Kilograms (kg)',
  g: 'Grams (g)',
  lbs: 'Pounds (lbs)',
  oz: 'Ounces (oz)',
  stone: 'Stone (st)'
}

export const HEIGHT_UNIT_LABELS: Record<HeightUnit, string> = {
  cm: 'Centimeters (cm)',
  m: 'Meters (m)',
  ft_in: 'Feet & Inches (ft\'in")',
  inches: 'Inches (in)'
}

// Convert weight to kilograms
export function convertWeightToKg(value: number, unit: WeightUnit): number {
  return value * WEIGHT_TO_KG[unit]
}

// Convert weight from kilograms to target unit
export function convertWeightFromKg(valueInKg: number, targetUnit: WeightUnit): number {
  return valueInKg / WEIGHT_TO_KG[targetUnit]
}

// Convert height to centimeters
export function convertHeightToCm(value: number, unit: HeightUnit): number {
  return value * HEIGHT_TO_CM[unit]
}

// Convert height from centimeters to target unit
export function convertHeightFromCm(valueInCm: number, targetUnit: HeightUnit): number {
  return valueInCm / HEIGHT_TO_CM[targetUnit]
}

// Format weight for display
export function formatWeight(value: number, unit: WeightUnit): string {
  const formatted = value.toFixed(unit === 'g' ? 0 : 1)
  return `${formatted} ${unit}`
}

// Format height for display
export function formatHeight(value: number, unit: HeightUnit): string {
  if (unit === 'ft_in') {
    const feet = Math.floor(value)
    const inches = Math.round((value - feet) * 12)
    return `${feet}'${inches}"`
  }
  
  const formatted = value.toFixed(unit === 'cm' ? 0 : 2)
  return `${formatted} ${unit}`
}

// Get appropriate weight units for a region/preference
export function getWeightUnitsForRegion(region: 'metric' | 'imperial' | 'uk'): WeightUnit[] {
  switch (region) {
    case 'metric':
      return ['kg', 'g']
    case 'imperial':
      return ['lbs', 'oz']
    case 'uk':
      return ['stone', 'lbs', 'kg']
    default:
      return ['kg', 'g', 'lbs', 'oz', 'stone']
  }
}

// Get appropriate height units for a region/preference
export function getHeightUnitsForRegion(region: 'metric' | 'imperial'): HeightUnit[] {
  switch (region) {
    case 'metric':
      return ['cm', 'm']
    case 'imperial':
      return ['ft_in', 'inches']
    default:
      return ['cm', 'm', 'ft_in', 'inches']
  }
}

// Validate unit values
export function validateWeightValue(value: number, unit: WeightUnit): { isValid: boolean; message?: string } {
  if (value <= 0) {
    return { isValid: false, message: 'Weight must be greater than 0' }
  }
  
  // Convert to kg for validation
  const valueInKg = convertWeightToKg(value, unit)
  
  if (valueInKg < 1 || valueInKg > 1000) {
    return { isValid: false, message: 'Weight must be between 1kg and 1000kg' }
  }
  
  return { isValid: true }
}

export function validateHeightValue(value: number, unit: HeightUnit): { isValid: boolean; message?: string } {
  if (value <= 0) {
    return { isValid: false, message: 'Height must be greater than 0' }
  }
  
  // Convert to cm for validation
  const valueInCm = convertHeightToCm(value, unit)
  
  if (valueInCm < 50 || valueInCm > 300) {
    return { isValid: false, message: 'Height must be between 50cm and 300cm' }
  }
  
  return { isValid: true }
}

// Get default unit based on user preference or locale
export function getDefaultUnits(locale?: string): { weight: WeightUnit; height: HeightUnit } {
  // US uses imperial
  if (locale?.startsWith('en-US')) {
    return { weight: 'lbs', height: 'ft_in' }
  }
  
  // UK uses mixed system
  if (locale?.startsWith('en-GB')) {
    return { weight: 'stone', height: 'ft_in' }
  }
  
  // Most other countries use metric
  return { weight: 'kg', height: 'cm' }
}
