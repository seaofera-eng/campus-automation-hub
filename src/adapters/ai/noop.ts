import type {
  AiFeatureDisabled,
  AiPhase,
  AiServices,
  DemandMatchingService,
  DuplicateDetectionService,
  MultiLlmReviewService,
  RankingService,
  RewardService,
  RiskAssessmentService,
} from './types';
import { josa } from '@/domain/shared/josa';

/**
 * 1단계용 Noop 구현.
 *
 * 어떤 외부 API도 호출하지 않고, 어떤 점수도 만들지 않는다.
 * 항상 `{ enabled: false }` 를 돌려주며 화면은 이를 안내 문구로만 표시한다.
 *
 * 2단계에서 실제 구현을 붙일 때는 이 파일을 지우지 말고
 * `adapters/ai/live/` 에 새 구현을 만든 뒤 index.ts 에서 선택하도록 한다.
 */

function disabled(phase: AiPhase, feature: string): AiFeatureDisabled {
  return {
    enabled: false,
    phase,
    message:
      phase === 'PHASE_2'
        ? `${feature}${josa(feature, '은는')} 2단계에서 제공될 예정입니다. 현재는 담당자가 직접 확인합니다.`
        : `${feature}${josa(feature, '은는')} 3단계에서 제공될 예정입니다.`,
  };
}

/** 저장 계열 메서드는 아직 저장할 결과가 없으므로 아무 것도 하지 않는다. */
async function noopSave(): Promise<void> {
  return;
}

export function createNoopDuplicateDetectionService(): DuplicateDetectionService {
  const result = () => disabled('PHASE_2', 'AI 중복 탐지');
  return {
    async analyzeNewTool() {
      return result();
    },
    async findCandidates() {
      return result();
    },
    async compareTools() {
      return result();
    },
    saveResult: noopSave,
  };
}

export function createNoopRiskAssessmentService(): RiskAssessmentService {
  const result = () => disabled('PHASE_2', 'AI 위험도 평가');
  return {
    async assessTool() {
      return result();
    },
    async evaluateDataRisk() {
      return result();
    },
    async evaluateAutomationRisk() {
      return result();
    },
    async generateRequiredControls() {
      return result();
    },
    saveAssessment: noopSave,
  };
}

export function createNoopDemandMatchingService(): DemandMatchingService {
  const result = () => disabled('PHASE_2', 'AI 자동 수요 매칭');
  return {
    async findMatchingTools() {
      return result();
    },
    async calculateMatchScore() {
      return result();
    },
    async explainMatch() {
      return result();
    },
    saveCandidates: noopSave,
  };
}

export function createNoopMultiLlmReviewService(): MultiLlmReviewService {
  const result = () => disabled('PHASE_3', '멀티 LLM 품질검증');
  return {
    async createReviewRun() {
      return result();
    },
    async runFactualityReview() {
      return result();
    },
    async runPolicyReview() {
      return result();
    },
    async runSecurityReview() {
      return result();
    },
    async aggregateResults() {
      return result();
    },
    requestHumanApproval: noopSave,
  };
}

export function createNoopRankingService(): RankingService {
  const result = () => disabled('PHASE_3', '도구 순위 산정');
  return {
    async calculateQualityScore() {
      return result();
    },
    async calculateAdoptionScore() {
      return result();
    },
    async calculateSafetyScore() {
      return result();
    },
    async calculateMaintenanceScore() {
      return result();
    },
    async generateRankingSnapshot() {
      return result();
    },
  };
}

export function createNoopRewardService(): RewardService {
  const result = () => disabled('PHASE_3', '개발자 토큰 보상');
  return {
    async calculateMonthlyReward() {
      return result();
    },
    async createRewardLedger() {
      return result();
    },
    async detectSuspiciousUsage() {
      return result();
    },
  };
}

export function createNoopAiServices(): AiServices {
  return {
    duplicateDetection: createNoopDuplicateDetectionService(),
    riskAssessment: createNoopRiskAssessmentService(),
    demandMatching: createNoopDemandMatchingService(),
    multiLlmReview: createNoopMultiLlmReviewService(),
    ranking: createNoopRankingService(),
    reward: createNoopRewardService(),
  };
}
