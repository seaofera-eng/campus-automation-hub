import { ImageIcon } from 'lucide-react';
import Image from 'next/image';

/**
 * 랜딩·마법사에 들어가는 그림.
 *
 * ## 그림이 없으면 자리만 잡아 둔다
 *
 * 아직 안 받은 그림이 있다. 자리까지 없애면 나중에 넣을 때 화면 배치가 통째로
 * 흔들리므로, 최종 비율 그대로 자리를 잡고 **필요한 크기를 화면에 적어 둔다.**
 * 그림을 만드는 사람이 코드를 열어 보지 않아도 되게.
 *
 * `src` 가 들어오면 그림을 그리고 안내 문구는 사라진다. 심사 자리에서
 * "이미지 준비 중"이 보이면 안 된다.
 *
 * ## next/image 를 쓰는 이유
 *
 * 받은 원본이 한 장에 1MB 다. 다섯 장이면 5MB 라 시연 자리에서 망이 느리면
 * 그대로 티가 난다. `next/image` 는 화면에 실제로 그려지는 크기에 맞춰
 * WebP 로 줄여 내보내므로, 원본을 그대로 두고도 실제 전송량은 수십 KB 가 된다.
 *
 * ## alt 는 장식이 아니다
 *
 * 받은 그림에는 "STEP 3 / 5"와 질문이 **그림 안에 그려져 있다.** 그래서 화면
 * 낭독기에게는 그 글자가 존재하지 않는 것과 같고, 그림이 안 뜨면 질문 자체가
 * 사라진다. `alt` 에 같은 문장을 넣어 두 경우 모두를 막는다.
 */
export function LandingArtwork({
  slot,
  label,
  note,
  width,
  height,
  src,
  priority = false,
  sizes = '(min-width: 1024px) 300px, 100vw',
  fit = 'width',
}: {
  /** 파일 이름에 쓸 이름. `public/landing/<slot>.png` 로 받는다. */
  slot: string;
  /** 그림이 있으면 alt 로, 없으면 자리표시자 제목으로 쓴다. */
  label: string;
  /** 어디에 들어가는 그림인지 한 줄. 자리표시자에만 보인다. */
  note: string;
  width: number;
  height: number;
  /** 그림이 준비되면 경로를 넘긴다. 넘기면 자리표시자 대신 그림이 그려진다. */
  src?: string;
  /** 첫 화면에 바로 보이는 그림이면 켠다. 늦게 뜨는 것이 눈에 띈다. */
  priority?: boolean;
  /** 화면에서 실제로 차지하는 폭. 내려받을 크기를 정한다. */
  sizes?: string;
  /**
   * 어떻게 맞출지.
   *
   * - `width` — 가로를 채우고 높이는 비율대로. 보통 이쪽이다.
   * - `contain` — **부모가 정한 상자 안에** 비율을 지켜 들어간다. 남는 높이를
   *   채워야 할 때 쓴다. 부모에 높이가 있어야 한다.
   */
  fit?: 'width' | 'contain';
}) {
  if (src) {
    return (
      <Image
        src={src}
        alt={label}
        width={width}
        height={height}
        priority={priority}
        /*
          실제로 그려지는 폭. 이 값으로 내려받을 크기가 정해진다.
          자리마다 크기가 달라서 부르는 쪽이 정한다 — 마법사 옆 그림은 300px,
          랜딩 머리 그림은 768px 다. 하나로 고정하면 한쪽이 흐려진다.
        */
        sizes={sizes}
        className={
          fit === 'contain'
            ? 'h-full max-h-full w-full object-contain select-none'
            : 'h-auto w-full select-none'
        }
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
