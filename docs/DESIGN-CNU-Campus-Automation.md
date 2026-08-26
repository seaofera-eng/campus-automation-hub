---
version: 1.0
name: CNU-campus-automation-design
description: >
  충남대학교의 공식 UI 색상 체계와 대학·공공서비스의 신뢰성을 바탕으로,
  Campus Automation Hub에 적용할 경량 디자인 시스템.
  핵심은 "CNU Blue 중심 + Magenta 최소 보조 + White/Gray 기반"이며,
  전체 재설계가 아니라 뼈대 → 주요 컴포넌트 → 디테일 순으로 단계 적용한다.
apply_mode: staged
priority: foundation-first
---

# CNU Campus Automation Hub Design System

## 0. Purpose

이 문서는 **Campus Automation Hub(캠퍼스 자동화 도구 플랫폼)**의 디자인 기준이다.

서비스 목적:
- 대학 내 AI·업무 자동화 프로그램을 한곳에서 탐색·등록·관리
- 중복, 보안, 비용, 성과, 위험 정보를 명확하게 전달
- 대학 구성원이 "도구를 찾고 → 비교하고 → 활용하고 → 개선을 요청"할 수 있도록 지원
- 경진대회 시연 시 첫 화면만으로도 **"대학의 AI 자동화 관제 플랫폼"**임을 이해할 수 있게 함

디자인 인상:
- 충남대학교다운 신뢰성
- 대학 행정시스템보다 현대적이고 가벼움
- 일반 SaaS보다 공공성과 안정감이 있음
- AI 서비스답지만 과도하게 미래지향적이거나 화려하지 않음
- 정보가 많아도 우선순위가 빠르게 읽힘

---

# 1. Mandatory Implementation Strategy

## 절대 한 번에 전체 UI를 재설계하지 않는다.

Claude Code는 이 디자인을 아래 단계 순서로 적용한다.

### Phase 1 — Foundation / 가장 먼저 적용

목표: **전체 화면의 뼈대와 분위기만 통일**

우선 수정:
1. 전역 색상 토큰
2. 기본 폰트와 제목 계층
3. 페이지 배경
4. App Shell
5. Header / Sidebar
6. Button
7. Card
8. Badge
9. Input / Search
10. 공통 간격과 radius

Phase 1에서 하지 말 것:
- 페이지별 세부 리디자인
- 애니메이션
- 차트 재설계
- 모든 테이블 스타일 수정
- 모든 hover state 미세조정
- 아이콘 전체 교체
- 비즈니스 로직 수정
- API / DB / 라우팅 수정

**Phase 1 완료 후 화면을 먼저 검토한다.**

---

### Phase 2 — Core Product Components

Phase 1 승인 후 적용:

- Automation Tool Card
- Search / Filter bar
- Tool Detail Header
- Risk Badge
- Status Badge
- Metric Card
- Demand Card
- Improvement Request Card
- Table 기본 스타일
- Tabs
- Empty State

---

### Phase 3 — Detail Polish

Phase 2 승인 후 적용:

- hover / active / focus 세부 상태
- skeleton / loading
- empty / error 화면
- 모바일 미세조정
- transition
- tooltip
- icon spacing
- 표·필터·폼 세부 간격
- 시연용 화면 polish

---

### Phase 4 — Design Audit

최종 단계:

- 화면별 일관성 검사
- 색상 과사용 확인
- CNU Blue/Magenta 비율 확인
- 접근성 대비 확인
- 중복 CSS 확인
- 사용하지 않는 token 정리
- lint / typecheck / build

---

# 2. Brand Direction

충남대학교 공식 UI 자료의 기본 원칙을 참고한다.

공식 UI 색상 기준:
- 주 색상: `C100 M80 Y0 K0`
- 보조 색상: `C0 M90 Y0 K0`
- 주 색상의 사용 비율을 보조 색상보다 넓게 사용
- 흰색과 저채도 회색을 보조 배경으로 활용

웹 서비스에서는 공식 인쇄색을 그대로 강제하기보다,
접근성과 UI 가독성을 고려한 **CNU-inspired digital tokens**를 사용한다.

중요:
- 공식 로고 자체의 색상·비율·형태는 임의로 변형하지 않는다.
- 아래 HEX 값은 이 서비스용 디지털 UI 토큰이며 공식 로고 색상값을 대체하지 않는다.

