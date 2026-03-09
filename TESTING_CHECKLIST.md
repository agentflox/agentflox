# Task Modal Testing Checklist

## Pre-Testing Setup

### 1. Run Database Migration
```bash
cd packages/database
npx prisma migrate deploy
cd ../..
```

### 2. Restart Development Server
```bash
npm run dev
```

### 3. Verify No TypeScript Errors
```bash
npm run type-check
```

---

## Feature Testing

### ✅ Time Tracking
- [ ] Open a task in the modal
- [ ] Click "Start" button to start timer
- [ ] Verify timer shows in top-right and counts up
- [ ] Click "Stop" button to stop timer
- [ ] Verify time entry appears in list
- [ ] Click "Add" button
- [ ] Fill in manual time entry form
- [ ] Submit and verify it appears in list
- [ ] Set time estimate in properties grid
- [ ] Verify progress bar appears and shows percentage
- [ ] Click edit on a time entry
- [ ] Delete a time entry
- [ ] Verify total tracked time updates correctly

**Expected Result**: Timer works, entries are saved, progress bar shows correctly

---

### ✅ Watchers
- [ ] Locate "Watchers" section in properties grid
- [ ] Click bell icon to watch the task
- [ ] Verify your avatar appears in the watchers list
- [ ] Click bell icon again to unwatch
- [ ] Verify your avatar disappears
- [ ] Click "+" button
- [ ] Search for a workspace member
- [ ] Add them as a watcher
- [ ] Verify their avatar appears
- [ ] Hover over watcher avatar
- [ ] Click X to remove them
- [ ] Verify they are removed

**Expected Result**: Can add/remove watchers, see avatar stack, watch/unwatch works

---

### ✅ Checklists
- [ ] Scroll to "Checklists" section
- [ ] Click "Add Checklist" button
- [ ] Enter checklist name and press Enter
- [ ] Verify checklist is created
- [ ] Click in the "Add an item..." field
- [ ] Type item name and press Enter
- [ ] Verify item is added
- [ ] Add 3-4 more items
- [ ] Click checkbox on an item
- [ ] Verify it marks as complete with green checkmark
- [ ] Verify progress bar updates
- [ ] Click item text to edit
- [ ] Click user icon on item to assign
- [ ] Select a workspace member
- [ ] Verify avatar appears on item
- [ ] Click three-dots menu on checklist
- [ ] Rename the checklist
- [ ] Delete an item
- [ ] Delete the checklist

**Expected Result**: Can create checklists, add/complete/assign items, progress updates

---

### ✅ Attachments
- [ ] Scroll to "Attachments" section
- [ ] Drag a file into the drop zone
- [ ] Verify upload progress shows
- [ ] Verify file appears in list with icon
- [ ] Try uploading an image
- [ ] Verify thumbnail preview shows
- [ ] Click "Upload" button
- [ ] Select multiple files
- [ ] Verify all files upload
- [ ] Hover over an attachment
- [ ] Click download icon
- [ ] Click eye icon (for images)
- [ ] Click three-dots menu
- [ ] Delete an attachment
- [ ] Verify it's removed

**Expected Result**: Files upload, thumbnails show, can download/delete

**⚠️ Note**: File upload currently uses data URLs. For production, integrate cloud storage.

---

### ✅ Relationships/Dependencies
- [ ] Scroll to "Relationships" section
- [ ] Click "Add" button
- [ ] Select dependency type (e.g., "Blocks")
- [ ] Search for another task
- [ ] Select a task from results
- [ ] Verify relationship appears with badge
- [ ] Click external link icon
- [ ] Verify it opens task in new tab
- [ ] Create another relationship with different type
- [ ] Click X to remove a relationship
- [ ] Verify it's removed
- [ ] Check if blocked tasks show in "Blocking these tasks" section

**Expected Result**: Can create/remove dependencies, see both directions, navigate to related tasks

---

### ✅ Custom Fields
- [ ] First, create a custom field at workspace level:
  ```
  Go to Workspace Settings → Custom Fields → Create Field
  - Name: "Sprint"
  - Type: Dropdown
  - Options: Sprint 1, Sprint 2, Sprint 3
  - Apply to: Tasks
  ```
- [ ] Return to task modal
- [ ] Scroll to "Custom Fields" section
- [ ] Verify your custom field appears
- [ ] Select a value from dropdown
- [ ] Close and reopen modal
- [ ] Verify value persists
- [ ] Create more custom fields of different types:
  - Text field
  - Number field
  - Date field
  - Checkbox field
- [ ] Test each field type
- [ ] Verify all values save correctly

**Expected Result**: Custom fields appear, values save, all field types work

---

### ✅ Properties Grid (Enhanced)
- [ ] Locate "Start Date" field
- [ ] Click to open date picker
- [ ] Select a date
- [ ] Verify it saves and displays
- [ ] Locate "Time Estimate" field
- [ ] Enter a number (in minutes)
- [ ] Verify it saves
- [ ] Check that time tracking progress bar uses this estimate
- [ ] Verify "Watchers" section shows inline
- [ ] Test all existing fields still work:
  - Status
  - Assignees
  - Due Date
  - Priority
  - Tags

**Expected Result**: New fields work, existing fields still functional

---

### ✅ Layout Modes
- [ ] Open task modal (default: modal mode)
- [ ] Click layout icon (top-right)
- [ ] Select "Full screen"
- [ ] Verify modal expands to full screen
- [ ] Click layout icon again
- [ ] Select "Sidebar"
- [ ] Verify modal moves to right sidebar
- [ ] Click layout icon again
- [ ] Select "Modal"
- [ ] Verify returns to centered modal
- [ ] Test all features work in each layout mode

