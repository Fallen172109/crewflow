'use client'

import { useState, useEffect } from 'react'
import { MessageSquare, Download, Eye, Settings } from 'lucide-react'

// Load Google Fonts dynamically
const loadGoogleFonts = () => {
  const fonts = [
    'Inter:wght@400;500;600',
    'Roboto:wght@400;500;600',
    'Open+Sans:wght@400;600',
    'Source+Sans+Pro:wght@400;600',
    'Lato:wght@400;600',
    'Nunito+Sans:wght@400;600',
    'IBM+Plex+Sans:wght@400;600'
  ]

  const link = document.createElement('link')
  link.href = `https://fonts.googleapis.com/css2?${fonts.map(f => `family=${f}`).join('&')}&display=swap`
  link.rel = 'stylesheet'
  document.head.appendChild(link)
}

// Font candidates for testing
const fontCandidates = [
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
    name: 'Segoe UI',
    family: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif',
    description: 'Microsoft\'s readable interface font',
    weight: '400',
    boldWeight: '600'
  },
  {
    name: 'SF Pro Display',
    family: '"SF Pro Display", -apple-system, BlinkMacSystemFont, sans-serif',
    description: 'Apple\'s modern system font',
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
    name: 'Open Sans',
    family: '"Open Sans", "Helvetica Neue", Arial, sans-serif',
    description: 'Highly readable humanist font',
    weight: '400',
    boldWeight: '600'
  },
  {
    name: 'Source Sans Pro',
    family: '"Source Sans Pro", "Helvetica Neue", Arial, sans-serif',
    description: 'Adobe\'s clean, readable font',
    weight: '400',
    boldWeight: '600'
  },
  {
    name: 'Lato',
    family: '"Lato", "Helvetica Neue", Arial, sans-serif',
    description: 'Friendly, approachable font',
    weight: '400',
    boldWeight: '600'
  },
  {
    name: 'Nunito Sans',
    family: '"Nunito Sans", "Helvetica Neue", Arial, sans-serif',
    description: 'Rounded, modern font with excellent readability',
    weight: '400',
    boldWeight: '600'
  },
  {
    name: 'IBM Plex Sans',
    family: '"IBM Plex Sans", "Helvetica Neue", Arial, sans-serif',
    description: 'Corporate-friendly with great character distinction',
    weight: '400',
    boldWeight: '600'
  }
]

