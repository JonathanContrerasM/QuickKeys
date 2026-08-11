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

async function toggleMuteTab() {
  const tab = await getActiveTab();
  if (!tab) return;
  await api.tabs.update(tab.id, { muted: !tab.mutedInfo?.muted });
}

async function moveTabToNewWindow() {
  const tab = await getActiveTab();
  if (!tab) return;
  await api.windows.create({ tabId: tab.id });
}

async function cyclePinnedTabs() {
  const tabs = await api.tabs.query({ currentWindow: true, pinned: true });
  if (tabs.length < 2) return;
  tabs.sort((a, b) => a.index - b.index);
  const currentIndex = tabs.findIndex((t) => t.active);
  const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % tabs.length;
  await api.tabs.update(tabs[nextIndex].id, { active: true });
}

async function screenshotVisibleTab() {
  const tab = await getActiveTab();
  if (!tab) return;
  const dataUrl = await api.tabs.captureVisibleTab(tab.windowId, { format: "png" });
  await api.downloads.download({
    url: dataUrl,
    filename: `quickkeys-screenshot-${Date.now()}.png`,
    saveAs: false,
  });
}

let creatingOffscreenDocument = null;

async function ensureOffscreenDocument() {
  if (await api.offscreen.hasDocument()) return;
  if (!creatingOffscreenDocument) {
    creatingOffscreenDocument = api.offscreen
      .createDocument({
        url: "offscreen.html",
        reasons: ["CLIPBOARD"],
        justification: "Write the active tab's URL to the clipboard",
      })
      .finally(() => {
        creatingOffscreenDocument = null;
      });
  }
  await creatingOffscreenDocument;
}

async function copyActiveTabUrl() {
  const tab = await getActiveTab();
  if (!tab?.url) return;
  await ensureOffscreenDocument();
  await api.runtime.sendMessage({
    target: "offscreen",
    type: "copy-to-clipboard",
    data: tab.url,
  });
}

async function getDisplayWorkArea(windowId) {
  const win = await api.windows.get(windowId);
  const displays = await api.system.display.getInfo();
  const centerX = (win.left ?? 0) + (win.width ?? 0) / 2;
  const centerY = (win.top ?? 0) + (win.height ?? 0) / 2;
  const display =
    displays.find(
      (d) =>
        centerX >= d.bounds.left &&
        centerX < d.bounds.left + d.bounds.width &&
        centerY >= d.bounds.top &&
        centerY < d.bounds.top + d.bounds.height,
    ) || displays[0];
  return display.workArea;
}

// Each region computes the new (popped-out) window's bounds from the
// display's work area. Halves also resize the origin window to the
// complementary half; quadrants leave the origin window untouched, since a
// single quadrant has no unambiguous complement.
const SPLIT_REGIONS = {
  "split-right": (wa) => {
    const halfWidth = Math.floor(wa.width / 2);
    return {
      newBounds: {
        left: wa.left + halfWidth,
        top: wa.top,
        width: wa.width - halfWidth,
        height: wa.height,
      },
      originBounds: { left: wa.left, top: wa.top, width: halfWidth, height: wa.height },
    };
  },
  "split-left": (wa) => {
    const halfWidth = Math.floor(wa.width / 2);
    return {
      newBounds: { left: wa.left, top: wa.top, width: halfWidth, height: wa.height },
      originBounds: {
        left: wa.left + halfWidth,
        top: wa.top,
        width: wa.width - halfWidth,
        height: wa.height,
      },
    };
  },
  "snap-top-left": (wa) => {
    const halfWidth = Math.floor(wa.width / 2);
    const halfHeight = Math.floor(wa.height / 2);
    return {
      newBounds: { left: wa.left, top: wa.top, width: halfWidth, height: halfHeight },
      originBounds: null,
    };
  },
  "snap-top-right": (wa) => {
    const halfWidth = Math.floor(wa.width / 2);
    const halfHeight = Math.floor(wa.height / 2);
    return {
      newBounds: {
        left: wa.left + halfWidth,
        top: wa.top,
        width: wa.width - halfWidth,
        height: halfHeight,
      },
      originBounds: null,
    };
  },
  "snap-bottom-left": (wa) => {
    const halfWidth = Math.floor(wa.width / 2);
    const halfHeight = Math.floor(wa.height / 2);
    return {
      newBounds: {
        left: wa.left,
        top: wa.top + halfHeight,
        width: halfWidth,
        height: wa.height - halfHeight,
      },
      originBounds: null,
    };
  },
  "snap-bottom-right": (wa) => {
    const halfWidth = Math.floor(wa.width / 2);
    const halfHeight = Math.floor(wa.height / 2);
    return {
      newBounds: {
        left: wa.left + halfWidth,
        top: wa.top + halfHeight,
        width: wa.width - halfWidth,
        height: wa.height - halfHeight,
      },
      originBounds: null,
    };
  },
};

