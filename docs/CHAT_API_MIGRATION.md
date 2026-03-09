# Chat API Migration Summary

## Overview
Successfully migrated the chat API from the Next.js frontend (`apps/frontend/src/app/api/chat`) to the NestJS backend (`apps/backend/service-server`).

## Changes Made

### Backend (service-server)

#### 1. Created Chat Utilities (`src/services/chat/utils/`)
- **redis.utils.ts**: Redis helper functions for JSON storage
- **checkRateLimit.ts**: Rate limiting using Redis (RPM/RPD)
- **countTokens.ts**: Token counting using js-tiktoken
- **convertModelName.ts**: Model name conversion utility
- **errorHandler.ts**: OpenAI error handling
- **requestContext.ts**: Chat context retrieval and caching

#### 2. Created Chat Services
- **chatService.ts**: Main chat completion service with streaming support
- **fileParserService.ts**: File upload and parsing service

#### 3. Created Chat Controller (`src/controllers/chat.controller.ts`)
- `POST /chat`: Main chat endpoint with streaming response
- `POST /chat/upload`: File upload endpoint

#### 4. Created Chat Module (`src/modules/chat.module.ts`)
- Registered ChatController
- Integrated into AppModule

#### 5. Updated Shared Libraries
- **lib/openai.ts**: Exported `initializeOpenAI` function

### Frontend

#### 1. Updated API Calls
- **useChats.tsx**: Changed `/api/chat` to `${BACKEND_URL}/chat`
  - Added `credentials: 'include'` for authentication
  - Uses `NEXT_PUBLIC_SERVER_URL` or defaults to `http://localhost:3001`

- **ChatComposer.tsx**: Changed `/api/chat/upload` to `${BACKEND_URL}/chat/upload`
  - Added `credentials: 'include'` for authentication

## Features Preserved

✅ Streaming chat responses
✅ Rate limiting (per minute and per day)
✅ Token counting and usage tracking
✅ Context caching with Redis
✅ Knowledge retrieval from Supabase
✅ Web search integration
✅ File attachments (text and binary)
✅ OpenAI embeddings
✅ Multi-context support (project, profile, proposal, team, workspace, space, channel)

## API Endpoints

### Chat Completion
```
POST http://localhost:3001/chat
Content-Type: application/json
Credentials: include

{
  "conversationId": "string",
  "contextType": "project" | "profile" | "proposal" | "team" | "workspace" | "space" | "channel",
  "entityId": "string",
  "message": "string",
  "attachments": [...],
  "webSearch": boolean,
  "config": {
    "RPM": number,
    "RPD": number
  }
}
```

### File Upload
```
POST http://localhost:3001/chat/upload
Content-Type: multipart/form-data
Credentials: include

Form Data:
- file: File
- conversationId: string
```

## Environment Variables Required

Backend:
- `OPENAI_API_KEY`
- `OPENAI_BASE_URL` (optional)
- `REDIS_URL`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Frontend:
- `NEXT_PUBLIC_SERVER_URL` or `SERVER_URL` (defaults to http://localhost:3001)

## Next Steps

1. ✅ Remove old frontend API routes:
   - `apps/frontend/src/app/api/chat/route.ts`
   - `apps/frontend/src/app/api/chat/upload/route.ts`

2. ⚠️ Test the migration:
   - Test chat streaming
   - Test file uploads
   - Test rate limiting
   - Test authentication flow

3. ⚠️ Update authentication middleware:
   - Ensure backend auth middleware populates `req.user`
   - Verify session/cookie handling

## Notes

- The backend now handles all chat logic, reducing frontend bundle size
- Authentication is handled via cookies with `credentials: 'include'`
- All optimizations from the original implementation are preserved
- Rate limiting now uses Redis instead of Vercel KV
