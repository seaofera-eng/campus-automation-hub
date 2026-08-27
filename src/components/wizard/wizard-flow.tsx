'use client';

import { ArrowLeft, ArrowRight, Check, Search, Sparkles, Star } from 'lucide-react';
import Link from 'next/link';
import { useState, useTransition } from 'react';
import { draftDemandAction, suggestToolsAction } from '@/actions/wizard-actions';
import type { ToolSuggestion, WizardDraftResult } from '@/application/wizard/suggest';
import { LandingArtwork } from '@/components/landing/landing-artwork';
import { DemandForm } from '@/components/demands/demand-form';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/field';
import { SignalLine } from '@/components/ui/signal-line';
import type { WorkFrequency } from '@/domain/demand/types';
import { josa } from '@/domain/shared/josa';
import {
  CONSTRAINT_OPTIONS,
  FREQUENCY_OPTIONS,
  INPUT_KINDS,
  OUTPUT_KINDS,
  TASK_KINDS,
  WIZARD_STEPS,
  WIZARD_STEP_COUNT,
  describeAnswers,
  emptyWizardAnswers,
  isStepAnswered,
  type DemandDraft,
  type WizardAnswers,
  type WizardOption,
} from '@/domain/wizard';
import { emptyDemandForm, type DemandFormInput } from '@/lib/validation/demand';
import { cn } from '@/lib/utils/cn';

/**
 * 맞춤 AI 찾기 마법사 (리뷰 2026-08-26 2절 · 디자인 Phase 3).
 *
 * ## 다섯 단계 모두 버튼이다
 *
 * 기존 수요 등록의 문제는 "빈 칸에 자기 업무를 설명하세요"였다. 자기 일을
 * 남에게 설명해 본 적이 없는 사람에게 그건 어려운 숙제다. 그래서 전부
 * **고르는 것**으로 바꿨고, 서술형은 마지막 단계 한 칸만 **선택**으로 남겼다.
 *
 * ## 질문은 그림 안에 있다
 *
 * 받은 그림에 "STEP 3 / 5"와 질문이 그려져 있다. 그래서 같은 문장을 화면에
 * 다시 쓰지 않는다 — 두 번 나오면 어느 쪽을 읽어야 할지 헷갈린다.
 * 대신 화면 낭독기를 위해 `sr-only` 제목을 남기고, 그림의 `alt` 에도 같은
 * 문장을 넣는다. 그림이 안 떠도 질문은 남는다.
 *
 * ## 마지막에 두 갈래
 *
 * 다섯 단계가 끝나면 먼저 **이미 있는 도구**를 보여준다. 있으면 거기서 끝나는
 * 것이 제일 좋은 결말이다 — 같은 도구를 또 만들지 않는 것이 이 플랫폼의
 * 존재 이유다. 맞는 것이 없을 때만 수요 등록으로 넘어간다.
 *
 * ## 상태를 URL 에 두지 않는다
 *
 * 중간에 새로 고치면 처음부터다. 다섯 단계짜리 흐름에 되돌아오기 기능을
 * 붙이면 저장·만료·정리를 다 만들어야 하는데, 2분이면 끝나는 흐름에 그만한
 * 값이 없다.
 */

type Stage = 'STEPS' | 'RESULT' | 'DRAFT';

