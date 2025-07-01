'use client'

import { useState } from 'react'
import MarkdownRenderer from '@/components/chat/MarkdownRenderer'

export default function TestTypographyFixPage() {
  const [selectedSample, setSelectedSample] = useState('mixed')

  const sampleResponses = {
    mixed: `# Improving Your Facebook Page for Alice Boutique

To enhance your Facebook page for Alice Boutique and maximize your online sales through live streaming and other content, here are some targeted strategies based on the latest Facebook algorithm and best practices:

## Optimize Your Profile

• **Complete and Up-to-Date Profile**: Ensure your profile is fully filled out, including a clear profile picture, cover photo, and detailed 'About' section.

Highlight your physical store in Zakopane, Poland, and include contact information and a link to your website. • **Profile Consistency**: Make sure your branding is consistent across all social media platforms to build recognition and trust.

## High-Quality and Engaging Content

• **Quality Over Quantity**: Focus on posting high-quality content that resonates with your target audience. For a clothing boutique, this could include high-resolution images and videos of your products, fashion tips, and behind-the-scenes content.

• **Use Native Platform Features**: Leverage Facebook Live for your sales streams, and use Facebook Stories to share quick updates, sneak peeks, or exclusive offers. These features are favored by the algorithm and can boost your visibility.

### Increase Authentic Engagement

• **Interactive Content**: Use polls, quizzes, and live videos to drive user interaction.

For example, you could ask your audience to vote on the next item to be featured in a live stream or to guess the price of a new product. • **Encourage Conversations**: Post content that sparks conversations, such as asking for feedback on new designs or requesting suggestions for future products.

## Utilize Trending Formats and Features

• **Short-Form Videos**: Prioritize short-form video content, which is trending in 2025. **Create bite-sized videos showcasing your products, fashion trends, or quick styling tips**.

• **Trending Audio**: Incorporate popular audio tracks into your videos to make them more engaging and viral.

### SEO and Discoverability

• **Relevant Keywords and Hashtags**: Use relevant keywords and hashtags in your posts to make them more discoverable. This could include hashtags related to fashion, clothing, and specific product categories.

## Engage with Your Audience

• **Timely and Personalized Responses**: Respond promptly to comments and messages. Engage with your audience by asking questions, acknowledging feedback, and showing that you value their input.

### Monitor and Adjust

• **Use Facebook Insights**: Regularly monitor your page's performance using Facebook Insights. Analyze what types of content are performing well and adjust your strategy accordingly.

## Promote Your Live Streams

• **Pre-Stream Promotion**: Promote your upcoming live streams well in advance using Facebook posts, stories, and even Facebook events.

This will help build anticipation and increase viewership. • **Post-Stream Engagement**: After the live stream, share a recap or highlights reel to keep the engagement going and encourage viewers to share their experiences.

### Example Action Plan

#### Weekly Content Schedule

• **Monday**: Share a high-quality image or video of a new product with a detailed description. • **Tuesday**: Use Facebook Live for a quick product demonstration or Q&A session. • **Wednesday**: Post a poll or quiz related to fashion trends or product preferences.

• **Thursday**: Share a behind-the-scenes video or story about your boutique. • **Friday**: Promote your upcoming live stream event and encourage audience participation. • **Saturday**: Live stream your sales event and interact with viewers in real-time. • **Sunday**: Share a recap of the live stream and thank your audience for their participation.

#### Monthly Review

• **Analyze your Facebook Insights** to see which content types performed best.

• Adjust your content strategy based on the data.
• Plan new interactive content and trending formats to keep your audience engaged.

By following these strategies, you can navigate the Facebook algorithm effectively, increase engagement, and ultimately drive more sales for Alice Boutique.

⚓ Fair winds and following seas on your social media journey!`,

    headers: `# Main Heading Example
## Secondary Heading Example  
### Tertiary Heading Example

This is regular paragraph text that should have consistent font sizing and spacing.

Another paragraph with **bold text** and *italic text* and \`inline code\` formatting.`,

    lists: `## Task Lists and Bullet Points

### Unordered Lists:
• First bullet point item
• Second bullet point with **bold text**
• Third bullet point with *italic text*
• Fourth bullet point with \`code formatting\`

### Numbered Lists:
1. First numbered item
2. Second numbered item with **emphasis**
3. Third numbered item with *styling*
4. Fourth numbered item with \`technical terms\`

### Mixed Content:
Here's a paragraph followed by a list:

• Maritime operations require careful **Navigation**
• The **Captain** must ensure crew safety
• **Anchor** positioning is critical for stability
• Port and **Starboard** directions guide movement`,

    maritime: `⚓ **Maritime Specialist Response**

Ahoy! As your **Admiral** of supply chain operations, I've charted a course through the complex waters of logistics management.

## Navigation Strategy 🚢

The **Captain** of any successful operation must understand these key principles:

• **Anchor** your supply chain with reliable vendors
• Navigate between **Port** and **Starboard** suppliers
• Use your **Compass** to guide strategic decisions
• Maintain steady **Helm** control during market storms

### Crew Coordination 🌊

Your maritime **Crew** should focus on:

1. **Maritime** protocol adherence
2. **Navigation** system optimization  
3. **Anchor** point establishment
4. **Helm** response procedures

⛵ *Fair winds and following seas on your business voyage!*`,

    technical: `## Technical Documentation

### API Integration
Use the \`fetch()\` method to call the **REST API**:

\`\`\`javascript
const response = await fetch('/api/endpoint')
const data = await response.json()
\`\`\`

### Configuration Options
• **URL** endpoints must be HTTPS
• **JSON** payloads require proper headers
• **CSV** exports need authentication
• **PDF** generation uses templates

### Error Handling
Handle **API** errors with proper **TypeScript** types and **JavaScript** validation.`
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">CrewFlow Typography Test</h1>
          <p className="mt-2 text-lg text-gray-600">
            Testing consistent AI response formatting and maritime theming
          </p>
        </div>

        {/* Sample Selection */}
        <div className="mb-8">
          <div className="flex flex-wrap gap-2 justify-center">
            {Object.keys(sampleResponses).map((key) => (
              <button
                key={key}
                onClick={() => setSelectedSample(key)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedSample === key
                    ? 'bg-orange-600 text-white'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                {key.charAt(0).toUpperCase() + key.slice(1)} Content
              </button>
            ))}
          </div>
        </div>

        {/* Typography Test Display */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">AI Response Preview</h2>
            <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded-full">
              {selectedSample}
            </span>
          </div>
          
          {/* Simulated Chat Message */}
          <div className="bg-gray-100 rounded-lg p-4 border border-gray-200">
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 rounded-full bg-orange-600 flex items-center justify-center text-white text-sm font-bold">
                A
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900 mb-1">AI Agent</div>
                <div className="bg-white rounded-lg p-4 border">
                  <MarkdownRenderer 
                    content={sampleResponses[selectedSample as keyof typeof sampleResponses]} 
                  />
                </div>
                <div className="text-xs text-gray-500 mt-2">
                  {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Typography Guidelines */}
        <div className="mt-8 bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Typography Guidelines</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-2">Font Sizes</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• H1: 1.5rem (24px) - Bold</li>
                <li>• H2: 1.25rem (20px) - Semibold</li>
                <li>• H3: 1.125rem (18px) - Semibold</li>
                <li>• Body: 0.875rem (14px) - Regular</li>
                <li>• Code: 0.8125rem (13px) - Mono</li>
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-2">Maritime Elements</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Maritime emojis: Orange accent color</li>
                <li>• Maritime terms: Highlighted background</li>
                <li>• Consistent spacing and line height</li>
                <li>• Professional appearance</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
