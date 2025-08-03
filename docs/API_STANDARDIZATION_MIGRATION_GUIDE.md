# CrewFlow API Standardization Migration Guide

## Overview

This guide covers the migration from inconsistent API response formats to the new standardized format across all CrewFlow endpoints.

## New Standardized Response Format

### Success Response Structure
```typescript
{
  success: true,
  data: any, // The actual response payload
  message: string, // Human-readable success message
  error: null,
  timestamp: string // ISO 8601 timestamp
}
```

### Error Response Structure
```typescript
{
  success: false,
  data: null,
  message: string, // Generic error message
  error: {
    code: string, // Standardized error code
    message: string, // Specific error message
    details?: any, // Additional error details
    field?: string, // For validation errors
    stack?: string // Only in development
  },
  timestamp: string // ISO 8601 timestamp
}
```

## Migration Changes by Endpoint Category

### 1. Authentication Endpoints

#### Before:
```typescript
// Success
{ authUrl: "...", integration: {...} }

// Error
{ error: "Authentication required" }
```

#### After:
```typescript
// Success
{
  success: true,
  data: { authUrl: "...", integration: {...} },
  message: "OAuth URL generated successfully",
  error: null,
  timestamp: "2024-01-01T12:00:00Z"
}

// Error
{
  success: false,
  data: null,
  message: "Authentication failed",
  error: {
    code: "AUTH_ERROR",
    message: "Authentication required"
  },
  timestamp: "2024-01-01T12:00:00Z"
}
```

### 2. AI Agent Chat Endpoints

#### Before:
```typescript
// Success
{
  response: "AI response text",
  threadId: "thread-123",
  tokensUsed: 150
}

// Error
{ error: "AI service failed" }
```

#### After:
```typescript
// Success
{
  success: true,
  data: {
    response: "AI response text",
    threadId: "thread-123",
    tokensUsed: 150,
    agent: {...},
    metadata: {...}
  },
  message: "Chat message processed successfully",
  error: null,
  timestamp: "2024-01-01T12:00:00Z"
}

// Error
{
  success: false,
  data: null,
  message: "Chat processing failed",
  error: {
    code: "AI_SERVICE_ERROR",
    message: "AI service failed",
    details: {...}
  },
  timestamp: "2024-01-01T12:00:00Z"
}
```

### 3. File Upload Endpoints

#### Before:
```typescript
// Success
{
  success: true,
  path: "file.jpg",
  publicUrl: "https://...",
  fileName: "file.jpg"
}

// Error
{ error: "File size exceeds limit" }
```

#### After:
```typescript
// Success
{
  success: true,
  data: {
    path: "file.jpg",
    publicUrl: "https://...",
    fileName: "file.jpg",
    fileType: "image/jpeg",
    fileSize: 1024
  },
  message: "File uploaded successfully",
  error: null,
  timestamp: "2024-01-01T12:00:00Z"
}

// Error
{
  success: false,
  data: null,
  message: "File upload failed",
  error: {
    code: "FILE_TOO_LARGE",
    message: "File size exceeds 25MB limit",
    details: { maxSize: "25MB", actualSize: "30MB" }
  },
  timestamp: "2024-01-01T12:00:00Z"
}
```

## Frontend Integration

### Using the New API Client

```typescript
import { apiClient, handleApiResponse, ApiError } from '@/lib/api/client'

// Example: Chat API call
const sendChatMessage = async (message: string) => {
  try {
    const response = await apiClient.post('/api/chat', {
      message,
      chatType: 'general'
    })

    handleApiResponse(
      response,
      (data) => {
        // Handle success
        console.log('Chat response:', data.response)
        setMessages(prev => [...prev, data])
      },
      (error) => {
        // Handle error
        console.error('Chat error:', error.message)
        setError(error.message)
      }
    )
  } catch (error) {
    console.error('Network error:', error)
  }
}

// Example: File upload
const uploadFile = async (file: File) => {
  try {
    const response = await apiClient.uploadFile('/api/upload/file', file)
    
    if (response.success) {
      console.log('File uploaded:', response.data.publicUrl)
    }
  } catch (error) {
    if (error instanceof ApiError) {
      if (error.code === 'FILE_TOO_LARGE') {
        alert('File is too large. Maximum size is 25MB.')
      }
    }
  }
}
```

### Using the React Hook

```typescript
import { useApiCall } from '@/lib/api/client'

const ChatComponent = () => {
  const { call, loading, error } = useApiCall()

  const sendMessage = async (message: string) => {
    const result = await call(
      () => apiClient.post('/api/chat', { message }),
      (data) => {
        // Success callback
        setMessages(prev => [...prev, data])
      },
      (error) => {
        // Error callback
        toast.error(error.message)
      }
    )
  }

  return (
    <div>
      {loading && <Spinner />}
      {error && <ErrorMessage error={error} />}
      {/* Chat UI */}
    </div>
  )
}
```

## Error Code Reference

### Authentication & Authorization
- `AUTH_ERROR` - Authentication failed
- `AUTHORIZATION_ERROR` - Insufficient permissions
- `TOKEN_EXPIRED` - Authentication token expired
- `INVALID_TOKEN` - Invalid authentication token

### Validation
- `VALIDATION_ERROR` - Request validation failed
- `MISSING_REQUIRED_FIELD` - Required field missing
- `INVALID_FORMAT` - Invalid data format

### Resources
- `NOT_FOUND` - Resource not found
- `ALREADY_EXISTS` - Resource already exists
- `CONFLICT` - Resource conflict

### Rate Limiting
- `RATE_LIMIT_EXCEEDED` - Rate limit exceeded

### File Operations
- `FILE_TOO_LARGE` - File exceeds size limit
- `INVALID_FILE_TYPE` - File type not supported
- `UPLOAD_FAILED` - File upload failed

### Integration Specific
- `SHOPIFY_API_ERROR` - Shopify API error
- `AI_SERVICE_ERROR` - AI service error
- `OAUTH_ERROR` - OAuth operation error

### Server Errors
- `INTERNAL_SERVER_ERROR` - Internal server error
- `DATABASE_ERROR` - Database operation error
- `EXTERNAL_SERVICE_ERROR` - External service error

## Backward Compatibility

The new API client automatically handles both old and new response formats during the transition period. Legacy responses are automatically converted to the new format internally.

## Testing

All endpoints have been updated to return the standardized format. Test your integrations with:

1. Success scenarios - verify `success: true` and `data` field
2. Error scenarios - verify `success: false` and `error` field structure
3. Validation errors - check for proper error codes and field information
4. Network errors - ensure proper timeout and network error handling

## Migration Checklist

- [ ] Update API calls to use new `apiClient`
- [ ] Replace direct response handling with `handleApiResponse`
- [ ] Update error handling to use new error codes
- [ ] Test all success and error scenarios
- [ ] Update TypeScript interfaces for response types
- [ ] Remove legacy error handling code after migration
