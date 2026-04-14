# Installation

InsightLens is a desktop application built with Electron. Download the installer for your operating system from the [Releases page](https://github.com/michael-borck/insight-lens/releases) and run it.

## System requirements

- **macOS** 11 (Big Sur) or later — Intel or Apple Silicon
- **Windows** 10 or later (64-bit)
- **Linux** — any modern distribution that can run AppImages
- **RAM** 4 GB minimum, 8 GB recommended
- **Disk** around 500 MB for the app, plus space for your survey database

## Download

1. Open the [Releases page](https://github.com/michael-borck/insight-lens/releases).
2. Expand the **Assets** section of the latest release.
3. Download the file for your platform:
   - **macOS**: `InsightLens-<version>.dmg`
   - **Windows**: `InsightLens-Setup-<version>.exe`
   - **Linux**: `InsightLens-<version>.AppImage`

Release artifacts are built by a GitHub Actions workflow on every version tag, so the file name always matches the current version.

## Install

### macOS

1. Open the downloaded `.dmg`.
2. Drag **InsightLens** into your **Applications** folder.
3. Launch it from Launchpad or Spotlight.

If Gatekeeper warns about an unidentified developer, right-click the app in Applications and choose **Open** once.

### Windows

1. Run the downloaded `.exe` installer.
2. Follow the prompts — the defaults are fine.
3. Launch **InsightLens** from the Start menu or desktop shortcut.

### Linux

1. Make the AppImage executable:

    ```
    chmod +x InsightLens-*.AppImage
    ```

2. Double-click it, or run it from the terminal.

## Verifying the version

The sidebar shows the current version at the bottom left, and the About page shows the same thing. It should match the release you downloaded.

## Updating

When a new release is available, InsightLens shows an update notification. Follow the prompt, or grab the latest build from the Releases page manually.

## Uninstalling

- **macOS** — drag **InsightLens** from Applications to the Trash.
- **Windows** — uninstall via **Settings → Apps**.
- **Linux** — delete the AppImage file.

Your survey database lives outside the application bundle (see [First Run](first-run.md) for the default location), so uninstalling the app does not delete your data. Remove the database folder separately if you want a clean wipe.
