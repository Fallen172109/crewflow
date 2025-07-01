'use client'

import { useState, useEffect } from 'react'

interface FontOption {
  name: string
  family: string
  description: string
  weight: string
  boldWeight: string
}

interface FontTesterProps {
  fonts: FontOption[]
  sampleText: string
  className?: string
  showControls?: boolean
}

export default function FontTester({ 
  fonts, 
  sampleText, 
  className = '',
  showControls = true 
}: FontTesterProps) {
  const [selectedFont, setSelectedFont] = useState(fonts[0])
  const [fontSize, setFontSize] = useState(14)
  const [lineHeight, setLineHeight] = useState(1.5)
  const [showBold, setShowBold] = useState(false)

  // Load Google Fonts dynamically
  useEffect(() => {
    const webFonts = fonts.filter(font => 
      !font.family.includes('system-ui') && 
      !font.family.includes('Segoe UI') &&
      !font.family.includes('SF Pro')
    )

    if (webFonts.length > 0) {
      const fontParams = webFonts.map(font => {
        const fontName = font.family.split(',')[0].replace(/"/g, '').replace(/ /g, '+')
        return `family=${fontName}:wght@${font.weight};${font.boldWeight}`
      }).join('&')

      const link = document.createElement('link')
      link.href = `https://fonts.googleapis.com/css2?${fontParams}&display=swap`
      link.rel = 'stylesheet'
      document.head.appendChild(link)

      return () => {
        document.head.removeChild(link)
      }
    }
  }, [fonts])

  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}>
      {showControls && (
        <div className="mb-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Font Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Font Family
              </label>
              <select
                value={selectedFont.name}
                onChange={(e) => setSelectedFont(fonts.find(f => f.name === e.target.value) || fonts[0])}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {fonts.map((font) => (
                  <option key={font.name} value={font.name}>
                    {font.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Font Size */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Size: {fontSize}px
              </label>
              <input
                type="range"
                min="12"
                max="20"
                value={fontSize}
                onChange={(e) => setFontSize(parseInt(e.target.value))}
                className="w-full"
              />
            </div>

            {/* Line Height */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Line Height: {lineHeight}
              </label>
              <input
                type="range"
                min="1.2"
                max="2.0"
                step="0.1"
                value={lineHeight}
                onChange={(e) => setLineHeight(parseFloat(e.target.value))}
                className="w-full"
              />
            </div>

            {/* Bold Toggle */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Text Weight
              </label>
              <button
                onClick={() => setShowBold(!showBold)}
                className={`w-full px-3 py-2 rounded-lg border transition-colors ${
                  showBold 
                    ? 'bg-primary-500 text-white border-primary-500' 
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                {showBold ? 'Bold' : 'Regular'}
              </button>
            </div>
          </div>

          {/* Font Info */}
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">
              <strong>Selected:</strong> {selectedFont.name} - {selectedFont.description}
            </p>
            <p className="text-xs text-gray-500 mt-1 font-mono">
              font-family: {selectedFont.family};
            </p>
          </div>
        </div>
      )}

      {/* Sample Text Display */}
      <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
        <div
          className="text-gray-700"
          style={{
            fontFamily: selectedFont.family,
            fontSize: `${fontSize}px`,
            lineHeight: lineHeight,
            fontWeight: showBold ? selectedFont.boldWeight : selectedFont.weight
          }}
          dangerouslySetInnerHTML={{
            __html: sampleText
              .replace(/\*\*(.*?)\*\*/g, `<strong style="font-weight: ${selectedFont.boldWeight}">$1</strong>`)
              .replace(/\*(.*?)\*/g, '<em>$1</em>')
              .replace(/\n/g, '<br />')
          }}
        />
      </div>

      {/* Character Distinction Test */}
      <div className="mt-4 p-4 bg-white border border-gray-200 rounded-lg">
        <h4 className="text-sm font-medium text-gray-900 mb-3">Character Distinction Test</h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-600">0 vs O:</span>
            <span 
              className="ml-2 font-mono"
              style={{
                fontFamily: selectedFont.family,
                fontSize: `${fontSize + 2}px`,
                fontWeight: selectedFont.weight
              }}
            >
              0O 0O0 O0O
            </span>
          </div>
          <div>
            <span className="text-gray-600">1 vs l vs I:</span>
            <span 
              className="ml-2 font-mono"
              style={{
                fontFamily: selectedFont.family,
                fontSize: `${fontSize + 2}px`,
                fontWeight: selectedFont.weight
              }}
            >
              1lI 1l1 Il1
            </span>
          </div>
          <div>
            <span className="text-gray-600">rn vs m:</span>
            <span 
              className="ml-2 font-mono"
              style={{
                fontFamily: selectedFont.family,
                fontSize: `${fontSize + 2}px`,
                fontWeight: selectedFont.weight
              }}
            >
              rn m rnm
            </span>
          </div>
          <div>
            <span className="text-gray-600">cl vs d:</span>
            <span 
              className="ml-2 font-mono"
              style={{
                fontFamily: selectedFont.family,
                fontSize: `${fontSize + 2}px`,
                fontWeight: selectedFont.weight
              }}
            >
              cl d cld
            </span>
          </div>
        </div>
      </div>

      {/* CSS Output */}
      {showControls && (
        <div className="mt-4 p-3 bg-gray-900 rounded-lg">
          <h4 className="text-sm font-medium text-white mb-2">CSS Implementation</h4>
          <code className="text-xs text-green-400 font-mono">
            font-family: {selectedFont.family};<br />
            font-size: {fontSize}px;<br />
            line-height: {lineHeight};<br />
            font-weight: {showBold ? selectedFont.boldWeight : selectedFont.weight};
          </code>
        </div>
      )}
    </div>
  )
}

// Export font candidates for reuse
export const defaultFontCandidates: FontOption[] = [
  {
    name: 'Inter (Current)',
    family: 'Inter, system-ui, sans-serif',
    description: 'Current font - designed for UI interfaces',
    weight: '400',
    boldWeight: '600'
  },
  {
    name: 'System UI',
    family: 'system-ui, -apple-system, sans-serif',
    description: 'Native system font - optimal performance',
    weight: '400',
    boldWeight: '600'
  },
  {
    name: 'Open Sans',
    family: '"Open Sans", "Helvetica Neue", Arial, sans-serif',
    description: 'Highly readable humanist font',
    weight: '400',
    boldWeight: '600'
  },
  {
    name: 'Roboto',
    family: '"Roboto", "Helvetica Neue", Arial, sans-serif',
    description: 'Google\'s material design font',
    weight: '400',
    boldWeight: '500'
  },
  {
    name: 'Source Sans Pro',
    family: '"Source Sans Pro", "Helvetica Neue", Arial, sans-serif',
    description: 'Adobe\'s clean, readable font',
    weight: '400',
    boldWeight: '600'
  }
]
