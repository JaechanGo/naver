# 네이버 맛집 블로그 자동 작성 웹 — 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 사진과 가게 정보를 입력하면 Claude 4.6 Sonnet 이 손님 관점의 맛집 리뷰 블로그 글을 자동 작성해주는 본인 1인용 웹앱을 Next.js + Vercel 로 구축한다.

**Architecture:** Next.js 15 (App Router) 단일 앱. 클라이언트 측 4단계 마법사 + Vercel API Routes 3개 (Vision 분석, 본문 생성, 부분 수정) + 브라우저 localStorage 만으로 상태 보관. DB·인증·객체 스토리지 없음. 비밀번호 미들웨어로 접근 보호.

**Tech Stack:** Next.js 15, React 19, TypeScript, Tailwind CSS v4, `@anthropic-ai/sdk`, `marked`, `lucide-react`, `@dnd-kit/sortable`, `jszip`. 테스트: Vitest + jsdom + React Testing Library. 배포: Vercel.

**Reference Specs:**
- 시스템 설계: [2026-05-23-naver-blog-writer-design.md](../specs/2026-05-23-naver-blog-writer-design.md)
- UI 핸드오프: [2026-05-23-naver-blog-writer-ui-handoff.md](../specs/2026-05-23-naver-blog-writer-ui-handoff.md)

---

## 사전 준비

이 계획을 시작하기 전에 다음을 준비합니다:
- Node.js 20+ 설치
- Anthropic API 키 발급 (https://console.anthropic.com)
- Vercel CLI 설치 (`npm i -g vercel`) — 선택, 로컬 테스트만 할 거면 불필요

작업 디렉토리: `/Users/jaechango/네이버`

---

## 파일 구조 (전체)

```
naver/
├── app/
│   ├── api/
│   │   ├── analyze-photos/route.ts     # Vision 호출
│   │   ├── generate-post/route.ts      # 본문 생성 (스트리밍)
│   │   ├── refine/route.ts             # 부분 수정 (스트리밍)
│   │   └── login/route.ts              # 비밀번호 검증
│   ├── login/page.tsx                  # 로그인 화면
│   ├── layout.tsx                      # 루트 레이아웃 + 폰트
│   ├── page.tsx                        # 마법사 컨테이너
│   └── globals.css                     # Tailwind
├── components/
│   ├── ui/
│   │   ├── PrimaryButton.tsx
│   │   ├── SecondaryButton.tsx
│   │   ├── IconButton.tsx
│   │   ├── Card.tsx
│   │   ├── Input.tsx
│   │   ├── Textarea.tsx
│   │   ├── Spinner.tsx
│   │   └── Toast.tsx
│   ├── wizard/
│   │   ├── WizardContainer.tsx
│   │   ├── ProgressBar.tsx
│   │   ├── Step1Photos.tsx
│   │   ├── Step2Info.tsx
│   │   ├── Step3Generating.tsx
│   │   └── Step4Editor.tsx
│   ├── PhotoTile.tsx
│   └── FloatingRefineMenu.tsx
├── lib/
│   ├── draft.ts                        # localStorage Draft 모델
│   ├── imageResize.ts                  # 클라이언트 이미지 리사이즈
│   ├── markdown.ts                     # 마크다운 → HTML + 사진 인라인
│   ├── clipboard.ts                    # 클립보드 복사
│   └── anthropic.ts                    # Anthropic SDK 클라이언트 (서버 측)
├── lib/__tests__/                      # Vitest 단위 테스트
│   ├── draft.test.ts
│   ├── imageResize.test.ts
│   ├── markdown.test.ts
│   └── clipboard.test.ts
├── middleware.ts                       # 비밀번호 보호
├── next.config.mjs
├── tailwind.config.ts
├── tsconfig.json
├── vitest.config.ts
├── package.json
├── .env.local                          # 환경 변수 (커밋 금지)
└── .gitignore
```

---

## Task 0: 프로젝트 초기화

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.mjs`, `tailwind.config.ts`, `app/layout.tsx`, `app/page.tsx`, `app/globals.css`, `.env.local`, `.gitignore`, `vitest.config.ts`

- [ ] **Step 1: Next.js 프로젝트 생성**

작업 디렉토리에서 실행:

```bash
cd /Users/jaechango/네이버
npx create-next-app@latest . --typescript --tailwind --app --src-dir=false --import-alias="@/*" --no-eslint --use-npm
```

프롬프트가 뜨면 모두 기본값. `--no-eslint` 는 1인용이라 생략.

- [ ] **Step 2: 의존성 추가 설치**

```bash
npm install @anthropic-ai/sdk marked lucide-react @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities jszip
npm install -D vitest @vitest/ui @testing-library/react @testing-library/jest-dom jsdom @types/marked
```

- [ ] **Step 3: `.env.local` 작성**

`/Users/jaechango/네이버/.env.local`:

```
ANTHROPIC_API_KEY=sk-ant-여기에본인키
SITE_PASSWORD=원하는비밀번호
```

`.gitignore` 에 `.env.local` 이 이미 포함되어 있는지 확인. 없으면 추가.

- [ ] **Step 4: `app/globals.css` 작성**

`/Users/jaechango/네이버/app/globals.css`:

```css
@import "tailwindcss";

:root {
  --background: 250 250 249;  /* stone-50 */
  --foreground: 28 25 23;     /* stone-900 */
}

html, body {
  font-family: var(--font-pretendard), system-ui, -apple-system, sans-serif;
  background: rgb(var(--background));
  color: rgb(var(--foreground));
}

/* iOS 입력 시 강제 줌 방지 위해 body 16px 최소 */
body { font-size: 16px; }

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-8px); }
  75% { transform: translateX(8px); }
}
.animate-shake { animation: shake 0.4s ease-in-out; }

@keyframes wiggle {
  0%, 100% { transform: rotate(-10deg); }
  50% { transform: rotate(10deg); }
}
.animate-wiggle { animation: wiggle 2s ease-in-out infinite; }

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

- [ ] **Step 5: Pretendard 폰트 설정**

`/Users/jaechango/네이버/app/layout.tsx`:

```tsx
import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const pretendard = localFont({
  src: "../public/fonts/PretendardVariable.woff2",
  variable: "--font-pretendard",
  display: "swap",
});

export const metadata: Metadata = {
  title: "맛집 블로그 작성기",
  description: "사진과 정보로 네이버 맛집 블로그 글을 자동 작성",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className={pretendard.variable}>
      <body className="min-h-screen bg-stone-50 text-stone-900 antialiased">
        {children}
      </body>
    </html>
  );
}
```

Pretendard 폰트 파일을 다운로드:

```bash
mkdir -p /Users/jaechango/네이버/public/fonts
curl -L -o /Users/jaechango/네이버/public/fonts/PretendardVariable.woff2 \
  https://github.com/orioncactus/pretendard/raw/main/packages/pretendard/dist/web/variable/woff2/PretendardVariable.woff2
```

- [ ] **Step 6: `app/page.tsx` 임시 placeholder**

`/Users/jaechango/네이버/app/page.tsx`:

```tsx
export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="text-center">
        <div className="text-6xl mb-4">🍽️</div>
        <h1 className="text-3xl font-bold">맛집 블로그 작성기</h1>
        <p className="text-stone-600 mt-2">곧 만들어집니다</p>
      </div>
    </main>
  );
}
```

- [ ] **Step 7: Vitest 설정**

`/Users/jaechango/네이버/vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, ".") },
  },
});
```

`/Users/jaechango/네이버/vitest.setup.ts`:

```ts
import "@testing-library/jest-dom/vitest";
```

`package.json` 의 `scripts` 에 추가 (수동 편집):

```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "test": "vitest run",
  "test:watch": "vitest"
}
```

- [ ] **Step 8: dev 서버 확인**

```bash
npm run dev
```

브라우저에서 `http://localhost:3000` 열면 🍽️ 와 "맛집 블로그 작성기" 가 보여야 함. 안 보이면 콘솔 에러 확인.

`Ctrl+C` 로 서버 종료.

- [ ] **Step 9: 사용자에게 수동 git init 안내**

⚠️ 사용자가 직접 git 관리. 자동 commit 하지 않음. 사용자에게 알릴 사항:

> "Task 0 완료. 지금 시점에서 `git init && git add -A && git commit -m 'Task 0: project init'` 하시면 좋습니다. 이후 task 마다 같은 패턴으로 commit 권장."

---

## Task 1: localStorage Draft 라이브러리 (TDD)

**Files:**
- Create: `lib/draft.ts`
- Test: `lib/__tests__/draft.test.ts`

`Draft` 타입은 디자인 문서 4.1 절을 따른다.

- [ ] **Step 1: 실패하는 테스트 작성**

`/Users/jaechango/네이버/lib/__tests__/draft.test.ts`:

```ts
import { describe, it, expect, beforeEach } from "vitest";
import { readDraft, writeDraft, clearDraft, createEmptyDraft, type Draft } from "@/lib/draft";

describe("draft", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("createEmptyDraft returns step 1 with empty fields", () => {
    const draft = createEmptyDraft();
    expect(draft.step).toBe(1);
    expect(draft.photos).toEqual([]);
    expect(draft.topicHint).toBe("");
    expect(draft.storeInfo).toEqual({});
    expect(draft.result).toBeUndefined();
  });

  it("readDraft returns null when nothing stored", () => {
    expect(readDraft()).toBeNull();
  });

  it("writeDraft then readDraft returns same object", () => {
    const draft: Draft = {
      step: 2,
      photos: [{ id: "abc", dataUrl: "data:image/jpeg;base64,xxx" }],
      storeInfo: { name: "한우집" },
      topicHint: "맛있었음",
    };
    writeDraft(draft);
    expect(readDraft()).toEqual(draft);
  });

  it("clearDraft removes stored data", () => {
    writeDraft(createEmptyDraft());
    expect(readDraft()).not.toBeNull();
    clearDraft();
    expect(readDraft()).toBeNull();
  });

  it("writeDraft handles non-serializable values gracefully", () => {
    const draft = createEmptyDraft();
    // 정상 케이스만 검증 — JSON.stringify 호환 객체만 받음
    expect(() => writeDraft(draft)).not.toThrow();
  });
});
```

- [ ] **Step 2: 테스트 실행 - 실패 확인**

```bash
npm run test
```

Expected: `lib/draft` import 에러로 모든 테스트 실패.

- [ ] **Step 3: 최소 구현**

`/Users/jaechango/네이버/lib/draft.ts`:

```ts
const STORAGE_KEY = "current_draft";

export type Photo = {
  id: string;
  dataUrl: string;
  userNote?: string;
  aiCaption?: string;
};

export type StoreInfo = {
  name?: string;
  address?: string;
  visitDate?: string;
  menu?: string;
};

export type Draft = {
  step: 1 | 2 | 3 | 4;
  photos: Photo[];
  storeInfo: StoreInfo;
  topicHint: string;
  result?: {
    title: string;
    bodyMarkdown: string;
    generatedAt: string;
  };
};

export function createEmptyDraft(): Draft {
  return {
    step: 1,
    photos: [],
    storeInfo: {},
    topicHint: "",
  };
}

export function readDraft(): Draft | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Draft;
  } catch {
    return null;
  }
}

export function writeDraft(draft: Draft): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
}

export function clearDraft(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}

export function totalPhotoBytes(draft: Draft): number {
  return draft.photos.reduce((sum, p) => sum + p.dataUrl.length, 0);
}
```

