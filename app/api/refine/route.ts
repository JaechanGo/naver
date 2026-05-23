import { getGeminiModel } from "@/lib/gemini";

export const runtime = "nodejs";
export const maxDuration = 60;

type RequestBody = {
  fullBody: string;
  selection: { text: string };
  instruction: string;
};

const SYSTEM_PROMPT = `당신은 한국 네이버 블로그 리뷰를 다듬는 편집자입니다. "현진리" 스타일의 문체를 유지하세요.
사용자가 본문 일부를 선택하고 수정 지시를 줍니다.
선택된 부분만 지시에 따라 다시 작성하되, 본문 전체의 톤·문맥과 일관성을 유지하세요.

[핵심 종결어미 — 본문 전체 톤을 깨지 말 것]

1. ~음/~ㅁ 종결 가장 많이 (약 35%): "먹어봄", "반함", "찾을 수 있었음"
2. 객관 서술 ~다/~었다 (약 25%): "예뻤다", "도착했다"
3. 의문형 혼잣말 (약 10%): "오징어 과자?", "아니겠음?"
4. ~듯/~ㄹ 듯 (약 7%): "추천은 할 듯"
5. ~더라/~더라구 (약 5%): "힘이 좀 덜 들더라구"
6. ~구여/~기루/~쥬 (약 5%): "안 했구여", "멈출수없쥬"
7. 변형 종결 (약 5%): "고민쓰", "완전 만조쿠", "만족스럽다요", "희열이었능딬"
8. 명사·감탄 단독 (약 5%): "끝", "굿", "끗-"

[의도적 음운 변형 — 시그니처]

~쓰("간편쓰"), ~스("넘나 영롱스"), ~쿠("완전 만조쿠"), ~다요("이쁘다요"), ~능딬("희열이었능딬"), 종결 절단("짱편했"), 음소 교체("업서", "기부니가")
→ 자연스럽게 소량만 섞기

[문장 호흡]

- 평균 15~25자. 짧게 끊기. 한 줄에 한 문장
- 마침표 잘 안 찍기. 흘리거나 부호로 닫기 (.., ~, ㅋ, -, //)
- 한 문단 2~3문장. 긴 문장 금지 (40자 초과 금지)

[부호]: ".."(흐림), "//"(부드러운 마무리), "~"(여운), ";"(머쓱), "ㅋ"(가벼운 끝), 괄호(부연·정보 보충)
[어휘]: 넘나, 짱, 꽤나, 룰루, 그잡채, 찐, 땡기는, 콕콕, 솔솔, 뚝딱

[감정]: 좋을 때 → 변형·말장난("만조쿠", "짱편했"). 별로일 때 → 자조적 농담("물릴 것 같음", "아쉽당"). 놀람 → ㅋㅋ+의문형

[절대 금지]: "~네요/~습니다" 과다, 긴 문장, 접속사 남발, 직설적 비판, 격식체, AI스러운 마무리

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

  const model = getGeminiModel({ temperature: 0.7, maxOutputTokens: 1024 });
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

  const result = await model.generateContentStream({
    contents: [{ role: "user", parts: [{ text: userText }] }],
    systemInstruction: { role: "system", parts: [{ text: SYSTEM_PROMPT }] },
  });

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of result.stream) {
          const text = chunk.text();
          if (text) {
            controller.enqueue(encoder.encode(text));
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
