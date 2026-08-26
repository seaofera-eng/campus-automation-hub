'use server';

import { revalidatePath } from 'next/cache';
import { joinDemand, linkToolToDemand, unlinkToolFromDemand } from '@/application/demands/match';
import { saveDemandDraft, transitionDemand } from '@/application/demands/register';
import { withAudit } from '@/application/shared/audit';
import { DEMAND_STATUS_LABELS, MATCH_TYPE_LABELS } from '@/domain/demand/types';
import {
  addDemandAttachment,
  listDemandAttachments,
  removeDemandAttachment,
} from '@/application/demands/attachments';
import type { DemandAttachmentView } from '@/application/demands/attachments';
import { addDemandComment, deleteDemandComment } from '@/application/demands/comments';
import { validationFailed } from '@/domain/shared/errors';
import { run, type ActionResult } from '@/lib/actions/result';
import { requireUser } from '@/lib/auth/current-user';
import {
  demandAttachmentMetaSchema,
  removeDemandAttachmentSchema,
} from '@/lib/validation/attachment';
import { parseOrThrow } from '@/lib/validation/common';
import { addDemandCommentSchema, deleteDemandCommentSchema } from '@/lib/validation/demand';
import {
  demandTransitionSchema,
  joinDemandSchema,
  linkToolSchema,
  publishDemandSchema,
  saveDemandDraftSchema,
  unlinkToolSchema,
} from '@/lib/validation/demand';

/** 수요 서버 액션. 모든 작업이 감사 로그를 남긴다. */

function revalidateDemand(demandId: string): void {
  revalidatePath('/demands');
  revalidatePath(`/demands/${demandId}`);
  revalidatePath('/dashboard');
}

export async function saveDemandDraftAction(
  input: unknown,
): Promise<ActionResult<{ demandId: string; created: boolean }>> {
  return run(async () => {
    const actor = await requireUser();
    const data = parseOrThrow(saveDemandDraftSchema, input);

    const result = await withAudit(
      actor,
      {
        action: data.demandId ? 'demand.update' : 'demand.create',
        targetType: 'demand',
        targetId: data.demandId ?? null,
        changedFields: data.demandId ? ['form'] : ['(신규)'],
        summary: data.demandId ? '수요 내용을 수정했습니다.' : '수요를 등록했습니다.',
      },
      () => saveDemandDraft(actor, { demandId: data.demandId, form: data.form }),
    );

    revalidateDemand(result.demandId);
    return { demandId: result.demandId as string, created: result.created };
  });
}

/**
 * 공개.
 *
 * 공개 기준 검증을 통과해야 하므로 임시저장과 액션을 나눴다.
 * 마지막 수정 내용을 함께 저장한 뒤 상태를 바꾼다.
 */
export async function publishDemandAction(input: unknown): Promise<ActionResult<null>> {
  return run(async () => {
    const actor = await requireUser();
    const data = parseOrThrow(publishDemandSchema, input);

    await withAudit(
      actor,
      {
        action: 'demand.publish',
        targetType: 'demand',
        targetId: data.demandId,
        changedFields: ['status'],
        summary: '수요를 공개했습니다.',
      },
      async () => {
        await saveDemandDraft(actor, { demandId: data.demandId, form: data.form });
        return transitionDemand(actor, {
          demandId: data.demandId,
          toStatus: 'OPEN',
          reason: '수요를 공개합니다.',
        });
      },
    );

    revalidateDemand(data.demandId);
    return null;
  });
}

export async function transitionDemandAction(input: unknown): Promise<ActionResult<null>> {
  return run(async () => {
    const actor = await requireUser();
    const data = parseOrThrow(demandTransitionSchema, input);

    await withAudit(
      actor,
      {
        action: `demand.status.${data.toStatus.toLowerCase()}`,
        targetType: 'demand',
        targetId: data.demandId,
        changedFields: ['status'],
        summary: `수요 상태를 '${DEMAND_STATUS_LABELS[data.toStatus]}'(으)로 변경했습니다.`,
      },
      () =>
        transitionDemand(actor, {
          demandId: data.demandId,
          toStatus: data.toStatus,
          reason: data.reason,
        }),
    );

    revalidateDemand(data.demandId);
    return null;
  });
}

