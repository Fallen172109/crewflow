# CrewFlow Image Upload Implementation

## Overview
This document outlines the comprehensive image upload functionality implemented for the CrewFlow Shopify AI chat interface. The system provides secure image uploads, AI-powered analysis, and seamless integration with product creation workflows.

## Features Implemented

### 1. Enhanced Image Upload Component (`ImageUpload.tsx`)
- **Drag-and-drop interface** with visual feedback
- **File validation** for image types (JPG, PNG, WebP, GIF)
- **Size limits** (configurable, default 15MB)
- **Real-time preview** with thumbnails
- **Product selection** toggle for e-commerce use
- **Progress indicators** for upload and analysis states

### 2. GPT-4 Vision Integration (`/api/ai/analyze-image`)
- **Automatic image analysis** using GPT-4 Vision API
- **E-commerce focused insights** including:
  - Product descriptions and relevance
  - Quality scoring (0-100%)
  - Suggested tags and keywords
  - Color palette detection
  - Style and mood analysis
  - E-commerce suitability assessment

### 3. Secure Image Storage (`image-storage.ts`)
- **User-specific storage paths** (`user-{userId}/folder/filename`)
- **Supabase Storage integration** with proper security policies
- **Signed URL generation** for secure access (24-hour expiry)
- **Automatic cleanup** and organization
- **Metadata tracking** (dimensions, format, size)

### 4. Database Schema (`chat_images` table)
- **Comprehensive metadata storage** including:
  - File information (name, size, type, dimensions)
  - Storage paths and URLs
  - AI analysis results
  - Product integration flags
  - Upload and analysis status tracking
- **Row Level Security (RLS)** policies
- **Automatic timestamp management**
- **Foreign key relationships** with threads and messages

### 5. Chat Integration
- **Inline image display** in chat messages
- **Analysis context** shown with images
- **Product selection** indicators
- **Thread persistence** with 30-day history
- **Responsive design** with white/orange/black theme

### 6. Error Handling & Security
- **Comprehensive error classification** with user-friendly messages
- **Retry logic** for transient failures
- **Authentication validation** at all levels
- **File validation** and security checks
- **Rate limiting** protection
- **Graceful degradation** when services are unavailable

## File Structure

```
src/
├── components/
│   ├── shopify/
│   │   ├── ImageUpload.tsx              # Main image upload component
│   │   └── ShopifyAIChat.tsx            # Updated with image support
│   ├── chat/
│   │   └── ImageMessageDisplay.tsx      # Image display in messages
│   └── ui/
│       └── FileUpload.tsx               # Enhanced with image types
├── lib/
│   ├── storage/
│   │   └── image-storage.ts             # Image storage service
│   └── errors/
│       └── image-upload-errors.ts       # Error handling system
├── app/api/
│   ├── ai/
│   │   └── analyze-image/route.ts       # GPT-4 Vision analysis
│   └── chat/
│       └── images/route.ts              # Image metadata CRUD
└── database/
    └── migrations/
        └── add_image_support_to_chat.sql # Database schema
```

## Usage Examples

### 1. Basic Image Upload
```typescript
<ImageUpload
  onImageUpload={handleImageUpload}
  maxImages={5}
  enableAnalysis={true}
  showProductSelection={true}
/>
```

### 2. Display Images in Chat
```typescript
<ImageMessageDisplay
  images={message.images}
  showAnalysis={true}
  showProductBadges={true}
  onToggleProductUse={handleToggleProductUse}
/>
```

### 3. Save Image to Database
```typescript
const response = await fetch('/api/chat/images', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    fileName: 'product-image.jpg',
    storagePath: 'user-123/uploads/image.jpg',
    analysisResult: { /* AI analysis data */ }
  })
})
```

## Testing Checklist

### Upload Functionality
- [ ] Drag and drop images
- [ ] Click to browse and select images
- [ ] File type validation (accept only images)
- [ ] File size validation (reject oversized files)
- [ ] Multiple image upload (up to configured limit)
- [ ] Upload progress indication
- [ ] Error handling for failed uploads

### AI Analysis
- [ ] Automatic analysis after upload
- [ ] Analysis progress indication
- [ ] Quality score calculation
- [ ] Tag and keyword generation
- [ ] E-commerce suitability assessment
- [ ] Graceful handling of analysis failures

### Chat Integration
- [ ] Images display inline in messages
- [ ] Analysis context shown with images
- [ ] Product selection toggles work
- [ ] Images persist in thread history
- [ ] Responsive design on mobile/desktop
- [ ] Theme consistency (white/orange/black)

### Database Operations
- [ ] Image metadata saved correctly
- [ ] Thread/message associations work
- [ ] User isolation (RLS policies)
- [ ] Analysis results stored properly
- [ ] Product flags updated correctly

### Error Handling
- [ ] Network errors handled gracefully
- [ ] Authentication errors show proper messages
- [ ] File validation errors are user-friendly
- [ ] Service unavailable scenarios handled
- [ ] Retry logic works for transient failures

### Security
- [ ] Authentication required for all operations
- [ ] User can only access their own images
- [ ] File type validation prevents malicious uploads
- [ ] Signed URLs expire properly
- [ ] Rate limiting prevents abuse

## Integration Points

### 1. Shopify Product Creation
- Images marked for product use are included in product creation requests
- AI analysis provides product descriptions and metadata
- Image quality scores help filter suitable product images

### 2. Thread Management
- Images are associated with specific threads
- Thread history includes image thumbnails
- 30-day retention policy applies to images

### 3. AI Chat Handlers
- Image analysis context is passed to AI models
- Product creation workflows use image insights
- Chat responses can reference uploaded images

## Configuration

### Environment Variables
```env
# Required for GPT-4 Vision
OPENAI_API_KEY=your_openai_key

# Supabase configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_key

# Optional: Custom limits
MAX_IMAGE_SIZE=15728640  # 15MB in bytes
MAX_IMAGES_PER_UPLOAD=8
```

### Supabase Storage Bucket
Create a `chat-images` bucket in Supabase with appropriate policies:
```sql
-- Enable RLS
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Users can upload to their own folder
CREATE POLICY "Users can upload images" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'chat-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);
```

## Performance Considerations

1. **Image Optimization**: Consider implementing client-side image compression
2. **Lazy Loading**: Images load on-demand in chat history
3. **Caching**: Signed URLs are cached for 24 hours
4. **Analysis Batching**: Multiple images can be analyzed together
5. **Storage Cleanup**: Implement periodic cleanup of expired images

## Future Enhancements

1. **Image Editing**: Basic crop/resize functionality
2. **Bulk Operations**: Select and manage multiple images
3. **Advanced Analysis**: Brand detection, text extraction
4. **Integration**: Direct Shopify image upload
5. **Optimization**: Automatic image compression and format conversion

## Support

For issues or questions regarding the image upload implementation:
1. Check the error logs in browser console
2. Verify Supabase storage policies
3. Confirm OpenAI API key has vision access
4. Test with different image formats and sizes
5. Review network requests in browser dev tools
