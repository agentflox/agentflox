# Task Router Updates for Team and Agent Assignments

## Problem
The task router was only supporting assigning tasks to **users**, but the database schema (`TaskAssignee` model) already supported assigning to **teams** and **agents** via `teamId` and `agentId` fields.

## Solution
Updated both the frontend and backend to support assigning tasks to users, teams, and AI agents using a **prefixed ID system**.

---

## Backend Changes

### File: `apps/frontend/src/trpc/routers/task.ts`

#### 1. **Task Creation (`create` mutation)**
- **What Changed**: Added logic to parse `assigneeIds` and create `TaskAssignee` records for users, teams, and agents
- **How It Works**:
  - IDs with `team:` prefix → create record with `teamId`
  - IDs with `agent:` prefix → create record with `agentId`  
  - Plain IDs → create record with `userId` (backwards compatible)
  
```typescript
// Example assigneeIds:
// ["user123", "team:team456", "agent:agent789"]

const assigneeRecords = uniqueAssigneeIds.map((id) => {
  const baseRecord = { taskId: task.id, assigned_by: userId };
  
  if (id.startsWith('team:')) {
    return { ...baseRecord, teamId: id.replace('team:', '') };
  } else if (id.startsWith('agent:')) {
    return { ...baseRecord, agentId: id.replace('agent:', '') };
  } else {
    return { ...baseRecord, userId: id };
  }
});
```

#### 2. **Task Update (`update` mutation)**
- **What Changed**: Same prefix parsing logic applied when updating assignees
- **Legacy Compatibility**: Only sets `assigneeId` (legacy single assignee field) to user IDs, not teams or agents

---

## Frontend Changes

### File: `apps/frontend/src/entities/task/components/AssigneeSelector.tsx`

#### 1. **ID Prefixing Logic**
- Added `toggleId(id, type)` function that prefixes IDs based on type:
  - `type === 'user'` → no prefix (backwards compatible)
  - `type === 'team'` → adds `team:` prefix
  - `type === 'agent'` → adds `agent:` prefix

#### 2. **ID Parsing Logic**
- Added `parseAssigneeId(id)` function to extract type and actual ID from prefixed strings
- Returns `{ type: 'user' | 'team' | 'agent', actualId: string }`

#### 3. **Option Mapping**
- Separate maps for users, teams, and agents
- `selectedOptions` now includes `_prefixedId` property for proper removal
- Filter logic updated to check for prefixed IDs:
  ```typescript
  const unselectedUsers = users.filter(u => !assigneeIds.includes(u.id));
  const unselectedTeams = teams.filter(t => !assigneeIds.includes(`team:${t.id}`));
  const unselectedAgents = agents.filter(a => !assigneeIds.includes(`agent:${a.id}`));
  ```

#### 4. **Updated Toggle Calls**
- All `onSelect` handlers now pass the correct type:
  ```tsx
  <CommandItem onSelect={() => toggleId(user.id, 'user')}>
  <CommandItem onSelect={() => toggleId(team.id, 'team')}>
  <CommandItem onSelect={() => toggleId(agent.id, 'agent')}>
  ```

#### 5. **Removal Functionality**
- `removeId` uses the full prefixed ID: `removeId(option._prefixedId, e)`

---

## Data Flow Example

### Creating a Task with Mixed Assignees

**Frontend**:
```typescript
// User selects:
// - User "John" (id: "user123")
// - Team "Engineering" (id: "team456")  
// - Agent "TaskBot" (id: "agent789")

// AssigneeSelector sends:
assigneeIds: ["user123", "team:team456", "agent:agent789"]
```

**Backend**:
```typescript
// Task router creates TaskAssignee records:
[
  { taskId: "task001", userId: "user123", assigned_by: "currentUser" },
  { taskId: "task001", teamId: "team456", assigned_by: "currentUser" },
  { taskId: "task001", agentId: "agent789", assigned_by: "currentUser" }
]

// Legacy assigneeId field set to first user ID:
assigneeId: "user123"
```

---

## Database Schema (Reference)

```prisma
model TaskAssignee {
  id          String   @id @default(cuid())
  taskId      String   @map("task_id")
  userId      String?  @map("user_id")     // For users
  teamId      String?  @map("team_id")     // For teams
  agentId     String?  @map("agent_id")    // For AI agents
  assigned_at DateTime @default(now())
  assigned_by String?
  
  task        Task     @relation("TaskAssignees", fields: [taskId], references: [id])
  user        User?    @relation(fields: [userId], references: [id])
  team        Team?    @relation(fields: [teamId], references: [id])
  aiAgent     AiAgent? @relation(fields: [agentId], references: [id])

  @@unique([taskId, userId])
  @@unique([taskId, agentId])
  @@unique([taskId, teamId])
}
```

---

## Backwards Compatibility

✅ **Plain user IDs still work** - no prefix needed
✅ **Legacy `assigneeId` field** - automatically set to first user ID
✅ **Existing queries** - unaffected, continue to work as before

---

## Testing Checklist

### Frontend
- [ ] Select a user → verify ID has no prefix
- [ ] Select a team → verify ID has `team:` prefix
- [ ] Select an agent → verify ID has `agent:` prefix
- [ ] Remove a user/team/agent → verify correct removal
- [ ] Mix of users, teams, and agents → verify all display correctly

### Backend
- [ ] Create task with user → verify `TaskAssignee` with `userId`
- [ ] Create task with team → verify `TaskAssignee` with `teamId`
- [ ] Create task with agent → verify `TaskAssignee` with `agentId`
- [ ] Update task assignees → verify old records deleted and new ones created
- [ ] Legacy `assigneeId` → verify set to first user ID only

### Integration
- [ ] Create task with mixed assignees → verify all saved correctly
- [ ] Fetch task → verify all assignees returned (users, teams, agents)
- [ ] Update task → verify assignees replaced correctly
- [ ] Remove assignees → verify removed from database

---

## Files Modified

1. ✅ `apps/frontend/src/trpc/routers/task.ts` - Task creation and update mutations
2. ✅ `apps/frontend/src/entities/task/components/AssigneeSelector.tsx` - Prefix/parsing logic

---

## Next Steps

1. **Test the implementation** in the running dev server
2. **Add agents data** to TaskCreationModal/ListView (currently only users and teams are passed)
3. **Update task queries** to include team and agent relations if needed for display
4. **Add visual indicators** to distinguish users, teams, and agents in the UI (partially done with icons)