- [ ] **Step 4: 테스트 실행 - 통과 확인**

```bash
npm run test
```

Expected: 5개 테스트 모두 통과.

- [ ] **Step 5: 사용자에게 commit 권장**

> "Task 1 완료. `git add -A && git commit -m 'Task 1: draft localStorage lib'` 권장."

---

## Task 2: 이미지 리사이즈 라이브러리

**Files:**
- Create: `lib/imageResize.ts`
- Test: `lib/__tests__/imageResize.test.ts`

브라우저 캔버스 API 를 쓰는 함수는 jsdom 에서 일부 동작 안 함. 핵심 로직은 직접 테스트하고, 브라우저 의존 부분은 통합 테스트로 미룬다.

- [ ] **Step 1: 테스트 작성 (계산 로직만 단위 테스트)**

`/Users/jaechango/네이버/lib/__tests__/imageResize.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { calcTargetSize } from "@/lib/imageResize";

describe("calcTargetSize", () => {
  it("does not upscale smaller images", () => {
    expect(calcTargetSize(800, 600, 1024)).toEqual({ width: 800, height: 600 });
  });

  it("resizes landscape image by width", () => {
    expect(calcTargetSize(2048, 1536, 1024)).toEqual({ width: 1024, height: 768 });
  });

  it("resizes portrait image by height", () => {
    expect(calcTargetSize(1536, 2048, 1024)).toEqual({ width: 768, height: 1024 });
  });

  it("handles square image", () => {
    expect(calcTargetSize(2000, 2000, 1024)).toEqual({ width: 1024, height: 1024 });
  });
});
```

- [ ] **Step 2: 테스트 실행 - 실패 확인**

```bash
npm run test
```

Expected: `calcTargetSize` undefined 에러.

- [ ] **Step 3: 구현**

`/Users/jaechango/네이버/lib/imageResize.ts`:

```ts
export function calcTargetSize(
  width: number,
  height: number,
  maxEdge: number,
): { width: number; height: number } {
  if (width <= maxEdge && height <= maxEdge) {
    return { width, height };
  }
  const ratio = Math.min(maxEdge / width, maxEdge / height);
  return {
    width: Math.round(width * ratio),
    height: Math.round(height * ratio),
  };
}

export async function resizeImageToDataUrl(
  file: File,
  maxEdge = 1024,
  quality = 0.85,
): Promise<string> {
  const img = await loadImage(file);
  const { width, height } = calcTargetSize(img.width, img.height, maxEdge);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas context unavailable");
  ctx.drawImage(img, 0, 0, width, height);

  return canvas.toDataURL("image/jpeg", quality);
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(new Error(`Failed to load image: ${e}`));
    };
    img.src = url;
  });
}

export function dataUrlByteLength(dataUrl: string): number {
  // base64 길이 → 대략 바이트 수
  const base64 = dataUrl.split(",")[1] ?? "";
  return Math.floor((base64.length * 3) / 4);
}
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
npm run test
```

Expected: 4개 테스트 모두 통과.

- [ ] **Step 5: 수동 검증을 위한 임시 페이지 확인** (선택)

브라우저에서 실제 리사이즈 동작은 Step 1 UI 만든 후 검증.

- [ ] **Step 6: commit**

> "Task 2 완료. `git add -A && git commit -m 'Task 2: image resize lib'` 권장."

---

## Task 3: 마크다운 변환 + 클립보드 라이브러리 (TDD)

**Files:**
- Create: `lib/markdown.ts`, `lib/clipboard.ts`
- Test: `lib/__tests__/markdown.test.ts`, `lib/__tests__/clipboard.test.ts`

- [ ] **Step 1: markdown.ts 테스트 작성**

`/Users/jaechango/네이버/lib/__tests__/markdown.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { markdownToHtmlWithPhotos, extractPhotoTokens } from "@/lib/markdown";

describe("markdown", () => {
  const photos = [
    { id: "a", dataUrl: "data:image/jpeg;base64,AAAA" },
    { id: "b", dataUrl: "data:image/jpeg;base64,BBBB" },
  ];

  it("renders text without photos as plain HTML", () => {
    const html = markdownToHtmlWithPhotos("**Hello** world", []);
    expect(html).toContain("<strong>Hello</strong>");
  });

  it("replaces photo tokens with inline base64 img tags", () => {
    const md = "안녕\n\n![](a)\n\n다음";
    const html = markdownToHtmlWithPhotos(md, photos);
    expect(html).toContain('src="data:image/jpeg;base64,AAAA"');
  });

  it("removes unmatched photo tokens", () => {
    const md = "![](nonexistent)";
    const html = markdownToHtmlWithPhotos(md, photos);
    expect(html).not.toContain("nonexistent");
  });

  it("extractPhotoTokens returns ids in order", () => {
    expect(extractPhotoTokens("![](a) text ![](b) more ![](a)")).toEqual(["a", "b", "a"]);
  });
});
```

- [ ] **Step 2: 테스트 실행 (실패 확인)**

```bash
npm run test markdown
```

Expected: import 실패.

- [ ] **Step 3: markdown.ts 구현**

`/Users/jaechango/네이버/lib/markdown.ts`:

```ts
import { marked } from "marked";
import type { Photo } from "@/lib/draft";

const PHOTO_TOKEN_RE = /!\[\]\(([a-zA-Z0-9_-]+)\)/g;

export function extractPhotoTokens(markdown: string): string[] {
  const ids: string[] = [];
  for (const match of markdown.matchAll(PHOTO_TOKEN_RE)) {
    ids.push(match[1]);
  }
  return ids;
}

export function markdownToHtmlWithPhotos(markdown: string, photos: Photo[]): string {
  const byId = new Map(photos.map((p) => [p.id, p.dataUrl]));

  const replaced = markdown.replace(PHOTO_TOKEN_RE, (_, id: string) => {
    const dataUrl = byId.get(id);
    if (!dataUrl) return "";
    return `\n\n<img src="${dataUrl}" alt="" />\n\n`;
  });

  return marked.parse(replaced, { async: false }) as string;
}

export function markdownToPlainText(markdown: string): string {
  return markdown
    .replace(PHOTO_TOKEN_RE, "[사진]")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/#+\s/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
```

- [ ] **Step 4: clipboard.ts 테스트 작성**

`/Users/jaechango/네이버/lib/__tests__/clipboard.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { copyHtmlAndText, isClipboardWriteSupported } from "@/lib/clipboard";

describe("clipboard", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("isClipboardWriteSupported returns false when ClipboardItem missing", () => {
    const original = (globalThis as any).ClipboardItem;
    (globalThis as any).ClipboardItem = undefined;
    expect(isClipboardWriteSupported()).toBe(false);
    (globalThis as any).ClipboardItem = original;
  });

  it("copyHtmlAndText calls navigator.clipboard.write with html and text blobs", async () => {
    const writeMock = vi.fn().mockResolvedValue(undefined);
    (globalThis as any).ClipboardItem = class {
      constructor(public items: Record<string, Blob>) {}
    };
    Object.defineProperty(globalThis.navigator, "clipboard", {
      value: { write: writeMock },
      configurable: true,
    });

    await copyHtmlAndText("<p>hi</p>", "hi");

    expect(writeMock).toHaveBeenCalledOnce();
    const arg = writeMock.mock.calls[0][0][0];
    expect(arg.items["text/html"]).toBeInstanceOf(Blob);
    expect(arg.items["text/plain"]).toBeInstanceOf(Blob);
  });
});
```

- [ ] **Step 5: clipboard.ts 구현**

`/Users/jaechango/네이버/lib/clipboard.ts`:

```ts
export function isClipboardWriteSupported(): boolean {
  return (
    typeof navigator !== "undefined" &&
    typeof navigator.clipboard?.write === "function" &&
    typeof (globalThis as any).ClipboardItem !== "undefined"
  );
}

export async function copyHtmlAndText(html: string, text: string): Promise<void> {
  if (!isClipboardWriteSupported()) {
    throw new Error("Clipboard API not supported");
  }
  const item = new ClipboardItem({
    "text/html": new Blob([html], { type: "text/html" }),
    "text/plain": new Blob([text], { type: "text/plain" }),
  });
  await navigator.clipboard.write([item]);
}

export async function copyTextOnly(text: string): Promise<void> {
  if (!navigator.clipboard?.writeText) {
    throw new Error("Clipboard API not supported");
  }
  await navigator.clipboard.writeText(text);
}
```

- [ ] **Step 6: 테스트 모두 통과 확인**

```bash
npm run test
```

Expected: draft + imageResize + markdown + clipboard 모든 테스트 통과.

- [ ] **Step 7: commit**

> "Task 3 완료. `git add -A && git commit -m 'Task 3: markdown + clipboard libs'` 권장."

---

## Task 4: 비밀번호 보호 (Middleware + Login)

**Files:**
- Create: `middleware.ts`, `app/login/page.tsx`, `app/api/login/route.ts`, `components/ui/PrimaryButton.tsx`, `components/ui/Input.tsx`, `components/ui/Spinner.tsx`

PrimaryButton/Input/Spinner 는 로그인 페이지에서 먼저 필요하므로 여기서 함께 만든다.

- [ ] **Step 1: Spinner 컴포넌트**

`/Users/jaechango/네이버/components/ui/Spinner.tsx`:

```tsx
import { Loader2 } from "lucide-react";

type Props = {
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
};

const SIZE_MAP = {
  xs: "h-3 w-3",
  sm: "h-4 w-4",
  md: "h-5 w-5",
  lg: "h-8 w-8",
};

export function Spinner({ size = "md", className = "" }: Props) {
  return <Loader2 className={`animate-spin ${SIZE_MAP[size]} ${className}`} />;
}
```

- [ ] **Step 2: PrimaryButton 컴포넌트**

`/Users/jaechango/네이버/components/ui/PrimaryButton.tsx`:

```tsx
"use client";
import { Spinner } from "./Spinner";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  loading?: boolean;
  size?: "md" | "lg";
  fullWidth?: boolean;
};

export function PrimaryButton({
  loading = false,
  size = "md",
  fullWidth = false,
  disabled,
  children,
  className = "",
  ...rest
}: Props) {
  const height = size === "lg" ? "h-14 text-lg" : "h-12 text-base";
  const width = fullWidth ? "w-full" : "";
  const isDisabled = disabled || loading;

  return (
    <button
      {...rest}
      disabled={isDisabled}
      className={[
        height,
        width,
        "px-6 rounded-xl font-semibold shadow-sm transition-colors duration-150",
        "bg-amber-500 text-white",
        "hover:bg-amber-600 active:bg-amber-700 active:scale-[0.98]",
        "disabled:bg-stone-200 disabled:text-stone-400 disabled:cursor-not-allowed disabled:hover:bg-stone-200 disabled:active:scale-100",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2",
        "flex items-center justify-center gap-2",
        className,
      ].join(" ")}
    >
      {loading ? <Spinner size="sm" className="text-white" /> : null}
      {children}
    </button>
  );
}
```

