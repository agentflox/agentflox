# Task Modal Developer Guide

## Quick Start

### Using the Enhanced Task Modal

```tsx
import { TaskDetailModal } from '@/entities/task/components/TaskDetailModal';

function MyComponent() {
  const [taskId, setTaskId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [layoutMode, setLayoutMode] = useState<'modal' | 'fullscreen' | 'sidebar'>('modal');

  return (
    <TaskDetailModal
      taskId={taskId}
      open={open}
      onOpenChange={setOpen}
      layoutMode={layoutMode}
      onLayoutModeChange={setLayoutMode}
    />
  );
}
```

## New Features Usage

### 1. Time Tracking

```tsx
// The TimeTrackingSection is automatically included in TaskDetailModal
// Users can:
// - Click "Start" to begin tracking time
// - Click "Stop" to end the timer
// - Click "Add" to manually log time
// - View all time entries
// - See progress vs estimate

// Programmatic access:
const { data: runningTimer } = trpc.task.timeEntries.getRunning.useQuery();
const startTimer = trpc.task.timeEntries.start.useMutation();
const stopTimer = trpc.task.timeEntries.stop.useMutation();
```

### 2. Watchers

```tsx
// Add/remove watchers programmatically:
const addWatcher = trpc.task.watchers.add.useMutation();
const removeWatcher = trpc.task.watchers.remove.useMutation();

// Add a watcher
addWatcher.mutate({ taskId: 'task-123', userId: 'user-456' });

// Remove a watcher
removeWatcher.mutate({ taskId: 'task-123', userId: 'user-456' });
```

### 3. Checklists

```tsx
// Create a checklist
const createChecklist = trpc.task.checklists.create.useMutation();
createChecklist.mutate({
  taskId: 'task-123',
  name: 'Pre-launch Checklist',
  position: 0,
});

// Add checklist items
const createItem = trpc.task.checklists.items.create.useMutation();
createItem.mutate({
  checklistId: 'checklist-123',
  name: 'Test on staging',
  assigneeId: 'user-456',
});

// Toggle item completion
const toggleItem = trpc.task.checklists.items.toggle.useMutation();
toggleItem.mutate({ id: 'item-123' });
```

### 4. Attachments

```tsx
// Upload attachment (after uploading file to storage)
const createAttachment = trpc.task.attachments.create.useMutation();
createAttachment.mutate({
  taskId: 'task-123',
  filename: 'screenshot.png',
  url: 'https://storage.example.com/files/screenshot.png',
  size: 1024000, // in bytes
  mimeType: 'image/png',
});

// Delete attachment
const deleteAttachment = trpc.task.attachments.delete.useMutation();
deleteAttachment.mutate({ id: 'attachment-123' });
```

### 5. Dependencies/Relationships

```tsx
// Add a dependency
const addDependency = trpc.task.addDependency.useMutation();
addDependency.mutate({
  taskId: 'task-123',
  dependsOnId: 'task-456', // This task depends on task-456
  type: 'FINISH_TO_START', // task-456 must finish before task-123 can start
});

// Dependency types:
// - FINISH_TO_START: Blocks (most common)
// - START_TO_START: Blocked by
// - FINISH_TO_FINISH: Relates to
// - START_TO_FINISH: Duplicates
```

### 6. Custom Fields

```tsx
// Create a workspace custom field
const createField = trpc.customFields.create.useMutation();
createField.mutate({
  workspaceId: 'workspace-123',
  name: 'Sprint',
  type: 'DROPDOWN',
  config: {
    options: [
      { value: 'sprint-1', label: 'Sprint 1' },
      { value: 'sprint-2', label: 'Sprint 2' },
    ],
  },
  applyTo: ['TASK'],
});

// Set custom field value on a task
const updateCustomField = trpc.task.customFields.update.useMutation();
updateCustomField.mutate({
  taskId: 'task-123',
  customFieldId: 'field-456',
  value: 'sprint-1',
});
```

## Component Props Reference

### TimeTrackingSection
```tsx
interface TimeTrackingSectionProps {
  taskId: string;
  timeEstimate?: number | null; // in minutes
}
```

### WatchersSection
```tsx
interface WatchersSectionProps {
  taskId: string;
  workspaceId: string;
  currentUserId: string;
  assigneeIds?: string[];
}
```

### ChecklistsSection
```tsx
interface ChecklistsSectionProps {
  taskId: string;
  workspaceMembers?: any[];
}
```

### AttachmentsSection
```tsx
interface AttachmentsSectionProps {
  taskId: string;
}
```

### RelationshipsSection
```tsx
interface RelationshipsSectionProps {
  taskId: string;
  workspaceId: string;
}
```

### CustomFieldsSection
```tsx
interface CustomFieldsSectionProps {
  taskId: string;
  workspaceId: string;
}
```

## TRPC Procedures Reference

### Watchers
- `task.watchers.list({ taskId })` - Get all watchers
- `task.watchers.add({ taskId, userId })` - Add watcher
- `task.watchers.remove({ taskId, userId })` - Remove watcher

### Checklists
- `task.checklists.create({ taskId, name, position? })` - Create checklist
- `task.checklists.update({ id, name?, position? })` - Update checklist
- `task.checklists.delete({ id })` - Delete checklist

### Checklist Items
- `task.checklists.items.create({ checklistId, name, position?, assigneeId? })` - Create item
- `task.checklists.items.update({ id, name?, isCompleted?, position?, assigneeId? })` - Update item
- `task.checklists.items.toggle({ id })` - Toggle completion
- `task.checklists.items.delete({ id })` - Delete item

