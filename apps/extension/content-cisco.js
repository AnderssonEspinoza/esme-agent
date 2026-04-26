function extractCiscoItems() {
  const datePattern = /\b(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?|\d{1,2}\s+de\s+[a-záéíóú]+(?:\s+de\s+\d{4})?)\b/i;
  const blocks = Array.from(document.querySelectorAll("li, tr, article, .card, .module, .assignment"))
    .map((node) => (node.textContent || "").replace(/\s+/g, " ").trim())
    .filter((text) => text.length > 10)
    .filter((text) => /deadline|due|vence|fecha|entrega|assessment|quiz|exam/i.test(text))
    .slice(0, 25);

  const items = blocks.map((text) => ({
    title: text.slice(0, 120),
    deadline: text.match(datePattern)?.[0] || "",
    detail: "capturado desde Cisco",
  }));

  if (items.length === 0) {
    return null;
  }

  return {
    source: "cisco",
    kind: "deadlines",
    capturedAt: new Date().toISOString(),
    data: {
      title: document.title,
      url: location.href,
      items,
    },
  };
}

const payload = extractCiscoItems();
if (payload) {
  chrome.runtime.sendMessage({
    type: "XIO_CAPTURE",
    payload,
  });
}
