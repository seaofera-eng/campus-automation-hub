import Anthropic from '@anthropic-ai/sdk';

/**
 * 모델 호출 하나로 모으는 자리.
 *
 * 여기만 거치므로 재시도·비용 집계·실패 처리를 한 곳에서 한다.
 *
 * ## 키가 없으면
 *
 * 예외를 던지지 않고 `null` 을 돌려준다. 호출부는 그걸 보고 Noop 결과로 떨어진다.
 * 시연 중 네트워크가 끊기거나 키가 빠져도 플랫폼은 그대로 돌아가야 한다.
 */

/** 근거를 조리 있게 쓰는 판단용. 중복·위험·매칭. */
export const JUDGE_MODEL = 'claude-opus-5';

/** 교차 검증에서 다른 관점을 맡는 모델. 같은 모델을 두 번 부르면 교차가 아니다. */
export const CROSS_CHECK_MODEL = 'claude-sonnet-5';

let cached: Anthropic | null | undefined;

export function getClient(): Anthropic | null {
  if (cached !== undefined) return cached;

  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  cached = apiKey ? new Anthropic({ apiKey }) : null;
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

/** 2026-06 기준 1M 토큰당 단가 (USD) */
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
