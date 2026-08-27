import { cn } from '@/lib/utils/cn';

/**
 * CNU Signal Line (디자인 문서 §11).
 *
 * ```text
 * │  자동화 도구 현황
 * │
 * └── blue line ─────────── ● magenta
 * ```
 *
 * 파란 얇은 선으로 구획의 시작을 표시하고, 끝에 아주 작은 자홍 점을 찍는다.
 * 로고를 변형한 것처럼 보이지 않게 하려고 굵기와 길이를 최소로 잡았다.
 *
 * ## 화면당 한두 개까지
 *
 * 배경 장식으로 반복하면 그 순간 의미가 사라진다. 화면에서 **제일 중요한
 * 구획 하나**에만 쓴다. 카드마다 붙이지 않는다.
 */
export function SignalLine({
  className,
  orientation = 'vertical',
}: {
  className?: string;
  /** 제목 왼쪽에 세울지(vertical), 제목 아래에 눕힐지(horizontal) */
  orientation?: 'vertical' | 'horizontal';
}) {
  if (orientation === 'horizontal') {
    return (
      <span
        className={cn('flex items-center gap-1.5', className)}
        aria-hidden="true"
      >
        <span className="h-px w-12 bg-primary" />
        <span className="size-1 rounded-full bg-accent" />
      </span>
    );
  }

  return (
    <span
      className={cn('flex shrink-0 flex-col items-center gap-1 self-stretch', className)}
      aria-hidden="true"
    >
      <span className="w-0.5 flex-1 rounded-full bg-primary" />
      <span className="size-1 rounded-full bg-accent" />
    </span>
  );
}
