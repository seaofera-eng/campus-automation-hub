import type { DuplicateVerdict } from '../analysis/types';
import type { ToolId } from '../shared/ids';
import { jaccard, trigrams } from '../similarity';

/**
 * 통합 표준화 (요구사항 "기존 도구를 참고해 업데이트·통합 표준화").
 *
 * ## 중복 탐지와 무엇이 다른가
 *
 * 중복 탐지는 **둘씩** 본다. "A 와 B 가 겹칩니다."
 * 통합 표준화는 **묶음**으로 본다. "A · B · C 가 같은 일을 합니다."
 *
 * 둘씩만 보면 놓치는 것이 있다. A-B 가 겹치고 B-C 가 겹치면 A-C 는 직접 비교에서
 * 안 걸려도 셋이 한 덩어리다. 학내에 같은 도구가 셋씩 생기는 건 대개 이렇게
 * 한 다리 건너 이어져 있어서, 아무도 전체 그림을 못 봐서다.
 *
 * ## 여기서 모델을 부르지 않는다
 *
 * 묶는 것도 기능을 나란히 놓는 것도 이미 나온 판정을 가지고 하는 계산이다.
 * 모델을 다시 부를 이유가 없고, 부르면 "왜 이 셋이 한 묶음이냐"에 답할 수 없게
 * 된다.
 */

/** 어느 판정부터 한 묶음으로 볼지. RELATED 까지 묶으면 거의 모든 도구가 한 덩어리가 된다. */
export const GROUPING_VERDICTS: readonly DuplicateVerdict[] = ['NEAR_IDENTICAL', 'HIGH_OVERLAP'];

/** 도구 둘 사이의 중복 판정 하나. */
export interface ConsolidationEdge {
  fromToolId: ToolId;
  toToolId: ToolId;
  verdict: DuplicateVerdict;
  /** 0~100 */
  score: number;
}

export interface ConsolidationGroup {
  toolIds: ToolId[];
  /** 이 묶음 안에서 가장 무거운 판정 */
  strongestVerdict: DuplicateVerdict;
  /** 이 묶음 안에서 가장 높은 점수 */
  highestScore: number;
  /** 묶음을 이루는 판정들. 검토자가 근거를 되짚을 수 있게 그대로 남긴다. */
  edges: ConsolidationEdge[];
}

const VERDICT_WEIGHT: Record<DuplicateVerdict, number> = {
  NEAR_IDENTICAL: 3,
  HIGH_OVERLAP: 2,
  RELATED: 1,
  INDEPENDENT: 0,
};

/**
 * 이어진 도구들을 한 묶음으로 만든다.
 *
 * 서로소 집합(union-find)으로 연결 요소를 찾는다. A-B 와 B-C 가 있으면 A-C 를
 * 직접 비교하지 않았어도 셋이 한 묶음이 된다.
 *
 * 혼자인 도구는 묶음이 아니다. 결과에서 뺀다.
 */
export function buildConsolidationGroups(
  edges: readonly ConsolidationEdge[],
  verdicts: readonly DuplicateVerdict[] = GROUPING_VERDICTS,
): ConsolidationGroup[] {
  const allowed = new Set(verdicts);
  const relevant = edges.filter((edge) => allowed.has(edge.verdict));

  const parent = new Map<string, string>();

  function find(id: string): string {
    const seen = parent.get(id);
    if (seen === undefined) {
      parent.set(id, id);
      return id;
    }
    if (seen === id) return id;
    // 경로 압축 — 같은 묶음을 여러 번 훑어도 느려지지 않는다.
    const root = find(seen);
    parent.set(id, root);
    return root;
  }

  function union(left: string, right: string): void {
    const leftRoot = find(left);
    const rightRoot = find(right);
    if (leftRoot !== rightRoot) parent.set(leftRoot, rightRoot);
  }

  for (const edge of relevant) {
    // A→B 와 B→A 가 둘 다 있을 수 있다. 같은 묶음이 될 뿐이라 문제없다.
    union(edge.fromToolId as string, edge.toToolId as string);
  }

  const byRoot = new Map<string, ConsolidationEdge[]>();
  for (const edge of relevant) {
    const root = find(edge.fromToolId as string);
    const bucket = byRoot.get(root) ?? [];
    bucket.push(edge);
    byRoot.set(root, bucket);
  }

  const groups: ConsolidationGroup[] = [];
  for (const groupEdges of byRoot.values()) {
    const toolIds = [
      ...new Set(groupEdges.flatMap((edge) => [edge.fromToolId, edge.toToolId])),
    ];
    // 둘 미만이면 묶음이라고 부를 것이 없다.
    if (toolIds.length < 2) continue;

    const strongest = groupEdges.reduce((best, edge) =>
      VERDICT_WEIGHT[edge.verdict] > VERDICT_WEIGHT[best.verdict] ? edge : best,
    );

    groups.push({
      toolIds,
      strongestVerdict: strongest.verdict,
      highestScore: Math.max(...groupEdges.map((edge) => edge.score)),
      edges: groupEdges,
    });
  }

  // 큰 묶음부터. 같으면 판정이 무거운 것부터.
  return groups.sort(
    (left, right) =>
      right.toolIds.length - left.toolIds.length ||
      VERDICT_WEIGHT[right.strongestVerdict] - VERDICT_WEIGHT[left.strongestVerdict] ||
      right.highestScore - left.highestScore,
  );
}

