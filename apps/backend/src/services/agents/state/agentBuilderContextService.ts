/**
 * Agent Builder Context Service
 * 
 * Fetches and structures user context for the agent builder conversation
 * Uses progressive loading: first fetch lists, then details on demand
 */

import { prisma } from '@/lib/prisma';
import { getAllTriggerDefinitions } from '../registry/triggerRegistry';

export interface UserContext {
  // Lists only - details fetched on demand
  workspaces: Array<{
    id: string;
    name: string;
  }>;
  spaces: Array<{
    id: string;
    name: string;
    workspaceId?: string;
  }>;
  projects: Array<{
    id: string;
    name: string;
    description?: string;
    workspaceId?: string;
    spaceId?: string;
  }>;
  teams: Array<{
    id: string;
    name: string;
    description?: string;
    workspaceId?: string;
    spaceId?: string;
  }>;
  availableTriggers: Array<{
    id: string;
    name: string;
    type?: string;
    description: string;
    scope: string[];
    triggerType: string;
    triggerConfig?: any;
    parameters: Array<any>;
  }>;
  availableTools?: Array<{
    id: string;
    name: string;
    description: string;
    category: string;
  }>;
  availableSkills?: Array<{
    id: string;
    name: string;
    description: string;
    tools: string[];
  }>;
  connectedIntegrations: string[];
  existingAgents: Array<{
    id: string;
    name: string;
    description?: string;
    agentType: string;
    status: string;
    isActive: boolean;
    isShared: boolean;
    workspaceId?: string;
    spaceId?: string;
    projectId?: string;
    teamId?: string;
    workspace?: {
      id: string;
      name: string;
    };
    space?: {
      id: string;
      name: string;
    };
    project?: {
      id: string;
      name: string;
    };
    team?: {
      id: string;
      name: string;
    };
    triggers: string[];
    capabilities: string[];
    tools: Array<{
      id: string;
      name: string;
      description: string;
      category: string;
      toolType: string;
      isEnabled: boolean;
    }>;
    createdAt: Date;
    updatedAt: Date;
  }>;
  userPreferences: {
    defaultModel?: string;
    preferredTone?: string;
    automationPreferences?: any;
  };
  // Optional: Only populated when workspace scope is confirmed
  workspace?: {
    id: string;
    name: string;
    spaces: Array<{
      id: string;
      name: string;
      folders: Array<{
        id: string;
        name: string;
        lists: Array<{
          id: string;
          name: string;
          statuses: Array<{ id: string; name: string; color: string }>;
          customFields: Array<any>;
          taskCount?: number;
        }>;
      }>;
      lists: Array<{
        id: string;
        name: string;
        statuses: Array<any>;
        customFields: Array<any>;
        taskCount?: number;
      }>;
      allLists: Array<any>;
    }>;
  };
  teamMembers?: Array<{
    id: string;
    name: string;
    email: string;
    avatar?: string;
    role: string;
    taskActivity?: any;
  }>;
  recentActivity?: {
    mostActiveList?: string;
    totalTasks: number;
    commonTaskPatterns: Array<{
      type: string;
      description: string;
      confidence?: number;
    }>;
    suggestedAutomations?: Array<any>;
  };
  // Optional: Only populated when project scope is confirmed
  projectDetails?: {
    project: {
      id: string;
      name: string;
      description?: string;
    };
    teams: Array<{
      id: string;
      name: string;
      description?: string;
      role: string;
    }>;
    members: Array<{
      id: string;
      name: string;
      email: string;
      avatar?: string;
      role: string;
      title?: string;
      status: string;
    }>;
    tasks: Array<{
      id: string;
      title: string;
      description?: string;
      status?: string;
      createdAt: Date;
      updatedAt: Date;
      listId?: string;
      list?: {
        id: string;
        name: string;
      };
    }>;
    lists: Array<{
      id: string;
      name: string;
      taskCount?: number;
    }>;
  };
  // Optional: Only populated when team scope is confirmed
  teamDetails?: {
    team: {
      id: string;
      name: string;
      description?: string;
    };
    members: Array<{
      id: string;
      name: string;
      email: string;
      avatar?: string;
      role: string;
      title?: string;
      status: string;
    }>;
    tasks: Array<{
      id: string;
      title: string;
      description?: string;
      status?: string;
      createdAt: Date;
      updatedAt: Date;
      listId?: string;
      list?: {
        id: string;
        name: string;
      };
    }>;
    lists: Array<{
      id: string;
      name: string;
      taskCount?: number;
    }>;
  };
  // Optional: Only populated when space scope is confirmed
  spaceDetails?: {
    space: {
      id: string;
      name: string;
      description?: string;
    };
    lists: Array<{
      id: string;
      name: string;
      taskCount?: number;
    }>;
    folders: Array<{
      id: string;
      name: string;
      lists: Array<{
        id: string;
        name: string;
        taskCount?: number;
      }>;
    }>;
  };
}

