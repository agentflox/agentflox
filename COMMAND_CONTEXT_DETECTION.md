# Context Detection & Cross-Context Actions - Addendum

**Document**: COMMAND_INTERFACE_SPEC.md  
**Section**: Intelligence & Context System (Extended)  
**Version**: 1.1

---

## Detailed Context Detection System

### Entity Types & Context Hierarchy

Agentflox has the following entity hierarchy:

```
Organization
└── Workspace
    ├── Project
    │   ├── Task
    │   ├── Proposal
    │   └── Document
    ├── Team
    │   └── Member
    ├── Tool
    └── Material
```

### Context Detection Rules

#### 1. URL-Based Context Extraction

The system parses the URL to determine the active context:

```typescript
// URL Pattern Examples
/workspace/{workspaceId}                    → Workspace Context
/workspace/{workspaceId}/project/{projectId} → Project Context
/workspace/{workspaceId}/team/{teamId}       → Team Context
/workspace/{workspaceId}/tools               → Tools Context
/workspace/{workspaceId}/materials           → Materials Context
/workspace/{workspaceId}/proposals           → Proposals Context
```

**Context Object Structure**:

```typescript
interface DetectedContext {
  // Primary Context (from URL)
  type: 'workspace' | 'project' | 'team' | 'tools' | 'materials' | 'proposals' | 'tasks' | 'documents';
  entityId: string;
  entityName: string;
  
  // Parent Contexts (inherited)
  workspace?: {
    id: string;
    name: string;
  };
  project?: {
    id: string;
    name: string;
  };
  
  // Additional Metadata
  filters?: {
    status?: string;
    assignee?: string;
    dateRange?: { start: Date; end: Date };
  };
  
  // User's Role in Context
  userRole: 'owner' | 'admin' | 'member' | 'viewer';
  permissions: string[];
}
```

---

### Context-Aware Command Processing

#### Scenario 1: User in Project Context, Asks About Tasks

**URL**: `/workspace/marketing/project/website-redesign`

**User Input**: `"show me overdue tasks"`

**System Processing**:

```
1. Extract Context:
   - Type: project
   - Project ID: website-redesign
   - Workspace: marketing

2. Parse Intent:
   - Action: query/list
   - Entity: tasks
   - Filter: overdue

3. Context Validation:
   ✓ Tasks belong to projects → Context is valid
   ✓ User has permission to view tasks

4. Execute Query:
   - Scope: Current project (website-redesign)
   - Filter: status = overdue
   - Return: List of overdue tasks in this project

5. Display Result:
   ┌────────────────────────────────────────────┐
   │ 🔍 Overdue Tasks in Website Redesign       │
   │                                            │
   │ Context: Marketing > Website Redesign      │
   │                                            │
   │ Found 3 overdue tasks:                     │
   │ • Design hero section (Due: Jan 10)       │
   │ • Build navigation (Due: Jan 11)          │
   │ • Mobile optimization (Due: Jan 12)       │
   │                                            │
   │ [Extend Deadlines] [Reassign] [View All]  │
   └────────────────────────────────────────────┘
```

---

#### Scenario 2: User in Tools Context, Asks About Tasks

**URL**: `/workspace/marketing/tools`

**User Input**: `"create a task for reviewing the analytics dashboard"`

**System Processing**:

```
1. Extract Context:
   - Type: tools
   - Workspace: marketing
   - No project context

2. Parse Intent:
   - Action: create
   - Entity: task
   - Description: "reviewing the analytics dashboard"

3. Context Validation:
   ✗ Tasks require project context
   ✗ Current context (tools) doesn't have a project

4. Disambiguation Required:
   System asks user to specify project

5. Display Disambiguation:
   ┌────────────────────────────────────────────┐
   │ 📝 Create Task                             │
   │                                            │
   │ ⚠️ Tasks must belong to a project         │
   │                                            │
   │ Which project should this task be in?     │
   │                                            │
   │ Recent Projects in Marketing:              │
   │ • Website Redesign (5 active tasks)       │
   │ • Q1 Campaign (12 active tasks)           │
   │ • Brand Refresh (3 active tasks)          │
   │                                            │
   │ Or type project name: [____________]       │
   │                                            │
   │ [Cancel]                                   │
   └────────────────────────────────────────────┘

6. User Selects Project:
   User clicks "Website Redesign"

7. Create Task:
   - Project: Website Redesign
   - Workspace: Marketing (inherited)
   - Description: "reviewing the analytics dashboard"
   - Created successfully

8. Show Confirmation:
   ┌────────────────────────────────────────────┐
   │ ✓ Task Created                             │
   │                                            │
   │ "Review analytics dashboard"               │
   │ Project: Website Redesign                  │
   │ Workspace: Marketing                       │
   │                                            │
   │ [Assign] [Set Deadline] [View Task]       │
   └────────────────────────────────────────────┘
```

---

#### Scenario 3: User Asks About Materials in Project Context

**URL**: `/workspace/marketing/project/website-redesign`

