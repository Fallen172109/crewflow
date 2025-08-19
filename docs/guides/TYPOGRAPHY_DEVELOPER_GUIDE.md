# 📝 CrewFlow Typography Developer Guide

## 🎯 Quick Reference

### For AI Response Content
**Always use**: `<MarkdownRenderer content={responseText} />`
**Never use**: `prose`, `prose-sm`, `prose-lg` classes (not installed)

### For Static Content
**Use**: Standard Tailwind typography classes
**Example**: `text-gray-900`, `text-lg`, `font-semibold`

## 🎨 Typography System

### AI Response Typography
All AI agent responses automatically use the `.crewflow-markdown-content` system:

```tsx
import MarkdownRenderer from '@/components/chat/MarkdownRenderer'

// ✅ Correct usage
<MarkdownRenderer content={aiResponse} />

// ❌ Avoid wrapping in prose classes
<div className="prose">
  <MarkdownRenderer content={aiResponse} />
</div>
```

### Font Hierarchy
| Element | Class | Size | Weight | Color |
|---------|-------|------|--------|-------|
| H1 | Auto-applied | 24px | Bold | #1f2937 |
| H2 | Auto-applied | 20px | Semibold | #1f2937 |
| H3 | Auto-applied | 18px | Semibold | #1f2937 |
| Body | Auto-applied | 14px | Regular | #374151 |
| Code | Auto-applied | 13px | Mono | #1f2937 |

### Manual Typography Classes
For non-AI content, use these Tailwind classes:

```tsx
// Headings
<h1 className="text-3xl font-bold text-gray-900">Main Title</h1>
<h2 className="text-xl font-semibold text-gray-900">Section Title</h2>
<h3 className="text-lg font-medium text-gray-900">Subsection</h3>

// Body text
<p className="text-sm text-gray-700">Regular content</p>
<p className="text-xs text-gray-500">Small text</p>

// Code
<code className="bg-gray-100 px-1 py-0.5 rounded text-sm font-mono">code</code>
```

## 🚢 Maritime Theme Integration

### Maritime Emojis
These are automatically highlighted in orange:
- ⚓ (anchor)
- 🚢 (ship)
- 🌊 (wave)
- ⛵ (sailboat)

### Maritime Terms
These terms are automatically highlighted:
- Captain, Admiral, Crew
- Maritime, Navigation, Anchor
- Helm, Compass, Port, Starboard

### Custom Maritime Styling
```css
.maritime-emoji {
  color: #f97316; /* Orange accent */
}

.maritime-highlight {
  background-color: #fff7ed; /* Light orange background */
  color: #c2410c; /* Dark orange text */
  padding: 0.125rem 0.25rem;
  border-radius: 0.25rem;
}
```

## 🔧 Implementation Patterns

### Chat Interfaces
```tsx
// Message rendering
{message.type === 'agent' ? (
  <MarkdownRenderer content={message.content} />
) : (
  <div className="whitespace-pre-wrap">{message.content}</div>
)}
```

### Response Displays
```tsx
// Agent response container
<div className="max-w-none">
  <MarkdownRenderer content={response.response} />
</div>
```

### Static Content Pages
```tsx
// Legal pages, documentation
<div className="max-w-none">
  <h1 className="text-4xl font-bold text-gray-900 mb-8">Page Title</h1>
  <p className="text-gray-700 mb-4">Content paragraph</p>
</div>
```

## ⚠️ Common Mistakes to Avoid

### ❌ Don't Use Prose Classes
```tsx
// Wrong - prose classes not installed
<div className="prose prose-lg">
  <MarkdownRenderer content={text} />
</div>
```

### ❌ Don't Override AI Typography
```tsx
// Wrong - conflicts with crewflow-markdown-content
<div className="text-2xl">
  <MarkdownRenderer content={text} />
</div>
```

### ❌ Don't Mix Typography Systems
```tsx
// Wrong - inconsistent styling
<div className="prose">
  <p className="text-sm">Mixed systems</p>
</div>
```

## ✅ Best Practices

### 1. Use MarkdownRenderer for AI Content
```tsx
// AI responses, generated content
<MarkdownRenderer content={aiGeneratedText} />
```

### 2. Use Tailwind Classes for UI Elements
```tsx
// Navigation, buttons, labels
<button className="text-sm font-medium text-gray-700">
  Button Text
</button>
```

### 3. Maintain Consistency
```tsx
// Keep similar elements styled the same way
<h2 className="text-lg font-semibold text-gray-900 mb-4">
  Section Title
</h2>
```

### 4. Test Typography Changes
Always test on the typography test page:
```
http://localhost:3005/test-typography-fix
```

## 🎨 Color Palette

### Text Colors
- **Primary**: `text-gray-900` (#1f2937)
- **Secondary**: `text-gray-700` (#374151)
- **Muted**: `text-gray-500` (#6b7280)
- **Maritime Orange**: `text-orange-600` (#ea580c)

### Background Colors
- **Code**: `bg-gray-100` (#f3f4f6)
- **Maritime Highlight**: `bg-orange-50` (#fff7ed)
- **Cards**: `bg-white` (#ffffff)

## 📱 Responsive Considerations

### Font Sizes Scale Automatically
The typography system is responsive by default:
- Mobile: Optimized for readability
- Tablet: Proper scaling maintained
- Desktop: Full hierarchy visible

### Line Heights
- **Body text**: 1.6 for optimal readability
- **Headings**: 1.3 for compact appearance
- **Code**: 1.4 for technical content

## 🧪 Testing Checklist

Before deploying typography changes:

- [ ] Test on `/test-typography-fix` page
- [ ] Verify AI responses render correctly
- [ ] Check maritime theme elements
- [ ] Validate accessibility (contrast ratios)
- [ ] Test on mobile devices
- [ ] Verify no console errors

## 📚 Resources

- **Test Page**: `/test-typography-fix`
- **CSS File**: `src/app/globals.css`
- **Component**: `src/components/chat/MarkdownRenderer.tsx`
- **Documentation**: `TYPOGRAPHY_FIX_SUMMARY.md`

## 🚀 Future Enhancements

Consider these improvements for future versions:
- Dark mode typography support
- Additional maritime terminology
- Enhanced code syntax highlighting
- Custom font loading optimization
- Advanced accessibility features
