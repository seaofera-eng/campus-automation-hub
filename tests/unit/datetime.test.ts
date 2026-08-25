import { describe, expect, it } from 'vitest';
import { formatDate, formatDateTime } from '@/lib/utils/datetime';

const SAMPLE = '2026-08-22T14:19:00';
const MORNING = '2026-08-22T09:05:00';

describe('formatDateTime', () => {
  it('24시간제로 표시한다', () => {
    expect(formatDateTime(SAMPLE)).toBe('2026. 8. 22. 14:19');
  });

  it('오전 시각도 오전/AM 표기 없이 나온다', () => {
    expect(formatDateTime(MORNING)).toBe('2026. 8. 22. 09:05');
  });

  /**
   * Node 의 ICU 버전에 따라 "오전" 대신 "AM" 이 나오던 문제를 막는다.
   * 화면에 영어 오전/오후 표기가 새어 나가면 안 된다.
   */
  it('AM·PM 이 절대 들어가지 않는다', () => {
    for (const value of [SAMPLE, MORNING, '2026-01-01T00:00:00', '2026-12-31T23:59:00']) {
      expect(formatDateTime(value)).not.toMatch(/AM|PM/);
    }
  });

  it('Date 객체도 받는다', () => {
    expect(formatDateTime(new Date(SAMPLE))).toBe('2026. 8. 22. 14:19');
  });
});

describe('formatDate', () => {
  it('시각 없이 날짜만 한국어로 표시한다', () => {
    expect(formatDate(SAMPLE)).toBe('2026년 8월 22일');
  });
});
