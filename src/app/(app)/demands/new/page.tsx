import { ArrowRight, Sparkles } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { loadNewDemandForm } from '@/application/demands/query';
import { DemandForm } from '@/components/demands/demand-form';
import { guardPage } from '@/lib/auth/page-guard';
import { emptyDemandForm } from '@/lib/validation/demand';

export const metadata: Metadata = { title: '수요 등록' };

export default async function NewDemandPage() {
  await guardPage(loadNewDemandForm);

  const initialForm = emptyDemandForm();

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5">
      <div>
        <h1 className="text-xl font-bold text-fg">업무 수요 등록</h1>
        <p className="mt-1 text-sm text-fg-muted">
          자동화가 필요한 업무를 알려 주세요. 이미 비슷한 도구가 있으면 검토자가 연결해 드립니다.
        </p>
      </div>

      {/*
        마법사로 가는 길 (리뷰 2026-08-26 2.2절).

        "여러번 물어볼 필요가 없을 수도 있을것 같아서 질의 항목을 줄여도 됨."

        이 폼을 없애지는 않았다. 이미 자기 업무를 정리해 본 사람에게는
        한 화면에 다 있는 편이 빠르다. 다만 **기본 길은 마법사**여야 해서
        맨 위에 둔다.
      */}
      <Link
        href="/wizard"
        className="group flex items-center gap-4 rounded-card border-2 border-primary bg-primary-soft p-5 transition-colors hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary text-primary-fg">
          <Sparkles className="size-5" aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold text-fg">
            글로 쓰기 어려우면 마법사를 써 보세요
          </span>
          <span className="mt-0.5 block text-sm text-fg-muted">
            질문 다섯 개에 버튼으로 답하면 이 신청서를 대신 채워 드립니다. 비슷한 도구가
            이미 있는지도 함께 찾아 드립니다.
          </span>
        </span>
        <ArrowRight
          className="size-5 shrink-0 text-primary transition-transform group-hover:translate-x-0.5"
          aria-hidden="true"
        />
      </Link>

      <DemandForm initialForm={initialForm} demand={null} />
    </div>
  );
}
