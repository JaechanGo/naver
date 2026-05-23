# UI 핸드오프 스펙 — 네이버 맛집 블로그 자동 작성 웹

- **작성일**: 2026-05-23
- **대상 디자인 문서**: [2026-05-23-naver-blog-writer-design.md](./2026-05-23-naver-blog-writer-design.md)
- **기술 스택**: Next.js 15 + React 19 + Tailwind CSS, 모바일 퍼스트
- **목적**: 4단계 마법사 UI 의 모든 화면·상태·인터랙션을 추측 없이 구현 가능한 수준으로 명세

> 이 문서의 클래스명은 **Tailwind CSS 표준 토큰** 을 그대로 사용한다. 커스텀 클래스를 새로 만들지 않는다.

---

## 1. 디자인 시스템

### 1.1 컬러 토큰

| 역할 | Tailwind 클래스 | HEX | 용도 |
|---|---|---|---|
| Primary | `amber-500` | `#F59E0B` | CTA 버튼, 진행률 바 활성, 선택 상태 |
| Primary Hover | `amber-600` | `#D97706` | CTA 버튼 hover |
| Primary Pressed | `amber-700` | `#B45309` | CTA 버튼 active (눌린 상태) |
| Primary Subtle | `amber-50` | `#FFFBEB` | Primary 영역의 약한 배경 (선택된 사진 테두리 배경 등) |
| Background | `stone-50` | `#FAFAF9` | 페이지 배경 |
| Surface | `white` | `#FFFFFF` | 카드·입력란 배경 |
| Border Default | `stone-200` | `#E7E5E4` | 입력란·카드 테두리 |
| Border Strong | `stone-300` | `#D6D3D1` | 강조 테두리 (hover) |
| Text Primary | `stone-900` | `#1C1917` | 본문·제목 |
| Text Secondary | `stone-600` | `#57534E` | 보조 텍스트·placeholder |
| Text Disabled | `stone-400` | `#A8A29E` | 비활성 텍스트 |
| Success | `green-600` | `#16A34A` | 성공 알림 |
| Warning | `amber-600` | `#D97706` | 주의 (주제 메모 비어 있음 등) |
| Error | `red-600` | `#DC2626` | 에러 알림·필수 검증 실패 |
| Error Subtle | `red-50` | `#FEF2F2` | 에러 토스트 배경 |
| Overlay | `black/40` | `rgba(0,0,0,0.4)` | 모달·시트 뒷배경 |

### 1.2 타이포그래피

폰트: **Pretendard** (한국어 가독성 우수, 가변 폰트로 단일 파일 로딩). `next/font/local` 로 self-host. 폴백: `system-ui, sans-serif`.

| 역할 | Tailwind 클래스 | 사이즈 / 행간 | 용도 |
|---|---|---|---|
| Display | `text-3xl font-bold leading-tight` | 30px / 36px | 화면 제목 (로그인, 단계 4 결과 제목) |
| Title | `text-xl font-semibold leading-snug` | 20px / 28px | 섹션 제목, 단계 제목 |
| Body | `text-base leading-relaxed` | 16px / 28px | 본문, 입력 값 |
| Body Strong | `text-base font-medium` | 16px / 24px | 라벨, 강조 |
| Small | `text-sm leading-normal` | 14px / 20px | 보조 안내, helper text |
| Caption | `text-xs leading-normal` | 12px / 16px | 메타 정보 (작성일 등) |
| Button | `text-base font-semibold` | 16px / 24px | 버튼 텍스트 |

> 모바일 본문은 **반드시 16px 이상** 으로 둔다 (그 미만이면 iOS Safari 가 입력 시 강제 줌). 16px 미만은 caption 외 용도로 쓰지 않는다.

### 1.3 간격 (Spacing)

| 역할 | Tailwind 클래스 | px |
|---|---|---|
| 가장 좁은 간격 | `gap-1` / `p-1` | 4px |
| 작은 간격 | `gap-2` / `p-2` | 8px |
| 기본 간격 | `gap-3` / `p-3` | 12px |
| 카드 내부 패딩 | `gap-4` / `p-4` | 16px |
| 섹션 간 간격 | `gap-6` / `py-6` | 24px |
| 화면 좌우 패딩 (모바일) | `px-4` | 16px |
| 화면 좌우 패딩 (PC) | `px-8` | 32px |
| 페이지 상하 여백 | `py-8` | 32px |

