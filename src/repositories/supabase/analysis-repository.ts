import 'server-only';
import type {
  AnalysisProvenance,
  DemandAnalysis,
  DemandMatchFinding,
  DemandMatchOutcome,
  DuplicateAnalysis,
  DuplicateFinding,
  RiskAnalysis,
  RiskFactorSuggestion,
} from '@/domain/analysis/types';
import type { CampusId, DemandId, ToolId, ToolVersionId, UserId } from '@/domain/shared/ids';
import type { RiskFactorCode } from '@/domain/tool/risk-checklist-rules';
import type { RiskLevel } from '@/domain/tool/types';
import type { AnalysisRepository } from '../types';
import { getUserClient, throwOnError } from './client';

/**
 * AI 분석 결과 (Supabase).
 *
 * 쓰기는 분석 스크립트가 서비스 키로 하고, 앱은 읽기만 한다.
 * `upsert*` 를 노출은 하지만 RLS 가 일반 사용자의 쓰기를 막는다.
 *
 * ⚠️ 이 구현은 실제 Supabase 프로젝트에 연결해 검증한 적이 없다.
 */

interface ProvenanceColumns {
  model: string;
  generated_at: string;
  human_reviewed: boolean;
  reviewed_by: string | null;
  reviewed_at: string | null;
}

type Row = Record<string, unknown>;

function toProvenance(row: Row): AnalysisProvenance {
  return {
    model: String(row.model ?? ''),
    generatedAt: String(row.generated_at ?? ''),
    humanReviewed: Boolean(row.human_reviewed),
    reviewedBy: (row.reviewed_by as UserId | null) ?? null,
    reviewedAt: (row.reviewed_at as string | null) ?? null,
  };
}

function fromProvenance(provenance: AnalysisProvenance): ProvenanceColumns {
  return {
    model: provenance.model,
    generated_at: provenance.generatedAt,
    human_reviewed: provenance.humanReviewed,
    reviewed_by: provenance.reviewedBy,
    reviewed_at: provenance.reviewedAt,
  };
}

function toDuplicate(row: Row): DuplicateAnalysis {
  return {
    toolVersionId: row.tool_version_id as ToolVersionId,
    toolId: row.tool_id as ToolId,
    findings: (row.findings ?? []) as DuplicateFinding[],
    comparedCount: Number(row.compared_count ?? 0),
    provenance: toProvenance(row),
  };
}

function toRisk(row: Row): RiskAnalysis {
  return {
    toolVersionId: row.tool_version_id as ToolVersionId,
    suggestedLevel: row.suggested_level as RiskLevel,
    summary: String(row.summary ?? ''),
    suggestions: (row.suggestions ?? []) as RiskFactorSuggestion[],
    requiredControls: (row.required_controls ?? []) as {
      code: RiskFactorCode;
      description: string;
      mandatory: boolean;
    }[],
    provenance: toProvenance(row),
  };
}

function toDemand(row: Row): DemandAnalysis {
  return {
    demandId: row.demand_id as DemandId,
    outcome: row.outcome as DemandMatchOutcome,
    findings: (row.findings ?? []) as DemandMatchFinding[],
    comparedCount: Number(row.compared_count ?? 0),
    provenance: toProvenance(row),
  };
}

export function createSupabaseAnalysisRepository(): AnalysisRepository {
  return {
    async getDuplicateAnalysis(toolVersionId: ToolVersionId): Promise<DuplicateAnalysis | null> {
      const supabase = await getUserClient();
      const { data, error } = await supabase
        .from('duplicate_analyses')
        .select('*')
        .eq('tool_version_id', toolVersionId)
        .maybeSingle();
      throwOnError(error, '중복 분석 조회');
      return data ? toDuplicate(data) : null;
    },

    async listDuplicateAnalyses(campusId: CampusId): Promise<DuplicateAnalysis[]> {
      const supabase = await getUserClient();

      // 분석 자체에는 캠퍼스가 없다. 도구를 거쳐 좁힌다.
      const { data: tools, error: toolError } = await supabase
        .from('automation_tools')
        .select('id')
        .eq('campus_id', campusId);
      throwOnError(toolError, '캠퍼스 도구 조회');

      const toolIds = (tools ?? []).map((row) => String(row.id));
      if (toolIds.length === 0) return [];

      const { data, error } = await supabase
        .from('duplicate_analyses')
        .select('*')
        .in('tool_id', toolIds);
      throwOnError(error, '중복 분석 목록 조회');
      return (data ?? []).map(toDuplicate);
    },

    async upsertDuplicateAnalysis(analysis: DuplicateAnalysis): Promise<DuplicateAnalysis> {
      const supabase = await getUserClient();
      const { error } = await supabase.from('duplicate_analyses').upsert({
        tool_version_id: analysis.toolVersionId,
        tool_id: analysis.toolId,
        findings: analysis.findings,
        compared_count: analysis.comparedCount,
        ...fromProvenance(analysis.provenance),
      });
      throwOnError(error, '중복 분석 저장');
      return analysis;
    },

    async getRiskAnalysis(toolVersionId: ToolVersionId): Promise<RiskAnalysis | null> {
      const supabase = await getUserClient();
      const { data, error } = await supabase
        .from('risk_analyses')
        .select('*')
        .eq('tool_version_id', toolVersionId)
        .maybeSingle();
      throwOnError(error, '위험도 분석 조회');
      return data ? toRisk(data) : null;
    },

    async upsertRiskAnalysis(analysis: RiskAnalysis): Promise<RiskAnalysis> {
      const supabase = await getUserClient();
      const { error } = await supabase.from('risk_analyses').upsert({
        tool_version_id: analysis.toolVersionId,
        suggested_level: analysis.suggestedLevel,
        summary: analysis.summary,
        suggestions: analysis.suggestions,
        required_controls: analysis.requiredControls,
        ...fromProvenance(analysis.provenance),
      });
      throwOnError(error, '위험도 분석 저장');
      return analysis;
    },

    async getDemandAnalysis(demandId: DemandId): Promise<DemandAnalysis | null> {
      const supabase = await getUserClient();
      const { data, error } = await supabase
        .from('demand_analyses')
        .select('*')
        .eq('demand_id', demandId)
        .maybeSingle();
      throwOnError(error, '수요 매칭 분석 조회');
      return data ? toDemand(data) : null;
    },

    async upsertDemandAnalysis(analysis: DemandAnalysis): Promise<DemandAnalysis> {
      const supabase = await getUserClient();
      const { error } = await supabase.from('demand_analyses').upsert({
        demand_id: analysis.demandId,
        outcome: analysis.outcome,
        findings: analysis.findings,
        compared_count: analysis.comparedCount,
        ...fromProvenance(analysis.provenance),
      });
      throwOnError(error, '수요 매칭 분석 저장');
      return analysis;
    },
  };
}
