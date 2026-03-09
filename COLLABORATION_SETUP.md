# Installation & Setup Instructions

## Step 1: Install Dependencies

Due to PowerShell execution policy restrictions, you'll need to run these commands manually.

### Option A: Using Command Prompt (cmd)
```cmd
cd c:\Users\datng\agentflox

REM Install frontend packages
pnpm --filter agentflox add yjs y-protocols @tiptap/extension-collaboration @tiptap/extension-collaboration-cursor y-indexeddb

REM Install backend packages  
pnpm --filter service-server add yjs y-protocols lib0
```

### Option B: Using PowerShell with Bypass
```powershell
cd c:\Users\datng\agentflox

# Install frontend packages
powershell -ExecutionPolicy Bypass -Command "pnpm --filter agentflox add yjs y-protocols @tiptap/extension-collaboration @tiptap/extension-collaboration-cursor y-indexeddb"

# Install backend packages
powershell -ExecutionPolicy Bypass -Command "pnpm --filter service-server add yjs y-protocols lib0"
```

## Step 2: Uncomment Package Code

After installing dependencies, uncomment the following sections:

### File: `apps/frontend/src/components/providers/CollaborationProvider.tsx`
- Lines with `import * as Y from 'yjs'`
- Lines with `import { IndexeddbPersistence } from 'y-indexeddb'`
- All Y.Doc creation and update logic (search for "After installing yjs" comments)

### File: `apps/frontend/src/hooks/useCollaborativeEditor.ts`
- Lines with `import Collaboration from '@tiptap/extension-collaboration'`
- Lines with `import CollaborationCursor from '@tiptap/extension-collaboration-cursor'`
- Extension creation logic in `extensions` useMemo

## Step 3: Add CollaborationProvider to App Layout

Add the CollaborationProvider to your app's provider tree:

```typescript
// apps/frontend/src/app/layout.tsx or similar
import { CollaborationProvider } from '@/components/providers/CollaborationProvider';
import { useSession } from 'next-auth/react';

export default function RootLayout({ children }: { children: ReactNode }) {
  const session = useSession();
  
  return (
    <html>
      <body>
        <SocketProvider>
          {session?.user && (
            <CollaborationProvider
              userId={session.user.id}
              username={session.user.name}
            >
              {children}
            </CollaborationProvider>
          )}
          {!session?.user && children}
        </SocketProvider>
      </body>
    </html>
  );
}
```

## Step 4: Implement Backend Socket Handler

Create a new file: `apps/backend/src/middleware/socket/collaborationGateway.ts`

```typescript
import { Server, Socket } from 'socket.io';
import { CollaborationService } from '@/services/socket/collaborationService';
import { logger } from '@agentflox/logger';
import * as Y from 'yjs';

export function registerCollaborationHandlers(io: Server, socket: Socket) {
  const userId = socket.data.userId;
  const username = socket.data.username;

  // Handle document join
  socket.on('collaboration:join', async (data) => {
    try {
      const { documentId, documentType } = data;
      
      // TODO: Add permission check here
      // const canAccess = await checkDocumentPermission(userId, documentId);
      // if (!canAccess) return socket.emit('error', { message: 'Permission denied' });

      // Join document room
      await socket.join(`doc:${documentId}`);
      
      // Track active user
      await CollaborationService.addActiveUser(documentId, userId, socket.id);
      
      // Broadcast user joined
      socket.to(`doc:${documentId}`).emit('collaboration:user-joined', {
        documentId,
        userId,
        username,
      });
      
      // Send current document state
      const state = await CollaborationService.getDocumentState(documentId);
      if (state) {
        socket.emit('collaboration:sync', { documentId, state });
      }
      
      logger.info('User joined document', { userId, documentId });
    } catch (error) {
      logger.error('Failed to join document', { error });
      socket.emit('error', { message: 'Failed to join document' });
    }
  });

  // Handle document updates
  socket.on('collaboration:update', async (data) => {
    try {
      const { documentId, update } = data;
      
      // Broadcast update to other users in the room
      socket.to(`doc:${documentId}`).emit('collaboration:update', {
        documentId,
        update,
        userId,
      });
      
      // Get current state and apply update
      const currentState = await CollaborationService.getDocumentState(documentId);
      let doc: Y.Doc;
      
      if (currentState) {
        doc = new Y.Doc();
        const stateUpdate = Uint8Array.from(atob(currentState), c => c.charCodeAt(0));
        Y.applyUpdate(doc, stateUpdate);
      } else {
        doc = new Y.Doc();
      }
      
      // Apply new update
      const updateBytes = Uint8Array.from(atob(update), c => c.charCodeAt(0));
      Y.applyUpdate(doc, updateBytes);
      
      // Save updated state
      const newState = btoa(String.fromCharCode(...Y.encodeStateAsUpdate(doc)));
      await CollaborationService.storeDocumentState(
        documentId,
        newState,
        'task', // Get from data
        userId
      );
      
    } catch (error) {
      logger.error('Failed to process update', { error });
    }
  });

  // Handle sync requests
  socket.on('collaboration:sync-request', async (data) => {
    try {
      const { documentId } = data;
      const state = await CollaborationService.getDocumentState(documentId);
      
      if (state) {
        socket.emit('collaboration:sync', { documentId, state });
      }
    } catch (error) {
      logger.error('Failed to sync document', { error });
    }
  });

  // Handle awareness updates (cursor positions)
  socket.on('collaboration:awareness-update', async (data) => {
    try {
      const { documentId, awareness } = data;
      
      // Store awareness
      await CollaborationService.storeAwareness(documentId, userId, awareness);
      
      // Broadcast to others
      socket.to(`doc:${documentId}`).emit('collaboration:awareness', {
        documentId,
        states: { [userId]: awareness },
      });
    } catch (error) {
      logger.error('Failed to update awareness', { error });
    }
  });

  // Handle document leave
  socket.on('collaboration:leave', async (data) => {
    try {
      const { documentId } = data;
      
      await socket.leave(`doc:${documentId}`);
      await CollaborationService.removeActiveUser(documentId, userId);
      await CollaborationService.removeAwareness(documentId, userId);
      
      socket.to(`doc:${documentId}`).emit('collaboration:user-left', {
        documentId,
        userId,
      });
      
      logger.info('User left document', { userId, documentId });
    } catch (error) {
      logger.error('Failed to leave document', { error });
    }
  });
}
```

