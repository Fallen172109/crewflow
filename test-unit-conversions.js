// Test script for unit conversion functions
// Run with: node test-unit-conversions.js

// Mock the unit conversion functions for testing
const WEIGHT_TO_KG = {
  kg: 1,
  g: 0.001,
  lbs: 0.453592,
  oz: 0.0283495,
  stone: 6.35029
}

const HEIGHT_TO_CM = {
  cm: 1,
  m: 100,
  ft_in: 30.48,
  inches: 2.54
}

function convertWeightToKg(value, unit) {
  return value * WEIGHT_TO_KG[unit]
}

function convertHeightToCm(value, unit) {
  return value * HEIGHT_TO_CM[unit]
}

function formatWeight(value, unit) {
  const formatted = value.toFixed(unit === 'g' ? 0 : 1)
  return `${formatted} ${unit}`
}

function formatHeight(value, unit) {
  if (unit === 'ft_in') {
    const feet = Math.floor(value)
    const inches = Math.round((value - feet) * 12)
    return `${feet}'${inches}"`
  }
  
  const formatted = value.toFixed(unit === 'cm' ? 0 : 2)
  return `${formatted} ${unit}`
}

console.log('🧪 Testing Unit Conversion Functions\n')

// Test weight conversions
console.log('📏 Weight Conversions:')
const weightTests = [
  { value: 70, unit: 'kg', expectedKg: 70 },
  { value: 70000, unit: 'g', expectedKg: 70 },
  { value: 154.32, unit: 'lbs', expectedKg: 70 },
  { value: 2469.1, unit: 'oz', expectedKg: 70 },
  { value: 11.02, unit: 'stone', expectedKg: 70 }
]

weightTests.forEach(test => {
  const result = convertWeightToKg(test.value, test.unit)
  const passed = Math.abs(result - test.expectedKg) < 0.1
  console.log(`  ${test.value} ${test.unit} → ${result.toFixed(2)} kg ${passed ? '✅' : '❌'}`)
})

// Test height conversions
console.log('\n📐 Height Conversions:')
const heightTests = [
  { value: 175, unit: 'cm', expectedCm: 175 },
  { value: 1.75, unit: 'm', expectedCm: 175 },
  { value: 5.74, unit: 'ft_in', expectedCm: 175 },
  { value: 68.9, unit: 'inches', expectedCm: 175 }
]

heightTests.forEach(test => {
  const result = convertHeightToCm(test.value, test.unit)
  const passed = Math.abs(result - test.expectedCm) < 1
  console.log(`  ${test.value} ${test.unit} → ${result.toFixed(1)} cm ${passed ? '✅' : '❌'}`)
})

// Test formatting
console.log('\n🎨 Formatting Tests:')
const formatTests = [
  { value: 70.5, unit: 'kg', expected: '70.5 kg' },
  { value: 70500, unit: 'g', expected: '70500 g' },
  { value: 175, unit: 'cm', expected: '175 cm' },
  { value: 5.74, unit: 'ft_in', expected: "5'9\"" }
]

formatTests.forEach(test => {
  const result = test.unit === 'ft_in' ? formatHeight(test.value, test.unit) : formatWeight(test.value, test.unit)
  const passed = result === test.expected
  console.log(`  ${test.value} ${test.unit} → "${result}" ${passed ? '✅' : '❌'}`)
})

console.log('\n✨ Unit conversion tests completed!')
