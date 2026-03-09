# Agent Services Analysis & Frontend Alignment

## Service Comparison

### AgentOperatorService
**Purpose**: Manage and configure ACTIVE agents (reconfiguration)
**Use Case**: Modify existing active agents' configuration

**Key Features**:
- ✅ Configuration extraction and merging
- ✅ Agent update service integration
- ✅ Configuration merger for applying changes
- ✅ Handles agent reconfiguration while active
- ✅ Can suggest configuration patches
- ✅ Applies changes to active agents

**Response Schema**:
```typescript
{
  response: string;
  suggestedActions: Array<{
    type: 'execute' | 'update' | 'info';  // ← Has 'update' type
    label: string;
    payload?: Record<string, unknown>;
  }>;
  patch?: Record<string, unknown>;  // ← Can return configuration patches
}
```

**Dependencies**:
- `agentUpdateService` - Updates agent configuration
- `configurationExtractor` - Extracts config from user messages
- `configurationMerger` - Merges extracted config with current state

---

### AgentExecutorService
**Purpose**: Execute and interact with ACTIVE agents
**Use Case**: Chat with agents, trigger executions, monitor results

**Key Features**:
- ✅ Execute agent tasks
- ✅ Monitor execution history
- ✅ Suggest execution inputs
- ✅ Answer questions about agent usage
- ❌ NO configuration changes
- ❌ NO agent updates

**Response Schema**:
```typescript
{
  response: string;
  suggestedActions: Array<{
    type: 'execute' | 'info';  // ← NO 'update' type
    label: string;
    payload?: any;
  }>;
  // NO patch field
}
```

**Dependencies**:
- NO `agentUpdateService`
- NO `configurationExtractor`
- NO `configurationMerger`

---

## Current Frontend Usage (INCORRECT)

### BuilderView.tsx ❌
- **Currently using**: `trpc.agent.operator.*`
- **Purpose**: Building NEW agents from scratch
- **Problem**: Operator is for ACTIVE agent reconfiguration, not new agent creation

### ChatView.tsx ✅
- **Currently using**: `trpc.agent.executor.*`
- **Purpose**: Chat with active agents
- **Status**: CORRECT - Executor is for interacting with active agents

---

## Correct Architecture

```
┌─────────────────────────────────────────────────────────┐
│                  AgentBuilderService                     │
│  Purpose: Build NEW agents from scratch                  │
├─────────────────────────────────────────────────────────┤
│  Used by: BuilderView (NEW agent creation)              │
│  Features:                                               │
│  - Create agent from conversation                        │
│  - Extract configuration from chat                       │
│  - Build agent draft                                     │
│  - Launch new agent                                      │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                 AgentOperatorService                     │
│  Purpose: Reconfigure EXISTING ACTIVE agents             │
├─────────────────────────────────────────────────────────┤
│  Used by: OperatorView (Reconfigure active agents)      │
│  Features:                                               │
│  - Modify active agent configuration                     │
│  - Extract config changes from chat                      │
│  - Apply patches to active agents                        │
│  - Suggest configuration updates                         │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                 AgentExecutorService                     │
│  Purpose: Execute and chat with ACTIVE agents            │
├─────────────────────────────────────────────────────────┤
│  Used by: ChatView (Interact with active agents)        │
│  Features:                                               │
│  - Chat with active agents                               │
│  - Trigger agent executions                              │
│  - Monitor execution history                             │
│  - Suggest execution inputs                              │
└─────────────────────────────────────────────────────────┘
```

---

## Required Changes

### ❌ BuilderView.tsx - WRONG SERVICE
**Current**: Using `operator` API
**Should use**: `builder` API (for NEW agent creation)

**Why it's wrong**:
- BuilderView is for creating NEW agents
- Operator is for reconfiguring EXISTING ACTIVE agents
- BuilderView should use AgentBuilderService, not AgentOperatorService

### ✅ ChatView.tsx - CORRECT SERVICE
**Current**: Using `executor` API ✓
**Status**: Already correct!

**Why it's correct**:
- ChatView is for interacting with active agents
- Executor handles execution and chat with active agents
- This is the right service for this use case

---

## Recommended Frontend Structure

### 1. BuilderView.tsx (NEW agents)
```typescript
// For creating NEW agents from scratch
trpc.agent.builder.initialize()
trpc.agent.builder.message()
trpc.agent.builder.launch()
```

### 2. OperatorView.tsx (Reconfigure ACTIVE agents)
```typescript
// For modifying EXISTING ACTIVE agents
trpc.agent.operator.initialize()
trpc.agent.operator.message()
trpc.agent.operator.apply()  // Apply configuration patches
```

### 3. ChatView.tsx (Interact with ACTIVE agents)
```typescript
// For chatting and executing with ACTIVE agents
trpc.agent.executor.initialize()
trpc.agent.executor.message()
trpc.agent.executor.execute()  // Trigger executions
```

---

## Action Items

### HIGH PRIORITY
1. ✅ **ChatView is correct** - No changes needed
2. ❌ **BuilderView needs fixing** - Should use `builder` API, not `operator`
3. ⚠️ **Consider creating OperatorView** - For reconfiguring active agents

### Specific Changes for BuilderView

**Before**:
```typescript
const initializeMutation = trpc.agent.operator.initialize.useMutation({...});
const messageMutation = trpc.agent.operator.message.useMutation({...});
```

**After**:
```typescript
const initializeMutation = trpc.agent.builder.initialize.useMutation({...});
const messageMutation = trpc.agent.builder.message.useMutation({...});
```

---

## Summary

| View | Current API | Correct API | Status | Purpose |
|------|------------|-------------|--------|---------|
| BuilderView | `operator` | `builder` | ❌ WRONG | Create NEW agents |
| ChatView | `executor` | `executor` | ✅ CORRECT | Chat with active agents |
| OperatorView | N/A | `operator` | ⚠️ MISSING | Reconfigure active agents |

**Key Insight**: 
- **Builder** = Create NEW agents
- **Operator** = Reconfigure EXISTING ACTIVE agents  
- **Executor** = Execute and chat with ACTIVE agents

BuilderView should use **builder** API, not **operator** API!
