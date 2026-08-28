'use client';

import { Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { isDemoMode } from '@/lib/config/env';

/**
 * 시연용 예시 채우기 버튼 (DEMO 모드 전용).
 *
 * ## 왜 있는가
 *
 * 심사 자리에서 위저드 네 단계를 손으로 채우면 5분이 걸리고, 그동안 보는
 * 사람은 타자를 구경한다. **보여줘야 할 것은 입력이 아니라 입력한 뒤에
 * 일어나는 일이다.**
 *
 * ## 운영에서는 없는 버튼이다
 *
 * `NEXT_PUBLIC_DEMO_MODE=false` 면 아무것도 그리지 않는다. 값을 지어내는
 * 기능이 운영 화면에 남아 있으면 안 된다.
 *
 * ## 채우기만 하고 저장하지 않는다
 *
 * 무엇이 들어갔는지 보고 나서 본인이 저장을 눌러야 한다. 자동으로 저장까지
 * 하면 시연에서 "방금 뭐가 저장된 거지"가 된다.
 */
export function DemoFillButton({
  onFill,
  label = '예시로 채우기',
  description,
}: {
  onFill: () => void;
  label?: string;
  /** 무엇이 채워지는지 한 줄. 시연을 보는 사람에게도 읽힌다. */
  description: string;
}) {
  if (!isDemoMode()) return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-dashed border-warning/50 bg-warning-soft px-4 py-3">
      <p className="text-sm text-fg">
        <span className="font-semibold">시연용</span> · {description}
      </p>
      <Button type="button" variant="secondary" size="sm" onClick={onFill}>
        <Wand2 aria-hidden="true" />
        {label}
      </Button>
    </div>
  );
}
