# 네이버 맛집 블로그 자동 작성 웹 — 설계 문서

- **작성일**: 2026-05-23
- **상태**: 디자인 확정 (구현 계획 미작성)
- **목적**: 사진과 가게 정보를 입력하면 AI 가 네이버 맛집 블로그 글 초안을 자동 작성해주는 개인용 웹 서비스

---

## 1. 개요

본 서비스는 1인용 도구로, 사용자가 직접 다녀온 맛집의 사진과 간단한 메모를 입력하면 Claude 4.6 Sonnet 이 손님 관점의 맛집 리뷰 블로그 글을 작성한다. 결과물은 본문 + 사진이 함께 클립보드에 복사되어, 네이버 블로그 PC 웹 에디터에 한 번에 붙여넣을 수 있다.

DB·인증·객체 스토리지 없이 **Next.js + Vercel + Claude API + 브라우저 localStorage** 만으로 구현한다. 가벼운 비밀번호 보호만 둔다.

향후 2차 작업으로 크롬 확장 프로그램을 추가해 네이버 블로그에 자동 입력하는 기능을 얹을 수 있도록 데이터 구조를 미리 설계한다.

---

## 2. 확정된 요구사항 요약

| 항목 | 결정 |
|---|---|
| 타깃 사용자 | 본인 1인 (개인용) |
| 콘텐츠 종류 | 손님 관점 맛집 탐방 리뷰 |
| 최종 결과물 | 본문 + 사진을 한 번에 복사해 네이버 블로그에 붙여넣기 |
| 자동 발행 | 1차 X (복사 방식), 2차에서 크롬 확장 검토 |
| 사진 처리 | Claude Vision 으로 자동 분석 + 주제 메모 힌트 결합 |
| 사용자 흐름 | 4단계 마법사 (사진 → 정보 → 생성 → 결과 에디터) |
| 수정 방식 | 본문 선택 후 부분 수정 (메인) + 전체 다시 생성 (보조) |
| 디바이스 | 모바일 + PC 반응형 (모바일 퍼스트) |
| 배포 | Vercel (git push 배포) |
| 데이터 저장 | 서버 저장 없음 / 브라우저 localStorage 만 |
| 보호 | 가벼운 사이트 비밀번호 |
| AI 모델 | Claude 4.6 Sonnet (Vision + Text) |

---

## 3. 아키텍처

### 3.1 시스템 다이어그램

```
┌──────────────────────────────────────┐
│  브라우저 (모바일/PC)                 │
│  Next.js App (React) — Vercel 배포    │
│  • 4단계 마법사 UI                    │
│  • Tailwind 모바일 반응형             │
│  • localStorage 작업 중인 글 자동저장 │
│  • 사진 리사이즈 후 base64 변환       │
└────────────────┬─────────────────────┘
                 │ HTTPS (사진 base64 + 정보)
                 ▼
┌──────────────────────────────────────┐
│  Next.js API Route (Vercel Function)  │
│  • Claude API 키 보관 (서버 측)       │
│  • Anthropic SDK 호출                 │
│  • 비밀번호 인증 미들웨어             │
└────────────────┬─────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────┐
│  Claude 4.6 Sonnet API                │
│  • Vision: 사진 → 묘사 추출           │
│  • Text 생성: 본문 작성               │
│  • Refine: 부분 수정                  │
└──────────────────────────────────────┘
```

### 3.2 스택

| 영역 | 선택 |
|---|---|
| 프론트엔드 | Next.js 15 (App Router) + React 19 |
| 스타일 | Tailwind CSS (모바일 퍼스트) |
| 마크다운 → HTML 변환 | `marked` 또는 `markdown-it` |
| AI SDK | `@anthropic-ai/sdk` (서버 측에서만 사용) |
| 배포 | Vercel (git push 자동 배포) |
| 데이터 | 서버 측 없음. 브라우저 localStorage 단일 키 `current_draft` |

### 3.3 보안

- Claude API 키는 Vercel 환경 변수 `ANTHROPIC_API_KEY` 에 저장. 클라이언트 노출 절대 금지.
- 사이트 접근은 `SITE_PASSWORD` 환경 변수와 비교하는 Next.js middleware 로 보호. 입력란 1개 + 제출 버튼 1개의 단순 로그인 페이지. 성공 시 HTTP-only 쿠키 발급.
- 사용자 인증은 없음 — 비밀번호를 아는 사람이 곧 사용자.

