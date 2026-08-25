import 'server-only';
import type { RewardEntry } from '@/domain/reward/types';
import type { DemandId, UserId } from '@/domain/shared/ids';
import type { RewardRepository } from '../types';
import { getUserClient, throwOnError } from './client';
import { toRewardEntry } from './mappers';

/**
 * 토큰 원장 (Supabase).
 *
 * `reward_ledgers` 는 마이그레이션 0009 에서 트리거로 수정·삭제가 막혀 있다.
 * 여기서도 insert 만 노출한다.
 *
 * ⚠️ 이 구현은 실제 Supabase 프로젝트에 연결해 검증한 적이 없다.
 */
export function createSupabaseRewardRepository(): RewardRepository {
  return {
    async listByUser(userId: UserId): Promise<RewardEntry[]> {
      const supabase = await getUserClient();
      const { data, error } = await supabase
        .from('reward_ledgers')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });
      throwOnError(error, '토큰 기록 조회');
      return (data ?? []).map(toRewardEntry);
    },

    async findAwardForDemand(demandId: DemandId): Promise<RewardEntry | null> {
      const supabase = await getUserClient();
      const { data, error } = await supabase
        .from('reward_ledgers')
        .select('*')
        .eq('kind', 'AWARD')
        .eq('demand_id', demandId)
        .maybeSingle();
      throwOnError(error, '수여 기록 조회');
      return data ? toRewardEntry(data) : null;
    },

    async insert(entry: RewardEntry): Promise<RewardEntry> {
      const supabase = await getUserClient();
      const { data, error } = await supabase
        .from('reward_ledgers')
        .insert({
          id: entry.id,
          campus_id: entry.campusId,
          user_id: entry.userId,
          kind: entry.kind,
          amount: entry.amount,
          demand_id: entry.demandId,
          tool_id: entry.toolId,
          awarded_by: entry.awardedBy,
          note: entry.note,
          created_at: entry.createdAt,
        })
        .select('*')
        .single();
      // 한 수요에 한 번만 수여한다. 부분 유니크 인덱스가 두 번째를 막는다.
      throwOnError(error, '토큰 지급');
      return toRewardEntry(data);
    },
  };
}
