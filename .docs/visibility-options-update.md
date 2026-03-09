# Visibility Options Update

## Overview
Updated space visibility settings to provide granular access control with four clear levels.

## New Visibility Options

### 1. **Only Owners**
- **Value:** `OWNERS_ONLY`
- **Description:** Only space owners can view and edit
- **Use Case:** Highly sensitive spaces, executive planning, confidential projects
- **Access:** Owner role only

### 2. **Owners & Admins**
- **Value:** `OWNERS_ADMINS`
- **Description:** Owners and admins can view and edit
- **Use Case:** Management-level spaces, strategic planning, sensitive operations
- **Access:** Owner + Admin roles

### 3. **Owners, Admins & Members**
- **Value:** `MEMBERS`
- **Description:** All space members can view
- **Use Case:** Team collaboration, project spaces, department work
- **Access:** All space members (Owner, Admin, Member roles)
- **Default:** This is now the default visibility for new spaces

### 4. **Anyone with Link**
- **Value:** `PUBLIC`
- **Description:** Anyone with the link can view
- **Use Case:** Public documentation, shared resources, external collaboration
- **Access:** Anyone with the link (no authentication required)

## Schema Changes

### Prisma Enum Update
```prisma
enum Visibility {
  OWNERS_ONLY   // Only space owners can view and edit
  OWNERS_ADMINS // Owners and admins can view and edit
  MEMBERS       // All space members can view
  PUBLIC        // Anyone with the link can view
  
  // Legacy values (kept for backward compatibility)
  PRIVATE       // Deprecated: use MEMBERS instead
  INTERNAL      // Deprecated: use MEMBERS instead
  RESTRICTED    // Deprecated: use OWNERS_ONLY instead
}
```

### Migration Strategy
- **New values added:** `OWNERS_ONLY`, `OWNERS_ADMINS`, `MEMBERS`
- **Legacy values kept:** `PRIVATE`, `INTERNAL`, `RESTRICTED` (for backward compatibility)
- **Default changed:** From `PRIVATE` to `MEMBERS`

## UI Changes

### Space Settings Modal
**Location:** `src/entities/spaces/components/SpaceSettingsModal.tsx`

**Visibility Selector:**
- Dropdown with 4 options
- Each option shows:
  - **Label:** Clear, concise name
  - **Description:** Detailed explanation (shown in dropdown and below selector)
- Selected option's description displayed below selector for clarity

**Example UI:**
```
Visibility: [Owners, Admins & Members ▼]
All space members can view
```

**Dropdown (expanded):**
```
┌─────────────────────────────────────────────┐
│ Only Owners                                 │
│ Only space owners can view and edit         │
├─────────────────────────────────────────────┤
│ Owners & Admins                             │
│ Owners and admins can view and edit         │
├─────────────────────────────────────────────┤
│ ✓ Owners, Admins & Members                  │
│   All space members can view                │
├─────────────────────────────────────────────┤
│ Anyone with Link                            │
│ Anyone with the link can view               │
└─────────────────────────────────────────────┘
```

## Access Control Matrix

| Visibility Level | Owner | Admin | Member | Non-Member | Public |
|-----------------|-------|-------|--------|------------|--------|
| **OWNERS_ONLY** | ✅ Edit | ❌ | ❌ | ❌ | ❌ |
| **OWNERS_ADMINS** | ✅ Edit | ✅ Edit | ❌ | ❌ | ❌ |
| **MEMBERS** | ✅ Edit | ✅ Edit | ✅ View | ❌ | ❌ |
| **PUBLIC** | ✅ Edit | ✅ Edit | ✅ View | ✅ View | ✅ View |

## Backend Implementation Notes

### Required Updates

1. **Authorization Middleware**
```typescript
// Check visibility before allowing access
function canAccessSpace(space: Space, user: User | null): boolean {
  switch (space.visibility) {
    case 'OWNERS_ONLY':
      return isOwner(space, user);
    
    case 'OWNERS_ADMINS':
      return isOwner(space, user) || isAdmin(space, user);
    
    case 'MEMBERS':
      return isMember(space, user);
    
    case 'PUBLIC':
      return true; // Anyone can view
    
    // Legacy support
    case 'PRIVATE':
    case 'INTERNAL':
      return isMember(space, user);
    
    case 'RESTRICTED':
      return isOwner(space, user);
    
    default:
      return false;
  }
}
```