---

# 3. Color System

## 3.1 Core

```yaml
colors:
  cnu-blue: "#164A9B"
  cnu-blue-bright: "#2563C7"
  cnu-blue-deep: "#0B2F6B"
  cnu-blue-soft: "#EAF1FB"

  cnu-magenta: "#C52A7A"
  cnu-magenta-soft: "#FBEAF3"

  ink: "#18202B"
  ink-soft: "#344054"
  graphite: "#667085"

  canvas: "#F7F9FC"
  paper: "#FFFFFF"
  cloud: "#F1F4F8"
  fog: "#E7ECF2"

  border: "#E1E7EF"
  border-strong: "#C8D1DD"

  success: "#23845B"
  success-soft: "#EAF7F1"

  warning: "#B26A00"
  warning-soft: "#FFF4DF"

  danger: "#C63D43"
  danger-soft: "#FDEDEE"

  info: "#2E65B0"
  info-soft: "#EAF2FC"
```

## 3.2 Color Rules

### CNU Blue
가장 중요한 색상.

사용:
- Primary CTA
- 현재 선택된 메뉴
- 활성 탭
- 중요한 링크
- 핵심 KPI 일부
- focus indicator

한 화면에서 큰 파란 면적은 최소화한다.

### CNU Magenta
**보조 강조색**으로만 사용.

사용:
- AI / Innovation 관련 작은 accent
- 신규 기능 표시
- 제한적인 그래픽 포인트
- 일부 시각적 강조

사용 금지:
- 전체 사이드바 배경
- 모든 버튼
- 큰 페이지 배경
- 위험 상태 표현

권장 비율:

`CNU Blue : CNU Magenta ≈ 8 : 2 이상`

### Semantic Colors
위험과 상태는 브랜드 색과 분리한다.

- 성공 → green
- 주의 → amber
- 위험 → red
- 정보 → blue

---

# 4. Typography

한국어 UI를 우선한다.

```yaml
font:
  primary: "Pretendard Variable"
  fallback: "Pretendard, Inter, Noto Sans KR, system-ui, sans-serif"
```

Pretendard를 사용할 수 없는 환경에서는 시스템 폰트로 자동 fallback 한다.

## Hierarchy

| Token | Desktop | Weight | Use |
|---|---:|---:|---|
| page-title | 30px | 700 | 페이지 제목 |
| section-title | 22px | 700 | 주요 섹션 |
| card-title | 17px | 650 | 카드 제목 |
| body-lg | 17px | 400 | 소개 문구 |
| body | 15px | 400 | 기본 UI |
| body-emphasis | 15px | 600 | 강조 |
| caption | 13px | 400 | 메타정보 |
| micro | 12px | 500 | 배지·보조정보 |

원칙:
- Hero용 50~70px 초대형 제목을 사용하지 않는다.
- 플랫폼 UI에서는 **정보 밀도와 가독성**을 우선한다.
- 제목은 진하게, 본문은 과도하게 bold 처리하지 않는다.
- 버튼 라벨을 영어식 ALL CAPS로 만들지 않는다.

---

# 5. Spacing

8px 기반.

```yaml
spacing:
  xxs: 4px
  xs: 8px
  sm: 12px
  md: 16px
  lg: 20px
  xl: 24px
  xxl: 32px
  section: 48px
```

기본 규칙:
- 카드 내부: 20~24px
- 컴포넌트 사이: 12~16px
- 카드 grid gap: 20~24px
- 페이지 상하 여백: 28~40px
- 큰 섹션 간격: 40~48px

행정 플랫폼이므로 지나치게 넓은 랜딩페이지식 여백은 피한다.

---

# 6. Shape & Elevation

```yaml
radius:
  sm: 6px
  md: 10px
  lg: 14px
  pill: 9999px
```

사용:
- Button / Input: `6~10px`
- Card: `12~14px`
- Badge: pill 또는 6px
- Modal: 14px

Shadow:

```yaml
shadow:
  none: none
  card: "0 1px 3px rgba(16, 24, 40, 0.06), 0 1px 2px rgba(16, 24, 40, 0.04)"
  floating: "0 8px 24px rgba(16, 24, 40, 0.12)"
```

