'use client';

import { Plus, X } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/field';

/**
 * 문자열 목록 입력 (주요 기능, 태그 등).
 *
 * Enter 로 추가되지만 폼 전체가 제출되지 않도록 keydown 에서 기본 동작을 막는다.
 * 위저드 안에서 Enter 가 "다음 단계"로 튀는 사고를 막기 위함이다.
 */
export interface StringListInputProps {
  id: string;
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  /** 한 항목의 최대 길이 */
  maxLength?: number;
  disabled?: boolean;
}

export function StringListInput({
  id,
  values,
  onChange,
  placeholder,
  maxLength = 200,
  disabled,
}: StringListInputProps) {
  const [draft, setDraft] = useState('');

  function add() {
    const trimmed = draft.trim();
    if (trimmed === '' || values.includes(trimmed)) {
      setDraft('');
      return;
    }
    onChange([...values, trimmed]);
    setDraft('');
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <Input
          id={id}
          value={draft}
          maxLength={maxLength}
          placeholder={placeholder}
          disabled={disabled}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              add();
            }
          }}
        />
        <Button type="button" variant="secondary" onClick={add} disabled={disabled}>
          <Plus aria-hidden="true" />
          추가
        </Button>
      </div>

      {values.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {values.map((value) => (
            <li
              key={value}
              className="flex items-center gap-1 rounded-full border border-border-strong bg-surface-muted py-1 pl-3 pr-1 text-sm text-fg"
            >
              {value}
              <button
                type="button"
                disabled={disabled}
                onClick={() => onChange(values.filter((item) => item !== value))}
                aria-label={`${value} 삭제`}
                className="rounded-full p-1 text-fg-subtle transition-colors hover:bg-danger-soft hover:text-danger"
              >
                <X className="size-3.5" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
