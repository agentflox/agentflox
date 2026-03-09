# Space List Hook Refactoring Summary

## Overview
Refactored both `SpacesView` and `ManageSpacesView` to use a centralized `useSpaceList` hook for better code consistency and maintainability.

## Changes Made

### 1. Enhanced `useSpaceList` Hook
**File:** `apps/frontend/src/entities/spaces/hooks/useSpaceList.ts`

**Key Improvements:**
- Added flexible configuration options via `UseSpaceListOptions` interface
- Support for custom page sizes (default: 12)
- Built-in debouncing with configurable delay (default: 0ms, no debounce)
- Optional URL synchronization (default: true)
- Optional prefetching (default: true)
- Optional counts inclusion (default: true)
- Better type safety with `SpaceScope` and `SpaceStatus` types

**New Options:**
```typescript
interface UseSpaceListOptions {
  initialScope?: SpaceScope;        // "owned" | "member" | "all"
  pageSize?: number;                 // Items per page
  initialFilters?: FilterState;      // Initial filter state
  debounceMs?: number;               // Search debounce delay
  syncWithUrl?: boolean;             // Sync state with URL params
  includeCounts?: boolean;           // Include item counts
  enablePrefetch?: boolean;          // Enable next page prefetching
}
```

**Return Values:**
- `data`, `isLoading`, `isError`, `error`, `refetch` - Query result
- `page`, `pageSize`, `setPage`, `totalPages`, `total` - Pagination
- `query`, `setQuery`, `debouncedQuery` - Search
- `scope`, `setScope`, `filters`, `setFilters` - Filters
- `spaces` - Direct access to space items array

### 2. Updated `ManageSpacesView`
**File:** `apps/frontend/src/features/dashboard/views/space/ManageSpacesView.tsx`

**Changes:**
- Replaced direct TRPC query with `useSpaceList` hook
- Removed manual debouncing logic (now handled by hook)
- Removed manual query parameter calculation
- Configuration:
  ```typescript
  useSpaceList({
    pageSize: 50,
    debounceMs: 300,
    syncWithUrl: false,
    initialScope: scope,
    initialFilters: { workspaceId, status },
  })
  ```

### 3. Updated `SpacesView`
**File:** `apps/frontend/src/features/dashboard/views/space/SpacesView.tsx`

**Changes:**
- Replaced direct TRPC query with `useSpaceList` hook
- Removed manual debouncing logic
- Removed duplicate state management
- Configuration:
  ```typescript
  useSpaceList({
    pageSize: 100,           // Sidebar shows more items
    debounceMs: 300,         // Debounce search
    syncWithUrl: false,      // Don't sync sidebar to URL
    initialScope: "all",
    initialFilters: { 
      workspaceId, 
      status: showArchived ? undefined : "active" 
    },
  })
  ```

### 4. Created Hooks Index
**File:** `apps/frontend/src/entities/spaces/hooks/index.ts`

**Purpose:** Centralized exports for better import organization
```typescript
export { useSpaceList } from "./useSpaceList";
export type { UseSpaceListOptions, SpaceScope, SpaceStatus } from "./useSpaceList";
```

## Benefits

1. **Code Consistency:** Both views now use the same underlying logic for fetching spaces
2. **Maintainability:** Changes to space listing logic only need to be made in one place
3. **Reduced Duplication:** Removed duplicate debouncing, query building, and state management
4. **Flexibility:** Hook can be configured for different use cases
5. **Type Safety:** Better TypeScript types for scope and status
6. **Performance:** Built-in prefetching and caching optimizations  
7. **Clean API:** Clear separation between data fetching and UI logic

## Testing Checklist

- [ ] SpacesView sidebar loads spaces correctly
- [ ] SpacesView search with debouncing works
- [ ] SpacesView "show archived" toggle works
- [ ] ManageSpacesView grid displays spaces
- [ ] ManageSpacesView search with debouncing works
- [ ] ManageSpacesView filters (all/owned/shared/archived) work
- [ ] ManageSpacesView pagination works
- [ ] Both views handle loading and error states
- [ ] No TypeScript errors
- [ ] No runtime errors
