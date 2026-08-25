import next from 'eslint-config-next';
import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';

/**
 * 계층 경계 규칙.
 *
 * 의존 방향은 다음 한 방향만 허용한다.
 *   app / components  →  actions  →  application  →  repositories / adapters
 *                                          ↓
 *                                       domain (의존성 0)
 *
 * 아래 no-restricted-imports 설정은 이 방향을 어기는 import를 빌드 전에 차단한다.
 * 자세한 배경은 docs/ARCHITECTURE.md 참고.
 */
const layerBoundaries = [
  {
    files: ['src/domain/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '@/app/*',
                '@/actions/*',
                '@/application/*',
                '@/components/*',
                '@/repositories/*',
                '@/adapters/*',
                '@/lib/*',
              ],
              message:
                'domain 계층은 다른 계층에 의존할 수 없습니다. 순수 타입과 규칙만 두고, 필요한 값은 인자로 전달받으세요.',
            },
            {
              group: ['react', 'react-dom', 'next', 'next/*', 'server-only'],
              message:
                'domain 계층은 프레임워크에 의존하지 않습니다. 이 로직은 application 계층으로 옮기세요.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/application/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/app/*', '@/actions/*', '@/components/*'],
              message:
                'application 계층은 UI를 알지 못합니다. 의존 방향을 UI → application 으로 유지하세요.',
            },
            {
              group: ['react', 'react-dom'],
              message: 'application 계층에서는 React를 사용하지 않습니다.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/repositories/**/*.{ts,tsx}', 'src/adapters/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/app/*', '@/actions/*', '@/components/*', '@/application/*'],
              message:
                'repository/adapter 계층은 application 이상을 참조할 수 없습니다. 인터페이스는 repositories/types 에 두세요.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/components/**/*.{ts,tsx}', 'src/app/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/repositories/*'],
              message:
                'UI에서 repository를 직접 호출하지 마세요. application 서비스 또는 서버 액션을 경유해야 권한 검사와 감사 로그가 적용됩니다.',
            },
          ],
        },
      ],
    },
  },
];

const config = [
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'out/**',
      'coverage/**',
      'playwright-report/**',
      'test-results/**',
      '.data/**',
      'next-env.d.ts',
    ],
  },
  ...next,
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      eqeqeq: ['error', 'always', { null: 'ignore' }],
    },
  },
  ...layerBoundaries,
  {
    files: ['tests/**/*.{ts,tsx}', 'e2e/**/*.{ts,tsx}', 'scripts/**/*.{mjs,ts}'],
    rules: {
      'no-console': 'off',
      'no-restricted-imports': 'off',
    },
  },
];

export default config;
