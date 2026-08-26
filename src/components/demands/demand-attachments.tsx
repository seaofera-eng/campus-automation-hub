'use client';

import { Paperclip, Trash2 } from 'lucide-react';
import { useRef, useState, useTransition } from 'react';
import {
  addDemandAttachmentAction,
  removeDemandAttachmentAction,
} from '@/actions/demand-actions';
import type { DemandAttachmentView } from '@/application/demands/attachments';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  ALLOWED_ATTACHMENT_TYPES,
  ATTACHMENT_ACCEPT_ATTRIBUTE,
  MAX_ATTACHMENT_BYTES,
  humanFileSize,
} from '@/lib/validation/attachment';

/**
 * 수요에 붙이는 자료 (리뷰 6.4절).
 *
 * "자동화하려는 업무와 관련된 자료를 업로드 할 수 있도록 첨부파일을 넣을 수
 *  있으면 좋겠음."
 *
 * 엑셀 서식 하나를 보는 것이 설명 열 줄보다 빠릅니다.
 *
 * 브라우저 쪽 검사는 실수를 빨리 알려 주기 위한 것이고, 실제 차단은 서버가 합니다.
 */
export function DemandAttachments({
  demandId,
  initialAttachments,
  canManage,
}: {
  demandId: string;
  initialAttachments: readonly DemandAttachmentView[];
  /** 수요를 올린 본인인가 — 붙이고 뗄 수 있는지 */
  canManage: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [attachments, setAttachments] =
    useState<readonly DemandAttachmentView[]>(initialAttachments);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function upload(file: File) {
    setError(null);

    // 서버가 다시 검사하지만, 큰 파일을 다 올려 보내고 나서 거절당하면 시간이 아깝다.
    if (file.size > MAX_ATTACHMENT_BYTES) {
      setError(`파일 크기는 ${humanFileSize(MAX_ATTACHMENT_BYTES)} 까지만 올릴 수 있습니다.`);
      return;
    }
    if (!(file.type in ALLOWED_ATTACHMENT_TYPES)) {
      setError(
        `올릴 수 없는 형식입니다. ${Object.values(ALLOWED_ATTACHMENT_TYPES).join(', ')} 만 됩니다.`,
      );
      return;
    }

    const formData = new FormData();
    formData.set('demandId', demandId);
    formData.set('file', file);

    startTransition(async () => {
      const result = await addDemandAttachmentAction(formData);
      if (result.ok) {
        setAttachments(result.data);
        if (inputRef.current) inputRef.current.value = '';
        return;
      }
      setError(result.error.fields?.file ?? result.error.message);
    });
  }

  function remove(attachmentId: string) {
    setError(null);
    startTransition(async () => {
      const result = await removeDemandAttachmentAction({ demandId, attachmentId });
      if (result.ok) {
        setAttachments(result.data);
        return;
      }
      setError(result.error.message);
    });
  }

  // 붙일 수도 없고 붙은 것도 없으면 빈 칸을 만들지 않는다.
  if (!canManage && attachments.length === 0) return null;

  return (
    <section aria-labelledby="demand-attachments-heading" className="flex flex-col gap-3">
      <h2
        id="demand-attachments-heading"
        className="flex items-center gap-2 font-semibold text-fg"
      >
        <Paperclip className="size-4 text-fg-subtle" aria-hidden="true" />
        참고 자료 ({attachments.length})
      </h2>

      {canManage ? (
        <p className="text-sm text-fg-muted">
          지금 쓰는 엑셀 서식이나 화면 캡처를 올려 주시면, 만들 사람이 훨씬 빨리 이해합니다.
        </p>
      ) : null}

      {error ? <Alert tone="danger">{error}</Alert> : null}

      {attachments.length === 0 ? (
        <p className="rounded-card border border-dashed border-border p-4 text-sm text-fg-subtle">
          아직 붙인 자료가 없습니다.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {attachments.map((attachment) => (
            <li
              key={attachment.id}
              className="flex items-center gap-3 rounded-md border border-border p-3"
            >
              <Paperclip className="size-4 shrink-0 text-fg-subtle" aria-hidden="true" />
              <a
                href={attachment.url}
                target="_blank"
                rel="noreferrer"
                className="min-w-0 flex-1 truncate text-sm font-medium text-fg hover:underline"
              >
                {attachment.fileName}
              </a>
              <span className="shrink-0 text-xs tabular-nums text-fg-subtle">
                {humanFileSize(attachment.byteSize)}
              </span>
              {canManage ? (
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={pending}
                  onClick={() => remove(attachment.id)}
                  aria-label={`${attachment.fileName} 떼기`}
                >
                  <Trash2 aria-hidden="true" />
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {canManage ? (
        <div className="flex flex-wrap items-center gap-3">
          <input
            ref={inputRef}
            type="file"
            accept={ATTACHMENT_ACCEPT_ATTRIBUTE}
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) upload(file);
            }}
          />
          <Button
            variant="secondary"
            disabled={pending}
            onClick={() => inputRef.current?.click()}
          >
            <Paperclip aria-hidden="true" />
            {pending ? '올리는 중…' : '자료 붙이기'}
          </Button>
          <p className="text-xs text-fg-subtle">
            {Object.values(ALLOWED_ATTACHMENT_TYPES).join(', ')} · 최대{' '}
            {humanFileSize(MAX_ATTACHMENT_BYTES)}
          </p>
        </div>
      ) : null}
    </section>
  );
}
