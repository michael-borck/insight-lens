# Visual Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reskin InsightLens from corporate blue to a warm academic theme (cream backgrounds, serif headings, earth tones).

**Architecture:** Pure CSS/Tailwind changes. Update the Tailwind config with new colour palette, load Google Fonts, then update each component's class names from blue/gray to warm palette tokens. No structural changes.

**Tech Stack:** Tailwind CSS, Google Fonts (Lora + Inter), CSS custom properties

---

### Task 1: Foundation — Tailwind config and CSS

**Files:**
- Modify: `tailwind.config.js`
- Modify: `src/renderer/index.css`

- [ ] **Step 1: Update tailwind.config.js with warm palette and fonts**

```js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/renderer/index.html",
    "./src/renderer/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#faf7f2',
          100: '#f5f0e8',
          200: '#e8e0d4',
          300: '#d4c5a9',
          400: '#c4b08a',
          500: '#a09585',
          600: '#8b7e6a',
          700: '#6b6358',
          800: '#2d3436',
          900: '#1a1f20',
        },
        success: {
          50: '#f0f7f2',
          500: '#4a7c59',
          700: '#365a40',
        },
        warning: {
          50: '#fdf6ee',
          500: '#c17f3e',
          700: '#96602e',
        },
        error: {
          50: '#fdf2f2',
          500: '#b54a4a',
          700: '#8c3838',
        }
      },
      fontFamily: {
        serif: ['Lora', 'Georgia', 'serif'],
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        }
      }
    },
  },
  plugins: [],
}
```

- [ ] **Step 2: Update index.css with Google Fonts import and custom properties**

Add at the top of `src/renderer/index.css`, before the `@tailwind` directives:

```css
@import url('https://fonts.googleapis.com/css2?family=Lora:wght@500;600;700&family=Inter:wght@400;500;600&display=swap');
```

Update the scrollbar colours to warm tones — change `rgb(203 213 225)` to `#d4c5a9` and `rgb(148 163 184)` to `#a09585`.

- [ ] **Step 3: Verify Vite dev server picks up config changes**

Run: restart `npm run dev` (Tailwind config changes require restart)
Expected: app loads without errors, fonts begin downloading

- [ ] **Step 4: Commit**

```bash
git add tailwind.config.js src/renderer/index.css
git commit -m "feat: add warm academic colour palette and font imports"
```

---

### Task 2: Core components — Card and Button

**Files:**
- Modify: `src/renderer/components/Card.tsx`
- Modify: `src/renderer/components/Button.tsx`

- [ ] **Step 1: Update Card border colour**

In `Card.tsx`, change:
```
border border-gray-200
```
to:
```
border border-primary-200
```

- [ ] **Step 2: Update Button variants**

In `Button.tsx`, change the `variants` object to:

```ts
const variants = {
  primary: 'bg-primary-800 text-primary-100 hover:bg-primary-900 focus:ring-primary-300 disabled:bg-gray-300',
  secondary: 'bg-white text-primary-800 border border-primary-200 hover:bg-primary-50 focus:ring-primary-300 disabled:bg-gray-100',
  ghost: 'text-primary-700 hover:bg-primary-50 focus:ring-primary-300',
  danger: 'bg-error-500 text-white hover:bg-error-700 focus:ring-error-500 disabled:bg-gray-300'
};
```

- [ ] **Step 3: Commit**

```bash
git add src/renderer/components/Card.tsx src/renderer/components/Button.tsx
git commit -m "feat: update Card and Button to warm academic palette"
```

---

### Task 3: Layout — sidebar and content area

**Files:**
- Modify: `src/renderer/components/Layout.tsx`

- [ ] **Step 1: Update sidebar background and branding**

Change sidebar container class from:
```
bg-gray-800 shadow-sm border-r border-gray-700
```
to:
```
bg-primary-800 shadow-sm border-r border-primary-900
```

Change logo section border from `border-gray-700` to `border-primary-900`.

Change the logo heading `text-white` to `text-primary-100` and subtitle `text-gray-400` to `text-primary-300`.

