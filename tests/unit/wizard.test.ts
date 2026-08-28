import { describe, expect, it } from 'vitest';
import {
  CONSTRAINT_OPTIONS,
  FREQUENCY_OPTIONS,
  INPUT_KINDS,
  OUTPUT_KINDS,
  TASK_KINDS,
  WIZARD_STEPS,
  WIZARD_STEP_COUNT,
  answersAsSimilarityInput,
  composeDemandDraft,
  describeAnswers,
  emptyWizardAnswers,
  isStepAnswered,
  isWizardComplete,
  type WizardAnswers,
} from '@/domain/wizard';

/**
 * 맞춤 AI 찾기 마법사 (리뷰 2026-08-26 2절).
 *
 * 여기서 지키는 것은 하나다 — **모델이 없어도 수요 한 건이 완성된다.**
 * 마법사를 끝까지 갔는데 "AI 를 쓸 수 없어 등록할 수 없습니다"가 나오면
 * 기능 자체가 없는 것과 같다.
 */

function answers(overrides: Partial<WizardAnswers> = {}): WizardAnswers {
  return {
    ...emptyWizardAnswers(),
    taskKind: 'CONVERT',
    inputKinds: ['HWP_DOC'],
    outputKinds: ['FILE'],
    frequency: 'WEEKLY',
    ...overrides,
  };
}

describe('선택지', () => {
  it('값이 겹치지 않는다', () => {
    for (const pool of [TASK_KINDS, INPUT_KINDS, OUTPUT_KINDS, FREQUENCY_OPTIONS, CONSTRAINT_OPTIONS]) {
      const values = pool.map((option) => option.value);
      expect(new Set(values).size).toBe(values.length);
    }
  });

  it('모든 선택지에 라벨·설명·문장이 있다', () => {
    // 문장이 비면 초안에서 그 항목이 조용히 빠진다.
    for (const pool of [TASK_KINDS, INPUT_KINDS, OUTPUT_KINDS, FREQUENCY_OPTIONS, CONSTRAINT_OPTIONS]) {
      for (const option of pool) {
        expect(option.label.trim()).not.toBe('');
        expect(option.hint.trim()).not.toBe('');
        expect(option.phrase.trim()).not.toBe('');
      }
    }
  });

  it('단계는 다섯 개이고 번호가 1부터 이어진다', () => {
    expect(WIZARD_STEPS).toHaveLength(WIZARD_STEP_COUNT);
    expect(WIZARD_STEPS.map((step) => step.step)).toEqual([1, 2, 3, 4, 5]);
  });
});

describe('단계 완료 판정', () => {
  it('빈 답으로는 1단계도 넘어가지 못한다', () => {
    expect(isStepAnswered(1, emptyWizardAnswers())).toBe(false);
    expect(isWizardComplete(emptyWizardAnswers())).toBe(false);
  });

  it('조건(5단계)은 고르지 않아도 끝난 것으로 본다', () => {
    // 억지로 고르게 하면 아무거나 누른다.
    expect(isStepAnswered(5, answers({ constraints: [] }))).toBe(true);
    expect(isWizardComplete(answers({ constraints: [] }))).toBe(true);
  });
});

