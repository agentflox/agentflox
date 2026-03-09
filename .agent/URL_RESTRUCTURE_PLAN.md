# URL Restructure Implementation Plan

## Overview
Restructure all application URLs to use concise abbreviations for better UX and production-ready enterprise-grade routing.

## Entity Abbreviations

| Entity | Current | New Abbreviation |
|--------|---------|------------------|
| Workspace | `/workspaces` | `/w` |
| Space | `/spaces` | `/s` |
| Project | `/projects` | `/pj` |
| Team | `/teams` | `/tm` |
| Marketplace | `/marketplace` | `/mp` |
| Tools | `/tools` | `/tl` |
| Tasks | `/tasks` | `/tk` |
| Resources | `/resources` | `/rs` |
| Proposals | `/proposals` | `/pp` |
| Talents | `/talents` | `/talents` |
| Materials | `/materials` | `/mt` |
| Documents | `/documents` | `/dc` |

## URL Structure Changes

### Dashboard Routes

#### Before:
```
/dashboard/workspaces
/dashboard/workspaces/[id]
/dashboard/spaces
/dashboard/spaces/[id]
/dashboard/projects
/dashboard/projects/[id]
/dashboard/teams
/dashboard/teams/[id]
```

#### After:
```
/dashboard/w
/dashboard/w/[id]
/dashboard/s
/dashboard/s/[id]
/dashboard/pj
/dashboard/pj/[id]
/dashboard/tm
/dashboard/tm/[id]
```

### Nested Context Routes (New)
```
/dashboard/w/[wId]/s/[sId]           # Workspace > Space
/dashboard/w/[wId]/pj/[pjId]         # Workspace > Project
/dashboard/w/[wId]/tm/[tmId]         # Workspace > Team
/dashboard/w/[wId]/s/[sId]/pj/[pjId] # Workspace > Space > Project
```

### Marketplace Routes

#### Before:
```
/marketplace
/marketplace/projects
/marketplace/projects/[id]
/marketplace/teams
/marketplace/teams/[id]
/marketplace/tools
/marketplace/tasks
/marketplace/resources
/marketplace/proposals
/marketplace/talents
```

#### After:
```
/mp
/mp/pj
/mp/pj/[id]
/mp/tm
/mp/tm/[id]
/mp/tl
/mp/tk
/mp/rs
/mp/pp
/mp/talents
```

## Query Parameters Best Practices

### Use Query Params For:
- Filters: `?category=design&status=active`
- Pagination: `?page=2&limit=20`
- Sorting: `?sort=name&order=asc`
- Search: `?q=search+term`
- Tabs: `?tab=overview`
- View modes: `?view=grid`

### Use Path Params For:
- Resource IDs: `/dashboard/pj/[id]`
- Nested resources: `/dashboard/w/[wId]/s/[sId]`
- Actions: `/dashboard/pj/[id]/edit`

## Implementation Steps

### Phase 1: Create Route Constants
1. Create `constants/routes.config.ts` with all route mappings
2. Create helper functions for route generation

### Phase 2: Restructure File System
1. Rename folder structure in `app/(protected)/dashboard/`
2. Rename folder structure in `app/(protected)/marketplace/`
3. Update all page.tsx and layout.tsx files

### Phase 3: Update Components
1. Update all navigation components (Sidebar, AppSidebar, etc.)
2. Update all Link components across features
3. Update all router.push() calls
4. Update all redirect paths

### Phase 4: Update Backend/API
1. Update any hardcoded URLs in API responses
2. Update email templates with new URLs
3. Update webhook URLs if applicable

### Phase 5: Testing
1. Test all navigation flows
2. Test all deep links
3. Test all redirects
4. Test query parameter handling

## Files to Update

### Core Configuration
- `constants/routes.ts` → `constants/routes.config.ts`

### App Routes (Filesystem)
- `app/(protected)/dashboard/workspaces/` → `app/(protected)/dashboard/w/`
- `app/(protected)/dashboard/spaces/` → `app/(protected)/dashboard/s/`
- `app/(protected)/dashboard/projects/` → `app/(protected)/dashboard/pj/`
- `app/(protected)/dashboard/teams/` → `app/(protected)/dashboard/tm/`
- `app/(protected)/marketplace/` → `app/(protected)/mp/`

### Components (50+ files)
- All sidebar components
- All card components
- All navigation components
- All form redirect paths

### Features
- All dashboard views
- All marketplace views
- All entity components

## Backward Compatibility

### Option 1: Redirects (Recommended)
Create middleware to redirect old URLs to new ones:
```typescript
// middleware.ts
if (pathname.startsWith('/dashboard/workspaces')) {
  return NextResponse.redirect(new URL(pathname.replace('/dashboard/workspaces', '/dashboard/w'), request.url))
}
```

### Option 2: Route Aliases
Keep both old and new routes temporarily, then deprecate old ones.

## Success Criteria
- ✅ All URLs use new abbreviations
- ✅ All navigation works correctly
- ✅ All deep links work correctly
- ✅ Query parameters follow best practices
- ✅ Old URLs redirect to new URLs
- ✅ No broken links in application
- ✅ All tests pass