### 1.4 라운드 (Border Radius)

| 역할 | Tailwind 클래스 | px |
|---|---|---|
| 입력란·작은 버튼 | `rounded-lg` | 8px |
| 카드·큰 버튼 | `rounded-xl` | 12px |
| 모달·시트 | `rounded-2xl` | 16px |
| 둥근 원형 (아바타·아이콘 버튼) | `rounded-full` | 9999px |

### 1.5 그림자

| 역할 | Tailwind 클래스 |
|---|---|
| 기본 카드 | `shadow-sm` |
| 떠 있는 요소 (FAB, 플로팅 메뉴) | `shadow-lg` |
| 모달 | `shadow-2xl` |

### 1.6 반응형 브레이크포인트

Tailwind 기본 사용:
- 기본 (no prefix): < 640px (모바일)
- `sm:` ≥ 640px (대형 모바일·소형 태블릿)
- `md:` ≥ 768px (태블릿)
- `lg:` ≥ 1024px (PC)

> **모바일 퍼스트 원칙**: 기본 스타일이 모바일, `md:`·`lg:` 로 PC 확장. 그 반대로 작성하지 않는다.

### 1.7 컨테이너 최대 너비

| 영역 | 클래스 |
|---|---|
| 마법사 본문 | `max-w-2xl mx-auto` (672px) |
| 결과 에디터 (단계 4) | `max-w-3xl mx-auto` (768px) |
| 로그인 카드 | `max-w-sm mx-auto` (384px) |

---

## 2. 공통 컴포넌트

### 2.1 PrimaryButton

CTA 버튼. 단계마다 하단 "다음" 버튼, 단계 4 의 "복사하기" 등.

| Prop | 타입 | 기본값 | 설명 |
|---|---|---|---|
| `children` | ReactNode | — | 버튼 텍스트 |
| `onClick` | () => void | — | |
| `disabled` | boolean | false | |
| `loading` | boolean | false | 스피너 표시 + disabled |
| `size` | `"md" \| "lg"` | `"md"` | lg 는 모바일 하단 고정 버튼용 |
| `fullWidth` | boolean | false | |

**스타일** (`size="md"`):
- 기본: `h-12 px-6 rounded-xl bg-amber-500 text-white font-semibold text-base shadow-sm`
- Hover: `hover:bg-amber-600`
- Active: `active:bg-amber-700 active:scale-[0.98]`
- Disabled: `disabled:bg-stone-200 disabled:text-stone-400 disabled:cursor-not-allowed`
- Focus: `focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2`
- Transition: `transition-colors duration-150`

**`size="lg"`**: `h-14 text-lg` (모바일 하단 고정용).

**Loading 상태**: 텍스트 자리에 `<Spinner size="sm" color="white" />` + 클릭 무시.

### 2.2 SecondaryButton

보조 액션. "취소", "뒤로".

- 기본: `h-12 px-6 rounded-xl bg-white border border-stone-200 text-stone-900 font-medium`
- Hover: `hover:bg-stone-50 hover:border-stone-300`
- Active: `active:bg-stone-100`
- Disabled / Focus: PrimaryButton 과 동일 패턴

### 2.3 IconButton

원형 아이콘 버튼 (사진 삭제, 뒤로가기 등).

- `h-10 w-10 rounded-full flex items-center justify-center text-stone-600 hover:bg-stone-100 active:bg-stone-200`
- 터치 영역 최소 44×44px 보장 위해 `before:absolute before:inset-[-4px]` 패턴 사용
- 아이콘 라이브러리: **Lucide React** (`lucide-react`)

### 2.4 ProgressBar (단계 진행률)

- 위치: 모든 마법사 화면 상단
- 4 개의 점 (`●─●─○─○`)
- 활성 점: `h-2.5 w-2.5 rounded-full bg-amber-500`
- 비활성 점: `h-2.5 w-2.5 rounded-full bg-stone-300`
- 연결선: `h-0.5 w-8 bg-stone-300` (이미 지난 구간은 `bg-amber-500`)
- 모바일에서는 `w-6` 으로 축소

### 2.5 Toast (알림)

