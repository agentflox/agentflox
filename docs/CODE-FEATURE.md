# Comprehensive Docs Feature Implementation Prompt - Enterprise Stack

## Overview
Create a full-featured documentation system similar to ClickUp Docs with hierarchical document management, real-time editing, and AI assistance capabilities using world-class enterprise technologies.

## Enterprise Technology Stack

### State Management & Data Fetching
- **TanStack Query v5** (React Query) - Server state management, caching, optimistic updates
- **Zustand** - Client-side state for UI preferences and editor state
- **SWR** - Alternative/complementary data fetching for real-time updates
- **Jotai** - Atomic state management for fine-grained reactivity

### Database & ORM
- **Prisma** - Type-safe ORM with PostgreSQL
- **PostgreSQL** - Primary database with JSONB for document content
- **Redis** - Caching layer for frequently accessed documents

### Real-time & Collaboration
- **Socket.io** - Custom WebSocket implementation option

### Rich Text Editor
- **Tiptap** - Headless editor built on ProseMirror (recommended)

### AI Integration
- **Vercel AI SDK** - Unified interface for AI providers
- **LangChain** - AI orchestration and prompt management

### UI Component Library
- **shadcn/ui** - Customizable, accessible components built on Radix
- **Radix UI** - Unstyled, accessible primitives
- **Tailwind CSS v4** - Utility-first styling with custom design system
- **Framer Motion** - Advanced animations and transitions
- **Lucide Icons** - Modern, consistent icon set

### Forms & Validation
- **React Hook Form** - Performant form state management
- **Zod** - Schema validation for TypeScript
- **Conform** - Progressive enhancement for forms

### Search
- **PostgreSQL Full-Text Search** - Built-in option for simple cases

### File Storage
- **Supabase storage** - Enterprise-grade object storage

## Project Structure (Next.js 15 App Router)

```
app/
├── (dashboard)/
│   └── docs/
│       ├── page.tsx                    # Docs listing (RSC)
│       ├── [docId]/
│       │   ├── page.tsx                # Doc viewer/editor (RSC)
│       │   └── [subDocId]/
│       │       └── page.tsx            # Sub-doc viewer (RSC)
│       └── layout.tsx                  # Docs layout wrapper
│
├── api/
│   └── docs/
│       ├── route.ts                    # GET/POST docs
│       ├── [docId]/
│       │   ├── route.ts                # GET/PATCH/DELETE single doc
│       │   ├── versions/route.ts       # Version history
│       │   ├── ai/
│       │   │  
│       │   └── subdocs/route.ts        # Sub-document operations
│       └── search/route.ts             # Document search
│
├── ai/
│   ├── openai.ts                       # Claude API client
│   ├── prompts.ts                      # AI prompt templates
│   └── embeddings.ts                   # Vector embeddings for search
├── hooks/
│   ├── use-docs.ts                     # TanStack Query hooks
│   ├── use-editor.ts                   # Editor state hooks
│   └── use-ai.ts                       # AI interaction hooks
└── utils/
    ├── editor/
    │   ├── extensions.ts               # Tiptap extensions
    │   └── shortcuts.ts                # Keyboard shortcuts
    └── collaboration.ts                # Liveblocks utilities

components/
├── entities/
│   └── docs/
│       ├── DocEditor.tsx              # Rich text editor
│       ├── DocSidebar.tsx             # Document tree
│       ├── DocHeader.tsx              # Doc title/actions
│       ├── AIPanel.tsx                # AI assistant panel
│       ├── AICommandMenu.tsx         # Command palette
│       └── DocComments.tsx            # Comments system
│
├── features/
│   └── dashboard/
│       └── docs/
│           ├── DocsLayout.tsx         # Main layout component
│           ├── DocsListView.tsx      # List view
│           ├── DocsEditorView.tsx    # Editor view
│           └── DocsSidebaLayout.tsx # Sidebar layout
│
└── ui/                                 # shadcn/ui components
    ├── button.tsx
    ├── dialog.tsx
    ├── dropdown-menu.tsx
    └── ...

stores/
├── editor-store.ts                     # Zustand editor state
├── sidebar-store.ts                    # Sidebar UI state
└── ai-store.ts                         # AI panel state
```

## Core Features with Enterprise Stack

### 1. DocsLayout Component (Detailed Breakdown)

**Purpose**: The main layout wrapper that provides the three-panel interface for the docs feature.