**User Input**: `"show me design materials"`

**System Processing**:

```
1. Extract Context:
   - Type: project
   - Project: website-redesign
   - Workspace: marketing

2. Parse Intent:
   - Action: query/list
   - Entity: materials
   - Filter: type = design

3. Context Validation:
   ⚠️ Materials are workspace-level, not project-level
   ℹ️ But can be filtered by project association

4. Smart Context Expansion:
   System understands user wants materials related to current project

5. Execute Query:
   - Scope: Workspace (marketing)
   - Filter: associated_projects includes website-redesign
   - Filter: type = design
   - Return: Design materials linked to this project

6. Display Result:
   ┌────────────────────────────────────────────┐
   │ 🎨 Design Materials                        │
   │                                            │
   │ Context: Marketing > Website Redesign      │
   │ Showing materials linked to this project   │
   │                                            │
   │ Found 8 design materials:                  │
   │ • Logo variations (Updated 2 days ago)    │
   │ • Color palette guide (Updated 1 week)    │
   │ • Typography system (Updated 3 days)      │
   │ ... and 5 more                            │
   │                                            │
   │ [View All Materials] [Upload New]         │
   └────────────────────────────────────────────┘
```

---

#### Scenario 4: Cross-Context Action - Create Proposal from Project

**URL**: `/workspace/marketing/project/website-redesign`

**User Input**: `"create a proposal for the new homepage design"`

**System Processing**:

```
1. Extract Context:
   - Type: project
   - Project: website-redesign
   - Workspace: marketing

2. Parse Intent:
   - Action: create
   - Entity: proposal
   - Topic: "new homepage design"

3. Context Validation:
   ℹ️ Proposals are workspace-level entities
   ℹ️ But can be linked to projects

4. Smart Context Handling:
   System creates proposal at workspace level
   Automatically links it to current project

5. Pre-fill Proposal Data:
   - Workspace: Marketing (from context)
   - Linked Project: Website Redesign (from context)
   - Title: "New Homepage Design Proposal"
   - Auto-populate with project details

6. Display Creation Form:
   ┌────────────────────────────────────────────┐
   │ 📄 Create Proposal                         │
   │                                            │
   │ Workspace: Marketing ✓                     │
   │ Linked to: Website Redesign ✓             │
   │                                            │
   │ Title:                                     │
   │ [New Homepage Design Proposal_______]      │
   │                                            │
   │ Description:                               │
   │ ┌────────────────────────────────────┐    │
   │ │ Proposal for redesigning the       │    │
   │ │ homepage as part of the Website    │    │
   │ │ Redesign project...                │    │
   │ └────────────────────────────────────┘    │
   │                                            │
   │ [Create Proposal] [Cancel]                │
   └────────────────────────────────────────────┘
```

---

### Context Inference Intelligence

#### Smart Context Expansion

When user asks about entities that exist at different hierarchy levels, the system intelligently expands or narrows the context:

**Expansion Rules**:

1. **Child → Parent**: If asking about parent entity from child context
   ```
   Context: Project
   Query: "show workspace settings"
   → Expands to workspace context
   ```

2. **Sibling → Sibling**: If asking about sibling entity
   ```
   Context: Tools
   Query: "show materials"
   → Switches to materials context (same workspace)
   ```

3. **Parent → Children**: If asking about child entities from parent context
   ```
   Context: Workspace
   Query: "list all tasks"
   → Aggregates tasks from all projects in workspace
   ```

**Narrowing Rules**:

1. **Workspace → Project**: If specific project mentioned
   ```
   Context: Workspace
   Query: "tasks in website redesign project"
   → Narrows to specific project
   ```

2. **Project → Task**: If specific task mentioned
   ```
   Context: Project
   Query: "update task #123"
   → Narrows to specific task
   ```

---

### Context Disambiguation Strategies

#### Strategy 1: Suggest Most Likely Context

When context is ambiguous, system suggests based on:

```typescript
Priority Order:
1. Current page context
2. Recently accessed entities
3. Most frequently used entities
4. Entities with upcoming deadlines
5. Alphabetical order
```

**Example**:

```
User: "show me tasks"
Current Context: Workspace (has 5 projects)

System Response:
┌────────────────────────────────────────────┐
│ 📋 Show Tasks                              │
│                                            │
│ Which project's tasks?                     │
│                                            │
│ 🔥 Suggested (most active):                │
│ → Website Redesign (8 tasks, 3 overdue)   │
│                                            │
│ Other Projects:                            │
│ • Q1 Campaign (12 tasks)                  │
│ • Brand Refresh (3 tasks)                 │
│ • Analytics Dashboard (5 tasks)           │
│ • Mobile App (2 tasks)                    │
│                                            │
│ Or: [Show all tasks across projects]      │
└────────────────────────────────────────────┘
```

---

#### Strategy 2: Smart Defaults with Override

System applies smart defaults but allows user to override:

