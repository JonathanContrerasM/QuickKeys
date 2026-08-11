const api = globalThis.chrome;

const SHORTCUT_GROUPS = [
  {
    label: "Navigation & tabs",
    commands: [
      "next-tab",
      "previous-tab",
      "quick-switcher",
      "cycle-pinned-tabs",
      "go-back",
      "go-forward",
      "move-tab-left",
      "move-tab-right",
      "new-tab",
      "duplicate-tab",
      "pin-tab",
      "close-tab",
      "reopen-closed-tab",
    ],
  },
  {
    label: "Window & split view",
    commands: [
      "move-tab-new-window",
      "split-left",
      "split-right",
      "snap-top-left",
      "snap-top-right",
      "snap-bottom-left",
      "snap-bottom-right",
      "merge-window",
    ],
  },
  {
    label: "Tab hygiene",
    commands: [
      "close-tabs-right",
      "close-other-tabs",
      "focus-mode",
      "discard-tab",
      "mute-tab",
      "mute-other-tabs",
    ],
  },
  {
    label: "Utilities",
    commands: [
      "copy-url",
      "screenshot-tab",
      "zoom-in",
      "zoom-out",
      "zoom-reset",
      "restore-recent-tabs",
      "open-incognito",
    ],
  },
  { label: "Appearance", commands: ["toggle-dark-mode"] },
];

function buildTable(commands) {
  const table = document.createElement("table");
  const thead = document.createElement("thead");
  thead.innerHTML = "<tr><th>Action</th><th>Default key</th></tr>";
  const tbody = document.createElement("tbody");

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

  table.appendChild(thead);
  table.appendChild(tbody);
  return table;
}

async function renderShortcuts() {
  const commands = await api.commands.getAll();
  const byName = new Map(commands.map((cmd) => [cmd.name, cmd]));
  const container = document.getElementById("shortcut-groups");
  container.innerHTML = "";

  const grouped = new Set();
  for (const group of SHORTCUT_GROUPS) {
    const groupCommands = group.commands
      .map((name) => byName.get(name))
      .filter(Boolean);
    groupCommands.forEach((cmd) => grouped.add(cmd.name));
    if (!groupCommands.length) continue;

    const heading = document.createElement("h3");
    heading.className = "group-title";
    heading.textContent = group.label;
    container.appendChild(heading);
    container.appendChild(buildTable(groupCommands));
  }

  const ungrouped = commands.filter((cmd) => !grouped.has(cmd.name));
  if (ungrouped.length) {
    const heading = document.createElement("h3");
    heading.className = "group-title";
    heading.textContent = "Other";
    container.appendChild(heading);
    container.appendChild(buildTable(ungrouped));
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