#### Structure
```typescript
// features/dashboard/docs/DocsLayout.tsx
'use client'

import { useState } from 'react'
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels'
import { useDocsLayoutStore } from '@/stores/docs-layout-store'
import { DocsSidebarLayout } from './docs-sidebar-layout'
import { DocsEditorView } from './docs-editor-view'
import { AIAssistantPanel } from '@/components/entities/docs/ai-panel'
import { CommandMenu } from '@/components/entities/docs/ai-command-menu'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { Button } from '@/components/ui/button'
import { 
  PanelLeftClose, 
  PanelLeftOpen, 
  Sparkles 
} from 'lucide-react'

interface DocsLayoutProps {
  children: React.ReactNode
  initialDoc?: Doc
}

export function DocsLayout({ children, initialDoc }: DocsLayoutProps) {
  // Layout state from Zustand
  const {
    isSidebarCollapsed,
    isAIPanelOpen,
    toggleSidebar,
    toggleAIPanel
  } = useDocsLayoutStore()

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Top Bar - Breadcrumb & Quick Actions */}
      <header className="flex h-14 items-center justify-between border-b px-4">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="h-8 w-8"
          >
            {isSidebarCollapsed ? <PanelLeftOpen /> : <PanelLeftClose />}
          </Button>
          
          <Breadcrumb items={breadcrumbItems} />
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleAIPanel}
            className="gap-2"
          >
            <Sparkles className="h-4 w-4" />
            AI Assistant
          </Button>
          {/* Share, Settings, etc. */}
        </div>
      </header>

      {/* Main Content - Resizable Panels */}
      <div className="flex-1 overflow-hidden">
        <PanelGroup direction="horizontal">
          {/* LEFT PANEL - Document Sidebar */}
          {!isSidebarCollapsed && (
            <>
              <Panel
                defaultSize={20}
                minSize={15}
                maxSize={30}
                collapsible
                className="border-r"
              >
                <DocsSidebarLayout />
              </Panel>
              <PanelResizeHandle className="w-1 hover:bg-primary/20 transition-colors" />
            </>
          )}

          {/* CENTER PANEL - Editor */}
          <Panel defaultSize={60} minSize={40}>
            {children}
          </Panel>

          {/* RIGHT PANEL - AI Assistant */}
          {isAIPanelOpen && (
            <>
              <PanelResizeHandle className="w-1 hover:bg-primary/20 transition-colors" />
              <Panel
                defaultSize={25}
                minSize={20}
                maxSize={40}
                collapsible
                className="border-l"
              >
                <AIAssistantPanel />
              </Panel>
            </>
          )}
        </PanelGroup>
      </div>

      {/* Command Palette - Keyboard Shortcuts */}
      <CommandMenu />
    </div>
  )
}
```

#### Key Features of DocsLayout

**1. Resizable Panels**
- Uses `react-resizable-panels` for smooth panel resizing
- Users can drag handles to adjust sidebar/editor/AI panel widths
- Panel sizes persist in localStorage via the store
- Collapsible panels with minimum/maximum size constraints

**2. Three-Panel Architecture**

**Left Panel (Sidebar)**:
- Document tree navigation
- Search bar
- Create new doc button
- Recent docs, favorites, archive
- Can be collapsed with toggle button
- Width: 15-30% of screen (default 20%)

**Center Panel (Editor)**:
- Main document editing area
- Always visible (takes remaining space)
- Focus mode can hide sidebar and AI panel
- Minimum 40% width to ensure readability

**Right Panel (AI Assistant)**:
- Optional, toggleable AI panel
- Shows AI suggestions, enhancements
- Quick access to AI features
- Can be closed when not needed
- Width: 20-40% when open (default 25%)

**3. Top Header Bar**
- Sidebar toggle button
- Breadcrumb navigation (Home > Projects > Document Name)
- Document title (editable inline)
- Quick actions: Share, Settings, Export
- AI Assistant toggle
- Collaboration indicators (avatars of active users)

**4. State Management**
```typescript
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface DocsLayoutStore {
  isSidebarCollapsed: boolean
  isAIPanelOpen: boolean
  focusMode: boolean
  sidebarWidth: number
  aiPanelWidth: number
  toggleSidebar: () => void
  toggleAIPanel: () => void
  toggleFocusMode: () => void
  setSidebarWidth: (width: number) => void
  setAIPanelWidth: (width: number) => void
}

export const useDocsLayoutStore = create<DocsLayoutStore>()(
  persist(
    (set) => ({
      isSidebarCollapsed: false,
      isAIPanelOpen: false,
      focusMode: false,
      sidebarWidth: 20,
      aiPanelWidth: 25,
      toggleSidebar: () => 
        set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),
      toggleAIPanel: () => 
        set((state) => ({ isAIPanelOpen: !state.isAIPanelOpen })),
      toggleFocusMode: () => 
        set((state) => ({ 
          focusMode: !state.focusMode,
          isSidebarCollapsed: !state.focusMode,
          isAIPanelOpen: false
        })),
      setSidebarWidth: (width) => set({ sidebarWidth: width }),
      setAIPanelWidth: (width) => set({ aiPanelWidth: width })
    }),
    { name: 'docs-layout-storage' }
  )
)
```

