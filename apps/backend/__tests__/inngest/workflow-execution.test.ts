/**
 * Tests for workflow-execution
 */
import { executeWorkflow, executeWorkflowStep } from '../../src/inngest/functions/workflow-execution';
import { prisma } from '../../src/lib/prisma';
import { redisPub } from '../../src/lib/redis';
import { workflowOrchestrationService } from '../../src/services/agents/orchestration/workflowOrchestrator';

jest.mock('../../src/lib/inngest', () => ({
  inngest: {
    createFunction: jest.fn().mockImplementation((config, handler) => ({ config, handler })),
  },
}));

jest.mock('../../src/lib/prisma', () => ({
  prisma: {
    agentWorkflow: { findUnique: jest.fn() },
    agentWorkflowExecution: { update: jest.fn() },
  },
}));

jest.mock('../../src/lib/redis', () => ({
  redisPub: { publish: jest.fn() },
}));

jest.mock('../../src/services/agents/orchestration/workflowOrchestrator', () => ({
  workflowOrchestrationService: {
    dispatchWorkflowStep: jest.fn(),
    evaluateCondition: jest.fn(),
    finalizeStepExecution: jest.fn(),
  },
}));

describe('workflow-execution', () => {
  let step: any;
  beforeEach(() => {
    step = {
      run: jest.fn(async (name, cb) => cb()),
      sendEvent: jest.fn(),
      waitForEvent: jest.fn(),
    };
    jest.clearAllMocks();
  });

  describe('executeWorkflow', () => {
    it('starts workflow execution by triggering the first step', async () => {
      (prisma.agentWorkflow.findUnique as jest.Mock).mockResolvedValue({
        id: 'wf-1',
        definition: { startStepId: 'step-1' }
      });

      const handler = (executeWorkflow as any).handler;
      const event = {
        data: {
          executionId: 'exec-1',
          workflowId: 'wf-1',
          userId: 'u-1',
          input: 'test',
        }
      };

      const res = await handler({ event, step });
      
      expect(step.run).toHaveBeenCalledWith('get-workflow-definition', expect.any(Function));
      expect(step.sendEvent).toHaveBeenCalledWith('trigger-first-step', {
        name: 'agent/workflow.step.execute',
        data: {
          executionId: 'exec-1',
          workflowId: 'wf-1',
          stepId: 'step-1',
          userId: 'u-1',
          input: 'test'
        }
      });
      expect(res).toEqual({ executionId: 'exec-1', status: 'STARTED' });
    });
  });

  describe('executeWorkflowStep', () => {
    it('executes a step, waits for response, finalizes, and triggers next step', async () => {
      (workflowOrchestrationService.dispatchWorkflowStep as jest.Mock).mockResolvedValue({
        messageId: 'msg-1',
      });
      step.waitForEvent.mockResolvedValue({
        data: { response: 'Step Output' }
      });
      (prisma.agentWorkflow.findUnique as jest.Mock).mockResolvedValue({
        id: 'wf-1',
        definition: { steps: [{ id: 'step-1', next: [{ to: 'step-2', condition: 'success' }] }] }
      });
      (workflowOrchestrationService.evaluateCondition as jest.Mock).mockReturnValue(true);

      const handler = (executeWorkflowStep as any).handler;
      const event = {
        data: {
          executionId: 'exec-1',
          workflowId: 'wf-1',
          stepId: 'step-1',
          userId: 'u-1',
          input: 'in',
          depth: 0,
        }
      };

      const res = await handler({ event, step });
      
      expect(workflowOrchestrationService.dispatchWorkflowStep).toHaveBeenCalled();
      expect(step.waitForEvent).toHaveBeenCalled();
      expect(workflowOrchestrationService.finalizeStepExecution).toHaveBeenCalledWith('exec-1', 'step-1', 'Step Output');
      expect(step.sendEvent).toHaveBeenCalledWith('trigger-next-steps', expect.arrayContaining([{
        name: 'agent/workflow.step.execute',
        data: expect.objectContaining({ stepId: 'step-2', depth: 1 })
      }]));
      
      expect(res).toEqual({ stepId: 'step-1', status: 'COMPLETED' });
    });

    it('terminates execution when max depth is reached', async () => {
      const handler = (executeWorkflowStep as any).handler;
      const event = {
        data: {
          executionId: 'exec-1',
          workflowId: 'wf-1',
          stepId: 'step-1',
          userId: 'u-1',
          input: 'in',
          depth: 51, // > MAX_DEPTH
        }
      };

      const res = await handler({ event, step });
      
      expect(prisma.agentWorkflowExecution.update).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ status: 'FAILED' })
      }));
      expect(res).toEqual({ stepId: 'step-1', status: 'TERMINATED_MAX_DEPTH' });
    });
  });
});
