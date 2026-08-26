import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  loadDemandAnalysis,
  loadDuplicateAnalysis,
  loadRiskAnalysis,
} from '@/application/analysis/query';
import type {
  DemandAnalysis,
  DuplicateAnalysis,
  RiskAnalysis,
} from '@/domain/analysis/types';
import type { DemandId, ToolId, ToolVersionId } from '@/domain/shared/ids';
import type { RiskChecklist, RiskFactorCode } from '@/domain/tool/risk-checklist-rules';
import { RISK_FACTORS, emptyChecklistItems } from '@/domain/tool/risk-checklist-rules';
import { getRepositories } from '@/lib/di/container';
import {
  DEMO_CAMPUS_ID,
  clearSeededAnalyses,
  setupIsolatedStore,
  teardownIsolatedStore,
} from './helpers';

/**
 * 저장된 AI 분석을 읽는 경로.
 *
 * 여기서 확인하는 것은 두 가지다.
 *
 * 1. 분석이 없으면 **null** 이 나온다. 0 이나 빈 점수가 아니다.
 *    (CLAUDE.md: 가짜 AI 결과를 만들지 않는다)
 * 2. 읽는 동안 **모델을 부르지 않는다.** 화면을 여는 것과 분석을 돌리는 것은
 *    다른 일이다.
 */

beforeEach(setupIsolatedStore);
afterEach(teardownIsolatedStore);

/**
 * 데모 시드에는 미리 돌려 둔 진짜 분석이 들어 있다. 여기서 보려는 것은 읽기
 * 경로의 규칙이지 그 데이터가 아니므로, 매번 치우고 필요한 것만 심는다.
 */
beforeEach(clearSeededAnalyses);

const RISK_FACTOR_LABELS: ReadonlyMap<RiskFactorCode, string> = new Map(
  RISK_FACTORS.map((factor) => [factor.code, factor.label]),
);

async function firstTool() {
  const page = await getRepositories().tools.listTools(
    { campusId: DEMO_CAMPUS_ID },
    'RECENT',
    { page: 1, pageSize: 5 },
  );
  const tool = page.items[0];
  if (!tool) throw new Error('시드 데이터에 도구가 없습니다.');
  return tool;
}

describe('분석이 아직 없을 때', () => {
  it('중복 분석은 null 이다 — 0 점으로 채우지 않는다', async () => {
    const tool = await firstTool();
    expect(await loadDuplicateAnalysis(tool.currentVersionId, DEMO_CAMPUS_ID)).toBeNull();
  });

  it('위험도 분석은 null 이다', async () => {
    const tool = await firstTool();
    expect(
      await loadRiskAnalysis(tool.currentVersionId, DEMO_CAMPUS_ID, null, RISK_FACTOR_LABELS),
    ).toBeNull();
  });

  it('수요 매칭 분석은 null 이다', async () => {
    const page = await getRepositories().demands.listDemands(
      { campusId: DEMO_CAMPUS_ID },
      { page: 1, pageSize: 5 },
    );
    const demand = page.items[0];
    if (!demand) throw new Error('시드 데이터에 수요가 없습니다.');
    expect(await loadDemandAnalysis(demand.id, DEMO_CAMPUS_ID)).toBeNull();
  });
});

describe('중복 분석 읽기', () => {
  it('후보 도구의 이름을 붙여 준다', async () => {
    const repositories = getRepositories();
    const [source, candidate] = (
      await repositories.tools.listTools({ campusId: DEMO_CAMPUS_ID }, 'RECENT', {
        page: 1,
        pageSize: 5,
      })
    ).items;
    if (!source || !candidate) throw new Error('도구가 두 건 이상 필요합니다.');

    await repositories.analyses.upsertDuplicateAnalysis({
      toolVersionId: source.currentVersionId,
      toolId: source.id,
      comparedCount: 12,
      findings: [
        {
          candidateToolId: candidate.id,
          verdict: 'HIGH_OVERLAP',
          score: 78,
          overlapping: ['회의 녹취를 요약한다'],
          distinct: ['대상 부서가 다르다'],
          recommendation: 'MERGE_INTO_EXISTING',
          explanation: '하는 일이 대체로 같습니다.',
          lexicalOverlap: 31.4,
        },
      ],
      provenance: {
        model: 'claude-opus-5',
        generatedAt: '2026-08-26T00:00:00.000Z',
        humanReviewed: false,
        reviewedBy: null,
        reviewedAt: null,
      },
    } satisfies DuplicateAnalysis);

    const view = await loadDuplicateAnalysis(source.currentVersionId, DEMO_CAMPUS_ID);

    expect(view?.findings[0]?.candidateToolName).toBe(candidate.name);
    expect(view?.findings[0]?.candidateAvailable).toBe(true);
    expect(view?.topVerdict).toBe('HIGH_OVERLAP');
    expect(view?.topRecommendation).toBe('MERGE_INTO_EXISTING');
    expect(view?.comparedCount).toBe(12);
  });

  it('분석 뒤에 도구가 지워져도 화면이 깨지지 않는다', async () => {
    const repositories = getRepositories();
    const source = await firstTool();

    await repositories.analyses.upsertDuplicateAnalysis({
      toolVersionId: source.currentVersionId,
      toolId: source.id,
      comparedCount: 3,
      findings: [
        {
          // 존재하지 않는 도구 id
          candidateToolId: '00000000-0000-4000-8000-000000000000' as ToolId,
          verdict: 'RELATED',
          score: 55,
          overlapping: [],
          distinct: [],
          recommendation: 'DIFFERENTIATE',
          explanation: '',
          lexicalOverlap: 10,
        },
      ],
      provenance: {
        model: 'claude-opus-5',
        generatedAt: '2026-08-26T00:00:00.000Z',
        humanReviewed: false,
        reviewedBy: null,
        reviewedAt: null,
      },
    });

    const view = await loadDuplicateAnalysis(source.currentVersionId, DEMO_CAMPUS_ID);
    expect(view?.findings[0]?.candidateAvailable).toBe(false);
    expect(view?.findings[0]?.candidateToolName).toBe('삭제된 도구');
  });
});

