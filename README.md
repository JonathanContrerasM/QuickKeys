# QuickKeys

A small, dependency-free Chrome extension (Manifest V3) that adds keyboard
shortcuts for tab navigation/management and a global dark mode toggle.

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

- Toggle dark mode *(also toggleable by clicking the toolbar icon)*
- Close active tab
- New tab
- Reopen last closed tab
- Pin/unpin active tab
- Duplicate active tab

You can rebind any shortcut, including the four defaults above, at any time
via `chrome://extensions/shortcuts`.

## Installing in Chrome

1. Go to `chrome://extensions`.
2. Turn on **Developer mode** (top-right toggle).
3. Click **Load unpacked** and select this repository's folder (the one
   containing `manifest.json`).
4. The QuickKeys icon appears in the toolbar. To adjust keys, go to
   `chrome://extensions/shortcuts` (also linked from the options page).

## How it works

- `manifest.json` — MV3 manifest with a `service_worker` background and the
  `commands` block defining all 10 shortcuts.
- `background.js` — service worker that handles all keyboard commands and
  toolbar-icon clicks, using the `tabs`, `sessions`, and `storage` APIs.
- `content-darkmode.js` — injected into every page; applies/removes an
  inverted-color filter based on the stored global dark-mode flag.
- `options.html/.js/.css` — settings page showing current key bindings and
  a dark mode switch.

No build step, no npm install, no external dependencies — the folder is
loaded as-is.