화면 상단 중앙에서 등장. 자동 4초 후 사라짐 (에러는 6초).

| 종류 | 색상 |
|---|---|
| Success | `bg-green-50 border-green-200 text-green-900` |
| Error | `bg-red-50 border-red-200 text-red-900` |
| Warning | `bg-amber-50 border-amber-200 text-amber-900` |

스타일: `px-4 py-3 rounded-xl shadow-lg border max-w-md`

애니메이션: `fade-in + slide-down 200ms`.

### 2.6 Card

모든 입력 영역의 컨테이너.

- `bg-white border border-stone-200 rounded-xl p-4 md:p-6 shadow-sm`

### 2.7 Input / Textarea

- Base: `w-full h-12 px-4 rounded-lg border border-stone-200 bg-white text-base text-stone-900 placeholder-stone-400`
- Focus: `focus:border-amber-500 focus:ring-2 focus:ring-amber-100 focus:outline-none`
- Error: `border-red-500 focus:ring-red-100`
- Textarea: `min-h-[120px] py-3 leading-relaxed resize-none`
- 라벨: 입력란 위에 `block text-sm font-medium text-stone-700 mb-1.5`
- Helper text: 입력란 아래 `text-xs text-stone-500 mt-1`
- Error text: `text-xs text-red-600 mt-1`

---

## 3. 화면별 핸드오프

### 3.1 로그인 화면 (`/login`)

**용도**: 사이트 비밀번호 입력. 본인만 통과.

**레이아웃**:
- 전체 화면 중앙 정렬 (`min-h-screen flex items-center justify-center bg-stone-50`)
- 컨테이너: `max-w-sm w-full mx-auto px-4`

**구성**:
```
[로고/이모지 🍽️]   (h-12, text-4xl)
[Display "맛집 블로그 작성기"]
[Caption "비밀번호를 입력해주세요"  text-stone-600]

[Input password]
[PrimaryButton "들어가기" fullWidth size="lg"]

[Error message — 실패 시만 표시, text-red-600 text-sm]
```

**상태**:
| State | 동작 |
|---|---|
| 입력 중 | `disabled` 해제 |
| 제출 중 | PrimaryButton loading 상태, 입력란 비활성 |
| 실패 | 빨간 에러 메시지 "비밀번호가 일치하지 않습니다." 입력란 흔들기 애니메이션 (`animate-shake` 커스텀, 400ms) |
| 성공 | 즉시 `/` 로 리다이렉트 |

**접근성**:
- `<form>` 사용, Enter 키로 제출
- 입력란에 `autocomplete="current-password"` `inputmode="text"`
- 에러 메시지에 `role="alert"` `aria-live="polite"`

---

### 3.2 단계 1 — 사진 업로드 (`/` 의 step=1)

**용도**: 블로그에 쓸 사진 1~10장 업로드.

**레이아웃 (모바일)**:
```
┌──────────────────────────┐
│ ProgressBar ●─●─○─○      │  (sticky top-0 bg-stone-50/80 backdrop-blur)
│ [← 뒤로]   [↺ 새로 작성]  │  (h-12 시트 헤더, justify-between)
├──────────────────────────┤
│                          │
│  [Title "사진을 올려주세요"]   │
│  [Small "맛집의 사진을 모두 한 │
│   번에 올리세요. 1~10장 권장"] │
│                          │
│  ┌──────────────────────┐│
│  │  📷  이미지 추가       ││  (드래그앤드롭 영역)
│  │     탭하여 선택       ││
│  │     또는 사진 촬영     ││
│  └──────────────────────┘│
│                          │
│  [사진 그리드]            │
│  ┌────┬────┐             │  (모바일: 2열, gap-3)
│  │📷 ✕│📷 ✕│             │
│  ├────┼────┤             │
│  │📷 ✕│📷 ✕│             │
│  └────┴────┘             │
│                          │
└──────────────────────────┘
[Fixed bottom safe-area]
[PrimaryButton "다음" fullWidth size="lg" disabled={photos.length===0}]
```

