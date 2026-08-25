'use client';

import { AlertTriangle, Save } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { saveRiskChecklistAction } from '@/actions/review-actions';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Field, Input, Textarea, fieldAria } from '@/components/ui/field';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { RISK_FACTORS, suggestRiskLevel } from '@/domain/tool/risk-checklist-rules';
import type { RiskChecklistItem } from '@/domain/tool/risk-checklist-rules';
import { RISK_LEVELS, RISK_LEVEL_LABELS } from '@/domain/tool/types';
import type { RiskLevel } from '@/domain/tool/types';
import { cn } from '@/lib/utils/cn';
import { formatDateTime } from '@/lib/utils/datetime';

/**
 * 위험 체크리스트 (요구사항 15번).
 *
 * 14개 항목을 **사람이 직접 판단해서** 체크한다. 자동 산정하지 않는다.
 * 화면에 "참고용 제안" 등급이 보이지만, 저장되는 값은 항상 검토자가 고른 등급이다.
 * 제안값은 체크된 항목 수를 세는 단순 규칙이며 AI 평가가 아니다.
 */
export function RiskChecklistForm({
  toolId,
  initialItems,
  initialRiskLevel,
  initialRationale,
  reviewedBy,
  reviewedAt,
}: {
  toolId: string;
  initialItems: RiskChecklistItem[];
  initialRiskLevel: RiskLevel | null;
  initialRationale: string;
  reviewedBy: string | null;
  reviewedAt: string | null;
}) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [riskLevel, setRiskLevel] = useState<RiskLevel>(initialRiskLevel ?? 'LOW');
  const [rationale, setRationale] = useState(initialRationale);
  const [message, setMessage] = useState<{ tone: 'success' | 'danger'; text: string } | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();

  const suggestion = suggestRiskLevel(items);
  const appliedCount = items.filter((item) => item.applies).length;
  const criticalApplied = items.filter(
    (item) =>
      item.applies && RISK_FACTORS.find((factor) => factor.code === item.code)?.criticalCandidate,
  );

  function update(index: number, patch: Partial<RiskChecklistItem>) {
    setItems((current) =>
      current.map((item, position) => (position === index ? { ...item, ...patch } : item)),
    );
  }

  function submit() {
    setMessage(null);
    setFieldErrors({});

    startTransition(async () => {
      const result = await saveRiskChecklistAction({ toolId, items, riskLevel, rationale });
      if (result.ok) {
        setMessage({ tone: 'success', text: '위험 체크리스트를 저장했습니다.' });
        router.refresh();
        return;
      }
      setFieldErrors(result.error.fields ?? {});
      setMessage({ tone: 'danger', text: result.error.message });
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>위험 체크리스트</CardTitle>
        <p className="text-sm text-fg-muted">
          14개 항목을 확인하고 해당되는 것을 표시해 주세요. 등급은 검토자가 직접 정합니다.
        </p>
        {reviewedBy && reviewedAt ? (
          <p className="text-xs text-fg-subtle">
            마지막 작성: {reviewedBy} ·{' '}
            {formatDateTime(reviewedAt)}
          </p>
        ) : null}
      </CardHeader>

      <CardContent className="flex flex-col gap-5">
        {message ? (
          <Alert tone={message.tone === 'success' ? 'success' : 'danger'}>{message.text}</Alert>
        ) : null}

        <ol className="flex flex-col gap-2">
          {RISK_FACTORS.map((factor, index) => {
            const item = items[index];
            if (!item) return null;
            const noteError = fieldErrors[`items.${index}.note`];

            return (
              <li
                key={factor.code}
                className={cn(
                  'rounded-card border p-4',
                  item.applies
                    ? factor.criticalCandidate
                      ? 'border-danger/40 bg-danger-soft/50'
                      : 'border-warning/40 bg-warning-soft/40'
                    : 'border-border',
                )}
              >
                <label
                  htmlFor={`factor-${factor.code}`}
                  className="flex cursor-pointer items-start gap-3"
                >
                  <Checkbox
                    id={`factor-${factor.code}`}
                    checked={item.applies}
                    onCheckedChange={(value) => update(index, { applies: value === true })}
                    className="mt-0.5"
                  />
                  <span className="min-w-0">
                    <span className="flex flex-wrap items-center gap-1.5 text-sm font-medium text-fg">
                      {index + 1}. {factor.label}
                      {factor.criticalCandidate ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-danger/30 bg-danger-soft px-2 py-0.5 text-xs text-danger">
                          <AlertTriangle className="size-3" aria-hidden="true" />
                          중대 위험 후보
                        </span>
                      ) : null}
                    </span>
                    <span className="mt-0.5 block text-sm text-fg-muted">{factor.question}</span>
                  </span>
                </label>

                {item.applies ? (
                  <div className="mt-3 pl-7">
                    <p className="mb-1.5 text-xs text-fg-muted">
                      권장 통제: {factor.suggestedControl}
                    </p>
                    <Field
                      label="적용한 통제 방안"
                      htmlFor={`note-${factor.code}`}
                      required
                      error={noteError}
                    >
                      <Input
                        {...fieldAria(`note-${factor.code}`, undefined, noteError)}
                        value={item.note}
                        onChange={(event) => update(index, { note: event.target.value })}
                        placeholder="어떤 조치를 확인했는지 적어 주세요"
                      />
                    </Field>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ol>

        <div className="rounded-card border border-border bg-surface-muted p-4">
          <p className="text-sm text-fg">
            해당 항목 {appliedCount}개 (중대 위험 후보 {criticalApplied.length}개)
          </p>
          <p className="mt-1 text-xs text-fg-muted">
            참고용 제안 등급: <strong>{RISK_LEVEL_LABELS[suggestion]}</strong> — 체크된 항목 수를
            세는 단순 규칙이며 AI 분석 결과가 아닙니다. 최종 등급은 검토자가 직접 정합니다.
          </p>
        </div>

        <fieldset>
          <legend className="mb-2 text-sm font-medium text-fg">
            최종 위험 등급 <span className="text-danger">*</span>
          </legend>
          <RadioGroup
            value={riskLevel}
            onValueChange={(value) => setRiskLevel(value as RiskLevel)}
            className="flex flex-wrap gap-2"
          >
            {RISK_LEVELS.map((level) => (
              <label
                key={level}
                htmlFor={`risk-${level}`}
                className={cn(
                  'flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors',
                  riskLevel === level
                    ? 'border-primary bg-primary-soft text-primary'
                    : 'border-border hover:bg-surface-muted',
                )}
              >
                <RadioGroupItem value={level} id={`risk-${level}`} />
                {RISK_LEVEL_LABELS[level]}
              </label>
            ))}
          </RadioGroup>

          {riskLevel === 'CRITICAL' ? (
            <Alert tone="danger" className="mt-3" title="매우 높음으로 저장하면">
              이 도구는 시범운영과 정식 승인으로 넘어갈 수 없습니다. 위험 요소를 낮추고 다시
              평가하거나, 개발자에게 보완을 요청해 주세요.
            </Alert>
          ) : null}
        </fieldset>

        <Field
          label="등급 판단 근거"
          htmlFor="rationale"
          required
          hint="왜 이 등급으로 정했는지 10자 이상 적어 주세요. 나중에 근거를 확인할 수 있어야 합니다."
          error={fieldErrors.rationale}
        >
          <Textarea
            {...fieldAria('rationale', 'hint', fieldErrors.rationale)}
            value={rationale}
            onChange={(event) => setRationale(event.target.value)}
            rows={3}
          />
        </Field>
      </CardContent>

      <CardFooter className="justify-end">
        <Button type="button" onClick={submit} disabled={pending}>
          <Save aria-hidden="true" />
          {pending ? '저장 중…' : '체크리스트 저장'}
        </Button>
      </CardFooter>
    </Card>
  );
}
