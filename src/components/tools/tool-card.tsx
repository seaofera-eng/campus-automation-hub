import { MessageSquareWarning, Play, Star } from 'lucide-react';
import Link from 'next/link';
import {
  DataClassificationChip,
  RiskLevelBadge,
  ToolStatusBadge,
} from '@/components/common/status-badge';
import type { ToolListItem } from '@/domain/tool/types';
import { RUNTIME_KIND_LABELS } from '@/domain/tool/types';

/**
 * 목록의 카드 한 장.
 *
 * ## 읽는 순서
 *
 * 분류·상태 → 도구명 → 한 줄 소개 → 만든 사람 → 태그 → 평점·이용량·위험도
 * (디자인 문서 §9). 상품 카드가 아니라 **업무 판단용 카드**다. 그래서 값이나
 * 이미지가 아니라 "쓸 수 있는 상태인가 / 뭘 다루는가 / 얼마나 쓰이는가"가
 * 먼저 온다.
 *
 * ## 없는 값을 0 으로 채우지 않는다
 *
 * 평가가 없으면 "평가 없음", 위험도를 아직 안 정했으면 아예 표시하지 않는다.
 * 0.0 이나 "위험도 낮음"으로 채우면 사실과 다르게 읽힌다.
 */
export function ToolCard({ item }: { item: ToolListItem }) {
  const usedClassifications = item.version.security.classifications.filter((entry) => entry.inUse);
  const tags = item.tool.tags.slice(0, 3);

  return (
    <li className="flex flex-col rounded-card border border-border bg-surface shadow-card transition-colors hover:border-primary/50">
      <Link href={`/tools/${item.tool.id}`} className="flex flex-1 flex-col gap-3 p-5">
        {/* 1. 분류와 상태 — 이 도구를 지금 쓸 수 있는지가 제일 위에 온다 */}
        <div className="flex items-start justify-between gap-3">
          <span className="min-w-0 truncate text-xs font-medium text-fg-subtle">
            {item.categoryName}
          </span>
          <ToolStatusBadge status={item.tool.status} />
        </div>

        {/* 2·3. 이름과 한 줄 소개 */}
        <div className="flex flex-col gap-1.5">
          <h3 className="min-w-0 text-base font-semibold text-fg">{item.tool.name}</h3>
          <p className="line-clamp-2 text-sm text-fg-muted">
            {item.tool.summary || '한 줄 소개가 아직 없습니다.'}
          </p>
        </div>

        {/* 4. 만든 사람과 실행 방식 */}
        <p className="text-xs text-fg-subtle">
          {item.ownerName} · {RUNTIME_KIND_LABELS[item.tool.runtimeKind]}
        </p>

        {/* 5. 태그 — 세 개까지만. 더 있으면 남은 수만 알린다 */}
        {tags.length > 0 ? (
          <ul className="flex flex-wrap gap-x-2 gap-y-1 text-xs text-fg-subtle">
            {tags.map((tag) => (
              <li key={tag}>#{tag}</li>
            ))}
            {item.tool.tags.length > tags.length ? (
              <li aria-label={`태그 ${item.tool.tags.length - tags.length}개 더 있음`}>
                +{item.tool.tags.length - tags.length}
              </li>
            ) : null}
          </ul>
        ) : null}

        {/* 다루는 데이터. 목록만 훑어도 보여야 한다 (요구사항 12번) */}
        {usedClassifications.length > 0 ? (
          <ul className="mt-auto flex flex-wrap gap-1.5 pt-1">
            {usedClassifications.map((entry) => (
              <li key={entry.classification}>
                <DataClassificationChip value={entry.classification} />
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-auto" />
        )}
      </Link>

      {/* 6. 평점 · 이용량 · 위험도 */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border px-5 py-3 text-xs text-fg-muted">
        <span className="flex items-center gap-1">
          <Star className="size-3.5 shrink-0" aria-hidden="true" />
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

        {item.launchCount > 0 ? (
          <span className="flex items-center gap-1">
            <Play className="size-3.5 shrink-0" aria-hidden="true" />
            {item.launchCount.toLocaleString('ko-KR')}회 실행
          </span>
        ) : null}

        {item.openImprovementCount > 0 ? (
          <span className="flex items-center gap-1">
            <MessageSquareWarning className="size-3.5 shrink-0" aria-hidden="true" />
            개선 요청 {item.openImprovementCount}건
          </span>
        ) : null}

        {/* 아직 등급을 정하지 않았으면 배지를 만들지 않는다 */}
        {item.riskLevel ? (
          <span className="ml-auto">
            <RiskLevelBadge level={item.riskLevel} />
          </span>
        ) : null}
      </div>
    </li>
  );
}
