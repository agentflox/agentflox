/**
 * Unit tests for execution artifact helpers + swarm conversation id parsing.
 */
import {
  buildArtifactsFromToolResult,
  inferArtifactType,
  parseSwarmTaskConversationId,
  pickUpstreamResult,
  unwrapToolPayload,
} from '../../src/services/agents/artifacts/executionArtifact';

describe('executionArtifact helpers', () => {
  describe('parseSwarmTaskConversationId', () => {
    it('parses uuid-shaped task id', () => {
      const id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
      expect(parseSwarmTaskConversationId(`swarm-task-conv-${id}`)).toEqual({
        taskId: id,
        isReview: false,
      });
    });

    it('parses non-uuid task id', () => {
      expect(parseSwarmTaskConversationId('swarm-task-conv-clxyz123abc')).toEqual({
        taskId: 'clxyz123abc',
        isReview: false,
      });
    });

    it('parses review suffix', () => {
      const id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
      expect(parseSwarmTaskConversationId(`swarm-task-conv-${id}-review-deadbeef`)).toEqual({
        taskId: id,
        isReview: true,
      });
    });

    it('returns null for invalid / empty', () => {
      expect(parseSwarmTaskConversationId('')).toBeNull();
      expect(parseSwarmTaskConversationId('swarm-task-conv-')).toBeNull();
      expect(parseSwarmTaskConversationId('other-conv-123')).toBeNull();
    });
  });

  describe('unwrapToolPayload', () => {
    it('unwraps nested result.content', () => {
      const inner = unwrapToolPayload({
        status: 'ok',
        toolCallId: 't1',
        result: { content: 'Hello world', title: 'Doc' },
      });
      expect(inner).toMatchObject({ content: 'Hello world', title: 'Doc' });
    });

    it('parses JSON strings', () => {
      const inner = unwrapToolPayload(JSON.stringify({ result: { script: 'print(1)' } }));
      expect(inner).toMatchObject({ script: 'print(1)' });
    });
  });

  describe('buildArtifactsFromToolResult', () => {
    it('builds markdown from nested content', () => {
      const arts = buildArtifactsFromToolResult('writeBlog', {
        result: { content: '# Hello\n\nBody' },
      });
      expect(arts).toHaveLength(1);
      expect(arts[0].type).toBe('markdown');
      expect(arts[0].content).toContain('# Hello');
    });

    it('builds image artifact from url (empty content)', () => {
      const arts = buildArtifactsFromToolResult('generateImage', {
        result: { url: 'https://cdn.example.com/a.png', prompt: 'a cat' },
      });
      expect(arts[0].type).toBe('image');
      expect(arts[0].url).toContain('a.png');
      expect(arts[0].content).toBeUndefined();
    });

    it('marks base64-only media as unsupported', () => {
      const arts = buildArtifactsFromToolResult('generateImage', {
        result: { content: 'data:image/png;base64,AAAA' },
      });
      expect(arts[0].type).toBe('unsupported');
    });
  });

  describe('inferArtifactType / pickUpstreamResult', () => {
    it('prefers text artifact for upstream', () => {
      const upstream = pickUpstreamResult(
        [
          { filename: 'a.png', type: 'image', url: 'https://x/a.png' },
          { filename: 'a.md', type: 'markdown', content: 'Full article' },
        ],
        'summary only'
      );
      expect(upstream).toBe('Full article');
    });

    it('infers code from filename', () => {
      expect(inferArtifactType({ filename: 'main.py', content: 'x = 1' })).toBe('code');
    });
  });
});
