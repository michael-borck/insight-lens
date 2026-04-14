# Glossary

Short definitions for terms used throughout InsightLens and its documentation.

**Benchmark** — An institutional reference score used to flag units whose overall experience sits below expectation. Used on the Performance Reports page.

**Campus** — The physical location where a unit is offered. Multi-campus units can be filtered by campus on the Units page.

**Comment** — A free-text response from a student, extracted from the comments section of a survey report and stored as an individual row so it can be analysed separately.

**Course Improvement** — A bundled view on the Unit Detail page that combines a trend chart, comment themes, and (optionally) AI-assisted suggestions into a short report.

**Discipline** — The broad subject area a unit belongs to, e.g. Information Systems, Marketing. Extracted from the survey report header.

**Extractor** — The component in the main Electron process that reads a PDF survey report and pulls out structured fields (unit code, scores, comments, etc.).

**Offering** — A single instance of a unit being delivered in a particular year, semester, and campus. One unit can have many offerings.

**Overall Experience** — The headline percentage InsightLens reports for a unit. It's the same number the original PDF calls "overall experience" or equivalent.

**Promotion Suggestion** — A unit identified by InsightLens as having a strong enough track record to be useful evidence in an academic promotion case. See [Promotion Suggestions](../reports/promotion-suggestions.md).

**Quick Insights** — The two shortcut links at the top of the sidebar (Trending Up, Need Attention) that jump to filtered dashboard views.

**Response Rate** — The percentage of enrolled students who completed the survey. A low response rate makes the reported scores less reliable.

**Sentiment** — A label (positive / neutral / negative) assigned to each student comment by a local text-analysis step. No external service is called.

**Star Performer** — A unit with overall experience at or above 85 % in recent offerings. Highlighted on the Dashboard and full list on the Performance Reports page.

**Surveys Database** — The single SQLite file (`surveys.db`) InsightLens uses to store everything. Backing up the file backs up all your data.

**Unit** — A single course or subject (e.g. ISYS2001). The entity at the centre of most InsightLens views.
