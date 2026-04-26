function extractLinkedInJob() {
  const title = document.querySelector("h1")?.textContent?.trim();
  const company = document.querySelector(".job-details-jobs-unified-top-card__company-name")?.textContent?.trim();

  if (!title && !company) {
    return null;
  }

  return {
    source: "linkedin",
    kind: "job",
    capturedAt: new Date().toISOString(),
    data: {
      title,
      company,
      url: location.href
    }
  };
}

const payload = extractLinkedInJob();

if (payload) {
  chrome.runtime.sendMessage({
    type: "XIO_CAPTURE",
    payload
  });
}

