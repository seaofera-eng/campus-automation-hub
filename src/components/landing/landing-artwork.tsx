import { ImageIcon } from 'lucide-react';

/**
 * 이미지가 들어갈 자리.
 *
 * 랜딩과 마법사에 들어갈 그림은 나중에 받기로 했다 (리뷰 2026-08-26 2절).
 * 그때까지 이 자리를 **비워 두되, 자리는 정확히 잡아 둔다.**
 *
 * ## 왜 회색 네모를 그리는가
 *
 * 그림이 없다고 자리까지 없애면, 나중에 그림을 넣을 때 화면 배치가 통째로
 * 다시 흔들린다. 그래서 최종 비율 그대로 자리를 잡아 두고 **필요한 크기를
 * 화면에 적어 둔다.** 그림을 만드는 사람이 코드를 열어 보지 않아도 되게.
 *
 * ## 자리표시자를 시연에 그대로 내보내지 않는다
 *
 * `src` 가 들어오면 그림을 그리고 안내 문구는 사라진다. 심사 자리에서
 * "이미지 준비 중"이 보이면 안 된다.
 *
 * ## 크기 규칙
 *
 * `width`/`height` 는 **실제 파일의 픽셀 크기**다. 화면에는 이 비율로만
 * 그린다 (`aspect-ratio`). 고해상도 화면을 감안해 표시 크기의 2배로 잡았다.
 */
export function LandingArtwork({
  slot,
  label,
  note,
  width,
  height,
  src,
}: {
  /** 파일 이름에 쓸 이름. `public/landing/<slot>.png` 로 받는다. */
  slot: string;
  label: string;
  /** 어디에 들어가는 그림인지 한 줄 */
  note: string;
  width: number;
  height: number;
  /** 그림이 준비되면 경로를 넘긴다. 넘기면 자리표시자 대신 그림이 그려진다. */
  src?: string;
}) {
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- 정적 에셋이라 최적화 파이프라인이 필요 없다
      <img
        src={src}
        alt={label}
        width={width}
        height={height}
        className="w-full rounded-card border border-border object-cover"
      />
    );
  }

  return (
    <div
      className="flex w-full flex-col items-center justify-center gap-2 rounded-card border-2 border-dashed border-border-strong bg-surface-muted p-5 text-center"
      style={{ aspectRatio: `${width} / ${height}` }}
    >
      <ImageIcon className="size-6 text-fg-subtle" aria-hidden="true" />
      <p className="text-sm font-semibold text-fg-muted">{label}</p>
      <p className="text-xs text-fg-subtle">{note}</p>
      <p className="mt-1 font-mono text-xs text-fg-subtle">
        {width} × {height} px
      </p>
      <p className="font-mono text-xs text-fg-subtle">public/landing/{slot}.png</p>
    </div>
  );
}