원칙:
- 기본은 border 중심
- 강한 그림자 금지
- 카드가 떠다니는 느낌보다 **정돈된 업무 시스템**처럼 보이게 함

---

# 7. App Shell

## Desktop

```text
┌──────── Sidebar ────────┬──────────────────────────────┐
│ CNU / Service           │ Header                       │
│                         ├──────────────────────────────┤
│ Home                    │                              │
│ 자동화 도구             │ Main Content                 │
│ 자동화 수요             │                              │
│ 개선 요청               │                              │
│ 내 활동                 │                              │
│                         │                              │
│ ─────────────           │                              │
│ 사용자 정보             │                              │
└─────────────────────────┴──────────────────────────────┘
```

### Sidebar

- 기본 배경: `paper`
- 오른쪽 border: `border`
- 폭: 232~248px
- CNU Blue를 전체 배경으로 사용하지 않는다.
- active 메뉴에 `cnu-blue-soft` 배경 + `cnu-blue` 아이콘/텍스트
- active indicator는 왼쪽 3px blue line 또는 soft-fill 중 하나만 사용

### Header

- 높이: 64px
- 흰색
- 하단 1px border
- 검색, 페이지 문맥, 사용자 메뉴 정도만 배치
- 장식적 요소 최소화

### Main

- 배경: `canvas`
- max-width: 1440px
- 콘텐츠 영역 padding:
  - desktop 32px
  - tablet 24px
  - mobile 16px

---

# 8. Core Components — Phase 1

## Primary Button

```yaml
button-primary:
  background: cnu-blue
  color: white
  height: 42px
  radius: 8px
  padding: 0 18px
  fontSize: 14px
  fontWeight: 600
```

Hover:
- `cnu-blue-deep`

사용:
- 등록
- 신청
- 저장
- 핵심 실행

한 화면에 primary CTA를 남발하지 않는다.

---

## Secondary Button

```yaml
button-secondary:
  background: paper
  color: ink
  border: border-strong
  height: 42px
  radius: 8px
```

사용:
- 취소
- 초기화
- 비교
- 상세보기

---

## Card

```yaml
card:
  background: paper
  border: 1px solid border
  radius: 14px
  padding: 20px
  shadow: card
```

Card 원칙:
- 카드 안에 카드 중첩 최소화
- 컬러 배경 카드 남발 금지
- 중요도가 낮은 카드에는 shadow 생략 가능

---

## Input / Search

```yaml
input:
  height: 42px
  background: paper
  border: border-strong
  radius: 8px
  fontSize: 14px
```

Focus:
- 1px `cnu-blue`
- 가벼운 focus ring 허용

---

## Badge

Badge는 정보를 빠르게 인식하기 위한 도구다.

예:

- 승인됨
- 시범운영
- 검토중
- 낮은 위험
- 보통 위험
- 높은 위험
- AI
- 신규

모든 badge는 텍스트를 포함해야 한다.

색만으로 상태를 표현하지 않는다.

---

# 9. Campus Automation Specific Components — Phase 2

## Tool Card

순서:

1. category / status
2. 도구명
3. 한 줄 설명
4. 담당 부서
5. 핵심 태그
6. 평점 / 이용량 / 위험도
7. 상세보기

```text
┌────────────────────────────────┐
│ [회의·일정]          [승인됨] │
│                                │
│ AI 회의록 정리 도구            │
│ 회의 내용을 요약하고 업무를... │
│                                │
│ 정보화본부                     │
│ #회의 #요약 #업무추출         │
│                                │
│ ★ 4.7   월 382회   위험도 보통 │
│                       상세보기 │
└────────────────────────────────┘
```

중요:
- Tool Card는 쇼핑몰 상품 카드처럼 보이지 않아야 한다.
- 가격보다 **업무 가치 / 활용 / 위험 정보**가 먼저 보여야 한다.

---

## Risk Badge

```yaml
risk:
  low:
    label: "낮음"
    background: success-soft
    text: success

  medium:
    label: "보통"
    background: warning-soft
    text: warning

  high:
    label: "높음"
    background: danger-soft
    text: danger
```

가능하면 shield icon을 함께 사용.

---

## Status Badge