Change the collapse button classes from `text-gray-400 hover:text-white hover:bg-gray-700` to `text-primary-500 hover:text-primary-100 hover:bg-primary-900`.

- [ ] **Step 2: Update Quick Insights section**

Change border from `border-gray-700` to `border-primary-900`.

Change heading `text-gray-400` to `text-primary-500`.

Change link classes from `text-gray-300 hover:bg-gray-700 hover:text-white` to `text-primary-500 hover:bg-primary-900 hover:text-primary-100`.

- [ ] **Step 3: Update navigation items**

Change active state from `bg-gray-700 text-white` to `bg-primary-900/50 text-primary-100 border-l-3 border-primary-300`.

Change inactive state from `text-gray-300 hover:bg-gray-700 hover:text-white` to `text-primary-500 hover:bg-primary-900 hover:text-primary-100`.

- [ ] **Step 4: Update App Info section**

Change border from `border-gray-700` to `border-primary-900`.

Change text colours from `text-gray-400`/`text-gray-500`/`text-gray-300` to `text-primary-500`/`text-primary-600`/`text-primary-300`.

Change hover from `hover:bg-gray-700` to `hover:bg-primary-900`.

- [ ] **Step 5: Update content area and top bar**

Change main background from `bg-gray-50` to `bg-primary-50`.

Change top bar from `bg-white border-b border-gray-200` to `bg-primary-50 border-b border-primary-200`.

Change page title from `text-gray-900` to `text-primary-800 font-serif`.

- [ ] **Step 6: Commit**

```bash
git add src/renderer/components/Layout.tsx
git commit -m "feat: update Layout to warm academic theme"
```

---

### Task 4: Dashboard

**Files:**
- Modify: `src/renderer/pages/Dashboard.tsx`

- [ ] **Step 1: Update headings to serif font**

Add `font-serif` to all `h1` and `h2` headings. Change `text-gray-900` to `text-primary-800`. Change `text-gray-500` subtitles to `text-primary-600`.

- [ ] **Step 2: Update stat cards**

Change stat number classes to include `font-serif`. Change icon backgrounds:
- Total Units: `bg-primary-50` with `text-primary-600` icon (was `bg-primary-50`)
- Total Surveys: `bg-success-50` with `text-success-500` icon (was `bg-green-50`)
- Avg Response Rate: `bg-primary-100` with `text-primary-700` icon (was `bg-blue-50`)
- Total Comments: `bg-warning-50` with `text-warning-500` icon (was `bg-purple-50`)

Change stat labels from `text-gray-600` to `text-primary-600`.
Change stat values from `text-gray-900` to `text-primary-800 font-serif`.

- [ ] **Step 3: Update chart and survey sections**

Change section headings from `text-gray-900` to `text-primary-800 font-serif`.
Change links from `text-primary-600 hover:text-primary-700` to `text-success-500 hover:text-success-700`.
Change survey list item text from `text-gray-900`/`text-gray-500` to `text-primary-800`/`text-primary-600`.
Change hover state from `hover:bg-gray-50` to `hover:bg-primary-50`.

- [ ] **Step 4: Update performance cards**

Change top performers border-left from `border-yellow-500` to `border-primary-300`.
Change needs attention border-left from `border-orange-500` to `border-warning-500`.

Change performer card borders from `border-yellow-200` to `border-primary-200`.
Change hover from `hover:bg-yellow-50` to `hover:bg-primary-50`.
Change attention card borders from `border-orange-200` to `border-warning-50`.
Change hover from `hover:bg-orange-50` to `hover:bg-warning-50`.

Change star icon from `text-yellow-600` to `text-primary-300`.
Change alert icon from `text-orange-600` to `text-warning-500`.

Change score colours: green stays as `text-success-500`, orange becomes `text-warning-500`.

- [ ] **Step 5: Update empty state (welcome screen)**

Change icon backgrounds from `bg-primary-50`/`bg-blue-50`/`bg-green-50`/`bg-purple-50` to `bg-primary-100`/`bg-primary-100`/`bg-success-50`/`bg-warning-50`.

