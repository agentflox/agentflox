import { supabaseAdmin } from '@/lib/supabase';

export interface CreateActivityLogParams {
  userId?: string;
  actorType?: 'USER' | 'SYSTEM' | 'BOT' | 'ADMIN';
  action: string;
  category: string;
  severity?: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
  entityType?: string;
  entityId?: string;
  projectId?: string;
  teamId?: string;
  proposalId?: string;
  title: string;
  description?: string;
  metadata?: Record<string, any>;
  oldValue?: Record<string, any>;
  newValue?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  visibility?: 'PUBLIC' | 'TEAM' | 'ADMIN' | 'PRIVATE';
}

export class ActivityLogService {
  static async createLog(params: CreateActivityLogParams) {
    try {
      const { data: log, error } = await supabaseAdmin
        .from('activity_logs')
        .insert({
          user_id: params.userId,
          actor_type: params.actorType || 'USER',
          action: params.action,
          category: params.category,
          severity: params.severity || 'INFO',
          entity_type: params.entityType,
          entity_id: params.entityId,
          project_id: params.projectId,
          team_id: params.teamId,
          proposal_id: params.proposalId,
          title: params.title,
          description: params.description,
          metadata: params.metadata,
          old_value: params.oldValue,
          new_value: params.newValue,
          ip_address: params.ipAddress,
          user_agent: params.userAgent,
          visibility: params.visibility || 'PRIVATE',
        })
        .select()
        .single();

      if (error) throw error;

      return log;
    } catch (error) {
      console.error('Error creating activity log:', error);
      throw error;
    }
  }

  static async logUserAction(
    userId: string,
    action: string,
    details: Partial<CreateActivityLogParams>
  ) {
    return this.createLog({
      userId,
      action,
      category: 'USER',
      actorType: 'USER',
      title: details.title || action,
      ...details,
    });
  }

  static async logProjectAction(
    projectId: string,
    action: string,
    details: Partial<CreateActivityLogParams>
  ) {
    return this.createLog({
      projectId,
      action,
      category: 'PROJECT',
      entityType: 'project',
      entityId: projectId,
      title: details.title || action,
      ...details,
    });
  }

  static async logTeamAction(
    teamId: string,
    action: string,
    details: Partial<CreateActivityLogParams>
  ) {
    return this.createLog({
      teamId,
      action,
      category: 'TEAM',
      entityType: 'team',
      entityId: teamId,
      title: details.title || action,
      ...details,
    });
  }

  static async logSystemEvent(
    action: string,
    details: Partial<CreateActivityLogParams>
  ) {
    return this.createLog({
      actorType: 'SYSTEM',
      action,
      category: 'SYSTEM',
      severity: details.severity || 'INFO',
      title: details.title || action,
      ...details,
    });
  }
}