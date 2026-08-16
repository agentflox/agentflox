import {
  executeGithubGetRepository,
  executeGithubListRepos,
} from '../../src/modules/integrations/executor/githubExecutor';
import { assertGithubPathAllowed } from '../../src/modules/integrations/security/allowlist';
import { prisma } from '../../src/lib/prisma';

jest.mock('../../src/lib/prisma', () => ({
  prisma: {
    integrationConnection: { findFirst: jest.fn() },
    integration: { findFirst: jest.fn() },
  },
}));

const mockFetch = jest.fn();
global.fetch = mockFetch as unknown as typeof fetch;

describe('SaaS integration executor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.integrationConnection.findFirst as jest.Mock).mockResolvedValue({
      id: 'acct-1',
      accessToken: 'gh-token',
    });
    (prisma.integration.findFirst as jest.Mock).mockResolvedValue(null);
  });

  it('executes githubGetRepository with bearer auth', async () => {
    mockFetch.mockResolvedValue({
      status: 200,
      statusText: 'OK',
      headers: { get: () => 'application/json' },
      text: async () => JSON.stringify({ full_name: 'octo/repo' }),
    });

    const result = await executeGithubGetRepository(
      { accountId: 'acct-1', owner: 'octo', repo: 'repo' },
      'user-1',
      'ws-1',
    );

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.github.com/repos/octo/repo',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          Authorization: 'Bearer gh-token',
        }),
      }),
    );
    expect(result.body).toEqual({ full_name: 'octo/repo' });
  });

  it('rejects non-allowlisted github API paths', () => {
    expect(() => assertGithubPathAllowed('/evil/path')).toThrow(/not allowlisted/i);
  });

  it('fails loudly when account is missing', async () => {
    (prisma.integrationConnection.findFirst as jest.Mock).mockResolvedValue(null);

    await expect(
      executeGithubListRepos({ accountId: 'missing' }, 'user-1', 'ws-1'),
    ).rejects.toThrow(/No connected github account/i);
  });
});