2. **Database Migration**
```sql
-- Add new enum values
ALTER TYPE "Visibility" ADD VALUE 'OWNERS_ONLY';
ALTER TYPE "Visibility" ADD VALUE 'OWNERS_ADMINS';
ALTER TYPE "Visibility" ADD VALUE 'MEMBERS';

-- Migrate existing data (optional)
UPDATE spaces 
SET visibility = 'MEMBERS' 
WHERE visibility = 'PRIVATE';

UPDATE spaces 
SET visibility = 'OWNERS_ONLY' 
WHERE visibility = 'RESTRICTED';
```

3. **tRPC Endpoint Updates**
```typescript
// Update space.get to check visibility
space.get = publicProcedure
  .input(z.object({ id: z.string() }))
  .query(async ({ ctx, input }) => {
    const space = await prisma.space.findUnique({
      where: { id: input.id },
      include: { members: true }
    });
    
    if (!space) throw new TRPCError({ code: 'NOT_FOUND' });
    
    // Check access based on visibility
    if (!canAccessSpace(space, ctx.user)) {
      throw new TRPCError({ code: 'FORBIDDEN' });
    }
    
    return space;
  });
```

## Migration Guide

### For Existing Spaces

**Automatic Migration (Recommended):**
```typescript
// Run migration script
const migrateVisibility = async () => {
  await prisma.$transaction([
    // PRIVATE → MEMBERS
    prisma.space.updateMany({
      where: { visibility: 'PRIVATE' },
      data: { visibility: 'MEMBERS' }
    }),
    
    // INTERNAL → MEMBERS
    prisma.space.updateMany({
      where: { visibility: 'INTERNAL' },
      data: { visibility: 'MEMBERS' }
    }),
    
    // RESTRICTED → OWNERS_ONLY
    prisma.space.updateMany({
      where: { visibility: 'RESTRICTED' },
      data: { visibility: 'OWNERS_ONLY' }
    })
  ]);
};
```

**Manual Migration:**
- Owners can update visibility in Space Settings
- Old values still work but show deprecation notice
- Encourage users to switch to new values

## Testing Checklist

### Frontend
- [ ] Visibility selector shows all 4 options
- [ ] Descriptions display correctly
- [ ] Selected option description shows below selector
- [ ] Default value is MEMBERS for new spaces
- [ ] Existing spaces load correct visibility
- [ ] Save updates visibility correctly

### Backend
- [ ] Prisma schema updated
- [ ] Database migration runs successfully
- [ ] Authorization checks work for each level
- [ ] OWNERS_ONLY blocks non-owners
- [ ] OWNERS_ADMINS blocks members
- [ ] MEMBERS allows all members
- [ ] PUBLIC allows anyone
- [ ] Legacy values still work

### Integration
- [ ] Space creation uses MEMBERS default
- [ ] Space update saves new visibility
- [ ] Space access respects visibility
- [ ] API returns 403 for unauthorized access
- [ ] UI shows appropriate error messages

## Benefits

1. **Clearer Access Control**
   - Explicit levels instead of vague terms
   - Easy to understand who can access what

2. **Better Security**
   - Granular control over sensitive spaces
   - Clear separation between view and edit

3. **Improved UX**
   - Descriptive labels and explanations
   - No confusion about access levels

4. **Backward Compatible**
   - Legacy values still work
   - Smooth migration path

5. **Enterprise-Ready**
   - Matches industry standards (Notion, Linear, ClickUp)
   - Suitable for organizations of any size

## Summary

✅ **4 clear visibility levels** - OWNERS_ONLY, OWNERS_ADMINS, MEMBERS, PUBLIC
✅ **Backward compatible** - Legacy values (PRIVATE, INTERNAL, RESTRICTED) still work
✅ **Better default** - MEMBERS instead of PRIVATE
✅ **Enhanced UI** - Descriptions for each option
✅ **Schema updated** - Prisma enum includes new values
✅ **Ready for backend** - Authorization logic documented

Next steps:
1. Run Prisma migration: `npx prisma migrate dev --name add_granular_visibility`
2. Implement authorization middleware
3. Update tRPC endpoints
4. Test access control for each level
