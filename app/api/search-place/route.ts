import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 30;

type RequestBody = {
  query?: string;
  lat?: number;
  lng?: number;
  photoHint?: string;
};

export type PlaceResult = {
  name: string;
  address: string;
  phone: string;
  hours: string;
  category: string;
};

export async function POST(req: Request) {
  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.query && !body.lat) {
    return NextResponse.json({ error: "query 또는 좌표 필요" }, { status: 400 });
  }

  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    return NextResponse.json({ error: "GEMINI_API_KEY is not set" }, { status: 500 });
  }

  const { GoogleGenerativeAI } = await import("@google/generative-ai");
  const ai = new GoogleGenerativeAI(key);
  const model = ai.getGenerativeModel({
    model: "gemini-2.5-flash",
    tools: [{ googleSearch: {} } as any],
  });

  let prompt: string;
  if (body.lat && body.lng) {
    const hint = body.photoHint
      ? `\n참고로 사진에는 다음과 같은 것이 보입니다: ${body.photoHint}\n이 특징에 맞는 장소를 우선 찾아줘.`
      : "";
    prompt = `위도 ${body.lat}, 경도 ${body.lng} 좌표 근처의 실제 존재하는 장소를 Google 검색으로 찾아줘.${hint}

중요 규칙:
- 반드시 Google 검색 결과에서 확인된 실제 장소만 답해줘
- 검색 결과에 나오지 않는 장소는 절대 만들지 마
- 정보를 모르면 빈 문자열로 남겨
- 최대 3개

JSON 배열만 출력:
[{"name":"","address":"","phone":"","hours":"","category":""}]`;
  } else {
    prompt = `"${body.query}" 장소를 Google에서 검색해줘.

중요 규칙:
- 반드시 Google 검색 결과에서 확인된 실제 장소만 답해줘
- 검색 결과에 나오지 않는 장소는 절대 만들지 마
- 정보를 모르면 빈 문자열로 남겨
- 검색 결과가 없으면 빈 배열 [] 출력
- 최대 3개

JSON 배열만 출력:
[{"name":"","address":"","phone":"","hours":"","category":""}]`;
  }

  try {
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    });
    const text = result.response.text();
    const cleaned = text.replace(/```json\s*|```\s*/g, "").trim();
    const jsonMatch = cleaned.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      const singleMatch = cleaned.match(/\{[\s\S]*\}/);
      if (singleMatch) {
        const parsed = JSON.parse(singleMatch[0]);
        if (parsed.name) return NextResponse.json({ results: [parsed] });
      }
      return NextResponse.json({ results: [] });
    }
    const results: PlaceResult[] = JSON.parse(jsonMatch[0]);
    return NextResponse.json({ results: results.filter((r) => r.name) });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "검색 실패";
    console.error("[search-place] error:", msg);
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