---

## 4. 데이터 모델

### 4.1 localStorage 단일 객체

키: `current_draft`

```ts
type Draft = {
  step: 1 | 2 | 3 | 4;
  photos: {
    id: string;                       // 클라이언트 측 uuid
    dataUrl: string;                  // 1024px 리사이즈된 base64
    userNote?: string;                // 사진별 선택 메모
    aiCaption?: string;               // Vision 결과 (3단계 이후 채워짐)
  }[];
  storeInfo: {
    name?: string;
    address?: string;
    visitDate?: string;               // YYYY-MM-DD
    menu?: string;                    // 자유 형식
  };
  topicHint: string;                  // 주제 메모
  result?: {
    title: string;
    bodyMarkdown: string;             // 사진 위치는 ![](photo_id) 토큰
    generatedAt: string;              // ISO 8601
  };
};
```

- 사진은 모두 base64 데이터 URL 로 들고 다닌다. 서버 측 저장이 없으므로 모든 상태가 클라이언트에 머문다.
- 본문 마크다운 내의 `![](photo_id)` 토큰은 `photos[].id` 와 매핑된다.
- 단계 전환·입력 변경 시마다 localStorage 갱신.
- "완료" 시 localStorage 초기화 후 단계 1 로 복귀.

### 4.2 용량 제한

- 사진 리사이즈 후 base64 1장 ≈ 100~300KB. 10장이면 ~3MB.
- localStorage 일반 한도 5MB. 단계 1 진입 시 총 base64 크기 5MB 초과 시 경고 및 사진 수 줄이도록 안내.

---

## 5. 화면 흐름 — 4단계 마법사

### 5.1 공통 UI

- 상단: 진행률 (`●─●─○─○`) + 뒤로가기 버튼
- 우상단: "처음부터 새로 작성" (localStorage 초기화)
- 하단: 큰 "다음" 버튼 (모바일 손가락 닿기 쉬운 크기, 화면 하단 고정)
- 자동 저장: 입력/단계 전환 시마다 localStorage 갱신

### 5.2 단계 1 — 사진 업로드

**구성**:
- 큰 업로드 영역: 드래그앤드롭 (PC) + 파일 선택 + 카메라 직접 촬영 (`<input type="file" accept="image/*" capture="environment">`)
- 그리드: 모바일 2열, PC 3~4열
- 각 사진: 드래그 핸들 (순서 변경), 삭제, 메모 아이콘 (탭 → "이 사진은 갈비탕")
- 업로드 즉시 클라이언트 캔버스로 1024px 리사이즈 → base64 → localStorage 저장

**검증**:
- 최소 1장 이상 시 "다음" 활성화
- 권장 최대 10장 (그 이상 시 경고)

### 5.3 단계 2 — 가게 정보 + 주제 메모

**구성** (한 화면):
- 가게 이름 (선택)
- 주소 (권장, 비우면 지역명 누락)
- 방문 날짜 (기본 오늘)
- 주문 메뉴 (자유 형식 멀티라인)
- 주제 메모 (가장 큰 멀티라인, placeholder 예시 포함)

**검증**:
- 모든 항목은 선택 입력. 단 주제 메모가 비어 있으면 노란 경고 — "비워두면 AI 가 사진만 보고 추측합니다 (품질↓)". 경고를 무시하고 "다음" 진행은 가능.

### 5.4 단계 3 — AI 생성 (로딩)

**구성**:
- 큰 스피너 + 단계별 상태 텍스트:
  1. "사진 분석 중..." (Vision 호출)
  2. "글 초안 작성 중..." (Text 호출, 스트리밍 시작)
- 예상 시간 표시 ("약 20~40초")
- 취소 버튼 → 단계 2 로 복귀, 진행 중 요청 abort

**구현 노트**:
- Text 호출은 스트리밍으로 받아 4단계 에디터에 점진적 표시 → 체감 대기 시간 감소
- 본문이 들어오기 시작하면 자동으로 단계 4 로 전환