**5. Keyboard Shortcuts**
- `Ctrl+\` - Toggle sidebar
- `Ctrl+K` - Open command palette
- `Ctrl+Shift+A` - Toggle AI panel
- `Ctrl+Shift+F` - Toggle focus mode
- `Ctrl+P` - Quick doc switcher
- `Ctrl+N` - New document
- `Ctrl+/` - Show keyboard shortcuts help

**6. Responsive Behavior**

**Desktop (> 1024px)**:
- Full three-panel layout
- All resizing features enabled
- Persistent panel preferences

**Tablet (768px - 1024px)**:
- Sidebar starts collapsed
- AI panel appears as modal overlay instead of panel
- Center panel takes full width

**Mobile (< 768px)**:
- Sidebar becomes full-screen drawer
- AI panel becomes bottom sheet
- Editor takes full screen
- Hamburger menu for navigation

**7. Loading States**
```typescript
export function DocsLayoutSkeleton() {
  return (
    <div className="flex h-screen">
      <aside className="w-64 border-r">
        <Skeleton className="h-12 m-4" />
        <Skeleton className="h-8 mx-4 mb-2" />
        <Skeleton className="h-8 mx-4 mb-2" />
      </aside>
      <main className="flex-1">
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-full m-8" />
      </main>
    </div>
  )
}
```

**8. Integration with Server Components**
```typescript
// app/(dashboard)/docs/layout.tsx
import { DocsLayout } from '@/components/features/dashboard/docs/docs-layout'
import { getCurrentUser } from '@/lib/auth'
import { getDocsMetadata } from '@/lib/db/queries/docs'

export default async function DocsLayoutPage({
  children
}: {
  children: React.ReactNode
}) {
  const user = await getCurrentUser()
  const docsMetadata = await getDocsMetadata(user.id)

  return (
    <DocsLayout metadata={docsMetadata}>
      {children}
    </DocsLayout>
  )
}
```

### 2. Database Schema (Prisma)

```prisma
// prisma/schema.prisma

model Document {
  id          String    @id @default(cuid())
  title       String
  content     Json      @default("{}")  // ProseMirror/Tiptap JSON
  excerpt     String?   @db.Text
  emoji       String?
  coverImage  String?
  
  parentId    String?
  parent      Document? @relation("DocumentHierarchy", fields: [parentId], references: [id], onDelete: Cascade)
  children    Document[] @relation("DocumentHierarchy")
  
  workspaceId String
  workspace   Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  
  creatorId   String
  creator     User      @relation("DocumentCreator", fields: [creatorId], references: [id])
  
  isPublished Boolean   @default(false)
  isArchived  Boolean   @default(false)
  isFavorite  Boolean   @default(false)
  
  position    Int       @default(0)  // For ordering in sidebar
  
  permissions DocumentPermission[]
  versions    DocumentVersion[]
  comments    Comment[]
  
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  publishedAt DateTime?
  archivedAt  DateTime?
  
  @@index([workspaceId, parentId])
  @@index([creatorId])
  @@index([isArchived])
}

model DocumentVersion {
  id          String   @id @default(cuid())
  documentId  String
  document    Document @relation(fields: [documentId], references: [id], onDelete: Cascade)
  
  content     Json
  creatorId   String
  creator     User     @relation(fields: [creatorId], references: [id])
  
  version     Int
  createdAt   DateTime @default(now())
  
  @@index([documentId, version])
}

model DocumentPermission {
  id         String   @id @default(cuid())
  documentId String
  document   Document @relation(fields: [documentId], references: [id], onDelete: Cascade)
  
  userId     String?
  user       User?    @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  teamId     String?
  team       Team?    @relation(fields: [teamId], references: [id], onDelete: Cascade)
  
  role       PermissionRole @default(VIEWER)
  
  @@unique([documentId, userId])
  @@unique([documentId, teamId])
}

enum PermissionRole {
  VIEWER
  COMMENTER
  EDITOR
  ADMIN
}

