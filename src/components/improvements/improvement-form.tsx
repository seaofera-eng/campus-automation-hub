'use client';

import { MessageSquarePlus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { createImprovementAction } from '@/actions/improvement-actions';
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
import { Field, Input, NativeSelect, Textarea, fieldAria } from '@/components/ui/field';
import {
  IMPACT_LEVELS,
  IMPACT_LEVEL_LABELS,
  IMPROVEMENT_TYPES,
  IMPROVEMENT_TYPE_LABELS,
  URGENCY_LEVELS,
  URGENCY_LEVEL_LABELS,
} from '@/domain/improvement/types';
import type { ImpactLevel, ImprovementType, UrgencyLevel } from '@/domain/improvement/types';

/** 개선 요청 등록. 도구 상세와 개선 요청 목록 양쪽에서 쓴다. */
export function ImprovementForm({
  toolId,
  toolName,
  triggerLabel = '개선 요청',
}: {
  toolId: string;
  toolName: string;
  triggerLabel?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [requestType, setRequestType] = useState<ImprovementType>('USABILITY');
  const [detail, setDetail] = useState('');
  const [businessImpact, setBusinessImpact] = useState<ImpactLevel>('MEDIUM');
  const [urgency, setUrgency] = useState<UrgencyLevel>('MEDIUM');
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(null);
    setFieldErrors({});

    startTransition(async () => {
      const result = await createImprovementAction({
        toolId,
        title,
        requestType,
        detail,
        businessImpact,
        urgency,
      });

      if (result.ok) {
        setOpen(false);
        setTitle('');
        setDetail('');
        router.push(`/improvements/${result.data.improvementId}`);
        return;
      }
      setFieldErrors(result.error.fields ?? {});
      setError(result.error.message);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary">
          <MessageSquarePlus aria-hidden="true" />
          {triggerLabel}
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>개선 요청</DialogTitle>
          <DialogDescription>
            &apos;{toolName}&apos; 사용 중 불편하거나 필요한 점을 알려 주세요. 도구 담당자와
            개발자에게 전달됩니다.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {error ? <Alert tone="danger">{error}</Alert> : null}

          <Field label="제목" htmlFor="improvement-title" required error={fieldErrors.title}>
            <Input
              {...fieldAria('improvement-title', undefined, fieldErrors.title)}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={150}
              placeholder="예: 결과 파일 이름에 날짜를 넣어 주세요"
            />
          </Field>

          <Field label="요청 유형" htmlFor="improvement-type" required>
            <NativeSelect
              id="improvement-type"
              value={requestType}
              onChange={(event) => setRequestType(event.target.value as ImprovementType)}
            >
              {IMPROVEMENT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {IMPROVEMENT_TYPE_LABELS[type]}
                </option>
              ))}
            </NativeSelect>
          </Field>

          <Field
            label="상세 내용"
            htmlFor="improvement-detail"
            required
            hint="어떤 상황에서 무엇이 불편했는지 구체적으로 적어 주시면 처리가 빨라집니다."
            error={fieldErrors.detail}
          >
            <Textarea
              {...fieldAria('improvement-detail', 'hint', fieldErrors.detail)}
              value={detail}
              onChange={(event) => setDetail(event.target.value)}
              rows={5}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="업무 영향도" htmlFor="improvement-impact">
              <NativeSelect
                id="improvement-impact"
                value={businessImpact}
                onChange={(event) => setBusinessImpact(event.target.value as ImpactLevel)}
              >
                {IMPACT_LEVELS.map((level) => (
                  <option key={level} value={level}>
                    {IMPACT_LEVEL_LABELS[level]}
                  </option>
                ))}
              </NativeSelect>
            </Field>

            <Field label="시급도" htmlFor="improvement-urgency">
              <NativeSelect
                id="improvement-urgency"
                value={urgency}
                onChange={(event) => setUrgency(event.target.value as UrgencyLevel)}
              >
                {URGENCY_LEVELS.map((level) => (
                  <option key={level} value={level}>
                    {URGENCY_LEVEL_LABELS[level]}
                  </option>
                ))}
              </NativeSelect>
            </Field>
          </div>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secondary" disabled={pending}>
              취소
            </Button>
          </DialogClose>
          <Button
            onClick={submit}
            disabled={pending || title.trim().length < 2 || detail.trim().length < 10}
          >
            {pending ? '등록 중…' : '요청 등록'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