### 5.5 단계 4 — 결과 에디터

**구성**:
- 제목 입력란 (수정 가능)
- 본문 에디터 (마크다운 멀티라인, 사진은 인라인 썸네일 렌더)
- 부분 수정 패널 (메인 수정 도구)
- "복사하기" 버튼 (본문 + 사진 한 번에 클립보드)
- 사진 보조 도구 (백업 다운로드)

**부분 수정 동작** (메인 수정 흐름):
1. 본문에서 수정할 텍스트 드래그 선택
2. 선택 영역 위 플로팅 메뉴 등장:
   - 빠른 액션: "더 친근하게" / "더 짧게" / "더 자세히" / "맛 묘사 강화"
   - 자유 입력란
3. 클릭 → `/api/refine` 호출 → 결과로 스트리밍 교체
4. Undo 한 번으로 원래대로 복귀

**복사 동작**:
- 마크다운 → HTML 변환 (`marked`)
- 사진 토큰 `![](photo_id)` 자리에 `<img src="data:image/jpeg;base64,...">` 임베드
- `navigator.clipboard.write()` 로 `text/html` + `text/plain` 동시 복사
- 네이버 블로그 PC 웹 에디터에서 `Ctrl+V` 한 번에 본문 + 사진 들어감

**복사 후 안내**:
- "네이버 블로그 PC 웹 에디터에서 Ctrl+V 하세요. 모바일 앱에서는 본문만 들어가고 사진은 따로 추가해야 합니다."
- 보조 버튼: "사진만 ZIP 다운로드"

**모바일 레이아웃**:
- 본문 에디터가 화면 80% 차지
- 부분 수정 메뉴는 텍스트 선택 시 화면 하단에서 슬라이드업 (네이티브 액션 시트 스타일)
- "복사하기" 버튼 우상단 고정

---

## 6. AI 호출 전략

### 6.1 두 단계로 분리 호출 (Vision → Text)

캐싱과 부분 수정 비용 절감을 위해 사진 분석과 본문 생성을 분리한다.

**`POST /api/analyze-photos`** (1차, Vision):
- 입력: `{ photos: [{id, dataUrl, userNote}], storeInfo, topicHint }`
- 출력 (JSON): `{ captions: [{photo_id, caption, food_name_guess}], tone_suggestion }`
- 클라이언트는 결과를 `Draft.photos[i].aiCaption` 에 저장

**`POST /api/generate-post`** (2차, Text 스트리밍):
- 입력: `{ captions, storeInfo, topicHint }` (사진 base64 는 다시 보내지 않음)
- 출력 (스트리밍): 마크다운 본문 (`# 제목\n\n... ![](photo_id) ...`)
- 사진 토큰을 본문 적절한 위치에 자동 배치

**`POST /api/refine`** (3차, 부분 수정):
- 입력: `{ fullBody, selection: {start, end, text}, instruction }`
- 출력 (스트리밍): 교체될 텍스트만
- 사진 데이터 없이도 동작 (토큰 비용 적음)

### 6.2 프롬프트 원칙

- **시스템 프롬프트**: 네이버 맛집 블로그 톤·구조·해시태그 관례 명시
  - "1~3문장의 짧은 문단, 친근한 반말 또는 친근한 존댓말, 마지막에 해시태그 5~8개"
  - "각 사진은 자연스러운 위치에 한 장씩 배치, 사진 직전에 자연스러운 한 문장으로 소개"
- **Few-shot**: 잘 쓴 맛집 블로그 글 1~2개를 시스템 프롬프트에 포함해 톤 안정화
- **출력 형식**: Vision 응답은 JSON 강제 (스키마 명시), Text 응답은 마크다운 자유 형식

### 6.3 모델·온도

- 모델: `claude-opus-4-7` 가 아닌 `claude-sonnet-4-6` (비용 효율 + 한국어 충분)
  - *주의: 디자인 시점 가용 모델 기준. 구현 시점에 최신 Sonnet 모델 ID 확인 후 사용.*
- temperature: 0.7 (창의성 있는 글이 필요)
- max_tokens: 본문 생성 4096, 부분 수정 1024

---

## 7. 에러 처리