**드래그앤드롭 영역 (UploadDropzone)**:
- 크기: 모바일 `h-32`, PC `h-40`
- 스타일: `border-2 border-dashed border-stone-300 rounded-xl bg-white flex flex-col items-center justify-center gap-2`
- Hover (PC): `hover:border-amber-500 hover:bg-amber-50`
- Drag over: `border-amber-500 bg-amber-50`
- 두 개의 input:
  - `<input type="file" accept="image/*" multiple>` (갤러리 선택)
  - `<input type="file" accept="image/*" capture="environment" multiple>` (모바일 카메라) — 별도 버튼
- 안에 아이콘 (`<ImagePlus />` 24px, amber-500) + 텍스트 + 작은 보조 텍스트

**사진 카드 (PhotoTile)**:
- 정사각형 (`aspect-square`)
- `relative rounded-lg overflow-hidden bg-stone-100`
- 이미지: `w-full h-full object-cover`
- 좌상단: 순서 번호 배지 (`absolute top-1 left-1 h-6 w-6 rounded-full bg-black/60 text-white text-xs font-medium flex items-center justify-center`)
- 우상단: 삭제 버튼 (`absolute top-1 right-1 h-7 w-7 rounded-full bg-black/60 text-white`, X 아이콘)
- 좌하단: 메모 표시 (메모 있으면 `💬` 아이콘, 탭하면 모달 열림)
- 드래그 핸들: 데스크톱은 카드 hover 시 표시. 모바일은 long-press (500ms) 로 들기.

**상태**:
| State | 동작 |
|---|---|
| 사진 0장 | "다음" 비활성, 회색 |
| 사진 1~10장 | "다음" 활성 |
| 사진 11장 이상 시도 | 토스트 경고 "최대 10장까지 권장합니다" (그래도 추가는 허용) |
| 리사이즈 진행 중 (개별 사진) | 사진 카드에 반투명 오버레이 + 스피너 |
| 리사이즈 실패 | 카드를 빨간 테두리로 표시, 토스트 "사진 X를 처리하지 못했습니다" |
| 총 base64 5MB 초과 | 모달 "사진 용량이 너무 큽니다. 일부를 삭제해주세요." |

**인터랙션**:
- 드래그앤드롭 (PC): 파일 드롭 → 즉시 리사이즈 시작
- 모바일 long-press: 카드 들리는 효과 (`scale-105 shadow-lg`) → 드래그로 순서 변경
- 사진 탭: 풀스크린 미리보기 모달 + 메모 편집

**애니메이션**:
| 요소 | 트리거 | 효과 | 시간 |
|---|---|---|---|
| 새 사진 추가 | 리사이즈 완료 | fade-in + scale (0.95→1) | 200ms ease-out |
| 사진 삭제 | 삭제 클릭 | fade-out + scale (1→0.95) | 150ms ease-in |
| 드래그 시작 | long-press | scale 1→1.05, shadow 변화 | 200ms |
| 순서 변경 | 드롭 | 다른 카드들 자리 이동 | 300ms ease-in-out |

**접근성**:
- 파일 input 에 `aria-label="사진 추가"`
- 사진 카드에 `role="listitem"`, 그리드는 `role="list"`
- 삭제 버튼 `aria-label="사진 N 삭제"`
- 키보드 드래그 지원 (focus 된 카드에서 화살표키로 순서 변경) — 향후

---

### 3.3 단계 2 — 가게 정보 + 주제 메모

**레이아웃 (모바일)**:
```
┌──────────────────────────┐
│ ProgressBar ●─●─○─○      │
│ [← 뒤로]   [↺ 새로 작성]   │
├──────────────────────────┤
│ [Title "가게 정보를 알려주세요"]
│ [Small "비워두면 AI 가 추측합니다"]
│                          │
│ [Card]                   │
│  Label "가게 이름"        │
│  [Input placeholder="예: 한우오마카세 ○○"]│
│                          │
│  Label "주소"             │
│  [Input placeholder="예: 서울 강남구 ..."]│
│                          │
│  Label "방문 날짜"         │
│  [Date picker, default: today]│
│                          │
│  Label "주문한 메뉴"        │
│  [Textarea 3 rows placeholder="갈비탕 1, 비빔밥 1"]│
│ [/Card]                  │
│                          │
│ [Card]                   │
│  Label "주제 메모 ✨"       │
│  [Textarea 5 rows placeholder="분위기 좋았음. 갈비탕 진했고..."]│
│  [Helper "비울수록 글 품질이 떨어집니다"]│
│ [/Card]                  │
│                          │
└──────────────────────────┘
[Fixed bottom]
[PrimaryButton "글 만들기" fullWidth size="lg"]
```