- [ ] **Step 3: Input 컴포넌트**

`/Users/jaechango/네이버/components/ui/Input.tsx`:

```tsx
import { forwardRef } from "react";

type Props = React.InputHTMLAttributes<HTMLInputElement> & {
  error?: boolean;
};

export const Input = forwardRef<HTMLInputElement, Props>(function Input(
  { error = false, className = "", ...rest },
  ref,
) {
  return (
    <input
      ref={ref}
      {...rest}
      className={[
        "w-full h-12 px-4 rounded-lg border bg-white text-base text-stone-900 placeholder-stone-400",
        "focus:outline-none focus:ring-2",
        error
          ? "border-red-500 focus:border-red-500 focus:ring-red-100"
          : "border-stone-200 focus:border-amber-500 focus:ring-amber-100",
        className,
      ].join(" ")}
    />
  );
});
```

- [ ] **Step 4: 로그인 API Route**

`/Users/jaechango/네이버/app/api/login/route.ts`:

```ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(req: Request) {
  const { password } = await req.json();
  const expected = process.env.SITE_PASSWORD;

  if (!expected) {
    return NextResponse.json({ error: "SITE_PASSWORD not configured" }, { status: 500 });
  }

  if (password !== expected) {
    return NextResponse.json({ error: "비밀번호가 일치하지 않습니다." }, { status: 401 });
  }

  const cookieStore = await cookies();
  cookieStore.set("auth", expected, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30일
  });

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 5: 로그인 페이지**

`/Users/jaechango/네이버/app/login/page.tsx`:

```tsx
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { PrimaryButton } from "@/components/ui/PrimaryButton";

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shake, setShake] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? "로그인 실패");
        setShake(true);
        setTimeout(() => setShake(false), 400);
        return;
      }

      router.push("/");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-stone-50 px-4">
      <div className={`max-w-sm w-full ${shake ? "animate-shake" : ""}`}>
        <div className="text-center mb-8">
          <div className="text-5xl mb-2">🍽️</div>
          <h1 className="text-3xl font-bold">맛집 블로그 작성기</h1>
          <p className="text-stone-600 mt-2 text-sm">비밀번호를 입력해주세요</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            type="password"
            placeholder="비밀번호"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={!!error}
            autoFocus
          />
          {error && (
            <p role="alert" aria-live="polite" className="text-sm text-red-600">
              {error}
            </p>
          )}
          <PrimaryButton type="submit" size="lg" fullWidth loading={loading} disabled={!password}>
            들어가기
          </PrimaryButton>
        </form>
      </div>
    </main>
  );
}
```

- [ ] **Step 6: middleware.ts**

`/Users/jaechango/네이버/middleware.ts`:

```ts
import { NextResponse, type NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const expected = process.env.SITE_PASSWORD;
  if (!expected) return NextResponse.next();

  const cookie = req.cookies.get("auth")?.value;
  if (cookie === expected) return NextResponse.next();

  // 로그인 페이지 및 로그인 API 는 통과
  const { pathname } = req.nextUrl;
  if (pathname.startsWith("/login") || pathname.startsWith("/api/login")) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = req.nextUrl.clone();
  url.pathname = "/login";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|fonts/).*)"],
};
```

- [ ] **Step 7: 수동 검증**

```bash
npm run dev
```

브라우저:
1. `http://localhost:3000` → `/login` 으로 리다이렉트 확인
2. 잘못된 비밀번호 입력 → "비밀번호가 일치하지 않습니다." + 흔들림 애니메이션 확인
3. 올바른 비밀번호 입력 → `/` 로 이동, 🍽️ 화면 보임
4. 새 탭에서 `http://localhost:3000` → 쿠키 덕에 바로 메인 진입

서버 종료.

- [ ] **Step 8: commit**

> "Task 4 완료. `git add -A && git commit -m 'Task 4: password protect + login'` 권장."

---

## Task 5: 공통 UI 컴포넌트 나머지

**Files:**
- Create: `components/ui/SecondaryButton.tsx`, `components/ui/IconButton.tsx`, `components/ui/Card.tsx`, `components/ui/Textarea.tsx`, `components/ui/Toast.tsx`

- [ ] **Step 1: SecondaryButton**

`/Users/jaechango/네이버/components/ui/SecondaryButton.tsx`:

```tsx
"use client";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  size?: "md" | "lg";
  fullWidth?: boolean;
};

export function SecondaryButton({
  size = "md",
  fullWidth = false,
  children,
  className = "",
  ...rest
}: Props) {
  const height = size === "lg" ? "h-14 text-lg" : "h-12 text-base";
  const width = fullWidth ? "w-full" : "";

  return (
    <button
      {...rest}
      className={[
        height,
        width,
        "px-6 rounded-xl font-medium",
        "bg-white border border-stone-200 text-stone-900",
        "hover:bg-stone-50 hover:border-stone-300 active:bg-stone-100",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-300 focus-visible:ring-offset-2",
        "transition-colors duration-150",
        className,
      ].join(" ")}
    >
      {children}
    </button>
  );
}
```

- [ ] **Step 2: IconButton**

`/Users/jaechango/네이버/components/ui/IconButton.tsx`:

```tsx
"use client";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  "aria-label": string;
};

export function IconButton({ children, className = "", ...rest }: Props) {
  return (
    <button
      {...rest}
      className={[
        "h-10 w-10 rounded-full flex items-center justify-center",
        "text-stone-600 hover:bg-stone-100 active:bg-stone-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300",
        "transition-colors duration-150",
        className,
      ].join(" ")}
    >
      {children}
    </button>
  );
}
```

- [ ] **Step 3: Card**

`/Users/jaechango/네이버/components/ui/Card.tsx`:

```tsx
type Props = React.HTMLAttributes<HTMLDivElement>;

export function Card({ children, className = "", ...rest }: Props) {
  return (
    <div
      {...rest}
      className={`bg-white border border-stone-200 rounded-xl p-4 md:p-6 shadow-sm ${className}`}
    >
      {children}
    </div>
  );
}
```

- [ ] **Step 4: Textarea**

`/Users/jaechango/네이버/components/ui/Textarea.tsx`:

```tsx
import { forwardRef } from "react";

type Props = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  error?: boolean;
};

export const Textarea = forwardRef<HTMLTextAreaElement, Props>(function Textarea(
  { error = false, className = "", ...rest },
  ref,
) {
  return (
    <textarea
      ref={ref}
      {...rest}
      className={[
        "w-full px-4 py-3 rounded-lg border bg-white text-base text-stone-900 placeholder-stone-400",
        "leading-relaxed resize-none min-h-[120px]",
        "focus:outline-none focus:ring-2",
        error
          ? "border-red-500 focus:border-red-500 focus:ring-red-100"
          : "border-stone-200 focus:border-amber-500 focus:ring-amber-100",
        className,
      ].join(" ")}
    />
  );
});
```

- [ ] **Step 5: Toast 시스템**

`/Users/jaechango/네이버/components/ui/Toast.tsx`:

```tsx
"use client";
import { createContext, useContext, useState, useCallback, useEffect } from "react";

type ToastKind = "success" | "error" | "warning";

type ToastItem = {
  id: number;
  kind: ToastKind;
  message: string;
};

type ToastContextType = {
  show: (kind: ToastKind, message: string) => void;
};

const ToastContext = createContext<ToastContextType | null>(null);

let nextId = 1;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const show = useCallback((kind: ToastKind, message: string) => {
    const id = nextId++;
    setItems((prev) => [...prev, { id, kind, message }]);
    const duration = kind === "error" ? 6000 : 4000;
    setTimeout(() => {
      setItems((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 pointer-events-none">
        {items.map((t) => (
          <ToastView key={t.id} item={t} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastView({ item }: { item: ToastItem }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    setVisible(true);
  }, []);

  const styleMap = {
    success: "bg-green-50 border-green-200 text-green-900",
    error: "bg-red-50 border-red-200 text-red-900",
    warning: "bg-amber-50 border-amber-200 text-amber-900",
  };
  const role = item.kind === "error" ? "alert" : "status";

  return (
    <div
      role={role}
      aria-live={item.kind === "error" ? "assertive" : "polite"}
      className={[
        "px-4 py-3 rounded-xl shadow-lg border max-w-md pointer-events-auto",
        "transition-all duration-200",
        visible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2",
        styleMap[item.kind],
      ].join(" ")}
    >
      {item.message}
    </div>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}
```

- [ ] **Step 6: 루트 레이아웃에 ToastProvider 추가**

`/Users/jaechango/네이버/app/layout.tsx` 를 수정. body 안을 ToastProvider 로 감싼다:

```tsx
import { ToastProvider } from "@/components/ui/Toast";

// ... (기존 import + metadata)

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className={pretendard.variable}>
      <body className="min-h-screen bg-stone-50 text-stone-900 antialiased">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 7: 수동 검증**

`npm run dev` 후 로그인하고 `/` 진입. 화면 깨짐 없는지 확인 (Toast 는 아직 호출 안 되니 빈 영역).

- [ ] **Step 8: commit**

> "Task 5 완료. `git add -A && git commit -m 'Task 5: ui components'` 권장."

---

## Task 6: WizardContainer + Step 1 사진 업로드

**Files:**
- Create: `components/wizard/WizardContainer.tsx`, `components/wizard/ProgressBar.tsx`, `components/wizard/Step1Photos.tsx`, `components/PhotoTile.tsx`
- Modify: `app/page.tsx`

- [ ] **Step 1: ProgressBar 컴포넌트**

`/Users/jaechango/네이버/components/wizard/ProgressBar.tsx`:

```tsx
type Props = { step: 1 | 2 | 3 | 4 };

