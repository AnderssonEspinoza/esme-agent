async function sendCapture(payload) {
  const config = await chrome.storage.sync.get(["xioBaseUrl", "xioIngestToken"]);
  if (!config.xioBaseUrl || !config.xioIngestToken) {
    return { ok: false, error: "XIO no configurado en la extension." };
  }

  try {
    const response = await fetch(`${config.xioBaseUrl}/api/ingest/browser`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-xio-ingest-token": config.xioIngestToken,
      },
      body: JSON.stringify(payload),
    });
    const data = await response.json().catch(() => ({}));
    return { ok: response.ok, data };
  } catch (error) {
    return { ok: false, error: String(error) };
  }
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type !== "XIO_CAPTURE") return;
  sendCapture(message.payload).then(sendResponse);
  return true;
});

chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id || !tab.url) return;

  try {
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        const datePattern = /\b(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?|\d{1,2}\s+de\s+[a-záéíóú]+(?:\s+de\s+\d{4})?)\b/i;
        const candidates = Array.from(document.querySelectorAll("li, tr, article, .card, .item, .assignment"))
          .map((node) => (node.textContent || "").replace(/\s+/g, " ").trim())
          .filter((text) => text.length > 12 && datePattern.test(text))
          .slice(0, 20)
          .map((text) => {
            const deadline = text.match(datePattern)?.[0] || "";
            return {
              title: text.slice(0, 120),
              deadline,
              detail: "captura manual desde extensión",
            };
          });

        return {
          source: "portal",
          kind: "deadlines",
          capturedAt: new Date().toISOString(),
          data: {
            title: document.title,
            url: location.href,
            items: candidates,
          },
        };
      },
    });

    await sendCapture(result);
  } catch {
    // noop
  }
});
