import Anthropic from '@anthropic-ai/sdk';

/**
 * 모델 호출 하나로 모으는 자리.
 *
 * 여기만 거치므로 비용 집계·실패 처리를 한 곳에서 한다.
 *
 * ## 교내 AI 포털을 거친다
 *
 * 모델 회사에 직접 쏘지 않고 **충남대 AI 포털**(`aiportal.cnu.ac.kr`)의 게이트웨이를
 * 거친다. 학내 플랫폼에서 이게 중요한 이유는 둘이다.
 *
 * - 키를 학교가 관리한다. 개인이 발급받은 키가 코드에 박히지 않는다.
 * - "데이터가 어디로 나가느냐"에 답할 때 한 단계가 줄어든다. 교내 포털을
 *   거친다는 사실 자체가 답의 일부다.
 *
 * 게이트웨이가 Anthropic Messages API 를 그대로 중계하므로 SDK 를 그대로 쓴다.
 * 구조화 출력(`output_config`)과 adaptive thinking 도 통과하는 것을 확인했다.
 *
 * ## 키가 없으면
 *
 * 예외를 던지지 않고 `null` 을 돌려준다. 호출부는 그걸 보고 "분석 없음"으로
 * 떨어진다. 시연 중 네트워크가 끊기거나 키가 빠져도 플랫폼은 그대로 돌아가야 한다.
 */

/**
 * 어느 모델을 쓸지.
 *
 * 환경변수로 갈아 끼울 수 있다. 비용을 줄이려면 `.env.local` 에서 내리면 된다:
 *
 * ```
 * AI_JUDGE_MODEL=claude-sonnet-5
 * ```
 *
 * 다만 **중복 탐지는 내리기 전에 결과를 보고 정하세요.** 겹치는 도구를 잡아내는
 * 일은 여러 항목을 동시에 붙들고 "같은 문제를 같은 방식으로 푸는가"를 판단해야
 * 해서, 모델을 내리면 근거 인용이 먼저 부실해집니다. 시연에서 보여 줄 장면이
 * 거기서 나옵니다.
 */

/** 근거를 조리 있게 쓰는 판단용. 중복·위험·매칭. */
export const JUDGE_MODEL = process.env.AI_JUDGE_MODEL?.trim() || 'claude-opus-5';

/** 품질검증 — 내용 일관성을 보는 쪽. */
export const REVIEW_MODEL_A = process.env.AI_REVIEW_MODEL_A?.trim() || 'claude-opus-5';

/** 품질검증 — 규정·보안을 보는 쪽. */
export const REVIEW_MODEL_B = process.env.AI_REVIEW_MODEL_B?.trim() || 'claude-sonnet-5';

/**
 * 두 관점이 같은 모델로 겹쳤는지.
 *
 * 겹치면 교차 검증이 아니다. 같은 모델에게 두 번 물으면 같은 각도에서 두 번
 * 보는 것이고, 놓친 것은 두 번 다 놓친다. 막지는 않고 알린다 — 비용 때문에
 * 일부러 그렇게 두는 선택도 있을 수 있다.
 */
export function crossCheckCollapsed(): boolean {
  return REVIEW_MODEL_A === REVIEW_MODEL_B;
}

/**
 * 교내 포털의 Anthropic 호환 엔드포인트.
 *
 * SDK 가 여기에 `/v1/messages` 를 붙여 부른다.
 * 모델 회사에 직접 붙이려면 `AI_GATEWAY_BASE_URL=https://api.anthropic.com` 으로
 * 덮어쓰면 된다 — 그때는 진짜 Anthropic 키가 필요하다.
 */
const DEFAULT_BASE_URL = 'https://factchat-cloud.mindlogic.ai/v1/gateway/claude';

let cached: Anthropic | null | undefined;

export function getClient(): Anthropic | null {
  if (cached !== undefined) return cached;

  // 포털 키를 먼저 본다. ANTHROPIC_API_KEY 는 모델 회사에 직접 붙일 때를 위해 남겨 둔다.
  const apiKey =
    process.env.AI_GATEWAY_API_KEY?.trim() || process.env.ANTHROPIC_API_KEY?.trim();

  cached = apiKey
    ? new Anthropic({
        apiKey,
        baseURL: process.env.AI_GATEWAY_BASE_URL?.trim() || DEFAULT_BASE_URL,
      })
    : null;
  return cached;
}

