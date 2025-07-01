'use client'

import { useState } from 'react'
import { Settings, Check } from 'lucide-react'
import { 
  WeightUnit, 
  HeightUnit, 
  WEIGHT_UNIT_LABELS, 
  HEIGHT_UNIT_LABELS,
  getWeightUnitsForRegion,
  getHeightUnitsForRegion
} from '@/lib/utils/units'

interface UnitPreferencesProps {
  currentWeightUnit?: WeightUnit
  currentHeightUnit?: HeightUnit
  onWeightUnitChange: (unit: WeightUnit) => void
  onHeightUnitChange: (unit: HeightUnit) => void
  className?: string
}

export default function UnitPreferences({
  currentWeightUnit = 'kg',
  currentHeightUnit = 'cm',
  onWeightUnitChange,
  onHeightUnitChange,
  className = ''
}: UnitPreferencesProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedRegion, setSelectedRegion] = useState<'metric' | 'imperial' | 'uk' | 'custom'>('metric')

  const handleRegionChange = (region: 'metric' | 'imperial' | 'uk' | 'custom') => {
    setSelectedRegion(region)
    
    if (region !== 'custom') {
      // Auto-set units based on region
      const weightUnits = getWeightUnitsForRegion(region)
      const heightUnits = getHeightUnitsForRegion(region === 'uk' ? 'imperial' : region)
      
      if (weightUnits.length > 0) {
        onWeightUnitChange(weightUnits[0])
      }
      if (heightUnits.length > 0) {
        onHeightUnitChange(heightUnits[0])
      }
    }
  }

  const allWeightUnits: WeightUnit[] = ['kg', 'g', 'lbs', 'oz', 'stone']
  const allHeightUnits: HeightUnit[] = ['cm', 'm', 'ft_in', 'inches']

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
      >
        <Settings className="w-4 h-4" />
        <span>Units</span>
        <span className="text-xs text-gray-500">
          ({currentWeightUnit}, {currentHeightUnit})
        </span>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
          <div className="p-4">
            <h3 className="font-medium text-gray-900 mb-4">Unit Preferences</h3>
            
            {/* Region Presets */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Quick Presets
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { key: 'metric', label: 'Metric (kg, cm)', desc: 'Most countries' },
                  { key: 'imperial', label: 'Imperial (lbs, ft)', desc: 'United States' },
                  { key: 'uk', label: 'UK (stone, ft)', desc: 'United Kingdom' },
                  { key: 'custom', label: 'Custom', desc: 'Choose manually' }
                ].map((region) => (
                  <button
                    key={region.key}
                    onClick={() => handleRegionChange(region.key as any)}
                    className={`p-2 text-left text-xs rounded border ${
                      selectedRegion === region.key
                        ? 'border-orange-500 bg-orange-50 text-orange-900'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="font-medium">{region.label}</div>
                    <div className="text-gray-500">{region.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Individual Unit Selection */}
            <div className="space-y-4">
              {/* Weight Unit */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Weight Unit
                </label>
                <div className="space-y-1">
                  {allWeightUnits.map((unit) => (
                    <button
                      key={unit}
                      onClick={() => onWeightUnitChange(unit)}
                      className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded border ${
                        currentWeightUnit === unit
                          ? 'border-orange-500 bg-orange-50 text-orange-900'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <span>{WEIGHT_UNIT_LABELS[unit]}</span>
                      {currentWeightUnit === unit && (
                        <Check className="w-4 h-4 text-orange-600" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Height Unit */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Height Unit
                </label>
                <div className="space-y-1">
                  {allHeightUnits.map((unit) => (
                    <button
                      key={unit}
                      onClick={() => onHeightUnitChange(unit)}
                      className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded border ${
                        currentHeightUnit === unit
                          ? 'border-orange-500 bg-orange-50 text-orange-900'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <span>{HEIGHT_UNIT_LABELS[unit]}</span>
                      {currentHeightUnit === unit && (
                        <Check className="w-4 h-4 text-orange-600" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Close Button */}
            <div className="mt-4 pt-4 border-t border-gray-200">
              <button
                onClick={() => setIsOpen(false)}
                className="w-full bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
