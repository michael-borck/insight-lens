/**
 * In-app documentation registry.
 *
 * Every doc page is a markdown file under the project-root `/docs/` folder
 * that's imported here at build time via Vite's `?raw` suffix. The structure
 * below controls the sidebar order, display titles, and slugs used in URLs.
 *
 * Adding a new page:
 *   1. Create the markdown file under the appropriate docs/ subfolder
 *   2. Add an entry to the right category below
 *   3. The new page is reachable at /docs/{categorySlug}/{pageSlug}
 *
 * No external network calls. The markdown files under /docs/ are the single
 * source of truth and are bundled into the renderer at build time.
 */

import {
  Rocket,
  Workflow,
  Bot,
  BarChart3,
  Award,
  AlertCircle,
  Library,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

// Getting Started
import gsInstallation from '@docs/getting-started/installation.md?raw';
import gsFirstRun from '@docs/getting-started/first-run.md?raw';
import gsDashboard from '@docs/getting-started/dashboard-overview.md?raw';
import gsSidebar from '@docs/getting-started/sidebar-navigation.md?raw';

// Essential Workflow
import ewImporting from '@docs/essential-workflow/importing-data.md?raw';
import ewTrends from '@docs/essential-workflow/exploring-trends.md?raw';
import ewFiltering from '@docs/essential-workflow/unit-filtering.md?raw';
import ewUnitDetail from '@docs/essential-workflow/unit-detail.md?raw';

// AI Chat
import aiSetup from '@docs/ai-chat/setup-ai-providers.md?raw';
import aiAsking from '@docs/ai-chat/asking-questions.md?raw';

// Reports & Insights
import rpPerformance from '@docs/reports/performance-reports.md?raw';
import rpPromotion from '@docs/reports/promotion-suggestions.md?raw';

// Troubleshooting
import tsCommon from '@docs/troubleshooting/common-issues.md?raw';

// Reference
import refFaq from '@docs/reference/faq.md?raw';
import refGlossary from '@docs/reference/glossary.md?raw';
import refKeyboard from '@docs/reference/keyboard-shortcuts.md?raw';

export interface DocPage {
  slug: string;
  title: string;
  summary?: string;
  content: string;
}

export interface DocCategory {
  slug: string;
  title: string;
  icon: LucideIcon;
  pages: DocPage[];
}

export const docCategories: DocCategory[] = [
  {
    slug: 'getting-started',
    title: 'Getting Started',
    icon: Rocket,
    pages: [
      {
        slug: 'installation',
        title: 'Installation',
        summary: 'Download and install InsightLens on macOS, Windows, or Linux.',
        content: gsInstallation,
      },
      {
        slug: 'first-run',
        title: 'First Run',
        summary: 'What to expect the first time you open InsightLens.',
        content: gsFirstRun,
      },
      {
        slug: 'dashboard-overview',
        title: 'Dashboard Overview',
        summary: 'Understand the widgets on the main dashboard.',
        content: gsDashboard,
      },
      {
        slug: 'sidebar-navigation',
        title: 'Sidebar Navigation',
        summary: 'Tour of every page reachable from the left sidebar.',
        content: gsSidebar,
      },
    ],
  },
  {
    slug: 'essential-workflow',
    title: 'Essential Workflow',
    icon: Workflow,
    pages: [
      {
        slug: 'importing-data',
        title: 'Importing Survey PDFs',
        summary: 'Drag-and-drop import, duplicate handling, and extraction details.',
        content: ewImporting,
      },
      {
        slug: 'exploring-trends',
        title: 'Exploring Trends',
        summary: 'Read the dashboard trend chart and drill into semesters.',
        content: ewTrends,
      },
      {
        slug: 'unit-filtering',
        title: 'Browsing & Filtering Units',
        summary: 'Search, filter, and sort units on the Units page.',
        content: ewFiltering,
      },
      {
        slug: 'unit-detail',
        title: 'Unit Detail Page',
        summary: 'Per-unit trends, comments, sentiment, and offerings.',
        content: ewUnitDetail,
      },
    ],
  },
  {
    slug: 'ai-chat',
    title: 'Ask InsightLens',
    icon: Bot,
    pages: [
      {
        slug: 'setup-ai-providers',
        title: 'Setting Up an AI Provider',
        summary: 'Configure OpenAI, Anthropic, Google, OpenRouter, Groq, or a local model.',
        content: aiSetup,
      },
      {
        slug: 'asking-questions',
        title: 'Asking Good Questions',
        summary: 'How to phrase questions so the assistant returns useful answers and charts.',
        content: aiAsking,
      },
    ],
  },
  {
    slug: 'reports',
    title: 'Reports & Insights',
    icon: BarChart3,
    pages: [
      {
        slug: 'performance-reports',
        title: 'Performance Reports',
        summary: 'Star performers, units needing attention, and exportable reports.',
        content: rpPerformance,
      },
      {
        slug: 'promotion-suggestions',
        title: 'Promotion Suggestions',
        summary: 'Surface units whose track record supports a promotion case.',
        content: rpPromotion,
      },
    ],
  },
  {
    slug: 'troubleshooting',
    title: 'Troubleshooting',
    icon: AlertCircle,
    pages: [
      {
        slug: 'common-issues',
        title: 'Common Issues',
        summary: 'Fixes for the most frequent problems.',
        content: tsCommon,
      },
    ],
  },
  {
    slug: 'reference',
    title: 'Reference',
    icon: Library,
    pages: [
      {
        slug: 'faq',
        title: 'FAQ',
        summary: 'Frequently asked questions.',
        content: refFaq,
      },
      {
        slug: 'glossary',
        title: 'Glossary',
        summary: 'Survey and analytics terms used in InsightLens.',
        content: refGlossary,
      },
      {
        slug: 'keyboard-shortcuts',
        title: 'Keyboard Shortcuts',
        summary: 'Speed up navigation with the keyboard.',
        content: refKeyboard,
      },
    ],
  },
];

export function findPage(
  categorySlug: string,
  pageSlug: string,
): { category: DocCategory; page: DocPage } | null {
  const category = docCategories.find((c) => c.slug === categorySlug);
  if (!category) return null;
  const page = category.pages.find((p) => p.slug === pageSlug);
  if (!page) return null;
  return { category, page };
}

export const defaultPage = {
  categorySlug: docCategories[0].slug,
  pageSlug: docCategories[0].pages[0].slug,
};