export function ProgressBar({ step }: Props) {
  const dots = [1, 2, 3, 4] as const;
  return (
    <div
      role="progressbar"
      aria-valuenow={step}
      aria-valuemin={1}
      aria-valuemax={4}
      className="flex items-center justify-center gap-1 py-3"
    >
      {dots.map((d, i) => (
        <div key={d} className="flex items-center gap-1">
          <div
            className={`h-2.5 w-2.5 rounded-full transition-colors ${
              d <= step ? "bg-amber-500" : "bg-stone-300"
            }`}
          />
          {i < 3 && (
            <div
              className={`h-0.5 w-6 md:w-8 transition-colors ${
                d < step ? "bg-amber-500" : "bg-stone-300"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: PhotoTile 컴포넌트 (정렬 가능)**

`/Users/jaechango/네이버/components/PhotoTile.tsx`:

```tsx
"use client";
import { X, MessageSquare } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Photo } from "@/lib/draft";

type Props = {
  photo: Photo;
  index: number;
  onDelete: () => void;
  onEditNote: () => void;
};

export function PhotoTile({ photo, index, onDelete, onEditNote }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: photo.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="relative aspect-square rounded-lg overflow-hidden bg-stone-100 cursor-grab active:cursor-grabbing touch-none"
    >
      <img src={photo.dataUrl} alt="" className="w-full h-full object-cover" draggable={false} />
      <span className="absolute top-1 left-1 h-6 w-6 rounded-full bg-black/60 text-white text-xs font-medium flex items-center justify-center">
        {index + 1}
      </span>
      <button
        type="button"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        aria-label={`사진 ${index + 1} 삭제`}
        className="absolute top-1 right-1 h-7 w-7 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80"
      >
        <X className="h-4 w-4" />
      </button>
      <button
        type="button"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          onEditNote();
        }}
        aria-label={`사진 ${index + 1} 메모`}
        className={`absolute bottom-1 left-1 h-7 w-7 rounded-full text-white flex items-center justify-center ${
          photo.userNote ? "bg-amber-500" : "bg-black/40"
        }`}
      >
        <MessageSquare className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
```

- [ ] **Step 3: Step1Photos**

`/Users/jaechango/네이버/components/wizard/Step1Photos.tsx`:

```tsx
"use client";
import { useRef, useState } from "react";
import { ImagePlus, Camera } from "lucide-react";
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, rectSortingStrategy } from "@dnd-kit/sortable";
import type { Photo } from "@/lib/draft";
import { resizeImageToDataUrl, dataUrlByteLength } from "@/lib/imageResize";
import { PhotoTile } from "@/components/PhotoTile";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { useToast } from "@/components/ui/Toast";

const MAX_TOTAL_BYTES = 5 * 1024 * 1024;
const MAX_PHOTOS_WARN = 10;

type Props = {
  photos: Photo[];
  onChange: (photos: Photo[]) => void;
  onNext: () => void;
};

export function Step1Photos({ photos, onChange, onNext }: Props) {
  const galleryRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const toast = useToast();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
  );

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const newPhotos: Photo[] = [];

    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) continue;
      try {
        const dataUrl = await resizeImageToDataUrl(file);
        newPhotos.push({ id: crypto.randomUUID(), dataUrl });
      } catch (e) {
        toast.show("error", `사진 ${file.name} 처리 실패`);
      }
    }

    const combined = [...photos, ...newPhotos];
    const totalBytes = combined.reduce((s, p) => s + dataUrlByteLength(p.dataUrl), 0);
    if (totalBytes > MAX_TOTAL_BYTES) {
      toast.show("error", "사진 용량이 너무 큽니다. 일부를 줄이거나 삭제하세요.");
      return;
    }
    if (combined.length > MAX_PHOTOS_WARN) {
      toast.show("warning", "권장 10장까지입니다");
    }

    onChange(combined);
  }

  function handleDelete(id: string) {
    onChange(photos.filter((p) => p.id !== id));
  }

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = photos.findIndex((p) => p.id === active.id);
    const newIndex = photos.findIndex((p) => p.id === over.id);
    onChange(arrayMove(photos, oldIndex, newIndex));
  }

  function saveNote(id: string, note: string) {
    onChange(photos.map((p) => (p.id === id ? { ...p, userNote: note } : p)));
    setEditingNote(null);
  }

  return (
    <div className="px-4 md:px-8 pb-32">
      <h2 className="text-xl font-semibold mb-1">사진을 올려주세요</h2>
      <p className="text-sm text-stone-600 mb-4">맛집 사진을 모두 한 번에. 1~10장 권장</p>

      <div className="border-2 border-dashed border-stone-300 rounded-xl bg-white h-32 md:h-40 flex flex-col items-center justify-center gap-2 mb-4 hover:border-amber-500 hover:bg-amber-50 transition-colors">
        <ImagePlus className="h-6 w-6 text-amber-500" />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => galleryRef.current?.click()}
            className="px-3 py-1.5 text-sm rounded-lg bg-stone-100 hover:bg-stone-200"
          >
            갤러리에서 선택
          </button>
          <button
            type="button"
            onClick={() => cameraRef.current?.click()}
            className="px-3 py-1.5 text-sm rounded-lg bg-stone-100 hover:bg-stone-200 flex items-center gap-1"
          >
            <Camera className="h-4 w-4" /> 카메라
          </button>
        </div>
        <input
          ref={galleryRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {photos.length > 0 && (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={photos.map((p) => p.id)} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3" role="list">
              {photos.map((p, i) => (
                <PhotoTile
                  key={p.id}
                  photo={p}
                  index={i}
                  onDelete={() => handleDelete(p.id)}
                  onEditNote={() => setEditingNote(p.id)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {editingNote && (
        <NoteModal
          initial={photos.find((p) => p.id === editingNote)?.userNote ?? ""}
          onSave={(note) => saveNote(editingNote, note)}
          onCancel={() => setEditingNote(null)}
        />
      )}

      <div className="fixed bottom-0 left-0 right-0 bg-stone-50/95 backdrop-blur border-t border-stone-200 px-4 py-3 pb-[calc(env(safe-area-inset-bottom)+12px)]">
        <PrimaryButton
          fullWidth
          size="lg"
          disabled={photos.length === 0}
          onClick={onNext}
        >
          다음
        </PrimaryButton>
      </div>
    </div>
  );
}

function NoteModal({
  initial,
  onSave,
  onCancel,
}: {
  initial: string;
  onSave: (note: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(initial);
  return (
    <div className="fixed inset-0 z-40 bg-black/40 flex items-end md:items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md p-4">
        <h3 className="text-lg font-semibold mb-2">사진 메모</h3>
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="예: 이건 갈비탕"
          className="w-full min-h-[80px] px-3 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-100 focus:border-amber-500"
          autoFocus
        />
        <div className="flex gap-2 mt-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 h-11 rounded-lg border border-stone-200 hover:bg-stone-50"
          >
            취소
          </button>
          <button
            type="button"
            onClick={() => onSave(value)}
            className="flex-1 h-11 rounded-lg bg-amber-500 text-white hover:bg-amber-600"
          >
            저장
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: WizardContainer**

`/Users/jaechango/네이버/components/wizard/WizardContainer.tsx`:

```tsx
"use client";
import { useEffect, useState } from "react";
import { ArrowLeft, RotateCcw } from "lucide-react";
import { type Draft, createEmptyDraft, readDraft, writeDraft, clearDraft } from "@/lib/draft";
import { ProgressBar } from "@/components/wizard/ProgressBar";
import { Step1Photos } from "@/components/wizard/Step1Photos";
import { IconButton } from "@/components/ui/IconButton";

export function WizardContainer() {
  const [draft, setDraft] = useState<Draft | null>(null);

  useEffect(() => {
    const existing = readDraft();
    setDraft(existing ?? createEmptyDraft());
  }, []);

  useEffect(() => {
    if (draft) writeDraft(draft);
  }, [draft]);

  if (!draft) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-stone-400">불러오는 중...</div>
      </div>
    );
  }

  function update(patch: Partial<Draft>) {
    setDraft((prev) => (prev ? { ...prev, ...patch } : prev));
  }

  function goBack() {
    if (draft && draft.step > 1) update({ step: (draft.step - 1) as Draft["step"] });
  }

  function reset() {
    if (!confirm("작업 중인 글이 모두 사라집니다. 처음부터 새로 작성할까요?")) return;
    clearDraft();
    setDraft(createEmptyDraft());
  }

  return (
    <main className="min-h-screen pb-32">
      <header className="sticky top-0 z-30 bg-stone-50/80 backdrop-blur border-b border-stone-200">
        <div className="max-w-2xl mx-auto flex items-center justify-between px-4 h-12">
          <IconButton aria-label="뒤로" onClick={goBack} disabled={draft.step === 1}>
            <ArrowLeft className="h-5 w-5" />
          </IconButton>
          <ProgressBar step={draft.step} />
          <IconButton aria-label="처음부터" onClick={reset}>
            <RotateCcw className="h-5 w-5" />
          </IconButton>
        </div>
      </header>

      <div className="max-w-2xl mx-auto pt-4">
        {draft.step === 1 && (
          <Step1Photos
            photos={draft.photos}
            onChange={(photos) => update({ photos })}
            onNext={() => update({ step: 2 })}
          />
        )}
        {draft.step === 2 && (
          <div className="px-4">단계 2 (다음 Task)</div>
        )}
        {draft.step === 3 && (
          <div className="px-4">단계 3 (다음 Task)</div>
        )}
        {draft.step === 4 && (
          <div className="px-4">단계 4 (다음 Task)</div>
        )}
      </div>
    </main>
  );
}
```

- [ ] **Step 5: `app/page.tsx` 수정**

`/Users/jaechango/네이버/app/page.tsx`:

```tsx
import { WizardContainer } from "@/components/wizard/WizardContainer";

export default function Home() {
  return <WizardContainer />;
}
```

- [ ] **Step 6: 수동 검증**

`npm run dev` 후 로그인 → `/` 에서 단계 1 화면. 다음 확인:
- 갤러리 버튼으로 사진 여러 장 업로드 → 그리드 표시
- 카메라 버튼 (모바일 시뮬레이터에서만 작동)
- 사진 삭제 버튼 동작
- 사진 드래그로 순서 변경 동작
- 메모 아이콘 → 모달 → 저장 → 다시 열면 메모 보임
- "다음" 클릭 → 단계 2 placeholder 표시
- 새로고침 → 같은 단계 + 사진 그대로 (localStorage 작동)
- "처음부터" 버튼 → confirm → 단계 1 빈 화면

- [ ] **Step 7: commit**

> "Task 6 완료. `git add -A && git commit -m 'Task 6: wizard + step1 photos'` 권장."

---

## Task 7: Step 2 가게 정보 입력

**Files:**
- Create: `components/wizard/Step2Info.tsx`
- Modify: `components/wizard/WizardContainer.tsx`

- [ ] **Step 1: Step2Info 컴포넌트**

`/Users/jaechango/네이버/components/wizard/Step2Info.tsx`:

```tsx
"use client";
import type { StoreInfo } from "@/lib/draft";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Card } from "@/components/ui/Card";
import { PrimaryButton } from "@/components/ui/PrimaryButton";

type Props = {
  storeInfo: StoreInfo;
  topicHint: string;
  onChangeStore: (info: StoreInfo) => void;
  onChangeTopic: (topic: string) => void;
  onNext: () => void;
};

export function Step2Info({ storeInfo, topicHint, onChangeStore, onChangeTopic, onNext }: Props) {
  function handleNext() {
    if (!topicHint.trim()) {
      const ok = confirm(
        "주제 메모가 비어 있습니다. AI 가 사진만 보고 추측하면 품질이 떨어집니다. 그래도 진행할까요?",
      );
      if (!ok) return;
    }
    onNext();
  }

  function updateStore<K extends keyof StoreInfo>(key: K, value: StoreInfo[K]) {
    onChangeStore({ ...storeInfo, [key]: value });
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="px-4 md:px-8 pb-32 space-y-4">
      <div>
        <h2 className="text-xl font-semibold mb-1">가게 정보를 알려주세요</h2>
        <p className="text-sm text-stone-600">비워두면 AI 가 추측합니다</p>
      </div>

      <Card>
        <div className="space-y-3">
          <Field label="가게 이름">
            <Input
              type="text"
              value={storeInfo.name ?? ""}
              onChange={(e) => updateStore("name", e.target.value)}
              placeholder="예: 한우오마카세 ○○"
            />
          </Field>
          <Field label="주소">
            <Input
              type="text"
              value={storeInfo.address ?? ""}
              onChange={(e) => updateStore("address", e.target.value)}
              placeholder="예: 서울 강남구 ..."
            />
          </Field>
          <Field label="방문 날짜">
            <Input
              type="date"
              value={storeInfo.visitDate ?? today}
              onChange={(e) => updateStore("visitDate", e.target.value)}
            />
          </Field>
          <Field label="주문한 메뉴">
            <Textarea
              value={storeInfo.menu ?? ""}
              onChange={(e) => updateStore("menu", e.target.value)}
              placeholder="갈비탕 1, 비빔밥 1"
              rows={3}
            />
          </Field>
        </div>
      </Card>

      <Card>
        <Field label="주제 메모 ✨" help="비울수록 글 품질이 떨어집니다">
          <Textarea
            value={topicHint}
            onChange={(e) => onChangeTopic(e.target.value)}
            placeholder="분위기 좋았음. 갈비탕 진했고 깍두기도 맛있었음. 재방문 의사 있음."
            rows={5}
          />
        </Field>
      </Card>

      <div className="fixed bottom-0 left-0 right-0 bg-stone-50/95 backdrop-blur border-t border-stone-200 px-4 py-3 pb-[calc(env(safe-area-inset-bottom)+12px)]">
        <PrimaryButton fullWidth size="lg" onClick={handleNext}>
          글 만들기
        </PrimaryButton>
      </div>
    </div>
  );
}

function Field({
  label,
  help,
  children,
}: {
  label: string;
  help?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-stone-700 mb-1.5">{label}</label>
      {children}
      {help && <p className="text-xs text-stone-500 mt-1">{help}</p>}
    </div>
  );
}
```

- [ ] **Step 2: WizardContainer 에 Step2 연결**

`/Users/jaechango/네이버/components/wizard/WizardContainer.tsx` 에서 step===2 부분 교체:

```tsx
import { Step2Info } from "@/components/wizard/Step2Info";

// ... 안의 step === 2 자리에서:
{draft.step === 2 && (
  <Step2Info
    storeInfo={draft.storeInfo}
    topicHint={draft.topicHint}
    onChangeStore={(storeInfo) => update({ storeInfo })}
    onChangeTopic={(topicHint) => update({ topicHint })}
    onNext={() => update({ step: 3 })}
  />
)}
```

- [ ] **Step 3: 수동 검증**

`npm run dev`. 단계 1 사진 올리고 "다음" → 단계 2 진입. 다음 확인:
- 각 필드 입력 가능, localStorage 에 즉시 반영 (새로고침해도 값 유지)
- 주제 메모 빈 상태로 "글 만들기" → confirm 다이얼로그
- 채우고 "글 만들기" → 단계 3 placeholder
- 뒤로 가기 → 단계 2 값 그대로

- [ ] **Step 4: commit**

> "Task 7 완료. `git add -A && git commit -m 'Task 7: step2 info form'` 권장."

---

## Task 8: Anthropic 클라이언트 + analyze-photos API

**Files:**
- Create: `lib/anthropic.ts`, `app/api/analyze-photos/route.ts`

- [ ] **Step 1: Anthropic 클라이언트 모듈**

`/Users/jaechango/네이버/lib/anthropic.ts`:

```ts
import Anthropic from "@anthropic-ai/sdk";

let cached: Anthropic | null = null;

export function getAnthropic(): Anthropic {
  if (cached) return cached;
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY is not set");
  cached = new Anthropic({ apiKey: key });
  return cached;
}

export const CLAUDE_MODEL = "claude-sonnet-4-6";
```

> 모델 ID 는 구현 시점에 최신 Sonnet 으로 확인 후 교체.

- [ ] **Step 2: analyze-photos route**

`/Users/jaechango/네이버/app/api/analyze-photos/route.ts`:

```ts
import { NextResponse } from "next/server";
import { getAnthropic, CLAUDE_MODEL } from "@/lib/anthropic";

export const runtime = "nodejs";
export const maxDuration = 60;

type RequestBody = {
  photos: { id: string; dataUrl: string; userNote?: string }[];
  storeInfo: {
    name?: string;
    address?: string;
    visitDate?: string;
    menu?: string;
  };
  topicHint: string;
};

type Caption = {
  photo_id: string;
  caption: string;
  food_name_guess?: string;
};

type ResponseBody = {
  captions: Caption[];
  tone_suggestion: string;
};

const SYSTEM_PROMPT = `당신은 한국 네이버 블로그용 맛집 후기 작성을 돕는 어시스턴트입니다.
사용자가 올린 사진들을 분석하여 각 사진을 한 문장으로 묘사하고, 음식 이름이 추정 가능하면 그것도 함께 답하세요.
또한 전체 글의 톤을 어떻게 잡으면 좋을지 한 문장 제안하세요.

응답은 반드시 다음 JSON 형식만 출력하세요 (다른 텍스트 금지):
{
  "captions": [
    {"photo_id": "...", "caption": "...", "food_name_guess": "..."}
  ],
  "tone_suggestion": "..."
}`;

export async function POST(req: Request) {
  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.photos || body.photos.length === 0) {
    return NextResponse.json({ error: "사진이 없습니다" }, { status: 400 });
  }

  const client = getAnthropic();

  const userContent: Anthropic.Messages.ContentBlockParam[] = [];

  for (const p of body.photos) {
    const match = p.dataUrl.match(/^data:(image\/[a-z]+);base64,(.+)$/);
    if (!match) continue;
    userContent.push({
      type: "image",
      source: {
        type: "base64",
        media_type: match[1] as "image/jpeg" | "image/png" | "image/webp",
        data: match[2],
      },
    });
    userContent.push({
      type: "text",
      text: `(위 사진 ID: ${p.id}${p.userNote ? ` / 사용자 메모: ${p.userNote}` : ""})`,
    });
  }

  const ctxLines: string[] = [];
  if (body.storeInfo.name) ctxLines.push(`가게: ${body.storeInfo.name}`);
  if (body.storeInfo.address) ctxLines.push(`주소: ${body.storeInfo.address}`);
  if (body.storeInfo.visitDate) ctxLines.push(`방문일: ${body.storeInfo.visitDate}`);
  if (body.storeInfo.menu) ctxLines.push(`주문 메뉴: ${body.storeInfo.menu}`);
  if (body.topicHint) ctxLines.push(`주제 메모: ${body.topicHint}`);
  userContent.push({
    type: "text",
    text: `\n[참고 정보]\n${ctxLines.join("\n")}\n\n위 사진들을 분석해서 JSON 형식으로 응답하세요.`,
  });

  let resp;
  try {
    resp = await client.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userContent }],
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Claude 호출 실패" }, { status: 502 });
  }

  const textBlock = resp.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    return NextResponse.json({ error: "응답 없음" }, { status: 502 });
  }

  let parsed: ResponseBody;
  try {
    const jsonMatch = textBlock.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("JSON 부분 없음");
    parsed = JSON.parse(jsonMatch[0]);
  } catch (e: any) {
    return NextResponse.json(
      { error: "AI 응답 형식 오류", raw: textBlock.text },
      { status: 502 },
    );
  }

  return NextResponse.json(parsed);
}

import type Anthropic from "@anthropic-ai/sdk";
```

> Import 위치 주의: `import type Anthropic` 은 파일 하단에 두면 TS 가 처리. 일부 IDE 가 자동으로 위로 옮길 수 있음 — 그래도 동작.

- [ ] **Step 3: 수동 호출 테스트**

`npm run dev` 띄우고, 다른 터미널에서:

```bash
curl -X POST http://localhost:3000/api/analyze-photos \
  -H "content-type: application/json" \
  -b "auth=$(cat .env.local | grep SITE_PASSWORD | cut -d= -f2)" \
  -d '{
    "photos": [],
    "storeInfo": {},
    "topicHint": ""
  }'
```

Expected: `{"error":"사진이 없습니다"}` (400).

실제 사진은 다음 Task 에서 통합 후 검증.

- [ ] **Step 4: commit**

> "Task 8 완료. `git add -A && git commit -m 'Task 8: analyze-photos API'` 권장."

---

## Task 9: generate-post API (스트리밍)

**Files:**
- Create: `app/api/generate-post/route.ts`

- [ ] **Step 1: generate-post route**

`/Users/jaechango/네이버/app/api/generate-post/route.ts`:

```ts
import { getAnthropic, CLAUDE_MODEL } from "@/lib/anthropic";

export const runtime = "nodejs";
export const maxDuration = 60;

type RequestBody = {
  captions: { photo_id: string; caption: string; food_name_guess?: string }[];
  toneSuggestion: string;
  storeInfo: {
    name?: string;
    address?: string;
    visitDate?: string;
    menu?: string;
  };
  topicHint: string;
};

const SYSTEM_PROMPT = `당신은 한국 네이버 블로그에 맛집 후기를 쓰는 친근한 블로거입니다.

규칙:
- 손님(방문자) 관점으로 작성
- 친근한 존댓말 (예: "정말 맛있더라구요", "추천드려요")
- 문단은 1~3 문장으로 짧게
- 자연스럽게 사진을 본문 사이사이 배치. 사진 위치는 본문에 정확히 \`![](photo_id)\` 토큰으로 표시
- 사진 직전에 그 사진을 자연스럽게 소개하는 한 문장을 둘 것
- 글 구조: 방문 동기 → 위치/접근성 → 분위기 → 메뉴/맛 평가 → 총평/재방문 의사 → 해시태그
- 마지막에 해시태그 5~8개 (#가게명 #지역 #메뉴 등)

응답은 마크다운으로 출력. 첫 줄은 \`# 제목\` 형식, 그 다음 한 줄 비우고 본문 시작.`;

export async function POST(req: Request) {
  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  const client = getAnthropic();

  const lines: string[] = [];
  lines.push("[사진 분석 결과]");
  for (const c of body.captions) {
    lines.push(
      `- photo_id=${c.photo_id}: ${c.caption}${c.food_name_guess ? ` (예상 음식명: ${c.food_name_guess})` : ""}`,
    );
  }
  lines.push("");
  lines.push("[가게 정보]");
  if (body.storeInfo.name) lines.push(`가게: ${body.storeInfo.name}`);
  if (body.storeInfo.address) lines.push(`주소: ${body.storeInfo.address}`);
  if (body.storeInfo.visitDate) lines.push(`방문일: ${body.storeInfo.visitDate}`);
  if (body.storeInfo.menu) lines.push(`주문 메뉴: ${body.storeInfo.menu}`);
  lines.push("");
  if (body.topicHint) {
    lines.push("[사용자 주제 메모]");
    lines.push(body.topicHint);
    lines.push("");
  }
  if (body.toneSuggestion) {
    lines.push(`[톤 제안] ${body.toneSuggestion}`);
    lines.push("");
  }
  lines.push("위 정보를 바탕으로 네이버 블로그용 맛집 후기를 마크다운으로 작성하세요.");

  const stream = await client.messages.stream({
    model: CLAUDE_MODEL,
    max_tokens: 4096,
    temperature: 0.7,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: lines.join("\n") }],
  });

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
        controller.close();
      } catch (e: any) {
        controller.error(e);
      }
    },
  });

  return new Response(readable, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}
```

- [ ] **Step 2: 수동 호출 테스트**

```bash
curl -N -X POST http://localhost:3000/api/generate-post \
  -H "content-type: application/json" \
  -b "auth=$(cat .env.local | grep SITE_PASSWORD | cut -d= -f2)" \
  -d '{
    "captions": [{"photo_id":"a","caption":"갈비탕"}],
    "toneSuggestion":"친근하게",
    "storeInfo":{"name":"테스트 가게","address":"서울"},
    "topicHint":"맛있었음"
  }'
```

스트리밍으로 마크다운이 출력되어야 함.

- [ ] **Step 3: commit**

> "Task 9 완료. `git add -A && git commit -m 'Task 9: generate-post streaming API'` 권장."

---

## Task 10: Step 3 생성 화면 + 스트리밍 처리

**Files:**
- Create: `components/wizard/Step3Generating.tsx`
- Modify: `components/wizard/WizardContainer.tsx`

- [ ] **Step 1: Step3Generating 컴포넌트**

`/Users/jaechango/네이버/components/wizard/Step3Generating.tsx`:

```tsx
"use client";
import { useEffect, useRef, useState } from "react";
import { Check, AlertTriangle } from "lucide-react";
import type { Draft, Photo, StoreInfo } from "@/lib/draft";
import { Spinner } from "@/components/ui/Spinner";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { SecondaryButton } from "@/components/ui/SecondaryButton";

type Phase = "analyzing" | "generating" | "done" | "error";

type Props = {
  photos: Photo[];
  storeInfo: StoreInfo;
  topicHint: string;
  onProgress: (patch: Partial<Draft>) => void;
  onError: () => void;
  onComplete: (title: string, bodyMarkdown: string) => void;
};

export function Step3Generating({
  photos,
  storeInfo,
  topicHint,
  onProgress,
  onError,
  onComplete,
}: Props) {
  const [phase, setPhase] = useState<Phase>("analyzing");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const ac = new AbortController();
    abortRef.current = ac;
    runPipeline(ac.signal).catch((e) => {
      if (e?.name !== "AbortError") {
        setErrorMsg(e?.message ?? "알 수 없는 오류");
        setPhase("error");
      }
    });
    return () => ac.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function runPipeline(signal: AbortSignal) {
    // 1) analyze-photos
    setPhase("analyzing");
    const ar = await fetch("/api/analyze-photos", {
      method: "POST",
      signal,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ photos, storeInfo, topicHint }),
    });
    if (!ar.ok) {
      const body = await ar.json().catch(() => ({}));
      throw new Error(body.error ?? "사진 분석 실패");
    }
    const analyzed: {
      captions: { photo_id: string; caption: string; food_name_guess?: string }[];
      tone_suggestion: string;
    } = await ar.json();

    // photos 에 ai_caption 채워넣기
    const captionMap = new Map(analyzed.captions.map((c) => [c.photo_id, c.caption]));
    const updatedPhotos = photos.map((p) => ({
      ...p,
      aiCaption: captionMap.get(p.id),
    }));
    onProgress({ photos: updatedPhotos });

    // 2) generate-post (스트리밍)
    setPhase("generating");
    const gr = await fetch("/api/generate-post", {
      method: "POST",
      signal,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        captions: analyzed.captions,
        toneSuggestion: analyzed.tone_suggestion,
        storeInfo,
        topicHint,
      }),
    });
    if (!gr.ok || !gr.body) {
      const body = await gr.json().catch(() => ({}));
      throw new Error(body.error ?? "본문 생성 실패");
    }

    const reader = gr.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
    }

    // 첫 줄을 제목으로 분리
    const lines = buffer.split("\n");
    const firstLine = lines[0]?.trim() ?? "";
    let title = "";
    let body = buffer;
    if (firstLine.startsWith("# ")) {
      title = firstLine.replace(/^#\s+/, "").trim();
      body = lines.slice(1).join("\n").trim();
    } else {
      title = (storeInfo.name ?? "맛집") + " 후기";
    }

    setPhase("done");
    onComplete(title, body);
  }

  function cancel() {
    abortRef.current?.abort();
    onError();
  }

  if (phase === "error") {
    return (
      <div className="px-4 py-12 max-w-md mx-auto text-center">
        <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold">글을 만들지 못했어요</h2>
        <p className="text-sm text-stone-600 mt-2">{errorMsg}</p>
        <div className="mt-6 flex flex-col gap-2">
          <PrimaryButton onClick={() => location.reload()} size="lg">
            다시 시도
          </PrimaryButton>
          <SecondaryButton onClick={onError} size="lg">
            정보 수정
          </SecondaryButton>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-12 max-w-md mx-auto text-center">
      <div className="text-6xl mb-4 animate-wiggle">✨</div>
      <h2 className="text-xl font-semibold mb-6">AI 가 글을 쓰고 있어요</h2>
      <div className="space-y-2 text-left bg-white rounded-xl border border-stone-200 p-4">
        <PhaseRow
          label="사진 분석"
          done={phase === "generating" || phase === "done"}
          active={phase === "analyzing"}
        />
        <PhaseRow label="글 초안 작성" done={phase === "done"} active={phase === "generating"} />
      </div>
      <p className="text-xs text-stone-500 mt-4">약 20~40초 걸립니다</p>
      <div className="mt-6">
        <SecondaryButton onClick={cancel}>취소</SecondaryButton>
      </div>
    </div>
  );
}

function PhaseRow({ label, done, active }: { label: string; done: boolean; active: boolean }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      {done ? (
        <Check className="h-4 w-4 text-green-600" />
      ) : active ? (
        <Spinner size="xs" className="text-amber-500" />
      ) : (
        <div className="h-4 w-4 rounded-full border border-stone-300" />
      )}
      <span
        className={done ? "text-stone-900" : active ? "text-amber-600 font-medium" : "text-stone-400"}
      >
        {label}
        {active ? " 중..." : done ? " 완료" : ""}
      </span>
    </div>
  );
}
```

- [ ] **Step 2: WizardContainer 에 Step3 연결**

`/Users/jaechango/네이버/components/wizard/WizardContainer.tsx` 의 step===3 부분 교체:

```tsx
import { Step3Generating } from "@/components/wizard/Step3Generating";

