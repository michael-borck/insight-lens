# Common Issues

If something goes wrong, start here. The issues below cover the most common reports.

## Import

### "Failed" status on a PDF

The extractor targets the standard Curtin unit survey report layout. Imports fail most often because:

- **The PDF has no text layer.** Scanned documents need OCR first. On macOS, Preview → Export As → PDF with OCR works; on Windows and Linux, [OCRmyPDF](https://ocrmypdf.readthedocs.io/) is a good free option.
- **The PDF is password-protected.** Remove the password and try again.
- **The layout is non-standard.** Reports from other institutions, or custom formats, may not parse cleanly.

The import summary shows a per-file error message to help you narrow down the cause.

### "Duplicate" on a file you want to re-import

A survey is considered a duplicate when the same unit code and offering period already exist in the database. This is usually what you want — re-importing the same file is harmless. If you need to replace an offering because an updated report was issued, open the unit detail page, delete the offending offering, and re-import.

## Dashboard / charts

### "No trend data available" in the trend card

You need at least two imported offerings across different semesters before the trend chart has anything to plot. Import another survey.

### Numbers look wrong

Open the unit detail page and cross-check against the original PDF. If the numbers in InsightLens differ from the PDF, the extractor probably misread a section — please [report an issue](https://github.com/michael-borck/insight-lens/issues) with the PDF attached if you can share it, or a redacted version if not.

## AI assistant

### "Connection failed" when testing

- Double-check the API key field. For cloud providers, the key must match the account that owns the URL.
- If you're using an environment variable, make sure it was set in the same shell that launched InsightLens — Electron apps don't always inherit variables you set after launch.
- For Ollama, check the service is actually running (`ollama list` in a terminal should return without error).

### The assistant answers with an empty result

Usually the question was too specific for the data you have. Try broader filters, or open the Units page and confirm the data exists.

### I don't want to use AI at all

That's the default. Leave **Settings → AI Assistant** unconfigured and InsightLens will make no AI-related network calls. The Dashboard's "Ask InsightLens" card will point to Settings instead of showing a chat input.

## Window / UI

### Traffic-light buttons overlap the sidebar on macOS

This was fixed in a recent release. If you're still seeing it, update to the latest build from the [Releases page](https://github.com/michael-borck/insight-lens/releases).

### I can't drag the window by the top of the sidebar

The top strip of the sidebar is draggable; the collapse chevron button is not (that's intentional so it still registers as a click). If the sidebar top still doesn't drag the window, restart InsightLens — the drag region is applied once on mount.

## Data and backup

### Where's my database?

See [First Run](../getting-started/first-run.md#where-your-data-is-stored). You can move it any time from **Settings → Data Storage**.

### How do I back up?

Copy `surveys.db`. That's it — InsightLens stores everything in a single file. Keeping the file in a cloud-synced folder gives you automatic versioning for free.

## Still stuck?

If none of the above matches, please [open an issue on GitHub](https://github.com/michael-borck/insight-lens/issues) with:

- What you were doing
- What you expected to happen
- What actually happened
- Your platform and InsightLens version (shown at the bottom of the sidebar)
