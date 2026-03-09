# Multi-Agent Composition & Orchestration Design

## Overview
This design outlines the architecture for "Agent Swarms" or Multi-Agent Systems (MAS) within the Agent Builder. It enables agents to be composed of other agents, allowing for specialized delegation and hierarchical reasoning.

## Core Concepts

### 1. Agent Relations
We introduce explicit relationships between agents:
- **Supervisor/Worker**: A master agent delegates tasks to specialized sub-agents.
- **Peers**: Agents collaborate in a shared chat room environment.
- **Critic**: A specialized safety or quality assurance agent monitors another agent.

### 2. Graph Orchestration Integration
The `GraphOrchestrator` will be updated to support a `DELEGATION` node.
- When an agent decides it cannot handle a task alone, it transitions to `DELEGATION`.
- The `Router` logic selects the best sub-agent based on `routerConfig`.

### 3. Schema Updates (Proposal)
See `packages/database/prisma/multi_agent_proposal.prisma`.
- `AgentRelation`: Defines the directed graph of agents.

## Implementation Application
1. **Delegation Flow**:
   - Agent A (Manager) receives generic goal.
   - Decomposes goal into sub-tasks.
   - Calls Agent B (Coder) and Agent C (Reviewer).
2. **Shared Context**:
   - Sub-agents inherit the relevant slice of the `UserContext`.
   - Results are summarized back to the Manager.

## Future Work
- **Swarm Protocols**: Standardized communication protocols (e.g., debate, handoff).
- **Consensus Mechanisms**: For peer agents to agree on an output.