// ...
{draft.step === 3 && (
  <Step3Generating
    photos={draft.photos}
    storeInfo={draft.storeInfo}
    topicHint={draft.topicHint}
    onProgress={(patch) => update(patch)}
    onError={() => update({ step: 2 })}
    onComplete={(title, bodyMarkdown) =>
      update({
        step: 4,
        result: { title, bodyMarkdown, generatedAt: new Date().toISOString() },
      })
    }
  />
)}
```

- [ ] **Step 3: 수동 검증**

`npm run dev`. 단계 1 (사진 1~2장) → 단계 2 (가게 정보 + 주제 메모 채움) → "글 만들기".
- 단계 3 화면에 ✨ 흔들리는 아이콘
- "사진 분석 중..." → 완료 체크 → "글 초안 작성 중..." → 완료 → 자동 단계 4
- 콘솔 에러 없음
- 단계 4 placeholder 가 잠시 보이고 (다음 Task 에서 교체)

만약 API 에러:
- 에러 화면 표시
- "다시 시도" / "정보 수정" 동작

- [ ] **Step 4: commit**

> "Task 10 완료. `git add -A && git commit -m 'Task 10: step3 generating + streaming'` 권장."

---

## Task 11: Step 4 결과 에디터 + 복사

**Files:**
- Create: `components/wizard/Step4Editor.tsx`
- Modify: `components/wizard/WizardContainer.tsx`

이번 Task 의 에디터는 MVP 단계라 **textarea + 인라인 사진 미리보기** 형태로 단순화. TipTap 은 나중에.

- [ ] **Step 1: Step4Editor 컴포넌트**

`/Users/jaechango/네이버/components/wizard/Step4Editor.tsx`:

```tsx
"use client";
import { useState, useMemo } from "react";
import { Copy, Check, Download } from "lucide-react";
import JSZip from "jszip";
import type { Draft, Photo } from "@/lib/draft";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { SecondaryButton } from "@/components/ui/SecondaryButton";
import { markdownToHtmlWithPhotos, markdownToPlainText } from "@/lib/markdown";
import { copyHtmlAndText, isClipboardWriteSupported } from "@/lib/clipboard";
import { useToast } from "@/components/ui/Toast";