Change icon colours to match: `text-primary-700`/`text-primary-700`/`text-success-500`/`text-warning-500`.

Change heading/text from gray to `text-primary-800`/`text-primary-600`.

- [ ] **Step 6: Commit**

```bash
git add src/renderer/pages/Dashboard.tsx
git commit -m "feat: update Dashboard to warm academic theme"
```

---

### Task 5: Chat interfaces

**Files:**
- Modify: `src/renderer/pages/AskInsightLens.tsx`
- Modify: `src/renderer/components/AiChat.tsx`
- Modify: `src/renderer/components/AiChatPreview.tsx`

- [ ] **Step 1: Update AskInsightLens.tsx**

Header: change `text-primary-600` sparkle icon to `text-primary-300`. Change heading to `text-primary-800 font-serif`. Change subtitle to `text-primary-600`.

User message bubble: change `bg-primary-600 text-white` to `bg-primary-800 text-primary-100`.

AI message bubble: change `border-gray-200 text-gray-900` to `border-primary-200 text-primary-800`.

AI avatar: change `bg-primary-100` to `bg-primary-100` (same) and icon from `text-primary-600` to `text-primary-700`.
User avatar: change `bg-primary-100` to `bg-primary-100` and icon from `text-primary-600` to `text-primary-700`.

Suggestion chips: change from `text-primary-700 bg-primary-50 hover:bg-primary-100 border-primary-200` to same tokens (these already map to the new warm palette via Tailwind config).

Input border: change `border-gray-300` to `border-primary-200`. Focus ring: change `focus:ring-primary-500` to `focus:ring-primary-300`.

Input area: change `border-gray-200 bg-white` to `border-primary-200 bg-white`.

Timestamp: change `text-gray-400` to `text-primary-500`.

Loading message: keep as-is (animated spinner).

"Not configured" screen: change `text-gray-400` bot icon to `text-primary-500`. Change heading to `text-primary-800 font-serif`.

- [ ] **Step 2: Update AiChat.tsx (dashboard widget)**

Same colour changes as AskInsightLens:
- Header border: `border-gray-200` → `border-primary-200`
- Bot icon: `text-primary-600` → `text-primary-700`
- Heading: `text-gray-900` → `text-primary-800 font-serif`
- User bubble: `bg-primary-600 text-white` → `bg-primary-800 text-primary-100`
- AI bubble: `bg-gray-100 text-gray-900` → `bg-primary-50 text-primary-800`
- Input border: `border-gray-200` / `border-gray-300` → `border-primary-200`
- Focus ring: `focus:ring-primary-500` → `focus:ring-primary-300`
- Timestamp: `text-gray-500` → `text-primary-500`
- "Not configured" text: gray → primary palette

- [ ] **Step 3: Update AiChatPreview.tsx**

Change bot icon from `text-primary-600` to `text-primary-700`.
Change heading from `text-gray-900` to `text-primary-800 font-serif`.
Change body text from `text-gray-600` to `text-primary-600`.
Change sparkle icons from default to `text-primary-300`.
Change feature text from `text-gray-500` to `text-primary-600`.
Change arrow from `text-gray-400` to `text-primary-500`.
Change "not configured" text from gray to primary palette.

- [ ] **Step 4: Commit**

```bash
git add src/renderer/pages/AskInsightLens.tsx src/renderer/components/AiChat.tsx src/renderer/components/AiChatPreview.tsx
git commit -m "feat: update chat interfaces to warm academic theme"
```

---

### Task 6: Settings and Import pages

**Files:**
- Modify: `src/renderer/pages/Settings.tsx`
- Modify: `src/renderer/pages/Import.tsx`

- [ ] **Step 1: Update Settings.tsx**

Headings: add `font-serif` and change from `text-gray-900` to `text-primary-800`.
Subtitles/help text: change from `text-gray-500` to `text-primary-600`.
Labels: change from `text-gray-700` to `text-primary-700`.

Input fields: change `border-gray-300` to `border-primary-200`, focus ring from `focus:ring-primary-500` to `focus:ring-primary-300`.

