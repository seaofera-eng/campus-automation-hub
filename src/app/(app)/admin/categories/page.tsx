import { CircleCheck, CircleSlash } from 'lucide-react';
import { listCategoriesForAdmin } from '@/application/admin/manage';
import { CategoryDialog } from '@/components/admin/category-editor';
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

export default async function AdminCategoriesPage() {
  const { categories } = await guardPage(listCategoriesForAdmin);

  return (
    <div className="flex flex-col gap-4">
      {/* "삭제는 어디 있나" 를 찾게 두지 않는다. 없는 이유를 먼저 말한다. */}
      <Alert tone="info" title="카테고리는 지우지 않고 '사용 안 함'으로 내립니다">
        이미 그 카테고리로 등록된 도구가 있는데 지우면 그 도구들이 분류를 잃습니다.
        내려도 기존 도구는 그대로 남고, 새 도구를 등록할 때만 선택지에서 빠집니다.
      </Alert>

      <div className="flex justify-end">
        <CategoryDialog category={null} />
      </div>

      <TableWrapper>
        <Table>
          <TableCaption>등록된 카테고리 {categories.length}개</TableCaption>
          <TableHead>
            <TableRow>
              <TableHeaderCell>이름</TableHeaderCell>
              <TableHeaderCell>코드</TableHeaderCell>
              <TableHeaderCell>설명</TableHeaderCell>
              <TableHeaderCell className="text-right">등록 도구</TableHeaderCell>
              <TableHeaderCell>상태</TableHeaderCell>
              <TableHeaderCell>
                <span className="sr-only">작업</span>
              </TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {categories.map((category) => (
              <TableRow key={category.id}>
                <TableCell className="font-medium">{category.name}</TableCell>
                <TableCell className="text-sm text-fg-muted">{category.code}</TableCell>
                <TableCell className="text-sm text-fg-muted">
                  {category.description || '—'}
                </TableCell>
                <TableCell className="text-right tabular-nums text-sm">
                  {category.toolCount}
                </TableCell>
                <TableCell>
                  {/* 상태는 텍스트·아이콘·색 세 가지로 같이 표시한다.
                      색만으로 구분하면 색을 못 보는 사람에게는 아무 정보도 없다. */}
                  {category.isActive ? (
                    <Badge tone="success" icon={CircleCheck}>
                      사용 중
                    </Badge>
                  ) : (
                    <Badge tone="neutral" icon={CircleSlash}>
                      사용 안 함
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  <span className="flex justify-end">
                    <CategoryDialog category={category} toolCount={category.toolCount} />
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
