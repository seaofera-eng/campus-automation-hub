import type {
  DemandAnalysis,
  DuplicateAnalysis,
  QualityReview,
  RiskAnalysis,
} from '@/domain/analysis/types';

/**
 * 미리 돌려 둔 AI 분석 결과.
 *
 * ## 왜 파일에 넣어 두는가
 *
 * 시연 자리에서 API 키와 망에 기대고 싶지 않다. 분석은 미리 돌려 두고,
 * 시연에서는 저장된 것만 읽는다. `pnpm demo:reset` 을 해도 그대로 살아난다.
 *
 * 미리 돌렸다는 것과 지어냈다는 것은 다르다. 여기 있는 값은 전부 실제 모델이
 * 실제 등록 내용을 보고 낸 판단이고, 어느 모델이 언제 냈는지가 각 항목의
 * `provenance` 에 붙어 화면에 그대로 표시된다.
 *
 * ## 어떻게 다시 만드는가
 *
 * ```powershell
 * $env:ANTHROPIC_API_KEY = "..."
 * pnpm ai:analyze
 * ```
 *
 * 스크립트가 이 파일을 통째로 다시 쓴다. 손으로 고치지 마세요 — 다음 실행에
 * 지워집니다.
 */

export const SEEDED_DUPLICATE_ANALYSES: DuplicateAnalysis[] = [];

export const SEEDED_RISK_ANALYSES: RiskAnalysis[] = [];

export const SEEDED_DEMAND_ANALYSES: DemandAnalysis[] = [];

export const SEEDED_QUALITY_REVIEWS: QualityReview[] = [];
