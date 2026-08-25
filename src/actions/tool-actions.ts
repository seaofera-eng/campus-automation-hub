'use server';

import { revalidatePath } from 'next/cache';
import { withAudit } from '@/application/shared/audit';
import { addAttachment, listAttachments, removeAttachment } from '@/application/tools/attachments';
import type { AttachmentView } from '@/application/tools/attachments';
import { draftChangedFields, saveDraft, submitTool } from '@/application/tools/register';
import { validationFailed } from '@/domain/shared/errors';
import type { AttachmentKind } from '@/domain/tool/types';
import { run, type ActionResult } from '@/lib/actions/result';
import { requireUser } from '@/lib/auth/current-user';
import { attachmentMetaSchema, removeAttachmentSchema } from '@/lib/validation/attachment';
import { parseOrThrow } from '@/lib/validation/common';
import { saveDraftSchema, submitToolSchema } from '@/lib/validation/tool';

/**
 * 도구 서버 액션.
 *
 * 모든 액션이 같은 순서를 지킨다.
 *   1) 세션 확인   requireUser()
 *   2) 입력 검증   Zod
 *   3) 권한 검사   서비스 안에서 assertCan() — **화면 검사와 별개로 서버에서 다시 한다**
 *   4) 감사 로그   withAudit() 이 성공·실패를 모두 기록
 */

export interface SaveDraftPayload {
  toolId: string;
  created: boolean;
}

export async function saveToolDraftAction(input: unknown): Promise<ActionResult<SaveDraftPayload>> {
  return run(async () => {
    const actor = await requireUser();
    const data = parseOrThrow(saveDraftSchema, input);

    // 무엇이 바뀌었는지는 저장 전에 계산해야 한다. 값은 담지 않고 필드 이름만 남긴다.
    const changedFields = data.toolId ? await draftChangedFields(data.toolId, data.form) : ['(신규)'];

    const result = await withAudit(
      actor,
      {
        action: data.toolId ? 'tool.draft.update' : 'tool.draft.create',
        targetType: 'tool',
        targetId: data.toolId ?? null,
        changedFields,
        summary: data.toolId ? '도구 임시저장을 수정했습니다.' : '도구를 임시저장으로 등록했습니다.',
      },
      () => saveDraft(actor, { toolId: data.toolId, form: data.form }),
    );

    revalidatePath('/tools');
    revalidatePath(`/tools/${result.toolId}`);

    return { toolId: result.toolId as string, created: result.created };
  });
}

export async function submitToolAction(input: unknown): Promise<ActionResult<{ toolId: string }>> {
  return run(async () => {
    const actor = await requireUser();
    const data = parseOrThrow(submitToolSchema, input);

    const toolId = await withAudit(
      actor,
      {
        action: 'tool.submit',
        targetType: 'tool',
        targetId: data.toolId,
        changedFields: ['status'],
        summary: '도구 등록을 신청했습니다.',
      },
      () => submitTool(actor, { toolId: data.toolId, form: data.form }),
    );

    revalidatePath('/tools');
    revalidatePath(`/tools/${toolId}`);
    revalidatePath('/reviews');

    return { toolId: toolId as string };
  });
}

/* -------------------------------------------------------------------------- */
/* 첨부파일                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * 첨부파일 업로드.
 *
 * 파일 자체를 다루므로 JSON 이 아니라 FormData 를 받는다.
 * 크기 상한은 `next.config.ts` 의 `serverActions.bodySizeLimit` 이 1차로 막고,
 * 형식·크기 검사는 서비스 계층에서 실제 바이트로 다시 한다.
 */
export async function addToolAttachmentAction(
  formData: FormData,
): Promise<ActionResult<AttachmentView[]>> {
  return run(async () => {
    const actor = await requireUser();

    const file = formData.get('file');
    if (!(file instanceof File)) {
      throw validationFailed({ file: '올릴 파일을 선택해 주세요.' });
    }

    const meta = parseOrThrow(attachmentMetaSchema, {
      toolId: String(formData.get('toolId') ?? ''),
      kind: String(formData.get('kind') ?? 'OTHER'),
      fileName: file.name,
      mimeType: file.type,
      byteSize: file.size,
    });

    const bytes = new Uint8Array(await file.arrayBuffer());

    await withAudit(
      actor,
      {
        action: 'tool.attachment.add',
        targetType: 'tool',
        targetId: meta.toolId,
        changedFields: ['attachments'],
        // 파일 이름에 개인정보가 들어갈 수 있으므로 요약에는 종류만 남긴다.
        summary: `첨부파일을 추가했습니다. (${meta.kind})`,
      },
      () =>
        addAttachment(actor, {
          toolId: meta.toolId,
          kind: meta.kind as AttachmentKind,
          fileName: meta.fileName,
          mimeType: meta.mimeType,
          bytes,
        }),
    );

    revalidatePath(`/tools/${meta.toolId}`);
    return listAttachments(meta.toolId);
  });
}

export async function removeToolAttachmentAction(
  input: unknown,
): Promise<ActionResult<AttachmentView[]>> {
  return run(async () => {
    const actor = await requireUser();
    const data = parseOrThrow(removeAttachmentSchema, input);

    await withAudit(
      actor,
      {
        action: 'tool.attachment.remove',
        targetType: 'tool',
        targetId: data.toolId,
        changedFields: ['attachments'],
        summary: '첨부파일을 삭제했습니다.',
      },
      () => removeAttachment(actor, data.toolId, data.attachmentId),
    );

    revalidatePath(`/tools/${data.toolId}`);
    return listAttachments(data.toolId);
  });
}
