/**
 * Tests for ToolBuilderService
 */
import { ToolBuilderService } from '../../src/services/tools/toolBuilderService';
import { toolBuilderStateService } from '../../src/services/tools/toolBuilderStateService';
import { prisma } from '../../src/lib/prisma';
import { openai } from '../../src/lib/openai';

jest.mock('../../src/lib/prisma', () => ({
  prisma: {
    compositeTool: { findUnique: jest.fn() },
  },
}));

jest.mock('../../src/services/tools/toolBuilderStateService', () => ({
  toolBuilderStateService: {
    getConversationState: jest.fn(),
    createConversationState: jest.fn(),
    saveConversationState: jest.fn(),
    addMessageToHistory: jest.fn(),
  },
}));

jest.mock('../../src/lib/openai', () => ({
  openai: {
    chat: {
      completions: {
        create: jest.fn(),
      },
    },
  },
}));

jest.mock('../../src/utils/ai/fetchModel', () => ({
  fetchModel: jest.fn().mockResolvedValue({ name: 'gpt-4o-mini' }),
}));

describe('ToolBuilderService', () => {
  let service: ToolBuilderService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ToolBuilderService();
  });

  describe('initializeConversation', () => {
    it('creates a new conversation state when no conversationId is provided', async () => {
      (toolBuilderStateService.createConversationState as jest.Mock).mockResolvedValue({
        conversationId: 'conv-1',
        toolDraft: { status: 'draft', steps: [] },
        conversationHistory: [],
      });
      (openai.chat.completions.create as jest.Mock).mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify({ message: 'Welcome back', followups: [] }),
          },
        }],
      });

      const res = await service.initializeConversation('user-1');
      expect(toolBuilderStateService.createConversationState).toHaveBeenCalledWith('user-1', undefined);
      expect(res.conversationId).toBe('conv-1');
      expect(toolBuilderStateService.addMessageToHistory).toHaveBeenCalled();
    });

    it('loads existing conversation state', async () => {
      const mockState = {
        conversationId: 'conv-old',
        toolDraft: { status: 'draft', steps: [] },
        conversationHistory: [{ content: 'Old Welcome' }],
      };
      (toolBuilderStateService.getConversationState as jest.Mock).mockResolvedValue(mockState);

      const res = await service.initializeConversation('user-1', 'conv-old', undefined, true);
      expect(res.conversationId).toBe('conv-old');
      expect(toolBuilderStateService.getConversationState).toHaveBeenCalledWith('conv-old');
      expect(res.welcomeMessage).toBe('');
    });
  });
});
