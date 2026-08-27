import type { DemandDraft, WizardAnswers } from '@/domain/wizard';
import { composeDemandDraft, describeAnswers } from '@/domain/wizard';
import { JUDGE_MODEL, ask } from './client';
import { scrub } from './redact';

/**
 * 마법사가 고른 것을 수요 문장으로 다듬는다.
 *
 * ## 다른 `analyze*` 와 무엇이 다른가
 *
 * 중복 탐지·위험도·품질검증·매칭 넷은 **판단**이다. 판단은 미리 돌려 저장해
 * 두고 화면은 읽기만 한다 — 새로 고칠 때마다 답이 달라지면 검토 자료로 못
 * 쓰기 때문이다.
 *
 * 이건 판단이 아니라 **받아쓰기**다. 사람이 방금 버튼으로 고른 것을 읽을 만한
 * 문장으로 바꿔 줄 뿐이고, 그 결과를 사람이 화면에서 바로 확인하고 고친다.
 * 미리 돌려 둘 대상이 없다 — 아직 존재하지 않는 수요이기 때문이다.
 * 그래서 이것만 화면 흐름 안에서 부른다.
 *
 * ## 실패해도 마법사는 끝난다
 *
 * 키가 없거나 모델이 실패하면 `null` 을 돌려준다. 부르는 쪽은
 * `composeDemandDraft()` 가 규칙으로 만든 초안을 그대로 쓴다. 화면에는
 * 어느 쪽인지 표시한다 (`DemandDraft.source`).
 *
 * **모델이 만들어 낸 값을 규칙 초안에 섞지 않는다.** 섞으면 "이 문장 누가
 * 썼냐"에 답할 수 없다.
 *
 * ## 내보내는 것
 *
 * 고른 선택지의 **라벨**과 선택 입력 한 칸이 전부다. 이름·소속·연락처는
 * 애초에 마법사가 묻지 않는다. 다만 선택 입력에는 사람이 무엇이든 적을 수
 * 있으므로 `scrub()` 을 거친다.
 */

const SYSTEM = `당신은 대학 직원이 "이런 업무 자동화가 있으면 좋겠다"고 신청하는 글을
대신 정리해 주는 사람입니다.

신청자가 화면에서 버튼으로 고른 항목과, 규칙으로 조립한 뻣뻣한 초안을 받습니다.
이것을 **개발자가 읽고 무엇을 만들지 판단할 수 있는 글**로 다듬으세요.

지켜야 할 것:
- 고른 항목에 없는 내용을 지어내지 마세요. 부서명, 담당자, 건수, 마감일처럼
  주어지지 않은 사실을 추측해서 넣으면 안 됩니다.
- 초안이 이미 담고 있는 사실만 자연스러운 문장으로 바꿉니다. 사실을 더하는
  것이 아니라 읽기 좋게 만드는 일입니다.
- 한국어로, 개발 용어 없이 씁니다. 읽는 사람은 개발자와 검토자입니다.
- 조사를 "을(를)" 처럼 쓰지 마세요. 앞말에 맞는 조사 하나만 씁니다.
- title 은 30자 이내의 짧은 이름입니다. "~ 자동화" 정도로 끝냅니다.
- requiredFeatures 는 만들어야 할 기능을 한 줄씩 적은 목록입니다. 각 줄은
  20자 안팎으로 짧게 씁니다. 3개에서 6개 사이로 정리하세요.
- expectedBenefit 은 한 문장입니다. 시간이 몇 % 준다는 식의 숫자를 지어내지 마세요.`;

const SCHEMA = {
  type: 'object',
  properties: {
    title: { type: 'string', description: '수요 제목. 30자 이내.' },
    currentWorkDescription: { type: 'string', description: '지금 이 업무를 어떻게 하고 있는지.' },
    mostPainfulStep: { type: 'string', description: '가장 번거로운 단계 한두 문장.' },
    inputMaterials: { type: 'string', description: '다루는 자료를 쉼표로 나열.' },
    desiredOutcome: { type: 'string', description: '원하는 결과물 한두 문장.' },
    requiredFeatures: {
      type: 'array',
      items: { type: 'string' },
      description: '꼭 필요한 기능. 3~6개.',
    },
    expectedBenefit: { type: 'string', description: '기대 효과 한 문장.' },
  },
  required: [
    'title',
    'currentWorkDescription',
    'mostPainfulStep',
    'inputMaterials',
    'desiredOutcome',
    'requiredFeatures',
    'expectedBenefit',
  ],
  additionalProperties: false,
} as const;

