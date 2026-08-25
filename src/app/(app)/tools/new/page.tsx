import type { Metadata } from 'next';
import { loadNewToolForm } from '@/application/tools/form-data';
import { ToolWizard } from '@/components/tools/wizard/tool-wizard';
import { guardPage } from '@/lib/auth/page-guard';

export const metadata: Metadata = { title: '도구 등록' };

export default async function NewToolPage() {
  const { actor, categories, people, initialForm } =
    await guardPage(loadNewToolForm);

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-5">
      <div>
        <h1 className="text-xl font-bold text-fg">자동화 도구 등록</h1>
        <p className="mt-1 text-sm text-fg-muted">
          5단계로 나뉘어 있습니다. 언제든 임시저장하고 나중에 이어서 작성할 수 있습니다.
        </p>
      </div>

      <ToolWizard
        data={{ actor, categories, people }}
        initialForm={initialForm}
        tool={null}
        attachments={[]}
      />
    </div>
  );
}
