import type { Metadata } from 'next';
import { loadNewDemandForm } from '@/application/demands/query';
import { DemandForm } from '@/components/demands/demand-form';
import { guardPage } from '@/lib/auth/page-guard';
import { emptyDemandForm } from '@/lib/validation/demand';

export const metadata: Metadata = { title: '수요 등록' };

export default async function NewDemandPage() {
  const { actor, departments } = await guardPage(loadNewDemandForm);

  const initialForm = emptyDemandForm();
  // 작성자 소속을 요청 부서 기본값으로 채워 준다.
  if (actor.departmentId) initialForm.departmentId = actor.departmentId;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5">
      <div>
        <h1 className="text-xl font-bold text-fg">업무 수요 등록</h1>
        <p className="mt-1 text-sm text-fg-muted">
          자동화가 필요한 업무를 알려 주세요. 이미 비슷한 도구가 있으면 검토자가 연결해 드립니다.
        </p>
      </div>

      <DemandForm departments={departments} initialForm={initialForm} demand={null} />
    </div>
  );
}
