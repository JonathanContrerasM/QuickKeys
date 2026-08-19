# QuickKeys

![Chrome Manifest V3](https://img.shields.io/badge/Chrome-Manifest%20V3-4285F4?logo=googlechrome&logoColor=white)
![No dependencies](https://img.shields.io/badge/dependencies-none-brightgreen)
![License: MIT](https://img.shields.io/badge/license-MIT-blue)

A small, dependency-free Chrome extension that adds **38 keyboard shortcuts**
for tab navigation, window snapping & split view, a quick tab switcher, tab
cleanup, zoom, and a global dark mode. No build step, no npm install, no
network requests — the folder loads as-is.

## Highlights

- **Quick tab switcher** — a popup listing every open tab across all windows,
  filter-as-you-type, ordered by last use.
- **Split view & quadrant snapping** — pop the active tab out to either half
  or any corner quadrant of the screen, then merge it back into its original
  window at the original size. Multi-monitor aware.
- **Open the 1st/2nd/3rd search result** on Google, DuckDuckGo, or Bing —
  organic results only; ads and "People also ask" are skipped.
- **Tab hygiene** — close tabs to the right, close all others, focus mode,
  discard from memory, mute everything else.
- **Global dark mode** for every site, toggled by shortcut or toolbar click.
- **Private by design** — no analytics, no remote code, zero network requests.

## Installation

1. Go to `chrome://extensions`.
2. Turn on **Developer mode** (top-right toggle).
3. Click **Load unpacked** and select this repository's folder (the one
   containing `manifest.json`).
4. The QuickKeys icon appears in the toolbar.

## Shortcuts

Chrome only lets an extension auto-assign a handful of default keys, so just
four actions ship with a binding. Everything else works the moment you assign
it a key at `chrome://extensions/shortcuts` — also linked from the options
page (right-click the toolbar icon → **Options**), which lists every action
grouped by category with its current binding.

### Navigation & tabs

| Action | Default key |
|---|---|
| Switch to next tab | `Alt+D` |
| Switch to previous tab | `Alt+A` |
| Move active tab one position right | `Alt+C` |
| Move active tab one position left | `Alt+Y` |
| Open the quick tab switcher | — |
| Switch to the next pinned tab | — |
| Go back one page | — |
| Go forward one page | — |
| New tab | — |
| Duplicate the active tab | — |
| Pin/unpin the active tab | — |
| Close the active tab | — |
| Reopen the last closed tab | — |

### Search

| Action | Default key |
|---|---|
| Open the first search result | — |
| Open the second search result | — |
| Open the third search result | — |

### Window & split view

| Action | Default key |
|---|---|
| Move the active tab into a new window | — |
| Split active tab to the left half of the screen | — |
| Split active tab to the right half of the screen | — |
| Snap active tab to the top-left quadrant | — |
| Snap active tab to the top-right quadrant | — |
| Snap active tab to the bottom-left quadrant | — |
| Snap active tab to the bottom-right quadrant | — |
| Merge a split-out tab back into its original window | — |

### Tab hygiene

| Action | Default key |
|---|---|
| Close all tabs to the right | — |
| Close every other tab (pinned tabs are kept) | — |
| Focus mode — close every unpinned tab except the active one | — |
| Discard the active tab from memory without closing it | — |
| Mute/unmute the active tab | — |
| Mute every tab except the active one | — |

### Utilities

| Action | Default key |
|---|---|
| Copy the active tab's URL to the clipboard | — |
| Screenshot the visible tab (saved via downloads) | — |
| Zoom in / zoom out / reset zoom | — |
| Reopen the last few closed tabs | — |
| Open the active tab's URL in an incognito window | — |

### Appearance

| Action | Default key |
|---|---|
| Toggle global dark mode *(also: click the toolbar icon)* | — |

## Privacy

QuickKeys runs entirely inside your browser:

- **Zero network requests.** Nothing is fetched, sent, logged, or phoned home.
- **No page content is read**, with one exception: the "open Nth search
  result" shortcut reads result links off the current page via a one-shot
  script injection at the moment you press the key, using the `activeTab`
  grant Chrome issues for that keypress — no broad host permissions.
- The dark-mode content script only toggles a CSS filter; it reads nothing.
- Settings live in `chrome.storage.local`; split-window pairings live in
  `chrome.storage.session` and vanish when the browser closes.

## How it works

| File | Role |
|---|---|
| `manifest.json` | MV3 manifest; the `commands` block defines all 38 shortcuts |
| `background.js` | Service worker handling every command and toolbar click |
| `content-darkmode.js` | Applies/removes the inverted-color filter per the stored flag |
| `offscreen.html/.js` | Hidden document used only to write to the clipboard (service workers have no DOM) |
| `switcher.html/.js/.css` | The quick tab switcher popup |
| `options.html/.js/.css` | Settings page: bindings by category + dark mode switch |

### Split view & quadrant snapping

"Split active tab" moves the active tab into a brand-new window snapped to
the chosen region of the current display and — for the two half-splits only —
resizes the original window to the complementary half (a single quadrant has
no unambiguous complement, so quadrant snaps leave the original window
untouched). It uses `chrome.system.display` to find the display the window is
actually on, so it behaves correctly across multi-monitor setups. The pairing
between the two windows is remembered so that "merge" can restore the tab
into its original window at the original size — it only does anything when
run from a window that was actually created by a split.

### Quick tab switcher

Rather than injecting a search overlay into whatever page you're on (which
risks CSS/CSP conflicts on some sites), the switcher opens as its own small
popup window listing every open tab across every browser window, filterable
by title/URL as you type. Arrow keys move the selection, Enter jumps to the
tab, and Escape or clicking away closes it without changing anything.

### Opening the Nth search result

Works on Google (every ccTLD), DuckDuckGo, and Bing. *First* means the first
**organic** result — sponsored blocks and "People also ask" are skipped, so
the shortcut goes where you'd expect rather than into an ad. The result opens
in the same tab.

Search-results markup is not a stable API, so the selectors are collected in
one `SEARCH_ENGINES` table at the top of `background.js` for easy repair. Off
a recognised results page — or if the layout changes enough that nothing
matches — the shortcut silently does nothing.

### Incognito caveat

"Open in incognito" silently does nothing unless you've enabled **Allow in
Incognito** for QuickKeys at `chrome://extensions` — Chrome doesn't let an
extension grant itself that access.

## License

[MIT](LICENSE)