// Some window managers (notably on Linux) don't honor the exact bounds
// passed to windows.create()/update() on the first pass — the geometry
// settles a moment later, especially right after a state change or on a
// brand new window, leaving a visible gap. Re-asserting the same bounds
// once the window has settled fixes it in practice.
async function applyBoundsWithRetry(windowId, bounds) {
  await api.windows.update(windowId, bounds);
  await new Promise((resolve) => setTimeout(resolve, 75));
  await api.windows.update(windowId, bounds);
}

// chrome.windows.update() silently ignores left/top/width/height while a
// window's state is "maximized"/"minimized"/"fullscreen" (Chrome treats
// bounds as incompatible with those states) — a maximized or OS-docked
// window has to be dropped back to "normal" first before it'll resize.
async function setWindowBounds(windowId, bounds) {
  const win = await api.windows.get(windowId);
  if (win.state !== "normal") {
    await api.windows.update(windowId, { state: "normal" });
  }
  await applyBoundsWithRetry(windowId, bounds);
}

async function splitToRegion(regionKey) {
  const tab = await getActiveTab();
  if (!tab) return;
  const originWindowId = tab.windowId;
  const originWindow = await api.windows.get(originWindowId);
  const workArea = await getDisplayWorkArea(originWindowId);
  const { newBounds, originBounds } = SPLIT_REGIONS[regionKey](workArea);

  const preSplitOriginBounds = {
    left: originWindow.left,
    top: originWindow.top,
    width: originWindow.width,
    height: originWindow.height,
  };

  const newWindow = await api.windows.create({ tabId: tab.id, ...newBounds });
  await applyBoundsWithRetry(newWindow.id, newBounds);

  if (originBounds) {
    await setWindowBounds(originWindowId, originBounds);
  }

  const { splitPairs = {} } = await api.storage.session.get("splitPairs");
  splitPairs[newWindow.id] = { originWindowId, originBounds: preSplitOriginBounds };
  await api.storage.session.set({ splitPairs });
}

async function mergeWindow() {
  const tab = await getActiveTab();
  if (!tab) return;
  const { splitPairs = {} } = await api.storage.session.get("splitPairs");
  const pair = splitPairs[tab.windowId];
  if (!pair) return;

  try {
    await api.windows.get(pair.originWindowId);
  } catch {
    delete splitPairs[tab.windowId];
    await api.storage.session.set({ splitPairs });
    return;
  }

  await api.tabs.move(tab.id, { windowId: pair.originWindowId, index: -1 });
  await api.tabs.update(tab.id, { active: true });
  await setWindowBounds(pair.originWindowId, pair.originBounds);

  delete splitPairs[tab.windowId];
  await api.storage.session.set({ splitPairs });
}

api.windows.onRemoved.addListener(async (windowId) => {
  const { splitPairs = {} } = await api.storage.session.get("splitPairs");
  if (splitPairs[windowId]) {
    delete splitPairs[windowId];
    await api.storage.session.set({ splitPairs });
  }
  if (quickSwitcherWindowId === windowId) {
    quickSwitcherWindowId = null;
  }
});

let quickSwitcherWindowId = null;

async function openQuickSwitcher() {
  if (quickSwitcherWindowId !== null) {
    try {
      await api.windows.update(quickSwitcherWindowId, { focused: true });
      return;
    } catch {
      quickSwitcherWindowId = null;
    }
  }

  const currentWindow = await api.windows.getLastFocused();
  const workArea = await getDisplayWorkArea(currentWindow.id);
  const width = Math.min(560, workArea.width - 40);
  const height = Math.min(420, workArea.height - 40);

  const switcherWindow = await api.windows.create({
    url: "switcher.html",
    type: "popup",
    width,
    height,
    left: Math.round(workArea.left + (workArea.width - width) / 2),
    top: Math.round(workArea.top + (workArea.height - height) / 3),
  });
  quickSwitcherWindowId = switcherWindow.id;
}

