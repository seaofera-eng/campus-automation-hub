'use client';

import {
  ArrowLeft,
  ArrowRight,
  Check,
  ClipboardCheck,
  Copy,
  FileSearch,
  MessageSquarePlus,
  ShieldAlert,
  UserCheck,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import type React from 'react';
import { addReviewCommentAction, assignReviewerAction } from '@/actions/review-actions';
import { StatusTransitionDialog } from '@/components/tools/status-transition-dialog';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Field, Textarea, fieldAria } from '@/components/ui/field';
import type { TransitionRule } from '@/domain/tool/status-machine';
import type { ToolStatus } from '@/domain/tool/types';
import { cn } from '@/lib/utils/cn';

/**
 * 검토 마법사 (리뷰 2026-08-29 5절).
 *
 * "검토 상세 페이지가 여전히 문제가 많음. '검토 시작'이 안되고 있음.
 *  미검토와 검토중인 건들에 대해서 검토 프로세스를 친절하게 마법사 형태로
 *  바꾸고, 단계별로 검토자가 확인하면서 최종 승인하는 방식으로 수정했으면
 *  좋겠음."
 *
 * ## 왜 한 화면에 다 두면 안 되나
 *
 * 전에는 카드 여섯 장이 세로로 쌓여 있었다. 접어 두는 것으로 길이는 줄었지만
 * **순서가 없다는 문제는 그대로**였다. 검토자가 무엇을 먼저 보고 무엇을 마지막에
 * 판단해야 하는지 화면이 말해 주지 않으니, 맨 아래 승인 버튼으로 바로 내려가는
 * 것을 막을 방법이 없었다.
 *
 * 마법사는 그 순서를 강제한다. 한 번에 한 가지만 보여 주고, **확인했다고
 * 표시해야 다음으로 넘어간다.** 마지막 판단이 앞의 네 단계를 딛고 서게 된다.
 *
 * ## 확인 표시는 기록이 아니다
 *
 * 각 단계의 "확인했습니다"는 화면 안에서만 산다. 새로 고치면 사라진다.
 * 저장하려면 저장소 양쪽(DEMO·Supabase)에 단계별 확인 기록을 새로 만들어야
 * 하는데, 지금 필요한 것은 **검토자가 건너뛰지 않게 하는 것**이지 건너뛰지
 * 않았다는 증거가 아니다. 남는 기록은 지금까지와 같다 — 위험 체크리스트와
 * 상태 변경 이력.
 *
 * ## 미검토와 검토 중을 한 흐름으로 잇는다
 *
 * 전에는 '검토 시작'과 '이 도구 검토 맡기' 두 버튼이 거의 같은 일을 했다.
 * 게다가 '검토 시작'은 상태만 바꾸고 **배정을 만들지 않아서**, 눌러도 검토자가
 * 비어 있는 도구가 생겼다. 여기서는 하나로 합친다 — 시작하면 배정까지 된다.
 */

interface StepMeta {
  title: string;
  guide: string;
  icon: LucideIcon;
}

const STEPS: readonly StepMeta[] = [
  {
    title: '어떤 도구인가',
    guide: '무엇을 하는 도구이고 어떤 데이터를 다루는지 먼저 봅니다.',
    icon: FileSearch,
  },
  {
    title: '이미 있는 도구인가',
    guide: '비슷한 도구가 이미 등록되어 있는지 확인합니다.',
    icon: Copy,
  },
  {
    title: '등록 내용이 맞는가',
    guide: '적어 낸 내용에 빠지거나 앞뒤가 안 맞는 곳이 없는지 봅니다.',
    icon: ClipboardCheck,
  },
  {
    title: '얼마나 위험한가',
    guide: '위험 요소를 확인하고 체크리스트를 작성합니다.',
    icon: ShieldAlert,
  },
  {
    title: '판단',
    guide: '앞의 네 단계를 근거로 결정합니다.',
    icon: Check,
  },
];

const STEP_COUNT = STEPS.length;

/** 확인 표시를 받는 단계 (읽고 넘어가는 단계). 4단계는 체크리스트 저장이 대신한다. */
const CONFIRM_STEPS = [1, 2, 3] as const;

