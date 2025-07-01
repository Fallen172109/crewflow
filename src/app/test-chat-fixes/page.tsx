'use client'

import { useState } from 'react'
import MarkdownRenderer from '@/components/chat/MarkdownRenderer'
import ImageRenderer from '@/components/chat/ImageRenderer'

export default function TestChatFixesPage() {
  const [testContent, setTestContent] = useState(`⚓ Ahoy! I'm Splash, your Social Media specialist here to help you navigate the waters of online sales for Alice Boutique in Zakopane, Poland.

## Social Media Strategy for Alice Boutique

Here's a comprehensive approach to boost your online presence:

### Key Recommendations

1. **Create Compelling Content** - Showcase your clothing items in a visually appealing way during your live streams
2. **Highlight Key Features** - Focus on materials, unique selling points of each item
3. **Encourage Viewers** - Build a sense of community and trust
4. **Promote Your Live Streams** - Use your other social media platforms to inform followers about upcoming live streams

### Content Creation Tips

• **Visual Appeal** - Use good lighting and clear camera angles
• **Product Descriptions** - Provide detailed information about materials and sizing
• **Interactive Elements** - Respond promptly to comments and messages
• **Call-to-Action** - Create teaser posts, behind-the-scenes content

### Platform-Specific Strategies

**Facebook Live Streams:**
- Schedule regular streaming times
- Create event announcements
- Use Facebook's shopping features

**Instagram Integration:**
- Share story highlights from live streams
- Post high-quality product photos
- Use relevant hashtags for discovery

![Generated Image](https://example.com/test-image.jpg)

⚓ *Ready to chart the next course when you are!*`)

  const [maritimeTestContent, setMaritimeTestContent] = useState(`⚓ Aye, here's your updated social media strategy.

## Updated Recommendations

Based on your feedback, I've refined the approach:

### Priority Actions

1. **Focus on evening streams** (7-9 PM local time)
2. **Highlight winter collection** for the current season
3. **Create urgency** with limited-time offers

**Important:** These strategies have proven effective for similar boutiques in Poland.

⚓ *Standing by for your next request!*`)

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">
            🧪 CrewFlow Chat System Fixes Test
          </h1>
          
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-800 mb-3">
                ✅ Issue 1: Image Generation Security & Display
              </h2>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-green-800 text-sm mb-2">
                  <strong>Fixed:</strong> Images now display directly in chat with secure storage and download functionality
                </p>
                <ImageRenderer 
                  imageUrl="https://via.placeholder.com/400x300/FF6B35/FFFFFF?text=Test+Generated+Image"
                  altText="Test Generated Image"
                  className="max-w-sm"
                />
              </div>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-gray-800 mb-3">
                ✅ Issue 2: Agent Response Formatting
              </h2>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-green-800 text-sm mb-4">
                  <strong>Fixed:</strong> Proper markdown rendering with improved readability and maritime greeting logic
                </p>
                
                <div className="space-y-4">
                  <div>
                    <h3 className="font-medium text-gray-700 mb-2">First Message (Full Greeting):</h3>
                    <div className="bg-gray-100 rounded-lg p-4">
                      <MarkdownRenderer content={testContent} />
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="font-medium text-gray-700 mb-2">Subsequent Message (Brief Acknowledgment):</h3>
                    <div className="bg-gray-100 rounded-lg p-4">
                      <MarkdownRenderer content={maritimeTestContent} />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-gray-800 mb-3">
                🔧 Test Custom Content
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Test Markdown Content:
                  </label>
                  <textarea
                    value={testContent}
                    onChange={(e) => setTestContent(e.target.value)}
                    className="w-full h-32 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="Enter markdown content to test..."
                  />
                </div>
                
                <div>
                  <h3 className="font-medium text-gray-700 mb-2">Rendered Output:</h3>
                  <div className="bg-gray-100 rounded-lg p-4 border">
                    <MarkdownRenderer content={testContent} />
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-medium text-blue-800 mb-2">✨ Key Improvements</h3>
              <ul className="text-blue-700 text-sm space-y-1">
                <li>• <strong>Secure Image Storage:</strong> User-specific paths with signed URLs</li>
                <li>• <strong>Image Download:</strong> Save button with secure download endpoint</li>
                <li>• <strong>Markdown Rendering:</strong> Proper formatting with headings, lists, and emphasis</li>
                <li>• <strong>Maritime Greeting Logic:</strong> Full greetings only on first interaction</li>
                <li>• <strong>Improved Readability:</strong> Better spacing and text structure</li>
                <li>• <strong>Consistent Experience:</strong> All chat interfaces updated</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