async function closeTabsToTheRight() {
  const tab = await getActiveTab();
  if (!tab) return;
  const tabs = await api.tabs.query({ currentWindow: true });
  const idsToClose = tabs.filter((t) => t.index > tab.index).map((t) => t.id);
  if (idsToClose.length) await api.tabs.remove(idsToClose);
}

async function closeOtherTabs() {
  const tab = await getActiveTab();
  if (!tab) return;
  const tabs = await api.tabs.query({ currentWindow: true });
  const idsToClose = tabs
    .filter((t) => t.id !== tab.id && !t.pinned)
    .map((t) => t.id);
  if (idsToClose.length) await api.tabs.remove(idsToClose);
}

async function discardActiveTab() {
  const tab = await getActiveTab();
  if (!tab) return;
  await api.tabs.discard(tab.id);
}

async function muteOtherTabs() {
  const tab = await getActiveTab();
  if (!tab) return;
  const tabs = await api.tabs.query({});
  await Promise.all(
    tabs
      .filter((t) => t.id !== tab.id && !t.mutedInfo?.muted)
      .map((t) => api.tabs.update(t.id, { muted: true })),
  );
}

async function enterFocusMode() {
  const tab = await getActiveTab();
  if (!tab) return;
  const tabs = await api.tabs.query({ currentWindow: true });
  const idsToClose = tabs
    .filter((t) => t.id !== tab.id && !t.pinned)
    .map((t) => t.id);
  if (idsToClose.length) await api.tabs.remove(idsToClose);
}

async function zoomBy(delta) {
  const tab = await getActiveTab();
  if (!tab) return;
  const currentZoom = await api.tabs.getZoom(tab.id);
  const nextZoom = Math.min(5, Math.max(0.25, currentZoom + delta));
  await api.tabs.setZoom(tab.id, nextZoom);
}

async function resetZoom() {
  const tab = await getActiveTab();
  if (!tab) return;
  await api.tabs.setZoom(tab.id, 0);
}

async function restoreRecentTabs() {
  const sessions = await api.sessions.getRecentlyClosed({ maxResults: 3 });
  for (const session of sessions) {
    if (session.tab) await api.sessions.restore(session.tab.sessionId);
  }
}

async function openInIncognito() {
  const tab = await getActiveTab();
  if (!tab?.url) return;
  try {
    await api.windows.create({ url: tab.url, incognito: true });
  } catch {
    // Extension isn't allowed in Incognito (chrome://extensions toggle) — ignore.
  }
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
    case "split-right":
    case "split-left":
    case "snap-top-left":
    case "snap-top-right":
    case "snap-bottom-left":
    case "snap-bottom-right":
      return splitToRegion(command);
    case "merge-window":
      return mergeWindow();
    case "move-tab-new-window":
      return moveTabToNewWindow();
    case "mute-tab":
      return toggleMuteTab();
    case "copy-url":
      return copyActiveTabUrl();
    case "screenshot-tab":
      return screenshotVisibleTab();
    case "cycle-pinned-tabs":
      return cyclePinnedTabs();
    case "quick-switcher":
      return openQuickSwitcher();
    case "close-tabs-right":
      return closeTabsToTheRight();
    case "close-other-tabs":
      return closeOtherTabs();
    case "discard-tab":
      return discardActiveTab();
    case "mute-other-tabs":
      return muteOtherTabs();
    case "focus-mode":
      return enterFocusMode();
    case "zoom-in":
      return zoomBy(0.1);
    case "zoom-out":
      return zoomBy(-0.1);
    case "zoom-reset":
      return resetZoom();
    case "restore-recent-tabs":
      return restoreRecentTabs();
    case "open-incognito":
      return openInIncognito();
  }
}

api.commands.onCommand.addListener(handleCommand);
api.action.onClicked.addListener(() => toggleDarkMode());
