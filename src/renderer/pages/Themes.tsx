import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  BookOpen,
  Calendar,
  CalendarClock,
  ClipboardCheck,
  Filter,
  Gauge,
  GraduationCap,
  HeartHandshake,
  Laptop,
  Library,
  MessageCircle,
  MessagesSquare,
  Smile,
  Meh,
  Frown,
  Upload,
} from 'lucide-react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { queries } from '../services/queries';

// Maps the lucide-icon-name strings carried by the THEMES taxonomy
// (src/main/themes.ts) to renderer components.
const THEME_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  'clipboard-check': ClipboardCheck,
  'gauge': Gauge,
  'graduation-cap': GraduationCap,
  'book-open': BookOpen,
  'library': Library,
  'calendar-clock': CalendarClock,
  'message-circle': MessageCircle,
  'heart-handshake': HeartHandshake,
  'laptop': Laptop,
};

interface ThemeRow {
  key: string;
  name: string;
  icon: string;
  commentCount: number;
  avgSentiment: number | null;
  positiveCount: number;
  neutralCount: number;
  negativeCount: number;
  yearly: { year: number; count: number }[];
}

interface ThemeComment {
  comment_text: string;
  sentiment_label: string | null;
  sentiment_score: number | null;
  unit_code: string;
  year: number;
  semester: string;
}

function sentimentSummary(avg: number | null): { label: string; className: string } {
  if (avg === null) return { label: 'No sentiment', className: 'text-primary-500 dark:text-primary-400' };
  if (avg >= 0.1) return { label: 'Positive', className: 'text-success-500 dark:text-success-300' };
  if (avg <= -0.1) return { label: 'Negative', className: 'text-error-500 dark:text-error-300' };
  return { label: 'Mixed', className: 'text-primary-600 dark:text-primary-300' };
}

/** Small horizontal stacked bar: positive / neutral / negative shares. */
function SentimentBar({ theme }: { theme: ThemeRow }) {
  const total = theme.positiveCount + theme.neutralCount + theme.negativeCount;
  if (total === 0) return <div className="h-2 rounded-full bg-primary-100 dark:bg-primary-800" />;
  const pct = (n: number) => `${(n / total) * 100}%`;
  return (
    <div
      className="flex h-2 rounded-full overflow-hidden bg-primary-100 dark:bg-primary-800"
      title={`${theme.positiveCount} positive · ${theme.neutralCount} neutral · ${theme.negativeCount} negative`}
    >
      {theme.positiveCount > 0 && (
        <div className="bg-success-500" style={{ width: pct(theme.positiveCount) }} />
      )}
      {theme.neutralCount > 0 && (
        <div className="bg-primary-300 dark:bg-primary-700" style={{ width: pct(theme.neutralCount) }} />
      )}
      {theme.negativeCount > 0 && (
        <div className="bg-error-500" style={{ width: pct(theme.negativeCount) }} />
      )}
    </div>
  );
}

/** Tiny per-year bar trend for a theme card. */
function YearlyTrend({ yearly }: { yearly: { year: number; count: number }[] }) {
  if (yearly.length < 2) return null;
  const max = Math.max(...yearly.map((y) => y.count));
  return (
    <div className="flex items-end gap-0.5 h-5" aria-hidden="true">
      {yearly.map((y) => (
        <div
          key={y.year}
          className="w-1.5 rounded-sm bg-primary-300 dark:bg-primary-700"
          style={{ height: `${Math.max(15, (y.count / max) * 100)}%` }}
          title={`${y.year}: ${y.count} comment${y.count !== 1 ? 's' : ''}`}
        />
      ))}
    </div>
  );
}

