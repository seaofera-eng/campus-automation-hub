import type { Metadata } from 'next';
import { listAttachments } from '@/application/tools/attachments';
import { loadToolEditForm } from '@/application/tools/form-data';
import { ToolWizard } from '@/components/tools/wizard/tool-wizard';
import { TOOL_STATUS_LABELS } from '@/domain/tool/types';
import { guardPage } from '@/lib/auth/page-guard';

export const metadata: Metadata = { title: '도구 수정' };

export default async function EditToolPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { actor, categories, people, tool, initialForm } =
    await guardPage(() => loadToolEditForm(id));
  const attachments = await listAttachments(id);

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-5">
      <div>
        <h1 className="text-xl font-bold text-fg">{initialForm.name || '도구 수정'}</h1>
        <p className="mt-1 text-sm text-fg-muted">
          현재 상태: {tool ? TOOL_STATUS_LABELS[tool.status] : '-'}
        </p>
      </div>

      <ToolWizard
        data={{ actor, categories, people }}
        initialForm={initialForm}
        tool={tool}
        attachments={attachments}
      />
    </div>
  );
}
