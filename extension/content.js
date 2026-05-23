(() => {
  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg.type !== "INSERT_CONTENT") return;

    const text = msg.text || "";
    const html = textToHtml(text);
    const inserted = tryInsert(html);

    if (!inserted) {
      navigator.clipboard.writeText(text).catch(() => {});
      sendResponse({ ok: false, fallback: "clipboard" });
    } else {
      sendResponse({ ok: true });
    }
  });

  function textToHtml(text) {
    return text
      .split("\n")
      .map((line) => {
        if (!line.trim()) return "<p><br></p>";
        if (line.startsWith("# "))
          return `<h2>${esc(line.slice(2))}</h2>`;
        if (line.startsWith("## "))
          return `<h3>${esc(line.slice(3))}</h3>`;
        if (line.startsWith("### "))
          return `<h4>${esc(line.slice(4))}</h4>`;
        return `<p>${esc(line)}</p>`;
      })
      .join("");
  }

  function esc(s) {
    return s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function tryInsert(html) {
    const selectors = [
      ".se-component-content .se-section-text",
      ".se-content",
      '[contenteditable="true"]',
      "#content-area",
      ".SmartEditor",
    ];

    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el) {
        el.focus();
        document.execCommand("insertHTML", false, html);
        return true;
      }
    }

    const iframes = document.querySelectorAll("iframe");
    for (const iframe of iframes) {
      try {
        const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
        if (!iframeDoc) continue;
        const body = iframeDoc.body;
        if (body && body.isContentEditable) {
          body.focus();
          iframeDoc.execCommand("insertHTML", false, html);
          return true;
        }
        for (const sel of selectors) {
          const el = iframeDoc.querySelector(sel);
          if (el) {
            el.focus();
            iframeDoc.execCommand("insertHTML", false, html);
            return true;
          }
        }
      } catch {
        continue;
      }
    }

    return false;
  }
})();
