'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

/**
 * 상세 화면 탭.
 *
 * 각 탭의 내용은 서버에서 이미 그려져 `content` 로 넘어온다.
 * 이 컴포넌트는 전환만 담당하므로 클라이언트로 내려가는 코드가 작다.
 */
export interface DetailTab {
  value: string;
  label: string;
  /** 탭 이름 옆에 표시할 개수 */
  count?: number;
  content: React.ReactNode;
}

export function ToolDetailTabs({ tabs }: { tabs: readonly DetailTab[] }) {
  const first = tabs[0];
  if (!first) return null;

  return (
    <Tabs defaultValue={first.value}>
      <TabsList aria-label="도구 상세 정보">
        {tabs.map((tab) => (
          <TabsTrigger key={tab.value} value={tab.value}>
            {tab.label}
            {tab.count !== undefined && tab.count > 0 ? (
              <span className="ml-1.5 rounded-full bg-surface-muted px-1.5 text-xs tabular-nums">
                {tab.count}
              </span>
            ) : null}
          </TabsTrigger>
        ))}
      </TabsList>

      {tabs.map((tab) => (
        <TabsContent key={tab.value} value={tab.value}>
          {tab.content}
        </TabsContent>
      ))}
    </Tabs>
  );
}