**Expected Result**: Can switch between 3 layout modes, all features work in each

---

### ✅ Subtasks Sidebar
- [ ] Click panel icon (top-left)
- [ ] Verify subtasks sidebar opens
- [ ] Add a subtask
- [ ] Verify it appears in sidebar
- [ ] Click subtask in sidebar
- [ ] Mark subtask as complete
- [ ] Verify progress updates
- [ ] Click panel icon again
- [ ] Verify sidebar closes

**Expected Result**: Subtasks sidebar toggles, shows subtasks with progress

---

### ✅ AI Chat Panel
- [ ] Click "Ask AI" button (top-right, purple)
- [ ] Verify AI chat panel opens (in modal mode: separate panel)
- [ ] Type a message in the input
- [ ] Verify chat interface is functional
- [ ] Click "Ask AI" button again
- [ ] Verify panel closes
- [ ] Switch to fullscreen mode
- [ ] Click "Ask AI" button
- [ ] Verify panel opens as split view

**Expected Result**: AI panel toggles, integrates with layout modes

---

### ✅ Activity & Comments
- [ ] Scroll to activity sidebar (right side)
- [ ] Add a comment
- [ ] Verify it appears in activity feed
- [ ] Verify activity shows task changes
- [ ] Test comment with Enter key
- [ ] Test comment with button click
- [ ] Verify timestamps are correct
- [ ] Verify user avatars show

**Expected Result**: Comments post, activity logs changes, timestamps correct

---

## Integration Testing

### ✅ Multi-Feature Workflow
1. [ ] Create a new task
2. [ ] Add yourself as watcher
3. [ ] Start time tracker
4. [ ] Create a checklist with 3 items
5. [ ] Complete 2 checklist items
6. [ ] Upload 2 attachments
7. [ ] Add a dependency to another task
8. [ ] Set a custom field value
9. [ ] Add a comment
10. [ ] Stop time tracker
11. [ ] Close and reopen modal
12. [ ] Verify all data persists

**Expected Result**: All features work together, data persists

---

### ✅ Performance Testing
- [ ] Open task with many items (10+ checklists, 20+ attachments)
- [ ] Verify modal loads in < 500ms
- [ ] Scroll through all sections
- [ ] Verify smooth scrolling
- [ ] Start timer and let run for 1 minute
- [ ] Verify timer updates smoothly every second
- [ ] Add 10 watchers
- [ ] Verify avatar stack renders correctly
- [ ] Upload 5 files simultaneously
- [ ] Verify all upload without issues

**Expected Result**: Fast loading, smooth interactions, no lag

---

### ✅ Error Handling
- [ ] Try to start timer while one is running
- [ ] Verify appropriate message
- [ ] Try to add duplicate watcher
- [ ] Verify handled gracefully
- [ ] Try to upload very large file (>10MB)
- [ ] Verify error message
- [ ] Try to create empty checklist item
- [ ] Verify validation works
- [ ] Disconnect internet
- [ ] Try to make changes
- [ ] Verify error messages show
- [ ] Reconnect internet
- [ ] Verify changes sync

**Expected Result**: Errors handled gracefully with clear messages

---

## Browser Testing

### ✅ Cross-Browser Compatibility
- [ ] Test in Chrome
- [ ] Test in Firefox
- [ ] Test in Safari
- [ ] Test in Edge
- [ ] Verify all features work in each browser

---

### ✅ Responsive Design
- [ ] Test on desktop (1920x1080)
- [ ] Test on laptop (1366x768)
- [ ] Test on tablet (768x1024)
- [ ] Test on mobile (375x667)
- [ ] Verify layout adapts appropriately
- [ ] Verify all features accessible on mobile

---

## Known Issues to Verify

### ⚠️ Expected Limitations
1. **File Upload**: Uses data URLs (not production-ready)
   - Files will upload but stored as base64
   - Large files may cause performance issues
   - **Action**: Note for future cloud storage integration

2. **Drag-and-Drop**: UI present but not functional
   - Grip handles visible on checklists
   - Cannot reorder by dragging yet
   - **Action**: Note for future implementation

3. **Auto-follow**: Not yet implemented
   - Must manually watch tasks
   - No auto-watch on assignment/comment
   - **Action**: Note for future implementation

---

## Bug Report Template

If you find a bug, report it with this format:

```markdown
**Feature**: [e.g., Time Tracking]
**Action**: [What you did]
**Expected**: [What should happen]
**Actual**: [What actually happened]
**Browser**: [Chrome/Firefox/Safari/Edge]
**Console Errors**: [Any errors in browser console]
**Screenshots**: [If applicable]
```

---

## Success Criteria

✅ All features work as described  
✅ No console errors  
✅ Data persists correctly  
✅ Performance is smooth  
✅ UI is responsive  
✅ Error handling works  
✅ Cross-browser compatible  

---

## Post-Testing

### If All Tests Pass ✅
1. Mark implementation as production-ready
2. Plan cloud storage integration for attachments
3. Plan drag-and-drop implementation
4. Plan auto-follow logic
5. Consider adding keyboard shortcuts
6. Consider adding activity tabs

### If Issues Found ⚠️
1. Document all issues with bug report template
2. Prioritize by severity (Critical/High/Medium/Low)
3. Fix critical issues before deployment
4. Schedule medium/low issues for future sprints

---

**Testing Status**: ⬜ Not Started | 🟡 In Progress | ✅ Complete  
**Tester**: _________________  
**Date**: _________________  
**Result**: ⬜ Pass | ⬜ Pass with Notes | ⬜ Fail  

**Notes**:
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________