// Sample chat content for testing
const sampleMessages = [
  {
    type: 'agent',
    name: 'Anchor',
    content: `⚓ **Ahoy there!** I'm Anchor, your Project Management specialist here to help you navigate the waters of productivity and organization.

I can assist you with:
• **Task Planning** - Breaking down complex projects into manageable steps
• **Timeline Management** - Setting realistic deadlines and milestones  
• **Resource Allocation** - Optimizing team assignments and workload distribution
• **Progress Tracking** - Monitoring project status and identifying bottlenecks

What project would you like to chart a course for today? Whether it's a simple to-do list or a complex multi-phase initiative, I'm here to help you stay on course! 🧭`
  },
  {
    type: 'user',
    content: 'I need help organizing a product launch for our new maritime safety equipment. The launch is in 8 weeks and involves coordinating with multiple departments, creating marketing materials, and managing inventory. Can you help me create a comprehensive project plan?'
  },
  {
    type: 'agent',
    name: 'Anchor',
    content: `**Excellent!** A maritime safety equipment launch - right in my wheelhouse! Let me chart a comprehensive course for your 8-week product launch.

## 🗓️ **Phase 1: Foundation (Weeks 1-2)**
**Week 1:**
- Stakeholder alignment meeting
- Define product specifications and key features
- Establish budget parameters and resource allocation
- Create project communication channels

**Week 2:**
- Market research and competitive analysis
- Develop pricing strategy
- Create detailed project timeline with dependencies
- Set up tracking systems and KPIs

## 📢 **Phase 2: Marketing & Content (Weeks 3-5)**
**Week 3:**
- Brand messaging and positioning
- Create marketing asset brief
- Photography and video content planning
- Website/landing page wireframes

**Week 4:**
- Content creation (copy, images, videos)
- Social media strategy development
- Press release drafting
- Trade show/event planning (if applicable)

**Week 5:**
- Marketing material review and approval
- Digital asset optimization
- Print material coordination
- Influencer/partner outreach

## 🏭 **Phase 3: Operations & Inventory (Weeks 6-7)**
**Week 6:**
- Final inventory counts and quality checks
- Distribution channel setup
- Customer service training materials
- Order fulfillment process testing

**Week 7:**
- Staff training sessions
- System integration testing
- Backup inventory planning
- Launch day logistics coordination

## 🚀 **Phase 4: Launch & Monitor (Week 8)**
- Launch day execution
- Real-time monitoring and support
- Customer feedback collection
- Performance metrics tracking

Would you like me to dive deeper into any specific phase or help you identify potential risks and mitigation strategies?`
  },
  {
    type: 'user',
    content: 'This looks great! Can you help me identify the key stakeholders for each phase and create a RACI matrix? Also, what are the biggest risks we should prepare for?'
  },
  {
    type: 'agent',
    name: 'Anchor',
    content: `**Absolutely!** Let me map out the stakeholders and create a RACI matrix, then we'll tackle those critical risks.

## 👥 **Key Stakeholders by Phase**

### **Phase 1 (Foundation)**
- **Product Manager** - Overall project ownership
- **Engineering Team** - Technical specifications
- **Finance** - Budget approval and tracking
- **Executive Sponsor** - Strategic alignment

### **Phase 2 (Marketing)**
- **Marketing Manager** - Campaign strategy
- **Creative Team** - Asset development
- **Brand Manager** - Messaging consistency
- **Digital Marketing** - Online presence

### **Phase 3 (Operations)**
- **Operations Manager** - Inventory and fulfillment
- **Quality Assurance** - Product standards
- **Customer Service** - Support readiness
- **Supply Chain** - Distribution logistics

### **Phase 4 (Launch)**
- **Sales Team** - Revenue generation
- **Customer Success** - Post-launch support
- **Analytics Team** - Performance monitoring

## 📊 **RACI Matrix** (R=Responsible, A=Accountable, C=Consulted, I=Informed)

| **Activity** | **Product Mgr** | **Marketing** | **Operations** | **Finance** | **Executive** |
|--------------|-----------------|---------------|----------------|-------------|---------------|
| Project Planning | **A** | C | C | C | I |
| Budget Management | C | I | I | **A** | C |
| Marketing Strategy | C | **A** | I | I | C |
| Inventory Planning | I | I | **A** | C | I |
| Launch Execution | **A** | R | R | I | C |

## ⚠️ **Critical Risks & Mitigation**

### **🔴 High Priority Risks**
1. **Supply Chain Delays**
   - *Risk:* Inventory shortage at launch
   - *Mitigation:* Order 20% buffer stock, identify backup suppliers

2. **Regulatory Compliance**
   - *Risk:* Safety certifications delayed
   - *Mitigation:* Start certification process immediately, have legal review

3. **Market Timing**
   - *Risk:* Competitor launches similar product first
   - *Mitigation:* Monitor competitor activity, have differentiation strategy ready

### **🟡 Medium Priority Risks**
4. **Resource Conflicts**
   - *Risk:* Key team members pulled to other projects
   - *Mitigation:* Secure resource commitments upfront, cross-train team members

5. **Technology Integration**
   - *Risk:* E-commerce/ordering systems not ready
   - *Mitigation:* Test integrations early, have manual backup processes

Would you like me to create detailed contingency plans for any of these risks, or shall we move on to setting up the project tracking system?`
  }
]

