# User Prefix Added for Consistency

## Summary
Updated the task assignment system to use `user:` prefix for user IDs, maintaining consistency with `team:` and `agent:` prefixes.

## Changes Made

### Backend (`task.ts` router)

#### 1. **Task Creation Mutation**
- Added `user:` prefix handling alongside `team:` and `agent:` prefixes
- Maintains backwards compatibility for plain user IDs
- Strips `user:` prefix when setting legacy `assigneeId` field

```typescript
// Now accepts:
assigneeIds: ["user:123", "team:456", "agent:789", "olduser"]  // Plain IDs still work

// Parsing logic:
if (id.startsWith('user:')) {
  return { ...baseRecord, userId: id.replace('user:', '') };
} else if (id.startsWith('team:')) {
  return { ...baseRecord, teamId: id.replace('team:', '') };
} else if (id.startsWith('agent:')) {
  return { ...baseRecord, agentId: id.replace('agent:', '') };
} else {
  // Plain ID = user ID (backwards compatible)
  return { ...baseRecord, userId: id };
}
```

#### 2. **Task Update Mutation**
- Same prefix handling logic as creation
- Strips `user:` prefix when syncing with legacy `assigneeId` field

#### 3. **Legacy Field Sync**
- Only sets `assigneeId` to user IDs (strips `user:` prefix)
- Never sets it to team or agent IDs

```typescript
const firstUserId = uniqueAssigneeIds.find(id => id.startsWith('user:') || !id.includes(':'));
if (firstUserId) {
  data.assigneeId = firstUserId.startsWith('user:') 
    ? firstUserId.replace('user:', '') 
    : firstUserId;
}
```

### Frontend Changes

#### 1. **AssigneeSelector Component**

**toggleId Function**:
```typescript
const toggleId = (id: string, type: 'user' | 'team' | 'agent') => {
  const prefixedId = type === 'user' ? `user:${id}` 
    : type === 'team' ? `team:${id}` 
    : `agent:${id}`;
  // ...
}
```

**handleValueChange**:
- Strips `user:` prefix when syncing with legacy `assigneeId` field
```typescript
const firstUserId = newIds.find(id => id.startsWith('user:') || !id.includes(':'));
if (firstUserId) {
  const cleanUserId = firstUserId.startsWith('user:') 
    ? firstUserId.replace('user:', '') 
    : firstUserId;
  formContext.setValue('assigneeId', cleanUserId, { shouldDirty: true });
}
```

**unselectedUsers Filter**:
- Checks for both prefixed and plain IDs for backwards compatibility
```typescript
const unselectedUsers = users.filter(u => 
  !assigneeIds.includes(`user:${u.id}`) && !assigneeIds.includes(u.id)
);
```

#### 2. **ListView Component**

**Value Mapping** (line 973):
- Now adds `user:` prefix when passing IDs to AssigneeSelector
```typescript
value={Array.from(
  new Set([
    ...((task.assignees ?? [])
      .map((a: any) => a?.user?.id ? `user:${a.user.id}` : null)
      .filter(Boolean)),
    ...(task.assignee?.id ? [`user:${task.assignee.id}`] : []),
  ])
)}
```

**onChange Handler**:
- Sends prefixed IDs directly to backend
- Strips `user:` prefix only for legacy `assigneeId` field
```typescript
onChange={(newIds) => {
  const firstUserId = newIds.find(id => id.startsWith('user:') || !id.includes(':'));
  const cleanUserId = firstUserId
    ? (firstUserId.startsWith('user:') ? firstUserId.replace('user:', '') : firstUserId)
    : null;
  handleTaskUpdate(task.id, { assigneeIds: newIds, assigneeId: cleanUserId });
}}
```

## Prefix System Overview

| Type  | Prefix Format | Example ID        | Database Field |
|-------|---------------|------------------|----------------|
| User  | `user:{id}`   | `user:cm123abc`  | `userId`       |
| Team  | `team:{id}`   | `team:team456def` | `teamId`       |
| Agent | `agent:{id}`  | `agent:agent789gh` | `agentId`     |
| Legacy| No prefix     | `cm123abc`       | `userId`       |

## Backwards Compatibility

✅ **Plain user IDs still work** - automatically treated as `userId`
✅ **Legacy `assigneeId` field** - always gets the unprefixed user ID
✅ **Existing data** - unaffected, continues to work
✅ **Gradual migration** - new assignments use prefixes, old ones still work

## Data Flow Example

### Creating a Task
```typescript
// Frontend sends:
assigneeIds: ["user:alice123", "team:engineering", "agent:taskbot"]

// Backend creates TaskAssignee records:
[
  { taskId: "task001", userId: "alice123", assigned_by: "currentUser" },
  { taskId: "task001", teamId: "engineering", assigned_by: "currentUser" },
  { taskId: "task001", agentId: "taskbot", assigned_by: "currentUser" }
]

// Legacy field set (strips prefix):
assigneeId: "alice123"
```

### Updating from ListView
```typescript
// User selects users, teams, agents...
// AssigneeSelector generates:
["user:bob456", "team:design", "user:alice123"]

// ListView onChange sends to backend with prefixed IDs:
assigneeIds: ["user:bob456", "team:design", "user:alice123"]
assigneeId: "bob456"  // First user ID (stripped)
```

## Files Modified

1. ✅ `apps/frontend/src/trpc/routers/task.ts` - Added `user:` prefix handling
2. ✅ `apps/frontend/src/entities/task/components/AssigneeSelector.tsx` - Generates `user:` prefix
3. ✅ `apps/frontend/src/features/dashboard/views/generic/ListView.tsx` - Maps IDs with prefixes

## Benefits

1. **Consistency** - All assignee types now use the same prefix pattern
2. **Type Safety** - Explicit type identification via prefix
3. **Clarity** - Code is self-documenting (type is in the ID)
4. **Extensibility** - Easy to add new assignee types in the future
5. **Backwards Compatible** - Existing code continues to work

## Testing

### Unit Tests
- [ ] Create task with `user:` prefixed IDs → verify `userId` set correctly
- [ ] Create task with plain user IDs → verify backwards compatibility
- [ ] Create task with mixed prefixed and plain IDs → verify both work
- [ ] Update task assignees with `user:` prefix → verify correct update
- [ ] Legacy `assigneeId` syncing → verify prefix stripped

### Integration Tests
- [ ] Select user in AssigneeSelector → verify `user:` prefix added
- [ ] Select team → verify `team:` prefix
- [ ] Select agent → verify `agent:` prefix
- [ ] Remove assignee → verify correct ID used
- [ ] ListView assignee display → verify correct mapping
- [ ] Task update from ListView → verify correct IDs sent

### End-to-End Tests  
- [ ] Create task with multiple assignees → verify all saved correctly
- [ ] Edit task assignees → verify updates work
- [ ] View task details → verify assignees display correctly
- [ ] Filter tasks by assignee → verify queries work
