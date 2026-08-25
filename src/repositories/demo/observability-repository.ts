import 'server-only';
import { DEMAND_STATUS_LABELS } from '@/domain/demand/types';
import { IMPROVEMENT_STATUS_LABELS } from '@/domain/improvement/types';
import type { ActivityEntry, AuditLog, Notification, UsageEvent } from '@/domain/observability/types';
import type { CampusId, ToolId, UserId } from '@/domain/shared/ids';
import type { Page, PageRequest } from '@/domain/shared/pagination';
import { paginate } from '@/domain/shared/pagination';
import { TOOL_STATUS_LABELS } from '@/domain/tool/types';
import type { AuditLogFilters, ObservabilityRepository } from '../types';
import { clone, loadDb, mutateDb } from './store';
import type { DemoDatabase } from './store';
import { josa } from '@/domain/shared/josa';

function buildActivity(db: DemoDatabase, campusId: CampusId, limit: number): ActivityEntry[] {
  const nameById = new Map(db.profiles.map((profile) => [profile.id, profile.name]));
  const toolById = new Map(db.tools.map((tool) => [tool.id, tool]));
  const entries: ActivityEntry[] = [];

  for (const history of db.toolStatusHistory) {
    const tool = toolById.get(history.toolId);
    if (!tool || tool.campusId !== campusId) continue;
    const from = history.fromStatus ? TOOL_STATUS_LABELS[history.fromStatus] : '신규';
    entries.push({
      id: `status-${history.id}`,
      occurredAt: history.changedAt,
      description: `'${tool.name}' 상태가 ${from} → ${TOOL_STATUS_LABELS[history.toStatus]}(으)로 변경되었습니다.`,
      actorName: nameById.get(history.changedBy) ?? '알 수 없음',
      linkPath: `/tools/${tool.id}`,
      kind: 'TOOL_STATUS',
    });
  }

  for (const demand of db.demands) {
    if (demand.campusId !== campusId || demand.deletedAt !== null) continue;
    entries.push({
      id: `demand-${demand.id}`,
      occurredAt: demand.updatedAt,
      description: `수요 '${demand.title}'${josa(demand.title, '이가')} ${DEMAND_STATUS_LABELS[demand.status]} 상태입니다.`,
      actorName: nameById.get(demand.requesterUserId) ?? '알 수 없음',
      linkPath: `/demands/${demand.id}`,
      kind: 'DEMAND',
    });
  }

  for (const evaluation of db.evaluations) {
    if (evaluation.campusId !== campusId || evaluation.deletedAt !== null) continue;
    const tool = toolById.get(evaluation.toolId);
    entries.push({
      id: `evaluation-${evaluation.id}`,
      occurredAt: evaluation.createdAt,
      description: `'${tool?.name ?? '도구'}'에 종합 ${evaluation.scores.overall}점 평가가 등록되었습니다.`,
      actorName: nameById.get(evaluation.evaluatorUserId) ?? '알 수 없음',
      linkPath: tool ? `/tools/${tool.id}` : null,
      kind: 'EVALUATION',
    });
  }

  for (const request of db.improvementRequests) {
    if (request.campusId !== campusId || request.deletedAt !== null) continue;
    entries.push({
      id: `improvement-${request.id}`,
      occurredAt: request.updatedAt,
      description: `개선 요청 '${request.title}'${josa(request.title, '이가')} ${IMPROVEMENT_STATUS_LABELS[request.status]} 상태입니다.`,
      actorName: nameById.get(request.requesterUserId) ?? '알 수 없음',
      linkPath: `/improvements/${request.id}`,
      kind: 'IMPROVEMENT',
    });
  }

  return entries.sort((a, b) => b.occurredAt.localeCompare(a.occurredAt)).slice(0, limit);
}

export function createDemoObservabilityRepository(): ObservabilityRepository {
  return {
    async insertAuditLog(log: AuditLog): Promise<AuditLog> {
      return mutateDb((db) => {
        db.auditLogs.push(clone(log));
        return clone(log);
      });
    },

    async listAuditLogs(filters: AuditLogFilters, page: PageRequest): Promise<Page<AuditLog>> {
      const db = await loadDb();
      const filtered = db.auditLogs
        .filter((log) => {
          if (log.campusId !== filters.campusId) return false;
          if (filters.action && !log.action.includes(filters.action)) return false;
          if (filters.actorUserId && log.actorUserId !== filters.actorUserId) return false;
          if (filters.targetType && log.targetType !== filters.targetType) return false;
          if (filters.from && log.createdAt < filters.from) return false;
          if (filters.to && log.createdAt > filters.to) return false;
          return true;
        })
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

      return clone(paginate(filtered, page));
    },

    async insertUsageEvent(event: UsageEvent): Promise<void> {
      await mutateDb((db) => {
        db.usageEvents.push(clone(event));
      });
    },

    async countUsageByTool(toolId: ToolId): Promise<{ views: number; launches: number }> {
      const db = await loadDb();
      let views = 0;
      let launches = 0;
      for (const event of db.usageEvents) {
        if (event.toolId !== toolId) continue;
        if (event.eventType === 'VIEW') views += 1;
        else launches += 1;
      }
      return { views, launches };
    },

    async listNotifications(userId: UserId, onlyUnread: boolean): Promise<Notification[]> {
      const db = await loadDb();
      return clone(
        db.notifications
          .filter(
            (notification) =>
              notification.recipientUserId === userId &&
              (!onlyUnread || notification.readAt === null),
          )
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
          .slice(0, 50),
      );
    },

    async insertNotification(notification: Notification): Promise<Notification> {
      return mutateDb((db) => {
        db.notifications.push(clone(notification));
        return clone(notification);
      });
    },

    async markNotificationRead(id: string, at: string): Promise<void> {
      await mutateDb((db) => {
        const notification = db.notifications.find((row) => row.id === id);
        if (notification) notification.readAt = at;
      });
    },

    async markAllNotificationsRead(userId: UserId, at: string): Promise<void> {
      await mutateDb((db) => {
        for (const notification of db.notifications) {
          if (notification.recipientUserId === userId && notification.readAt === null) {
            notification.readAt = at;
          }
        }
      });
    },

    async listRecentActivity(campusId: CampusId, limit: number): Promise<ActivityEntry[]> {
      const db = await loadDb();
      return clone(buildActivity(db, campusId, limit));
    },
  };
}
