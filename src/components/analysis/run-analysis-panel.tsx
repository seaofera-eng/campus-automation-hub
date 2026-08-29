'use client';

import { Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { runToolAnalysisAction } from '@/actions/review-actions';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/field';
import { josa } from '@/domain/shared/josa';

/**
 * 검토 화면에서 AI 분석을 돌린다 (리뷰 2026-08-30).
 *
 * "관리자가 버튼식으로 실행할 수 있어? 그냥 허용하면 API 토큰이 낭비될 것
 *  같으니까 간단한 비밀코드를 입력하게 할 수 있으면 좋겠어"
 *
 * ## 접어 둔다
 *
 * 검토자가 이 화면에 온 이유는 판단하기 위해서지 분석을 돌리기 위해서가 아니다.
 * 분석이 이미 있는 도구가 대부분이므로 평소에는 보이지 않는 편이 낫다.
 *
 * ## 얼마나 걸리는지 먼저 말한다
 *
 * 모델을 네 번 부른다(중복 1 · 위험도 1 · 품질검증 2). 30초쯤 걸리는데,
 * 아무 말도 없으면 사용자는 고장으로
 * 보고 다시 누른다. **다시 누르는 것이 바로 토큰이 새는 경로다.**
 * 그래서 걸리는 시간과 비용을 누르기 전에 적어 두고, 도는 동안 버튼을 잠근다.
 */
export function RunAnalysisPanel({ toolId }: { toolId: string }) {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ tone: 'success' | 'danger'; text: string } | null>(null);

  function submit() {
    setMessage(null);
    startTransition(async () => {
      const result = await runToolAnalysisAction({ toolId, accessCode: code });
      if (!result.ok) {
        setMessage({ tone: 'danger', text: result.error.message });
        return;
      }

      const { duplicate, risk, quality, calls, cost } = result.data;
      const done = [
        duplicate ? '중복' : null,
        risk ? '위험도' : null,
        quality ? '품질검증' : null,
      ].filter(Boolean);
      const failed = [
        duplicate ? null : '중복',
        risk ? null : '위험도',
        quality ? null : '품질검증',
      ].filter(Boolean);

      setCode('');
      setMessage({
        tone: failed.length > 0 ? 'danger' : 'success',
        text:
          `${done.join('·')} 분석을 마쳤습니다. 모델 ${calls}회 호출 · 약 $${cost.toFixed(2)}.` +
          (failed.length > 0
            ? ` ${failed.join('·')}${josa(failed.join('·'), '은는')} 실패했습니다.`
            : ''),
      });
      router.refresh();
    });
  }

  return (
    <details className="group rounded-card border border-border bg-surface">
      <summary className="flex cursor-pointer items-center justify-between gap-3 rounded-card px-4 py-3 text-sm font-semibold text-fg transition-colors hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
        <span className="flex items-center gap-2">
          <Sparkles className="size-4 text-fg-subtle" aria-hidden="true" />
          AI 분석 돌리기
          <span className="text-xs font-normal text-fg-subtle">검토 권한 · 실행 코드 필요</span>
        </span>
      </summary>

      <div className="flex flex-col gap-3 border-t border-border px-4 py-3.5">
        <p className="text-sm text-fg-muted">
          이 도구의 <strong className="font-semibold text-fg">중복·위험도·품질검증</strong> 을 다시
          계산합니다. 모델을 <strong className="font-semibold text-fg">4회</strong> 부르고{' '}
          <strong className="font-semibold text-fg">30초쯤</strong> 걸리며, 도구 하나에{' '}
          <strong className="font-semibold text-fg">약 $0.2</strong> 가 듭니다. 이미 있는 결과는
          덮어씁니다.
        </p>

        {message ? (
          <Alert tone={message.tone === 'success' ? 'success' : 'danger'}>{message.text}</Alert>
        ) : null}

        <div className="flex flex-wrap items-end gap-2">
          <div className="min-w-0 flex-1">
            <label htmlFor="ai-run-code" className="text-sm font-medium text-fg">
              실행 코드
            </label>
            <Input
              id="ai-run-code"
              type="password"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              className="mt-1.5"
              autoComplete="off"
              placeholder="관리자에게 받은 코드"
              disabled={pending}
            />
          </div>
          <Button type="button" onClick={submit} disabled={pending || code.trim().length === 0}>
            <Sparkles aria-hidden="true" />
            {pending ? '분석 중… (30초쯤)' : '분석 실행'}
          </Button>
        </div>

        <p className="text-xs text-fg-subtle">
          누를 때마다 비용이 듭니다. 같은 도구는 1분에 한 번만 돌릴 수 있고, 누가 언제 눌렀는지는
          관리 기록에 남습니다.
        </p>
      </div>
    </details>
  );
}