describe('규칙으로 만든 초안', () => {
  it('모델 없이도 공개에 필요한 칸이 모두 찬다', () => {
    const draft = composeDemandDraft(answers());

    // demandPublishSchema 가 요구하는 네 가지
    expect(draft.title.trim()).not.toBe('');
    expect(draft.currentWorkDescription.trim()).not.toBe('');
    expect(draft.mostPainfulStep.trim()).not.toBe('');
    expect(draft.desiredOutcome.trim()).not.toBe('');
    expect(draft.requiredFeatures.length).toBeGreaterThan(0);
  });

  it('규칙으로 만든 것은 AI 가 쓴 것으로 표시하지 않는다', () => {
    expect(composeDemandDraft(answers()).source).toBe('RULES');
  });

  it('조사 자리표시자를 화면에 내보내지 않는다', () => {
    const draft = composeDemandDraft(answers({ inputKinds: ['EXCEL', 'PDF'] }));
    const text = [
      draft.title,
      draft.currentWorkDescription,
      draft.mostPainfulStep,
      draft.desiredOutcome,
      draft.expectedBenefit,
      ...draft.requiredFeatures,
    ].join(' ');

    expect(text).not.toMatch(/을\(를\)|은\(는\)|이\(가\)|과\(와\)/);
  });

  it('개인정보 조건이 수요의 보안 표시로 이어진다', () => {
    const draft = composeDemandDraft(answers({ constraints: ['PERSONAL_DATA'] }));
    expect(draft.containsIdentifiablePersonalData).toBe(true);
    // 개인정보가 있으면 사람 확인은 자동으로 필요로 둔다.
    expect(draft.requiresHumanApproval).toBe(true);
  });

  it('학사·연구 정보 조건도 그대로 넘어간다', () => {
    const draft = composeDemandDraft(answers({ constraints: ['ACADEMIC_DATA'] }));
    expect(draft.containsAcademicOrResearchData).toBe(true);
    expect(draft.containsIdentifiablePersonalData).toBe(false);
  });

  it('고르지 않은 조건을 켜지 않는다', () => {
    const draft = composeDemandDraft(answers({ constraints: ['HIGH_VOLUME'] }));
    expect(draft.containsIdentifiablePersonalData).toBe(false);
    expect(draft.containsAcademicOrResearchData).toBe(false);
  });

  it('관계없는 조건을 골라도 사람 최종 확인이 꺼지지 않는다', () => {
    // 마법사에는 "사람 확인이 필요 없다"고 말할 선택지가 없다. 처리량이 많다는
    // 이유로 안전장치가 조용히 꺼지면 안 된다.
    expect(composeDemandDraft(answers({ constraints: ['HIGH_VOLUME'] })).requiresHumanApproval)
      .toBe(true);
    expect(composeDemandDraft(answers({ constraints: [] })).requiresHumanApproval).toBe(true);
    expect(composeDemandDraft(answers({ constraints: ['DEADLINE', 'SHARED'] })).requiresHumanApproval)
      .toBe(true);
  });

  it('업무 주기는 고른 그대로 넘어간다', () => {
    expect(composeDemandDraft(answers({ frequency: 'DAILY' })).frequency).toBe('DAILY');
  });

  it('직접 적은 내용을 버리지 않는다', () => {
    const draft = composeDemandDraft(answers({ extraNote: '학과마다 서식이 다릅니다.' }));
    expect(draft.currentWorkDescription).toContain('학과마다 서식이 다릅니다.');
  });

  it('기능 목록에 같은 항목이 두 번 들어가지 않는다', () => {
    const draft = composeDemandDraft(answers({ outputKinds: ['FILE', 'TABLE'] }));
    expect(new Set(draft.requiredFeatures).size).toBe(draft.requiredFeatures.length);
  });

  it('제목이 저장 한도(150자)를 넘지 않는다', () => {
    const draft = composeDemandDraft(
      answers({ inputKinds: INPUT_KINDS.map((option) => option.value) }),
    );
    expect(draft.title.length).toBeLessThanOrEqual(150);
  });
});

describe('도구 비교용 입력', () => {
  it('분류를 비워 둔다 — 없는 분류 일치로 순위가 흔들리면 안 된다', () => {
    const wizardAnswers = answers();
    const query = answersAsSimilarityInput(wizardAnswers, composeDemandDraft(wizardAnswers));
    expect(query.categoryName).toBe('');
  });

  it('고른 항목이 태그로 들어간다', () => {
    const wizardAnswers = answers({ inputKinds: ['EXCEL'] });
    const query = answersAsSimilarityInput(wizardAnswers, composeDemandDraft(wizardAnswers));
    expect(query.tags).toContain('엑셀·CSV');
  });
});

describe('고른 내용 요약', () => {
  it('조건을 고르지 않으면 "없음"이라고 적는다', () => {
    // 빈 줄을 내보내면 모델이 "조건 항목이 잘렸나" 하고 지어낸다.
    expect(describeAnswers(answers({ constraints: [] })).join('\n')).toContain(
      '중요한 조건: 없음',
    );
  });

  it('적지 않은 항목은 줄 자체를 만들지 않는다', () => {
    const lines = describeAnswers(answers({ extraNote: '' }));
    expect(lines.some((line) => line.startsWith('직접 적은 내용'))).toBe(false);
  });
});

describe('검색어', () => {
  it('모든 선택지에 검색어가 있다', () => {
    /*
     * 검색어가 비면 그 선택지를 고른 사람은 도구를 못 찾는다. 화면에는
     * 아무 표시도 안 나므로 조용히 실패한다 — 실제로 이것 때문에 추천이
     * 0건이었다.
     */
    for (const pool of [TASK_KINDS, INPUT_KINDS, OUTPUT_KINDS, FREQUENCY_OPTIONS, CONSTRAINT_OPTIONS]) {
      for (const option of pool) {
        expect(option.keywords.length).toBeGreaterThan(0);
        for (const word of option.keywords) {
          expect(word.trim()).not.toBe('');
        }
      }
    }
  });

  it('고른 항목의 검색어가 질의에 실린다', () => {
    const wizardAnswers = answers({ inputKinds: ['AUDIO'] });
    const query = answersAsSimilarityInput(wizardAnswers, composeDemandDraft(wizardAnswers));

    // "녹음·영상"을 골랐으면 "녹취"로도 도구를 찾을 수 있어야 한다.
    expect(query.inputData).toContain('녹취');
  });

  it('검색어를 사람이 읽는 문장에는 넣지 않는다', () => {
    // 초안은 신청서에 그대로 들어간다. 검색어가 섞이면 읽을 수 없는 글이 된다.
    const draft = composeDemandDraft(answers({ inputKinds: ['AUDIO'] }));
    expect(draft.currentWorkDescription).not.toContain('녹취');
    expect(draft.inputMaterials).toBe('녹음·영상');
  });
});
