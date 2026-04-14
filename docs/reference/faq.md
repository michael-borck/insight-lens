# FAQ

## Is my survey data sent anywhere?

No — not unless you explicitly configure a cloud AI provider and then ask a question. Imports, charts, filtering, reports, and exports all run locally against a SQLite file on your machine.

## Does InsightLens work offline?

Yes. The only feature that requires a network connection is the optional AI assistant, and even that can run fully offline if you point it at a local Ollama instance.

## What PDF formats are supported?

The extractor is tuned for Curtin University's standard unit survey report. Other institutional formats that follow a similar structure may work; formats that reorganise sections will not.

## Can I import CSV files?

Not at the moment. Import is PDF-only. If this is a blocker for you, please [open an issue](https://github.com/michael-borck/insight-lens/issues) describing the CSV format you have.

## Where is my database stored?

By default, in the OS user-data directory (`~/Library/Application Support/InsightLens` on macOS, `%APPDATA%\InsightLens` on Windows, `~/.config/InsightLens` on Linux). You can change the location from **Settings → Data Storage**.

## How do I back up my data?

Copy `surveys.db`. A cloud-synced folder like Dropbox, OneDrive, iCloud Drive, or Google Drive will back it up automatically.

## How do I move my data to another machine?

Install InsightLens on the new machine, copy `surveys.db` onto it, and point Settings → Data Storage at the new location.

## Can multiple people share a database?

Technically yes — put the database in a shared folder and point multiple installs at it. In practice, SQLite isn't designed for multi-writer workloads, so concurrent imports from different machines can corrupt the file. Treat it as a single-user database.

## Which AI provider should I pick?

If you want strong answers and don't mind paying per use, OpenAI or Anthropic are the most consistent. If you want to stay offline, Ollama with a model like `llama3.1` is fine for most questions. If cost is the main concern, Groq or OpenRouter both offer free tiers.

## Do I need an API key to use InsightLens at all?

No. The AI assistant is optional. Everything else works without a key.

## How do I update?

When a new release is available, InsightLens shows an update notification. You can also download the latest installer from the [Releases page](https://github.com/michael-borck/insight-lens/releases) at any time.

## How is this different from the university's own analytics?

InsightLens is a local tool for lecturers who want their own view of their own units without going through institutional dashboards. It's not a replacement for official reporting — it's a sidecar for the day-to-day work of reading your own surveys.

## How do I report a bug or request a feature?

Open an issue at [github.com/michael-borck/insight-lens/issues](https://github.com/michael-borck/insight-lens/issues). Please include your platform, the InsightLens version (shown at the bottom of the sidebar), and steps to reproduce if possible.
