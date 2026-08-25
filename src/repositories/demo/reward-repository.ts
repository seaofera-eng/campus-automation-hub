import 'server-only';
import type { DemandId, UserId } from '@/domain/shared/ids';
import type { RewardEntry } from '@/domain/reward/types';
import type { RewardRepository } from '../types';
import { clone, loadDb, mutateDb } from './store';

/**
 * 토큰 원장 (DEMO).
 *
 * **더하기만 한다.** 수정·삭제 메서드를 두지 않는다.
 * 잔액을 따로 저장하지도 않는다 — 기록을 더해서 내야 "왜 이 숫자가 됐는지"를
 * 언제든 되짚을 수 있다. Supabase 쪽은 트리거로 같은 규칙을 DB 차원에서 건다.
 */
export function createRewardRepository(): RewardRepository {
  return {
    async listByUser(userId: UserId): Promise<RewardEntry[]> {
      const db = await loadDb();
      return clone(
        db.rewardEntries
          .filter((entry) => entry.userId === userId)
          .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
      );
    },

    async findAwardForDemand(demandId: DemandId): Promise<RewardEntry | null> {
      const db = await loadDb();
      const found = db.rewardEntries.find(
        (entry) => entry.kind === 'AWARD' && entry.demandId === demandId,
      );
      return found ? clone(found) : null;
    },

    async insert(entry: RewardEntry): Promise<RewardEntry> {
      return mutateDb((db) => {
        // 저장 직전에 한 번 더 확인한다. 서비스 계층의 사전 확인과 이 검사 사이에
        // 다른 요청이 끼어들 수 있다. (평가 중복 방지와 같은 방식)
        if (entry.kind === 'AWARD' && entry.demandId !== null) {
          const exists = db.rewardEntries.some(
            (row) => row.kind === 'AWARD' && row.demandId === entry.demandId,
          );
          if (exists) {
            throw new Error('DUPLICATE_AWARD');
          }
        }
        db.rewardEntries.push(clone(entry));
        return clone(entry);
      });
    },
  };
}
