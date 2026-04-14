# Performance Reports

The **Performance Reports** page is the full-page version of the Top Performers and Units Needing Attention cards on the dashboard. Open it from the sidebar.

## What's on the page

The page is split into two main views:

- **Top Performers** — units with strong overall experience (≥ 85 %) across recent offerings, grouped by semester and sorted by score.
- **Units Needing Attention** — units whose scores are trending down, sitting below benchmark, or have very low response rates that make their stats unreliable.

A type switcher at the top of the page lets you focus on one list at a time. The URL also supports `?type=star-performers` for linking straight to a specific view, which is what the dashboard "View All" links use.

## Time window

Both lists default to the last 12 months of offerings. If you need a longer window, the assistant on the [Ask InsightLens](../ai-chat/asking-questions.md) page is better suited — it can run arbitrary queries.

## Exporting

Each list has two export buttons:

- **CSV** — a flat comma-separated file suitable for spreadsheets.
- **Report** — a Markdown document with a short narrative, the ranked list, and notes about each unit. Useful for sharing with course coordinators or for pasting into a promotion file.

Both exports open a save dialog; the file stays on your machine. No data is transmitted anywhere during export.

## How "needing attention" is calculated

A unit shows up here when one or more of the following is true for its recent offerings:

- Overall experience is below institutional benchmark.
- Overall experience is trending down across consecutive offerings.
- Response rate is too low to trust the reported score.

Because the rule is a combination, a unit can move in and out of the list as new surveys are imported. Re-run the report whenever you add data.
