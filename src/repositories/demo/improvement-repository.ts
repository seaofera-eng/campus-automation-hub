import 'server-only';
import type {
  ImprovementRequest,
  ImprovementRequestHistoryEntry,
  ImprovementStatus,
} from '@/domain/improvement/types';
import { IMPROVEMENT_STATUSES } from '@/domain/improvement/types';
import type { CampusId, ImprovementRequestId, ToolId } from '@/domain/shared/ids';
import type { Page, PageRequest } from '@/domain/shared/pagination';
import { paginate } from '@/domain/shared/pagination';
import type { ImprovementQueryFilters, ImprovementRepository } from '../types';
import { clone, loadDb, mutateDb } from './store';

function matchesKeyword(request: ImprovementRequest, keyword: string): boolean {
  const tokens = keyword.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return true;
  const target = `${request.title} ${request.detail}`.toLowerCase();
  return tokens.every((token) => target.includes(token));
}

/** 처리 중인 것을 앞에, 종료된 것을 뒤에 */
const STATUS_ORDER: Record<ImprovementStatus, number> = {
  OPEN: 0,
  REVIEWING: 1,
  ACCEPTED: 2,
  IN_PROGRESS: 3,
  RELEASED: 4,
  REJECTED: 5,
  CLOSED: 6,
};

export function createDemoImprovementRepository(): ImprovementRepository {
  return {
    async list(
      filters: ImprovementQueryFilters,
      page: PageRequest,
    ): Promise<Page<ImprovementRequest>> {
      const db = await loadDb();
      const filtered = db.improvementRequests
        .filter((request) => {
          if (request.campusId !== filters.campusId) return false;
          if (request.deletedAt !== null) return false;
          if (filters.statuses?.length && !filters.statuses.includes(request.status)) return false;
          if (filters.toolId && request.toolId !== filters.toolId) return false;
          if (
            filters.assigneeUserId &&
            request.assignedDeveloperUserId !== filters.assigneeUserId
          ) {
            return false;
          }
          if (filters.requesterUserId && request.requesterUserId !== filters.requesterUserId) {
            return false;
          }
          if (filters.keyword && !matchesKeyword(request, filters.keyword)) return false;
          return true;
        })
        .sort(
          (a, b) =>
            STATUS_ORDER[a.status] - STATUS_ORDER[b.status] ||
            b.createdAt.localeCompare(a.createdAt),
        );

      return clone(paginate(filtered, page));
    },

    async listByTool(toolId: ToolId): Promise<ImprovementRequest[]> {
      const db = await loadDb();
      return clone(
        db.improvementRequests
          .filter((request) => request.toolId === toolId && request.deletedAt === null)
          .sort(
            (a, b) =>
              STATUS_ORDER[a.status] - STATUS_ORDER[b.status] ||
              b.createdAt.localeCompare(a.createdAt),
          ),
      );
    },

    async countByStatus(campusId: CampusId): Promise<Record<ImprovementStatus, number>> {
      const db = await loadDb();
      const counts = Object.fromEntries(
        IMPROVEMENT_STATUSES.map((status) => [status, 0]),
      ) as Record<ImprovementStatus, number>;
      for (const request of db.improvementRequests) {
        if (request.campusId !== campusId || request.deletedAt !== null) continue;
        counts[request.status] += 1;
      }
      return counts;
    },

    async getById(id: ImprovementRequestId): Promise<ImprovementRequest | null> {
      const db = await loadDb();
      return clone(db.improvementRequests.find((request) => request.id === id) ?? null);
    },

    async insert(request: ImprovementRequest): Promise<ImprovementRequest> {
      return mutateDb((db) => {
        db.improvementRequests.push(clone(request));
        return clone(request);
      });
    },

    async update(request: ImprovementRequest): Promise<ImprovementRequest> {
      return mutateDb((db) => {
        const index = db.improvementRequests.findIndex((row) => row.id === request.id);
        if (index < 0) throw new Error(`개선 요청을 찾을 수 없습니다: ${request.id}`);
        db.improvementRequests[index] = clone(request);
        return clone(request);
      });
    },

    async listHistory(id: ImprovementRequestId): Promise<ImprovementRequestHistoryEntry[]> {
      const db = await loadDb();
      return clone(
        db.improvementRequestHistory
          .filter((entry) => entry.improvementRequestId === id)
          .sort((a, b) => b.changedAt.localeCompare(a.changedAt)),
      );
    },

    async insertHistory(
      entry: ImprovementRequestHistoryEntry,
    ): Promise<ImprovementRequestHistoryEntry> {
      return mutateDb((db) => {
        db.improvementRequestHistory.push(clone(entry));
        return clone(entry);
      });
    },
  };
}