**상태**:
| State | 동작 |
|---|---|
| 모든 필드 비어 있음 | "글 만들기" 활성 (전부 선택 입력이므로) |
| 주제 메모 비어 있음 | "글 만들기" 누르면 노란 경고 모달 "비워두면 품질이 떨어집니다. 그래도 진행할까요? [취소][진행]" |
| 클릭 후 | "글 만들기" loading + 단계 3 으로 전환 |

**인터랙션**:
- 각 입력란에 focus → 부드러운 amber 링 (200ms ease-out)
- 키보드 올라왔을 때 (모바일) 현재 입력란이 보이도록 자동 스크롤 (`scroll-margin-bottom: 200px` CSS)

**접근성**:
- 모든 label 은 `<label for>` 로 input 과 연결
- Date picker 는 `<input type="date">` (네이티브, 모바일/PC 모두 좋은 UX)
- 주제 메모는 `aria-describedby` 로 helper text 연결

---

### 3.4 단계 3 — AI 생성 (로딩)

**레이아웃** (모바일/PC 동일, 화면 중앙):
```
┌──────────────────────────┐
│ ProgressBar ●─●─●─○      │
├──────────────────────────┤
│                          │
│      [큰 애니메이션 아이콘]  │
│       (✨ 흔들리는 별)    │
│                          │
│   [Title "AI 가 글을 쓰고 있어요"]│
│                          │
│   [Step indicator]       │
│   ✅ 사진 분석 완료         │
│   ⏳ 글 초안 작성 중...    │
│   ○  마무리                │
│                          │
│   [Caption "약 20~40초 걸립니다"]│
│                          │
│   [SecondaryButton "취소"]│
│                          │
└──────────────────────────┘
```

**동작**:
- 진입 즉시 `/api/analyze-photos` 호출. 응답 받으면 첫 번째 체크 표시.
- 이어서 `/api/generate-post` 스트리밍 호출. 첫 토큰 수신되면 두 번째 체크 + 자동으로 단계 4 로 전환 (단계 4 의 본문이 실시간으로 타이핑됨).
- "취소" 클릭 → AbortController 로 요청 중단 → 단계 2 로 복귀.

**아이콘 애니메이션**:
- ✨ 또는 🍳 이모지 (`text-6xl`)
- CSS `@keyframes` 로 부드럽게 흔들림 (rotate -10deg → 10deg → -10deg, 2s infinite ease-in-out)
- prefers-reduced-motion 존중

**Step indicator 스타일**:
- 줄당 `flex items-center gap-2 text-sm`
- 완료: `text-stone-900` + ✅
- 진행 중: `text-amber-600 font-medium` + `<Spinner size="xs" />`
- 대기: `text-stone-400` + ○

**에러 처리**:
- API 실패 시 화면 변경:
```
   [큰 ⚠️ 아이콘]
   [Title "글을 만들지 못했어요"]
   [Body "이유: {error message}"]
   [PrimaryButton "다시 시도"]
   [SecondaryButton "정보 수정"]
```

---

### 3.5 단계 4 — 결과 에디터

**레이아웃 (PC)**:
```
┌──────────────────────────────────────────────┐
│ ProgressBar ●─●─●─●                          │
│ [← 뒤로]                  [복사하기 📋][완료]  │  (상단 고정)
├──────────────────────────────────────────────┤
│ ┌──────────────────────────────┬───────────┐ │
│ │                              │  [사진 패널]│ │
│ │ [Title Input "글 제목"]         │  ┌──────┐ │ │
│ │                              │  │ 📷 1  │ │ │
│ │ [Body Editor]                │  │ [⬇] [➕]│ │ │
│ │  마크다운 + 인라인 사진 썸네일  │  ├──────┤ │ │
│ │  사진은 카드로 표시             │  │ 📷 2  │ │ │
│ │                              │  └──────┘ │ │
│ │  ...                         │  ...      │ │
│ └──────────────────────────────┴───────────┘ │
└──────────────────────────────────────────────┘
```

