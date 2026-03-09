# Agentflox Agent Service Documentation

## Overview
The Agentflox Agent System allows users to create, configure, and execute AI agents. It is designed with a clear separation of concerns between **Building** (Operator) and **Executing** (Executor).

## Core Services

### 1. AgentBuilderService & AgentOperatorService
- **Role**: The "Architect". Manages configuration, prompts, tools, and lifecycle.
- **Key Features**:
  - **Intelligent Inference**: Uses LLMs (`inferUserIntent`/`inferOperatorAction`) to determine if a user wants to update config or has a question.
  - **Context Guardrails**: If a user asks to *execute* a task here, the system politely redirects them to the Executor.
  - **Configuration Extraction**: Parses natural language requests into JSON patches for the agent's config.

### 2. AgentExecutorService & AgentExecutionService
- **Role**: The "Runner". Handles actual task execution, monitoring, and result analysis.
- **Key Features**:
  - **Execution Boundaries**: Validates capacity (concurrent runs), rate limits, and agent status before every run.
  - **Concurrent Orchestration**: `agentGraph.ts` executes independent steps in parallel for maximum performance.
  - **Safety**: Inputs are sanitized, and execution is sandboxed.

### 3. AgentRelationService
- **Role**: The "Team Manager".
- **Key Features**:
  - Manages hierarchies (Supervisors, Sub-Agents, Peers).
  - Detects and prevents circular dependencies.

## Architecture & Flows

### Building an Agent
1. **User Input**: "Create a research agent."
2. **Intent**: `BUILD_OR_MODIFY`.
3. **Action**: `AgentBuilderService` extracts config, generates system prompt, and saves draft.

### Executing an Agent
1. **User Input**: "Analyze this report."
2. **Intent**: `EXECUTE`.
3. **Action**: `AgentExecutorService` gathers context, then `AgentExecutionService` triggers the `AgentGraph`.
4. **Graph Flow**: `Understand Intent` -> `Gather Context` -> `Plan Actions` -> `Execute Actions` (Concurrent) -> `Store Memory`.

## Safety & Limits (Hardening)
- **Rate Limits**: 50 executions/minute per user.
- **Concurrency**: Max 10 concurrent runs per agent.
- **Locking**: Redis distributed locks prevent race conditions during initialization and updates.
- **Constants**: All limits/prompts defined in `agentConstants.ts`.

## UI Components
- **OperatorView**: For configuration. Uses `trpc.agent.operator`.
- **ChatView**: For execution. Uses `trpc.agent.executor`.
- **TeamView**: Visualizes agent relationships.

## Maintenance
- **Constants**: Update `services/agents/agentConstants.ts` for prompts and limits.
- **Guides**: Update `aiOperatorFlowGuide.ts` / `aiExecutorFlowGuide.ts` to change assistant persona behavior.
