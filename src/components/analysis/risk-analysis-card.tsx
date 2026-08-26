import { CircleCheck, CircleDot, ShieldAlert, TriangleAlert } from 'lucide-react';
import type { RiskAnalysisView } from '@/application/analysis/query';
import { AnalysisProvenanceLine } from '@/components/analysis/analysis-provenance';
import { RiskLevelBadge } from '@/components/common/status-badge';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

/**
 * 위험도 자동 평가 결과 (검토 화면).
 *
 * ## 체크리스트를 대신하지 않는다
 *
 * 이 카드는 체크리스트 **위에** 놓인다. 검토자는 이걸 읽고 아래 체크리스트를
 * 직접 채운다. 자동으로 체크되지 않는다 — 자동으로 채워 두면 검토자가
 * 그대로 넘기게 되고, 그러면 검토가 없는 것과 같다.
 *
 * ## 갈린 항목을 먼저 보여 준다
 *
 * 검토자가 이미 체크리스트를 채웠다면, 모델과 판단이 갈린 항목을 맨 위에
 * 올린다. 이게 이 기능의 값어치다 — 놓친 항목을 짚어 주는 것.
 * 갈렸다는 사실 자체는 문제가 아니라 검토가 실제로 일어났다는 증거다.
 */
export function RiskAnalysisCard({ analysis }: { analysis: RiskAnalysisView }) {
  const applied = analysis.suggestions.filter((entry) => entry.applies);
  const disagreed = analysis.suggestions.filter((entry) => entry.disagrees);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldAlert className="size-4 text-fg-subtle" aria-hidden="true" />
          위험도 자동 평가
        </CardTitle>
        <p className="text-sm text-fg-muted">
          아래 체크리스트를 채우기 전에 참고하는 자료입니다. 확정 등급은 검토자가 정합니다.
        </p>
        <AnalysisProvenanceLine provenance={analysis.provenance} />
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-fg-muted">제안 등급</span>
          <RiskLevelBadge level={analysis.suggestedLevel} />
          {analysis.confirmedLevel ? (
            <>
              <span className="text-fg-subtle">→</span>
              <span className="text-fg-muted">검토자 확정</span>
              <RiskLevelBadge level={analysis.confirmedLevel} />
            </>
          ) : (
            <span className="text-fg-subtle">· 아직 확정 등급이 없습니다</span>
          )}
        </div>

        {analysis.summary ? (
          <p className="whitespace-pre-wrap text-sm text-fg">{analysis.summary}</p>
        ) : null}

        {disagreed.length > 0 ? (
          <Alert tone="warning" title={`검토자 판단과 갈린 항목 ${disagreed.length}개`}>
            <ul className="mt-1 list-inside list-disc">
              {disagreed.map((entry) => (
                <li key={entry.code}>
                  {entry.label} — 분석은 {entry.applies ? '해당됨' : '해당 없음'}으로 봤습니다.
                </li>
              ))}
            </ul>
          </Alert>
        ) : null}

        <div>
          <p className="text-xs font-semibold text-fg-muted">
            해당된다고 본 항목 ({applied.length}/{analysis.suggestions.length})
          </p>

          {applied.length === 0 ? (
            <p className="mt-1 text-sm text-fg-subtle">
              해당되는 위험 항목을 찾지 못했습니다. 그래도 체크리스트는 직접 확인해 주세요.
            </p>
          ) : (
            <ul className="mt-2 flex flex-col gap-2">
              {applied.map((entry) => (
                <li key={entry.code} className="rounded-md border border-border p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="warning" icon={TriangleAlert}>
                      {entry.label}
                    </Badge>
                    {entry.disagrees ? (
                      <Badge tone="info" icon={CircleDot}>
                        검토자 판단과 다름
                      </Badge>
                    ) : null}
                  </div>
                  <p className="mt-1.5 text-sm text-fg">{entry.reason}</p>
                  {entry.evidence ? (
                    <p className="mt-1 border-l-2 border-border-strong pl-2 text-sm text-fg-muted">
                      등록 내용: {entry.evidence}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>

        {analysis.requiredControls.length > 0 ? (
          <div>
            <p className="text-xs font-semibold text-fg-muted">권장 통제</p>
            <ul className="mt-1.5 flex flex-col gap-1.5">
              {analysis.requiredControls.map((control) => (
                <li key={control.code} className="flex gap-2 text-sm text-fg">
                  <CircleCheck
                    className="mt-0.5 size-4 shrink-0 text-fg-subtle"
                    aria-hidden="true"
                  />
                  <span>
                    {control.description}
                    {control.mandatory ? (
                      <span className="ml-1 text-danger">(필수)</span>
                    ) : null}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
