# Enterprise-Grade Realtime Collaboration Editor

## 📦 Required Dependencies

### Frontend (apps/frontend)
```bash
pnpm --filter agentflox add yjs y-protocols @tiptap/extension-collaboration @tiptap/extension-collaboration-cursor y-indexeddb
```

### Backend (apps/backend)
```bash
pnpm --filter service-server add yjs y-protocols lib0
```

## 🎯 Key Features

- ✅ **Opt-in via prop** - Collaboration enabled only when explicitly requested
- ✅ **Version History** - 50 versions stored in Redis with 7-day retention
- ✅ **Document Permissions** - Uses existing entity-level permission model
- ✅ **Yjs CRDT** - Conflict-free replicated data types for automatic merging
- ✅ **Real-time Sync** - Socket.IO transport with automatic reconnection
- ✅ **Cursor Tracking** - See other users' cursors and selections
- ✅ **Offline Support** - IndexedDB persistence for offline editing
- ✅ **Active Users** - Track who's currently editing each document

## 🏗️ Architecture

```
DescriptionEditor (with collaboration prop)
    ↓
useCollaborativeEditor hook
    ↓
CollaborationProvider
    ↓
Socket.IO ←→ Backend CollaborationService ←→ Redis
```

## 📁 Files Created

### Backend
- `apps/backend/src/schemas/collaborationSchemas.ts` - Zod validation schemas
- `apps/backend/src/services/socket/collaborationService.ts` - Document state management

### Frontend
- `apps/frontend/src/components/providers/CollaborationProvider.tsx` - Context provider
- `apps/frontend/src/hooks/useCollaborativeEditor.ts` - TipTap integration hook
- `packages/types/socket-events.ts` - Updated with collaboration events

## 🔄 Next Steps

1. **Install Dependencies** (manual, due to PowerShell restrictions)
2. **Update DescriptionEditor** - Add collaboration prop and hook integration
3. **Uncomment Package Code** - Remove placeholder logic in Provider/Hook
4. **Create Socket Handler** - Backend gateway implementation
5. **Test** - Multi-user editing scenarios

## 💡 Usage Example

```typescript
<DescriptionEditor
  content={description}
  onChange={handleChange}
  editable={canEdit}
  // Enable collaboration with document ID
  collaboration={{
    enabled: true,
    documentId: task.id,
    documentType: 'task',
  }}
/>
```

## ⚠️ Important Notes

- Collaboration is **opt-in** - existing editors work unchanged
- Requires dependencies to be installed (see above)
- Backend Socket.IO handler needs to be implemented
- Provider/Hook have placeholder code until packages installed