Select dropdowns: same border and focus ring changes.

Info box: change `bg-blue-50` to `bg-primary-50`, text from `text-blue-900`/`text-blue-800` to `text-primary-800`/`text-primary-700`.

Gray info box: change `bg-gray-50` to `bg-primary-50`.

Section icons: change from `text-gray-600` to `text-primary-600`.

Green badge ("Auto-detected"): keep green — it's semantic.

- [ ] **Step 2: Update Import.tsx**

Headings: add `font-serif`, change from `text-gray-900` to `text-primary-800`.
Subtitle: change from `text-gray-500` to `text-primary-600`.

Dropzone: change `border-gray-300 hover:border-gray-400` to `border-primary-200 hover:border-primary-300`.
Dropzone active: change `border-primary-500 bg-primary-50` to `border-primary-300 bg-primary-50`.
Upload icon: change `text-gray-400` to `text-primary-500`.

File list item background: change `bg-gray-50` to `bg-primary-50`.
File name: `text-gray-900` → `text-primary-800`. Size: `text-gray-500` → `text-primary-600`.
File icon: `text-gray-400` → `text-primary-500`.

Success/warning/error colours: change to `success-500`/`warning-500`/`error-500`.

Import summary heading: `text-gray-900` → `text-primary-800 font-serif`.

- [ ] **Step 3: Commit**

```bash
git add src/renderer/pages/Settings.tsx src/renderer/pages/Import.tsx
git commit -m "feat: update Settings and Import to warm academic theme"
```

---

### Task 7: Remaining pages and chart colours

**Files:**
- Modify: `src/renderer/components/charts/LineChart.tsx` — change `#3b82f6` to `#4a7c59`
- Modify: `src/renderer/components/charts/BarChart.tsx` — change `#3b82f6` to `#4a7c59`
- Skim and update: `src/renderer/pages/Units.tsx`, `src/renderer/pages/UnitDetail.tsx`, `src/renderer/pages/PerformanceReports.tsx`, `src/renderer/pages/PromotionSuggestions.tsx`, `src/renderer/pages/Documentation.tsx`, `src/renderer/pages/About.tsx`

- [ ] **Step 1: Update chart accent colours**

In `LineChart.tsx` and `BarChart.tsx`, find the blue hex `#3b82f6` and replace with `#4a7c59` (forest green).

- [ ] **Step 2: Sweep remaining pages for gray/blue references**

In each remaining page file, apply the same pattern:
- `text-gray-900` headings → `text-primary-800 font-serif`
- `text-gray-500`/`text-gray-600` → `text-primary-600`
- `text-gray-700` → `text-primary-700`
- `bg-gray-50` → `bg-primary-50`
- `border-gray-200`/`border-gray-300` → `border-primary-200`
- `hover:bg-gray-50` → `hover:bg-primary-50`
- `text-primary-600 hover:text-primary-700` links → `text-success-500 hover:text-success-700`
- Focus rings: `focus:ring-primary-500` → `focus:ring-primary-300`

- [ ] **Step 3: Commit**

```bash
git add src/renderer/components/charts/ src/renderer/pages/
git commit -m "feat: update remaining pages and charts to warm academic theme"
```

---

### Task 8: Visual verification

- [ ] **Step 1: Restart the dev server**

Run: stop and restart `npm run dev` (required for Tailwind config changes)

- [ ] **Step 2: Walk through every page**

Check each page visually:
- Dashboard (with data and empty state)
- Units list
- Unit detail
- Ask InsightLens (send a test message)
- Import (drag zone)
- Settings
- Performance Reports
- Promotion Suggestions
- Documentation
- About

Verify: cream backgrounds, serif headings, warm borders, no leftover blue, charts in forest green.

- [ ] **Step 3: Fix any remaining cold colours**

Search codebase for remaining references: `grep -r "gray-800\|gray-700\|blue-\|#3b82f6" src/renderer/`

Fix any stragglers.

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "fix: clean up remaining cold colour references"
```