```
User: "create a task"
Current Context: Project

System:
1. Auto-fills project from context
2. Shows context chips that user can modify
3. Allows changing project before creation

Display:
┌────────────────────────────────────────────┐
│ 📝 Create Task                             │
│                                            │
│ Context: [Marketing ×] [Website Redesign ×]│
│          ↑ Click × to change               │
│                                            │
│ Task Title: [_____________________]        │
│ Description: [____________________]        │
│                                            │
│ [Create] [Cancel]                         │
└────────────────────────────────────────────┘
```

---

#### Strategy 3: Natural Language Context Specification

Users can explicitly specify context in natural language:

```
Examples:

"show tasks in marketing workspace"
→ Workspace: marketing, Entity: tasks

"create proposal for website redesign project"
→ Project: website-redesign, Action: create proposal

"list all materials in the design category"
→ Entity: materials, Filter: category=design

"show me tools used by the frontend team"
→ Entity: tools, Filter: team=frontend
```

**Parsing Logic**:

```typescript
function parseContextFromNaturalLanguage(input: string): ParsedContext {
  const patterns = [
    // Workspace patterns
    /in (\w+) workspace/i,
    /workspace:(\w+)/i,
    
    // Project patterns
    /for (\w+) project/i,
    /in project (\w+)/i,
    /project:(\w+)/i,
    
    // Team patterns
    /by (\w+) team/i,
    /team:(\w+)/i,
    
    // Entity patterns
    /(tasks?|projects?|materials?|tools?|proposals?)/i,
  ];
  
  // Extract context from patterns
  // Return structured context object
}
```

---

### Context Persistence & Memory

#### Session Context Memory

System remembers context choices within a session:

```typescript
interface SessionMemory {
  // Last used contexts
  lastWorkspace: string;
  lastProject: string;
  lastTeam: string;
  
  // User preferences
  preferredContextExpansion: 'narrow' | 'broad';
  alwaysAskForContext: boolean;
  
  // Recent context switches
  contextHistory: Array<{
    timestamp: Date;
    from: Context;
    to: Context;
    trigger: 'user' | 'auto';
  }>;
}
```

**Smart Context Switching**:

```
If user frequently switches from Tools → Materials:
  System learns this pattern
  Next time in Tools context, suggests Materials in quick actions
```

---

### Error Handling & User Guidance

#### Invalid Context Actions

When user tries an action not valid in current context:

```
User in Materials context: "assign this to Sarah"
System: Materials cannot be assigned to users

Response:
┌────────────────────────────────────────────┐
│ ⚠️ Cannot Assign Materials                 │
│                                            │
│ Materials are shared resources and cannot  │
│ be assigned to individual users.           │
│                                            │
│ Did you mean to:                           │
│ • Create a task to review this material?  │
│ • Share this material with Sarah?         │
│ • Tag Sarah in material comments?         │
│                                            │
│ [Create Task] [Share] [Cancel]            │
└────────────────────────────────────────────┘
```

---

#### Context Permission Errors

When user lacks permission in current context:

```
User tries to create project in workspace where they're a viewer:

Response:
┌────────────────────────────────────────────┐
│ 🔒 Insufficient Permissions                │
│                                            │
│ You need Admin or Owner role to create     │
│ projects in the Marketing workspace.       │
│                                            │
│ Your current role: Viewer                  │
│                                            │
│ Would you like to:                         │
│ • Request admin access                     │
│ • Create project in different workspace   │
│ • Contact workspace owner                 │
│                                            │
│ [Request Access] [Switch Workspace]       │
└────────────────────────────────────────────┘
```

---

### Context Visualization

#### Context Breadcrumb Display

Always show current context at top of command interface:

```
┌────────────────────────────────────────────┐
│ 🏠 Marketing > Website Redesign > Tasks    │
│ ────────────────────────────────────────── │
│ [Your command input here_____________]     │
└────────────────────────────────────────────┘
```

#### Context Chips (Modifiable)

Show context as interactive chips:

```
┌────────────────────────────────────────────┐
│ Context: [Marketing ×] [Website Redesign ×]│
│                                            │
│ Click × to remove or change context        │
│ Click chip to view entity details          │
└────────────────────────────────────────────┘
```

---

## Summary: Context Detection Flow

```
User Opens Command Interface
        ↓
Extract Context from URL
        ↓
Parse User Input
        ↓
Determine Required Context for Action
        ↓
    ┌───────────────┐
    │ Context Valid?│
    └───────┬───────┘
            │
    ┌───────┴───────┐
    │               │
   YES             NO
    │               │
    ↓               ↓
Execute      Disambiguation
Action       Required
    │               │
    │       ┌───────┴────────┐
    │       │                │
    │   Suggest         Ask User
    │   Context         to Specify
    │       │                │
    │       └────────┬───────┘
    │                │
    │                ↓
    │         User Selects
    │         Context
    │                │
    └────────────────┘
             ↓
      Execute Action
      with Context
             ↓
      Show Result
```

---

**End of Context Detection Addendum**