/* -------------------------------------------------------------------------- */
/* 기능 비교표                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * 같은 기능으로 볼 표현의 겹침 기준.
 *
 * 낮추면 "엑셀 내보내기"와 "엑셀 읽기"가 한 줄이 되고, 높이면 "회의록 요약"과
 * "회의 녹취 요약"이 다른 줄로 갈라진다. 갈라지는 쪽이 덜 나쁘다 — 없는 기능을
 * 있다고 표시하는 것보다 같은 기능이 두 줄로 나오는 편이 낫다.
 */
export const FEATURE_MATCH_THRESHOLD = 45;

export interface ToolFeatures {
  toolId: ToolId;
  features: readonly string[];
}

/** 기능 비교표의 한 줄. */
export interface FeatureRow {
  /** 이 줄을 대표하는 표현. 제일 먼저 나온 것을 쓴다. */
  label: string;
  /** 이 기능을 가진 도구. 도구마다 원래 쓴 표현을 함께 남긴다. */
  presentIn: { toolId: ToolId; asWritten: string }[];
}

/**
 * 묶음 안의 기능을 나란히 놓는다.
 *
 * 도구마다 기능을 제 나름의 말로 적는다. "회의록 요약"과 "회의 녹취 자동 정리"는
 * 같은 기능이지만 글자는 다르다. 그래서 표현이 비슷한 것끼리 한 줄로 모은다.
 *
 * **모델을 부르지 않는다.** 글자 겹침으로만 묶고, 화면에도 "표현이 비슷한 기능을
 * 묶었습니다"라고 적는다. 잘못 묶였는지는 사람이 원래 표현을 보고 바로 안다 —
 * 그래서 `asWritten` 을 버리지 않는다.
 */
export function buildFeatureMatrix(
  tools: readonly ToolFeatures[],
  threshold: number = FEATURE_MATCH_THRESHOLD,
): FeatureRow[] {
  const rows: { label: string; grams: Set<string>; presentIn: FeatureRow['presentIn'] }[] = [];

  for (const tool of tools) {
    for (const feature of tool.features) {
      const text = feature.trim();
      if (!text) continue;

      const grams = trigrams(text);
      const match = rows.find((row) => jaccard(row.grams, grams) >= threshold);

      if (match) {
        // 같은 도구가 비슷한 기능을 두 개 적었으면 첫 번째만 둔다.
        if (!match.presentIn.some((entry) => entry.toolId === tool.toolId)) {
          match.presentIn.push({ toolId: tool.toolId, asWritten: text });
        }
        continue;
      }

      rows.push({
        label: text,
        grams,
        presentIn: [{ toolId: tool.toolId, asWritten: text }],
      });
    }
  }

  // 여러 도구가 가진 기능을 위로. 공통 기능이 위에 모여야 "겹치는 부분"이 보인다.
  return rows
    .map((row) => ({ label: row.label, presentIn: row.presentIn }))
    .sort(
      (left, right) =>
        right.presentIn.length - left.presentIn.length ||
        left.label.localeCompare(right.label, 'ko'),
    );
}

/**
 * 묶음에서 어느 도구를 기준으로 삼을지 고른다.
 *
 * 기준은 하나다 — **기능을 가장 많이 덮는 도구.** 다른 도구의 기능을 흡수하는
 * 쪽이 되어야 하니 이미 많이 가진 쪽이 유리하다.
 *
 * 평가나 사용량으로 고르지 않는다. 그건 순위가 답할 질문이고, 여기서 섞으면
 * "왜 이게 기준이냐"가 두 가지 이야기가 된다.
 *
 * 어디까지나 **제안**이다. 화면에서도 그렇게 적고, 정하는 것은 관리자다.
 */
export function suggestBaseTool(rows: readonly FeatureRow[]): ToolId | null {
  const counts = new Map<ToolId, number>();

  for (const row of rows) {
    for (const entry of row.presentIn) {
      counts.set(entry.toolId, (counts.get(entry.toolId) ?? 0) + 1);
    }
  }

  let best: { toolId: ToolId; count: number } | null = null;
  for (const [toolId, count] of counts) {
    if (!best || count > best.count) best = { toolId, count };
  }

  return best?.toolId ?? null;
}

/** 기준 도구에 없어서 흡수해야 하는 기능. 그대로 개선 요청 내용이 된다. */
export function missingFromBase(
  rows: readonly FeatureRow[],
  baseToolId: ToolId,
): { label: string; fromToolIds: ToolId[] }[] {
  return rows
    .filter((row) => !row.presentIn.some((entry) => entry.toolId === baseToolId))
    .map((row) => ({
      label: row.label,
      fromToolIds: row.presentIn.map((entry) => entry.toolId),
    }));
}
