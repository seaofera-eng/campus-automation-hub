import { ShieldCheck } from 'lucide-react';

/**
 * 등록 신청 직전에 "이 내용이 어디로 가는지" 알리는 안내.
 *
 * 신청을 누르면 등록 내용이 외부 모델로 나간다. 그걸 나중에 알게 하지 않는다.
 * 무엇이 나가고 무엇이 안 나가는지 여기서 먼저 말한다.
 *
 * 실제 차단은 이 문구가 아니라 `adapters/ai/live/redact.ts` 의 허용 목록이
 * 한다. 여기 적힌 것과 코드가 어긋나면 코드를 고쳐야 한다.
 */
export function SubmitAnalysisNotice() {
  return (
    <div className="flex gap-3 rounded-card border border-border-strong bg-surface-muted p-4 text-sm">
      <ShieldCheck className="mt-0.5 size-5 shrink-0 text-fg-subtle" aria-hidden="true" />
      <div>
        <p className="font-medium text-fg">
          신청하면 이미 등록된 도구와 겹치는지, 어떤 위험이 있는지 자동으로 확인합니다.
        </p>
        <p className="mt-1 text-fg-muted">
          확인에는 위에 적으신 <strong>도구 설명</strong>만 사용합니다. 도구가 실제로 처리하는
          데이터, 첨부파일 내용, 만든 사람의 이름과 연락처는 보내지 않습니다.
        </p>
        <p className="mt-1 text-fg-muted">
          결과는 검토자가 참고하는 자료이며, 승인·반려는 검토자가 직접 판단합니다.
        </p>
      </div>
    </div>
  );
}
