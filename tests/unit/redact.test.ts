import { describe, expect, it } from 'vitest';
import { scrub, scrubDigest } from '@/adapters/ai/live/redact';

/**
 * 모델에 보내는 payload 에 개인정보가 섞이지 않는지 지킨다.
 *
 * 학내 플랫폼이라 "개인정보가 외부 모델로 가지 않느냐"는 질문을 반드시 받는다.
 * 말이 아니라 이 테스트로 답한다.
 */

describe('scrub — 식별 정보 가리기', () => {
  it('휴대폰 번호를 가린다', () => {
    expect(scrub('문의는 010-1234-5678 로 주세요')).toBe('문의는 [연락처] 로 주세요');
    expect(scrub('01098765432 로 연락')).toContain('[연락처]');
  });

  it('주민등록번호를 가린다', () => {
    expect(scrub('900101-1234567')).toBe('[주민등록번호]');
  });

  it('이메일을 가린다', () => {
    expect(scrub('담당자 hong@university.ac.kr 확인')).toBe('담당자 [이메일] 확인');
  });

  it('학번·사번으로 보이는 숫자를 가린다', () => {
    expect(scrub('학번 20231234 학생')).toBe('학번 [번호] 학생');
  });

  it('평범한 설명은 그대로 둔다', () => {
    const text = '회의 녹취를 요약해 담당자별 할 일로 정리합니다. 월 800건 처리.';
    expect(scrub(text)).toBe(text);
  });

  /** 막지 않고 가린다. 예외를 던지면 도구 하나 때문에 분석 전체가 멈춘다. */
  it('가릴 것이 있어도 예외를 던지지 않는다', () => {
    expect(() => scrub('010-1234-5678')).not.toThrow();
  });
});

describe('scrubDigest — 중첩 구조 전체', () => {
  it('배열과 객체 안쪽까지 훑는다', () => {
    const digest = {
      name: '문의 응대 도구',
      keyFeatures: ['담당자 010-1111-2222 에게 전달', '자동 분류'],
      nested: { note: 'hong@a.b 참조' },
      count: 12,
      flag: true,
    };

    const result = scrubDigest(digest);

    expect(result.keyFeatures[0]).toBe('담당자 [연락처] 에게 전달');
    expect(result.nested.note).toBe('[이메일] 참조');
    // 숫자와 불리언은 건드리지 않는다.
    expect(result.count).toBe(12);
    expect(result.flag).toBe(true);
  });
});
