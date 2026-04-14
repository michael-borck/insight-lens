# Importing Survey PDFs

InsightLens imports **PDF survey reports** and extracts the stats and comments into your local database. There is no CSV importer today — everything comes from the PDF.

## What to import

The extractor is tuned for Curtin University's standard unit survey report. Any PDF that follows the same structure (unit code, offering period, overall experience percentages, Likert-style question breakdown, and a comments section) should work. Other institutional formats may extract partially or not at all — in that case the import will be marked as failed and the reason logged in the results list.

## How to import

1. Click **Import** in the sidebar.
2. Drag one or more `.pdf` files onto the drop zone, or click the zone to open a file picker.
3. The selected files appear in a list below the drop zone with size information.
4. Click **Import N File(s)** to run the extractor.
5. Each file gets a status icon:
    - ✅ **Imported** — the survey was extracted and stored.
    - ⚠️ **Duplicate** — a survey for the same unit and offering already exists.
    - ❌ **Failed** — extraction failed; the error is shown next to the row.

A summary card at the bottom shows the totals across all files.

## Duplicate handling

InsightLens treats a survey as a duplicate when the same unit code appears with the same offering period (year + semester). Re-importing the same PDF is safe — it will just be skipped.

If you need to replace an imported survey (for example, because an updated version of the report was issued), delete the original from the database first. A dedicated delete button is on the unit detail page.

## Batch imports

You can drop dozens of PDFs at once. The importer processes them sequentially. The operation runs in the main Electron process so the UI stays responsive, and progress is reported per file in the list. For very large batches, expect a few seconds per file depending on PDF size.

## What gets extracted

For each survey, InsightLens stores:

- Unit code, title, discipline, and campus
- Offering period (year, semester)
- Response counts and response rate
- Overall experience percentage and per-question breakdowns
- Student comments, with each comment stored separately for later sentiment analysis

All of this lives in a single SQLite file (`surveys.db`) so you can back it up or move it to a different machine by copying one file.

## Troubleshooting imports

If an import fails, the most common causes are:

- **Scanned PDFs without a text layer.** The extractor needs selectable text, not raster images. Run the PDF through an OCR tool first.
- **Password-protected PDFs.** Remove the password before importing.
- **Non-standard report formats.** InsightLens targets Curtin's report layout; layouts that shuffle sections around may not parse.

See [Common Issues](../troubleshooting/common-issues.md) for more.
