import { ChevronDown } from 'lucide-react';

/**
 * 상세 화면의 펼쳐보기 묶음.
 *
 * 탭을 11개 늘어놓는 대신 한 화면에 접어 둔다 (리뷰 4.2절).
 * 탭은 열어 봐야 뭐가 있는지 알 수 있지만, 접힌 제목은 한눈에 훑을 수 있다.
 *
 * `<details>` 를 그대로 쓴다. 자바스크립트 없이 열리고, 브라우저의 페이지 내
 * 찾기(Ctrl+F)가 접힌 내용까지 찾아 준다.
 */
export function DetailAccordion({
  title,
  hint,
  defaultOpen = false,
  children,
}: {
  title: string;
  hint?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  return (
    <details
      open={defaultOpen}
      className="group rounded-card border border-border bg-surface open:bg-surface"
    >
      <summary className="flex cursor-pointer items-center justify-between gap-3 rounded-card px-4 py-3 text-sm font-semibold text-fg transition-colors hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
        <span className="min-w-0">
          {title}
          {hint ? <span className="ml-2 text-xs font-normal text-fg-subtle">{hint}</span> : null}
        </span>
        <ChevronDown
          className="size-4 shrink-0 text-fg-subtle transition-transform group-open:rotate-180 motion-reduce:transition-none"
          aria-hidden="true"
        />
      </summary>
      <div className="border-t border-border px-4 py-3">{children}</div>
    </details>
  );
}
