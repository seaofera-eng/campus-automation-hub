import 'server-only';
import { assertSupabaseConfigured } from '@/lib/config/env';
import type { Repositories } from '../types';
import { createSupabaseAnalysisRepository } from './analysis-repository';
import { createSupabaseDemandRepository } from './demand-repository';
import {
  createSupabaseEvaluationRepository,
  createSupabaseImprovementRepository,
} from './feedback-repository';
import { createSupabaseFileStorage } from './file-storage';
import {
  createSupabaseIdentityRepository,
  createSupabaseReferenceRepository,
} from './identity-repository';
import { createSupabaseNoticeRepository } from './notice-repository';
import { createSupabaseObservabilityRepository } from './observability-repository';
import { createSupabaseRewardRepository } from './reward-repository';
import { createSupabaseReviewRepository } from './review-repository';
import { createSupabaseToolRepository } from './tool-repository';

/**
 * Supabase 저장소 조립.
 *
 * ⚠️ 이 구현은 **실제 Supabase 프로젝트에 연결해 검증한 적이 없다.**
 * SQL 마이그레이션(`supabase/migrations/`)도 적용된 적이 없다.
 * 처음 연결할 때는 `docs/SETUP.md` 의 절차와 `docs/SECURITY.md` 의
 * RLS 검증 체크리스트를 반드시 함께 수행해야 한다.
 */
export function createSupabaseRepositories(): Repositories {
  // 환경변수가 비어 있으면 런타임 깊은 곳에서 알 수 없는 오류로 터지는 대신
  // 조립 시점에 무엇이 빠졌는지 알려 준다.
  assertSupabaseConfigured();

  return {
    identity: createSupabaseIdentityRepository(),
    tools: createSupabaseToolRepository(),
    reference: createSupabaseReferenceRepository(),
    reviews: createSupabaseReviewRepository(),
    demands: createSupabaseDemandRepository(),
    evaluations: createSupabaseEvaluationRepository(),
    improvements: createSupabaseImprovementRepository(),
    observability: createSupabaseObservabilityRepository(),
    analyses: createSupabaseAnalysisRepository(),
    rewards: createSupabaseRewardRepository(),
    notices: createSupabaseNoticeRepository(),
    files: createSupabaseFileStorage(),
  };
}
