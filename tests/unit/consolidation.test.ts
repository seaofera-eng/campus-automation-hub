import { describe, expect, it } from 'vitest';
import {
  buildConsolidationGroups,
  buildFeatureMatrix,
  missingFromBase,
  suggestBaseTool,
  type ConsolidationEdge,
} from '@/domain/consolidation';
import type { ToolId } from '@/domain/shared/ids';

function edge(
  from: string,
  to: string,
  overrides: Partial<Omit<ConsolidationEdge, 'fromToolId' | 'toToolId'>> = {},
): ConsolidationEdge {
  return {
    fromToolId: from as ToolId,
    toToolId: to as ToolId,
    verdict: 'HIGH_OVERLAP',
    score: 70,
    ...overrides,
  };
}

const ids = (group: { toolIds: ToolId[] }) => [...group.toolIds].map(String).sort();

describe('buildConsolidationGroups', () => {
  it('한 다리 건너 이어진 것도 한 묶음이다', () => {
    // A-B 와 B-C 만 있고 A-C 는 직접 비교에서 안 걸렸다.
    const groups = buildConsolidationGroups([edge('a', 'b'), edge('b', 'c')]);

    expect(groups).toHaveLength(1);
    expect(ids(groups[0]!)).toEqual(['a', 'b', 'c']);
  });

  it('이어지지 않은 것은 따로 묶는다', () => {
    const groups = buildConsolidationGroups([edge('a', 'b'), edge('c', 'd')]);

    expect(groups).toHaveLength(2);
    expect(groups.flatMap(ids).sort()).toEqual(['a', 'b', 'c', 'd']);
  });

  it('RELATED 로는 묶지 않는다 — 묶으면 거의 전부가 한 덩어리가 된다', () => {
    expect(buildConsolidationGroups([edge('a', 'b', { verdict: 'RELATED' })])).toEqual([]);
  });

  it('INDEPENDENT 는 무시한다', () => {
    expect(buildConsolidationGroups([edge('a', 'b', { verdict: 'INDEPENDENT' })])).toEqual([]);
  });

  it('가장 무거운 판정과 가장 높은 점수를 함께 낸다', () => {
    const groups = buildConsolidationGroups([
      edge('a', 'b', { verdict: 'HIGH_OVERLAP', score: 72 }),
      edge('b', 'c', { verdict: 'NEAR_IDENTICAL', score: 91 }),
    ]);

    expect(groups[0]?.strongestVerdict).toBe('NEAR_IDENTICAL');
    expect(groups[0]?.highestScore).toBe(91);
  });

  it('근거가 된 판정을 버리지 않는다', () => {
    const groups = buildConsolidationGroups([edge('a', 'b'), edge('b', 'c')]);
    expect(groups[0]?.edges).toHaveLength(2);
  });

  it('A→B 와 B→A 가 둘 다 있어도 한 묶음이다', () => {
    const groups = buildConsolidationGroups([edge('a', 'b'), edge('b', 'a')]);

    expect(groups).toHaveLength(1);
    expect(ids(groups[0]!)).toEqual(['a', 'b']);
  });

  it('큰 묶음을 앞에 둔다', () => {
    const groups = buildConsolidationGroups([
      edge('x', 'y'),
      edge('a', 'b'),
      edge('b', 'c'),
    ]);
    expect(groups[0]?.toolIds).toHaveLength(3);
  });

  it('판정이 하나도 없으면 빈 배열', () => {
    expect(buildConsolidationGroups([])).toEqual([]);
  });
});

describe('buildFeatureMatrix', () => {
  it('표현이 비슷한 기능을 한 줄로 모은다', () => {
    const rows = buildFeatureMatrix([
      { toolId: 'a' as ToolId, features: ['회의록 요약'] },
      { toolId: 'b' as ToolId, features: ['회의록요약'] },
    ]);

    expect(rows).toHaveLength(1);
    expect(rows[0]?.presentIn).toHaveLength(2);
  });

  it('도구마다 원래 쓴 표현을 남긴다 — 잘못 묶였는지 사람이 봐야 한다', () => {
    const rows = buildFeatureMatrix([
      { toolId: 'a' as ToolId, features: ['회의록 요약'] },
      { toolId: 'b' as ToolId, features: ['회의록요약'] },
    ]);

    expect(rows[0]?.presentIn.map((entry) => entry.asWritten).sort()).toEqual([
      '회의록 요약',
      '회의록요약',
    ]);
  });

  it('다른 기능은 갈라 둔다', () => {
    const rows = buildFeatureMatrix([
      { toolId: 'a' as ToolId, features: ['회의록 요약', '캘린더 등록'] },
      { toolId: 'b' as ToolId, features: ['회의록 요약'] },
    ]);

    expect(rows).toHaveLength(2);
  });

  it('여러 도구가 가진 기능을 위에 둔다', () => {
    const rows = buildFeatureMatrix([
      { toolId: 'a' as ToolId, features: ['혼자만 있는 기능', '공통 기능'] },
      { toolId: 'b' as ToolId, features: ['공통 기능'] },
    ]);

    expect(rows[0]?.label).toBe('공통 기능');
    expect(rows[0]?.presentIn).toHaveLength(2);
  });

  it('같은 도구가 비슷한 기능을 둘 적어도 한 번만 센다', () => {
    const rows = buildFeatureMatrix([
      { toolId: 'a' as ToolId, features: ['회의록 요약', '회의록요약'] },
    ]);

    expect(rows[0]?.presentIn).toHaveLength(1);
  });

  it('빈 문자열은 줄을 만들지 않는다', () => {
    expect(buildFeatureMatrix([{ toolId: 'a' as ToolId, features: ['', '   '] }])).toEqual([]);
  });
});

describe('suggestBaseTool', () => {
  it('기능을 가장 많이 덮는 도구를 고른다', () => {
    const rows = buildFeatureMatrix([
      { toolId: 'many' as ToolId, features: ['가나다', '라마바', '사아자'] },
      { toolId: 'few' as ToolId, features: ['가나다'] },
    ]);

    expect(String(suggestBaseTool(rows))).toBe('many');
  });

  it('기능이 하나도 없으면 null — 아무거나 고르지 않는다', () => {
    expect(suggestBaseTool([])).toBeNull();
  });
});

describe('missingFromBase', () => {
  it('기준 도구에 없는 기능만 낸다 — 그대로 개선 요청 내용이 된다', () => {
    const rows = buildFeatureMatrix([
      { toolId: 'base' as ToolId, features: ['공통 기능'] },
      { toolId: 'other' as ToolId, features: ['공통 기능', '없는 기능'] },
    ]);

    const missing = missingFromBase(rows, 'base' as ToolId);

    expect(missing).toHaveLength(1);
    expect(missing[0]?.label).toBe('없는 기능');
    expect(missing[0]?.fromToolIds.map(String)).toEqual(['other']);
  });

  it('기준 도구가 전부 가지고 있으면 빈 배열', () => {
    const rows = buildFeatureMatrix([
      { toolId: 'base' as ToolId, features: ['가나다', '라마바'] },
      { toolId: 'other' as ToolId, features: ['가나다'] },
    ]);

    expect(missingFromBase(rows, 'base' as ToolId)).toEqual([]);
  });
});
