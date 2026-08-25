import Link from 'next/link';
import { DataClassificationChip, ToolStatusBadge } from '@/components/common/status-badge';
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
import type { ToolListItem } from '@/domain/tool/types';

export function ToolTable({ items }: { items: readonly ToolListItem[] }) {
  return (
    <TableWrapper>
      <Table>
        <TableCaption>등록된 자동화 도구 목록</TableCaption>
        <TableHead>
          <TableRow>
            <TableHeaderCell>도구</TableHeaderCell>
            <TableHeaderCell>상태</TableHeaderCell>
            <TableHeaderCell>카테고리</TableHeaderCell>
            <TableHeaderCell>담당 부서</TableHeaderCell>
            <TableHeaderCell>다루는 데이터</TableHeaderCell>
            <TableHeaderCell className="text-right">평가</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {items.map((item) => {
            const used = item.version.security.classifications.filter((entry) => entry.inUse);
            return (
              <TableRow key={item.tool.id}>
                <TableCell>
                  <Link href={`/tools/${item.tool.id}`} className="font-medium hover:underline">
                    {item.tool.name}
                  </Link>
                  <p className="line-clamp-1 text-xs text-fg-muted">{item.tool.summary}</p>
                </TableCell>
                <TableCell>
                  <ToolStatusBadge status={item.tool.status} />
                </TableCell>
                <TableCell className="whitespace-nowrap text-sm text-fg-muted">
                  {item.categoryName}
                </TableCell>
                <TableCell className="whitespace-nowrap text-sm text-fg-muted">
                  {item.departmentName}
                </TableCell>
                <TableCell>
                  {used.length === 0 ? (
                    <span className="text-xs text-fg-subtle">미입력</span>
                  ) : (
                    <span className="flex flex-wrap gap-1">
                      {used.map((entry) => (
                        <DataClassificationChip
                          key={entry.classification}
                          value={entry.classification}
                        />
                      ))}
                    </span>
                  )}
                </TableCell>
                <TableCell className="whitespace-nowrap text-right text-sm tabular-nums">
                  {item.averageOverallScore === null ? (
                    <span className="text-fg-subtle">평가 없음</span>
                  ) : (
                    <>
                      {item.averageOverallScore.toFixed(1)}
                      <span className="text-fg-subtle"> ({item.evaluationCount})</span>
                    </>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableWrapper>
  );
}
