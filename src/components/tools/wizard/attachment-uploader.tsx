'use client';

import { Paperclip, Trash2 } from 'lucide-react';
import { useRef, useState, useTransition } from 'react';
import { addToolAttachmentAction, removeToolAttachmentAction } from '@/actions/tool-actions';
import type { AttachmentView } from '@/application/tools/attachments';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field, NativeSelect } from '@/components/ui/field';
import { ATTACHMENT_KINDS, ATTACHMENT_KIND_LABELS } from '@/domain/tool/types';
import type { AttachmentKind } from '@/domain/tool/types';
import {
  ATTACHMENT_ACCEPT_ATTRIBUTE,
  ALLOWED_ATTACHMENT_TYPES,
  MAX_ATTACHMENT_BYTES,
  humanFileSize,
} from '@/lib/validation/attachment';

/**
 * 첨부파일 업로드.
 *
 * 도구가 저장된 뒤에만 쓸 수 있다(파일을 어느 버전에 붙일지 정해져야 하므로).
 * 브라우저 쪽 검사는 실수를 빨리 알려 주기 위한 것이고, 실제 차단은 서버가 한다.
 */
export function AttachmentUploader({
  toolId,
  initialAttachments,
}: {
  toolId: string | null;
  initialAttachments: readonly AttachmentView[];
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [attachments, setAttachments] = useState<readonly AttachmentView[]>(initialAttachments);
  // 기본값을 프로그램 파일로 둔다 — 이 화면에 오는 가장 큰 이유다 (리뷰 3절).
  const [kind, setKind] = useState<AttachmentKind>('PROGRAM');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!toolId) {
    return (
      <Alert tone="info" title="먼저 임시저장을 해 주세요">
        첨부파일은 도구가 저장된 뒤에 올릴 수 있습니다. 아래 &quot;임시저장&quot; 을 누르면 이
        영역이 열립니다.
      </Alert>
    );
  }

  function handleFile(file: File) {
    setError(null);

    if (file.size > MAX_ATTACHMENT_BYTES) {
      setError(
        `파일이 너무 큽니다. ${humanFileSize(MAX_ATTACHMENT_BYTES)} 이하로 줄여서 올려 주세요. (선택한 파일: ${humanFileSize(file.size)})`,
      );
      return;
    }
    if (!(file.type in ALLOWED_ATTACHMENT_TYPES)) {
      setError(
        `올릴 수 없는 형식입니다. ${[...new Set(Object.values(ALLOWED_ATTACHMENT_TYPES))].join(', ')} 형식만 가능합니다. 실행 파일은 zip 으로 압축해서 올려 주세요.`,
      );
      return;
    }

    const formData = new FormData();
    formData.set('toolId', toolId as string);
    formData.set('kind', kind);
    formData.set('file', file);

    startTransition(async () => {
      const result = await addToolAttachmentAction(formData);
      if (result.ok) {
        setAttachments(result.data);
      } else {
        setError(result.error.fields?.file ?? result.error.message);
      }
      if (inputRef.current) inputRef.current.value = '';
    });
  }

  function handleRemove(attachmentId: string) {
    setError(null);
    startTransition(async () => {
      const result = await removeToolAttachmentAction({ toolId, attachmentId });
      if (result.ok) {
        setAttachments(result.data);
      } else {
        setError(result.error.message);
      }
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {error ? <Alert tone="danger">{error}</Alert> : null}

      <div className="grid gap-3 sm:grid-cols-[200px_1fr] sm:items-end">
        <Field label="자료 종류" htmlFor="attachment-kind">
          <NativeSelect
            id="attachment-kind"
            value={kind}
            onChange={(event) => setKind(event.target.value as AttachmentKind)}
          >
            {ATTACHMENT_KINDS.map((value) => (
              <option key={value} value={value}>
                {ATTACHMENT_KIND_LABELS[value]}
              </option>
            ))}
          </NativeSelect>
        </Field>

        <div>
          <input
            ref={inputRef}
            id="attachment-file"
            type="file"
            className="sr-only"
            accept={ATTACHMENT_ACCEPT_ATTRIBUTE}
            disabled={pending}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) handleFile(file);
            }}
          />
          <Button
            type="button"
            variant="secondary"
            disabled={pending}
            onClick={() => inputRef.current?.click()}
          >
            <Paperclip aria-hidden="true" />
            {pending ? '올리는 중…' : '파일 선택'}
          </Button>
          <p className="mt-1.5 text-xs text-fg-muted">
            {Object.values(ALLOWED_ATTACHMENT_TYPES).join(', ')} · 최대{' '}
            {humanFileSize(MAX_ATTACHMENT_BYTES)}
          </p>
        </div>
      </div>

      {attachments.length > 0 ? (
        <ul className="divide-y divide-border rounded-card border border-border">
          {attachments.map((attachment) => (
            <li key={attachment.id} className="flex items-center gap-3 p-3">
              <Paperclip className="size-4 shrink-0 text-fg-subtle" aria-hidden="true" />
              <span className="min-w-0 flex-1">
                <a
                  href={attachment.url}
                  target="_blank"
                  rel="noreferrer"
                  className="block truncate text-sm text-fg hover:underline"
                >
                  {attachment.fileName}
                </a>
                <span className="text-xs text-fg-subtle">
                  {ATTACHMENT_KIND_LABELS[attachment.kind]} · {humanFileSize(attachment.byteSize)}
                </span>
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={pending}
                onClick={() => handleRemove(attachment.id)}
                aria-label={`${attachment.fileName} 삭제`}
              >
                <Trash2 aria-hidden="true" />
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-fg-muted">아직 올린 파일이 없습니다.</p>
      )}
    </div>
  );
}
