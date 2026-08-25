import Link from 'next/link';
import { FileQuestion } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-screen max-w-xl items-center px-4">
      <EmptyState
        icon={FileQuestion}
        title="페이지를 찾을 수 없습니다"
        description="주소가 바뀌었거나 삭제된 항목일 수 있습니다. 접근 권한이 없는 항목도 이 화면으로 표시됩니다."
        action={
          <Link href="/dashboard" className="text-sm font-medium text-primary hover:underline">
            대시보드로 이동 →
          </Link>
        }
        className="w-full"
      />
    </div>
  );
}
