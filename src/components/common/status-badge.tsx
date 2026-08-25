import {
  Archive,
  BadgeCheck,
  Ban,
  CircleDashed,
  CircleSlash,
  ClipboardList,
  FileEdit,
  FlaskConical,
  Hammer,
  Link2,
  Lock,
  RotateCcw,
  Search,
  Send,
  ShieldAlert,
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
 */

type Look = { tone: BadgeTone; icon: LucideIcon };

const TOOL_LOOKS: Record<ToolStatus, Look> = {
  DRAFT: { tone: 'neutral', icon: FileEdit },
  SUBMITTED: { tone: 'info', icon: Send },
  AI_REVIEW: { tone: 'info', icon: Sparkles },
  HUMAN_REVIEW: { tone: 'info', icon: Search },
  REVISION_REQUIRED: { tone: 'warning', icon: RotateCcw },
  PILOT: { tone: 'warning', icon: FlaskConical },
  APPROVED: { tone: 'success', icon: BadgeCheck },
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

const RISK_LOOKS: Record<RiskLevel, Look> = {
  LOW: { tone: 'success', icon: CircleDashed },
  MEDIUM: { tone: 'info', icon: ShieldAlert },
  HIGH: { tone: 'warning', icon: ShieldAlert },
  CRITICAL: { tone: 'danger', icon: CircleSlash },
};

export function RiskLevelBadge({ level }: { level: RiskLevel }) {
  const look = RISK_LOOKS[level];
  return (
    <Badge tone={look.tone} icon={look.icon}>
      위험도 {RISK_LEVEL_LABELS[level]}
    </Badge>
  );
}

/**
 * 데이터 분류 칩.
 * 민감 분류(개인정보·성적·상담·연구·재정)는 자물쇠 아이콘과 경고색으로 눈에 띄게 한다.
 */
export function DataClassificationChip({ value }: { value: DataClassification }) {
  const sensitive = isSensitiveClassification(value);
  return (
    <Badge tone={sensitive ? 'danger' : 'neutral'} icon={sensitive ? Lock : undefined}>
      {DATA_CLASSIFICATION_LABELS[value]}
    </Badge>
  );
}
