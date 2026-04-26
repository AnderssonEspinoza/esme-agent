chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type !== "XIO_CAPTURE") {
    return;
  }

  chrome.storage.sync.get(["xioBaseUrl", "xioIngestToken"], async (config) => {
    if (!config.xioBaseUrl || !config.xioIngestToken) {
      sendResponse({ ok: false, error: "XIO no configurado en la extension." });
      return;
    }

    try {
      const response = await fetch(`${config.xioBaseUrl}/api/ingest/browser`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-xio-ingest-token": config.xioIngestToken
        },
        body: JSON.stringify(message.payload)
      });

      sendResponse({ ok: response.ok });
    } catch (error) {
      sendResponse({ ok: false, error: String(error) });
    }
  });

  return true;
});

