# App data access via a named-query Repository; AI uses a sandboxed read-only SQL channel

Status: accepted — supersedes the query-spec design grilled on 2026-05-23

## Context

The renderer sent ~30 raw SQL strings through one wide `db:query` IPC channel with
string-interpolated values (an injection seam), and schema knowledge was spread across nine files.
We first designed a generic two-spec model (`ListQuery` + `AggregateQuery` translated by a
`toSql` function). Cataloguing every query showed ~22 fit a generic spec but 5 do not —
`GROUP_CONCAT` rollups, CTEs, correlated/`MAX` subqueries, and `CASE` classification — and a spec
stretched to cover them becomes SQL-as-JSON (shallow). Crucially, the app's query set is **finite
and known**; only the Ask InsightLens AI feature composes **unbounded, novel** queries.

## Decision

- **App queries** are a **Repository** of named, intention-revealing functions in
  `src/main/queries/`, each owning its parameterised SQL (e.g. `getDashboardSummary`,
  `getPerformanceUnits`, `getTrendingUp`). They are exposed to the renderer through a single typed
  `query(name, params)` IPC dispatcher. There is no query DSL, translator, or ORM.
- **AI queries** (the one unbounded caller) run through a hardened, separate
  `db:queryReadonly(sql)` channel: a `readonly` SQLite connection, a single-statement SELECT-only
  guard, and a row cap. The AI keeps full SQL expressiveness; write/injection risk is eliminated
  structurally.
- The wide `db:query` and the (renderer-unused) `db:execute` channels are removed.

## Why not a query builder / the two-spec model

Building a spec→SQL translator for a finite, known query set is over-engineering: it pays an
abstraction tax forever, still chases SQL's feature tail (the 5 specials are the canary), and
leaks schema concepts (resource/dimension/column names) back into the renderer. Named functions
are deeper (large SQL behind a small name), simpler (no translator to build or maintain), and
concentrate all SQL in one module. Serving both the finite app and the unbounded AI through one
generic mechanism was the root error; splitting them makes both simpler and writes less code.
