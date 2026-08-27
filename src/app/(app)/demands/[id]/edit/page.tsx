import type { Metadata } from 'next';
import { listDemandAttachments } from '@/application/demands/attachments';
import { loadDemandForm } from '@/application/demands/query';
import { DemandForm } from '@/components/demands/demand-form';
import { DEMAND_STATUS_LABELS } from '@/domain/demand/types';
import { guardPage } from '@/lib/auth/page-guard';

export const metadata: Metadata = { title: '수요 수정' };

export default async function EditDemandPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { demand, initialForm } = await guardPage(() => loadDemandForm(id));
  const attachments = await guardPage(() => listDemandAttachments(id));

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5">
      <div>
        <h1 className="text-xl font-bold text-fg">{initialForm.title || '수요 수정'}</h1>
        <p className="mt-1 text-sm text-fg-muted">
          현재 상태: {demand ? DEMAND_STATUS_LABELS[demand.status] : '-'}
        </p>
      </div>

      <DemandForm
        initialForm={initialForm}
        demand={demand}
        initialAttachments={attachments}
      />
    </div>
  );
}