상태는 브랜드 색을 활용해도 되지만 의미가 명확해야 한다.

추천:
- 승인됨 → blue
- 검토중 → neutral
- 시범운영 → info
- 개선필요 → warning
- 중지 → danger

---

## Metric Card

대시보드 KPI 예:

- 등록 도구
- 월간 이용
- 업무시간 절감
- 신규 수요

구성:
- 작은 아이콘
- caption label
- 큰 숫자
- 짧은 보조 문구

CNU Blue 배경의 KPI 카드 4개를 만들지 않는다.

모든 카드는 white base.
강조가 필요한 숫자나 icon에만 blue 사용.

---

# 10. Home Page Direction

첫 10초 안에 다음이 보여야 한다.

> "대학 내 AI·자동화 도구를 찾고 관리하는 플랫폼"

추천 구조:

```text
Page Header
↓
짧은 서비스 설명 + 주요 CTA
↓
핵심 KPI 4개
↓
도구 검색 / 카테고리
↓
추천 또는 많이 활용되는 자동화 도구
↓
최근 자동화 수요
```

Hero는 랜딩페이지처럼 지나치게 크게 만들지 않는다.

추천 문구:

**대학의 AI 자동화를 한곳에서**

`업무에 필요한 자동화 도구를 찾고, 활용 현황과 위험 정보를 확인하세요.`

CTA:
- 자동화 도구 찾기
- 자동화 수요 등록

---

# 11. Visual Signature

HP 원본 디자인의 chevron처럼 브랜드를 흉내 내는 별도 장식은 사용하지 않는다.

Campus Automation Hub의 시각적 특징은 다음으로 만든다.

## CNU Signal Line

- CNU Blue 기반의 얇은 vertical / horizontal signal line
- section title 또는 active navigation에 제한적으로 사용
- 필요 시 매우 작은 magenta endpoint를 사용 가능

예:

```text
│  자동화 도구 현황
│
└── blue line ─────────── ● magenta
```

원칙:
- 화면당 1~2개 이하
- 배경 장식으로 반복하지 않음
- 로고를 변형한 것처럼 보이지 않게 함

---

# 12. Data & AI Visual Language

AI라고 해서 모든 곳에 gradient, glow, neon을 사용하지 않는다.

허용:
- 작은 AI badge
- subtle blue→magenta gradient를 AI 분석 상태에 한정
- Sparkles / Bot / ShieldCheck 아이콘
- 분석 진행 상태의 얇은 gradient line

금지:
- 전체 페이지 gradient
- neon purple background
- glassmorphism 남발
- 과한 blur
- 모든 카드에 AI 아이콘

AI는 **장식이 아니라 기능**으로 표현한다.

---

# 13. Responsive

Breakpoints:

```yaml
mobile: "< 640px"
tablet: "640px - 1023px"
desktop: ">= 1024px"
```

Desktop:
- sidebar 표시
- 3~4열 grid 가능

Tablet:
- sidebar 축소 가능
- 2열 grid

Mobile:
- sidebar → drawer
- card 1열
- filter → compact / drawer
- table은 card 또는 horizontal scroll

모든 주요 interactive target은 최소 40~44px 확보.

---

# 14. Accessibility

필수:

- 본문 텍스트 대비 WCAG AA 수준 확보
- focus-visible 제공
- semantic status에 텍스트 포함
- icon-only button에 aria-label
- color만으로 상태 구분 금지
- 12px 미만 텍스트 사용 금지
- destructive action은 red + label 사용

---

# 15. Do / Don't

## Do

- CNU Blue를 가장 중요한 action에 사용
- Magenta는 작은 accent로만 사용
- White / Light Gray 중심
- border 중심의 정돈된 카드
- 같은 목적의 컴포넌트는 동일 style 사용
- 위험·상태·성과 정보를 빠르게 읽을 수 있게 구성
- 기존 기능과 데이터 구조 유지
- Phase 단위로 적용하고 중간 검토

## Don't

- 전체 화면을 파란색으로 채우지 않기
- Magenta를 Primary CTA로 사용하지 않기
- 화려한 AI gradient 남발 금지
- card마다 서로 다른 radius 사용 금지
- 무거운 shadow 사용 금지
- 페이지마다 font size 체계 변경 금지
- 쇼핑몰·스타트업 랜딩페이지처럼 만들지 않기
- 디자인 수정 과정에서 기능 로직 리팩터링 금지
- 공식 CNU 로고를 재구성하거나 변형하지 않기

