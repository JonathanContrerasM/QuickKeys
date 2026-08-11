const api = globalThis.chrome;

const searchInput = document.getElementById("search");
const listEl = document.getElementById("tab-list");

let allTabs = [];
let filteredTabs = [];
let selectedIndex = 0;

function matches(tab, query) {
  if (!query) return true;
  const haystack = `${tab.title || ""} ${tab.url || ""}`.toLowerCase();
  return haystack.includes(query);
}

function render() {
  const query = searchInput.value.trim().toLowerCase();
  filteredTabs = allTabs.filter((tab) => matches(tab, query));
  selectedIndex = Math.min(selectedIndex, Math.max(filteredTabs.length - 1, 0));

  listEl.innerHTML = "";

  if (filteredTabs.length === 0) {
    const empty = document.createElement("li");
    empty.className = "empty";
    empty.textContent = "No matching tabs";
    listEl.appendChild(empty);
    return;
  }

  filteredTabs.forEach((tab, index) => {
    const li = document.createElement("li");
    li.className = index === selectedIndex ? "selected" : "";

    const icon = document.createElement("img");
    icon.src = tab.favIconUrl || "icons/icon16.png";
    icon.onerror = () => {
      icon.style.visibility = "hidden";
    };

    const text = document.createElement("div");
    text.className = "tab-text";

    const title = document.createElement("div");
    title.className = "tab-title";
    title.textContent = tab.title || tab.url || "Untitled tab";

    const url = document.createElement("div");
    url.className = "tab-url";
    url.textContent = tab.url || "";

    text.appendChild(title);
    text.appendChild(url);
    li.appendChild(icon);
    li.appendChild(text);

    li.addEventListener("mousemove", () => {
      if (selectedIndex !== index) {
        selectedIndex = index;
        render();
      }
    });
    li.addEventListener("click", () => selectTab(tab));

    listEl.appendChild(li);
  });

  const selectedEl = listEl.children[selectedIndex];
  if (selectedEl) selectedEl.scrollIntoView({ block: "nearest" });
}

async function selectTab(tab) {
  await api.tabs.update(tab.id, { active: true });
  await api.windows.update(tab.windowId, { focused: true });
  window.close();
}

async function loadTabs() {
  const [ownTab, tabs] = await Promise.all([
    api.tabs.getCurrent(),
    api.tabs.query({}),
  ]);
  allTabs = tabs
    .filter((tab) => tab.id !== ownTab?.id)
    .sort((a, b) => (b.lastAccessed || 0) - (a.lastAccessed || 0));
  render();
}

searchInput.addEventListener("input", () => {
  selectedIndex = 0;
  render();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "ArrowDown") {
    event.preventDefault();
    selectedIndex = Math.min(selectedIndex + 1, filteredTabs.length - 1);
    render();
  } else if (event.key === "ArrowUp") {
    event.preventDefault();
    selectedIndex = Math.max(selectedIndex - 1, 0);
    render();
  } else if (event.key === "Enter") {
    event.preventDefault();
    const tab = filteredTabs[selectedIndex];
    if (tab) selectTab(tab);
  } else if (event.key === "Escape") {
    window.close();
  }
});

window.addEventListener("blur", () => window.close());

searchInput.focus();
loadTabs();