export class AgentBuilderContextService {
  /**
   * Fetch initial user context - lists only, no detailed data
   */
  async fetchUserContext(userId: string): Promise<UserContext> {
    // Fetch lists in parallel - lightweight queries
    const [
      workspaces,
      spaces,
      projects,
      teams,
      triggers,
      tools,
      skills,
      integrations,
      agents
    ] = await Promise.all([
      this.fetchUserWorkspaces(userId),
      this.fetchUserSpaces(userId),
      this.fetchUserProjects(userId),
      this.fetchUserTeams(userId),
      this.fetchAvailableTriggers(),
      this.fetchAvailableTools(),
      this.fetchAvailableSkills(),
      this.fetchConnectedIntegrations(userId),
      this.fetchExistingAgents(userId),
    ]);

    // Triggers are already flattened by fetchAvailableTriggers
    const allTriggers = Array.isArray(triggers) ? triggers : [];

    return {
      workspaces,
      spaces: spaces.map(s => ({
        id: s.id,
        name: s.name,
        workspaceId: s.workspaceId ?? undefined,
      })),
      projects: projects.map(p => ({
        id: p.id,
        name: p.name,
        description: p.description ?? undefined,
        workspaceId: p.workspaceId ?? undefined,
        spaceId: p.spaceId ?? undefined,
      })),
      teams: teams.map(t => ({
        id: t.id,
        name: t.name,
        description: t.description ?? undefined,
        workspaceId: t.workspaceId ?? undefined,
        spaceId: t.spaceId ?? undefined,
      })),
      availableTriggers: allTriggers,
      availableTools: tools,
      availableSkills: skills,
      connectedIntegrations: integrations,
      existingAgents: agents,
      userPreferences: {
        defaultModel: undefined,
        preferredTone: undefined,
        automationPreferences: undefined,
      },
    };
  }

  /**
   * Fetch detailed workspace structure - called after user confirms workspace scope
   */
  async fetchWorkspaceDetails(workspaceId: string, userId: string): Promise<{
    workspace: UserContext['workspace'];
    teamMembers: UserContext['teamMembers'];
    recentActivity: UserContext['recentActivity'];
  }> {
    const [workspace, teamMembers, activity] = await Promise.all([
      this.fetchWorkspaceStructure(workspaceId),
      this.fetchTeamMembers(workspaceId),
      this.fetchRecentActivity(workspaceId, userId),
    ]);

    return {
      workspace,
      teamMembers,
      recentActivity: activity,
    };
  }

  /**
   * Fetch detailed project information - called after user confirms project scope
   */
  async fetchProjectDetails(projectId: string): Promise<NonNullable<UserContext['projectDetails']>> {
    const [project, projectTeams, projectMembers, projectTasks] = await Promise.all([
      prisma.project.findUnique({
        where: { id: projectId },
        select: {
          id: true,
          name: true,
          description: true,
          spaceId: true,
        },
      }),
      prisma.projectTeam.findMany({
        where: {
          projectId,
          status: 'active',
        },
        include: {
          team: {
            select: {
              id: true,
              name: true,
              description: true,
            },
          },
        },
      }),
      prisma.projectMember.findMany({
        where: {
          projectId,
          status: 'ACTIVE',
          isBlocked: false,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true,
            },
          },
        },
        take: 100, // Limit to 100 members
      }),
      prisma.task.findMany({
        where: {
          projectId,
        },
        select: {
          id: true,
          title: true,
          description: true,
          statusId: true,
          createdAt: true,
          updatedAt: true,
          listId: true,
          list: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        take: 100, // Limit to 100 most recent tasks
        orderBy: { updatedAt: 'desc' },
      }),
    ]);

