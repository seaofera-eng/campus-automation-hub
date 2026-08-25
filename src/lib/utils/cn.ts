import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * 조건부 클래스명을 합치고 Tailwind 유틸리티 충돌을 뒤쪽 값 우선으로 정리한다.
 * 예: cn('px-2', 'px-4') → 'px-4'
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