**레이아웃 (모바일)**:
```
┌──────────────────────────┐
│ ProgressBar              │
│ [← 뒤로][복사 📋][⋯ 메뉴]│  (상단 고정, h-14)
├──────────────────────────┤
│                          │
│ [Title Input]            │
│                          │
│ [Body Editor]            │
│  ...                     │
│                          │
│ [사진 트레이 - 하단]       │
│ [📷 1][📷 2][📷 3]...      │  (가로 스크롤)
│                          │
└──────────────────────────┘
```

**Body Editor 컴포넌트**:
- 기본은 `<textarea>` 형식 마크다운 + 마크다운 토큰을 인라인 사진 썸네일로 렌더하는 하이브리드.
- 추천 라이브러리: **TipTap** (ProseMirror 기반) + 커스텀 image node.
  - 또는 단순화하려면 textarea 와 미리보기 분리 (Edit / Preview 토글).
- 토큰 `![](photo_id)` 가 보이면 ID 매칭해 base64 썸네일 카드로 렌더.

**사진 패널 (PC 우측 사이드바)**:
- 너비: `w-72` (288px)
- 각 사진: 카드 (`p-3 bg-white rounded-xl border`)
- 이미지 (`aspect-video object-cover rounded-lg`)
- 액션: "본문에 삽입" (이 위치에 `![](photo_id)` 삽입) + "다운로드"

**사진 트레이 (모바일 하단)**:
- 화면 하단 고정 (`fixed bottom-0`), 높이 `h-24`
- 가로 스크롤 (`overflow-x-auto flex gap-2 px-4`)
- 각 사진: `h-20 w-20 rounded-lg` + 탭 시 본문 삽입

**상단 액션 바**:
- 모바일: 좌측 뒤로 + 중앙 (없음) + 우측 [복사하기] [⋯]
  - ⋯ 메뉴: 펼치면 "전체 다시 생성", "사진 ZIP 다운로드", "완료"
- PC: 좌측 뒤로 + 우측 [복사하기 📋] [완료]

**복사하기 버튼 상태**:
| State | 모양 |
|---|---|
| 기본 | `bg-amber-500 text-white` "복사하기 📋" |
| 클릭 직후 (성공) | `bg-green-600 text-white` "복사됨! ✓" — 1.5초 후 기본으로 복귀 |
| 클릭 직후 (실패) | `bg-red-600 text-white` "복사 실패" — 토스트로 fallback 안내 |
| 작업 중 (오래 걸리면) | loading 스피너 |

**부분 수정 플로팅 메뉴 (FloatingRefineMenu)**:

본문에서 텍스트 선택 시 등장.

- 위치: 선택 영역의 위쪽 또는 아래쪽 (화면 끝에 가까우면 반대편)
- 크기: 최대 `w-80`
- 스타일: `bg-white rounded-2xl shadow-lg border border-stone-200 p-2`
- 모바일: 하단에서 슬라이드업 (full width, `rounded-t-2xl`, 액션 시트 스타일)

**메뉴 구성**:
```
[더 친근하게] [더 짧게] [더 자세히] [맛 묘사 강화]   (큰 칩 형태)
─────────────
[Input "직접 지시하기..."]
[제출 버튼]
```

칩: `px-3 py-2 rounded-full bg-stone-100 text-sm font-medium hover:bg-amber-100 active:bg-amber-200`.

**부분 수정 진행 상태**:
- 선택 영역에 `bg-amber-100` 하이라이트
- 우상단 작은 스피너
- Claude 응답이 스트리밍되며 선택 영역 텍스트가 실시간 교체
- 완료 후: 하단 미니 알림 "수정 완료 [되돌리기]" (4초 후 자동 사라짐)

**Undo**:
- Ctrl/Cmd+Z 키 지원
- 화면 안에 "되돌리기" 버튼 (수정 직후 4초간)

**복사 동작 상세**:
1. 본문 마크다운 → HTML 변환 (marked)
2. `<img src="data:...">` 토큰 매핑
3. `navigator.clipboard.write([new ClipboardItem({"text/html": htmlBlob, "text/plain": plainBlob})])`
4. 성공 시: 버튼 색 변화 + 토스트 "네이버 블로그 PC 웹 에디터에서 Ctrl+V"
5. 실패 시 fallback:
   - 본문은 화면 중앙 모달에 표시 → 사용자가 수동 선택+복사
   - 사진 자동 ZIP 다운로드

