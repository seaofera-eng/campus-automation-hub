'use client';

import { ExternalLink } from 'lucide-react';
import { recordToolLaunchAction } from '@/actions/tool-actions';
import { Button } from '@/components/ui/button';

/**
 * 도구를 실제로 열어 보는 버튼.
 *
 * 여는 동작을 막지 않는다. 기록 요청을 보내 두고 링크는 그대로 따라간다.
 * 기록에 실패해도 사용자에게 알리지 않는다 — 도구를 여는 일과 통계를 남기는
 * 일은 별개이고, 통계 때문에 도구를 못 열게 되어서는 안 된다.
 */
export function LaunchToolButton({ toolId, serviceUrl }: { toolId: string; serviceUrl: string }) {
  return (
    <Button variant="secondary" asChild>
      <a
        href={serviceUrl}
        target="_blank"
        rel="noreferrer"
        onClick={() => {
          void recordToolLaunchAction({ toolId }).catch(() => {
            /* 기록 실패는 조용히 넘긴다 */
          });
        }}
      >
        <ExternalLink aria-hidden="true" />
        서비스 열기
      </a>
    </Button>
  );
}
