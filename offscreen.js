const api = globalThis.chrome;

api.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.target !== "offscreen" || message?.type !== "copy-to-clipboard") {
    return undefined;
  }
  const textarea = document.getElementById("copy-target");
  textarea.value = message.data;
  textarea.select();
  document.execCommand("copy");
  sendResponse({ ok: true });
  return true;
});
