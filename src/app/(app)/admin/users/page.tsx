import { CircleCheck, CircleSlash } from 'lucide-react';
import { listUsers } from '@/application/admin/manage';
import { ChangeRoleDialog, EditUserDialog } from '@/components/admin/user-row-actions';
import { RoleBadge } from '@/components/layout/role-badge';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  TableWrapper,
} from '@/components/ui/table';
import { guardPage } from '@/lib/auth/page-guard';

export default async function AdminUsersPage() {
  const { actor, users, departments } = await guardPage(listUsers);

  return (
    <div className="flex flex-col gap-4">
      <Alert tone="info" title="역할 변경은 감사 로그에 남습니다">
        누가 언제 누구의 역할을 왜 바꿨는지 기록됩니다. 자신의 역할은 직접 바꿀 수 없습니다.
      </Alert>

      <TableWrapper>
        <Table>
          <TableCaption>등록된 사용자 {users.length}명</TableCaption>
          <TableHead>
            <TableRow>
              <TableHeaderCell>이름</TableHeaderCell>
              <TableHeaderCell>역할</TableHeaderCell>
              <TableHeaderCell>소속</TableHeaderCell>
              <TableHeaderCell className="text-right">담당 도구</TableHeaderCell>
              <TableHeaderCell>상태</TableHeaderCell>
              <TableHeaderCell>
                <span className="sr-only">작업</span>
              </TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((row) => {
              const isSelf = row.profile.id === actor.id;
              return (
                <TableRow key={row.profile.id}>
                  <TableCell>
                    <span className="flex flex-wrap items-center gap-1.5">
                      <span className="font-medium">{row.profile.name}</span>
                      {isSelf ? <Badge tone="primary">나</Badge> : null}
                      {row.profile.isDemoAccount ? (
                        <Badge tone="warning">데모 계정</Badge>
                      ) : null}
                    </span>
                    <p className="text-xs text-fg-subtle">{row.profile.email}</p>
                  </TableCell>
                  <TableCell>
                    <RoleBadge role={row.profile.role} />
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm text-fg-muted">
                    {row.departmentName ?? '소속 없음'}
                    {row.profile.title ? (
                      <span className="block text-xs text-fg-subtle">{row.profile.title}</span>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-sm">
                    {row.toolCount}
                  </TableCell>
                  <TableCell>
                    {/* 상태는 텍스트·아이콘·색 세 가지로 같이 표시한다.
                        색만으로 구분하면 색을 못 보는 사람에게는 아무 정보도 없다. */}
                    {row.profile.isActive ? (
                      <Badge tone="success" icon={CircleCheck}>
                        활성
                      </Badge>
                    ) : (
                      <Badge tone="danger" icon={CircleSlash}>
                        비활성
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="flex justify-end gap-1">
                      <EditUserDialog
                        userId={row.profile.id}
                        userName={row.profile.name}
                        departments={departments}
                        currentDepartmentId={row.profile.departmentId}
                        currentTitle={row.profile.title}
                        currentIsActive={row.profile.isActive}
                        isSelf={isSelf}
                      />
                      <ChangeRoleDialog
                        userId={row.profile.id}
                        userName={row.profile.name}
                        currentRole={row.profile.role}
                        isSelf={isSelf}
                      />
                    </span>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableWrapper>
    </div>
  );
}
