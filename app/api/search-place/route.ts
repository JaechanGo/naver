import { NextResponse } from "next/server";
import { getGeminiModel } from "@/lib/gemini";

export const runtime = "nodejs";
export const maxDuration = 30;

type RequestBody = {
  query?: string;
  lat?: number;
  lng?: number;
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

  const client = getGeminiModel();
  const genAI = client;

  const { GoogleGenerativeAI } = await import("@google/generative-ai");
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    return NextResponse.json({ error: "GEMINI_API_KEY is not set" }, { status: 500 });
  }
  const ai = new GoogleGenerativeAI(key);
  const model = ai.getGenerativeModel({
    model: "gemini-2.5-flash",
    tools: [{ googleSearch: {} } as any],
  });

  let prompt: string;
  if (body.lat && body.lng) {
    prompt = `위도 ${body.lat}, 경도 ${body.lng} 좌표는 한국입니다. 이 좌표에서 가장 가까운 장소/가게/명소를 검색해서 상위 3개를 JSON 배열로 알려줘.
각 항목: {"name": "정확한 이름", "address": "도로명 전체 주소", "phone": "전화번호 (없으면 빈문자열)", "hours": "영업시간 (없으면 빈문자열)", "category": "카테고리"}
${body.query ? `참고로 장소 이름은 "${body.query}"일 수 있음.` : ""}
JSON 배열만 출력. 다른 텍스트 금지.`;
  } else {
    prompt = `다음 장소의 정보를 Google에서 검색해줘. 네이버 지도, 카카오맵, 공식 사이트 등 다양한 소스를 참고.

장소: ${body.query}

JSON 배열로 출력 (최대 3개 후보):
[{"name": "정확한 이름", "address": "도로명 전체 주소", "phone": "전화번호 (없으면 빈문자열)", "hours": "영업시간 (없으면 빈문자열)", "category": "카테고리"}]
JSON만 출력. 다른 텍스트 금지.`;
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
        return NextResponse.json({ results: [JSON.parse(singleMatch[0])] });
      }
      return NextResponse.json({ error: "검색 결과 없음" }, { status: 404 });
    }
    const results: PlaceResult[] = JSON.parse(jsonMatch[0]);
    return NextResponse.json({ results });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "검색 실패";
    console.error("[search-place] error:", msg);
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
