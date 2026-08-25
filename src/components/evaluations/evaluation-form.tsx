'use client';

import { Star } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { submitEvaluationAction, updateEvaluationAction } from '@/actions/evaluation-actions';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Field, Textarea, fieldAria } from '@/components/ui/field';
import {
  EVALUATION_CRITERIA,
  EVALUATION_CRITERION_HELP,
  EVALUATION_CRITERION_LABELS,
  MAX_SCORE,
  MIN_SCORE,
  SCORE_LABELS,
} from '@/domain/evaluation/types';
import type { EvaluationCriterion, EvaluationScores } from '@/domain/evaluation/types';
import { cn } from '@/lib/utils/cn';

/**
 * 도구 평가 (요구사항 9번).
 *
 * 7개 항목을 각각 1~5점으로 받는다. 점수는 숫자 버튼 + 텍스트 라벨로 표시해
 * 별 모양만으로 의미를 전달하지 않는다 (요구사항 12번).
 *
 * 이미 평가한 버전이면 수정 모드로 연다. 수정하면 이전 값이 이력에 남는다.
 */
export function EvaluationForm({
  toolId,
  existing,
}: {
  toolId: string;
  existing: { id: string; scores: EvaluationScores; comment: string; revisionCount: number } | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [scores, setScores] = useState<Partial<EvaluationScores>>(existing?.scores ?? {});
  const [comment, setComment] = useState(existing?.comment ?? '');
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();

  const isEdit = existing !== null;
  const missing = EVALUATION_CRITERIA.filter((criterion) => scores[criterion] === undefined);

  function submit() {
    setError(null);
    setFieldErrors({});

    startTransition(async () => {
      const result = isEdit
        ? await updateEvaluationAction({ evaluationId: existing.id, scores, comment })
        : await submitEvaluationAction({ toolId, scores, comment });

      if (result.ok) {
        setOpen(false);
        router.refresh();
        return;
      }
      // 서버 오류 경로는 'scores.usability' 형태로 온다.
      setFieldErrors(
        Object.fromEntries(
          Object.entries(result.error.fields ?? {}).map(([path, message]) => [
            path.replace(/^scores\./, ''),
            message,
          ]),
        ),
      );
      setError(result.error.message);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={isEdit ? 'secondary' : 'primary'}>
          <Star aria-hidden="true" />
          {isEdit ? '내 평가 수정' : '평가하기'}
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? '평가 수정' : '도구 평가'}</DialogTitle>
          <DialogDescription>
            7개 항목을 1점에서 5점 사이로 선택해 주세요.
            {isEdit
              ? ' 수정하면 이전 점수가 변경 이력에 남습니다.'
              : ' 한 버전당 한 번만 평가할 수 있고, 나중에 수정할 수 있습니다.'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {error ? <Alert tone="danger">{error}</Alert> : null}

          {isEdit && existing.revisionCount > 0 ? (
            <p className="text-xs text-fg-subtle">
              이 평가는 {existing.revisionCount}회 수정되었습니다.
            </p>
          ) : null}

          <ul className="flex flex-col gap-3">
            {EVALUATION_CRITERIA.map((criterion) => (
              <li key={criterion}>
                <ScoreRow
                  criterion={criterion}
                  value={scores[criterion]}
                  error={fieldErrors[criterion]}
                  onChange={(value) => setScores((current) => ({ ...current, [criterion]: value }))}
                />
              </li>
            ))}
          </ul>

          <Field
            label="의견"
            htmlFor="evaluation-comment"
            hint="좋았던 점이나 아쉬운 점을 적어 주시면 개선에 도움이 됩니다. (선택)"
            error={fieldErrors.comment}
          >
            <Textarea
              {...fieldAria('evaluation-comment', 'hint', fieldErrors.comment)}
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              rows={4}
              maxLength={2000}
            />
          </Field>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secondary" disabled={pending}>
              취소
            </Button>
          </DialogClose>
          <Button onClick={submit} disabled={pending || missing.length > 0}>
            {pending ? '저장 중…' : missing.length > 0 ? `${missing.length}개 항목 남음` : '저장'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ScoreRow({
  criterion,
  value,
  error,
  onChange,
}: {
  criterion: EvaluationCriterion;
  value: number | undefined;
  error?: string;
  onChange: (value: number) => void;
}) {
  const name = `score-${criterion}`;

  return (
    <fieldset
      className={cn(
        'rounded-card border p-3',
        error ? 'border-danger' : 'border-border',
      )}
    >
      <legend className="px-1 text-sm font-medium text-fg">
        {EVALUATION_CRITERION_LABELS[criterion]}
      </legend>
      <p className="mb-2 text-xs text-fg-muted">{EVALUATION_CRITERION_HELP[criterion]}</p>

      <div className="flex flex-wrap gap-1.5">
        {Array.from({ length: MAX_SCORE - MIN_SCORE + 1 }, (_, index) => MIN_SCORE + index).map(
          (score) => (
            <label
              key={score}
              htmlFor={`${name}-${score}`}
              className={cn(
                'flex cursor-pointer items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-sm transition-colors',
                value === score
                  ? 'border-primary bg-primary text-primary-fg'
                  : 'border-border-strong bg-surface text-fg-muted hover:bg-surface-muted',
              )}
            >
              <input
                id={`${name}-${score}`}
                type="radio"
                name={name}
                className="sr-only"
                // 숫자와 라벨이 별개의 span 이라 접근성 이름이 "4우수"처럼 붙어 읽힌다.
                // 명시적으로 지정해 스크린리더가 "4점 우수"로 읽게 한다.
                aria-label={`${score}점 ${SCORE_LABELS[score]}`}
                checked={value === score}
                onChange={() => onChange(score)}
              />
              <span className="font-semibold tabular-nums">{score}</span>
              {/* 숫자만으로는 의미가 안 잡히므로 라벨을 함께 보여준다. */}
              <span className="text-xs">{SCORE_LABELS[score]}</span>
            </label>
          ),
        )}
      </div>

      {error ? (
        <p role="alert" className="mt-1.5 text-xs font-medium text-danger">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}
