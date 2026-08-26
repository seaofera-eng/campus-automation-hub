import {
  Archive,
  BadgeCheck,
  Ban,
  ClipboardList,
  FileEdit,
  FlaskConical,
  Hammer,
  Link2,
  Lock,
  RotateCcw,
  Search,
  Send,
  Shield,
  ShieldAlert,
  ShieldCheck,
  ShieldX,
  Sparkles,
  ThumbsDown,
  Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { DEMAND_STATUS_LABELS } from '@/domain/demand/types';
import type { DemandStatus } from '@/domain/demand/types';
import { IMPROVEMENT_STATUS_LABELS } from '@/domain/improvement/types';
import type { ImprovementStatus } from '@/domain/improvement/types';
import {
  DATA_CLASSIFICATION_LABELS,
  RISK_LEVEL_LABELS,
  TOOL_STATUS_LABELS,
  isSensitiveClassification,
} from '@/domain/tool/types';
import type { DataClassification, RiskLevel, ToolStatus } from '@/domain/tool/types';
import { Badge, type BadgeTone } from '@/components/ui/badge';

/**
 * 상태 배지.
 *
 * 요구사항 12번: 상태는 색만으로 구분하지 않는다. 모든 배지가
 * **한국어 라벨 + 고유 아이콘 + 색** 세 가지를 함께 쓴다.
 *
 * ## 상태와 위험도를 다른 색 계열로 나눈다
 *
 * 예전에는 둘 다 초록·주황·빨강을 썼다. 그래서 목록에서 초록 배지 두 개가
 * 나란히 있으면 하나는 "정식 승인"이고 하나는 "위험도 낮음"인데 눈으로는
 * 구분이 안 됐다.
 *
 * 이제 나눈다 (디자인 문서 §9):
 *
 * - **진행 상태** → 브랜드·중립 계열. 정식 승인만 파랑으로 또렷하게.
 * - **위험도** → 의미색(초록·주황·빨강) + 방패 아이콘 계열.
 * - **데이터 분류** → 배지가 아예 아니다. 아래 `DataClassificationChip` 참고.
 */

type Look = { tone: BadgeTone; icon: LucideIcon };

/*
 * 쓸 수 있는 도구인지가 한눈에 보여야 한다.
 * 정식 승인만 파랑이고, 검토를 지나는 중인 상태들은 중립·정보색으로 물러선다.
 * 이용자에게는 그 차이가 중요하지 않고, 검토자는 검토 큐에서 칸으로 구분한다.
 */
const TOOL_LOOKS: Record<ToolStatus, Look> = {
  DRAFT: { tone: 'neutral', icon: FileEdit },
  SUBMITTED: { tone: 'neutral', icon: Send },
  AI_REVIEW: { tone: 'info', icon: Sparkles },
  HUMAN_REVIEW: { tone: 'neutral', icon: Search },
  REVISION_REQUIRED: { tone: 'warning', icon: RotateCcw },
  PILOT: { tone: 'info', icon: FlaskConical },
  APPROVED: { tone: 'primary', icon: BadgeCheck },
  SUSPENDED: { tone: 'danger', icon: Ban },
  RETIRED: { tone: 'neutral', icon: Archive },
};

export function ToolStatusBadge({ status }: { status: ToolStatus }) {
  const look = TOOL_LOOKS[status];
  return (
    <Badge tone={look.tone} icon={look.icon}>
      {TOOL_STATUS_LABELS[status]}
    </Badge>
  );
}

const DEMAND_LOOKS: Record<DemandStatus, Look> = {
  DRAFT: { tone: 'neutral', icon: FileEdit },
  OPEN: { tone: 'info', icon: Users },
  MATCHED: { tone: 'primary', icon: Link2 },
  IN_DEVELOPMENT: { tone: 'warning', icon: Hammer },
  PILOT: { tone: 'warning', icon: FlaskConical },
  COMPLETED: { tone: 'success', icon: BadgeCheck },
  CLOSED: { tone: 'neutral', icon: Archive },
};

export function DemandStatusBadge({ status }: { status: DemandStatus }) {
  const look = DEMAND_LOOKS[status];
  return (
    <Badge tone={look.tone} icon={look.icon}>
      {DEMAND_STATUS_LABELS[status]}
    </Badge>
  );
}

const IMPROVEMENT_LOOKS: Record<ImprovementStatus, Look> = {
  OPEN: { tone: 'info', icon: ClipboardList },
  REVIEWING: { tone: 'info', icon: Search },
  ACCEPTED: { tone: 'primary', icon: BadgeCheck },
  IN_PROGRESS: { tone: 'warning', icon: Hammer },
  RELEASED: { tone: 'success', icon: BadgeCheck },
  REJECTED: { tone: 'danger', icon: ThumbsDown },
  CLOSED: { tone: 'neutral', icon: Archive },
};

export function ImprovementStatusBadge({ status }: { status: ImprovementStatus }) {
  const look = IMPROVEMENT_LOOKS[status];
  return (
    <Badge tone={look.tone} icon={look.icon}>
      {IMPROVEMENT_STATUS_LABELS[status]}
    </Badge>
  );
}

/*
 * 방패 아이콘 하나로 묶어 둔다. 목록에서 방패가 보이면 위험도 이야기다.
 * 색은 의미색만 쓴다 — 낮음 초록, 보통 주황, 높음 빨강 (문서 §9).
 */
const RISK_LOOKS: Record<RiskLevel, Look> = {
  LOW: { tone: 'success', icon: ShieldCheck },
  MEDIUM: { tone: 'warning', icon: Shield },
  HIGH: { tone: 'danger', icon: ShieldAlert },
  CRITICAL: { tone: 'danger', icon: ShieldX },
};

export function RiskLevelBadge({ level }: { level: RiskLevel }) {
  const look = RISK_LOOKS[level];
  return (
    <Badge
      tone={look.tone}
      icon={look.icon}
      // CRITICAL 은 HIGH 와 같은 빨강이라 색만으로는 안 갈린다.
      // 채운 배경으로 한 단계 더 세게 말한다. 라벨도 함께 있으므로
      // 색을 못 봐도 구분된다.
      className={level === 'CRITICAL' ? 'border-danger bg-danger text-white' : undefined}
    >
      위험도 {RISK_LEVEL_LABELS[level]}
    </Badge>
  );
}

/**
 * 데이터 분류 칩.
 *
 * ## 왜 배지가 아니라 다른 모양인가
 *
 * 데이터 분류는 **상태가 아니라 사실**이다. "이 도구는 개인정보를 다룬다"는
 * 나쁜 일이 아니라 알아야 할 일이다. 예전에는 빨간 배지로 그렸는데, 그러면
 * 목록에서 '사용 중지'나 '위험도 높음'과 같은 무게로 읽혔다.
 *
 * 그래서 **모양을 다르게** 했다 — 배지는 알약, 분류는 각진 칩이다.
 * 색을 못 보는 사람에게도 갈린다 (요구사항 12번).
 *
 * 민감 분류(개인정보·성적·상담·연구·재정)는 자물쇠와 주황 테두리로 눈에 띄게
 * 하되, 글자는 먹색이라 대비가 충분하다.
 */
export function DataClassificationChip({ value }: { value: DataClassification }) {
  const sensitive = isSensitiveClassification(value);
  return (
    <span
      className={
        sensitive
          ? 'inline-flex items-center gap-1 rounded-sm border border-warning/40 bg-warning-soft px-2 py-0.5 text-[12px] font-medium leading-5 text-fg'
          : 'inline-flex items-center gap-1 rounded-sm border border-border-strong bg-surface px-2 py-0.5 text-[12px] font-medium leading-5 text-fg-muted'
      }
    >
      {sensitive ? (
        <Lock className="size-3.5 shrink-0 text-warning" aria-hidden="true" />
      ) : null}
      {DATA_CLASSIFICATION_LABELS[value]}
    </span>
  );
}
