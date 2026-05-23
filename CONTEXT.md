# InsightLens Context

Architecture and domain context for InsightLens. This file names the recurring **seams** in the code and the project-specific concepts behind them, so future work (and architecture reviews) share one vocabulary. User-facing definitions of survey nouns (Unit, Offering, Survey, Comment, Benchmark, Sentiment, Promotion Suggestion) live in `docs/reference/glossary.md`; this file adds the architectural terms.

## Language

**AI Client**:
The single main-process module that talks to an LLM behind one interface — `complete(req, cfg) → text`. It owns transport, provider selection, error mapping, and JSON-fence stripping; it knows nothing about Units or Surveys. Lives at `src/main/ai/`.
_Avoid_: AI service (that name belongs to the renderer-side thin IPC wrapper `aiService.ts`), LLM wrapper.

**Provider**:
A configured LLM backend the AI Client can talk to — one of `anthropic | gemini | groq | openrouter | openai | custom`. `custom` is any OpenAI-compatible endpoint with a user-supplied base URL (Ollama, localhost, self-hosted). Each Provider is one row in the provider registry, holding its base URL, env-var key names, and the functions to build the request and parse the response.
_Avoid_: model (a model is a string a Provider serves, e.g. `gpt-4o-mini`), backend, vendor.

**Effective key**:
The API key the AI Client actually uses for a request: the user-stored key if present, otherwise the value of the Provider's environment variable. Resolved once, in the main process — never sent to the renderer.
_Avoid_: API key (ambiguous between the stored value and the resolved one).

**Settings of record**:
The persistent settings in electron-store (main process) — the single source of truth. The renderer's zustand `settings` is a derived, write-through view: hydrated from `settings:get` on startup and updated from the canonical object `settings:set` returns, never from a local guess. It never holds the **Effective key**; a key the user types lives only as a transient field in the Settings form (flows in, never out).
_Avoid_: settings store / app state (ambiguous between the source of truth and the derived view).

**Query spec**:
A structured description of *what data is wanted* that the renderer (and the AI) sends instead of SQL. Comes in two kinds — a **List query** and an **Aggregate query**. Carries filter *values* as bound parameters; never carries SQL text.
_Avoid_: query string, SQL (the spec is the opposite of raw SQL).

**List query**:
A Query spec that returns rows: `{ resource, filters, select, sort, limit }`. `resource` and `select` columns are drawn from an allowlist per resource (`units`, `unitSurveys`, `comments`, `surveyResults`).
_Avoid_: select, find.

**Aggregate query**:
A Query spec that returns aggregated rows over the survey **star schema**: `{ measure, agg, by:[dimension], filters }`. A `by` with no `measure` yields the distinct values of a Dimension (used to fill filter dropdowns).
_Avoid_: report, rollup.

**Dimension** / **Measure**:
The allowlisted fields of the survey star schema an Aggregate query may group by or aggregate. Dimensions are the things you slice by (`year`, `semester`, `campus`, `discipline`, `question`, `unitCode`, `sentimentLabel`); Measures are the numbers you aggregate (`overallExperience`, `responseRate`, `percentAgree`, `sentimentScore`, counts).
_Avoid_: column, field (those are physical; Dimension/Measure are the allowlisted logical names).

**Query translator**:
The single main-process module (`src/main/queries/`) that turns a Query spec into parameterised SQL. It is the *only* place SQL is built; it enforces the Dimension/Measure/resource allowlists and binds all values. Pure and testable without Electron.
_Avoid_: query builder, ORM, repository.

**Importer**:
The main-process module (`src/main/importer.ts`) that persists *one* extracted survey into the database. Owns campus normalization, required-field validation, the duplicate check, and the atomic intake transaction. Takes the **Extractor**'s output; the per-batch loop and result tally stay in the IPC handler.
_Avoid_: import service, ingester, loader.

**Offering identity**:
The tuple that uniquely identifies an **Offering** and so defines a duplicate import: `unit_code + year + term/semester + campus + mode`. Re-importing the same identity is reported as a duplicate, not an error.
_Avoid_: survey key, unique key.

**Promotion module**:
The main-process module that, given a unit code or filters, produces a **Promotion Suggestion** report. It hides analysis (querying + ACF evidence) and report generation/formatting behind identifier-based entry points (`findPromotionCandidates`, `buildPromotionReport`, `buildPromotionSummary`, `exportPromotionReport`). Rich objects (`UnitPromotionData`, `PromotionReport`) never cross to the renderer.
_Avoid_: promotion analyzer / promotion generator as separate public modules (those are now its internal steps); `acfFramework` (that is the ACF **reference** data the module consumes, not the module).

## Flagged ambiguities

- **Discipline (glossary vs code).** `docs/reference/glossary.md` says *Discipline is "Extracted from the survey report header,"* but the import write path currently **hardcodes** `discipline = 'GENERAL'` (and `academic_level = 'UG'`, `institution = 'Curtin University'`). Resolution: known gap, deliberately deferred. Candidate 3 relocates these defaults **unchanged** into the **Importer**; populating Discipline from the PDF header is a separate, behaviour-changing task that needs sample PDFs. Do not re-flag this as new friction.

## Example dialogue

> **Dev:** When the user picks Anthropic in Settings, where does the `anthropic-version` header get set?
> **Domain:** That's the **Provider**'s job. The `anthropic` row in the registry owns its headers. The **AI Client** just looks up the Provider on the `provider` field and calls its `buildHeaders`.
> **Dev:** And if they're running Ollama locally?
> **Domain:** That's the `custom` Provider — OpenAI-compatible shape, but the base URL comes from Settings instead of a default.
> **Dev:** Who decides whether to use the stored key or the env var?
> **Domain:** Neither the renderer nor the Provider — the main process resolves the **effective key** before calling `complete`. The renderer never sees it.