### Attachments
- `task.attachments.list({ taskId })` - Get all attachments
- `task.attachments.create({ taskId, filename, url, size, mimeType })` - Create attachment
- `task.attachments.delete({ id })` - Delete attachment

### Time Entries
- `task.timeEntries.list({ taskId })` - Get all time entries
- `task.timeEntries.create({ taskId, duration, description?, startTime?, endTime?, billable? })` - Create entry
- `task.timeEntries.start({ taskId, description? })` - Start timer
- `task.timeEntries.stop({ id })` - Stop timer
- `task.timeEntries.delete({ id })` - Delete entry
- `task.timeEntries.getRunning()` - Get current user's running timer

### Dependencies
- `task.addDependency({ taskId, dependsOnId, type? })` - Add dependency
- `task.removeDependency({ taskId, dependsOnId })` - Remove dependency

### Custom Fields
- `customFields.list({ workspaceId, applyTo? })` - List workspace fields
- `customFields.create({ workspaceId, name, type, config?, defaultValue?, isRequired?, applyTo })` - Create field
- `customFields.update({ id, name?, config?, defaultValue?, isRequired?, position? })` - Update field
- `customFields.delete({ id })` - Delete field
- `task.customFields.update({ taskId, customFieldId, value })` - Set field value
- `task.customFields.delete({ taskId, customFieldId })` - Clear field value

## Custom Field Types

```typescript
type CustomFieldType = 
  | 'TEXT'      // Single line text input
  | 'NUMBER'    // Number input
  | 'DROPDOWN'  // Select from options
  | 'DATE'      // Date picker
  | 'CHECKBOX'  // Boolean checkbox
  | 'URL'       // URL input with validation
  | 'EMAIL'     // Email input with validation
  | 'PHONE';    // Phone number input

// Example configs:
const textConfig = { placeholder: 'Enter value...' };
const numberConfig = { min: 0, max: 100, placeholder: '0' };
const dropdownConfig = { 
  options: [
    { value: 'opt1', label: 'Option 1' },
    { value: 'opt2', label: 'Option 2' },
  ]
};
const checkboxConfig = { label: 'Enabled' };
```

## Styling & Theming

All components use Tailwind CSS and follow the existing design system:

```tsx
// Color scheme:
// - Primary: blue-600
// - Success: green-500
// - Warning: orange-500
// - Danger: red-500
// - Neutral: zinc-*

// Spacing:
// - Section gap: space-y-4
// - Item gap: gap-2 or gap-3
// - Padding: p-2 to p-4

// Typography:
// - Section title: text-sm font-semibold
// - Label: text-[11px] font-semibold text-zinc-400 uppercase
// - Body: text-sm text-zinc-700
// - Caption: text-xs text-zinc-500
```

## Best Practices

### 1. Always Invalidate Queries
```tsx
const utils = trpc.useUtils();
const mutation = trpc.task.update.useMutation({
  onSuccess: () => {
    // Invalidate related queries
    utils.task.get.invalidate({ id: taskId });
    utils.task.list.invalidate();
  }
});
```

### 2. Handle Loading States
```tsx
const { data, isLoading } = trpc.task.get.useQuery({ id: taskId });

if (isLoading) {
  return <LoadingSpinner />;
}
```

### 3. Show Toast Notifications
```tsx
import { toast } from 'sonner';

mutation.mutate(data, {
  onSuccess: () => toast.success('Updated successfully'),
  onError: (error) => toast.error(error.message),
});
```

### 4. Use Optimistic Updates
```tsx
// TRPC automatically handles optimistic updates
// Just ensure proper query invalidation
```

## Troubleshooting

### Issue: Watchers not showing
**Solution**: Ensure `currentUserId` is passed correctly and user session is valid.

### Issue: Time tracker not updating
**Solution**: Check that `refetchInterval` is set to 1000ms in the query.

### Issue: File upload fails
**Solution**: Implement proper file upload to cloud storage (S3/Cloudinary) before calling the attachment mutation.

### Issue: Custom fields not appearing
**Solution**: Ensure custom fields are created at workspace level with `applyTo: ['TASK']`.

### Issue: Dependencies not showing
**Solution**: Check that task.get query includes `dependencies` and `blockedDependencies` relations.

## Performance Tips

1. **Use React.useMemo** for computed values
2. **Debounce** text inputs
3. **Lazy load** heavy components
4. **Paginate** long lists
5. **Cache** TRPC queries appropriately

## Security Considerations

1. **Permissions**: All TRPC procedures use `protectedProcedure` - user must be authenticated
2. **Validation**: All inputs are validated with Zod schemas
3. **File Upload**: Implement proper file type and size validation
4. **XSS Protection**: React automatically escapes content

## Migration from Old Modal

The new modal is backward compatible. No changes required to existing code.

```tsx
// Old usage (still works):
<TaskDetailModal taskId={id} open={open} onOpenChange={setOpen} />

// New usage (with layout modes):
<TaskDetailModal 
  taskId={id} 
  open={open} 
  onOpenChange={setOpen}
  layoutMode="fullscreen"
  onLayoutModeChange={setLayoutMode}
/>
```

## Support

For issues or questions:
1. Check the implementation summary: `CLICKUP_TASK_MODAL_IMPLEMENTATION.md`
2. Review component source code
3. Check TRPC router definitions
4. Consult Prisma schema for data models
