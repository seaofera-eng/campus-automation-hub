import { createNoopAiServices } from './noop';
import type { AiFeatureFlags, AiServices } from './types';

/**
 * 1단계에서는 모든 AI 기능이 꺼져 있다.
 *
 * 2단계에서 실제 구현을 붙일 때는 여기서 환경변수를 보고 구현체를 고르면 된다.
 * 나머지 코드는 바뀌지 않는다.
 */
export function getAiServices(): AiServices {
  return createNoopAiServices();
}

export function getAiFeatureFlags(): AiFeatureFlags {
  return {
    duplicateDetection: false,
    riskAssessment: false,
    demandMatching: false,
    multiLlmReview: false,
    ranking: false,
    reward: false,
  };
}

export * from './types';
