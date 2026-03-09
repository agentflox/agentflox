# Space Components

This directory contains modularized components for the Space Detail View, following best practices for maintainability and scalability.

## Architecture

The Space Detail View has been refactored to use a component-based architecture where each tab is a separate, self-contained component.

### Component Structure

```
features/dashboard/components/space/
├── index.ts                    # Barrel export for all components
├── SpaceProjectsTab.tsx        # Projects tab with grid layout
├── SpaceTeamsTab.tsx           # Teams tab with grid layout
├── SpaceToolsTab.tsx           # Tools tab with card layout
├── SpaceMaterialsTab.tsx       # Materials tab with card layout
├── SpaceDocumentsTab.tsx       # Documents tab (placeholder)
└── SpaceTasksTab.tsx           # Tasks tab (wraps TaskView)
```

## Components

### SpaceProjectsTab
Displays projects associated with a space in a responsive grid layout.

**Features:**
- Empty state with call-to-action
- Project cards with hover effects
- Detach functionality with optimistic updates
- Responsive grid (2 cols on sm, 3 cols on xl)

**Props:**
```typescript
interface SpaceProjectsTabProps {
  workspaceId: string;
  spaceId: string;
  projects?: Project[];
  onAddClick?: () => void;
}
```

### SpaceTeamsTab
Displays teams associated with a space.

**Features:**
- Empty state with call-to-action
- Team cards with member count
- Detach functionality
- Status badges

**Props:**
```typescript
interface SpaceTeamsTabProps {
  workspaceId: string;
  spaceId: string;
  teams?: Team[];
  onAddClick?: () => void;
}
```

### SpaceToolsTab
Displays tools in a card-based layout.

**Features:**
- Public/Private badges with color coding
- Empty state
- Card-based layout
- Detach functionality

**Props:**
```typescript
interface SpaceToolsTabProps {
  workspaceId: string;
  spaceId: string;
  tools?: Tool[];
  onAddClick?: () => void;
}
```

### SpaceMaterialsTab
Displays materials with pricing information.

**Features:**
- Price display
- Public/Private status
- Card layout
- Detach functionality

**Props:**
```typescript
interface SpaceMaterialsTabProps {
  workspaceId: string;
  spaceId: string;
  materials?: Material[];
  onAddClick?: () => void;
}
```

### SpaceDocumentsTab
Placeholder for future document management.

**Props:** None (self-contained)

### SpaceTasksTab
Wraps the TaskView component for space-specific tasks.

**Props:**
```typescript
interface SpaceTasksTabProps {
  spaceId: string;
  workspaceId: string;
}
```

## Design Principles

### 1. **Single Responsibility**
Each component handles one tab's functionality and presentation.

### 2. **Consistent UI/UX**
- All tabs use similar empty states
- Consistent hover effects and transitions
- Uniform card/grid layouts
- Professional color palette (slate-based)

### 3. **Reusability**
Components are designed to be reusable and can be used in other contexts if needed.

### 4. **Type Safety**
All components are fully typed with TypeScript interfaces.

### 5. **Performance**
- Optimistic updates for mutations
- Proper cache invalidation
- Minimal re-renders

## UI/UX Enhancements

### Empty States
All tabs feature premium empty states with:
- Icon with ring decoration
- Clear heading and description
- Call-to-action button
- Hover effects

### Card Design
- Subtle borders with hover effects
- Shadow on hover
- Smooth transitions
- Proper spacing and typography

### Interactive Elements
- Remove buttons appear on hover
- Smooth opacity transitions
- Focus states for accessibility
- Proper event handling (stopPropagation)

### Color Palette
- Primary text: `slate-900`
- Secondary text: `slate-500`
- Borders: `slate-200`
- Hover states: `primary/20`
- Status badges: Semantic colors (emerald, purple)

## Usage Example

```tsx
import { SpaceProjectsTab } from "@/features/dashboard/components/space";

function MyComponent() {
  return (
    <SpaceProjectsTab
      workspaceId={workspaceId}
      spaceId={spaceId}
      projects={projects}
      onAddClick={() => setModalOpen(true)}
    />
  );
}
```

## Mutation Handling

All components that support detaching items follow this pattern:

```typescript
const utils = trpc.useUtils();
const mutation = trpc.entity.update.useMutation({
  onSuccess: () => {
    utils.workspace.get.invalidate({ id: workspaceId });
    utils.space.get.invalidate({ id: spaceId });
    utils.entity.list.invalidate();
  },
});

const detach = async (id: string) => {
  try {
    await mutation.mutateAsync({
      id,
      spaceId: null,
      workspaceId: null,
    });
    toast.success("Item removed from space");
  } catch (error) {
    console.error("Failed to detach:", error);
    toast.error("Failed to remove item from space");
  }
};
```

## Future Enhancements

- [ ] Add skeleton loading states
- [ ] Implement drag-and-drop reordering
- [ ] Add bulk actions
- [ ] Implement filtering and sorting
- [ ] Add search functionality
- [ ] Implement virtualization for large lists

## Best Practices

1. **Always handle errors** - Show user-friendly error messages
2. **Invalidate caches** - Ensure UI stays in sync with server
3. **Use semantic HTML** - Proper button elements, aria-labels
4. **Maintain accessibility** - Keyboard navigation, focus states
5. **Follow design system** - Use consistent spacing, colors, typography
6. **Test edge cases** - Empty states, loading states, error states