export function WizardFlow() {
  const [answers, setAnswers] = useState<WizardAnswers>(emptyWizardAnswers);
  const [step, setStep] = useState(1);
  const [stage, setStage] = useState<Stage>('STEPS');
  const [suggestions, setSuggestions] = useState<ToolSuggestion[] | null>(null);
  const [comparedCount, setComparedCount] = useState(0);
  const [draft, setDraft] = useState<WizardDraftResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function toggle(field: 'inputKinds' | 'outputKinds' | 'constraints', value: string) {
    setAnswers((previous) => {
      const current = previous[field];
      const next = current.includes(value)
        ? current.filter((entry) => entry !== value)
        : [...current, value];
      return { ...previous, [field]: next };
    });
  }

  function goNext() {
    setError(null);
    if (step < WIZARD_STEP_COUNT) {
      setStep(step + 1);
      return;
    }

    // 마지막 단계 — 비슷한 도구부터 찾는다.
    startTransition(async () => {
      const result = await suggestToolsAction({ answers });
      if (!result.ok) {
        setError(result.error.message);
        return;
      }
      setSuggestions(result.data.tools);
      setComparedCount(result.data.comparedCount);
      setStage('RESULT');
    });
  }

  function goBack() {
    setError(null);
    if (stage === 'DRAFT') {
      setStage('RESULT');
      return;
    }
    if (stage === 'RESULT') {
      setStage('STEPS');
      return;
    }
    if (step > 1) setStep(step - 1);
  }

  function requestNewTool() {
    setError(null);
    startTransition(async () => {
      const result = await draftDemandAction({ answers });
      if (!result.ok) {
        setError(result.error.message);
        return;
      }
      setDraft(result.data);
      setStage('DRAFT');
    });
  }

  if (stage === 'DRAFT' && draft) {
    return <DraftStage draft={draft} onBack={goBack} />;
  }

  if (stage === 'RESULT' && suggestions) {
    return (
      <ResultStage
        answers={answers}
        suggestions={suggestions}
        comparedCount={comparedCount}
        pending={pending}
        error={error}
        onBack={goBack}
        onRequest={requestNewTool}
      />
    );
  }

  const meta = WIZARD_STEPS[step - 1];
  if (!meta) return null;

  const answered = isStepAnswered(step, answers);

  return (
    <div className="flex flex-col gap-4">
      <WizardIntro />

      {/*
        한 장의 카드로 감싼다.

        전에는 질문·선택지·버튼이 배경 위에 그냥 떠 있어서 어디까지가 이번
        단계인지 경계가 없었다. 테두리를 두르고 머리·본문·바닥을 나누면
        "이 안에서 하나 고르고 다음으로 간다"가 눈으로 읽힌다.
      */}
      <section className="overflow-hidden rounded-card border border-border bg-surface shadow-card">
        <StepHeader step={step} />

        <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[300px_1fr]">
          {/* 그림에 질문이 들어 있다. 화면에는 다시 쓰지 않는다. */}
          <div className="mx-auto flex w-full max-w-[300px] items-center lg:mx-0">
            <h1 className="sr-only">
              {WIZARD_STEP_COUNT}단계 중 {step}단계 — {meta.question}
            </h1>
            {/*
              key 를 단계마다 새로 준다.

              안 주면 React 가 같은 <img> 를 계속 쓰는데, next/image 는 한 번
              그린 뒤에는 src 가 바뀌어도 다시 불러오지 않는다. 그래서 5단계에
              가도 1단계 그림이 그대로 남아 있었다.
            */}
            <LandingArtwork
              key={step}
              slot={`wizard-step-${step}`}
              src={`/landing/wizard-step-${step}.png`}
              label={`STEP ${step} / ${WIZARD_STEP_COUNT} — ${meta.question}`}
              note="질문 왼쪽에 들어갑니다."
              width={1254}
              height={1254}
              priority
            />
          </div>

          <div className="flex min-w-0 flex-col gap-4">
            <p className="text-sm text-fg-muted">{meta.guide}</p>

            {step === 1 ? (
              <OptionGrid
                options={TASK_KINDS}
                selected={answers.taskKind ? [answers.taskKind] : []}
                onPick={(value) => setAnswers((previous) => ({ ...previous, taskKind: value }))}
              />
            ) : null}

            {step === 2 ? (
              <OptionGrid
                options={INPUT_KINDS}
                selected={answers.inputKinds}
                multiple
                onPick={(value) => toggle('inputKinds', value)}
              />
            ) : null}

            {step === 3 ? (
              <OptionGrid
                options={OUTPUT_KINDS}
                selected={answers.outputKinds}
                multiple
                onPick={(value) => toggle('outputKinds', value)}
              />
            ) : null}

            {step === 4 ? (
              <OptionGrid
                options={FREQUENCY_OPTIONS}
                selected={[answers.frequency]}
                onPick={(value) =>
                  setAnswers((previous) => ({ ...previous, frequency: value as WorkFrequency }))
                }
              />
            ) : null}

            {step === 5 ? (
              <div className="flex flex-col gap-5">
                <OptionGrid
                  options={CONSTRAINT_OPTIONS}
                  selected={answers.constraints}
                  multiple
                  onPick={(value) => toggle('constraints', value)}
                />

                {/* 서술형은 여기 하나뿐이고, 선택이다 (리뷰 2절) */}
                <div className="rounded-card border border-border bg-surface-muted p-4">
                  <label htmlFor="wizard-extra-note" className="text-sm font-semibold text-fg">
                    더 알려 주실 내용이 있나요?{' '}
                    <span className="font-normal text-fg-subtle">(선택)</span>
                  </label>
                  <p className="mt-1 mb-2.5 text-sm text-fg-muted">
                    버튼으로 고르기 어려운 내용이 있으면 한두 줄 적어 주세요. 비워 두셔도
                    됩니다.
                  </p>
                  <Textarea
                    id="wizard-extra-note"
                    rows={3}
                    maxLength={1000}
                    value={answers.extraNote}
                    placeholder="예: 학과마다 엑셀 서식이 조금씩 다릅니다."
                    onChange={(event) =>
                      setAnswers((previous) => ({ ...previous, extraNote: event.target.value }))
                    }
                  />
                </div>
              </div>
            ) : null}

            {error ? (
              <Alert tone="danger" title="계속할 수 없습니다">
                {error}
              </Alert>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-surface-muted px-5 py-4 sm:px-6">
          <Button variant="ghost" onClick={goBack} disabled={step === 1 || pending}>
            <ArrowLeft aria-hidden="true" />
            이전
          </Button>

          <div className="flex items-center gap-3">
            {!answered && meta.required ? (
              <span className="text-sm text-fg-subtle">하나 이상 골라 주세요</span>
            ) : null}
            <Button size="lg" onClick={goNext} disabled={(!answered && meta.required) || pending}>
              {step === WIZARD_STEP_COUNT ? (
                <>
                  <Search aria-hidden="true" className={cn(pending && 'animate-pulse')} />
                  {pending ? '찾는 중…' : '맞는 도구 찾기'}
                </>
              ) : (
                <>
                  다음
                  <ArrowRight aria-hidden="true" />
                </>
              )}
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 머리말                                                                      */
/* -------------------------------------------------------------------------- */

function WizardIntro() {
  return (
    <div className="flex items-start gap-3">
      <SignalLine className="min-h-10" />
      <div>
        <h2 className="text-lg font-bold text-fg">맞춤 AI 찾기</h2>
        <p className="mt-0.5 text-sm text-fg-muted">
          질문 다섯 개에 답하면 맞는 도구를 찾아 드립니다. 없으면 그 자리에서 만들어 달라고
          요청할 수 있습니다.
        </p>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 단계 표시                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * 몇 번째인지, 어디까지 왔는지.
 *
 * 막대 다섯 개만 놓았을 때는 "지나온 것"과 "남은 것"이 색으로만 갈렸다.
 * 색만으로 상태를 구분하지 않는다는 규칙(디자인 문서 §14)에 걸리기도 하고,
 * 무엇보다 밋밋했다. 지나온 단계에는 체크를 찍고 지금 단계는 테두리로
 * 띄운다 — 숫자·모양·색 셋이 같은 말을 한다.
 */
function StepHeader({ step }: { step: number }) {
  return (
    <div className="border-b border-border bg-primary-soft/60 px-5 py-4 sm:px-6">
      <ol
        className="flex items-center gap-1.5 sm:gap-2"
        aria-label={`${WIZARD_STEP_COUNT}단계 중 ${step}단계 진행 중`}
      >
        {WIZARD_STEPS.map((entry, index) => {
          const done = entry.step < step;
          const current = entry.step === step;

          return (
            <li key={entry.step} className="flex flex-1 items-center gap-1.5 sm:gap-2">
              <span
                className={cn(
                  'flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-bold transition-colors',
                  done && 'border-primary bg-primary text-primary-fg',
                  current && 'border-primary bg-surface text-primary ring-2 ring-primary/25',
                  !done && !current && 'border-border-strong bg-surface text-fg-subtle',
                )}
                aria-current={current ? 'step' : undefined}
              >
                {done ? <Check className="size-3.5" aria-hidden="true" /> : entry.step}
                <span className="sr-only">
                  {entry.step}단계 {done ? '완료' : current ? '진행 중' : '남음'}
                </span>
              </span>

              {/* 마지막 동그라미 뒤에는 선을 긋지 않는다 */}
              {index < WIZARD_STEPS.length - 1 ? (
                <span
                  className={cn(
                    'h-0.5 flex-1 rounded-full transition-colors',
                    done ? 'bg-primary' : 'bg-border-strong/60',
                  )}
                  aria-hidden="true"
                />
              ) : null}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 선택지 버튼                                                                 */
/* -------------------------------------------------------------------------- */

function OptionGrid({
  options,
  selected,
  multiple = false,
  onPick,
}: {
  options: readonly WizardOption[];
  selected: readonly string[];
  multiple?: boolean;
  onPick: (value: string) => void;
}) {
  return (
    <ul className="grid gap-2.5 sm:grid-cols-2">
      {options.map((option) => {
        const active = selected.includes(option.value);
        return (
          <li key={option.value}>
            <button
              type="button"
              // 여러 개 고르는 칸은 체크박스처럼, 하나만 고르는 칸은 라디오처럼 읽히게 한다.
              role={multiple ? 'checkbox' : 'radio'}
              aria-checked={active}
              onClick={() => onPick(option.value)}
              className={cn(
                'flex h-full w-full items-start gap-3 rounded-card border p-3.5 text-left',
                'transition-[background-color,border-color,box-shadow] duration-150',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
                active
                  ? 'border-primary bg-primary-soft shadow-card'
                  : 'border-border bg-surface hover:border-primary/40 hover:bg-primary-soft/40 hover:shadow-card',
              )}
            >
              {/* 선택 표시는 색만으로 하지 않는다 — 체크 표시를 함께 둔다 */}
              <span
                className={cn(
                  'mt-0.5 flex size-5 shrink-0 items-center justify-center border transition-colors',
                  multiple ? 'rounded-sm' : 'rounded-full',
                  active
                    ? 'border-primary bg-primary text-primary-fg'
                    : 'border-border-strong bg-surface',
                )}
                aria-hidden="true"
              >
                {active ? <Check className="size-3.5" /> : null}
              </span>

              <span className="min-w-0">
                <span
                  className={cn(
                    'block text-sm font-semibold',
                    active ? 'text-primary' : 'text-fg',
                  )}
                >
                  {option.label}
                </span>
                <span className="mt-0.5 block text-xs text-fg-subtle">{option.hint}</span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

/* -------------------------------------------------------------------------- */
/* 결과 — 비슷한 도구                                                          */
/* -------------------------------------------------------------------------- */

function ResultStage({
  answers,
  suggestions,
  comparedCount,
  pending,
  error,
  onBack,
  onRequest,
}: {
  answers: WizardAnswers;
  suggestions: ToolSuggestion[];
  comparedCount: number;
  pending: boolean;
  error: string | null;
  onBack: () => void;
  onRequest: () => void;
}) {
  const found = suggestions.length > 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start gap-3">
        <SignalLine className="min-h-12" />
        <div>
          <span className="text-xs font-bold tracking-wide text-primary">결과</span>
          <h1 className="mt-0.5 text-lg font-bold text-fg">
            {found ? '이런 도구가 이미 있습니다' : '맞는 도구를 찾지 못했습니다'}
          </h1>
          <p className="mt-1 text-sm text-fg-muted">
            {found
              ? `등록된 도구 ${comparedCount}개와 비교해 비슷해 보이는 것을 골랐습니다. 열어 보고 맞는지 확인해 주세요.`
              : `등록된 도구 ${comparedCount}개와 비교했지만 비슷한 것이 없었습니다. 만들어 달라고 요청해 보세요.`}
          </p>
        </div>
      </div>

      <AnswerSummary answers={answers} />

      {found ? (
        <section className="flex flex-col gap-2.5">
          {/* 이 목록이 왜 나왔는지 숨기지 않는다. 퍼센트를 쓰지 않는 이유이기도 하다. */}
          <p className="text-xs text-fg-subtle">
            고르신 내용과 도구 설명의 낱말이 얼마나 겹치는지로 추린 목록입니다. 내용을
            판단한 것이 아니므로 열어 보고 정해 주세요.
          </p>

          <ul className="flex flex-col gap-2.5">
            {suggestions.map((tool) => (
              <li key={tool.toolId}>
                <Link
                  href={`/tools/${tool.toolId}`}
                  className={cn(
                    'flex flex-col gap-2 rounded-card border border-border bg-surface p-5 shadow-card',
                    'transition-[background-color,border-color,box-shadow] duration-150',
                    'hover:border-primary/50 hover:bg-primary-soft/30',
                    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
                  )}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs text-fg-subtle">{tool.categoryName}</span>
                    <h2 className="text-base font-semibold text-fg">{tool.name}</h2>
                  </div>

                  <p className="text-sm text-fg-muted">
                    {tool.summary || '한 줄 소개가 아직 없습니다.'}
                  </p>

                  {tool.keyFeatures.length > 0 ? (
                    <ul className="flex flex-wrap gap-1.5">
                      {tool.keyFeatures.map((feature) => (
                        <li
                          key={feature}
                          className="rounded-sm bg-surface-muted px-2 py-0.5 text-xs text-fg-muted"
                        >
                          {feature}
                        </li>
                      ))}
                    </ul>
                  ) : null}

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-fg-muted">
                    <span>{tool.ownerName}</span>
                    <span className="flex items-center gap-1">
                      <Star className="size-3.5" aria-hidden="true" />
                      {tool.averageOverallScore === null ? (
                        // 평가가 없을 때 0 으로 채우지 않는다
                        <span>평가 없음</span>
                      ) : (
                        <span>
                          {tool.averageOverallScore.toFixed(1)} ({tool.evaluationCount}건)
                        </span>
                      )}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <Card className={cn(!found && 'border-primary/40')}>
        <CardHeader>
          <CardTitle>{found ? '맞는 것이 없나요?' : '만들어 달라고 요청하기'}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-sm text-fg-muted">
            고르신 내용으로 수요 신청서를 대신 작성해 드립니다. 다음 화면에서 확인하고
            고친 뒤 등록하시면 됩니다.
          </p>
          {error ? (
            <Alert tone="danger" title="신청서를 만들지 못했습니다">
              {error}
            </Alert>
          ) : null}
          <Button size="lg" className="w-fit" onClick={onRequest} disabled={pending}>
            <Sparkles aria-hidden="true" className={cn(pending && 'animate-pulse')} />
            {pending ? '신청서 작성 중…' : '수요 신청서 만들기'}
          </Button>
          {pending ? (
            <p className="text-xs text-fg-subtle">
              고르신 내용을 문장으로 다듬는 중입니다. 10초쯤 걸립니다.
            </p>
          ) : null}
        </CardContent>
      </Card>

      <div className="border-t border-border pt-4">
        <Button variant="ghost" onClick={onBack} disabled={pending}>
          <ArrowLeft aria-hidden="true" />
          답을 고치러 돌아가기
        </Button>
      </div>
    </div>
  );
}

function AnswerSummary({ answers }: { answers: WizardAnswers }) {
  const lines = describeAnswers(answers);
  return (
    <div className="rounded-card border border-border bg-surface-muted p-4">
      <h2 className="text-sm font-semibold text-fg">고르신 내용</h2>
      <ul className="mt-2 flex flex-col gap-1 text-sm text-fg-muted">
        {lines.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 초안 확인 후 등록                                                           */
/* -------------------------------------------------------------------------- */

function toFormInput(draft: DemandDraft): DemandFormInput {
  return {
    ...emptyDemandForm(),
    title: draft.title,
    currentWorkDescription: draft.currentWorkDescription,
    mostPainfulStep: draft.mostPainfulStep,
    inputMaterials: draft.inputMaterials,
    desiredOutcome: draft.desiredOutcome,
    workFrequency: draft.frequency,
    requiredFeatures: draft.requiredFeatures,
    expectedBenefit: draft.expectedBenefit,
    containsIdentifiablePersonalData: draft.containsIdentifiablePersonalData,
    containsAcademicOrResearchData: draft.containsAcademicOrResearchData,
    requiresHumanApproval: draft.requiresHumanApproval,
  };
}

function DraftStage({ draft, onBack }: { draft: WizardDraftResult; onBack: () => void }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start gap-3">
        <SignalLine className="min-h-12" />
        <div>
          <span className="text-xs font-bold tracking-wide text-primary">마지막</span>
          <h1 className="mt-0.5 text-lg font-bold text-fg">이대로 등록할까요?</h1>
          <p className="mt-1 text-sm text-fg-muted">
            고치실 곳이 있으면 바로 수정하세요. 아래에서 임시저장하거나 공개할 수 있습니다.
          </p>
        </div>
      </div>

      {/*
        누가 쓴 문장인지 밝힌다. 모델이 다듬은 것과 규칙으로 조립한 것을
        같은 얼굴로 내보내면 안 된다.
      */}
      {draft.draft.source === 'MODEL' && draft.model ? (
        <Alert tone="info" title="AI 가 문장을 다듬었습니다">
          고르신 내용을 <span className="font-mono">{draft.model}</span>
          {josa(draft.model, '이가')} 읽을 만한 문장으로 정리했습니다. 사실이 아닌 부분이
          있으면 고쳐 주세요.
        </Alert>
      ) : (
        <Alert
          tone={draft.modelFailed ? 'warning' : 'info'}
          title={
            draft.modelFailed ? 'AI 정리는 하지 못했습니다' : '고르신 내용으로 정리했습니다'
          }
        >
          {draft.modelFailed
            ? '문장을 다듬는 데 실패해서, 고르신 내용을 그대로 옮겨 적었습니다. 등록에는 문제가 없습니다.'
            : '고르신 내용을 그대로 옮겨 적었습니다. 문장을 다듬으려면 직접 고쳐 주세요.'}
        </Alert>
      )}

      <DemandForm initialForm={toFormInput(draft.draft)} demand={null} />

      <div className="border-t border-border pt-4">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft aria-hidden="true" />
          추천 도구 다시 보기
        </Button>
      </div>
    </div>
  );
}