    if (!project) {
      throw new Error('Project not found');
    }

    // Fetch lists from the space if project has a spaceId
    let projectLists: Array<{ id: string; name: string; taskCount?: number }> = [];
    if (project.spaceId) {
      const [spaceLists, folderLists] = await Promise.all([
        prisma.list.findMany({
          where: {
            spaceId: project.spaceId,
            folderId: null,
          },
          select: {
            id: true,
            name: true,
            _count: {
              select: {
                tasks: true,
              },
            },
          },
          take: 20, // Limit to 20 lists
        }),
        prisma.folder.findMany({
          where: {
            spaceId: project.spaceId,
          },
          include: {
            lists: {
              select: {
                id: true,
                name: true,
                _count: {
                  select: {
                    tasks: true,
                  },
                },
              },
              take: 10, // Limit to 10 lists per folder
            },
          },
          take: 5, // Limit to 5 folders
        }),
      ]);

      projectLists = [
        ...spaceLists.map(list => ({
          id: list.id,
          name: list.name,
          taskCount: list._count.tasks,
        })),
        ...folderLists.flatMap(folder =>
          folder.lists.map(list => ({
            id: list.id,
            name: list.name,
            taskCount: list._count.tasks,
          }))
        ),
      ];
    }

    return {
      project: {
        id: project.id,
        name: project.name,
        description: project.description ?? undefined,
      },
      teams: projectTeams.map(pt => ({
        id: pt.team.id,
        name: pt.team.name,
        description: pt.team.description ?? undefined,
        role: pt.role,
      })),
      members: projectMembers.map(pm => ({
        id: pm.user.id,
        name: pm.user.name || 'Unknown',
        email: pm.user.email,
        avatar: pm.user.avatar || undefined,
        role: pm.role,
        title: pm.title ?? undefined,
        status: pm.status,
      })),
      tasks: projectTasks.map(task => ({
        id: task.id,
        title: task.title,
        description: task.description ?? undefined,
        status: task.statusId ?? undefined,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt,
        listId: task.listId ?? undefined,
        list: task.list ? {
          id: task.list.id,
          name: task.list.name,
        } : undefined,
      })),
      lists: projectLists,
    };
  }

  /**
   * Fetch detailed team information - called after user confirms team scope
   */
  async fetchTeamDetails(teamId: string): Promise<NonNullable<UserContext['teamDetails']>> {
    const [team, teamMembers, teamTasks] = await Promise.all([
      prisma.team.findUnique({
        where: { id: teamId },
        select: {
          id: true,
          name: true,
          description: true,
          spaceId: true,
        },
      }),
      prisma.teamMember.findMany({
        where: {
          teamId,
          status: 'ACTIVE',
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true,
            },
          },
        },
        take: 100, // Limit to 100 members
      }),
      prisma.task.findMany({
        where: {
          teamId,
        },
        select: {
          id: true,
          title: true,
          description: true,
          statusId: true,
          createdAt: true,
          updatedAt: true,
          listId: true,
          list: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        take: 100, // Limit to 100 most recent tasks
        orderBy: { updatedAt: 'desc' },
      }),
    ]);

    if (!team) {
      throw new Error('Team not found');
    }

    // Fetch lists from the space if team has a spaceId
    let teamLists: Array<{ id: string; name: string; taskCount?: number }> = [];
    if (team.spaceId) {
      const [spaceLists, folderLists] = await Promise.all([
        prisma.list.findMany({
          where: {
            spaceId: team.spaceId,
            folderId: null,
          },
          select: {
            id: true,
            name: true,
            _count: {
              select: {
                tasks: true,
              },
            },
          },
          take: 20, // Limit to 20 lists
        }),
        prisma.folder.findMany({
          where: {
            spaceId: team.spaceId,
          },
          include: {
            lists: {
              select: {
                id: true,
                name: true,
                _count: {
                  select: {
                    tasks: true,
                  },
                },
              },
              take: 10, // Limit to 10 lists per folder
            },
          },
          take: 5, // Limit to 5 folders
        }),
      ]);

      teamLists = [
        ...spaceLists.map(list => ({
          id: list.id,
          name: list.name,
          taskCount: list._count.tasks,
        })),
        ...folderLists.flatMap(folder =>
          folder.lists.map(list => ({
            id: list.id,
            name: list.name,
            taskCount: list._count.tasks,
          }))
        ),
      ];
    }

    return {
      team: {
        id: team.id,
        name: team.name,
        description: team.description ?? undefined,
      },
      members: teamMembers.map(tm => ({
        id: tm.user.id,
        name: tm.user.name || 'Unknown',
        email: tm.user.email,
        avatar: tm.user.avatar || undefined,
        role: tm.role,
        title: tm.title ?? undefined,
        status: tm.status,
      })),
      tasks: teamTasks.map(task => ({
        id: task.id,
        title: task.title,
        description: task.description ?? undefined,
        status: task.statusId ?? undefined,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt,
        listId: task.listId ?? undefined,
        list: task.list ? {
          id: task.list.id,
          name: task.list.name,
        } : undefined,
      })),
      lists: teamLists,
    };
  }

  /**
   * Fetch detailed space information - called after user confirms space scope
   */
  async fetchSpaceDetails(spaceId: string): Promise<NonNullable<UserContext['spaceDetails']>> {
    const space = await prisma.space.findUnique({
      where: { id: spaceId },
      include: {
        folders: {
          include: {
            lists: {
              select: {
                id: true,
                name: true,
                _count: {
                  select: {
                    tasks: true,
                  },
                },
              },
            },
          },
        },
        lists: {
          select: {
            id: true,
            name: true,
            _count: {
              select: {
                tasks: true,
              },
            },
          },
        },
      },
    });

    if (!space) {
      throw new Error('Space not found');
    }

    return {
      space: {
        id: space.id,
        name: space.name,
        description: space.description ?? undefined,
      },
      lists: space.lists.map(list => ({
        id: list.id,
        name: list.name,
        taskCount: list._count.tasks,
      })),
      folders: space.folders.map(folder => ({
        id: folder.id,
        name: folder.name,
        lists: folder.lists.map(list => ({
          id: list.id,
          name: list.name,
          taskCount: list._count.tasks,
        })),
      })),
    };
  }

  /**
   * Fetch list of user's accessible workspaces
   */
  async fetchUserWorkspaces(userId: string) {
    const workspaces = await prisma.workspace.findMany({
      where: {
        OR: [
          { ownerId: userId },
          { members: { some: { userId, status: 'ACTIVE' } } }
        ],
        isActive: true,
        isArchived: false,
      },
      select: {
        id: true,
        name: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    return workspaces;
  }

  async fetchWorkspaceStructure(workspaceId: string) {
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: {
        id: true,
        name: true,
      },
    });

    if (!workspace) {
      throw new Error('Workspace not found');
    }

    // Get spaces with folders and lists (optimized - limit to most active)
    const spaces = await prisma.space.findMany({
      where: { workspaceId },
      take: 10, // Limit to 10 most recent spaces
      orderBy: { updatedAt: 'desc' },
      include: {
        folders: {
          take: 5, // Limit folders per space
          include: {
            lists: {
              take: 10, // Limit lists per folder
              select: {
                id: true,
                name: true,
                _count: {
                  select: {
                    tasks: true,
                  },
                },
              },
            },
          },
        },
        lists: {
          take: 10, // Limit lists per space
          select: {
            id: true,
            name: true,
            _count: {
              select: {
                tasks: true,
              },
            },
          },
        },
      },
    });

    const formattedSpaces = spaces.map((space) => {
      const folderLists = space.folders.flatMap((folder) =>
        folder.lists.map((list) => ({
          id: list.id,
          name: list.name,
          taskCount: list._count.tasks,
          statuses: [], // TODO: Add status fetching if needed
          customFields: [], // TODO: Add custom fields if needed
        }))
      );

      const spaceLists = space.lists.map((list) => ({
        id: list.id,
        name: list.name,
        taskCount: list._count.tasks,
        statuses: [], // TODO: Add status fetching if needed
        customFields: [], // TODO: Add custom fields if needed
      }));

      const allLists = [...folderLists, ...spaceLists];

      return {
        id: space.id,
        name: space.name,
        folders: space.folders.map((folder) => ({
          id: folder.id,
          name: folder.name,
          lists: folder.lists.map((list) => ({
            id: list.id,
            name: list.name,
            statuses: [],
            customFields: [],
            taskCount: list._count.tasks,
          })),
        })),
        lists: spaceLists,
        allLists,
      };
    });

    return {
      id: workspace.id,
      name: workspace.name,
      spaces: formattedSpaces,
    };
  }

  async fetchTeamMembers(workspaceId: string) {
    // Optimized: Only fetch active members, limit to 50
    const members = await prisma.workspaceMember.findMany({
      where: {
        workspaceId,
        status: 'ACTIVE', // Only active members
      },
      take: 50, // Limit to 50 members
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
      },
    });

    return members.map((m) => ({
      id: m.user.id,
      name: m.user.name || 'Unknown',
      email: m.user.email,
      avatar: m.user.avatar || undefined,
      role: m.role,
      taskActivity: undefined, // TODO: Add task activity if needed
    }));
  }

  async fetchAvailableTriggers() {
    const triggerGroups = getAllTriggerDefinitions();
    const allTriggers = [
      ...triggerGroups.manual,
      ...triggerGroups.scheduled,
      ...triggerGroups.automation
    ];

    return allTriggers.map(t => ({
      id: t.triggerType,
      name: t.name,
      type: t.type,
      description: t.description,
      scope: t.scope,
      triggerType: t.triggerType,
      triggerConfig: t.parameters, // Map parameters to triggerConfig if needed
      parameters: t.parameters
    }));
  }

  /**
   * Fetch available tools for AI agents
   */
  async fetchAvailableTools(): Promise<Array<{
    id: string;
    name: string;
    description: string;
    category: string;
  }>> {
    const { getAllTools } = await import('../registry/toolRegistry');
    const tools = await getAllTools();

    return tools.map(tool => ({
      id: tool.id,
      name: tool.name,
      description: tool.description,
      category: tool.category,
    }));
  }

  /**
   * Fetch available skills from the database
   */
  async fetchAvailableSkills() {
    const { getAllSkills } = await import('../registry/skillRegistry');
    const skills = await getAllSkills();

    return skills.map(skill => ({
      id: skill.id,
      name: skill.name,
      description: skill.description || '',
      tools: skill.tools
    }));
  }

  /**
   * Fetch connected integrations from the integrations table (user's workspaces)
   */
  async fetchConnectedIntegrations(userId: string): Promise<string[]> {
    const workspaces = await prisma.workspace.findMany({
      where: {
        OR: [
          { ownerId: userId },
          { members: { some: { userId, status: 'ACTIVE' } } },
        ],
        isActive: true,
      },
      select: { id: true },
    });

    const workspaceIds = workspaces.map((w) => w.id);

    const integrations = await prisma.integration.findMany({
      where: {
        isActive: true,
        OR: [
          { workspaceId: { in: workspaceIds } },
          { workspaceId: null },
        ],
      },
      select: { provider: true },
      distinct: ['provider'],
    });

    return integrations.map((i) => i.provider.toLowerCase());
  }

  async fetchRecentActivity(workspaceId: string, userId: string) {
    // Optimized: Only fetch last 7 days, limit to 100 tasks
    // Fetch tasks where user is either owner (createdBy) or assignee
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const recentTasks = await prisma.task.findMany({
      where: {
        createdAt: {
          gte: sevenDaysAgo,
        },
        OR: [
          { createdBy: userId }, // User is owner
          {
            assignees: {
              some: {
                userId: userId, // User is assignee
              },
            },
          },
        ],
      },
      take: 100, // Limit to 100 most recent tasks
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        list: {
          select: {
            id: true,
            name: true,
          },
        },
        assignees: {
          select: {
            id: true,
            userId: true,
            agentId: true,
            assigned_at: true,
            user: {
              select: {
                id: true,
                name: true,
              },
            },
            aiAgent: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    // Analyze list activity
    const listActivity = this.analyzeListActivity(recentTasks);
    const commonPatterns = this.detectCommonPatterns(recentTasks);

    return {
      mostActiveList: listActivity[0]?.listName,
      totalTasks: recentTasks.length,
      commonTaskPatterns: commonPatterns,
      suggestedAutomations: this.suggestAutomations(commonPatterns),
    };
  }

  analyzeListActivity(tasks: any[]) {
    const listCounts = new Map<string, { listName: string; count: number }>();

    tasks.forEach((task) => {
      if (task.list) {
        const existing = listCounts.get(task.list.id) || {
          listName: task.list.name,
          count: 0,
        };
        existing.count++;
        listCounts.set(task.list.id, existing);
      }
    });

    return Array.from(listCounts.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }

  detectCommonPatterns(tasks: any[]): Array<{
    type: string;
    description: string;
    confidence?: number;
  }> {
    const patterns: Array<{
      type: string;
      description: string;
      confidence?: number;
    }> = [];

    if (tasks.length === 0) return patterns;

    // Pattern: Urgent tasks (simplified - no priority field check)
    const urgentTasks = tasks.filter((t) =>
      t.title?.toLowerCase().includes('urgent')
    );
    if (urgentTasks.length > 5) {
      // Note: Priority field removed from task model, so we just detect urgent keywords
      patterns.push({
        type: 'title_to_priority',
        description: 'Tasks with "urgent" keyword are common',
        confidence: 0.7,
      });
    }

    // Pattern: Tasks need subtasks
    const tasksWithSubtasks = tasks.filter((t) => {
      // Check if task has subtasks (adjust based on your schema)
      return false; // TODO: Implement based on actual schema
    });
    if (tasksWithSubtasks.length / tasks.length > 0.6) {
      patterns.push({
        type: 'subtasks_common',
        description: 'Most tasks have subtasks',
        confidence: tasksWithSubtasks.length / tasks.length,
      });
    }

    // Pattern: Immediate assignment
    const immediateAssignments = tasks.filter((t) => {
      // Check assignees relation (users or agents)
      const hasUserAssignees = t.assignees && t.assignees.some((a: any) => a.userId);
      const hasAgentAssignees = t.assignees && t.assignees.some((a: any) => a.agent_id);
      const hasAssignees = hasUserAssignees || hasAgentAssignees;
      if (!hasAssignees) return false;
      const timeDiff = t.updatedAt
        ? new Date(t.updatedAt).getTime() - new Date(t.createdAt).getTime()
        : 0;
      return timeDiff < 60000; // Within 1 minute
    });
    if (immediateAssignments.length / tasks.length > 0.7) {
      patterns.push({
        type: 'immediate_assignment',
        description: 'Tasks usually get assigned immediately',
        confidence: immediateAssignments.length / tasks.length,
      });
    }

    return patterns;
  }

  suggestAutomations(patterns: Array<{ type: string; description: string; confidence?: number }>) {
    const suggestions: Array<any> = [];

    patterns.forEach((pattern) => {
      switch (pattern.type) {
        case 'title_to_priority':
          suggestions.push({
            type: 'auto_priority',
            description: 'Auto-prioritize tasks based on keywords',
            confidence: pattern.confidence || 0.8,
          });
          break;
        case 'subtasks_common':
          suggestions.push({
            type: 'auto_subtasks',
            description: 'Automatically create subtasks for new tasks',
            confidence: pattern.confidence || 0.7,
          });
          break;
        case 'immediate_assignment':
          suggestions.push({
            type: 'auto_assign',
            description: 'Automatically assign tasks to team members',
            confidence: pattern.confidence || 0.7,
          });
          break;
      }
    });

    return suggestions;
  }

  async fetchExistingAgents(userId: string) {
    // Fetch agents owned by user or shared, include active and inactive for reference
    const agents = await prisma.aiAgent.findMany({
      where: {
        OR: [{ createdBy: userId }, { isShared: true }],
        isArchived: false, // Exclude archived agents
      },
      select: {
        id: true,
        name: true,
        description: true,
        agentType: true,
        status: true,
        isActive: true,
        isShared: true,
        workspaceId: true,
        spaceId: true,
        projectId: true,
        teamId: true,
        capabilities: true,
        createdAt: true,
        updatedAt: true,
        workspace: {
          select: {
            id: true,
            name: true,
          },
        },
        space: {
          select: {
            id: true,
            name: true,
          },
        },
        project: {
          select: {
            id: true,
            name: true,
          },
        },
        team: {
          select: {
            id: true,
            name: true,
          },
        },
        triggers: {
          select: {
            triggerType: true,
          },
        },
        tools: {
          select: {
            id: true,
            name: true,
            description: true,
            category: true,
            toolType: true,
            isEnabled: true,
          },
          where: {
            isActive: true,
          },
          orderBy: { name: 'asc' },
        },
      },
      take: 20, // Increased limit to show more agents
      orderBy: { updatedAt: 'desc' },
    });

    return agents.map((agent) => ({
      id: agent.id,
      name: agent.name,
      description: agent.description ?? undefined,
      agentType: String(agent.agentType),
      status: String(agent.status),
      isActive: agent.isActive,
      isShared: agent.isShared,
      workspaceId: agent.workspaceId ?? undefined,
      spaceId: agent.spaceId ?? undefined,
      projectId: agent.projectId ?? undefined,
      teamId: agent.teamId ?? undefined,
      workspace: agent.workspace ? {
        id: agent.workspace.id,
        name: agent.workspace.name,
      } : undefined,
      space: agent.space ? {
        id: agent.space.id,
        name: agent.space.name,
      } : undefined,
      project: agent.project ? {
        id: agent.project.id,
        name: agent.project.name,
      } : undefined,
      team: agent.team ? {
        id: agent.team.id,
        name: agent.team.name,
      } : undefined,
      triggers: agent.triggers.map((trigger) => trigger.triggerType),
      capabilities: agent.capabilities,
      tools: agent.tools.map((tool) => ({
        id: tool.id,
        name: tool.name,
        description: tool.description,
        category: tool.category,
        toolType: String(tool.toolType),
        isEnabled: tool.isEnabled,
      })),
      createdAt: agent.createdAt,
      updatedAt: agent.updatedAt,
    }));
  }

  async fetchUserProjects(userId: string) {
    // Fetch projects where user is owner OR member
    const projects = await prisma.project.findMany({
      where: {
        OR: [
          { ownerId: userId }, // User is owner
          {
            members: {
              some: {
                userId,
                status: 'ACTIVE',
                isBlocked: false,
              },
            },
          },
        ],
        isActive: true, // Only active projects
      },
      select: {
        id: true,
        name: true,
        description: true,
        workspaceId: true,
        spaceId: true,
      },
      take: 20, // Limit to 20 most recent
      orderBy: { updatedAt: 'desc' },
    });

    return projects;
  }

  async fetchUserTeams(userId: string) {
    // Fetch teams where user is owner OR member
    const teams = await prisma.team.findMany({
      where: {
        OR: [
          { ownerId: userId }, // User is owner
          {
            members: {
              some: {
                userId,
                status: 'ACTIVE',
              },
            },
          },
        ],
        isActive: true, // Only active teams
      },
      select: {
        id: true,
        name: true,
        description: true,
        workspaceId: true,
        spaceId: true,
      },
      take: 20, // Limit to 20 most recent
      orderBy: { updatedAt: 'desc' },
    });

    return teams;
  }

  /**
   * Fetch list of user's accessible spaces
   */
  async fetchUserSpaces(userId: string) {
    const spaces = await prisma.space.findMany({
      where: {
        OR: [
          { createdBy: userId }, // User is creator
          {
            members: {
              some: {
                userId,
              },
            },
          },
          {
            workspace: {
              OR: [
                { ownerId: userId },
                { members: { some: { userId, status: 'ACTIVE' } } }
              ],
            },
          },
        ],
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        workspaceId: true,
      },
      take: 20, // Limit to 20 most recent
      orderBy: { updatedAt: 'desc' },
    });

    return spaces;
  }
}

export const agentBuilderContextService = new AgentBuilderContextService();
