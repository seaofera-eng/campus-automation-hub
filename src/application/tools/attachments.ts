import 'server-only';
import { assertCan } from '@/domain/authz/policies';
import type { Profile } from '@/domain/identity/types';
import { conflict, notFound, validationFailed } from '@/domain/shared/errors';
import { asId, newId } from '@/domain/shared/ids';
import type { AttachmentId, ToolId } from '@/domain/shared/ids';
import type { AttachmentKind, ToolAttachment } from '@/domain/tool/types';
import { toActor } from '@/lib/auth/current-user';
import { getRepositories } from '@/lib/di/container';
import {
  ALLOWED_ATTACHMENT_TYPES,
  MAX_ATTACHMENT_BYTES,
  humanFileSize,
  safeFileName,
} from '@/lib/validation/attachment';

/**
 * 도구 첨부파일 (요구사항 6번, 18번).
 *
 * 형식·크기 검사는 **서버에서 다시 한다.** 브라우저의 `accept` 속성과
 * 클라이언트 검사는 편의 기능일 뿐, 직접 요청을 보내면 우회된다.
 */

export interface AddAttachmentInput {
  toolId: string;
  kind: AttachmentKind;
  fileName: string;
  mimeType: string;
  bytes: Uint8Array;
}

/** 한 버전에 붙일 수 있는 첨부 수. 무제한이면 저장소가 금방 커진다. */
const MAX_ATTACHMENTS_PER_VERSION = 10;

export async function addAttachment(
  actor: Profile,
  input: AddAttachmentInput,
): Promise<ToolAttachment> {
  const repositories = getRepositories();
  const tool = await repositories.tools.getTool(asId<ToolId>(input.toolId));
  if (!tool || tool.deletedAt !== null) throw notFound('도구');

  assertCan(toActor(actor), 'tool:attach', {
    ownerId: tool.ownerUserId,
    developerIds: tool.developerUserIds,
  });

  // 클라이언트가 보낸 크기·형식을 믿지 않고 실제 바이트로 다시 확인한다.
  if (input.bytes.byteLength === 0) {
    throw validationFailed({ file: '빈 파일은 올릴 수 없습니다.' });
  }
  if (input.bytes.byteLength > MAX_ATTACHMENT_BYTES) {
    throw validationFailed({
      file: `파일 크기는 ${humanFileSize(MAX_ATTACHMENT_BYTES)} 까지만 올릴 수 있습니다.`,
    });
  }
  if (!(input.mimeType in ALLOWED_ATTACHMENT_TYPES)) {
    throw validationFailed({
      file: `허용되지 않는 파일 형식입니다. ${Object.values(ALLOWED_ATTACHMENT_TYPES).join(', ')} 형식만 올릴 수 있습니다.`,
    });
  }

  const existing = await repositories.tools.listAttachments(tool.currentVersionId);
  if (existing.length >= MAX_ATTACHMENTS_PER_VERSION) {
    throw conflict(
      `첨부파일은 버전당 ${MAX_ATTACHMENTS_PER_VERSION}개까지 올릴 수 있습니다. 기존 파일을 지운 뒤 다시 시도해 주세요.`,
    );
  }

  const attachmentId = newId<AttachmentId>();
  const fileName = safeFileName(input.fileName);
  // 사용자가 정한 이름을 경로에 쓰지 않는다. 경로는 우리가 만든 식별자로만 구성한다.
  const extension = ALLOWED_ATTACHMENT_TYPES[input.mimeType];
  const storagePath = `${tool.id}/${tool.currentVersionId}/${attachmentId}.${extension}`;

  await repositories.files.save(storagePath, input.bytes, input.mimeType);

  return repositories.tools.insertAttachment({
    id: attachmentId,
    toolVersionId: tool.currentVersionId,
    kind: input.kind,
    fileName,
    mimeType: input.mimeType,
    byteSize: input.bytes.byteLength,
    storagePath,
    createdAt: new Date().toISOString(),
    createdBy: actor.id,
  });
}

export async function removeAttachment(
  actor: Profile,
  toolId: string,
  attachmentId: string,
): Promise<void> {
  const repositories = getRepositories();
  const tool = await repositories.tools.getTool(asId<ToolId>(toolId));
  if (!tool || tool.deletedAt !== null) throw notFound('도구');

  assertCan(toActor(actor), 'tool:attach', {
    ownerId: tool.ownerUserId,
    developerIds: tool.developerUserIds,
  });

  const attachments = await repositories.tools.listAttachments(tool.currentVersionId);
  const target = attachments.find((attachment) => attachment.id === attachmentId);
  // 다른 도구의 첨부 ID를 넣어도 지워지지 않도록, 이 버전에 속한 것인지 확인한다.
  if (!target) throw notFound('첨부파일');

  await repositories.tools.deleteAttachment(attachmentId);
  await repositories.files.remove(target.storagePath);
}

export interface AttachmentView {
  id: string;
  kind: AttachmentKind;
  fileName: string;
  byteSize: number;
  url: string;
}

export async function listAttachments(toolId: string): Promise<AttachmentView[]> {
  const repositories = getRepositories();
  const tool = await repositories.tools.getTool(asId<ToolId>(toolId));
  if (!tool) return [];

  const attachments = await repositories.tools.listAttachments(tool.currentVersionId);
  return Promise.all(
    attachments.map(async (attachment) => ({
      id: attachment.id,
      kind: attachment.kind,
      fileName: attachment.fileName,
      byteSize: attachment.byteSize,
      url: await repositories.files.getUrl(attachment.storagePath),
    })),
  );
}
