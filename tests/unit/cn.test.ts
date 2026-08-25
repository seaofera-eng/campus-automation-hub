import { describe, expect, it } from 'vitest';
import { cn } from '@/lib/utils/cn';

describe('cn', () => {
  it('클래스명을 공백으로 이어붙인다', () => {
    expect(cn('a', 'b')).toBe('a b');
  });

  it('falsy 값을 무시한다', () => {
    expect(cn('a', false, undefined, null, 'b')).toBe('a b');
  });

  it('충돌하는 Tailwind 유틸리티는 뒤쪽 값이 이긴다', () => {
    expect(cn('px-2 py-1', 'px-4')).toBe('py-1 px-4');
  });

  it('조건부 객체 문법을 지원한다', () => {
    expect(cn('base', { active: true, disabled: false })).toBe('base active');
  });
});
