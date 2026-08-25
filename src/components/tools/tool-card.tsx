import { MessageSquareWarning, Star, Users } from 'lucide-react';
import Link from 'next/link';
import { DataClassificationChip, ToolStatusBadge } from '@/components/common/status-badge';
import type { ToolListItem } from '@/domain/tool/types';
import { MEMBER_TYPE_LABELS } from '@/domain/authz/accounts';
import { AUTOMATION_LEVEL_LABELS, RUNTIME_KIND_LABELS } from '@/domain/tool/types';

/**
 * 목록의 카드 한 장.
 *
 * 민감 데이터 사용 여부를 카드에서 바로 보이게 한다 (요구사항 12번).
 * 목록만 훑어도 "이 도구는 개인정보를 다룬다"를 알 수 있어야 한다.
 */
export function ToolCard({ item }: { item: ToolListItem }) {
  const usedClassifications = item.version.security.classifications.filter((entry) => entry.inUse);

  return (
    <li className="flex flex-col rounded-card border border-border bg-surface transition-colors hover:border-primary/50">
      <Link href={`/tools/${item.tool.id}`} className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex items-start justify-between gap-3">
          <h3 className="min-w-0 font-semibold text-fg">{item.tool.name}</h3>
          <ToolStatusBadge status={item.tool.status} />
        </div>

        <p className="line-clamp-2 text-sm text-fg-muted">
          {item.tool.summary || '한 줄 소개가 아직 없습니다.'}
        </p>

        {usedClassifications.length > 0 ? (
          <ul className="flex flex-wrap gap-1.5">
            {usedClassifications.map((entry) => (
              <li key={entry.classification}>
                <DataClassificationChip value={entry.classification} />
              </li>
            ))}
          </ul>
        ) : null}

        <dl className="mt-auto flex flex-wrap gap-x-4 gap-y-1 pt-1 text-xs text-fg-subtle">
          <div className="flex gap-1">
            <dt className="sr-only">카테고리</dt>
            <dd>{item.categoryName}</dd>
          </div>
          <div className="flex gap-1">
            <dt className="sr-only">실행 방식</dt>
            <dd>{RUNTIME_KIND_LABELS[item.tool.runtimeKind]}</dd>
          </div>
          <div className="flex gap-1">
            <dt className="sr-only">추천 대상</dt>
            <dd>
              {item.tool.recommendedFor.length > 0
                ? item.tool.recommendedFor.map((m) => MEMBER_TYPE_LABELS[m]).join('·')
                : '누구나'}
            </dd>
          </div>
          <div className="flex gap-1">
            <dt className="sr-only">자동화 수준</dt>
            <dd>{AUTOMATION_LEVEL_LABELS[item.version.automationLevel]}</dd>
          </div>
        </dl>
      </Link>

      <div className="flex flex-wrap items-center gap-4 border-t border-border px-5 py-2.5 text-xs text-fg-muted">
        <span className="flex items-center gap-1">
          <Star className="size-3.5" aria-hidden="true" />
          {item.averageOverallScore === null ? (
            // 평가가 없을 때 0점으로 표시하지 않는다. 사실과 다르게 읽힌다.
            <span>평가 없음</span>
          ) : (
            <span>
              {item.averageOverallScore.toFixed(1)}
              <span className="text-fg-subtle"> ({item.evaluationCount}건)</span>
            </span>
          )}
        </span>

        {item.openImprovementCount > 0 ? (
          <span className="flex items-center gap-1">
            <MessageSquareWarning className="size-3.5" aria-hidden="true" />
            개선 요청 {item.openImprovementCount}건
          </span>
        ) : null}

        <span className="ml-auto flex items-center gap-1">
          <Users className="size-3.5" aria-hidden="true" />
          {item.ownerName}
        </span>
      </div>
    </li>
  );
}
