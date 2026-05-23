const DEFAULT_API_URL = "https://naver-sooty-six.vercel.app";

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

let photos = [];
let apiUrl = DEFAULT_API_URL;

async function init() {
  const stored = await chrome.storage.local.get(["apiUrl"]);
  if (stored.apiUrl) apiUrl = stored.apiUrl;
  $("#api-url").value = apiUrl;

  $("#save-url").addEventListener("click", saveUrl);
  $("#photo-input").addEventListener("change", handleFiles);
  $("#to-step2").addEventListener("click", () => goStep(2));
  $("#back-step1").addEventListener("click", () => goStep(1));
  $("#generate-btn").addEventListener("click", generate);
  $("#copy-btn").addEventListener("click", copyResult);
  $("#insert-btn").addEventListener("click", insertToEditor);
  $("#retry-btn").addEventListener("click", () => goStep(2));
  $("#back-step2").addEventListener("click", resetAll);

  const dropZone = $("#photo-drop");
  dropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropZone.classList.add("drag-over");
  });
  dropZone.addEventListener("dragleave", () => {
    dropZone.classList.remove("drag-over");
  });
  dropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropZone.classList.remove("drag-over");
    if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
  });
}

async function saveUrl() {
  apiUrl = $("#api-url").value.replace(/\/+$/, "");
  await chrome.storage.local.set({ apiUrl });
  $("#save-url").textContent = "저장됨";
  setTimeout(() => ($("#save-url").textContent = "저장"), 1000);
}

function handleFiles(e) {
  addFiles(e.target.files);
  e.target.value = "";
}

function addFiles(fileList) {
  for (const file of fileList) {
    if (!file.type.startsWith("image/")) continue;
    const id = `p_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const reader = new FileReader();
    reader.onload = (e) => {
      photos.push({ id, dataUrl: e.target.result });
      renderPhotos();
    };
    reader.readAsDataURL(file);
  }
}

function renderPhotos() {
  const grid = $("#photo-preview");
  grid.innerHTML = photos
    .map(
      (p, i) => `
    <div class="photo-thumb">
      <img src="${p.dataUrl}" alt="사진 ${i + 1}" />
      <button class="remove-btn" data-idx="${i}">×</button>
    </div>
  `
    )
    .join("");

  grid.querySelectorAll(".remove-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      photos.splice(Number(btn.dataset.idx), 1);
      renderPhotos();
    });
  });

  $("#to-step2").disabled = photos.length === 0;
}

function goStep(n) {
  $$(".step").forEach((s) => s.classList.remove("active"));
  $(`#step${n}`).classList.add("active");
}

async function generate() {
  goStep(3);
  $("#loading").classList.remove("hidden");
  $("#result-area").classList.add("hidden");
  $("#error-area").classList.add("hidden");
  $("#loading-text").textContent = "사진 분석 중...";

  const storeInfo = {
    name: $("#store-name").value || undefined,
    address: $("#store-address").value || undefined,
    visitDate: $("#visit-date").value || undefined,
    menu: $("#store-menu").value || undefined,
  };
  const topicHint = $("#topic-hint").value || "";

  try {
    const analyzeRes = await fetch(`${apiUrl}/api/analyze-photos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ photos, storeInfo, topicHint }),
    });

    if (!analyzeRes.ok) {
      const err = await analyzeRes.json().catch(() => ({}));
      throw new Error(err.error || `사진 분석 실패 (${analyzeRes.status})`);
    }

    const analysis = await analyzeRes.json();
    $("#loading-text").textContent = "글 생성 중...";

    const generateRes = await fetch(`${apiUrl}/api/generate-post`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        captions: analysis.captions,
        toneSuggestion: analysis.tone_suggestion,
        storeInfo,
        topicHint,
      }),
    });

    if (!generateRes.ok) {
      throw new Error(`글 생성 실패 (${generateRes.status})`);
    }

    const reader = generateRes.body.getReader();
    const decoder = new TextDecoder();
    let text = "";

    $("#loading").classList.add("hidden");
    $("#result-area").classList.remove("hidden");
    $("#result-text").value = "";
    $("#result-text").removeAttribute("readonly");

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      text += decoder.decode(value, { stream: true });
      $("#result-text").value = text;
      $("#result-text").scrollTop = $("#result-text").scrollHeight;
    }

    $("#result-text").value = text;
  } catch (e) {
    $("#loading").classList.add("hidden");
    $("#error-area").classList.remove("hidden");
    $("#error-msg").textContent = e.message;
  }
}

async function copyResult() {
  const text = $("#result-text").value;
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
    const toast = $("#copy-toast");
    toast.classList.remove("hidden");
    setTimeout(() => toast.classList.add("hidden"), 1500);
  } catch {
    $("#result-text").select();
    document.execCommand("copy");
  }
}

async function insertToEditor() {
  const text = $("#result-text").value;
  if (!text) return;

  try {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    if (!tab || !tab.url?.includes("blog.naver.com")) {
      alert("네이버 블로그 편집기 탭을 열어주세요.");
      return;
    }

    await chrome.tabs.sendMessage(tab.id, {
      type: "INSERT_CONTENT",
      text,
    });
  } catch {
    await copyResult();
    alert("편집기 삽입 실패. 클립보드에 복사했습니다.\n편집기에서 Ctrl+V로 붙여넣기 하세요.");
  }
}

function resetAll() {
  photos = [];
  renderPhotos();
  $("#store-name").value = "";
  $("#store-address").value = "";
  $("#visit-date").value = "";
  $("#store-menu").value = "";
  $("#topic-hint").value = "";
  goStep(1);
}

document.addEventListener("DOMContentLoaded", init);
