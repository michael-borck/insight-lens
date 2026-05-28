// Ambient declaration for d3 — the project's d3 usage is concentrated in a
// few chart components (WordCloud, etc.) that don't need full type-fidelity
// to be useful. Avoid pulling in @types/d3 (~MB of types, version-coupled
// to d3) for this small surface; the components annotate their own callback
// params as `any` where strict mode would otherwise reject implicit-any.
//
// If the d3 surface grows substantially, swap this for `@types/d3` and
// remove the per-param `: any` annotations.
declare module 'd3';
