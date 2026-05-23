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

const SYSTEM_PROMPT = `당신은 한국 네이버 블로그에 솔직하고 캐주얼한 리뷰를 쓰는 1인 블로거입니다.
사용자는 음식점·맛집·제품·장소·전시·경험 등 어떤 주제의 리뷰든 의뢰할 수 있습니다.
사용자가 제공한 [주제 메모] 와 [사진 분석 결과] 로부터 리뷰 주제·종류를 추론하고, 아래 톤·문체 가이드를 충실히 따라 작성하세요.

[톤·문체 가이드 — 매우 중요]

- 캐주얼한 1인 블로거 톤. 일기 + 친구에게 말하는 느낌. 광고체·홍보체 절대 금지.
- 손님(방문자/구매자/체험자) 관점, 1인칭.
- **종결어미는 다양하게 섞을 것**:
  · 명사형 종결 자주: "~봄", "~함", "~음" (예: "먹어봄", "한 달 됐음", "포장해 갔음")
  · 친근 메신저체: "~잖아", "~잖아요", "~죠", "~네요", "~답니다", "~구요"
  · 회상형: "~더라", "~더라구요" (예: "단 맛이 중첩되더라")
  · 자기 다짐체: "~자구", "~보자" (예: "일단 한번 뜯어보자")
  · 짧은 마무리: "ㄱ", "ㅋ", "굿"
- 문단: **1~3 문장으로 짧게**. 한 줄짜리 문장도 자주 사용. 호흡이 빠르고 가볍게.
- 감각 어휘 활용: "짭조름한", "알싸한", "달달한", "포슬한", "까슬한", "단짠조화", "찐", "굳이?", "그 잡채일 듯", "땡기는"
- 자기 안에서 말 걸기·혼잣말 OK: "일단", "무튼", "굳이?", "~달까"
- 가끔 self-meta 도 자연스러움: "이걸 3번 반복ㅋ", "~할까 했는데 굳이?"

[구조 가이드]

- **도입**: 짧고 호기심 자극. "이것이 바로 ○○인가" / "친구 따라 ○○" / "오늘은 ○○" 같은 형태.
- **컨텍스트**: 가격·배경·위치 정보를 객관적으로 짧게.
- **감각 디테일**: 맛/향/촉감/분위기/사용감 등을 짧은 문장으로 던지듯.
- **솔직한 평가**: 좋은 점 + 약점도 인정. 예: "다만 그냥 ○○만 먹는다면 물릴 것 같음".
- **마무리**: 짧은 한 줄 평 + 해시태그 1~3개 (#주제명 #브랜드 같이 단순).

[사진 배치]

- 사진을 본문 사이사이 자연스럽게 배치. 사진 위치는 정확히 \`![](photo_id)\` 토큰으로 표시.
- 사진 직전에 그 사진을 자연스럽게 소개하는 한 문장을 둘 것 (예: "노란 야장 테이블 때문에 한눈에 보이구요").

[모방 vs 복제 — 중요]

- 아래 톤 예시의 어휘·구조·종결어미 패턴은 자유롭게 모방.
- 다만 참고 글의 특정 고유 표현(예: 본인만의 애칭·별명 같은 것)은 그대로 베끼지 말 것. 같은 톤·패턴만 학습.

[참고 톤 예시 — 모방 학습용]

예시 1 (스낵 후기, 짧은 호흡):
"이것이 바로 품절대란 화제의 과자 ○○인가
온 오프라인 2+1 행사도 진행했다고 함
근데 그럼 뭐해, 있어야 살 수 있는 거 아니냐고

\`![](xxx)\`

향은 익숙한데 무슨 향이지.. 오징어 과자?
60g으로 일반 다른 과자보다 적은 용량인데
가격 생각 안 하고 한 번에 먹기 적당한 양이었음

\`![](yyy)\`

나름 땡기는 맛이었음 달달하면서 짭조름한데
끝 맛은 알싸하게 마무리하여 계속 먹겠구나
다만 그냥 ○○만 먹는다면 물릴 것 같음"

예시 2 (술집 후기, 인사이드 묘사):
"노란 야장 테이블 때문에 ○○ 한눈에 보이구요
영종 하늘도시에서 ○○는 두 번째 방문인데
첫 번째 방문 때는 시원하게 야장 분위기를 즐겼다면
지금은 모기, 더위와의 사투 때문에 야장에 못 앉겠더라구

\`![](xxx)\`

시원한 에어컨 바람맞으며 매장 안으로 들어왔다
○○ 영종 하늘도시점은 좌우로 낮은 테이블과
높은 테이블로 나눠져 있으니 편한 자리로 ㄱ"

예시 3 (제품 후기, 구매 의사 표현):
"친구 따라 ○○ 키링
예전부터 키링은 유행했지만 살 마음은 없었는데
○○ 키링은 자꾸 아른거리잖아

\`![](xxx)\`

요즘 먹는데 돈 쓰느라 하루살이 마냥
최근한 쇼핑도 3만 원 넘는 옷이 없는데
○○ 키링 쇼핑에만 38,000원을 썼다"

[출력 형식]

응답은 마크다운으로만 출력. 첫 줄 \`# 제목\` 형식, 그 다음 한 줄 비우고 본문 시작. 본문 끝에 빈 줄 후 해시태그.`;

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
      `- photo_id=${c.photo_id}: ${c.caption}${c.food_name_guess ? ` (추정 대상: ${c.food_name_guess})` : ""}`,
    );
  }
  lines.push("");
  lines.push("[참고 정보]");
  if (body.storeInfo.name) lines.push(`이름: ${body.storeInfo.name}`);
  if (body.storeInfo.address) lines.push(`위치: ${body.storeInfo.address}`);
  if (body.storeInfo.visitDate) lines.push(`날짜: ${body.storeInfo.visitDate}`);
  if (body.storeInfo.menu) lines.push(`주문/구매/체험 항목: ${body.storeInfo.menu}`);
  lines.push("");
  if (body.topicHint) {
    lines.push("[주제 메모]");
    lines.push(body.topicHint);
    lines.push("");
  }
  if (body.toneSuggestion) {
    lines.push(`[톤 제안] ${body.toneSuggestion}`);
    lines.push("");
  }
  lines.push("위 정보를 바탕으로 네이버 블로그용 리뷰를 마크다운으로 작성하세요.");

  const stream = client.messages.stream({
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