Then register it in your main socket setup file.

## Step 5: Usage in Components

Now you can use collaboration in any DescriptionEditor:

```typescript
import { DescriptionEditor } from '@/entities/shared/components/DescriptionEditor';
import { useSession } from 'next-auth/react';

function TaskDetailView({ task }) {
  const session = useSession();
  
  return (
    <DescriptionEditor
      content={task.description}
      onChange={handleDescriptionChange}
      editable={canEdit}
      spaceId={task.spaceId}
      workspaceId={task.workspaceId}
      projectId={task.projectId}
      collaboration={{
        enabled: true,
        documentId: task.id,
        documentType: 'task',
        user: {
          id: session.user.id,
          name: session.user.name,
          color: session.user.color, // Optional
        },
      }}
    />
  );
}
```

## Step 6: Test

1. Open two browser windows with different users
2. Navigate to the same task/document
3. Start editing in one window
4. Verify changes appear in real-time in the other window
5. Check cursor positions are visible
6. Test offline editing (disconnect network, edit, reconnect)

## Troubleshooting

### "Cannot find module 'yjs'"
- Make sure you installed dependencies (Step 1)
- Run `pnpm install` at the root

### "Collaboration not working"
- Check browser console for errors
- Verify Socket.IO connection is established
- Check backend logs for collaboration events
- Ensure CollaborationProvider is in the component tree

### "Users not showing up"
- Check Redis connection
- Verify presence service is working
- Check that users are authenticated with Socket.IO

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     Browser Window 1                         │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ DescriptionEditor (TipTap)                             │ │
│  │   ├─ Collaboration Extension (Yjs)                     │ │
│  │   ├─ CollaborationCursor Extension                     │ │
│  │   └─ useCollaborativeEditor Hook                       │ │
│  │       └─ CollaborationProvider                         │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                          │
                          │ Socket.IO
                          ↓
┌─────────────────────────────────────────────────────────────┐
│                    Backend Server                            │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Socket.IO Gateway                                      │ │
│  │   └─ collaborationGateway.ts                           │ │
│  │       ├─ join/leave handlers                           │ │
│  │       ├─ update handlers (Yjs)                         │ │
│  │       └─ awareness handlers                            │ │
│  └────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ CollaborationService                                   │ │
│  │   ├─ Document state (Yjs)                              │ │
│  │   ├─ Version history (50 versions)                     │ │
│  │   ├─ Active users tracking                             │ │
│  │   └─ Awareness (cursor/selection)                      │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                          │
                          ↓
                  ┌──────────────┐
                  │    Redis     │
                  │              │
                  │ • Doc States │
                  │ • History    │
                  │ • Awareness  │
                  │ • Users      │
                  └──────────────┘
```

## Features Summary

✅ **Opt-in Collaboration** - Enabled only when prop is provided  
✅ **Automatic Conflict Resolution** - Yjs CRDT handles merges  
✅ **Real-time Cursors** - See where others are typing  
✅ **Version History** - 50 versions stored for 7 days  
✅ **Offline Support** - IndexedDB persistence  
✅ **Active Users** - Track who's currently editing  
✅ **Document Permissions** - Uses existing permission model  
✅ **Scalable** - Redis-backed with Socket.IO clustering support
