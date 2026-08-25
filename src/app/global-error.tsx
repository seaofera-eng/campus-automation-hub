'use client';

/**
 * 루트 레이아웃까지 실패했을 때의 마지막 방어선.
 * 이 컴포넌트는 자체 <html>/<body> 를 렌더해야 하고, 앱의 CSS를 신뢰할 수 없다.
 */
export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="ko">
      <body
        style={{
          fontFamily: 'system-ui, sans-serif',
          margin: 0,
          padding: '3rem 1.5rem',
          lineHeight: 1.6,
        }}
      >
        <main style={{ maxWidth: '32rem', margin: '0 auto' }}>
          <h1 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>
            화면을 표시하지 못했습니다
          </h1>
          <p style={{ color: '#555' }}>
            일시적인 문제일 수 있습니다. 다시 시도해도 같은 화면이 나오면 관리자에게 문의해 주세요.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: '1.25rem',
              padding: '0.5rem 1rem',
              border: '1px solid #888',
              borderRadius: '0.375rem',
              background: '#fff',
              cursor: 'pointer',
            }}
          >
            다시 시도
          </button>
        </main>
      </body>
    </html>
  );
}
