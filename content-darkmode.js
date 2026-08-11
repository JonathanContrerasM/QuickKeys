const api = globalThis.chrome;
const CLASS_NAME = "quickkeys-dark-mode";
const STYLE_ID = "quickkeys-dark-mode-style";

function ensureStyleInjected() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    html.${CLASS_NAME} {
      filter: invert(1) hue-rotate(180deg) !important;
      background: #fff;
    }
    html.${CLASS_NAME} img,
    html.${CLASS_NAME} video,
    html.${CLASS_NAME} picture,
    html.${CLASS_NAME} canvas,
    html.${CLASS_NAME} svg,
    html.${CLASS_NAME} iframe {
      filter: invert(1) hue-rotate(180deg) !important;
    }
  `;
  document.documentElement.appendChild(style);
}

function applyDarkMode(enabled) {
  if (enabled) ensureStyleInjected();
  document.documentElement.classList.toggle(CLASS_NAME, enabled);
}

api.runtime.onMessage.addListener((message) => {
  if (message?.type === "set-dark-mode") {
    applyDarkMode(Boolean(message.value));
  }
});

api.storage.local.get("darkMode").then(({ darkMode = false }) => {
  applyDarkMode(darkMode);
});
