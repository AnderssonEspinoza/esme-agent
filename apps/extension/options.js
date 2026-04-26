const baseUrl = document.getElementById("baseUrl");
const token = document.getElementById("token");
const save = document.getElementById("save");

chrome.storage.sync.get(["xioBaseUrl", "xioIngestToken"], (config) => {
  baseUrl.value = config.xioBaseUrl || "";
  token.value = config.xioIngestToken || "";
});

save.addEventListener("click", () => {
  chrome.storage.sync.set({
    xioBaseUrl: baseUrl.value.trim(),
    xioIngestToken: token.value.trim()
  });
});