model Comment {
  id         String   @id @default(cuid())
  documentId String
  document   Document @relation(fields: [documentId], references: [id], onDelete: Cascade)
  
  authorId   String
  author     User     @relation(fields: [authorId], references: [id])
  
  content    String   @db.Text
  position   Json?    // ProseMirror position for inline comments
  
  parentId   String?
  parent     Comment? @relation("CommentReplies", fields: [parentId], references: [id])
  replies    Comment[] @relation("CommentReplies")
  
  isResolved Boolean  @default(false)
  
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
  
  @@index([documentId])
  @@index([authorId])
}
```

### 3. Document Editor Implementation (Tiptap)

```typescript
// components/entities/docs/doc-editor.tsx
'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Collaboration from '@tiptap/extension-collaboration'
import CollaborationCursor from '@tiptap/extension-collaboration-cursor'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import Table from '@tiptap/extension-table'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import { useDoc, useUpdateDoc } from '@/lib/hooks/use-docs'
import { EditorToolbar } from './editor-toolbar'
import { AIFloatingMenu } from './ai-floating-menu'
import { useLiveblocks } from '@/lib/hooks/use-liveblocks'

interface DocEditorProps {
  docId: string
  initialContent?: any
}

export function DocEditor({ docId, initialContent }: DocEditorProps) {
  const { data: doc } = useDoc(docId)
  const { mutate: updateDoc } = useUpdateDoc()
  const { provider, awareness } = useLiveblocks(docId)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        history: false, // Disabled for collaboration
      }),
      Placeholder.configure({
        placeholder: 'Start writing or type / for commands...',
      }),
      Collaboration.configure({
        document: provider.document,
      }),
      CollaborationCursor.configure({
        provider,
        user: {
          name: 'User Name',
          color: '#f00',
        },
      }),
      Image,
      Link.configure({
        openOnClick: false,
      }),
      Table.configure({
        resizable: true,
      }),
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      // Custom slash commands extension
      SlashCommands,
    ],
    content: initialContent || doc?.content,
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-xl focus:outline-none max-w-none',
      },
    },
    onUpdate: ({ editor }) => {
      // Debounced auto-save
      debouncedSave(editor.getJSON())
    },
  })

  const debouncedSave = useDebouncedCallback((content) => {
    updateDoc({ id: docId, content })
  }, 2000)

  return (
    <div className="relative h-full">
      <EditorToolbar editor={editor} />
      <EditorContent 
        editor={editor} 
        className="h-full overflow-y-auto px-16 py-8"
      />
      <AIFloatingMenu editor={editor} />
    </div>
  )
}
```

### 4. AI Integration (Vercel AI SDK + Claude)

```typescript
// app/api/docs/[docId]/ai/enhance/route.ts
import { anthropic } from '@ai-sdk/anthropic'
import { streamText } from 'ai'
import { auth } from '@/lib/auth'

export async function POST(
  req: Request,
  { params }: { params: { docId: string } }
) {
  const { user } = await auth()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const { text, operation } = await req.json()

  const systemPrompt = getAIPrompt(operation)

  const result = await streamText({
    model: anthropic('claude-sonnet-4-20250514'),
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: `Please ${operation} the following text:\n\n${text}`,
      },
    ],
  })

  return result.toDataStreamResponse()
}

function getAIPrompt(operation: string): string {
  const prompts = {
    enhance: 'You are a helpful writing assistant. Improve the grammar, clarity, and style of the text while maintaining the original meaning.',
    expand: 'You are a helpful writing assistant. Expand on the given text with more details, examples, and context.',
    summarize: 'You are a helpful writing assistant. Create a concise summary of the text.',
    // ... more prompts
  }
  return prompts[operation] || prompts.enhance
}
```

```typescript
// lib/hooks/use-ai.ts
import { useCompletion } from 'ai/react'

export function useAIEnhance() {
  const { complete, completion, isLoading } = useCompletion({
    api: '/api/docs/ai/enhance',
  })

  const enhance = async (text: string, operation: string) => {
    await complete(text, {
      body: { operation },
    })
  }

  return { enhance, completion, isLoading }
}
```

### 5. Real-time Collaboration (Liveblocks)

```typescript
// lib/liveblocks.ts
import { createClient } from '@liveblocks/client'
import { createRoomContext } from '@liveblocks/react'

const client = createClient({
  authEndpoint: '/api/liveblocks-auth',
  throttle: 100,
})

