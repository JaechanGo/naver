import { getAnthropic, CLAUDE_MODEL } from "@/lib/anthropic";

export const runtime = "nodejs";
export const maxDuration = 60;

type RequestBody = {
  fullBody: string;
  selection: { text: string };
  instruction: string;
};

const SYSTEM_PROMPT = `당신은 한국 네이버 블로그 리뷰를 다듬는 편집자입니다.
사용자가 본문 일부를 선택하고 수정 지시를 줍니다.
선택된 부분만 지시에 따라 다시 작성하되, 본문 전체의 톤·문맥과 일관성을 유지하세요.
사용자는 음식점·맛집·제품·장소·전시·경험 등 어떤 주제든 다룰 수 있으니, 본문 전체의 주제를 파악하고 그에 맞춰 다듬으세요.

[톤·문체 가이드 — 본문 전체 톤을 깨지 말 것]

- 캐주얼한 1인 블로거 톤. 일기 + 친구에게 말하는 느낌. 광고체 금지.
- 종결어미 다양하게:
  · 명사형 "~봄/~함/~음" (예: "먹어봄", "맛있었음")
  · 친근체 "~잖아/~답니다/~구요/~네요"
  · 회상형 "~더라/~더라구요"
  · 자기 다짐 "~자구/~보자"
  · 짧은 마무리 "ㄱ", "ㅋ", "굿"
- 문단은 1~3 문장으로 짧은 호흡. 한 줄짜리 문장도 OK.
- 감각 어휘: "짭조름한", "알싸한", "단짠조화", "포슬한", "찐", "굳이?", "그 잡채일 듯", "땡기는"
- 본문 전체 톤을 깨지 않게 자연스럽게 어울리도록 작성.

응답은 교체될 텍스트만 출력 (다른 설명·인용·마크다운 헤더 없이). 사진 토큰 ![](photo_id) 가 선택에 포함되면 그대로 유지.`;

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

  const stream = client.messages.stream({
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
      } catch (e) {
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