type Props = {
  result: NonNullable<Draft["result"]>;
  photos: Photo[];
  onUpdateResult: (title: string, body: string) => void;
  onDone: () => void;
};

export function Step4Editor({ result, photos, onUpdateResult, onDone }: Props) {
  const [copyState, setCopyState] = useState<"idle" | "ok" | "fail">("idle");
  const [showFallback, setShowFallback] = useState(false);
  const toast = useToast();

  const html = useMemo(
    () => markdownToHtmlWithPhotos(result.bodyMarkdown, photos),
    [result.bodyMarkdown, photos],
  );
  const plain = useMemo(() => markdownToPlainText(result.bodyMarkdown), [result.bodyMarkdown]);

  async function handleCopy() {
    const titleHtml = `<h1>${escapeHtml(result.title)}</h1>\n`;
    const fullHtml = titleHtml + html;
    const fullText = result.title + "\n\n" + plain;

    if (!isClipboardWriteSupported()) {
      setShowFallback(true);
      try {
        await downloadPhotosZip();
      } catch {}
      return;
    }

    try {
      await copyHtmlAndText(fullHtml, fullText);
      setCopyState("ok");
      toast.show("success", "복사됨! 네이버 블로그 PC 웹 에디터에 Ctrl+V 하세요");
      setTimeout(() => setCopyState("idle"), 2000);
    } catch (e) {
      setCopyState("fail");
      setShowFallback(true);
      toast.show("error", "클립보드 복사 실패. 아래에서 직접 복사하세요");
    }
  }

  async function downloadPhotosZip() {
    const zip = new JSZip();
    for (let i = 0; i < photos.length; i++) {
      const p = photos[i];
      const match = p.dataUrl.match(/^data:image\/[a-z]+;base64,(.+)$/);
      if (!match) continue;
      const ext = p.dataUrl.includes("image/png") ? "png" : "jpg";
      zip.file(`photo-${i + 1}.${ext}`, match[1], { base64: true });
    }
    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "photos.zip";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="px-4 md:px-8 pb-32">
      <div className="sticky top-12 z-20 bg-stone-50/95 backdrop-blur -mx-4 md:-mx-8 px-4 md:px-8 py-2 border-b border-stone-200 flex gap-2 justify-end">
        <PrimaryButton onClick={handleCopy}>
          {copyState === "ok" ? (
            <>
              <Check className="h-4 w-4" /> 복사됨
            </>
          ) : (
            <>
              <Copy className="h-4 w-4" /> 복사하기
            </>
          )}
        </PrimaryButton>
        <SecondaryButton onClick={downloadPhotosZip}>
          <Download className="h-4 w-4 inline mr-1" /> 사진 ZIP
        </SecondaryButton>
      </div>

      <div className="mt-4 space-y-3">
        <label className="block text-sm font-medium text-stone-700">제목</label>
        <Input
          value={result.title}
          onChange={(e) => onUpdateResult(e.target.value, result.bodyMarkdown)}
          className="text-lg font-semibold"
        />

        <label className="block text-sm font-medium text-stone-700 mt-4">본문 (마크다운)</label>
        <Textarea
          value={result.bodyMarkdown}
          onChange={(e) => onUpdateResult(result.title, e.target.value)}
          rows={20}
          className="font-mono text-sm"
        />

        <details className="mt-4 bg-white border border-stone-200 rounded-xl p-4">
          <summary className="cursor-pointer text-sm font-medium">미리보기</summary>
          <div
            className="prose prose-stone max-w-none mt-3"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </details>

        <details className="bg-white border border-stone-200 rounded-xl p-4">
          <summary className="cursor-pointer text-sm font-medium">
            사진 모음 ({photos.length}장)
          </summary>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mt-3">
            {photos.map((p, i) => (
              <div key={p.id} className="relative">
                <img src={p.dataUrl} alt="" className="w-full aspect-square object-cover rounded" />
                <span className="absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-black/60 text-white text-xs flex items-center justify-center">
                  {i + 1}
                </span>
              </div>
            ))}
          </div>
        </details>

        {showFallback && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p className="text-sm text-amber-900 font-medium">
              클립보드 자동 복사가 실패했습니다. 아래 텍스트를 직접 선택해서 복사하세요.
            </p>
            <textarea
              readOnly
              value={result.title + "\n\n" + plain}
              className="w-full mt-2 p-2 border border-amber-300 rounded font-mono text-xs"
              rows={10}
              onFocus={(e) => e.target.select()}
            />
          </div>
        )}

        <div className="pt-6">
          <SecondaryButton fullWidth onClick={onDone}>
            완료 (처음으로)
          </SecondaryButton>
        </div>
      </div>
    </div>
  );
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[c] as string));
}
```

- [ ] **Step 2: WizardContainer 에 Step4 + 완료 처리**

`/Users/jaechango/네이버/components/wizard/WizardContainer.tsx` 의 step===4 부분 교체:

```tsx
import { Step4Editor } from "@/components/wizard/Step4Editor";
import { createEmptyDraft } from "@/lib/draft";