export const {
  RoomProvider,
  useRoom,
  useMyPresence,
  useOthers,
  useStorage,
  useMutation,
} = createRoomContext(client)
```

```typescript
// components/providers/liveblocks-provider.tsx
'use client'

import { RoomProvider } from '@/lib/liveblocks'
import { useUser } from '@/lib/hooks/use-user'

export function LiveblocksProvider({ 
  children, 
  docId 
}: { 
  children: React.ReactNode
  docId: string 
}) {
  const { user } = useUser()

  return (
    <RoomProvider
      id={`doc-${docId}`}
      initialPresence={{
        cursor: null,
        selection: null,
      }}
      initialStorage={{
        // Document structure
      }}
    >
      {children}
    </RoomProvider>
  )
}
```

### 6. Search Implementation (Algolia)

```typescript
// lib/search/algolia.ts
import algoliasearch from 'algoliasearch'

const client = algoliasearch(
  process.env.ALGOLIA_APP_ID!,
  process.env.ALGOLIA_ADMIN_KEY!
)

const docsIndex = client.initIndex('documents')

export async function indexDocument(doc: Document) {
  await docsIndex.saveObject({
    objectID: doc.id,
    title: doc.title,
    content: extractText(doc.content),
    excerpt: doc.excerpt,
    workspaceId: doc.workspaceId,
    creatorId: doc.creatorId,
    createdAt: doc.createdAt.getTime(),
    updatedAt: doc.updatedAt.getTime(),
  })
}

export async function searchDocuments(
  query: string,
  filters?: string
) {
  return await docsIndex.search(query, {
    filters,
    attributesToHighlight: ['title', 'content'],
    hitsPerPage: 20,
  })
}
```

## Implementation Checklist

### Phase 1: Foundation (Week 1-2)
- [ ] Set up Next.js 15 project with TypeScript
- [ ] Configure Prisma with PostgreSQL
- [ ] Set up authentication (Clerk/Auth.js)
- [ ] Install and configure Tailwind + shadcn/ui
- [ ] Create basic routing structure
- [ ] Set up Zustand stores
- [ ] Configure TanStack Query

### Phase 2: Core Editor (Week 3-4)
- [ ] Implement Tiptap editor with extensions
- [ ] Create DocsLayout with resizable panels
- [ ] Build DocsSidebarLayout with tree view
- [ ] Add document CRUD operations
- [ ] Implement auto-save functionality
- [ ] Add keyboard shortcuts

### Phase 3: Hierarchy & Navigation (Week 5)
- [ ] Sub-document creation and nesting
- [ ] Drag-and-drop reordering
- [ ] Breadcrumb navigation
- [ ] Document tree expansion/collapse
- [ ] Quick switcher (Cmd+P)

### Phase 4: AI Features (Week 6-7)
- [ ] Integrate Anthropic Claude API
- [ ] Build AI panel component
- [ ] Implement text enhancement
- [ ] Add AI command palette
- [ ] Create slash commands for AI
- [ ] Add streaming responses

### Phase 5: Collaboration (Week 8-9)
- [ ] Integrate Liveblocks
- [ ] Add presence indicators
- [ ] Implement cursor tracking
- [ ] Build comments system
- [ ] Add @mentions

### Phase 6: Advanced Features (Week 10-12)
- [ ] Version history with diff view
- [ ] Search with Algolia
- [ ] Templates system
- [ ] Export functionality (PDF, Markdown)
- [ ] File uploads and embeds
- [ ] Permissions and sharing

### Phase 7: Polish & Optimization (Week 13-14)
- [ ] Performance optimization
- [ ] Mobile responsiveness
- [ ] Loading states and skeletons
- [ ] Error boundaries
- [ ] Analytics integration
- [ ] E2E testing

## Performance Optimizations

### Next.js Specific
- Use Server Components for static content (sidebar tree metadata)
- Use Client Components only for interactive parts (editor, AI panel)
- Implement streaming with Suspense boundaries
- Use Server Actions for mutations
- Enable Partial Prerendering (PPR) where applicable

### Database
- Index frequently queried fields (workspaceId, parentId, createdAt)
- Use connection pooling (Prisma)
- Implement Redis caching for hot documents
- Use PostgreSQL JSONB for document content with GIN indexes

### Real-time
- Throttle presence updates (100ms)
- Debounce document saves (2s)
- Use WebSocket only for active documents
- Implement optimistic updates with React Query

### Bundle Size
- Code-split AI features
- Lazy load Tiptap extensions
- Use dynamic imports for heavy components
- Tree-shake unused libraries