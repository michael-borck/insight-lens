# Keyboard Shortcuts

InsightLens is a standard Electron application and inherits the native shortcuts of your platform for common operations.

## System shortcuts

| Action | macOS | Windows / Linux |
| --- | --- | --- |
| Open file / import | `Cmd` + `O` | `Ctrl` + `O` |
| Settings / Preferences | `Cmd` + `,` | `Ctrl` + `,` |
| Minimise window | `Cmd` + `M` | `Win` + `Down` |
| Close window | `Cmd` + `W` | `Ctrl` + `W` |
| Quit | `Cmd` + `Q` | `Alt` + `F4` |
| Copy / Paste | `Cmd` + `C` / `V` | `Ctrl` + `C` / `V` |

The **Open** shortcut triggers the Import menu item, which navigates to the Import page. The **Settings** shortcut opens the Settings page.

## Browser-style shortcuts

Because InsightLens uses react-router internally, back and forward navigation inside the app follows the same keys browsers use:

| Action | macOS | Windows / Linux |
| --- | --- | --- |
| Back | `Cmd` + `[` | `Alt` + `Left` |
| Forward | `Cmd` + `]` | `Alt` + `Right` |

## In the Units page

- Start typing while the page is focused to filter the list.
- `Esc` clears the search box.

## In the Ask InsightLens chat

- `Enter` sends the current message.
- `Shift` + `Enter` inserts a newline without sending.

## No global shortcut overrides

InsightLens does not register any global shortcuts — shortcuts only work when the InsightLens window is focused. That's deliberate: global shortcuts have a habit of colliding with other tools.
