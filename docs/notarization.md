# macOS code signing & notarization

How the macOS build is signed and notarized so the DMG opens without Gatekeeper
warnings. Modeled on the talk-buddy pipeline.

## How it works

- electron-builder config lives in `package.json`'s `build` block.
- macOS notarization runs from a custom **afterSign hook** at [`scripts/notarize.js`](../scripts/notarize.js).
- electron-builder's own notarize wrapper is disabled (`build.mac.notarize: false`); the hook calls `@electron/notarize` directly (`notarytool`) and staples the ticket.
- `build.mac.hardenedRuntime: true` (required for notarization). Entitlements are auto-applied from `build/entitlements.mac.plist`.
- CI passes the Developer ID cert via `CSC_LINK`/`CSC_KEY_PASSWORD` (electron-builder imports it — no manual keychain step), and Apple credentials under **renamed** `NOTARIZE_APPLE_*` env vars so electron-builder's broken auto-notarize doesn't fire alongside the hook.

## Required GitHub Actions secrets

`Settings → Secrets and variables → Actions`:

| Secret | What it is |
|---|---|
| `MACOS_CERTIFICATE` | base64 of the Developer ID Application `.p12` (already used) |
| `MACOS_CERTIFICATE_PWD` | password used when exporting the `.p12` (already used) |
| `APPLE_ID` | **(new)** Apple ID email on the Developer Program |
| `APPLE_ID_PASSWORD` | **(new)** an app-specific password (NOT the Apple ID password) — appleid.apple.com → Sign-In and Security → App-Specific Passwords |
| `APPLE_TEAM_ID` | **(new)** 10-char team ID — developer.apple.com/account → Membership |

Until the three new secrets are set, the build still succeeds — the hook logs `[notarize] Skipping …` and the DMG is signed but not notarized.

## Verify a built DMG

```bash
spctl -a -vvv -t install ~/Downloads/InsightLens-*.dmg     # → "accepted, source=Notarized Developer ID"
xcrun stapler validate ~/Downloads/InsightLens-*.dmg       # → "The validate action worked!"
```

## Common failures

- `[notarize]` lines absent → hook not running. Check `scripts/notarize.js` still uses `exports.default = …` (not `module.exports`).
- `403 … agreement is missing or has expired` → sign pending agreements at developer.apple.com / appstoreconnect.com, wait ~10 min, re-run: `gh run rerun <run-id> --failed`.
- `401 / invalid credentials` → app-specific password revoked; regenerate and update `APPLE_ID_PASSWORD`.