---

## 4. 반응형 동작 요약

| 화면 | 브레이크포인트 | 변화 |
|---|---|---|
| 로그인 | 모든 사이즈 | 항상 중앙 작은 카드 |
| 단계 1 사진 그리드 | < `sm` | 2열 |
|  | `sm`~`md` | 3열 |
|  | ≥ `md` | 4열 |
| 단계 2 카드 | < `md` | 단일 컬럼 |
|  | ≥ `md` | 단일 컬럼 + 좌우 여백 확대 |
| 단계 4 사진 패널 | < `md` | 하단 가로 스크롤 트레이 |
|  | ≥ `md` | 우측 사이드바 (3:1 비율) |
| 하단 고정 버튼 | < `md` | 화면 하단 sticky |
|  | ≥ `md` | 카드 내부에 자연스럽게 위치 |

iOS safe area 대응: 하단 고정 버튼은 `pb-[env(safe-area-inset-bottom)]` 추가.

---

## 5. 애니메이션 / 모션

| 요소 | 트리거 | 효과 | 시간 | Easing |
|---|---|---|---|---|
| 페이지 단계 전환 | 다음/뒤로 클릭 | fade + slide (다음: 우→좌 16px) | 250ms | `ease-out` |
| 토스트 등장 | 알림 발생 | fade + slide-down 8px | 200ms | `ease-out` |
| 토스트 사라짐 | 시간 경과 | fade-out | 150ms | `ease-in` |
| 사진 추가 | 리사이즈 완료 | fade + scale 0.95→1 | 200ms | `ease-out` |
| 부분 수정 메뉴 | 텍스트 선택 | fade + scale 0.96→1 | 150ms | `ease-out` |
| 진행률 점 채워짐 | 단계 전환 | bg-color crossfade | 300ms | `ease-in-out` |
| 버튼 active | 클릭 | scale 0.98 | 100ms | `ease-out` |
| 모바일 시트 | 부분 수정 메뉴 | translateY 100%→0 | 250ms | `ease-out` |
| 로딩 아이콘 (단계 3) | 항상 | rotate -10/10 무한 반복 | 2000ms | `ease-in-out` |

> 모든 애니메이션은 `@media (prefers-reduced-motion: reduce)` 에서 비활성 (즉시 상태 전환).

---

## 6. 접근성

### 6.1 색 대비

- 본문 텍스트(`stone-900` on `white`): 16.1:1 (WCAG AAA)
- 보조 텍스트(`stone-600` on `white`): 7.2:1 (AAA)
- Primary 버튼(`white` on `amber-500`): 2.8:1 — **주의**: 14pt 미만에서 부족. 버튼 텍스트는 `font-semibold` 16px 이상이므로 large text 기준(3:1) 통과.
- 에러(`red-600` on `white`): 5.9:1 (AA)

### 6.2 포커스 순서

각 화면별:
- 단계 1: 업로드 영역 → 카메라 버튼 → 사진 카드들 (순서대로) → 다음 버튼
- 단계 2: 가게 이름 → 주소 → 날짜 → 메뉴 → 주제 메모 → 글 만들기
- 단계 4: 제목 → 본문 에디터 → 사진 패널/트레이 → 복사하기 → 완료

### 6.3 ARIA

- 진행률 바: `role="progressbar" aria-valuenow={step} aria-valuemax="4"`
- 사진 그리드: `role="list"`, 각 카드 `role="listitem"`
- 부분 수정 메뉴: `role="dialog" aria-label="텍스트 수정 옵션"`
- 토스트: `role="status" aria-live="polite"` (에러는 `aria-live="assertive"`)

### 6.4 키보드

- 모든 인터랙티브 요소 tab 으로 접근 가능
- `Enter`: 폼 제출
- `Esc`: 모달·플로팅 메뉴 닫기
- `Ctrl/Cmd + Z`: 부분 수정 Undo
- 단계 4 본문 에디터에서 `Ctrl/Cmd + B` 등 마크다운 단축키 (TipTap 기본 제공)

### 6.5 스크린 리더 알림