describe('위험도 분석 읽기', () => {
  async function seedRisk(toolVersionId: ToolVersionId, appliesTo: RiskFactorCode) {
    await getRepositories().analyses.upsertRiskAnalysis({
      toolVersionId,
      suggestedLevel: 'HIGH',
      summary: '개인정보를 다룹니다.',
      suggestions: RISK_FACTORS.map((factor) => ({
        code: factor.code,
        applies: factor.code === appliesTo,
        reason: factor.code === appliesTo ? '설명에 학생 명단이 나옵니다.' : '근거 없음',
        evidence: factor.code === appliesTo ? '학생 명단을 불러와 정리합니다' : '',
      })),
      requiredControls: [],
      provenance: {
        model: 'claude-opus-5',
        generatedAt: '2026-08-26T00:00:00.000Z',
        humanReviewed: false,
        reviewedBy: null,
        reviewedAt: null,
      },
    } satisfies RiskAnalysis);
  }

  it('항목마다 사람이 읽을 이름을 붙인다', async () => {
    const tool = await firstTool();
    await seedRisk(tool.currentVersionId, 'USES_PERSONAL_DATA');

    const view = await loadRiskAnalysis(
      tool.currentVersionId,
      DEMO_CAMPUS_ID,
      null,
      RISK_FACTOR_LABELS,
    );

    expect(view?.suggestions).toHaveLength(RISK_FACTORS.length);
    expect(
      view?.suggestions.find((entry) => entry.code === 'USES_PERSONAL_DATA')?.label,
    ).toBe('개인정보 사용');
    // 체크리스트가 없으면 비교할 대상이 없다.
    expect(view?.disagreementCount).toBe(0);
    expect(view?.confirmedLevel).toBeNull();
  });

  it('검토자 판단과 갈린 항목을 센다 — 감추지 않는다', async () => {
    const tool = await firstTool();
    await seedRisk(tool.currentVersionId, 'USES_PERSONAL_DATA');

    // 검토자는 '개인정보 사용'을 해당 없음으로 봤다.
    const checklist = {
      id: 'checklist-1',
      toolVersionId: tool.currentVersionId,
      items: emptyChecklistItems(),
      riskLevel: 'LOW',
      rationale: '개인정보를 다루지 않는다고 판단했습니다.',
      reviewedBy: 'reviewer',
      reviewedAt: '2026-08-26T01:00:00.000Z',
      createdAt: '2026-08-26T01:00:00.000Z',
      updatedAt: '2026-08-26T01:00:00.000Z',
    } as unknown as RiskChecklist;

    const view = await loadRiskAnalysis(
      tool.currentVersionId,
      DEMO_CAMPUS_ID,
      checklist,
      RISK_FACTOR_LABELS,
    );

    expect(view?.disagreementCount).toBe(1);
    expect(
      view?.suggestions.find((entry) => entry.code === 'USES_PERSONAL_DATA')?.disagrees,
    ).toBe(true);
    // 모델 제안과 검토자 확정을 나란히 볼 수 있어야 한다.
    expect(view?.suggestedLevel).toBe('HIGH');
    expect(view?.confirmedLevel).toBe('LOW');
  });
});

describe('수요 매칭 분석 읽기', () => {
  it('도구 이름을 붙이고 못 하는 기능을 그대로 넘긴다', async () => {
    const repositories = getRepositories();
    const tool = await firstTool();
    const demand = (
      await repositories.demands.listDemands({ campusId: DEMO_CAMPUS_ID }, { page: 1, pageSize: 5 })
    ).items[0];
    if (!demand) throw new Error('시드 데이터에 수요가 없습니다.');

    await repositories.analyses.upsertDemandAnalysis({
      demandId: demand.id as DemandId,
      outcome: 'PARTIAL',
      comparedCount: 6,
      findings: [
        {
          toolId: tool.id,
          score: 60,
          coveredFeatures: ['엑셀 읽기'],
          missingFeatures: ['부서별 서식 구분'],
          explanation: '대부분 되지만 서식 구분이 안 됩니다.',
        },
      ],
      provenance: {
        model: 'claude-opus-5',
        generatedAt: '2026-08-26T00:00:00.000Z',
        humanReviewed: false,
        reviewedBy: null,
        reviewedAt: null,
      },
    } satisfies DemandAnalysis);

    const view = await loadDemandAnalysis(demand.id, DEMO_CAMPUS_ID);

    expect(view?.outcome).toBe('PARTIAL');
    expect(view?.findings[0]?.toolName).toBe(tool.name);
    expect(view?.findings[0]?.missingFeatures).toEqual(['부서별 서식 구분']);
  });
});

describe('읽기 경로는 모델을 부르지 않는다', () => {
  it('분석을 읽는 동안 네트워크 요청이 없다', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const tool = await firstTool();

    await loadDuplicateAnalysis(tool.currentVersionId, DEMO_CAMPUS_ID);
    await loadRiskAnalysis(tool.currentVersionId, DEMO_CAMPUS_ID, null, RISK_FACTOR_LABELS);

    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});
