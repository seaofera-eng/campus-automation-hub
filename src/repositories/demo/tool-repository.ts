import 'server-only';
import type { CampusId, ToolId, ToolVersionId } from '@/domain/shared/ids';
import type { Page, PageRequest } from '@/domain/shared/pagination';
import { paginate } from '@/domain/shared/pagination';
import type {
  AutomationTool,
  AutomationToolVersion,
  ToolAttachment,
  ToolStatus,
  ToolStatusHistoryEntry,
} from '@/domain/tool/types';
import { TOOL_STATUSES } from '@/domain/tool/types';
import type { ToolQueryFilters, ToolRepository, ToolSortKey } from '../types';
import { clone, loadDb, mutateDb } from './store';
import type { DemoDatabase } from './store';

/** 한국어 검색: 공백으로 나눈 모든 토큰이 포함되어야 한다. */
function matchesKeyword(haystack: string, keyword: string): boolean {
  const tokens = keyword.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return true;
  const target = haystack.toLowerCase();
  return tokens.every((token) => target.includes(token));
}

function searchableText(
  tool: AutomationTool,
  version: AutomationToolVersion | undefined,
): string {
  return [
    tool.name,
    tool.summary,
    tool.tags.join(' '),
    version?.description ?? '',
    version?.problemStatement ?? '',
    version?.keyFeatures.join(' ') ?? '',
  ].join(' ');
}

function applyFilters(db: DemoDatabase, filters: ToolQueryFilters): AutomationTool[] {
  const versionById = new Map(db.toolVersions.map((version) => [version.id, version]));

  return db.tools.filter((tool) => {
    if (tool.campusId !== filters.campusId) return false;
    if (!filters.includeDeleted && tool.deletedAt !== null) return false;

    if (filters.statuses?.length && !filters.statuses.includes(tool.status)) return false;
    if (filters.categoryIds?.length && !filters.categoryIds.includes(tool.categoryId)) return false;
    if (filters.departmentIds?.length && !filters.departmentIds.includes(tool.departmentId)) {
      return false;
    }

    if (filters.involvingUserId) {
      const involved =
        tool.ownerUserId === filters.involvingUserId ||
        tool.developerUserIds.includes(filters.involvingUserId) ||
        tool.createdBy === filters.involvingUserId;
      if (!involved) return false;
    }

    if (filters.dataClassifications?.length) {
      const version = versionById.get(tool.currentVersionId);
      const used = new Set(
        version?.security.classifications.filter((entry) => entry.inUse).map((e) => e.classification) ??
          [],
      );
      const hasAny = filters.dataClassifications.some((classification) => used.has(classification));
      if (!hasAny) return false;
    }

    if (filters.keyword) {
      const version = versionById.get(tool.currentVersionId);
      if (!matchesKeyword(searchableText(tool, version), filters.keyword)) return false;
    }

    return true;
  });
}

/** 상태 정렬 순서 — 검토가 필요한 것을 앞으로 */
const STATUS_ORDER: Record<ToolStatus, number> = {
  SUBMITTED: 0,
  HUMAN_REVIEW: 1,
  AI_REVIEW: 2,
  REVISION_REQUIRED: 3,
  PILOT: 4,
  APPROVED: 5,
  DRAFT: 6,
  SUSPENDED: 7,
  RETIRED: 8,
};

function sortTools(
  tools: AutomationTool[],
  sort: ToolSortKey,
  evaluationAverages: Map<string, number>,
): AutomationTool[] {
  const sorted = [...tools];
  switch (sort) {
    case 'NAME':
      sorted.sort((a, b) => a.name.localeCompare(b.name, 'ko'));
      break;
    case 'STATUS':
      sorted.sort(
        (a, b) =>
          STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || a.name.localeCompare(b.name, 'ko'),
      );
      break;
    case 'EVALUATION':
      sorted.sort((a, b) => {
        const scoreA = evaluationAverages.get(a.id) ?? -1;
        const scoreB = evaluationAverages.get(b.id) ?? -1;
        return scoreB - scoreA || a.name.localeCompare(b.name, 'ko');
      });
      break;
    case 'RECENT':
    default:
      sorted.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
      break;
  }
  return sorted;
}

