import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { josa } from '@/domain/shared/josa';

/**
 * 2·3단계 기능 안내.
 *
 * 요구사항 2번: **가짜 AI 분석 결과를 실제 결과처럼 표시하지 않는다.**
 * AI 중복 탐지·위험 자동평가·멀티 LLM 검증·순위·토큰 영역에는 점수나 유사도 대신
 * 이 컴포넌트만 렌더한다. 숫자를 만들어 내는 코드 경로 자체가 없다.
 *
 * 화면에 넣을 때 자리표시용 막대그래프나 흐린 숫자를 함께 그리지 않는다.
 * "가려진 실제 결과"처럼 보이면 안 된다.
 */

export interface PhaseNoticeProps {
  phase: 'PHASE_2' | 'PHASE_3';
  /** 무엇이 제공될 예정인지 */
  feature: string;
  /** 그때까지 사용자가 대신 할 수 있는 일 */
  fallback?: string;
  className?: string;
}

const PHASE_LABELS: Record<PhaseNoticeProps['phase'], string> = {
  PHASE_2: '2단계',
  PHASE_3: '3단계',
};

export function PhaseNotice({ phase, feature, fallback, className }: PhaseNoticeProps) {
  return (
    <div
      className={cn(
        'flex gap-3 rounded-card border border-dashed border-border-strong bg-surface-muted p-4 text-sm',
        className,
      )}
    >
      <Sparkles className="mt-0.5 size-5 shrink-0 text-fg-subtle" aria-hidden="true" />
      <div>
        <p className="font-medium text-fg">
          {feature}
          {josa(feature, '은는')} {PHASE_LABELS[phase]}에서 제공될 예정입니다.
        </p>
        <p className="mt-1 text-fg-muted">
          아직 분석 결과가 없습니다. 이 영역에 표시할 점수나 판정값을 임의로 만들지 않습니다.
          {fallback ? ` ${fallback}` : ''}
        </p>
      </div>
    </div>
  );
}
