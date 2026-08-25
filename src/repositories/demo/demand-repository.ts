import 'server-only';
import type {
  AutomationDemand,
  DemandMatch,
  DemandParticipant,
  DemandStatus,
} from '@/domain/demand/types';
import { DEMAND_STATUSES } from '@/domain/demand/types';
import type { CampusId, DemandId, ToolId } from '@/domain/shared/ids';
import type { Page, PageRequest } from '@/domain/shared/pagination';
import { paginate } from '@/domain/shared/pagination';
import type { DemandQueryFilters, DemandRepository } from '../types';
import { clone, loadDb, mutateDb } from './store';

function matchesKeyword(demand: AutomationDemand, keyword: string): boolean {
  const tokens = keyword.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return true;
  const target = [
    demand.title,
    demand.currentWorkDescription,
    demand.mostPainfulStep,
    demand.desiredOutcome,
    demand.requiredFeatures.join(' '),
  ]
    .join(' ')
    .toLowerCase();
  return tokens.every((token) => target.includes(token));
}

export function createDemoDemandRepository(): DemandRepository {
  return {
    async listDemands(
      filters: DemandQueryFilters,
      page: PageRequest,
    ): Promise<Page<AutomationDemand>> {
      const db = await loadDb();
      const filtered = db.demands
        .filter((demand) => {
          if (demand.campusId !== filters.campusId) return false;
          if (demand.deletedAt !== null) return false;
          if (filters.statuses?.length && !filters.statuses.includes(demand.status)) return false;
          if (filters.requesterUserId && demand.requesterUserId !== filters.requesterUserId) {
            return false;
          }
          if (filters.keyword && !matchesKeyword(demand, filters.keyword)) return false;
          return true;
        })
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

      return clone(paginate(filtered, page));
    },

    async countByStatus(campusId: CampusId): Promise<Record<DemandStatus, number>> {
      const db = await loadDb();
      const counts = Object.fromEntries(DEMAND_STATUSES.map((status) => [status, 0])) as Record<
        DemandStatus,
        number
      >;
      for (const demand of db.demands) {
        if (demand.campusId !== campusId || demand.deletedAt !== null) continue;
        counts[demand.status] += 1;
      }
      return counts;
    },

    async getDemand(id: DemandId): Promise<AutomationDemand | null> {
      const db = await loadDb();
      return clone(db.demands.find((demand) => demand.id === id) ?? null);
    },

    async insertDemand(demand: AutomationDemand): Promise<AutomationDemand> {
      return mutateDb((db) => {
        db.demands.push(clone(demand));
        return clone(demand);
      });
    },

    async updateDemand(demand: AutomationDemand): Promise<AutomationDemand> {
      return mutateDb((db) => {
        const index = db.demands.findIndex((row) => row.id === demand.id);
        if (index < 0) throw new Error(`수요를 찾을 수 없습니다: ${demand.id}`);
        db.demands[index] = clone(demand);
        return clone(demand);
      });
    },

    async listMatches(demandId: DemandId): Promise<DemandMatch[]> {
      const db = await loadDb();
      return clone(
        db.demandMatches
          .filter((match) => match.demandId === demandId)
          .sort((a, b) => b.matchedAt.localeCompare(a.matchedAt)),
      );
    },

    async listMatchesForTool(toolId: ToolId): Promise<DemandMatch[]> {
      const db = await loadDb();
      return clone(db.demandMatches.filter((match) => match.toolId === toolId));
    },

    async insertMatch(match: DemandMatch): Promise<DemandMatch> {
      return mutateDb((db) => {
        db.demandMatches.push(clone(match));
        return clone(match);
      });
    },

    async deleteMatch(id: string): Promise<void> {
      await mutateDb((db) => {
        db.demandMatches = db.demandMatches.filter((match) => match.id !== id);
      });
    },

    async listParticipants(demandId: DemandId): Promise<DemandParticipant[]> {
      const db = await loadDb();
      return clone(
        db.demandParticipants
          .filter((participant) => participant.demandId === demandId)
          .sort((a, b) => a.joinedAt.localeCompare(b.joinedAt)),
      );
    },

    async insertParticipant(participant: DemandParticipant): Promise<DemandParticipant> {
      return mutateDb((db) => {
        db.demandParticipants.push(clone(participant));
        return clone(participant);
      });
    },
  };
}
