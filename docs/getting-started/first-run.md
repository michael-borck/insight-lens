# First Run

The first time you open InsightLens you'll see a short **welcome screen** with five slides covering what the app does, how to import data, how to use the dashboard, the optional AI assistant, and the privacy model.

- **Skip for now** — closes the splash but keeps it enabled for next launch.
- **Don't show this again on startup** — tick this before closing if you don't want to see it again. You can re-enable it any time from **Settings → General**.
- **Open documentation** — takes you straight here.

## Where your data is stored

InsightLens stores everything locally in a SQLite file called `surveys.db`. By default it lives in your user data directory:

- **macOS**: `~/Library/Application Support/InsightLens/surveys.db`
- **Windows**: `%APPDATA%\InsightLens\surveys.db`
- **Linux**: `~/.config/InsightLens/surveys.db`

You can move the database to a different folder from **Settings → Data Storage**. A cloud-synced folder like Dropbox, OneDrive, iCloud Drive, or Google Drive gives you automatic backup across machines.

## Recommended first steps

1. **Choose where to store your database.** Open **Settings** and pick a folder if you don't want the default.
2. **Import a survey or two.** Go to **Import** and drag a PDF survey report onto the drop zone. See [Importing Survey PDFs](../essential-workflow/importing-data.md).
3. **Look at the dashboard.** Once you have data, the [Dashboard](dashboard-overview.md) will light up with stats, trend charts, and highlight cards.
4. **(Optional) Set up the AI assistant.** If you want to ask questions in plain English, see [Setting Up an AI Provider](../ai-chat/setup-ai-providers.md). You need to bring your own API key; InsightLens ships with no hardcoded provider.

## Nothing gets sent anywhere

Until you explicitly configure an AI provider, InsightLens makes no network calls with your survey data. Imports, charts, filtering, reports, and exports all run locally against your SQLite database.
