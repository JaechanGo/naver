import { NextResponse } from "next/server";
import { getGeminiModel } from "@/lib/gemini";

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

const SYSTEM_PROMPT = `당신은 한국 네이버 블로그용 리뷰 작성을 돕는 어시스턴트입니다.
사용자가 올린 사진들을 분석해서 각 사진을 한 문장으로 묘사하고, 사진 속 핵심 대상(음식·제품·장소·물체 등)의 이름이 추정 가능하면 함께 답하세요.
사용자가 어떤 종류의 리뷰를 쓰는지는 사용자가 제공한 [참고 정보]의 주제 메모로부터 추론하세요. 음식점·맛집·제품·장소·전시·경험 등 어떤 주제든 다룰 수 있습니다.
또한 전체 글의 톤을 어떻게 잡으면 좋을지 한 문장으로 제안하세요.

응답은 반드시 다음 JSON 형식만 출력하세요 (다른 텍스트 금지):
{
  "captions": [
    {"photo_id": "...", "caption": "...", "food_name_guess": "..."}
  ],
  "tone_suggestion": "..."
}

food_name_guess 필드명은 호환성을 위해 유지하지만 음식이 아닌 제품·장소도 같은 필드에 추정 이름을 넣으세요. 추정이 어려우면 생략하세요.`;

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

  const model = getGeminiModel({ maxOutputTokens: 2048 });

  const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];

  for (const p of body.photos) {
    const match = p.dataUrl.match(/^data:(image\/[a-z]+);base64,(.+)$/);
    if (!match) continue;
    parts.push({
      inlineData: {
        mimeType: match[1],
        data: match[2],
      },
    });
    parts.push({
      text: `(위 사진 ID: ${p.id}${p.userNote ? ` / 사용자 메모: ${p.userNote}` : ""})`,
    });
  }

  const ctxLines: string[] = [];
  if (body.storeInfo.name) ctxLines.push(`이름: ${body.storeInfo.name}`);
  if (body.storeInfo.address) ctxLines.push(`위치: ${body.storeInfo.address}`);
  if (body.storeInfo.visitDate) ctxLines.push(`날짜: ${body.storeInfo.visitDate}`);
  if (body.storeInfo.menu) ctxLines.push(`주문/구매/체험 항목: ${body.storeInfo.menu}`);
  if (body.topicHint) ctxLines.push(`주제 메모: ${body.topicHint}`);
  parts.push({
    text: `\n[참고 정보]\n${ctxLines.join("\n")}\n\n위 사진들을 분석해서 JSON 형식으로 응답하세요.`,
  });

  let resultText: string;
  try {
    console.log("[analyze-photos] calling Gemini...");
    const result = await model.generateContent({
      contents: [{ role: "user", parts }],
      systemInstruction: SYSTEM_PROMPT,
    });
    console.log("[analyze-photos] got response");
    const response = result.response;
    const candidate = response.candidates?.[0];
    const reason = candidate?.finishReason || "NO_CANDIDATE";
    console.log("[analyze-photos] finishReason:", reason);

    if (!candidate?.content?.parts?.length) {
      console.error("[analyze-photos] no parts, reason:", reason);
      return NextResponse.json(
        { error: `AI 응답 없음 (reason: ${reason})` },
        { status: 502 },
      );
    }

    resultText = candidate.content.parts
      .filter((p: any) => p.text)
      .map((p: any) => p.text)
      .join("");
    console.log("[analyze-photos] text length:", resultText.length, "preview:", resultText.slice(0, 100));
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Gemini 호출 실패";
    const stack = e instanceof Error ? e.stack?.slice(0, 300) : "";
    console.error("[analyze-photos] error:", msg, stack);
    return NextResponse.json({ error: msg }, { status: 502 });
  }

  let parsed: ResponseBody;
  try {
    const cleaned = resultText.replace(/```json\s*|```\s*/g, "").trim();
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("JSON 부분 없음");
    parsed = JSON.parse(jsonMatch[0]);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "파싱 실패";
    console.error("[analyze-photos] parse error:", msg, "raw:", resultText.slice(0, 200));
    return NextResponse.json(
      { error: "AI 응답 형식 오류", raw: resultText },
      { status: 502 },
    );
  }

  return NextResponse.json(parsed);
}