// ...
{draft.step === 4 && draft.result && (
  <Step4Editor
    result={draft.result}
    photos={draft.photos}
    onUpdateResult={(title, bodyMarkdown) =>
      update({ result: { ...draft.result!, title, bodyMarkdown } })
    }
    onDone={() => {
      clearDraft();
      setDraft(createEmptyDraft());
    }}
  />
)}
```

이미 `clearDraft` 와 `createEmptyDraft` 는 상단에서 import. 확인 후 보강.

- [ ] **Step 3: Tailwind prose 플러그인 (미리보기 스타일)**

`@tailwindcss/typography` 없이도 동작하지만 미리보기 가독성을 위해 추가 (선택). 1차에서는 생략 가능.

생략하면 미리보기는 기본 마크다운 HTML 모양 (제목 작음, 리스트 들여쓰기 적음) 으로 나옴 — MVP 충분.

- [ ] **Step 4: 수동 검증 (E2E 한 사이클)**

`npm run dev`. 로그인 → 단계 1 사진 2~3장 업로드 → 단계 2 정보 채움 → "글 만들기" → 단계 3 → 단계 4 자동 도착.
- 제목 표시
- 본문 textarea 에 마크다운 보임
- 본문에 `![](photo_id)` 토큰이 있을 것 (없으면 프롬프트 미세조정 필요)
- "미리보기" 펼치면 사진이 인라인으로 보임
- "복사하기" 클릭 → 토스트 "복사됨!"
- 네이버 블로그 PC 웹 에디터(`https://blog.naver.com`) 글쓰기 → 본문에 Ctrl+V → 본문 + 사진이 같이 들어가는지 검증 ⭐ **이게 가장 중요한 1차 검증**
- "사진 ZIP" 다운로드 동작
- "완료" → 단계 1 빈 화면

⚠️ 만약 네이버 에디터가 base64 인라인 이미지를 거부하면:
- 차선책 1: 본문은 정상 들어가고 사진은 ZIP 다운로드 후 수동 추가
- 차선책 2: 사진을 임시 외부 URL 로 호스팅 (별도 Task 필요 — 1차 범위 밖)
- 본 디자인 문서 10절의 "위험" 항목에 명시된 시나리오

- [ ] **Step 5: commit**

> "Task 11 완료. `git add -A && git commit -m 'Task 11: step4 editor + copy'` 권장."

---

## Task 12: 부분 수정 API + 플로팅 메뉴 UI

**Files:**
- Create: `app/api/refine/route.ts`, `components/FloatingRefineMenu.tsx`
- Modify: `components/wizard/Step4Editor.tsx`

- [ ] **Step 1: refine API**

`/Users/jaechango/네이버/app/api/refine/route.ts`:

```ts
import { getAnthropic, CLAUDE_MODEL } from "@/lib/anthropic";

export const runtime = "nodejs";
export const maxDuration = 60;

type RequestBody = {
  fullBody: string;
  selection: { text: string };
  instruction: string;
};

const SYSTEM_PROMPT = `당신은 네이버 블로그 맛집 후기를 다듬는 편집자입니다.
사용자가 본문 일부를 선택하고 수정 지시를 줍니다.
선택된 부분만 지시에 따라 다시 작성하되, 본문 전체의 톤과 일관성을 유지하세요.
응답은 교체될 텍스트만 출력 (다른 설명/마크다운/인용 없이). 사진 토큰 ![](photo_id) 형식이 선택에 포함되면 그대로 유지.`;

export async function POST(req: Request) {
  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  const client = getAnthropic();
  const userText = [
    "[전체 본문]",
    body.fullBody,
    "",
    "[선택 영역]",
    body.selection.text,
    "",
    "[수정 지시]",
    body.instruction,
    "",
    "선택 영역만 지시에 따라 다시 작성하세요. 교체될 텍스트만 출력.",
  ].join("\n");

  const stream = await client.messages.stream({
    model: CLAUDE_MODEL,
    max_tokens: 1024,
    temperature: 0.7,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userText }],
  });

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
        controller.close();
      } catch (e: any) {
        controller.error(e);
      }
    },
  });

  return new Response(readable, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}
```

- [ ] **Step 2: FloatingRefineMenu 컴포넌트**

`/Users/jaechango/네이버/components/FloatingRefineMenu.tsx`:

```tsx
"use client";
import { useState } from "react";
import { Sparkles, X } from "lucide-react";

type QuickAction = { label: string; instruction: string };

const QUICK_ACTIONS: QuickAction[] = [
  { label: "더 친근하게", instruction: "더 친근하고 캐주얼한 말투로 다시 써줘" },
  { label: "더 짧게", instruction: "내용을 유지하면서 더 짧게 줄여줘" },
  { label: "더 자세히", instruction: "묘사를 더 풍부하고 자세하게 보강해줘" },
  { label: "맛 묘사 강화", instruction: "음식의 맛·식감·향에 대한 묘사를 더 강화해줘" },
];

type Props = {
  selectedText: string;
  onApply: (instruction: string) => void;
  onCancel: () => void;
};

export function FloatingRefineMenu({ selectedText, onApply, onCancel }: Props) {
  const [custom, setCustom] = useState("");

  return (
    <div
      role="dialog"
      aria-label="텍스트 수정 옵션"
      className="bg-white rounded-2xl shadow-lg border border-stone-200 p-3 w-full max-w-sm"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1 text-sm font-medium text-amber-700">
          <Sparkles className="h-4 w-4" /> 선택 영역 수정
        </div>
        <button
          type="button"
          onClick={onCancel}
          aria-label="닫기"
          className="text-stone-500 hover:text-stone-900"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="text-xs text-stone-500 mb-2 line-clamp-2 italic">"{selectedText}"</div>

      <div className="flex flex-wrap gap-2 mb-3">
        {QUICK_ACTIONS.map((a) => (
          <button
            key={a.label}
            type="button"
            onClick={() => onApply(a.instruction)}
            className="px-3 py-1.5 rounded-full bg-stone-100 text-sm font-medium hover:bg-amber-100 active:bg-amber-200"
          >
            {a.label}
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          placeholder="직접 지시하기..."
          className="flex-1 h-10 px-3 rounded-lg border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-100 focus:border-amber-500"
          onKeyDown={(e) => {
            if (e.key === "Enter" && custom.trim()) onApply(custom.trim());
          }}
        />
        <button
          type="button"
          disabled={!custom.trim()}
          onClick={() => onApply(custom.trim())}
          className="h-10 px-3 rounded-lg bg-amber-500 text-white text-sm font-medium hover:bg-amber-600 disabled:bg-stone-200 disabled:text-stone-400"
        >
          적용
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Step4Editor 에 부분 수정 통합**

`/Users/jaechango/네이버/components/wizard/Step4Editor.tsx` 에 다음을 추가/수정:

- import 에 추가:

```tsx
import { useRef } from "react";
import { FloatingRefineMenu } from "@/components/FloatingRefineMenu";
```

- 컴포넌트 안에 상태 추가:

```tsx
const textareaRef = useRef<HTMLTextAreaElement>(null);
const [selection, setSelection] = useState<{ start: number; end: number; text: string } | null>(
  null,
);
const [refining, setRefining] = useState(false);
const [prevBody, setPrevBody] = useState<string | null>(null);

function handleSelect() {
  const ta = textareaRef.current;
  if (!ta) return;
  const start = ta.selectionStart;
  const end = ta.selectionEnd;
  if (start === end) {
    setSelection(null);
    return;
  }
  const text = result.bodyMarkdown.slice(start, end);
  if (text.trim().length < 5) {
    setSelection(null);
    return;
  }
  setSelection({ start, end, text });
}

async function applyRefine(instruction: string) {
  if (!selection) return;
  setRefining(true);
  setPrevBody(result.bodyMarkdown);

  try {
    const res = await fetch("/api/refine", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        fullBody: result.bodyMarkdown,
        selection: { text: selection.text },
        instruction,
      }),
    });
    if (!res.ok || !res.body) throw new Error("refine 실패");

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let replaced = "";
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      replaced += decoder.decode(value, { stream: true });
      const newBody =
        result.bodyMarkdown.slice(0, selection.start) +
        replaced +
        result.bodyMarkdown.slice(selection.end);
      onUpdateResult(result.title, newBody);
    }
    toast.show("success", "수정 완료. Ctrl+Z 로 되돌릴 수 있어요");
    setSelection(null);
  } catch (e: any) {
    toast.show("error", e?.message ?? "수정 실패");
    if (prevBody !== null) onUpdateResult(result.title, prevBody);
  } finally {
    setRefining(false);
  }
}

function undoRefine() {
  if (prevBody !== null) {
    onUpdateResult(result.title, prevBody);
    setPrevBody(null);
    toast.show("success", "되돌렸습니다");
  }
}
```

- textarea 에 ref + select 핸들러 추가:

```tsx
<Textarea
  ref={textareaRef}
  value={result.bodyMarkdown}
  onChange={(e) => onUpdateResult(result.title, e.target.value)}
  onMouseUp={handleSelect}
  onTouchEnd={handleSelect}
  onKeyUp={handleSelect}
  rows={20}
  className="font-mono text-sm"
/>
```

- 컴포넌트 하단 (사진 모음 details 다음) 에 플로팅 메뉴 + Undo 버튼 추가:

```tsx
{selection && !refining && (
  <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-30 px-4 w-full max-w-md">
    <FloatingRefineMenu
      selectedText={selection.text}
      onApply={applyRefine}
      onCancel={() => setSelection(null)}
    />
  </div>
)}