export function ReviewWizard({
  toolId,
  status,
  ownerName,
  assigneeName,
  canAssignSelf,
  hasChecklist,
  transitions,
  overview,
  duplicate,
  quality,
  risk,
  recap,
}: {
  toolId: string;
  status: ToolStatus;
  ownerName: string;
  assigneeName: string | null;
  canAssignSelf: boolean;
  hasChecklist: boolean;
  transitions: readonly TransitionRule[];
  overview: React.ReactNode;
  duplicate: React.ReactNode;
  quality: React.ReactNode;
  risk: React.ReactNode;
  recap: React.ReactNode;
}) {
  const [step, setStep] = useState(1);
  const [confirmed, setConfirmed] = useState<Record<number, boolean>>({});

  // 아직 검토를 시작하지 않았다. 단계를 보여 주기 전에 맡는 것부터 한다.
  if (status === 'SUBMITTED') {
    return <StartPanel toolId={toolId} ownerName={ownerName} canAssignSelf={canAssignSelf} />;
  }

  const meta = STEPS[step - 1];
  if (!meta) return null;

  const needsConfirm = (CONFIRM_STEPS as readonly number[]).includes(step);
  const canGoNext = step === 4 ? hasChecklist : !needsConfirm || confirmed[step] === true;

  return (
    <div className="flex flex-col gap-4">
      {/* 남이 맡고 있는 건이면 먼저 알린다. 다 읽고 나서 알면 늦다. */}
      {assigneeName === null ? (
        <Alert tone="warning" title="검토자가 지정되지 않은 도구입니다">
          아래에서 확인은 할 수 있지만, 판단을 남기려면 검토를 맡아 주세요.
        </Alert>
      ) : null}

      <section className="overflow-hidden rounded-card border border-border bg-surface shadow-card">
        <StepHeader step={step} onJump={setStep} />

        <div className="flex flex-col gap-4 p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-card bg-primary-soft text-primary">
              <meta.icon className="size-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-fg">
                <span className="text-fg-subtle">{step}단계 · </span>
                {meta.title}
              </h2>
              <p className="mt-0.5 text-sm text-fg-muted">{meta.guide}</p>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            {step === 1 ? overview : null}
            {step === 2 ? duplicate : null}
            {step === 3 ? quality : null}
            {step === 4 ? risk : null}
            {step === 5 ? (
              <DecisionStep
                toolId={toolId}
                transitions={transitions}
                hasChecklist={hasChecklist}
                recap={recap}
              />
            ) : null}
          </div>

          {/*
            확인 표시.

            읽고 넘어가는 단계에만 둔다. 4단계는 체크리스트를 저장해야 넘어가고,
            5단계는 판단 자체가 끝이라 확인할 것이 없다.
          */}
          {needsConfirm ? (
            <label
              htmlFor={`confirm-${step}`}
              className={cn(
                'flex cursor-pointer items-center gap-3 rounded-card border p-4 transition-colors',
                confirmed[step]
                  ? 'border-success/40 bg-success-soft/60'
                  : 'border-border-strong bg-surface-muted hover:bg-surface',
              )}
            >
              <Checkbox
                id={`confirm-${step}`}
                checked={confirmed[step] === true}
                onCheckedChange={(value) =>
                  setConfirmed((current) => ({ ...current, [step]: value === true }))
                }
              />
              <span className="text-sm font-medium text-fg">
                {meta.title} — 확인했습니다
              </span>
            </label>
          ) : null}

          {step === 4 && !hasChecklist ? (
            <Alert tone="info" title="체크리스트를 저장해야 다음으로 넘어갑니다">
              14개 항목을 확인하고 등급과 근거를 적은 뒤 &apos;체크리스트 저장&apos;을 눌러
              주세요.
            </Alert>
          ) : null}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-border bg-surface-muted px-5 py-4 sm:px-6">
          <Button
            type="button"
            variant="secondary"
            onClick={() => setStep((current) => Math.max(1, current - 1))}
            disabled={step === 1}
          >
            <ArrowLeft aria-hidden="true" />
            이전
          </Button>

          <span className="text-sm text-fg-subtle">
            {STEP_COUNT}단계 중 {step}단계
          </span>

          {step < STEP_COUNT ? (
            <Button
              type="button"
              onClick={() => setStep((current) => Math.min(STEP_COUNT, current + 1))}
              disabled={!canGoNext}
            >
              다음
              <ArrowRight aria-hidden="true" />
            </Button>
          ) : (
            <span className="text-sm text-fg-subtle">마지막 단계</span>
          )}
        </div>
      </section>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 시작 화면 — 미검토(SUBMITTED)                                                */
/* -------------------------------------------------------------------------- */

/**
 * 검토를 맡는 것과 검토 단계로 넘기는 것을 한 번에 한다.
 *
 * 전에는 '검토 시작' 버튼이 상태만 `검토 중` 으로 바꾸고 배정을 만들지 않았다.
 * 그러면 검토자 칸이 빈 채로 검토 중인 도구가 생긴다. 배정 쪽 경로를 쓰면
 * 배정과 상태 변경이 함께 일어난다.
 */
function StartPanel({
  toolId,
  ownerName,
  canAssignSelf,
}: {
  toolId: string;
  ownerName: string;
  canAssignSelf: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function start() {
    setError(null);
    startTransition(async () => {
      const result = await assignReviewerAction({ toolId, reviewerUserId: '' });
      if (result.ok) {
        router.refresh();
        return;
      }
      setError(result.error.message);
    });
  }

  return (
    <section className="overflow-hidden rounded-card border border-border bg-surface shadow-card">
      <div className="border-b border-border bg-primary-soft/60 px-5 py-4 sm:px-6">
        <h2 className="text-lg font-bold text-fg">아직 검토를 시작하지 않았습니다</h2>
        <p className="mt-0.5 text-sm text-fg-muted">
          {ownerName}님이 등록 신청한 도구입니다. 검토를 시작하면 담당자가 되고, 아래 다섯
          단계를 순서대로 확인하게 됩니다.
        </p>
      </div>

      <ol className="flex flex-col gap-2.5 p-5 sm:p-6">
        {STEPS.map((entry, index) => (
          <li key={entry.title} className="flex items-center gap-3">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full border border-border-strong bg-surface text-xs font-bold text-fg-subtle">
              {index + 1}
            </span>
            <span className="min-w-0">
              <span className="text-sm font-semibold text-fg">{entry.title}</span>
              <span className="ml-2 text-sm text-fg-muted">{entry.guide}</span>
            </span>
          </li>
        ))}
      </ol>

      <div className="flex flex-col gap-2 border-t border-border bg-surface-muted px-5 py-4 sm:px-6">
        {error ? <Alert tone="danger">{error}</Alert> : null}

        {canAssignSelf ? (
          <div>
            <Button type="button" onClick={start} disabled={pending}>
              <UserCheck aria-hidden="true" />
              {pending ? '시작하는 중…' : '검토 시작'}
            </Button>
            <p className="mt-1.5 text-xs text-fg-subtle">
              누르면 이 도구의 검토를 맡고 상태가 &apos;검토 중&apos;으로 바뀝니다. 따로 적을
              내용은 없습니다.
            </p>
          </div>
        ) : (
          <p className="text-sm text-fg-muted">
            검토를 시작하려면 &apos;도구 검토&apos; 권한이 있어야 합니다. 관리자에게 요청해
            주세요.
          </p>
        )}
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* 5단계 — 판단                                                                 */
/* -------------------------------------------------------------------------- */

function DecisionStep({
  toolId,
  transitions,
  hasChecklist,
  recap,
}: {
  toolId: string;
  transitions: readonly TransitionRule[];
  hasChecklist: boolean;
  recap: React.ReactNode;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [memoOpen, setMemoOpen] = useState(false);
  const [memo, setMemo] = useState('');
  const [memoError, setMemoError] = useState<string | undefined>();
  const [message, setMessage] = useState<{ tone: 'success' | 'danger'; text: string } | null>(null);

  function submitMemo() {
    setMessage(null);
    setMemoError(undefined);
    startTransition(async () => {
      const result = await addReviewCommentAction({ toolId, kind: 'GENERAL', body: memo });
      if (result.ok) {
        setMemo('');
        setMemoOpen(false);
        setMessage({ tone: 'success', text: '검토 의견을 등록했습니다.' });
        router.refresh();
        return;
      }
      setMemoError(result.error.fields?.body);
      setMessage({ tone: 'danger', text: result.error.message });
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {recap}

      {message ? (
        <Alert tone={message.tone === 'success' ? 'success' : 'danger'}>{message.text}</Alert>
      ) : null}

      {!hasChecklist ? (
        <Alert tone="warning" title="위험 체크리스트가 아직 없습니다">
          4단계로 돌아가 체크리스트를 저장해야 시범운영으로 넘길 수 있습니다.
        </Alert>
      ) : null}

      {transitions.length === 0 ? (
        <Alert tone="info" title="지금 실행할 수 있는 결정이 없습니다">
          체크리스트를 저장했는데도 이 문구가 보이면 권한이 없는 상태입니다. 관리자에게 문의해
          주세요.
        </Alert>
      ) : (
        /*
          앞으로 보내는 결정을 왼쪽에 두고 강조색을 준다.

          둘 다 강조색이면 '승인'과 '돌려보내기'가 같은 모양이 된다. 마지막
          단계에서 잘못 누르기 제일 쉬운 것이 바로 그 둘이다.
        */
        <div className="flex flex-wrap gap-2">
          {[...transitions]
            .sort((left, right) => rank(left) - rank(right))
            .map((rule) => (
              <StatusTransitionDialog
                key={`${rule.from}-${rule.to}`}
                toolId={toolId}
                toStatus={rule.to}
                label={rule.label}
                destructive={rule.destructive}
                requiresReason={rule.requiresReason}
                variant={isAdvancing(rule) ? 'primary' : 'secondary'}
              />
            ))}
        </div>
      )}

      {/*
        메모는 접어 둔다.

        보완 요청 사유는 위 버튼을 누를 때 적는다. 여기 빈 칸이 늘 펼쳐져 있으면
        같은 말을 두 번 적게 되고 이력에 중복된 글이 쌓인다.
      */}
      <div className="border-t border-border pt-4">
        {memoOpen ? (
          <div className="flex flex-col gap-3">
            <Field label="따로 남길 메모" htmlFor="wizard-memo" required error={memoError}>
              <Textarea
                {...fieldAria('wizard-memo', undefined, memoError)}
                value={memo}
                onChange={(event) => setMemo(event.target.value)}
                rows={4}
                autoFocus
                placeholder="상태 변경 사유와 별개로 남길 내용이 있으면 적어 주세요."
              />
            </Field>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                onClick={submitMemo}
                disabled={pending || memo.trim().length < 5}
              >
                <MessageSquarePlus aria-hidden="true" />
                등록
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setMemoOpen(false);
                  setMemo('');
                  setMemoError(undefined);
                }}
                disabled={pending}
              >
                취소
              </Button>
            </div>
          </div>
        ) : (
          <>
            <Button type="button" variant="ghost" size="sm" onClick={() => setMemoOpen(true)}>
              <MessageSquarePlus aria-hidden="true" />
              따로 메모 남기기
            </Button>
            <p className="mt-1.5 text-xs text-fg-subtle">
              보완 요청 사유는 위 버튼을 누를 때 함께 적습니다. 여기는 그 밖의 메모입니다.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

/** 다음 단계로 보내는 결정인가. 시범운영·정식 승인만 해당한다. */
function isAdvancing(rule: TransitionRule): boolean {
  return rule.to === 'PILOT' || rule.to === 'APPROVED';
}

/** 앞으로 가는 결정을 먼저 보여 준다. */
function rank(rule: TransitionRule): number {
  return isAdvancing(rule) ? 0 : 1;
}

/* -------------------------------------------------------------------------- */
/* 진행 표시                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * 번호 동그라미로 어디까지 왔는지 보여준다.
 *
 * 색만으로 지나온 것과 남은 것을 가르지 않는다 — 지나온 단계에는 체크 표시가
 * 들어간다 (디자인 문서 §14).
 *
 * 지나온 단계는 눌러서 돌아갈 수 있다. 4단계에서 "1단계에 뭐라고 적혀 있었지"가
 * 생각날 때 이전을 세 번 누르게 하지 않는다. 아직 안 간 단계로는 못 뛴다.
 */
function StepHeader({ step, onJump }: { step: number; onJump: (next: number) => void }) {
  return (
    <div className="border-b border-border bg-primary-soft/60 px-5 py-4 sm:px-6">
      <ol
        className="flex items-center gap-1.5 sm:gap-2"
        aria-label={`${STEP_COUNT}단계 중 ${step}단계 진행 중`}
      >
        {STEPS.map((entry, index) => {
          const position = index + 1;
          const done = position < step;
          const current = position === step;

          return (
            <li key={entry.title} className="flex flex-1 items-center gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={() => onJump(position)}
                disabled={!done && !current}
                aria-current={current ? 'step' : undefined}
                className={cn(
                  'flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-bold transition-colors',
                  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
                  done && 'border-primary bg-primary text-primary-fg hover:bg-primary-hover',
                  current && 'border-primary bg-surface text-primary ring-2 ring-primary/25',
                  !done && !current && 'cursor-not-allowed border-border-strong bg-surface text-fg-subtle',
                )}
              >
                {done ? <Check className="size-3.5" aria-hidden="true" /> : position}
                <span className="sr-only">
                  {position}단계 {entry.title} {done ? '완료' : current ? '진행 중' : '남음'}
                </span>
              </button>

              {index < STEPS.length - 1 ? (
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