| 상황 | 처리 |
|---|---|
| Claude API 네트워크 실패 | 토스트 알림 "다시 시도" 버튼, 단계 유지 |
| Claude API Rate limit / 5xx | 자동 재시도 (지수 백오프, 최대 3회) 후 실패 시 알림 |
| 사진 리사이즈 실패 (브라우저 메모리) | 그 사진만 건너뛰고 사용자에게 알림 |
| localStorage 용량 초과 | 단계 1 에서 총 base64 크기 5MB 초과 시 경고 |
| Claude 응답 JSON 파싱 실패 (Vision) | 1회 재시도, 실패 시 alert + 단계 2 로 복귀 |
| 클립보드 복사 실패 (권한 / 브라우저 미지원) | fallback: 본문은 textarea 에 표시 (수동 복사) + 사진 자동 ZIP 다운로드 |
| 비밀번호 미입력 상태로 API 호출 | 401 응답 → 로그인 페이지로 리다이렉트 |

---

## 8. 향후 크롬 확장 호환

1차 MVP 의 `Draft` 데이터 구조는 그대로 확장 프로그램이 읽을 수 있도록 설계되어 있다.

**확장 추가 시 변경 사항** (1차 코드에 거의 영향 없음):
- 단계 4 에 "네이버 블로그에 자동 입력" 버튼 1개 추가
- 클릭 시 `window.postMessage({ type: "DRAFT_TO_NAVER", payload: draft }, "*")` 발송
- 확장 프로그램 content script 가 이를 수신
- 새 탭에서 네이버 블로그 글쓰기 페이지를 열고 본문 + 사진을 순서대로 입력
- 마지막 "게시" 버튼은 사용자가 직접 누름 (캡차·약관 안전)

데이터 구조 변경·마이그레이션 불필요. 1차 단계에서는 별도로 신경 쓸 부분 없음.

---

## 9. 화면 단위 목록 (구현 계획용 사전 분해)

| 화면 / 컴포넌트 | 책임 |
|---|---|
| `app/login/page.tsx` | 비밀번호 입력 |
| `app/page.tsx` | 마법사 컨테이너 (현재 단계에 따라 컴포넌트 분기) |
| `components/wizard/Step1Photos.tsx` | 사진 업로드 + 그리드 + 순서 변경 |
| `components/wizard/Step2Info.tsx` | 가게 정보 + 주제 메모 폼 |
| `components/wizard/Step3Generating.tsx` | 생성 진행 + 스트리밍 미리보기 |
| `components/wizard/Step4Editor.tsx` | 결과 에디터 + 부분 수정 + 복사 |
| `components/PhotoTile.tsx` | 단일 사진 카드 (드래그·삭제·메모) |
| `components/FloatingRefineMenu.tsx` | 부분 수정 플로팅 메뉴 |
| `lib/draft.ts` | localStorage 의 `Draft` 읽기·쓰기·초기화 |
| `lib/imageResize.ts` | 캔버스 기반 클라이언트 사이드 리사이즈 |
| `lib/clipboard.ts` | 본문 + 사진 동시 클립보드 복사 |
| `lib/markdown.ts` | 마크다운 → HTML 변환 (사진 토큰 인라인) |
| `app/api/analyze-photos/route.ts` | Vision 호출 |
| `app/api/generate-post/route.ts` | Text 생성 (스트리밍) |
| `app/api/refine/route.ts` | 부분 수정 (스트리밍) |
| `middleware.ts` | 비밀번호 쿠키 검증 |

---

## 10. 미결정 / 위험 / 가정

### 미결정
- 네이버 블로그 PC 웹 에디터가 클립보드의 base64 인라인 이미지를 받아주는지 **실측 검증 필요**. 안 되면 차선책 (외부 호스팅 URL 임베드 또는 사진별 순차 복사) 으로 전환.
- 가게 정보 보강 (주소 → 가게명·카테고리 자동 조회) 은 1차 범위에서 제외. 사용자가 모두 직접 입력. 2차에서 카카오맵/네이버 지도 API 검토.