function SentimentChip({ label }: { label: string | null }) {
  const l = label === 'positive' || label === 'negative' ? label : 'neutral';
  const styles = {
    positive: 'bg-success-50 dark:bg-success-900/40 text-success-500 dark:text-success-300',
    neutral: 'bg-primary-100 dark:bg-primary-800 text-primary-600 dark:text-primary-300',
    negative: 'bg-error-50 dark:bg-error-900/40 text-error-500 dark:text-error-300',
  }[l];
  const Icon = { positive: Smile, neutral: Meh, negative: Frown }[l];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs capitalize ${styles}`}>
      <Icon className="w-3 h-3" />
      {l}
    </span>
  );
}

/** One example comment with unit code + period + sentiment chip. Uses the
 *  stored sentiment_label from the database (set at import time) rather than
 *  re-running the renderer's sentiment analysis. */
function ThemeCommentRow({ c }: { c: ThemeComment }) {
  const l = c.sentiment_label === 'positive' || c.sentiment_label === 'negative'
    ? c.sentiment_label
    : 'neutral';
  const border = {
    positive: 'border-success-500 bg-success-50 dark:bg-success-900/40',
    neutral: 'border-primary-300 dark:border-primary-600 bg-primary-50 dark:bg-primary-950',
    negative: 'border-error-500 bg-error-50 dark:bg-error-900/40',
  }[l];
  return (
    <div className={`p-4 rounded-lg border-l-4 ${border}`}>
      <p className="text-sm text-primary-700 dark:text-primary-200">{c.comment_text}</p>
      <div className="mt-2 flex items-center gap-3 text-xs text-primary-600 dark:text-primary-300">
        <Link
          to={`/unit/${c.unit_code}`}
          className="font-medium text-primary-700 dark:text-primary-200 hover:underline"
        >
          {c.unit_code}
        </Link>
        <span>{c.semester} {c.year}</span>
        <SentimentChip label={c.sentiment_label} />
      </div>
    </div>
  );
}

export function Themes() {
  const [year, setYear] = useState('');
  const [discipline, setDiscipline] = useState('');
  const [selectedTheme, setSelectedTheme] = useState<string | null>(null);

  const filters = {
    year: year || undefined,
    discipline: discipline || undefined,
  };

  const { data: filterOptions } = useQuery({
    queryKey: ['unit-filter-options'],
    queryFn: () => queries.unitFilterOptions(),
  });

  const { data: overview, isLoading } = useQuery({
    queryKey: ['theme-overview', year, discipline],
    queryFn: () => queries.themeOverview(filters),
  });

  const { data: themeComments, isLoading: commentsLoading } = useQuery({
    queryKey: ['theme-comments', selectedTheme, year, discipline],
    queryFn: () => queries.themeComments(selectedTheme!, filters) as Promise<ThemeComment[]>,
    enabled: !!selectedTheme,
  });

  const themes: ThemeRow[] = overview?.themes ?? [];
  const totals = overview?.totals;
  const hasFilters = !!(year || discipline);
  const selected = themes.find((t) => t.key === selectedTheme) ?? null;

  // Loading skeletons
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-primary-800 dark:text-primary-100 font-serif">Comment Themes</h1>
          <p className="mt-1 text-sm text-primary-600 dark:text-primary-300">
            What students are talking about across all units, and how they feel about it
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="p-5">
              <div className="animate-pulse space-y-3" aria-hidden="true">
                <div className="h-5 w-1/2 rounded bg-primary-200 dark:bg-primary-800" />
                <div className="h-8 w-1/4 rounded bg-primary-200 dark:bg-primary-800" />
                <div className="h-2 rounded bg-primary-200 dark:bg-primary-800" />
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Empty state: the database has no comments at all (no filters applied).
  if (totals && totals.totalComments === 0 && !hasFilters) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-primary-800 dark:text-primary-100 font-serif">Comment Themes</h1>
          <p className="mt-1 text-sm text-primary-600 dark:text-primary-300">
            What students are talking about across all units, and how they feel about it
          </p>
        </div>
        <Card className="p-8">
          <div className="max-w-lg mx-auto text-center">
            <div className="w-16 h-16 bg-primary-100 dark:bg-primary-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <MessagesSquare className="w-8 h-8 text-primary-700 dark:text-primary-200" />
            </div>
            <h2 className="text-xl font-semibold font-serif text-primary-800 dark:text-primary-100 mb-2">
              No student comments yet
            </h2>
            <p className="text-primary-600 dark:text-primary-300 mb-6">
              Import survey reports with qualitative feedback to see the themes students
              are talking about — assessment, workload, teaching and more.
            </p>
            <Link to="/import">
              <Button size="lg" className="inline-flex items-center gap-2">
                <Upload className="w-4 h-4" />
                Import Surveys
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-primary-800 dark:text-primary-100 font-serif">Comment Themes</h1>
        <p className="mt-1 text-sm text-primary-600 dark:text-primary-300">
          What students are talking about across all units, and how they feel about it
        </p>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex items-center gap-2 text-primary-600 dark:text-primary-300 pb-2">
            <Filter className="w-5 h-5" />
            <span className="text-sm font-medium">Filters</span>
          </div>
          <div>
            <label className="block text-sm font-medium text-primary-700 dark:text-primary-200 mb-1">
              <Calendar className="w-4 h-4 inline mr-1" />
              Year
            </label>
            <select
              value={year}
              onChange={(e) => { setYear(e.target.value); setSelectedTheme(null); }}
              className="px-3 py-2 border border-primary-200 dark:border-primary-600 dark:bg-primary-800 dark:text-primary-100 dark:placeholder-primary-400 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-300 dark:focus:ring-primary-500"
            >
              <option value="">All Years</option>
              {filterOptions?.years?.map((y: number) => (
                <option key={y} value={y.toString()}>{y}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-primary-700 dark:text-primary-200 mb-1">
              <BookOpen className="w-4 h-4 inline mr-1" />
              Discipline
            </label>
            <select
              value={discipline}
              onChange={(e) => { setDiscipline(e.target.value); setSelectedTheme(null); }}
              className="px-3 py-2 border border-primary-200 dark:border-primary-600 dark:bg-primary-800 dark:text-primary-100 dark:placeholder-primary-400 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-300 dark:focus:ring-primary-500"
            >
              <option value="">All Disciplines</option>
              {filterOptions?.disciplines?.map((d: { discipline_code: string; discipline_name: string }) => (
                <option key={d.discipline_code} value={d.discipline_code}>
                  {d.discipline_name}
                </option>
              ))}
            </select>
          </div>
          {hasFilters && (
            <Button
              variant="secondary"
              size="sm"
              className="mb-0.5"
              onClick={() => { setYear(''); setDiscipline(''); setSelectedTheme(null); }}
            >
              Clear Filters
            </Button>
          )}
        </div>
      </Card>

      {/* Theme cards grid (zero-comment themes already omitted by the query) */}
      {themes.length === 0 ? (
        <Card className="p-8 text-center text-primary-600 dark:text-primary-300">
          No comments match these filters. Try adjusting or clearing your filters.
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {themes.map((theme) => {
            const Icon = THEME_ICONS[theme.icon] ?? MessagesSquare;
            const sentiment = sentimentSummary(theme.avgSentiment);
            const isSelected = selectedTheme === theme.key;
            return (
              <Card
                key={theme.key}
                className={`p-5 cursor-pointer transition-shadow hover:shadow-md ${
                  isSelected ? 'ring-2 ring-primary-400 border-primary-400' : ''
                }`}
                onClick={() => setSelectedTheme(isSelected ? null : theme.key)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary-100 dark:bg-primary-800 rounded-lg flex-shrink-0">
                      <Icon className="w-5 h-5 text-primary-700 dark:text-primary-200" />
                    </div>
                    <div>
                      <h3 className="font-medium text-primary-800 dark:text-primary-100">{theme.name}</h3>
                      <p className="text-sm text-primary-600 dark:text-primary-300">
                        {theme.commentCount} comment{theme.commentCount !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  <YearlyTrend yearly={theme.yearly} />
                </div>
                <div className="mt-4 space-y-2">
                  <SentimentBar theme={theme} />
                  <p className={`text-xs font-medium ${sentiment.className}`}>
                    {sentiment.label}
                  </p>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Selected theme: example comments */}
      {selected && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-primary-800 dark:text-primary-100">
              Example comments — {selected.name}
            </h2>
            <Button variant="ghost" size="sm" onClick={() => setSelectedTheme(null)}>
              Close
            </Button>
          </div>
          {commentsLoading ? (
            <div className="space-y-3" aria-hidden="true">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="animate-pulse h-20 rounded-lg bg-primary-100 dark:bg-primary-800" />
              ))}
            </div>
          ) : themeComments && themeComments.length > 0 ? (
            <div className="space-y-3">
              <p className="text-xs text-primary-500 dark:text-primary-400">
                Sorted most-negative first so actionable feedback surfaces.
              </p>
              {themeComments.map((c, idx) => (
                <ThemeCommentRow key={idx} c={c} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-primary-600 dark:text-primary-300">No example comments found.</p>
          )}
        </Card>
      )}

      {/* Footer */}
      {totals && totals.totalComments > 0 && (
        <p className="text-sm text-primary-500 dark:text-primary-400 text-center">
          {totals.classifiedComments} of {totals.totalComments} comments matched a theme
        </p>
      )}
    </div>
  );
}