export async function linkToolAction(input: unknown): Promise<ActionResult<null>> {
  return run(async () => {
    const actor = await requireUser();
    const data = parseOrThrow(linkToolSchema, input);

    await withAudit(
      actor,
      {
        action: 'demand.match',
        targetType: 'demand',
        targetId: data.demandId,
        changedFields: ['matches'],
        summary: `수요에 도구를 연결했습니다. (${MATCH_TYPE_LABELS[data.matchType]})`,
      },
      () =>
        linkToolToDemand(actor, {
          demandId: data.demandId,
          toolId: data.toolId,
          matchType: data.matchType,
          rationale: data.rationale,
        }),
    );

    revalidateDemand(data.demandId);
    revalidatePath(`/tools/${data.toolId}`);
    return null;
  });
}

export async function unlinkToolAction(input: unknown): Promise<ActionResult<null>> {
  return run(async () => {
    const actor = await requireUser();
    const data = parseOrThrow(unlinkToolSchema, input);

    await withAudit(
      actor,
      {
        action: 'demand.unmatch',
        targetType: 'demand',
        targetId: data.demandId,
        changedFields: ['matches'],
        summary: '수요-도구 연결을 해제했습니다.',
      },
      () => unlinkToolFromDemand(actor, data.demandId, data.matchId),
    );

    revalidateDemand(data.demandId);
    return null;
  });
}

export async function joinDemandAction(input: unknown): Promise<ActionResult<null>> {
  return run(async () => {
    const actor = await requireUser();
    const data = parseOrThrow(joinDemandSchema, input);

    await withAudit(
      actor,
      {
        action: 'demand.participate',
        targetType: 'demand',
        targetId: data.demandId,
        changedFields: ['participants'],
        summary: '개발 참여를 신청했습니다.',
      },
      () =>
        joinDemand(actor, {
          demandId: data.demandId,
          participantRole: 'DEVELOPER',
          message: data.message,
        }),
    );

    revalidateDemand(data.demandId);
    return null;
  });
}

/**
 * 수요 문의 남기기 (리뷰 6.4절).
 *
 * 참여 신청과 별개다. 물어보고 나서 참여할지 정하면 된다.
 * 감사 로그를 남기지 않는다 — 글을 쓰는 일이지 상태를 바꾸는 일이 아니다.
 */
export async function addDemandCommentAction(input: unknown): Promise<ActionResult<null>> {
  return run(async () => {
    const actor = await requireUser();
    const data = parseOrThrow(addDemandCommentSchema, input);

    await addDemandComment(actor, data);
    revalidateDemand(data.demandId);
    return null;
  });
}

export async function deleteDemandCommentAction(input: unknown): Promise<ActionResult<null>> {
  return run(async () => {
    const actor = await requireUser();
    const data = parseOrThrow(deleteDemandCommentSchema, input);

    await deleteDemandComment(actor, data.commentId);
    revalidatePath('/demands', 'layout');
    return null;
  });
}

/**
 * 수요 자료 붙이기 (리뷰 6.4절).
 *
 * 파일 이름에 개인정보가 들어갈 수 있으므로 감사 로그 요약에 이름을 넣지 않습니다.
 */
export async function addDemandAttachmentAction(
  formData: FormData,
): Promise<ActionResult<DemandAttachmentView[]>> {
  return run(async () => {
    const actor = await requireUser();

    const file = formData.get('file');
    if (!(file instanceof File)) {
      throw validationFailed({ file: '올릴 파일을 선택해 주세요.' });
    }

    const meta = parseOrThrow(demandAttachmentMetaSchema, {
      demandId: String(formData.get('demandId') ?? ''),
      fileName: file.name,
      mimeType: file.type,
      byteSize: file.size,
    });

    const bytes = new Uint8Array(await file.arrayBuffer());

    await withAudit(
      actor,
      {
        action: 'demand.attachment.add',
        targetType: 'demand',
        targetId: meta.demandId,
        changedFields: ['attachments'],
        summary: '수요에 자료를 붙였습니다.',
      },
      () =>
        addDemandAttachment(actor, {
          demandId: meta.demandId,
          fileName: meta.fileName,
          mimeType: meta.mimeType,
          bytes,
        }),
    );

    revalidateDemand(meta.demandId);
    return listDemandAttachments(meta.demandId);
  });
}

export async function removeDemandAttachmentAction(
  input: unknown,
): Promise<ActionResult<DemandAttachmentView[]>> {
  return run(async () => {
    const actor = await requireUser();
    const data = parseOrThrow(removeDemandAttachmentSchema, input);

    await withAudit(
      actor,
      {
        action: 'demand.attachment.remove',
        targetType: 'demand',
        targetId: data.demandId,
        changedFields: ['attachments'],
        summary: '수요에 붙인 자료를 뗐습니다.',
      },
      () => removeDemandAttachment(actor, data.demandId, data.attachmentId),
    );

    revalidateDemand(data.demandId);
    return listDemandAttachments(data.demandId);
  });
}
