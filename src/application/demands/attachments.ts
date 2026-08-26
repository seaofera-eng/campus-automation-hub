import 'server-only';
import type { DemandAttachment } from '@/domain/demand/types';
import type { Profile } from '@/domain/identity/types';
import { conflict, forbidden, notFound, validationFailed } from '@/domain/shared/errors';
import { asId, newId } from '@/domain/shared/ids';
import type { DemandId } from '@/domain/shared/ids';
import { requireUser } from '@/lib/auth/current-user';
import { getRepositories } from '@/lib/di/container';
import {
  ALLOWED_ATTACHMENT_TYPES,
  MAX_ATTACHMENT_BYTES,
  humanFileSize,
  safeFileName,
} from '@/lib/validation/attachment';

/**
 * 수요 첨부 (리뷰 6.4절).
 *
 * "자동화하려는 업무와 관련된 자료를 업로드 할 수 있도록 첨부파일을 넣을 수
 *  있으면 좋겠음."
 *
 * 엑셀 서식 하나를 보는 것이 설명 열 줄보다 빠릅니다.
 *
 * 도구 첨부와 같은 규칙을 씁니다.
 *   - 클라이언트가 보낸 크기·형식을 믿지 않고 실제 바이트로 다시 확인한다
 *   - 저장 경로에 사용자가 정한 파일명을 쓰지 않는다
 *   - 수요를 올린 사람만 붙이고 뗀다
 */

/** 한 수요에 붙일 수 있는 첨부 수. 무제한이면 저장소가 금방 커진다. */
const MAX_ATTACHMENTS_PER_DEMAND = 5;

export interface DemandAttachmentView {
  id: string;
  fileName: string;
  byteSize: number;
  /** 내려받기 주소 */
  url: string;
}

export async function listDemandAttachments(demandId: string): Promise<DemandAttachmentView[]> {
  const repositories = getRepositories();
  const rows = await repositories.demands.listAttachments(asId<DemandId>(demandId));

  return Promise.all(
    rows.map(async (row) => ({
      id: row.id,
      fileName: row.fileName,
      byteSize: row.byteSize,
      url: await repositories.files.getUrl(row.storagePath),
    })),
  );
}

export interface AddDemandAttachmentInput {
  demandId: string;
  fileName: string;
  mimeType: string;
  bytes: Uint8Array;
}

export async function addDemandAttachment(
  actor: Profile,
  input: AddDemandAttachmentInput,
): Promise<DemandAttachment> {
  const repositories = getRepositories();

  const demand = await repositories.demands.getDemand(asId<DemandId>(input.demandId));
  if (!demand || demand.deletedAt !== null) throw notFound('수요');

  // 수요를 올린 사람만 자료를 붙인다. 남의 수요에 파일을 넣을 수는 없다.
  if (demand.requesterUserId !== actor.id) {
    throw forbidden('수요를 올린 사람만 자료를 붙일 수 있습니다.');
  }

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

  const existing = await repositories.demands.listAttachments(demand.id);
  if (existing.length >= MAX_ATTACHMENTS_PER_DEMAND) {
    throw conflict(
      `자료는 ${MAX_ATTACHMENTS_PER_DEMAND}개까지 붙일 수 있습니다. 기존 파일을 지운 뒤 다시 올려 주세요.`,
    );
  }

  const attachmentId = newId<string>();
  // 사용자가 정한 이름을 경로에 쓰지 않는다. 경로는 우리가 만든 식별자로만 구성한다.
  const extension = ALLOWED_ATTACHMENT_TYPES[input.mimeType];
  const storagePath = `demands/${demand.id}/${attachmentId}.${extension}`;

  await repositories.files.save(storagePath, input.bytes, input.mimeType);

  return repositories.demands.insertAttachment({
    id: attachmentId,
    campusId: actor.campusId,
    demandId: demand.id,
    fileName: safeFileName(input.fileName),
    storagePath,
    contentType: input.mimeType,
    byteSize: input.bytes.byteLength,
    uploadedBy: actor.id,
    createdAt: new Date().toISOString(),
  });
}

export async function removeDemandAttachment(
  actor: Profile,
  demandId: string,
  attachmentId: string,
): Promise<void> {
  const repositories = getRepositories();

  const demand = await repositories.demands.getDemand(asId<DemandId>(demandId));
  if (!demand || demand.deletedAt !== null) throw notFound('수요');

  if (demand.requesterUserId !== actor.id) {
    throw forbidden('수요를 올린 사람만 자료를 뗄 수 있습니다.');
  }

  const attachments = await repositories.demands.listAttachments(demand.id);
  const target = attachments.find((attachment) => attachment.id === attachmentId);
  // 다른 수요의 첨부 ID를 넣어도 지워지지 않도록, 이 수요에 속한 것인지 확인한다.
  if (!target) throw notFound('첨부파일');

  await repositories.demands.deleteAttachment(attachmentId);
  await repositories.files.remove(target.storagePath);
}

/** 이 수요에 자료를 붙일 수 있는가. 화면에서 업로더 노출에 쓴다. */
export async function canAttachToDemand(demandId: string): Promise<boolean> {
  const actor = await requireUser();
  const demand = await getRepositories().demands.getDemand(asId<DemandId>(demandId));
  return demand !== null && demand.deletedAt === null && demand.requesterUserId === actor.id;
}
