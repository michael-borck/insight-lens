# InsightLens Visual Refresh — Warm Academic Theme

## Overview

Reskin the InsightLens Electron app from its current generic corporate-blue Tailwind aesthetic to a "warm academic" theme. The audience is university lecturers analysing student Insight Surveys. The design should feel scholarly, calm, and trustworthy — like a well-made research tool, not a developer dashboard.

This is a CSS/Tailwind-only change. No structural, routing, or component architecture changes.

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Aesthetic direction | Warm Academic | Cream backgrounds, earth tones, serif headings — fits academic audience |
| Sidebar | Dark charcoal | Strong contrast with content area; clear navigation boundary |
| Typography | Lora + Inter | Classic serif/sans pairing; scholarly but highly readable |
| Dark mode | No | Single well-designed theme; lecturers don't toggle themes |

## Colour Palette

All colours defined as CSS custom properties and extended into Tailwind config.

### Core

| Token | Hex | Usage |
|-------|-----|-------|
| `--bg-page` | `#faf7f2` | Page/content area background |
| `--bg-card` | `#ffffff` | Card backgrounds |
| `--border-card` | `#e8e0d4` | Card and divider borders |
| `--bg-sidebar` | `#2d3436` | Sidebar background |
| `--sidebar-border` | `rgba(255,255,255,0.1)` | Sidebar internal dividers |

### Accent

| Token | Hex | Usage |
|-------|-----|-------|
| `--accent-gold` | `#d4c5a9` | Active sidebar item, branding accent |
| `--accent-gold-subtle` | `rgba(212,197,169,0.15)` | Active sidebar item background |
| `--success` | `#4a7c59` | Positive scores, upward trends, connected status |
| `--warning` | `#c17f3e` | Attention needed, moderate scores |
| `--error` | `#b54a4a` | Failed states, low scores, disconnected |

### Text

| Token | Hex | Usage |
|-------|-----|-------|
| `--text-primary` | `#2d3436` | Headings, primary content |
| `--text-secondary` | `#8b7e6a` | Descriptions, help text |
| `--text-muted` | `#6b6358` | Labels, uppercase captions |
| `--text-sidebar` | `#a09585` | Inactive sidebar items |
| `--text-sidebar-active` | `#f5f0e8` | Active sidebar item text |

## Typography

### Fonts

- **Headings & stat numbers:** Lora (serif), loaded from Google Fonts, weights 500 and 700
- **Body, labels, UI:** Inter (sans-serif), loaded from Google Fonts, weights 400, 500, and 600
- **Fallback stack:** Georgia (serif fallback), system-ui (sans fallback)

### Scale

| Element | Font | Size | Weight |
|---------|------|------|--------|
| Page title (h1) | Lora | 24px (text-2xl) | 700 |
| Section heading (h2) | Lora | 18px (text-lg) | 600 |
| Card heading (h3) | Lora | 16px (text-base) | 500 |
| Stat numbers | Lora | 30px (text-3xl) | 600 |
| Body text | Inter | 14px (text-sm) | 400 |
| Labels/captions | Inter | 12px (text-xs) | 500, uppercase, tracking-wider |
| Help text | Inter | 12px (text-xs) | 400 |

## Components to Update

### Sidebar (`Layout.tsx`)

- Background: `bg-gray-800` → `bg-[#2d3436]`
- Logo text: white with Lora serif font
- Active nav item: warm gold left border + subtle gold background
- Inactive items: `#a09585` text, hover to `#f5f0e8`
- Section labels (Quick Insights, etc.): `#6b6358` uppercase
- AI status dot stays as-is (green/red/yellow)

### Content area (`Layout.tsx`)

- Background: `bg-gray-50` → `bg-[#faf7f2]`
- Top bar: white → `bg-[#faf7f2]` with `border-[#e8e0d4]`
- Page title: Lora serif

### Cards (`Card.tsx`)

- Border: `border-gray-200` → `border-[#e8e0d4]`
- Background stays white
- Border radius: keep `rounded-lg`
- Shadow: keep `shadow-sm`

### Dashboard (`Dashboard.tsx`)

- Stat card icons: replace blue/green/purple tints with warm tones
  - Units: warm gold background with charcoal icon
  - Surveys: light green background with forest green icon
  - Response rate: cream background with earth tone icon
  - Comments: light warm background with muted icon
- Stat numbers: Lora serif font
- Top performers border-left: keep yellow-500 (works with palette)
- Needs attention border-left: `#c17f3e` (warm amber)
- Chart accent colour: `#4a7c59` (forest green)

### Chat (`AskInsightLens.tsx`)

- User message bubble: `bg-[#2d3436]` with white text (matches sidebar)
- AI message bubble: white with `border-[#e8e0d4]`
- AI avatar circle: warm gold background
- Suggestion chips: warm gold tint border and background
- Input area background: white

### Settings (`Settings.tsx`)

- Primary button: `bg-[#2d3436]` with warm text
- Secondary button: white with warm border
- Focus ring: `ring-[#d4c5a9]` (gold)
- Info boxes: warm cream tint instead of blue-50

### Buttons (`Button.tsx`)

- Primary: `bg-[#2d3436] text-[#f5f0e8]` hover to lighter
- Secondary: `bg-white border-[#e8e0d4]` hover to cream
- Ghost: transparent, hover to cream
- Danger: `bg-[#b54a4a]` (stays red-toned)

### Empty states (`Dashboard.tsx`)

- Icon backgrounds: use warm palette tints instead of blue-50/green-50/purple-50
- Button: charcoal primary style

### Import (`Import.tsx`)

- Dropzone active border: warm gold instead of primary-500
- Success/warning/error colours: forest green / warm amber / muted red

## Files Modified

1. `tailwind.config.js` — new colour tokens, font family extension
2. `src/renderer/index.css` — Google Fonts import, CSS custom properties
3. `src/renderer/components/Layout.tsx` — sidebar and content area colours
4. `src/renderer/components/Card.tsx` — border colour
5. `src/renderer/components/Button.tsx` — all variant colours
6. `src/renderer/pages/Dashboard.tsx` — stat cards, performance cards, chart colours
7. `src/renderer/pages/AskInsightLens.tsx` — chat bubble colours, suggestion chips
8. `src/renderer/pages/Settings.tsx` — info boxes, focus rings
9. `src/renderer/pages/Import.tsx` — dropzone colours
10. `src/renderer/components/AiChat.tsx` — chat bubble colours (dashboard widget)
11. `src/renderer/components/AiChatPreview.tsx` — preview card colours

## Out of Scope

- Dark mode / theme toggle
- Navigation restructuring (already addressed in UX fixes)
- New features or pages
- Chart library changes (just colour updates)
- Component architecture changes