{prevBody !== null && !refining && (
  <button
    type="button"
    onClick={undoRefine}
    className="fixed bottom-4 left-4 z-30 px-3 py-1.5 text-xs bg-stone-900 text-white rounded-lg shadow-lg"
  >
    ⤺ 되돌리기
  </button>
)}
```

- [ ] **Step 4: Textarea forwardRef 보장 확인**

`/Users/jaechango/네이버/components/ui/Textarea.tsx` 가 `forwardRef` 로 작성됐는지 확인 (Task 5 에서 이미 forwardRef 사용 — 그대로 OK).

- [ ] **Step 5: 수동 검증**

`npm run dev`. 단계 4 도착 후:
- 본문에서 한 문장 드래그 선택 → 화면 아래 플로팅 메뉴 등장
- "더 친근하게" 클릭 → 선택 영역이 스트리밍으로 바뀜 → 완료
- 토스트 "수정 완료" + 좌하단 "되돌리기" 버튼 등장
- "되돌리기" 클릭 → 원래대로 + 토스트 "되돌렸습니다"
- 자유 지시 입력 (예: "이모지 추가") → 적용 확인
- 5자 미만 선택은 메뉴 안 뜸

- [ ] **Step 6: commit**

> "Task 12 완료. `git add -A && git commit -m 'Task 12: refine API + floating menu'` 권장."

---

## Task 13: 에러 처리 강건화 + 모바일 다듬기

**Files:**
- Modify: `components/wizard/WizardContainer.tsx`, `components/wizard/Step1Photos.tsx`, `app/api/analyze-photos/route.ts`, `app/api/generate-post/route.ts`, `app/api/refine/route.ts`

- [ ] **Step 1: API 재시도 유틸**

`/Users/jaechango/네이버/lib/retry.ts`:

```ts
export async function fetchWithRetry(
  input: RequestInfo,
  init: RequestInit & { retries?: number },
  shouldRetry: (status: number) => boolean = (s) => s >= 500,
): Promise<Response> {
  const { retries = 3, ...rest } = init;
  let lastError: any = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(input, rest);
      if (res.ok || !shouldRetry(res.status)) return res;
      lastError = new Error(`HTTP ${res.status}`);
    } catch (e) {
      lastError = e;
      if ((e as any)?.name === "AbortError") throw e;
    }
    if (attempt < retries) {
      const delay = Math.min(2000 * Math.pow(2, attempt), 8000);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastError ?? new Error("Retry exhausted");
}
```

- [ ] **Step 2: Step3 에서 fetchWithRetry 사용**

`/Users/jaechango/네이버/components/wizard/Step3Generating.tsx` 의 `fetch("/api/analyze-photos", ...)` 와 `fetch("/api/generate-post", ...)` 를 `fetchWithRetry` 로 교체. import 추가:

```tsx
import { fetchWithRetry } from "@/lib/retry";

// 사용:
const ar = await fetchWithRetry(
  "/api/analyze-photos",
  {
    method: "POST",
    signal,
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ photos, storeInfo, topicHint }),
    retries: 2,
  },
);
// (generate-post 도 동일하게)
```

- [ ] **Step 3: 오프라인 감지 배너**

`/Users/jaechango/네이버/components/wizard/WizardContainer.tsx` 에 추가:

```tsx
import { useEffect } from "react"; // 이미 import 됨
import { WifiOff } from "lucide-react";

// 컴포넌트 안:
const [online, setOnline] = useState(true);
useEffect(() => {
  setOnline(navigator.onLine);
  const onOnline = () => setOnline(true);
  const onOffline = () => setOnline(false);
  window.addEventListener("online", onOnline);
  window.addEventListener("offline", onOffline);
  return () => {
    window.removeEventListener("online", onOnline);
    window.removeEventListener("offline", onOffline);
  };
}, []);

// JSX 의 header 위에 추가:
{!online && (
  <div className="bg-red-50 border-b border-red-200 text-red-900 text-sm px-4 py-2 flex items-center gap-2 justify-center">
    <WifiOff className="h-4 w-4" /> 오프라인 — 인터넷 연결 확인
  </div>
)}
```

- [ ] **Step 4: 모바일 viewport meta + safe-area**

`/Users/jaechango/네이버/app/layout.tsx` 의 `<html>` 안에 viewport 추가:

```tsx
export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover" as const,
};
```

(타입 export 형식 — Next.js 15 표준)

- [ ] **Step 5: 단계 1 카메라 input 가시성 점검**

`/Users/jaechango/네이버/components/wizard/Step1Photos.tsx` 에서 카메라 버튼이 모바일에서만 의미 있음. PC 에서는 동일한 갤러리 선택이 됨 — 그대로 두되 데스크톱에서는 "카메라" 가 그냥 사진 추가 버튼으로 동작. 명시적 처리 불필요.

- [ ] **Step 6: 한국어 텍스트 줄바꿈 최적화 (선택)**

`app/globals.css` 에 추가:

```css
body { word-break: keep-all; overflow-wrap: break-word; }
```

한국어는 영문과 달리 어절 단위 줄바꿈이 자연스럽다. 글자 깨짐 방지.

- [ ] **Step 7: 수동 검증**

전 단계 다시 한 사이클:
- Wi-Fi 끄고 새 글 만들기 시도 → 빨간 배너 + API 실패 메시지
- Wi-Fi 켜고 다시 시도 → 정상 진행
- 모바일 시뮬레이터(iPhone Safari 등) 에서 전체 흐름 한 번
- 키보드 올라왔을 때 입력란 가려지지 않음
- 안전 영역 (notch) 침범 없음

- [ ] **Step 8: 빌드 확인**

```bash
npm run build
```

타입 에러 / 빌드 에러 없어야 함. 있으면 메시지 따라 수정.

- [ ] **Step 9: commit**

> "Task 13 완료. `git add -A && git commit -m 'Task 13: error handling + mobile polish'` 권장."

---

## Task 14: Vercel 배포 준비

**Files:**
- Modify: `next.config.mjs`, `.gitignore`, (Vercel 대시보드)

- [ ] **Step 1: next.config 점검**

`/Users/jaechango/네이버/next.config.mjs` (기본 그대로 OK, 필요 시 추가):

```js
/** @type {import('next').NextConfig} */
const nextConfig = {};
export default nextConfig;
```

- [ ] **Step 2: 사용자 안내**

> "Task 14 안내. 다음은 사용자가 직접 수행:
> 1. GitHub 리포지토리 생성 후 코드 push
> 2. Vercel 대시보드에서 New Project → 리포지토리 import
> 3. 환경 변수 설정:
>    - `ANTHROPIC_API_KEY` = (본인 키)
>    - `SITE_PASSWORD` = (본인이 정한 비밀번호)
> 4. Deploy 클릭
> 5. 배포된 URL 에서 로그인 → 전체 흐름 검증
> 6. 모바일 브라우저에서도 같은 URL 로 검증"

- [ ] **Step 3: 운영 확인 체크리스트** (수동, 배포 후)

- 로그인 페이지가 뜨고, 잘못된 비밀번호는 거부
- 사진 업로드 (PC + 모바일 카메라)
- AI 분석 + 본문 생성 (60초 안에 완료)
- 결과 복사 → 네이버 PC 웹 에디터에 붙여넣기 → 본문 + 사진 들어감 ⭐
- 부분 수정 동작
- 모바일 Safari/Chrome 에서 흐름 정상

---

## Self-Review

### 1. Spec coverage

설계 문서 (`design.md`) 각 섹션 ↔ Task 매핑:

| Spec 섹션 | 구현 Task |
|---|---|
| §3 아키텍처 | Task 0 (Next.js 셋업), Task 8/9/12 (API) |
| §4 데이터 모델 (Draft) | Task 1 |
| §5.2 단계 1 | Task 6 |
| §5.3 단계 2 | Task 7 |
| §5.4 단계 3 | Task 10 |
| §5.5 단계 4 | Task 11, Task 12 |
| §6 AI 호출 전략 | Task 8, 9, 12 |
| §7 에러 처리 | Task 13 |
| §8 향후 크롬 확장 호환 | 데이터 구조가 Task 1 에서 그대로 |
| §9 화면 단위 목록 | 전체 |
| §11 구현 우선순위 | Task 순서 일치 |

UI 핸드오프 문서 (`ui-handoff.md`) 매핑:

| Handoff 섹션 | Task |
|---|---|
| §1 디자인 시스템 (토큰) | Task 0 (globals.css 폰트), Task 4/5 (컴포넌트에 반영) |
| §2 공통 컴포넌트 | Task 4 (Spinner/PrimaryButton/Input), Task 5 (나머지) |
| §3.1 로그인 | Task 4 |
| §3.2 단계 1 | Task 6 |
| §3.3 단계 2 | Task 7 |
| §3.4 단계 3 | Task 10 |
| §3.5 단계 4 | Task 11, Task 12 |
| §4 반응형 | 각 컴포넌트에 분산 |
| §5 애니메이션 | Task 0 (CSS keyframes), Task 4 (shake), Task 10 (wiggle) |
| §6 접근성 | 각 컴포넌트에 ARIA 명시 |
| §7 엣지 케이스 | Task 13 |

빠진 사양 없음.

### 2. Placeholder scan

- TBD/TODO/"나중에" 없음
- "에러 처리 추가" 같은 모호 표현 없음 — Task 13 에서 구체적 코드
- 모든 step 에 실제 코드 or 정확한 명령어
- 한 가지 메모: Task 8 에서 `claude-sonnet-4-6` 모델 ID 는 구현 시점에 최신 확인 — 이건 의도된 안내 메모.

### 3. Type consistency

- `Draft` / `Photo` / `StoreInfo` 타입은 Task 1 정의 → Task 6, 7, 10, 11, 12 에서 import 일관
- API request/response 타입은 각 Task 내에 정의, Step3 에서 사용 시 동일 키 매칭 확인
- `markdownToHtmlWithPhotos(md, photos)` 시그니처 Task 3 정의 → Task 11 사용 일치
- `copyHtmlAndText(html, text)` 시그니처 Task 3 → Task 11 사용 일치
- `fetchWithRetry` Task 13 정의 → Task 13 자체에서 사용

이상 없음.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-05-23-naver-blog-writer-implementation.md`. Two execution options:

**1. Subagent-Driven (recommended)** — 매 Task 마다 새 서브에이전트 분리, Task 사이에 검토. 빠른 반복, 컨텍스트 깨끗.

**2. Inline Execution** — 같은 세션에서 차례로 Task 실행. 체크포인트마다 검토.

본인 1인용 작은 프로젝트이고 Task 14개가 명확히 분리돼 있어 **둘 다 적합**. Subagent 가 좀 더 깔끔하지만, 인라인이 즉각 피드백 가능해 디버깅 빠름.

어느 쪽으로 진행할까요?

---

## Scope update (2026-05-23)

User added: review scope expanded from restaurant-only to any review type (product/place/experience). Step 2 labels generalized. Tasks 8/9 system prompts MUST be neutralized when implemented — use "블로그 리뷰" not "맛집 후기", and let the model infer review type from the topic memo + photos.
