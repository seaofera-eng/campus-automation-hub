import { describe, expect, it } from 'vitest';
import { josa, withJosa } from '@/domain/shared/josa';

describe('josa - 받침 판단', () => {
  it('받침이 있으면 은·이·을·과 를 쓴다', () => {
    expect(josa('회의록', '은는')).toBe('은');
    expect(josa('회의록', '이가')).toBe('이');
    expect(josa('회의록', '을를')).toBe('을');
    expect(josa('회의록', '과와')).toBe('과');
  });

  it('받침이 없으면 는·가·를·와 를 쓴다', () => {
    expect(josa('도구', '은는')).toBe('는');
    expect(josa('도구', '이가')).toBe('가');
    expect(josa('도구', '을를')).toBe('를');
    expect(josa('도구', '과와')).toBe('와');
  });

  it('실제로 화면에 나갔던 문장들을 바로잡는다', () => {
    // "위험도 자동 평가은(는) 2단계에서" → 평가는
    expect(josa('위험도 자동 평가', '은는')).toBe('는');
    // "'마감일 표현을 한국어 날짜 형식으로'이(가) 반영 확정" → 형식으로가
    expect(josa('마감일 표현을 한국어 날짜 형식으로', '이가')).toBe('가');
    // "수요 '…담당부서 전달'이(가) 공개 상태" → 전달이
    expect(josa('[예시] 반복 민원 분류 및 담당부서 전달', '이가')).toBe('이');
  });
});

describe('josa - 한글이 아닌 끝글자', () => {
  it('숫자는 읽는 소리를 따른다', () => {
    expect(josa('버전 1', '이가')).toBe('이'); // 일
    expect(josa('버전 2', '이가')).toBe('가'); // 이
    expect(josa('버전 3', '이가')).toBe('이'); // 삼
    expect(josa('버전 5', '이가')).toBe('가'); // 오
    expect(josa('버전 6', '이가')).toBe('이'); // 육
    expect(josa('버전 10', '이가')).toBe('이'); // 십
  });

  it('알파벳은 한글 이름으로 읽은 소리를 따른다', () => {
    expect(josa('Excel', '이가')).toBe('이'); // 엘
    expect(josa('Zoom', '이가')).toBe('이'); // 엠
    expect(josa('Notion', '이가')).toBe('이'); // 엔
    expect(josa('AI', '이가')).toBe('가'); // 아이
    expect(josa('LMS', '이가')).toBe('가'); // 에스
  });

  it('따옴표나 마침표로 끝나면 그 앞 글자를 본다', () => {
    expect(josa("'회의록'", '이가')).toBe('이');
    expect(josa('도구.', '은는')).toBe('는');
    expect(josa('회의록 ', '은는')).toBe('은');
  });

  it('판단할 수 없으면 받침 없는 쪽을 쓴다', () => {
    expect(josa('', '은는')).toBe('는');
    expect(josa('???', '이가')).toBe('가');
  });
});

describe('withJosa', () => {
  it('낱말과 조사를 이어 붙인다', () => {
    expect(withJosa('도구', '은는')).toBe('도구는');
    expect(withJosa('회의록', '이가')).toBe('회의록이');
  });
});
