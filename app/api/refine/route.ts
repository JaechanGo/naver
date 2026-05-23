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

[종결어미 비율 — 본문 전체 톤을 깨지 말 것]

~음/~ㅁ/~됨/~함 (약 35%) 가장 많이: "먹어봄", "반함", "적당한 양이었음", "해치워보려 함"
~다/~었다 객관 서술 (약 15%): "예뻤다", "도착했다", "헤맸다"
~어/~해/~지 구어체 (약 8%): "절실해졌어", "행복이 없어", "돌았어", "좋아."
의문형 혼잣말 (약 10%): "오징어 과자?", "쉐이크였?", "아니겠음?", "시즈닝이려나"
~듯/~ㄹ 듯 (약 7%): "새우깡인 줄 모를 듯", "추천은 할 듯"
~더라/~더라구 (약 5%): "보이더라", "들더라구"
~구여/~구나/~쥬 (약 5%): "안 했구여", "멈출수없쥬", "먹겠구나"
변형 종결 (약 5%): "간편쓰", "만조쿠", "만족스럽다요", "희열이었능딬ㅋㅋ", "짱편했"(절단)
명사·감탄 (약 5%): "끝", "굿", "끗-"
매달림: ~는데/~지만/~라서로 끝나고 다음 줄 이어감

[의도적 음운 변형 — 시그니처, 한 글에 3~5회]
~쓰("간편쓰"), ~스("넘나 영롱스"), ~쿠("완전 만조쿠"), ~다요("이쁘다요"), ~능딬("희열이었능딬")
~옹("알겠옹", "고마웅"), ~딩("보고싶은딩"), ~곤디("먹을 수 있는곤디"), ~쟈나("못먹자나")
~깅("갑자깅?"), ~쏘("알게쏘"), ~바("보내바"=보내봐)
종결 절단("짱편했"), 음소 교체("업서", "기부니가", "갱자나", "몰루", "별룬디", "조그므만")
"그리구", "주문해따가", "빠꾸"(취소), "웅웅"(동의)

[문장 호흡]
평균 15~25자. 짧게 끊기. 한 줄에 한 문장. 40자 초과 금지.
마침표 잘 안 찍기 → "..", "~", "ㅋ", "-", "//"로 닫기
접속사("그러나", "따라서") 절대 쓰지 않기

[부호]
".."(흐림), "//"(부드러운 마무리), "~"(여운), ";"(머쓱), "ㅋ"(가벼운 끝)
"ㅋㅋㅋㅋㅋ"(강한 자조), "ㅠㅠ"(아쉬움), "-"(트레일링), 괄호(부연·정보)
"!" 앞 공백: "(삼성페이도 가능 !)"

[어휘]
넘나, 짱, 꽤나, 나름, 룰루, 싱긋, 무튼, 근데, 그잡채, 찐, 땡기는, 굳이?
콕콕, 솔솔, 탈탈, 뚝딱, 슝슝, 짭조름한, 알싸한, 단짠조화, 겉바속촉

[감정]
좋을 때 → 변형·말장난: "만조쿠", "짱편했", "기부니가 좋습니다", "뜯어 훔쳐 오고 싶을 정도ㅋ"
별로일 때 → 자조적 농담: "물릴 것 같음", "아쉽당", ".."
놀람 → ㅋㅋ+의문형: "현금 있냐고!!"

[독자 거리]
혼잣말·일기 기본. 가끔 청유("뜯어보자"), 반문("아니겠음?", "아니냐고")
도치 어순으로 강조: "없어 친구가!"
직원 묘사 시 존대 혼용: "깔아 주셨다", "추천도 주시구", "받아주셨지"
~네 감탄: "못 담아냈네" (가벼운 깨달음)

[절대 금지]
~네요/~습니다 과다, 긴 문장, 접속사 남발, 직설적 비판, 격식체, AI스러운 마무리

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
    systemInstruction: SYSTEM_PROMPT,
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