- 단계 전환: "2단계 가게 정보 화면입니다" (`aria-live` 영역에 출력)
- 사진 추가 완료: "사진 N장이 추가되었습니다"
- 복사 완료: "본문이 클립보드에 복사되었습니다"
- 부분 수정 완료: "선택 영역이 수정되었습니다"

---

## 7. 엣지 케이스

### 7.1 콘텐츠 길이

| 케이스 | 처리 |
|---|---|
| 가게 이름 50자 초과 | 입력은 허용, 단계 1 카드 표시는 1줄 ellipsis |
| 주제 메모 1000자 초과 | 카운터 표시 + 경고 (Claude 토큰 부담), 진행은 허용 |
| 본문 결과 매우 길면 (5000자+) | 에디터 자동 높이 확장, 화면은 스크롤 |
| 본문에 사진 토큰이 12개 (사진 10장보다 많이) | 매칭 안 되는 토큰은 본문에서 제거하고 콘솔 경고 |

### 7.2 빈 상태

| 위치 | 표시 |
|---|---|
| 단계 1 사진 없음 | 업로드 영역만, 그리드는 hidden |
| 단계 4 사진 패널 (사진 0장 — 불가능 케이스) | "사진 없음" 회색 메시지 |

### 7.3 로딩 상태

| 위치 | 표시 |
|---|---|
| 사진 리사이즈 중 | 카드 위 반투명 + 스피너 |
| API 호출 중 | 버튼 loading + 화면 비활성화 (단계 3 은 별도 화면) |
| 페이지 첫 로드 | localStorage 읽기 — `<Skeleton />` 컴포넌트 (회색 박스 shimmer) |

### 7.4 에러 상태

| 위치 | 표시 |
|---|---|
| 사진 업로드 실패 | 카드 빨간 테두리 + 토스트 |
| AI 생성 실패 | 단계 3 에서 에러 화면 (위 참조) |
| 클립보드 실패 | 모달 fallback (수동 복사) |
| 네트워크 끊김 | 화면 상단 빨간 배너 "오프라인 — 인터넷 연결 확인" |
| localStorage 가득참 | 모달 "공간이 부족합니다. 사진 일부를 삭제하세요." |

### 7.5 느린 연결

- API 호출 5초 넘으면 단계 3 에 "조금 더 걸리고 있어요..." 추가 메시지
- 30초 넘으면 "괜찮으신가요? [취소]" 버튼 등장
- 60초 넘으면 자동 abort + 에러 화면

---

## 8. 디자인 결정의 배경 (Why)

| 결정 | 이유 |
|---|---|
| 앰버 (amber) primary | 따뜻하고 식욕 자극, 네이버 초록과 색상 충돌 없음 |
| 모바일 하단 고정 큰 버튼 | 한 손 조작·엄지 닿기 쉬운 위치 |
| 단계 4 에서 부분 수정이 메인 | 전체 다시 생성은 토큰 낭비 + 사용자가 마음에 든 부분까지 날아감 |
| TipTap 사용 | 사진 인라인 렌더 + 텍스트 선택 위 플로팅 메뉴 구현 표준 라이브러리 |
| Pretendard 폰트 | 한국어 가독성 1순위, 가변 폰트로 로딩 비용 작음 |
| 진행률을 점 4개로 단순화 | 글로 단계 이름 쓰면 모바일 가로폭 부족 |
| 단계 3 에서 스트리밍 시작 시 자동 4 전환 | 30초 스피너만 보는 답답함 제거 — 본문 타이핑이 보이는 게 체감 속도↑↑ |

---

## 9. 구현 시 추가 메모

- **이미지 처리**: 클라이언트 캔버스로 1024px 리사이즈 + JPEG 품질 0.85. 라이브러리 없이 `<canvas>` 로 충분.
- **TipTap 또는 textarea**: MVP 는 textarea + Edit/Preview 토글로 시작해도 OK. TipTap 은 부분 수정 기능이 안정화된 후 도입.
- **드래그 정렬**: `@dnd-kit/sortable` 권장. 모바일 long-press touch 지원 우수.
- **클립보드**: `navigator.clipboard.write` 는 HTTPS 또는 localhost 에서만. Vercel 은 HTTPS 기본.
- **이모지**: 시스템 이모지 사용. 폰트 임포트 불필요.
