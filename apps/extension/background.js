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

function notify(title, message) {
  chrome.notifications.create({
    type: "basic",
    iconUrl: "icon-128.png",
    title,
    message,
  });
}

async function reportCaptureResult(result) {
  if (result.ok) {
    const imported = Number(result.data?.importedItems || 0);
    const badgeText = imported > 0 ? String(Math.min(imported, 99)) : "OK";
    await chrome.action.setBadgeText({ text: badgeText });
    await chrome.action.setBadgeBackgroundColor({ color: "#0ea5e9" });
    notify("XIO Capture", imported > 0 ? `Se importaron ${imported} entregas.` : "Captura enviada a E.S.M.E.");
  } else {
    await chrome.action.setBadgeText({ text: "ERR" });
    await chrome.action.setBadgeBackgroundColor({ color: "#ef4444" });
    notify("XIO Capture", result.error || "No se pudo enviar la captura.");
  }
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type !== "XIO_CAPTURE") return;
  sendCapture(message.payload).then((result) => {
    if (!result.ok) {
      void reportCaptureResult(result);
    }
    sendResponse(result);
  });
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

    const response = await sendCapture(result);
    await reportCaptureResult(response);
  } catch {
    await chrome.action.setBadgeText({ text: "ERR" });
    await chrome.action.setBadgeBackgroundColor({ color: "#ef4444" });
    notify("XIO Capture", "No se pudo leer la página actual.");
  }
});
