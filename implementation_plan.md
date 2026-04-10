# Implementation Plan - Python/JS Step Output Fields

Allow users to define structured output fields for code steps, making them easily available as variables in subsequent steps.

## Proposed Changes

### [features/dashboard/views/tools/ToolBuilderView.tsx](file:///c:/Users/datng/agentflox/apps/frontend/src/features/dashboard/views/tools/ToolBuilderView.tsx)
#### [MODIFY] [ToolBuilderView.tsx](file:///c:/Users/datng/agentflox/apps/frontend/src/features/dashboard/views/tools/ToolBuilderView.tsx)
- **Configure Tab (Python)**: Add "PyPI Packages" section with a list editor.
- **Advanced Tab**: Implement resource limits and execution settings:
    - Runtime Commands, Session ID, Long Output Mode.
    - Resource Selection: GPUs (0-4), CPU Cores (1-16), Memory (512MB-32GB).
    - Execution Control: Session Timeout, Raise Error policy, Fallback toggle.
- **Outputs Tab**: Redesign output field cards to match Relevance AI (vibrant preview, clear path labeling).
- **Tabs Integration**: Add "Docs" and "Fallback" tabs to the code step sidebar.

### [NEW] [codeExecutor.service.ts](file:///c:/Users/datng/agentflox/apps/backend/src/services/agents/execution/codeExecutor.service.ts)

Create a new service to handle isolated code execution.

