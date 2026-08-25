import { listDepartmentsForAdmin } from '@/application/admin/manage';
import { DeleteDepartmentButton, DepartmentDialog } from '@/components/admin/department-editor';
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

export default async function AdminDepartmentsPage() {
  const { departments } = await guardPage(listDepartmentsForAdmin);
  const departmentNames = new Map(departments.map((d) => [d.id, d.name]));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <DepartmentDialog department={null} departments={departments} />
      </div>

      <TableWrapper>
        <Table>
          <TableCaption>
            등록된 부서 {departments.length}개 · 소속 인원이나 도구가 있으면 삭제할 수 없습니다.
          </TableCaption>
          <TableHead>
            <TableRow>
              <TableHeaderCell>부서 이름</TableHeaderCell>
              <TableHeaderCell>코드</TableHeaderCell>
              <TableHeaderCell>상위 부서</TableHeaderCell>
              <TableHeaderCell className="text-right">인원</TableHeaderCell>
              <TableHeaderCell className="text-right">도구</TableHeaderCell>
              <TableHeaderCell>
                <span className="sr-only">작업</span>
              </TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {departments.map((department) => (
              <TableRow key={department.id}>
                <TableCell className="font-medium">{department.name}</TableCell>
                <TableCell className="text-sm text-fg-muted">{department.code}</TableCell>
                <TableCell className="text-sm text-fg-muted">
                  {department.parentId
                    ? (departmentNames.get(department.parentId) ?? '알 수 없음')
                    : '—'}
                </TableCell>
                <TableCell className="text-right tabular-nums text-sm">
                  {department.memberCount}
                </TableCell>
                <TableCell className="text-right tabular-nums text-sm">
                  {department.toolCount}
                </TableCell>
                <TableCell>
                  <span className="flex justify-end gap-1">
                    <DepartmentDialog department={department} departments={departments} />
                    <DeleteDepartmentButton
                      departmentId={department.id}
                      name={department.name}
                      memberCount={department.memberCount}
                      toolCount={department.toolCount}
                    />
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableWrapper>
    </div>
  );
}