### 위험
- Claude API 비용: 1글당 사진 5~10장 기준 Vision + Text + 부분 수정 합쳐 약 1000~3000원 (Sonnet 기준 추정). 개인용이라 부담은 적으나 모니터링 필요.
- localStorage 5MB 한계: 사진을 많이 올리면 부딪힘. 단계 1 에서 사전 검증.
- 모바일 클립보드 호환성: 모바일 브라우저는 HTML 클립보드 지원이 약하다. 모바일에서는 본문만 들어가고 사진은 따로 추가하는 흐름을 명시.

### 가정
- 사용자는 본인 1인. 동시 사용·동시 작성·동시 발행 시나리오 없음.
- 사용자는 PC 와 모바일 모두 사용. 발행은 주로 PC 에서.
- Claude API 키는 본인 명의 / 본인 결제. 비용은 본인 부담.
- 네이버 이용약관상 "자동 발행" 의 회색 영역은 1차에서 회피 (복사 방식). 2차 확장 프로그램은 본인 책임.

---

## 11. 구현 우선순위

추후 별도 구현 계획 문서에서 상세화한다. 큰 순서:

1. 비밀번호 보호 미들웨어 + 로그인 페이지
2. `Draft` 데이터 모델 + localStorage 읽기·쓰기 라이브러리
3. 단계 1 (사진 업로드 + 리사이즈)
4. 단계 2 (정보 입력 폼)
5. `/api/analyze-photos` + `/api/generate-post` API
6. 단계 3 (로딩 + 스트리밍)
7. 단계 4 (에디터 + 복사)
8. 부분 수정 (`/api/refine` + 플로팅 메뉴)
9. 에러 처리 강건화
10. 모바일 UX 다듬기

각 단계마다 손으로 직접 써보며 검증.

---

## Scope update (2026-05-23)

The original spec assumed "맛집 탐방 리뷰" only. Per user instruction (2026-05-23), the scope is broadened to **any blog review type**: restaurant, product, place, experience, etc. The wizard UI uses neutral labels (이름/위치/날짜/항목/주제 메모). The AI system prompt in Tasks 8/9 (to be implemented) must be neutralized — "맛집 후기" → "블로그 리뷰", and the prompt should let the model infer review type from the topic memo and photos. The structural template (intro → context → details → assessment → hashtags) remains valid for all review types.

---

## 톤 가이드 적용 (2026-05-23)

사용자가 goxxox 블로그(https://m.blog.naver.com/goxxox) 의 글 5편을 paste 해주어, 그 톤·문체를 학습한 system prompt 가 Task 9(`generate-post`)와 Task 12(`refine`) 의 API 라우트에 통합되었다.

**적용된 톤 핵심**:
- 종결어미: 명사형 "~봄/~함/~음" + 친근체 "~잖아/~답니다/~구요" + 회상형 "~더라/~더라구요" + 자기 다짐 "~자구/~보자" + 짧은 마무리 "ㄱ/ㅋ/굿"
- 호흡: 1~3 문장의 짧은 단락, 한 줄짜리 문장도 자주
- 감각 어휘: "짭조름한/알싸한/달달한/단짠조화/포슬한/찐/굳이?/그 잡채일 듯/땡기는"
- 구조: 짧은 도입 → 컨텍스트 → 감각 디테일 → 솔직한 평가(장단점 모두) → 짧은 마무리 + 해시태그 1~3개
- 광고체 금지, 일기 + 친구에게 말하는 느낌

**Few-shot 예시 3편** (스낵·술집·제품) 이 generate-post 시스템 프롬프트에 발췌 형태로 포함됨. 원본 문장 그대로 복제는 금지 가드 명시.

**참고 PDF 파일** (사용자 로컬, 저장소 외부):
- 화제의 먹태깡 청양마요맛 나도 먹어봄
- 영종 하늘도시 김복남맥주 가성비 술집 살얼음 맥주 맛집
- 영종 하늘도시 토핑을 아끼지 않는 프레드피자
- 그로밋 키링, 내 애착인형 옷 입히기 구경하실?
- 인천 영종씨사이드 레일바이크 물 때 시간 맞춰가는 걸 추천!

향후 톤이 미흡하면 system prompt 에 추가 few-shot 발췌를 더 길게 넣거나, AI 응답 품질을 높이기 위해 temperature·max_tokens 조정 가능.
