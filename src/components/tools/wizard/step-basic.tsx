'use client';

import { Controller } from 'react-hook-form';
import { StringListInput } from '@/components/common/string-list-input';
import { Field, Input, NativeSelect, Textarea, fieldAria } from '@/components/ui/field';
import { VISIBILITY_SCOPES, VISIBILITY_SCOPE_LABELS } from '@/domain/tool/types';
import { StepSection, type StepProps } from './shared';

export function StepBasic({ form, data }: StepProps) {
  const { register, control, formState } = form;
  const errors = formState.errors;

  return (
    <div className="flex flex-col gap-6">
      <StepSection title="도구 식별 정보">
        <Field
          label="도구 이름"
          htmlFor="name"
          required
          hint="같은 이름의 도구가 이미 있으면 등록되지 않습니다. 무엇을 하는 도구인지 드러나게 지어 주세요."
          error={errors.name?.message}
        >
          <Input
            {...register('name')}
            {...fieldAria('name', 'hint', errors.name?.message)}
            maxLength={120}
            placeholder="예: 학사 규정 검색 챗봇"
          />
        </Field>

        <Field
          label="한 줄 소개"
          htmlFor="summary"
          required
          hint="목록에서 이 문장으로 도구를 구분합니다."
          error={errors.summary?.message}
        >
          <Input
            {...register('summary')}
            {...fieldAria('summary', 'hint', errors.summary?.message)}
            maxLength={300}
            placeholder="예: 학사 규정 문서를 검색해 근거 조항과 함께 답변합니다."
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="카테고리" htmlFor="categoryId" required error={errors.categoryId?.message}>
            <NativeSelect
              {...register('categoryId')}
              {...fieldAria('categoryId', undefined, errors.categoryId?.message)}
            >
              <option value="">선택해 주세요</option>
              {data.categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </NativeSelect>
          </Field>

          <Field
            label="담당 부서"
            htmlFor="departmentId"
            required
            error={errors.departmentId?.message}
          >
            <NativeSelect
              {...register('departmentId')}
              {...fieldAria('departmentId', undefined, errors.departmentId?.message)}
            >
              <option value="">선택해 주세요</option>
              {data.departments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name}
                </option>
              ))}
            </NativeSelect>
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="운영 책임자"
            htmlFor="operationsManagerUserId"
            hint="장애나 문의가 생겼을 때 연락할 사람입니다."
            error={errors.operationsManagerUserId?.message}
          >
            <NativeSelect
              {...register('operationsManagerUserId')}
              {...fieldAria('operationsManagerUserId', 'hint')}
            >
              <option value="">지정하지 않음</option>
              {data.people.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.name}
                  {person.departmentName ? ` (${person.departmentName})` : ''}
                </option>
              ))}
            </NativeSelect>
          </Field>

          <Field
            label="공개 범위"
            htmlFor="visibility"
            hint="누구에게 목록에 보일지 정합니다."
            error={errors.visibility?.message}
          >
            <NativeSelect {...register('visibility')} {...fieldAria('visibility', 'hint')}>
              {VISIBILITY_SCOPES.map((scope) => (
                <option key={scope} value={scope}>
                  {VISIBILITY_SCOPE_LABELS[scope]}
                </option>
              ))}
            </NativeSelect>
          </Field>
        </div>

        <Field
          label="태그"
          htmlFor="tags-input"
          hint="검색에 쓰입니다. 예: 챗봇, 규정, 학사"
          error={errors.tags?.message}
        >
          <Controller
            control={control}
            name="tags"
            render={({ field }) => (
              <StringListInput
                id="tags-input"
                values={field.value}
                onChange={field.onChange}
                placeholder="태그를 입력하고 Enter"
                maxLength={30}
              />
            )}
          />
        </Field>
      </StepSection>

      <StepSection
        title="무엇을 위한 도구인가"
        description="검토자가 필요성을 판단하는 근거가 됩니다."
      >
        <Field
          label="도구 설명"
          htmlFor="description"
          required
          hint="이 도구가 무엇을 하는지 처음 보는 사람도 알 수 있게 적어 주세요."
          error={errors.description?.message}
        >
          <Textarea
            {...register('description')}
            {...fieldAria('description', 'hint', errors.description?.message)}
            rows={4}
          />
        </Field>

        <Field
          label="해결하려는 업무 문제"
          htmlFor="problemStatement"
          required
          hint="지금 어떤 점이 불편하거나 오래 걸리는지 구체적으로 적어 주세요."
          error={errors.problemStatement?.message}
        >
          <Textarea
            {...register('problemStatement')}
            {...fieldAria('problemStatement', 'hint', errors.problemStatement?.message)}
            rows={4}
            placeholder="예: 학사 규정 문의가 하루 20건씩 들어오는데, 담당자가 매번 규정집을 찾아 답변하느라 건당 10분씩 걸립니다."
          />
        </Field>
      </StepSection>
    </div>
  );
}
