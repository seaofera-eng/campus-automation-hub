'use client';

import { Download, ExternalLink, Code2, AlertTriangle } from 'lucide-react';
import { recordToolLaunchAction } from '@/actions/tool-actions';
import type { AttachmentView } from '@/application/tools/attachments';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import type { ToolAccessKind } from '@/domain/tool/types';
import { humanFileSize } from '@/lib/validation/attachment';

/**
 * 이 도구를 실제로 쓰는 곳 (리뷰 2026-08-27 3절).
 *
 * "올라간 자동화 도구를 다운 받거나 실행할 수 있는 버튼이 없음."
 *
 * ## 왜 맨 위에 두는가
 *
 * 전에는 '서비스 열기'가 상태 전환 버튼들 사이에 섞여 있었고, 프로그램 파일은
 * 페이지 맨 아래 작은 회색 칩이었다. **쓰러 온 사람이 제일 먼저 찾는 것이
 * 제일 찾기 어려웠다.** 검토·승인 버튼은 하루에 몇 번 눌리지만 이 버튼은
 * 도구가 살아 있는 내내 눌린다.
 *
 * ## 받는 것과 여는 것을 구분해서 보여준다
 *
 * 링크를 눌렀는데 파일이 내려오면 놀란다. 그래서 크기와 형식을 미리 적고
 * 아이콘도 다르게 쓴다.
 *
 * ## 실행 기록은 열기를 막지 않는다
 *
 * 기록에 실패해도 사용자에게 알리지 않는다 — 도구를 여는 일과 통계를 남기는
 * 일은 별개이고, 통계 때문에 도구를 못 열게 되어서는 안 된다.
 */
export function ToolAccessPanel({
  toolId,
  access,
  serviceUrl,
  repositoryUrl,
  programFiles,
  isOwner,
}: {
  toolId: string;
  access: readonly ToolAccessKind[];
  serviceUrl: string;
  repositoryUrl: string;
  programFiles: readonly AttachmentView[];
  /** 만든 사람에게는 "왜 비어 있는지"를 알려 준다 */
  isOwner: boolean;
}) {
  function recordLaunch() {
    void recordToolLaunchAction({ toolId }).catch(() => {
      /* 기록 실패는 조용히 넘긴다 */
    });
  }

  // 쓸 방법이 하나도 없는 도구. 예전에 올라온 것이라 있을 수 있다.
  if (access.length === 0) {
    if (!isOwner) return null;
    return (
      <Alert tone="warning" title="이 도구를 쓸 방법이 등록되어 있지 않습니다">
        여는 주소나 프로그램 파일이 없어서 다른 사람이 이 도구를 쓸 수 없습니다. 수정
        화면에서 주소를 적거나 파일을 붙여 주세요.
      </Alert>
    );
  }

  return (
    <section className="rounded-card border border-primary/30 bg-primary-soft/40 p-4">
      <h2 className="text-sm font-semibold text-fg">이 도구 쓰기</h2>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {access.includes('SERVICE') ? (
          <Button asChild>
            <a href={serviceUrl} target="_blank" rel="noreferrer" onClick={recordLaunch}>
              <ExternalLink aria-hidden="true" />
              서비스 열기
            </a>
          </Button>
        ) : null}

        {programFiles.map((file) => (
          <Button key={file.id} variant="secondary" asChild>
            {/*
              download 를 붙여 두면 브라우저가 새 탭으로 열지 않고 바로 받는다.
              zip 을 탭에서 열면 아무 일도 안 일어난 것처럼 보인다.
            */}
            <a href={file.url} download={file.fileName} onClick={recordLaunch}>
              <Download aria-hidden="true" />
              {file.fileName}
              <span className="text-fg-subtle">{humanFileSize(file.byteSize)}</span>
            </a>
          </Button>
        ))}

        {access.includes('REPOSITORY') ? (
          <Button variant="ghost" asChild>
            <a href={repositoryUrl} target="_blank" rel="noreferrer">
              <Code2 aria-hidden="true" />
              소스 저장소
            </a>
          </Button>
        ) : null}
      </div>

      {/* 받아서 돌리는 파일이면 한 번 더 알린다. 링크와 달리 되돌릴 수 없다. */}
      {programFiles.length > 0 ? (
        <p className="mt-3 flex items-start gap-1.5 text-xs text-fg-muted">
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-warning" aria-hidden="true" />
          받은 파일은 내 컴퓨터에서 실행됩니다. 검토를 거친 파일이지만, 열기 전에 어떤
          자료를 다루는지 아래 내용을 한 번 확인해 주세요.
        </p>
      ) : null}
    </section>
  );
}