1.  **Javascript Execution**:
    - **Library**: Use [isolated-vm](https://github.com/laverdet/isolated-vm) instead of `vm2` for true V8 isolate-based security.
    - **Security**: 
        - Dedicated [Isolate](file:///c:/Users/datng/agentflox/apps/backend/src/services/agents/execution/codeExecutor.ts#79-139) with limited memory (e.g., 128MB).
        - No access to Node.js `require`, `fs`, `net`, etc.
        - Hard execution time limit (e.g., 5000ms).
    - **Standard Globals & Helpers**:
        - `params`: Object containing step inputs.
        - `steps`: Object containing previous step outputs.
        - **Built-in Functions**:
            - `console.log()`: Captured with **hard limits (1,000 lines / 64KB)**. **Policy**: Truncate and continue (emit warning in metadata) rather than failing.
            - [prompt_completion(prompt, options)](file:///c:/Users/datng/agentflox/apps/backend/src/services/agents/execution/codeExecutor.ts#167-168): Async helper. Uses internal service-to-service auth (opaque to user code).
        - **Dynamic Imports**: **DISABLED** for the initial version to maintain 100% network isolation and 5s performance.
    - **Data Injection**:
      ```typescript
      const isolate = new ivm.Isolate({ memoryLimit: 128 });
      const context = await isolate.createContext();
      const jail = context.global;
      await jail.set('params', new ivm.ExternalCopy(params).copyInto());
      await jail.set('steps', new ivm.ExternalCopy(steps).copyInto());
      ```

2.  **Python Execution**:
    - **Mechanism**: `child_process.spawn('python3', ...)`
    - **Isolation**:
        - **User**: Run as a restricted non-root user (e.g., `agent-runner`).
        - **Network**: Block outbound network access via `iptables` or Linux network namespaces (if applicable).
        - **Filesystem**: Mount as read-only, except for a specific `/tmp/workdir` scoped to the execution.
    - **Timeout**: Enforce via `setTimeout` in the Node.js parent. On timeout, call `child.kill('SIGKILL')` and return a `TimeoutError`.
    - **Standard Globals & Helpers**:
        - `params`: Dictionary of step inputs.
        - `steps`: Dictionary of previous step outputs.
        - **Built-in Functions**:
            - `print(*args)`: Captured with **hard limits (1,000 lines / 64KB)**. **Policy**: Truncate and continue.
            - [prompt_completion(prompt, model=None)](file:///c:/Users/datng/agentflox/apps/backend/src/services/agents/execution/codeExecutor.ts#167-168): Auth via internal token. Counts against user token budget.
            - [run_step(step_name, params)](file:///c:/Users/datng/agentflox/apps/backend/src/services/agents/execution/codeExecutor.ts#168-172): **Recursive Guard**: Hard capped at **depth 5**. Tracked via `executionDepth: number` passed inside the `execution.context` object.
        - Use a pre-warmed virtualenv with allowed packages for better performance.

### Data Schemas & Protocols

1. **[OutputField](file:///c:/Users/datng/agentflox/apps/frontend/src/entities/tools/types/builder.ts#44-50) Schema**:
   ```typescript
   interface OutputField {
     name: string;        // Variable key. Must match /^[a-zA-Z_][a-zA-Z0-9_]*$/
     type: 'string' | 'number' | 'boolean' | 'object' | 'array';
     description?: string;
   }
   ```
   *Stored as `outputFields: OutputField[]` in the step's `config`. Verification: Zod refinement enforces alphanumeric naming to prevent injection/interpolation issues.*

2. **`StepError` Interface**:
   ```typescript
   interface StepError {
     type: 'SYNTAX' | 'RUNTIME' | 'TIMEOUT' | 'SECURITY' | 'TYPE_MISMATCH';
     message: string;
     line?: number;
   }
   ```
   *If execution fails, the step returns `{ "status": "error", "error": StepError }`. The Workflow Engine should mark the step as `FAILED`. Note: Log overflows do not trigger an error; they are truncated silently with a metadata warning.*

3. **Output Type Validation**:
   - The engine **must validate** the returned object against the `outputFields` schema.
   - If a field is missing or the type is incorrect (e.g., `string` instead of `number`), it must return a `TYPE_MISMATCH` error and fail the step. No implicit coercion.

### [apps/backend/src/services/agents/orchestration/workflowOrchestrator.ts](file:///c:/Users/datng/agentflox/apps/backend/src/services/agents/orchestration/workflowOrchestrator.ts)

#### [MODIFY] [workflowOrchestrator.ts](file:///c:/Users/datng/agentflox/apps/backend/src/services/agents/orchestration/workflowOrchestrator.ts)

- Update [dispatchWorkflowStep](file:///c:/Users/datng/agentflox/apps/backend/src/services/agents/orchestration/workflowOrchestrator.ts#101-329) to handle code steps:
  - If `step.type` is `SYSTEM_TOOL` and `step.config.kind` is `PYTHON` or `JAVASCRIPT`:
    - Call `codeExecutorService.execute(step.config, input, execution.context.steps)`.
    - Instead of waiting for an external agent, immediately trigger the `agent/message.processed` event with the result.
    - This allows the `executeWorkflowStep` Inngest function to continue its loop.

## Technical Details

### Security & Resource Limits
- **Javascript**: Use `ivm.Isolate({ memoryLimit: 128 })` to enforce hard memory caps.
- **Python**: 
    - **Timeouts**: 5s for JS (low overhead), 30s for Python (startup/env overhead).
    - **Isolation**: OS-level restricted user + Network Namespace (primary). Python blocklist (defense-in-depth).
    - **Worker Directory**: Each execution generates a unique `/tmp/agentflox-run-<uuid>` to prevent concurrency collisions.

### Environment Lifecycle
- **Virtualenv**: A "base" virtualenv containing allowed packages is pre-built during the application's Docker build phase.
- **Maintenance**: **Additions to the package allowlist require a security review and a Docker rebuild.** This prevents ad-hoc, unvetted dependencies from entering the runner.
- **Startup**: The runner script activates this env in read-only mode for each execution.

## Verification Plan

### Automated Tests
- **Isolation Tests**: Verify that JS/Python scripts cannot access sensitive globals ([process](file:///c:/Users/datng/agentflox/apps/backend/src/services/agents/arch/agentExecutorService.ts#805-837), `os`), cannot reach the network, and cannot write outside their `/tmp`.
- **Validation Tests**: Ensure `outputFields` schema validation (Zod) rejects invalid names or types. Reject runtime results that mismatch declared types.
- **Concurrency Tests**: Run 10 parallel Python steps and verify they use unique working directories and do not cross-talk.
- **Error Tests**: Confirm that syntax errors and timeouts (5s/30s) are caught and returned as structured errors.

### Manual Verification
1. **Schema Definition**: In the `Outputs` tab, add a field `result` (number).
2. **Persistence Check**: Verify the `JSON` tab includes the `outputFields` array before and after saving.
3. **Variable Access**: Add an LLM step after a code step and verify `steps.code_step.result` is available in the variable selector.
4. **Type Check**: Return `{"result": "not-a-number"}` and verify the step fails with `TYPE_MISMATCH`.
5. **Billing Check**: Execute a `prompt_completion` call and verify the tokens are correctly attributed to the user in the audit/billing logs.
6. **Security Check**: Attempt `import os; os.system("ls")` in Python and verify it is blocked by the OS user/namespace.
