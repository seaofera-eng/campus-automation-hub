'use client';

import { Save, Send } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Controller, useForm } from 'react-hook-form';
import type { FieldPath } from 'react-hook-form';
import { publishDemandAction, saveDemandDraftAction } from '@/actions/demand-actions';
import { StringListInput } from '@/components/common/string-list-input';
import { UnsavedChangesGuard } from '@/components/common/unsaved-changes-guard';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Field, Input, NativeSelect, Textarea, fieldAria } from '@/components/ui/field';
import { WORK_FREQUENCIES, WORK_FREQUENCY_LABELS } from '@/domain/demand/types';
import type { DemandStatus } from '@/domain/demand/types';
import type { Department } from '@/domain/identity/types';
import { demandPublishSchema, emptyDemandForm } from '@/lib/validation/demand';
import type { DemandFormInput } from '@/lib/validation/demand';

/**
 * 수요 등록 폼.
 *
 * 도구 등록과 달리 위저드로 나누지 않았다. 수요는 항목이 적고, 여러 화면으로
 * 쪼개면 오히려 쓰기 번거로워진다. 검증 규칙은 도구와 마찬가지로 서버와
 * 같은 Zod 스키마를 쓴다.
 */
export function DemandForm({
  departments,
  initialForm,
  demand,
}: {
  departments: readonly Department[];
  initialForm?: DemandFormInput;
  demand: { id: string; status: DemandStatus } | null;
}) {
  const router = useRouter();
  const [demandId, setDemandId] = useState<string | null>(demand?.id ?? null);
  const [message, setMessage] = useState<{ tone: 'success' | 'danger'; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const form = useForm<DemandFormInput>({
    defaultValues: initialForm ?? emptyDemandForm(),
    mode: 'onBlur',
  });
  const { register, control, formState, getValues, setError, clearErrors } = form;
  const errors = formState.errors;

  function applyServerErrors(fields: Record<string, string> | undefined) {
    if (!fields) return;
    for (const [path, text] of Object.entries(fields)) {
      setError(path.replace(/^form\./, '') as FieldPath<DemandFormInput>, {
        type: 'server',
        message: text,
      });
    }
  }

  function saveDraft(options: { navigate?: boolean } = {}) {
    setMessage(null);
    clearErrors();

    startTransition(async () => {
      const result = await saveDemandDraftAction({
        demandId: demandId ?? undefined,
        form: getValues(),
      });

      if (!result.ok) {
        applyServerErrors(result.error.fields);
        setMessage({ tone: 'danger', text: result.error.message });
        return;
      }

      setDemandId(result.data.demandId);
      form.reset(getValues(), { keepValues: true });

      if (options.navigate) {
        router.push(`/demands/${result.data.demandId}`);
      } else {
        setMessage({ tone: 'success', text: '임시저장했습니다.' });
        router.refresh();
      }
    });
  }

  function publish() {
    setMessage(null);
    clearErrors();

    // 서버와 같은 스키마로 먼저 확인해 어느 칸이 문제인지 바로 표시한다.
    const check = demandPublishSchema.safeParse(getValues());
    if (!check.success) {
      for (const issue of check.error.issues) {
        setError(issue.path[0] as FieldPath<DemandFormInput>, {
          type: 'manual',
          message: issue.message,
        });
      }
      setMessage({
        tone: 'danger',
        text: '공개하려면 빠진 항목을 채워야 합니다. 표시된 칸을 확인해 주세요.',
      });
      return;
    }

    startTransition(async () => {
      // 아직 저장 전이면 먼저 저장한다.
      let targetId = demandId;
      if (!targetId) {
        const saved = await saveDemandDraftAction({ form: getValues() });
        if (!saved.ok) {
          applyServerErrors(saved.error.fields);
          setMessage({ tone: 'danger', text: saved.error.message });
          return;
        }
        targetId = saved.data.demandId;
        setDemandId(targetId);
      }

      const result = await publishDemandAction({ demandId: targetId, form: getValues() });
      if (!result.ok) {
        applyServerErrors(result.error.fields);
        setMessage({ tone: 'danger', text: result.error.message });
        return;
      }

      form.reset(getValues(), { keepValues: true });
      router.push(`/demands/${targetId}`);
    });
  }

  const isPublished = demand !== null && demand.status !== 'DRAFT';

  return (
    <form onSubmit={(event) => event.preventDefault()} className="flex flex-col gap-4">
      <UnsavedChangesGuard enabled={formState.isDirty && !pending} />

      {message ? (
        <Alert tone={message.tone === 'success' ? 'success' : 'danger'}>{message.text}</Alert>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>어떤 업무가 번거로우신가요</CardTitle>
          <p className="text-sm text-fg-muted">
            개발자가 &quot;내가 만들 수 있는 일인가&quot;를 판단할 수 있을 만큼만 적어 주시면
            됩니다.
          </p>
        </CardHeader>

        <CardContent className="flex flex-col gap-4">
          <Field label="수요 제목" htmlFor="title" required error={errors.title?.message}>
            <Input
              {...register('title')}
              {...fieldAria('title', undefined, errors.title?.message)}
              maxLength={150}
              placeholder="예: 학과별 졸업요건 충족 여부 확인 자동화"
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="요청 부서"
              htmlFor="departmentId"
              required
              error={errors.departmentId?.message}
            >
              <NativeSelect
                {...register('departmentId')}
                {...fieldAria('departmentId', undefined, errors.departmentId?.message)}
              >
                <option value="">선택해 주세요</option>
                {departments.map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.name}
                  </option>
                ))}
              </NativeSelect>
            </Field>

            <Field label="업무 주기" htmlFor="workFrequency">
              <NativeSelect {...register('workFrequency')} {...fieldAria('workFrequency')}>
                {WORK_FREQUENCIES.map((frequency) => (
                  <option key={frequency} value={frequency}>
                    {WORK_FREQUENCY_LABELS[frequency]}
                  </option>
                ))}
              </NativeSelect>
            </Field>
          </div>

          <Field
            label="현재 업무 처리 방식"
            htmlFor="currentWorkDescription"
            required
            hint="지금 이 일을 어떤 순서로 하고 계신지 적어 주세요."
            error={errors.currentWorkDescription?.message}
          >
            <Textarea
              {...register('currentWorkDescription')}
              {...fieldAria('currentWorkDescription', 'hint', errors.currentWorkDescription?.message)}
              rows={4}
            />
          </Field>

          <Field
            label="가장 번거로운 단계"
            htmlFor="mostPainfulStep"
            required
            hint="어디에서 시간이 가장 많이 드나요?"
            error={errors.mostPainfulStep?.message}
          >
            <Textarea
              {...register('mostPainfulStep')}
              {...fieldAria('mostPainfulStep', 'hint', errors.mostPainfulStep?.message)}
              rows={3}
            />
          </Field>

          <div className="grid gap-4 lg:grid-cols-2">
            <Field
              label="다루는 자료"
              htmlFor="inputMaterials"
              hint="엑셀, 문서, 시스템 화면 등"
              error={errors.inputMaterials?.message}
            >
              <Textarea
                {...register('inputMaterials')}
                {...fieldAria('inputMaterials', 'hint')}
                rows={3}
              />
            </Field>

            <Field
              label="원하는 결과물"
              htmlFor="desiredOutcome"
              required
              error={errors.desiredOutcome?.message}
            >
              <Textarea
                {...register('desiredOutcome')}
                {...fieldAria('desiredOutcome', undefined, errors.desiredOutcome?.message)}
                rows={3}
              />
            </Field>
          </div>

          <Field
            label="사용 중인 시스템"
            htmlFor="systemsInUse"
            hint="연동이 필요할 수 있는 교내 시스템이 있으면 적어 주세요."
            error={errors.systemsInUse?.message}
          >
            <Input {...register('systemsInUse')} {...fieldAria('systemsInUse', 'hint')} />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>필요한 기능과 규모</CardTitle>
        </CardHeader>

        <CardContent className="flex flex-col gap-4">
          <Field
            label="꼭 필요한 기능"
            htmlFor="requiredFeatures-input"
            required
            error={errors.requiredFeatures?.message}
          >
            <Controller
              control={control}
              name="requiredFeatures"
              render={({ field }) => (
                <StringListInput
                  id="requiredFeatures-input"
                  values={field.value}
                  onChange={field.onChange}
                  placeholder="기능을 적고 Enter"
                />
              )}
            />
          </Field>

          <Field label="있으면 좋은 기능" htmlFor="optionalFeatures-input">
            <Controller
              control={control}
              name="optionalFeatures"
              render={({ field }) => (
                <StringListInput
                  id="optionalFeatures-input"
                  values={field.value}
                  onChange={field.onChange}
                  placeholder="기능을 적고 Enter"
                />
              )}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="예상 사용 인원" htmlFor="expectedUserCount">
              <Controller
                control={control}
                name="expectedUserCount"
                render={({ field }) => (
                  <Input
                    id="expectedUserCount"
                    type="number"
                    min={0}
                    value={field.value === null ? '' : String(field.value)}
                    onChange={(event) =>
                      field.onChange(event.target.value === '' ? null : Number(event.target.value))
                    }
                    placeholder="모르면 비워 두세요"
                  />
                )}
              />
            </Field>

            <Field
              label="희망 완료 시기"
              htmlFor="desiredCompletionDate"
              error={errors.desiredCompletionDate?.message}
            >
              <Input
                {...register('desiredCompletionDate')}
                {...fieldAria('desiredCompletionDate', undefined, errors.desiredCompletionDate?.message)}
                type="date"
              />
            </Field>
          </div>

          <Field
            label="기대 효과"
            htmlFor="expectedBenefit"
            hint="이 업무가 자동화되면 무엇이 좋아지나요?"
            error={errors.expectedBenefit?.message}
          >
            <Textarea
              {...register('expectedBenefit')}
              {...fieldAria('expectedBenefit', 'hint')}
              rows={3}
            />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>다루는 정보</CardTitle>
          <p className="text-sm text-fg-muted">
            개인정보나 학사·연구 정보가 포함되면 검토 단계가 더 꼼꼼해집니다.
          </p>
        </CardHeader>

        <CardContent className="flex flex-col gap-2">
          <Controller
            control={control}
            name="containsPersonalData"
            render={({ field }) => (
              <label
                htmlFor="containsPersonalData"
                className="flex cursor-pointer items-center gap-3 rounded-md border border-border p-3 text-sm transition-colors hover:bg-surface-muted"
              >
                <Checkbox
                  id="containsPersonalData"
                  checked={field.value}
                  onCheckedChange={(value) => field.onChange(value === true)}
                />
                <span className="font-medium text-fg">개인정보가 포함됩니다</span>
              </label>
            )}
          />

          <Controller
            control={control}
            name="containsAcademicOrResearchData"
            render={({ field }) => (
              <label
                htmlFor="containsAcademicOrResearchData"
                className="flex cursor-pointer items-center gap-3 rounded-md border border-border p-3 text-sm transition-colors hover:bg-surface-muted"
              >
                <Checkbox
                  id="containsAcademicOrResearchData"
                  checked={field.value}
                  onCheckedChange={(value) => field.onChange(value === true)}
                />
                <span className="font-medium text-fg">학사 또는 연구 정보가 포함됩니다</span>
              </label>
            )}
          />

          <Controller
            control={control}
            name="requiresHumanApproval"
            render={({ field }) => (
              <label
                htmlFor="requiresHumanApproval"
                className="flex cursor-pointer items-center gap-3 rounded-md border border-border p-3 text-sm transition-colors hover:bg-surface-muted"
              >
                <Checkbox
                  id="requiresHumanApproval"
                  checked={field.value}
                  onCheckedChange={(value) => field.onChange(value === true)}
                />
                <span className="font-medium text-fg">결과를 사람이 최종 확인해야 합니다</span>
              </label>
            )}
          />
        </CardContent>

        <CardFooter className="flex-wrap justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => saveDraft()} disabled={pending}>
            <Save aria-hidden="true" />
            {pending ? '저장 중…' : '임시저장'}
          </Button>

          {!isPublished ? (
            <Button type="button" onClick={publish} disabled={pending}>
              <Send aria-hidden="true" />
              수요 공개
            </Button>
          ) : (
            <Button type="button" onClick={() => saveDraft({ navigate: true })} disabled={pending}>
              저장하고 돌아가기
            </Button>
          )}
        </CardFooter>
      </Card>

      <p className="text-xs text-fg-muted">
        공개하면 교내 구성원이 이 수요를 볼 수 있고, 개발자가 참여를 신청하거나 검토자가 기존
        도구를 연결해 줍니다.
      </p>
    </form>
  );
}