export default function TestChatFontsPage() {
  const [selectedFont, setSelectedFont] = useState(fontCandidates[0])
  const [fontSize, setFontSize] = useState(14)
  const [lineHeight, setLineHeight] = useState(1.5)

  // Load Google Fonts on component mount
  useEffect(() => {
    loadGoogleFonts()
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-primary-500 rounded-lg flex items-center justify-center">
              <MessageSquare className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">CrewFlow Chat Font Testing</h1>
              <p className="text-gray-600">Evaluate font readability for AI agent conversations</p>
            </div>
          </div>
          
          {/* Font Controls */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
            <div className="flex items-center space-x-2 mb-4">
              <Settings className="w-5 h-5 text-gray-500" />
              <h2 className="text-lg font-semibold text-gray-900">Font Configuration</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Font Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Font Family
                </label>
                <select
                  value={selectedFont.name}
                  onChange={(e) => setSelectedFont(fontCandidates.find(f => f.name === e.target.value) || fontCandidates[0])}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  {fontCandidates.map((font) => (
                    <option key={font.name} value={font.name}>
                      {font.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">{selectedFont.description}</p>
              </div>

              {/* Font Size */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Font Size: {fontSize}px
                </label>
                <input
                  type="range"
                  min="12"
                  max="18"
                  value={fontSize}
                  onChange={(e) => setFontSize(parseInt(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>12px</span>
                  <span>18px</span>
                </div>
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
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>1.2</span>
                  <span>2.0</span>
                </div>
              </div>
            </div>

            {/* CSS Implementation */}
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="text-sm font-semibold text-gray-900 mb-2">CSS Implementation:</h3>
              <code className="text-sm text-gray-700 font-mono">
                font-family: {selectedFont.family};<br />
                font-size: {fontSize}px;<br />
                line-height: {lineHeight};<br />
                font-weight: {selectedFont.weight}; /* regular */<br />
                font-weight: {selectedFont.boldWeight}; /* bold */
              </code>
            </div>
          </div>
        </div>

        {/* Chat Preview */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-primary-50 to-maritime-blue/10">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-bold">A</span>
              </div>
              <div>
                <h3 className="text-gray-900 font-medium">Font Preview - {selectedFont.name}</h3>
                <p className="text-xs text-gray-500">Maritime AI Agent Conversation</p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-6 max-h-[800px] overflow-y-auto">
            {sampleMessages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`flex space-x-3 max-w-[85%] ${message.type === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
                  {/* Avatar */}
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 ${
                    message.type === 'user' ? 'bg-primary-500' : 'bg-maritime-blue'
                  }`}>
                    {message.type === 'user' ? 'U' : message.name?.[0] || 'A'}
                  </div>

                  {/* Message Content */}
                  <div className={`rounded-lg px-4 py-3 ${
                    message.type === 'user' 
                      ? 'bg-primary-500 text-white' 
                      : 'bg-gray-50 border border-gray-200'
                  }`}>
                    <div 
                      className={`${message.type === 'user' ? 'text-white' : 'text-gray-700'}`}
                      style={{
                        fontFamily: selectedFont.family,
                        fontSize: `${fontSize}px`,
                        lineHeight: lineHeight,
                        fontWeight: selectedFont.weight
                      }}
                      dangerouslySetInnerHTML={{
                        __html: message.content
                          .replace(/\*\*(.*?)\*\*/g, `<strong style="font-weight: ${selectedFont.boldWeight}; color: ${message.type === 'user' ? 'white' : '#111827'}">$1</strong>`)
                          .replace(/\*(.*?)\*/g, '<em>$1</em>')
                          .replace(/•/g, '•')
                          .replace(/\n/g, '<br />')
                          .replace(/#{1,3}\s(.*?)(?=\n|$)/g, `<h3 style="font-weight: ${selectedFont.boldWeight}; margin: 12px 0 8px 0; color: ${message.type === 'user' ? 'white' : '#111827'}">$1</h3>`)
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Character Distinction Test */}
        <div className="mt-8 bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Character Distinction Test</h2>
          <p className="text-gray-600 mb-4">Test how well the selected font distinguishes between similar characters:</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-medium text-gray-900 mb-3">Critical Character Pairs</h3>
              <div
                className="space-y-2 text-lg"
                style={{
                  fontFamily: selectedFont.family,
                  fontSize: `${fontSize + 2}px`,
                  lineHeight: lineHeight
                }}
              >
                <div className="flex justify-between items-center py-1 px-3 bg-gray-50 rounded">
                  <span>Zero vs O:</span>
                  <span className="font-mono">0 O 0O O0</span>
                </div>
                <div className="flex justify-between items-center py-1 px-3 bg-gray-50 rounded">
                  <span>One vs l vs I:</span>
                  <span className="font-mono">1 l I 1lI Il1</span>
                </div>
                <div className="flex justify-between items-center py-1 px-3 bg-gray-50 rounded">
                  <span>rn vs m:</span>
                  <span className="font-mono">rn m rnm mrn</span>
                </div>
                <div className="flex justify-between items-center py-1 px-3 bg-gray-50 rounded">
                  <span>cl vs d:</span>
                  <span className="font-mono">cl d cld dcl</span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-medium text-gray-900 mb-3">Maritime Context Test</h3>
              <div
                className="space-y-2"
                style={{
                  fontFamily: selectedFont.family,
                  fontSize: `${fontSize}px`,
                  lineHeight: lineHeight
                }}
              >
                <p className="py-1 px-3 bg-gray-50 rounded">
                  <strong style={{ fontWeight: selectedFont.boldWeight }}>Port ID:</strong> P0RT-1001 vs PORT-l00l
                </p>
                <p className="py-1 px-3 bg-gray-50 rounded">
                  <strong style={{ fontWeight: selectedFont.boldWeight }}>Coordinates:</strong> 51.5074°N, 0.1278°W
                </p>
                <p className="py-1 px-3 bg-gray-50 rounded">
                  <strong style={{ fontWeight: selectedFont.boldWeight }}>Vessel Code:</strong> MV-ANCHOR-2024
                </p>
                <p className="py-1 px-3 bg-gray-50 rounded">
                  <strong style={{ fontWeight: selectedFont.boldWeight }}>Time:</strong> 14:30 vs l4:3O
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Font Comparison Grid */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {fontCandidates.map((font) => (
            <div 
              key={font.name}
              className={`bg-white rounded-lg border-2 p-4 cursor-pointer transition-all ${
                selectedFont.name === font.name 
                  ? 'border-primary-500 ring-2 ring-primary-200' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => setSelectedFont(font)}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900">{font.name}</h3>
                {selectedFont.name === font.name && (
                  <Eye className="w-4 h-4 text-primary-500" />
                )}
              </div>
              
              <p className="text-xs text-gray-500 mb-3">{font.description}</p>
              
              <div 
                className="text-gray-700 text-sm leading-relaxed"
                style={{
                  fontFamily: font.family,
                  fontSize: '14px',
                  lineHeight: 1.5
                }}
              >
                <p className="mb-2">
                  <strong style={{ fontWeight: font.boldWeight }}>Sample maritime text:</strong> 
                  Ahoy! Navigate through complex 0O1lI characters with ease.
                </p>
                <p>
                  Regular text readability test with longer sentences to evaluate 
                  how well this font performs in extended conversations.
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Implementation Guide */}
        <div className="mt-8 bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Implementation Guide</h2>
          
          <div className="space-y-4">
            <div>
              <h3 className="font-medium text-gray-900 mb-2">1. Update Tailwind Config</h3>
              <div className="bg-gray-50 rounded-lg p-4">
                <code className="text-sm text-gray-700 font-mono">
                  // tailwind.config.ts<br />
                  fontFamily: &#123;<br />
                  &nbsp;&nbsp;sans: ['{selectedFont.family.split(',')[0].replace(/"/g, '')}', 'system-ui', 'sans-serif'],<br />
                  &nbsp;&nbsp;chat: ['{selectedFont.family}'],<br />
                  &#125;
                </code>
              </div>
            </div>

            <div>
              <h3 className="font-medium text-gray-900 mb-2">2. Update Chat Components</h3>
              <div className="bg-gray-50 rounded-lg p-4">
                <code className="text-sm text-gray-700 font-mono">
                  // Add to chat message styling<br />
                  className="font-chat text-{fontSize === 14 ? 'sm' : fontSize === 16 ? 'base' : 'lg'} leading-relaxed"
                </code>
              </div>
            </div>

            <div>
              <h3 className="font-medium text-gray-900 mb-2">3. Font Loading (if using web fonts)</h3>
              <div className="bg-gray-50 rounded-lg p-4">
                <code className="text-sm text-gray-700 font-mono">
                  // Add to layout.tsx or globals.css<br />
                  @import url('https://fonts.googleapis.com/css2?family={selectedFont.name.replace(' ', '+')}:wght@{selectedFont.weight};{selectedFont.boldWeight}&display=swap');
                </code>
              </div>
            </div>
          </div>
        </div>

        {/* Readability Assessment */}
        <div className="mt-8 bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Font Readability Assessment</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-medium text-gray-900 mb-3">Evaluation Criteria</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <span className="text-sm text-gray-700">Character Distinction</span>
                  <div className="flex space-x-1">
                    {[1,2,3,4,5].map(i => (
                      <div key={i} className="w-4 h-4 rounded-full bg-gray-300"></div>
                    ))}
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <span className="text-sm text-gray-700">Extended Reading Comfort</span>
                  <div className="flex space-x-1">
                    {[1,2,3,4,5].map(i => (
                      <div key={i} className="w-4 h-4 rounded-full bg-gray-300"></div>
                    ))}
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <span className="text-sm text-gray-700">Bold Text Contrast</span>
                  <div className="flex space-x-1">
                    {[1,2,3,4,5].map(i => (
                      <div key={i} className="w-4 h-4 rounded-full bg-gray-300"></div>
                    ))}
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <span className="text-sm text-gray-700">Maritime Theme Fit</span>
                  <div className="flex space-x-1">
                    {[1,2,3,4,5].map(i => (
                      <div key={i} className="w-4 h-4 rounded-full bg-gray-300"></div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-medium text-gray-900 mb-3">Recommended Settings</h3>
              <div className="space-y-3">
                <div className="p-3 bg-primary-50 border border-primary-200 rounded">
                  <h4 className="font-medium text-primary-900 mb-1">For Chat Messages</h4>
                  <p className="text-sm text-primary-700">
                    Font Size: 14-15px<br />
                    Line Height: 1.5-1.6<br />
                    Regular Weight: 400<br />
                    Bold Weight: 600
                  </p>
                </div>
                <div className="p-3 bg-maritime-blue/10 border border-maritime-blue/20 rounded">
                  <h4 className="font-medium text-maritime-blue mb-1">For Long Responses</h4>
                  <p className="text-sm text-maritime-blue">
                    Font Size: 15-16px<br />
                    Line Height: 1.6-1.7<br />
                    Max Width: 65-75 characters<br />
                    Paragraph Spacing: 12-16px
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 p-4 bg-gradient-to-r from-primary-50 to-maritime-blue/10 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-2">💡 Implementation Tip</h3>
            <p className="text-sm text-gray-700">
              Test your selected font with actual users in different lighting conditions and screen sizes.
              Consider offering font size preferences in user settings for accessibility.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
