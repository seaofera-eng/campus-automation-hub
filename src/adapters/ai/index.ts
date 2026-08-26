/**
 * AI 어댑터.
 *
 * ## 분석은 미리 돌리고, 화면은 저장된 것만 읽는다
 *
 * 이 파일이 내보내는 `analyze*` 함수는 **분석 스크립트(`pnpm ai:analyze`)가
 * 부른다.** 화면과 서버 액션은 이 함수들을 부르지 않고, 저장소에 들어 있는
 * 결과를 읽기만 한다.
 *
 * 그렇게 나눈 이유:
 *
 * - 페이지를 열 때마다 모델을 부르면 느리고 비싸다.
 * - 새로 고칠 때마다 판단이 달라지면 검토 자료로 못 쓴다.
 * - 시연 자리에서 키나 망에 기대고 싶지 않다.
 *
 * ## 키가 없으면
 *
 * `analyze*` 는 `null` 을 돌려주고, 화면은 "아직 분석하지 않았습니다"를 낸다.
 * 숫자를 지어내지 않는다.
 */

export {
  isAiEnabled,
  drainUsage,
  crossCheckCollapsed,
  JUDGE_MODEL,
  REVIEW_MODEL_A,
  REVIEW_MODEL_B,
} from './live/client';
export type { AiCallUsage } from './live/client';

export { toToolDigest, toDemandDigest, scrub, scrubDigest } from './live/redact';
export type { ToolDigest, DemandDigest } from './live/redact';

export { analyzeDuplicates } from './live/duplicate-detection';
export type { DuplicateAnalysisRequest } from './live/duplicate-detection';

export { analyzeRisk } from './live/risk-assessment';
export type { RiskAnalysisRequest } from './live/risk-assessment';

export { analyzeDemand } from './live/demand-matching';
export type { DemandAnalysisRequest } from './live/demand-matching';

export { reviewQuality } from './live/quality-review';
export type { QualityReviewRequest } from './live/quality-review';