interface PolishedFields {
  title: string;
  currentWorkDescription: string;
  mostPainfulStep: string;
  inputMaterials: string;
  desiredOutcome: string;
  requiredFeatures: string[];
  expectedBenefit: string;
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

/**
 * 모델이 낸 값이 쓸 만한지 확인한다.
 *
 * 한 칸이라도 비면 전체를 버린다. 반쯤 채워진 글을 규칙 초안과 기워 붙이면
 * 출처가 섞여서, 화면에 "AI 가 정리했습니다"라고 쓸 수 없게 된다.
 */
function validate(value: unknown): PolishedFields | null {
  if (typeof value !== 'object' || value === null) return null;
  const row = value as Record<string, unknown>;

  const features = Array.isArray(row.requiredFeatures)
    ? row.requiredFeatures.map((entry) => text(entry)).filter(Boolean)
    : [];
  if (features.length === 0) return null;

  const fields: PolishedFields = {
    title: text(row.title).slice(0, 150),
    currentWorkDescription: text(row.currentWorkDescription),
    mostPainfulStep: text(row.mostPainfulStep),
    inputMaterials: text(row.inputMaterials),
    desiredOutcome: text(row.desiredOutcome),
    requiredFeatures: [...new Set(features)].slice(0, 8),
    expectedBenefit: text(row.expectedBenefit),
  };

  const filled =
    fields.title !== '' &&
    fields.currentWorkDescription !== '' &&
    fields.mostPainfulStep !== '' &&
    fields.desiredOutcome !== '';

  return filled ? fields : null;
}

export interface DemandDraftRequest {
  answers: WizardAnswers;
  /** 규칙으로 만든 초안. 모델에게 다듬으라고 함께 보낸다. */
  baseline: DemandDraft;
  model?: string;
}

export interface DemandDraftResult {
  draft: DemandDraft;
  model: string;
}

/**
 * 초안을 다듬는다. 못 다듬으면 `null`.
 *
 * 부르는 쪽이 `composeDemandDraft()` 결과를 그대로 쓰면 되므로 여기서
 * 예외를 던지지 않는다.
 */
export async function draftDemand(
  request: DemandDraftRequest,
): Promise<DemandDraftResult | null> {
  const baseline = request.baseline;

  const answer = await ask({
    feature: 'demand-draft',
    model: request.model ?? JUDGE_MODEL,
    system: SYSTEM,
    prompt: [
      '## 신청자가 고른 것',
      scrub(describeAnswers(request.answers).join('\n')),
      '',
      '## 규칙으로 조립한 초안 (다듬을 대상)',
      JSON.stringify(
        scrubDraftForPrompt({
          title: baseline.title,
          currentWorkDescription: baseline.currentWorkDescription,
          mostPainfulStep: baseline.mostPainfulStep,
          inputMaterials: baseline.inputMaterials,
          desiredOutcome: baseline.desiredOutcome,
          requiredFeatures: baseline.requiredFeatures,
          expectedBenefit: baseline.expectedBenefit,
        }),
        null,
        2,
      ),
    ].join('\n'),
    schema: SCHEMA as unknown as Record<string, unknown>,
    validate,
  });

  if (!answer) return null;

  return {
    // 보안 표시와 업무 주기는 모델에게 맡기지 않는다. 사람이 고른 값 그대로다.
    draft: {
      ...baseline,
      ...answer.value,
      source: 'MODEL',
    },
    model: answer.usage.model,
  };
}

function scrubDraftForPrompt(fields: PolishedFields): PolishedFields {
  return {
    title: scrub(fields.title),
    currentWorkDescription: scrub(fields.currentWorkDescription),
    mostPainfulStep: scrub(fields.mostPainfulStep),
    inputMaterials: scrub(fields.inputMaterials),
    desiredOutcome: scrub(fields.desiredOutcome),
    requiredFeatures: fields.requiredFeatures.map((entry) => scrub(entry)),
    expectedBenefit: scrub(fields.expectedBenefit),
  };
}

/** 규칙 초안만으로 끝낼 때 쓰는 편의 함수. */
export function fallbackDraft(answers: WizardAnswers): DemandDraft {
  return composeDemandDraft(answers);
}
