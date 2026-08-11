const api = globalThis.chrome;

async function renderShortcuts() {
  const commands = await api.commands.getAll();
  const tbody = document.querySelector("#shortcut-table tbody");
  tbody.innerHTML = "";
  for (const cmd of commands) {
    const tr = document.createElement("tr");

    const label = document.createElement("td");
    label.textContent = cmd.description || cmd.name;

    const key = document.createElement("td");
    if (cmd.shortcut) {
      const code = document.createElement("code");
      code.textContent = cmd.shortcut;
      key.appendChild(code);
    } else {
      key.textContent = "Not assigned";
      key.style.color = "var(--muted)";
    }

    tr.appendChild(label);
    tr.appendChild(key);
    tbody.appendChild(tr);
  }
}

async function initDarkModeToggle() {
  const toggle = document.getElementById("dark-mode-toggle");
  const { darkMode = false } = await api.storage.local.get("darkMode");
  toggle.checked = darkMode;

  toggle.addEventListener("change", async () => {
    const value = toggle.checked;
    await api.storage.local.set({ darkMode: value });
    const tabs = await api.tabs.query({});
    for (const tab of tabs) {
      try {
        await api.tabs.sendMessage(tab.id, { type: "set-dark-mode", value });
      } catch {
        // Tab has no content script (chrome://, extension pages, etc.)
      }
    }
  });
}

function initOpenShortcutsButton() {
  const btn = document.getElementById("open-shortcuts-btn");
  btn.addEventListener("click", () => {
    api.tabs.create({ url: "chrome://extensions/shortcuts" });
  });
}

renderShortcuts();
initDarkModeToggle();
initOpenShortcutsButton();
