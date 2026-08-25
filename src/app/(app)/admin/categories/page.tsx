import { listCategoriesForAdmin } from '@/application/admin/manage';
import { CategoryDialog } from '@/components/admin/category-editor';
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
                  {category.isActive ? (
                    <span className="text-sm text-fg-muted">사용 중</span>
                  ) : (
                    <Badge tone="neutral">사용 안 함</Badge>
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