export function createDemoToolRepository(): ToolRepository {
  return {
    async listTools(
      filters: ToolQueryFilters,
      sort: ToolSortKey,
      page: PageRequest,
    ): Promise<Page<AutomationTool>> {
      const db = await loadDb();
      const filtered = applyFilters(db, filters);

      const averages = new Map<string, number>();
      if (sort === 'EVALUATION') {
        for (const tool of filtered) {
          const scores = db.evaluations
            .filter((row) => row.toolId === tool.id && row.deletedAt === null)
            .map((row) => row.scores.overall);
          if (scores.length > 0) {
            averages.set(tool.id, scores.reduce((sum, s) => sum + s, 0) / scores.length);
          }
        }
      }

      return clone(paginate(sortTools(filtered, sort, averages), page));
    },

    async countByStatus(campusId: CampusId): Promise<Record<ToolStatus, number>> {
      const db = await loadDb();
      const counts = Object.fromEntries(TOOL_STATUSES.map((status) => [status, 0])) as Record<
        ToolStatus,
        number
      >;
      for (const tool of db.tools) {
        if (tool.campusId !== campusId || tool.deletedAt !== null) continue;
        counts[tool.status] += 1;
      }
      return counts;
    },

    async getTool(id: ToolId): Promise<AutomationTool | null> {
      const db = await loadDb();
      return clone(db.tools.find((tool) => tool.id === id) ?? null);
    },

    async getToolByName(campusId: CampusId, name: string): Promise<AutomationTool | null> {
      const db = await loadDb();
      const normalized = name.trim().toLowerCase();
      return clone(
        db.tools.find(
          (tool) =>
            tool.campusId === campusId &&
            tool.deletedAt === null &&
            tool.name.trim().toLowerCase() === normalized,
        ) ?? null,
      );
    },

    async insertTool(tool: AutomationTool): Promise<AutomationTool> {
      return mutateDb((db) => {
        db.tools.push(clone(tool));
        return clone(tool);
      });
    },

    async updateTool(tool: AutomationTool): Promise<AutomationTool> {
      return mutateDb((db) => {
        const index = db.tools.findIndex((row) => row.id === tool.id);
        if (index < 0) throw new Error(`도구를 찾을 수 없습니다: ${tool.id}`);
        db.tools[index] = clone(tool);
        return clone(tool);
      });
    },

    async getVersion(id: ToolVersionId): Promise<AutomationToolVersion | null> {
      const db = await loadDb();
      return clone(db.toolVersions.find((version) => version.id === id) ?? null);
    },

    async listVersions(toolId: ToolId): Promise<AutomationToolVersion[]> {
      const db = await loadDb();
      return clone(
        db.toolVersions
          .filter((version) => version.toolId === toolId && version.deletedAt === null)
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      );
    },

    async insertVersion(version: AutomationToolVersion): Promise<AutomationToolVersion> {
      return mutateDb((db) => {
        db.toolVersions.push(clone(version));
        return clone(version);
      });
    },

    async updateVersion(version: AutomationToolVersion): Promise<AutomationToolVersion> {
      return mutateDb((db) => {
        const index = db.toolVersions.findIndex((row) => row.id === version.id);
        if (index < 0) throw new Error(`도구 버전을 찾을 수 없습니다: ${version.id}`);
        db.toolVersions[index] = clone(version);
        return clone(version);
      });
    },

    async listStatusHistory(toolId: ToolId): Promise<ToolStatusHistoryEntry[]> {
      const db = await loadDb();
      return clone(
        db.toolStatusHistory
          .filter((entry) => entry.toolId === toolId)
          .sort((a, b) => b.changedAt.localeCompare(a.changedAt)),
      );
    },

    async insertStatusHistory(entry: ToolStatusHistoryEntry): Promise<ToolStatusHistoryEntry> {
      return mutateDb((db) => {
        db.toolStatusHistory.push(clone(entry));
        return clone(entry);
      });
    },

    async listAttachments(toolVersionId: ToolVersionId): Promise<ToolAttachment[]> {
      const db = await loadDb();
      return clone(
        db.toolAttachments
          .filter((attachment) => attachment.toolVersionId === toolVersionId)
          .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
      );
    },

    async insertAttachment(attachment: ToolAttachment): Promise<ToolAttachment> {
      return mutateDb((db) => {
        db.toolAttachments.push(clone(attachment));
        return clone(attachment);
      });
    },

    async deleteAttachment(id: string): Promise<void> {
      await mutateDb((db) => {
        db.toolAttachments = db.toolAttachments.filter((attachment) => attachment.id !== id);
      });
    },
  };
}
