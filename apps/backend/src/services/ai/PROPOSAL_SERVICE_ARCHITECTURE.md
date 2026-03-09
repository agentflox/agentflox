# AI Proposal Service Architecture

## Overview
Refactored the AI proposal generation logic from the controller to a dedicated service layer for better separation of concerns and maintainability.

## File Structure

```
apps/backend/src/
├── controllers/
│   └── ai.controller.ts              # Thin controller - validation & response handling
└── services/
    └── ai/
        ├── proposal.service.ts        # NEW: Business logic for proposal generation
        └── model.service.ts           # Existing: AI model provider abstraction
```

## Architecture

### Controller Layer (`ai.controller.ts`)
**Responsibilities:**
- Request validation (Zod schema)
- HTTP request/response handling
- Error formatting and status codes
- Delegates business logic to services

**What it does NOT do:**
- ❌ AI prompt construction
- ❌ Token limit checking
- ❌ Database queries
- ❌ Usage tracking

### Service Layer (`proposal.service.ts`)
**Responsibilities:**
- AI prompt construction and templating
- Token estimation and limit checking
- AI model invocation
- Response parsing and validation
- Usage tracking (non-blocking)
- Database interactions

**Public Methods:**
```typescript
generateProposal(
  input: GenerateProposalInput,
  userId: string
): Promise<GenerateProposalOutput | TokenLimitError>
```

**Private Methods:**
- `buildProposalPrompt()` - Constructs the AI prompt
- `trackUsage()` - Tracks token usage in database

## Benefits

### ✅ Better Separation of Concerns
- Controller handles HTTP concerns only
- Service handles business logic
- Clear boundaries between layers

### ✅ Testability
- Service can be unit tested independently
- Mock dependencies easily
- Test business logic without HTTP layer

### ✅ Reusability
- Service can be used by other controllers
- Can be invoked from background jobs
- Easy to add new AI-powered features

### ✅ Maintainability
- Single responsibility principle
- Easier to locate and fix bugs
- Clear code organization

### ✅ Type Safety
- Well-defined input/output interfaces
- Clear contract between layers
- Better IDE support and autocomplete

## Usage Example

```typescript
// In any service or controller
const proposalService = new ProposalService();

const result = await proposalService.generateProposal(
  {
    taskTitle: "Build a Next.js app",
    taskDescription: "Create a modern web application",
    dueDate: "2026-02-15"
  },
  userId
);

// Handle token limit error
if ('error' in result) {
  // Handle insufficient tokens
  console.log(`Need ${result.required} tokens, have ${result.remaining}`);
} else {
  // Use generated proposal
  console.log(result.detailedDesc);
  console.log(result.skills);
}
```

## Type Definitions

### Input
```typescript
interface GenerateProposalInput {
  taskTitle: string;
  taskDescription?: string;
  dueDate?: string;
  projectId?: string;
}
```

### Output (Success)
```typescript
interface GenerateProposalOutput {
  detailedDesc: string;
  skills: string[];
  niceToHaveSkills: string[];
  experience: 'Junior' | 'Mid-Level' | 'Senior';
  dueDate?: string;
}
```

### Output (Token Limit Error)
```typescript
interface TokenLimitError {
  error: 'Insufficient tokens';
  remaining: number;
  required: number;
}
```

## Migration Notes

- ✅ All existing functionality preserved
- ✅ API endpoints remain unchanged
- ✅ Frontend requires no changes
- ✅ Backward compatible
