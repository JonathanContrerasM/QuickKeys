# QuickKeys

A small, dependency-free browser extension (Manifest V3) for Chrome and
Firefox that adds keyboard shortcuts for tab navigation/management and a
global dark mode toggle.

## Default shortcuts

| Shortcut | Action |
|---|---|
| `Alt+Shift+D` | Switch to next tab |
| `Alt+Shift+A` | Switch to previous tab |
| `Alt+C` | Move active tab one position right |
| `Alt+Y` | Move active tab one position left |

(`Alt+D`/`Alt+A` alone are reserved by Firefox for its own address-bar
shortcuts and can't be claimed by extensions, hence the `Shift`.)

Chrome and Firefox only let an extension auto-assign a small number of
default keys, so the actions below ship **without** a default binding —
open the extension's options page (right-click the toolbar icon → Options,
or click "Open browser shortcut settings" there) to assign keys for them:

- Toggle dark mode *(also toggleable by clicking the toolbar icon)*
- Close active tab
- New tab
- Reopen last closed tab
- Pin/unpin active tab
- Duplicate active tab

You can rebind any shortcut, including the four defaults above, at any time.

## Installing in Chrome

1. Go to `chrome://extensions`.
2. Turn on **Developer mode** (top-right toggle).
3. Click **Load unpacked** and select this `extension/` folder.
4. The QuickKeys icon appears in the toolbar. To adjust keys, go to
   `chrome://extensions/shortcuts` (also linked from the options page).

## Installing in Firefox

1. Go to `about:debugging#/runtime/this-firefox`.
2. Click **Load Temporary Add-on…** and select `extension/manifest.json`.
3. To adjust keys: click the puzzle-piece icon in the toolbar → gear icon →
   **Manage Extension Shortcuts**.

Note: Firefox's "Load Temporary Add-on" removes the extension when the
browser restarts. For a permanent install you'd need to package it as a
`.xpi` and either sign it via
[addons.mozilla.org](https://addons.mozilla.org) or use Firefox
Developer Edition/Nightly with `xpinstall.signatures.required` disabled.

## How it works

- `manifest.json` — single MV3 manifest that works in both browsers
  (`browser_specific_settings.gecko` makes Firefox accept it).
- `background.js` — service worker that handles all keyboard commands and
  toolbar-icon clicks, using the `tabs`, `sessions`, and `storage` APIs.
- `content-darkmode.js` — injected into every page; applies/removes an
  inverted-color filter based on the stored global dark-mode flag.
- `options.html/.js/.css` — settings page showing current key bindings and
  a dark mode switch.

No build step, no npm install, no external dependencies — the folder is
loaded as-is.