---

# 16. Maintenance Rules

새 UI를 만들 때:

1. 기존 component로 해결 가능한지 확인
2. 기존 token으로 해결 가능한지 확인
3. 새로운 style이 정말 필요한지 판단
4. 공통 사용 가능하면 component/token 추가
5. 이 문서에 기록
6. lint / typecheck / build 확인

임의의 hex / px 값 추가를 최소화한다.

우선 사용:
- `colors.*`
- `spacing.*`
- `radius.*`
- typography hierarchy

---

# 17. Claude Code Working Rules

Claude Code가 이 문서를 사용할 경우:

## UI 수정 전

1. 이 문서를 읽는다.
2. 현재 프로젝트의 전역 CSS/theme 구조를 확인한다.
3. 기존 기능이 정상 동작하는지 확인한다.
4. 현재 적용할 Phase를 명확히 한다.

## Phase 1 요청 시

**아래 외에는 가급적 수정하지 않는다.**

- global styles
- theme/tokens
- layout
- sidebar
- header
- shared button
- shared card
- shared badge
- shared input

페이지별 세부 component는 그대로 두고
가능하면 새 global token을 상속받게 한다.

## 수정 후

확인:
- navigation 정상
- 주요 페이지 진입 정상
- button click 정상
- search/filter 기능 훼손 없음
- responsive 큰 깨짐 없음

가능한 경우 실행:
- lint
- typecheck
- build

---

# 18. Recommended Review Gates

## Gate 1 — Foundation Review

확인:
- 전체 분위기가 충남대학교 서비스와 어울리는가?
- blue / white / neutral 비율이 적절한가?
- sidebar/header가 안정적인가?
- card/button/input이 일관적인가?

승인 후 Phase 2 진행.

---

## Gate 2 — Product Component Review

확인:
- Tool Card에서 중요한 정보가 바로 보이는가?
- 위험도와 상태가 혼동되지 않는가?
- 검색과 필터가 복잡하지 않은가?
- 상세 페이지의 정보 계층이 명확한가?

승인 후 Phase 3 진행.

---

## Gate 3 — Competition Demo Review

확인:
- Home만 보고 서비스 목적이 이해되는가?
- "단순 AI 도구 게시판"이 아닌 "AI 관제 플랫폼"으로 보이는가?
- 위험·성과·활용 정보가 시각적으로 드러나는가?
- 2~3분 시연 동선이 자연스러운가?

---

# 19. Phase 1 Definition of Done

다음만 충족하면 Phase 1을 종료한다.

- 전역 CNU-inspired color token 적용
- Pretendard 중심 typography 적용
- app background / paper 구조 통일
- Sidebar / Header 디자인 통일
- Button / Card / Badge / Input 기본 스타일 통일
- border / radius / shadow 기준 통일
- 기존 기능 정상 작동
- desktop 주요 화면에서 시각적 충돌 없음

**Phase 1에서 완벽한 화면을 만들려고 하지 않는다.**

목표:

> "모든 페이지가 같은 서비스처럼 보이게 만드는 것"

디테일은 Phase 2와 Phase 3에서 수정한다.

---

# 20. Reference Notes

이 문서는 기존 `DESIGN-hp.md`에서 다음 원칙을 참고해 재구성했다.

- 한 가지 주 색상을 signal color로 제한적으로 사용
- white / light gray 기반 surface
- 단순한 typography hierarchy
- 8px 중심 spacing
- card와 interactive element의 radius 체계 분리
- shadow보다 surface / border contrast 중심
- component token화
- 한 번에 전체를 수정하지 않고 component 단위로 iteration

다만 HP 고유의 다음 요소는 사용하지 않는다.

- HP Electric Blue
- Forma DJR Micro
- HP chevron/slash motif
- HP 제품·쇼핑몰형 card 구조
- HP dark commercial band 구성

본 시스템은 대학용 AI 업무 플랫폼에 맞게
**CNU Blue + 신뢰성 + 행정정보 가독성 + 단계적 적용** 중심으로 재설계했다.
