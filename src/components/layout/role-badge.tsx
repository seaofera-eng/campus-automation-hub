import { ShieldCheck, Search, Code2, User } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { USER_ROLE_LABELS } from '@/domain/authz/roles';
import type { UserRole } from '@/domain/authz/roles';
import { Badge, type BadgeTone } from '@/components/ui/badge';

const ROLE_LOOKS: Record<UserRole, { tone: BadgeTone; icon: LucideIcon }> = {
  ADMIN: { tone: 'danger', icon: ShieldCheck },
  REVIEWER: { tone: 'info', icon: Search },
  DEVELOPER: { tone: 'primary', icon: Code2 },
  REQUESTER: { tone: 'neutral', icon: User },
};

export function RoleBadge({ role }: { role: UserRole }) {
  const look = ROLE_LOOKS[role];
  return (
    <Badge tone={look.tone} icon={look.icon}>
      {USER_ROLE_LABELS[role]}
    </Badge>
  );
}
