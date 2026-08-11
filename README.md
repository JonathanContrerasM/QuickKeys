# QuickKeys

A small, dependency-free Chrome extension (Manifest V3) that adds keyboard
shortcuts for tab navigation, window snapping/split view, a quick tab
switcher, tab cleanup, zoom, and a global dark mode toggle.

## Default shortcuts

| Shortcut | Action |
|---|---|
| `Alt+D` | Switch to next tab |
| `Alt+A` | Switch to previous tab |
| `Alt+C` | Move active tab one position right |
| `Alt+Y` | Move active tab one position left |

Chrome only lets an extension auto-assign a small number of default keys,
so the actions below ship **without** a default binding — open the
extension's options page (right-click the toolbar icon → Options, or click
"Open browser shortcut settings" there) to assign keys for them:

- Open the quick tab switcher
- Cycle to the next pinned tab
- New tab
- Duplicate active tab
- Pin/unpin active tab
- Close active tab
- Reopen last closed tab
- Move active tab into a new window
- Split active tab into a new window (right half, left half, or any corner
  quadrant of the screen)
- Merge a split-out tab back into the window it came from
- Close all tabs to the right of the active tab
- Close every other tab (pinned tabs are kept)
- Focus mode — close every unpinned tab except the active one
- Discard the active tab from memory without closing it
- Mute/unmute active tab, or mute every other tab
- Copy active tab's URL to the clipboard
- Screenshot the visible tab (saved via the browser's downloads)
- Zoom in / zoom out / reset zoom on the active tab
- Reopen the last few closed tabs
- Open the active tab's URL in an incognito window
- Toggle dark mode *(also toggleable by clicking the toolbar icon)*

You can rebind any shortcut, including the four defaults above, at any time
via `chrome://extensions/shortcuts`. The options page (right-click the
toolbar icon → Options) groups every shortcut by category with its current
key binding.

## Installing in Chrome

1. Go to `chrome://extensions`.
2. Turn on **Developer mode** (top-right toggle).
3. Click **Load unpacked** and select this repository's folder (the one
   containing `manifest.json`).
4. The QuickKeys icon appears in the toolbar. To adjust keys, go to
   `chrome://extensions/shortcuts` (also linked from the options page).

## How it works

- `manifest.json` — MV3 manifest with a `service_worker` background and the
  `commands` block defining all 33 shortcuts.
- `background.js` — service worker that handles all keyboard commands and
  toolbar-icon clicks, using the `tabs`, `windows`, `sessions`, `storage`,
  `system.display`, `downloads`, and `offscreen` APIs.
- `content-darkmode.js` — injected into every page; applies/removes an
  inverted-color filter based on the stored global dark-mode flag.
- `offscreen.html/.js` — a hidden offscreen document used only to write text
  (the active tab's URL) to the clipboard, since service workers have no DOM.
- `switcher.html/.js/.css` — the quick tab switcher's popup window.
- `options.html/.js/.css` — settings page showing current key bindings,
  grouped by category, and a dark mode switch.

### Split view & quadrant snapping

"Split active tab" moves the active tab into a brand new window snapped to
the right half, left half, or a corner quadrant of the current display, and
— for the two half-splits only — resizes the original window to the
complementary half (a single quadrant has no unambiguous complement, so
quadrant snaps leave the original window untouched). It uses
`chrome.system.display` to find the display the window is actually on, so it
behaves correctly across multi-monitor setups. The pairing between the two
windows is remembered in `chrome.storage.session` (cleared when the browser
closes) so that "Merge a split-out tab back" can restore the tab into its
original window at the original window size — it only does anything when run
from a window that was actually created by a split.

### Quick tab switcher

Rather than injecting a search overlay into whatever page you're on (which
risks CSS/CSP conflicts on some sites), the switcher opens as its own small
popup window listing every open tab across every browser window, filterable
by title/URL as you type. Arrow keys move the selection, Enter jumps to the
tab, and Escape or clicking away closes it without changing anything.

### Incognito caveat

"Open in incognito" silently does nothing if you haven't enabled **Allow in
Incognito** for QuickKeys at `chrome://extensions` — Chrome doesn't let an
extension grant itself that access.

No build step, no npm install, no external dependencies — the folder is
loaded as-is.