export function isAiEnabled(): boolean {
  return getClient() !== null;
}

/** 한 번 호출에 무엇을 얼마나 썼는지. 심사에서 "비용이 얼마냐"에 답할 자료다. */
export interface AiCallUsage {
  feature: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  /** USD. 표시용 근사값이다. */
  estimatedCost: number;
  elapsedMs: number;
}

/**
 * 1M 토큰당 단가 (USD, 2026-06 정가 기준).
 *
 * 교내 포털을 거치면 실제 청구는 학교와 포털 사이에서 일어나므로 이 값이 곧
 * 우리가 내는 돈은 아니다. 그래도 "이 기능이 자원을 얼마나 쓰는가"를 같은 잣대로
 * 말할 수 있어야 해서 정가로 환산해 둔다.
 */
const PRICING: Record<string, { input: number; output: number }> = {
  'claude-opus-5': { input: 5, output: 25 },
  'claude-sonnet-5': { input: 2, output: 10 },
  'claude-haiku-4-5': { input: 1, output: 5 },
};

function estimateCost(model: string, inputTokens: number, outputTokens: number): number {
  const price = PRICING[model] ?? { input: 5, output: 25 };
  return (inputTokens * price.input + outputTokens * price.output) / 1_000_000;
}

const usageLog: AiCallUsage[] = [];

/** 이번 실행에서 쓴 비용. 분석 스크립트가 끝에 출력한다. */
export function drainUsage(): { calls: AiCallUsage[]; totalCost: number } {
  const calls = [...usageLog];
  usageLog.length = 0;
  return { calls, totalCost: calls.reduce((sum, call) => sum + call.estimatedCost, 0) };
}

export interface AskOptions<T> {
  /** 무슨 기능이 부르는지. 비용 집계에 쓴다. */
  feature: string;
  model?: string;
  system: string;
  prompt: string;
  /** 응답을 이 모양으로 강제한다. 파싱 실패를 없앤다. */
  schema: Record<string, unknown>;
  /** 스키마를 통과한 값이 진짜 원하는 모양인지 마지막으로 확인 */
  validate: (value: unknown) => T | null;
}

/**
 * 모델에게 묻고 구조화된 답을 받는다.
 *
 * 실패하면 `null`. 예외를 던지지 않는다 — 도구 하나 분석이 실패했다고
 * 전체가 멈추면 안 된다.
 */
export async function ask<T>(options: AskOptions<T>): Promise<{ value: T; usage: AiCallUsage } | null> {
  const client = getClient();
  if (!client) return null;

  const model = options.model ?? JUDGE_MODEL;
  const startedAt = Date.now();

  try {
    const response = await client.messages.create({
      model,
      max_tokens: 4096,
      // 판단에 근거를 붙여야 하는 일이라 생각할 여지를 준다.
      thinking: { type: 'adaptive' },
      output_config: {
        effort: 'medium',
        format: { type: 'json_schema', schema: options.schema },
      },
      system: options.system,
      messages: [{ role: 'user', content: options.prompt }],
    });

    if (response.stop_reason === 'refusal') return null;

    const text = response.content.find((block) => block.type === 'text');
    if (!text || text.type !== 'text') return null;

    const parsed: unknown = JSON.parse(text.text);
    const value = options.validate(parsed);
    if (value === null) return null;

    const usage: AiCallUsage = {
      feature: options.feature,
      model,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      estimatedCost: estimateCost(model, response.usage.input_tokens, response.usage.output_tokens),
      elapsedMs: Date.now() - startedAt,
    };
    usageLog.push(usage);

    return { value, usage };
  } catch (error) {
    // 실패는 조용히 넘긴다. 호출부가 Noop 으로 떨어진다.
    console.error(`[ai] ${options.feature} 호출 실패:`, error);
    return null;
  }
}
