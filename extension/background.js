const api = globalThis.chrome;

async function getActiveTab() {
  const [tab] = await api.tabs.query({ active: true, currentWindow: true });
  return tab;
}

async function switchTab(direction) {
  const tabs = await api.tabs.query({ currentWindow: true });
  if (tabs.length < 2) return;
  tabs.sort((a, b) => a.index - b.index);
  const currentIndex = tabs.findIndex((t) => t.active);
  const nextIndex =
    (currentIndex + direction + tabs.length) % tabs.length;
  await api.tabs.update(tabs[nextIndex].id, { active: true });
}

async function moveTab(direction) {
  const tab = await getActiveTab();
  if (!tab) return;
  const tabs = await api.tabs.query({ currentWindow: true });
  const maxIndex = tabs.length - 1;
  const newIndex = Math.min(Math.max(tab.index + direction, 0), maxIndex);
  await api.tabs.move(tab.id, { index: newIndex });
}

async function setDarkMode(value) {
  await api.storage.local.set({ darkMode: value });
  const tabs = await api.tabs.query({});
  for (const tab of tabs) {
    try {
      await api.tabs.sendMessage(tab.id, { type: "set-dark-mode", value });
    } catch {
      // No content script in this tab (chrome://, extension pages, etc.) — ignore.
    }
  }
}

async function toggleDarkMode() {
  const { darkMode = false } = await api.storage.local.get("darkMode");
  await setDarkMode(!darkMode);
}

async function handleCommand(command) {
  switch (command) {
    case "next-tab":
      return switchTab(1);
    case "previous-tab":
      return switchTab(-1);
    case "move-tab-right":
      return moveTab(1);
    case "move-tab-left":
      return moveTab(-1);
    case "toggle-dark-mode":
      return toggleDarkMode();
    case "close-tab": {
      const tab = await getActiveTab();
      if (tab) await api.tabs.remove(tab.id);
      return;
    }
    case "new-tab":
      return api.tabs.create({});
    case "reopen-closed-tab":
      return api.sessions.restore();
    case "pin-tab": {
      const tab = await getActiveTab();
      if (tab) await api.tabs.update(tab.id, { pinned: !tab.pinned });
      return;
    }
    case "duplicate-tab": {
      const tab = await getActiveTab();
      if (tab) await api.tabs.duplicate(tab.id);
      return;
    }
  }
}

api.commands.onCommand.addListener(handleCommand);
api.action.onClicked.addListener(() => toggleDarkMode());
