import React, { useState, useMemo, useEffect } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { ArrowLeft, TrendingUp, Users, Calendar, Lightbulb, Trash2 } from 'lucide-react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { BarChart } from '../components/charts/BarChart';
import { RadarChart } from '../components/charts/RadarChart';
import { WordCloud } from '../components/charts/WordCloud';
import { SentimentChart } from '../components/charts/SentimentChart';
import { UnitTimelineChart, type TimelinePoint } from '../components/charts/UnitTimelineChart';
import { CommentWithSentiment } from '../components/CommentWithSentiment';
import { CourseImprovementModal } from '../components/CourseImprovementModal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { analyzeSentimentBatch } from '../utils/sentiment';
import { queries } from '../services/queries';

// Builds the timeline question dropdown options from the set of question_shorts
// the unit actually has data for. The 'overall' (Insight) and 'eval_q11'
// (eValuate) shorts both ask the same "overall satisfaction" question; we
// collapse them into a single virtual option so the user sees a continuous
// timeline across the instrument switch rather than two near-identical entries.
const INSIGHT_LABELS: Record<string, string> = {
  engagement: 'Engagement',
  resources: 'Resources',
  support: 'Learning support',
  assessments: 'Assessments',
  expectations: 'Expectations',
  overall: 'Overall satisfaction',
};
const EVAL_LABELS: Record<string, string> = {
  eval_q1: 'Q1: Learning outcomes clear',
  eval_q2: 'Q2: Learning experiences',
  eval_q3: 'Q3: Learning resources',
  eval_q4: 'Q4: Assessment tasks',
  eval_q5: 'Q5: Feedback helps',
  eval_q6: 'Q6: Workload appropriate',
  eval_q7: 'Q7: Quality of teaching',
  eval_q8: 'Q8: Motivated',
  eval_q9: 'Q9: Best use of experiences',
  eval_q10: 'Q10: Reflect on learning',
  eval_q11: 'Q11: Overall satisfaction',
};

interface QuestionOption {
  /** Stable key for the dropdown <select>. */
  key: string;
  /** Display label. */
  label: string;
  /** question_short values to union when plotting. */
  shorts: string[];
}

function buildQuestionOptions(availableShorts: Set<string>): QuestionOption[] {
  const out: QuestionOption[] = [];

  // Virtual "Overall satisfaction" — unions both instruments' overall items
  // so users can see continuity across the eValuate → Insight switch.
  const hasOverall = availableShorts.has('overall');
  const hasEvalQ11 = availableShorts.has('eval_q11');
  if (hasOverall || hasEvalQ11) {
    const shorts: string[] = [];
    if (hasOverall) shorts.push('overall');
    if (hasEvalQ11) shorts.push('eval_q11');
    out.push({ key: 'overall_virtual', label: 'Overall satisfaction', shorts });
  }

  // Insight questions (excluding 'overall' — folded into the virtual entry).
  for (const short of ['engagement', 'resources', 'support', 'assessments', 'expectations']) {
    if (availableShorts.has(short)) {
      out.push({ key: short, label: `${INSIGHT_LABELS[short]} (Insight)`, shorts: [short] });
    }
  }
  // eValuate questions Q1-Q10 (Q11 is folded into the virtual entry).
  for (let i = 1; i <= 10; i++) {
    const short = `eval_q${i}`;
    if (availableShorts.has(short)) {
      out.push({ key: short, label: `${EVAL_LABELS[short]} (eValuate)`, shorts: [short] });
    }
  }

  return out;
}

const COMMENT_PAGE_SIZE = 50;

export function UnitDetail() {
  const { unitCode } = useParams<{ unitCode: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [isRecommendationModalOpen, setIsRecommendationModalOpen] = useState(false);
  // How many comments are currently rendered (incremental "Show more" paging).
  const [visibleCommentCount, setVisibleCommentCount] = useState(COMMENT_PAGE_SIZE);
  // Timeline chart controls. Default to the virtual "Overall satisfaction"
  // entry — it's the metric that exists on both instruments and is what
  // most users care about first. Trend line off by default to avoid
  // implying a smoothed pattern where the underlying data is sparse.
  const [timelineQuestionKey, setTimelineQuestionKey] = useState<string>('overall_virtual');
  const [showTimelineTrend, setShowTimelineTrend] = useState(false);
  // Delete-confirmation dialog state. `null` = closed; an object keeps the
  // target details so the dialog can render specifics ("delete unit X" vs
  // "delete S2 2024 survey"). Single source of truth so we can't have
  // two confirm dialogs open at once.
  const [deleteTarget, setDeleteTarget] = useState<
    | { kind: 'unit' }
    | { kind: 'survey'; surveyId: number; periodLabel: string }
    | null
  >(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  // Success toast with an inline Undo button. The main process keeps the
  // deleted rows in a single 30-second undo slot; clicking Undo restores
  // them and re-fetches everything the delete invalidated. Deliberately a
  // closure over queryClient only (no component state): the unit-delete
  // flow navigates away and unmounts this page, but the app-level
  // ToastContainer keeps the toast — and this handler — alive.
  const showDeleteUndoToast = (message: string) => {
    const handleUndo = async (closeToast: () => void) => {
      try {
        const r = await window.electronAPI.undoLastDelete();
        if (!r.success) throw new Error(r.error);
        closeToast();
        toast.success(`Restored ${r.label}`);
        // Broad invalidation, mirroring the delete flow: the units list,
        // dashboard aggregates and this unit's detail queries all changed.
        queryClient.invalidateQueries();
      } catch (err) {
        toast.error(`Undo failed: ${(err as Error).message}`);
      }
    };
    toast.success(
      ({ closeToast }) => (
        <div className="flex items-center justify-between gap-3">
          <span>{message}</span>
          <button
            type="button"
            onClick={() => handleUndo(closeToast)}
            className="shrink-0 text-xs font-semibold uppercase tracking-wide border border-current rounded px-2 py-1 hover:bg-primary-50"
          >
            Undo
          </button>
        </div>
      ),
      { autoClose: 10000 },
    );
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget || !unitCode) return;
    setDeleteBusy(true);
    try {
      if (deleteTarget.kind === 'unit') {
        const r = await queries.deleteUnit(unitCode);
        if (!r.success) throw new Error(r.error || 'Delete failed');
        showDeleteUndoToast(`Deleted ${unitCode} (${r.surveys_deleted} surveys, ${r.comments_deleted} comments)`);
        // Invalidate everything — the dashboard, units list, and AI context
        // all read aggregates that just changed. Cheaper than enumerating
        // every affected query key.
        queryClient.invalidateQueries();
        navigate('/');
      } else {
        const r = await queries.deleteSurvey(deleteTarget.surveyId);
        if (!r.success) throw new Error(r.error || 'Delete failed');
        showDeleteUndoToast(
          `Deleted ${deleteTarget.periodLabel}${r.unit_removed ? ' (unit removed — was the last survey)' : ''}`,
        );
        queryClient.invalidateQueries();
        // If the underlying unit row got auto-cleaned, the current page is
        // about to 404 — bounce back to the dashboard preemptively.
        if (r.unit_removed) navigate('/');
      }
      setDeleteTarget(null);
    } catch (err) {
      toast.error(`Delete failed: ${(err as Error).message}`);
    } finally {
      setDeleteBusy(false);
    }
  };

  // Fetch unit info
  const { data: unitInfo } = useQuery({
    queryKey: ['unit-info', unitCode],
    queryFn: async () => {
      return queries.unit(unitCode!);
    }
  });

  // Fetch surveys for this unit
  const { data: surveys } = useQuery({
    queryKey: ['unit-surveys', unitCode],
    queryFn: async () => {
      return queries.unitSurveyHistory(unitCode!);
    }
  });

  // Fetch latest survey metrics
  const { data: latestMetrics } = useQuery({
    queryKey: ['unit-latest-metrics', unitCode],
    queryFn: async () => {
      return queries.unitLatestQuestions(unitCode!);
    }
  });

  // Fetch comments
  const { data: comments } = useQuery({
    queryKey: ['unit-comments', unitCode],
    queryFn: async () => {
      return queries.unitComments(unitCode!);
    }
  });

  // Reset comment paging when navigating to a different unit.
  useEffect(() => {
    setVisibleCommentCount(COMMENT_PAGE_SIZE);
  }, [unitCode]);

  // Deep-link support: react-router doesn't auto-scroll to URL hashes
  // (e.g. /unit/XYZ#survey-42 from the Units page), so once the survey
  // history rows exist, scroll the matching row into view ourselves.
  useEffect(() => {
    if (!location.hash || !surveys || surveys.length === 0) return;
    const el = document.getElementById(location.hash.slice(1));
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [location.hash, surveys]);

  // Timeline data: which questions does this unit have, and the selected series.
  const { data: availableQuestions } = useQuery({
    queryKey: ['unit-available-questions', unitCode],
    queryFn: async () => queries.unitAvailableQuestions(unitCode!) as Promise<{ question_short: string; question_text: string }[]>,
  });

  const questionOptions = useMemo(() => {
    if (!availableQuestions) return [] as QuestionOption[];
    return buildQuestionOptions(new Set(availableQuestions.map((q) => q.question_short)));
  }, [availableQuestions]);

  // Resolve the selected dropdown key into the question_shorts to query.
  // If the user's prior selection isn't in this unit's options (rare —
  // they'd have to navigate from a different unit), fall back to the
  // first available option so the chart still renders something useful.
  const selectedOption = useMemo(() => {
    if (questionOptions.length === 0) return null;
    return questionOptions.find((o) => o.key === timelineQuestionKey) ?? questionOptions[0];
  }, [questionOptions, timelineQuestionKey]);

  const { data: timelinePoints } = useQuery({
    queryKey: ['unit-timeline', unitCode, selectedOption?.key],
    queryFn: async () =>
      queries.unitTimelineSeries(unitCode!, selectedOption!.shorts) as Promise<TimelinePoint[]>,
    enabled: !!unitCode && !!selectedOption,
  });

  // Analyze sentiment of comments
  const sentimentData = React.useMemo(() => {
    if (!comments || comments.length === 0) {
      return { positive: 0, neutral: 0, negative: 0, averageScore: 0, distribution: [] };
    }
    
    const commentTexts = comments.map((c: any) => c.comment_text);
    return analyzeSentimentBatch(commentTexts);
  }, [comments]);

  // Generate word cloud data from comments
  const wordCloudData = React.useMemo(() => {
    if (!comments || comments.length === 0) return [];

    // Combine all comments
    const allText = comments.map((c: any) => c.comment_text).join(' ');
    
    // Common words to filter out
    const stopWords = new Set([
      'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i',
      'it', 'for', 'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at',
      'this', 'but', 'his', 'by', 'from', 'they', 'we', 'say', 'her', 'she',
      'or', 'an', 'will', 'my', 'one', 'all', 'would', 'there', 'their',
      'what', 'so', 'up', 'out', 'if', 'about', 'who', 'get', 'which', 'go',
      'me', 'when', 'make', 'can', 'like', 'time', 'no', 'just', 'him', 'know',
      'take', 'people', 'into', 'year', 'your', 'good', 'some', 'could', 'them',
      'see', 'other', 'than', 'then', 'now', 'look', 'only', 'come', 'its', 'over',
      'think', 'also', 'back', 'after', 'use', 'two', 'how', 'our', 'work',
      'first', 'well', 'way', 'even', 'new', 'want', 'because', 'any', 'these',
      'give', 'day', 'most', 'us', 'was', 'are', 'been', 'has', 'had', 'were',
      'said', 'did', 'is', 'am', 'very', 'more', 'much', 'too', 'really'
    ]);

    // Extract words and count frequency
    const wordCount = new Map<string, number>();
    const words = allText.toLowerCase().match(/\b\w+\b/g) || [];
    
    words.forEach(word => {
      if (word.length > 3 && !stopWords.has(word)) {
        wordCount.set(word, (wordCount.get(word) || 0) + 1);
      }
    });

    // Convert to array and sort by frequency
    const sortedWords = Array.from(wordCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 40) // Top 40 words
      .map(([text, count]) => ({
        text,
        size: Math.sqrt(count) * 15 + 10 // Scale size based on frequency
      }));

    return sortedWords;
  }, [comments]);

  if (!unitInfo) {
    return (
      <div className="text-center py-12">
        <p className="text-primary-600">Unit not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-primary-600 hover:text-primary-800 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>

        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-primary-800 font-serif">
              {unitCode} - {unitInfo.unit_name}
            </h1>
            <p className="mt-1 text-sm text-primary-600">
              {unitInfo.discipline_name} • {unitInfo.academic_level === 'UG' ? 'Undergraduate' : 'Postgraduate'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setDeleteTarget({ kind: 'unit' })}
            className="inline-flex items-center gap-1.5 text-sm text-error-500 hover:text-error-700 hover:bg-error-500 hover:bg-opacity-10 px-3 py-1.5 rounded-md transition-colors"
            title="Delete this unit and all its surveys"
          >
            <Trash2 className="w-4 h-4" />
            Delete unit
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-primary-600">Total Surveys</p>
              <p className="mt-2 text-3xl font-semibold text-primary-800">
                {surveys?.length || 0}
              </p>
            </div>
            <Calendar className="w-8 h-8 text-primary-600" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-primary-600">Avg Response Rate</p>
              <p className="mt-2 text-3xl font-semibold text-primary-800">
                {surveys && surveys.length > 0
                  ? (surveys.reduce((sum: number, s: any) => sum + s.response_rate, 0) / surveys.length).toFixed(1)
                  : '0'}%
              </p>
            </div>
            <Users className="w-8 h-8 text-success-500" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-primary-600">Latest Experience</p>
              <p className="mt-2 text-3xl font-semibold text-primary-800">
                {surveys && surveys[0]?.overall_experience
                  ? surveys[0].overall_experience.toFixed(1)
                  : '0'}%
              </p>
            </div>
            <TrendingUp className="w-8 h-8 text-primary-600" />
          </div>
        </Card>
      </div>

      {/* Course Improvement CTA */}
      {surveys && surveys.length > 0 && (
        <Card className="p-6 bg-gradient-to-r from-primary-50 to-primary-100 border-primary-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary-100 rounded-lg">
                <Lightbulb className="w-6 h-6 text-primary-600" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-primary-800 font-serif">
                  Get AI-Powered Course Recommendations
                </h3>
                <p className="text-sm text-primary-600 mt-1">
                  Analyze your latest survey data to get personalized suggestions for improving course delivery and student experience.
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsRecommendationModalOpen(true)}
              className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              <Lightbulb className="w-4 h-4" />
              Generate Recommendations
            </button>
          </div>
        </Card>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Experience Timeline (Phase 4: mode-colour + era-shading) */}
        <Card className="p-6">
          <div className="flex items-start justify-between gap-4 mb-4 flex-wrap">
            <h2 className="text-lg font-medium text-primary-800">Experience Timeline</h2>
            <div className="flex items-center gap-3 flex-wrap">
              {questionOptions.length > 0 && (
                <select
                  className="text-sm border border-primary-200 rounded-md px-2 py-1 bg-white text-primary-800"
                  value={selectedOption?.key ?? ''}
                  onChange={(e) => setTimelineQuestionKey(e.target.value)}
                  aria-label="Choose question to plot"
                >
                  {questionOptions.map((opt) => (
                    <option key={opt.key} value={opt.key}>{opt.label}</option>
                  ))}
                </select>
              )}
              <label className="inline-flex items-center gap-1.5 text-xs text-primary-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showTimelineTrend}
                  onChange={(e) => setShowTimelineTrend(e.target.checked)}
                  className="rounded border-primary-300"
                />
                Show trend (3-period MA)
              </label>
            </div>
          </div>
          {timelinePoints && timelinePoints.length > 0 ? (
            <UnitTimelineChart
              points={timelinePoints}
              questionLabel={selectedOption?.label ?? 'Agreement (%)'}
              showTrend={showTimelineTrend}
            />
          ) : (
            <div className="h-64 flex items-center justify-center text-primary-600">
              No timeline data available
            </div>
          )}
        </Card>

        {/* Metrics Radar */}
        <Card className="p-6">
          <h2 className="text-lg font-medium text-primary-800 mb-4">
            Latest Survey Metrics
          </h2>
          {latestMetrics && latestMetrics.length > 0 ? (
            <RadarChart
              data={latestMetrics}
              labelKey="question_short"
              valueKey="percent_agree"
            />
          ) : (
            <div className="h-64 flex items-center justify-center text-primary-600">
              No metrics data available
            </div>
          )}
        </Card>
      </div>

      {/* Survey History */}
      <Card className="p-6">
        <h2 className="text-lg font-medium text-primary-800 mb-4">
          Survey History
        </h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-primary-200">
            <thead>
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-primary-600 uppercase tracking-wider">
                  Period
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-primary-600 uppercase tracking-wider">
                  Location
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-primary-600 uppercase tracking-wider">
                  Mode
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-primary-600 uppercase tracking-wider">
                  Responses
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-primary-600 uppercase tracking-wider">
                  Response Rate
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-primary-600 uppercase tracking-wider">
                  Experience
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-primary-600 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-primary-200">
              {surveys?.map((survey: any, index: number) => (
                <tr key={index} id={`survey-${survey.survey_id}`}>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-primary-800">
                    {survey.semester} {survey.year}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-primary-600">
                    {survey.location}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-primary-600">
                    {survey.mode}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-primary-600">
                    {survey.responses}/{survey.enrolments}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-primary-600">
                    {survey.response_rate.toFixed(1)}%
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-primary-800">
                    {survey.overall_experience.toFixed(1)}%
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-primary-600">
                    <div className="flex items-center gap-3">
                      {index === 0 && (
                        <button
                          onClick={() => setIsRecommendationModalOpen(true)}
                          className="text-success-500 hover:text-success-700 text-xs font-medium"
                        >
                          Get Recommendations
                        </button>
                      )}
                      <button
                        onClick={() =>
                          setDeleteTarget({
                            kind: 'survey',
                            surveyId: survey.survey_id,
                            periodLabel: `${survey.semester} ${survey.year}`,
                          })
                        }
                        className="text-error-500 hover:text-error-700"
                        title="Delete this survey"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Comments Analysis */}
      <Card className="p-6 mb-6">
        <h2 className="text-lg font-medium text-primary-800 mb-6">
          Comments Analysis
        </h2>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Sentiment Distribution */}
          <div>
            <h3 className="text-sm font-medium text-primary-700 mb-3">Sentiment Distribution</h3>
            <SentimentChart
              positive={sentimentData.positive}
              neutral={sentimentData.neutral}
              negative={sentimentData.negative}
              showLegend
            />
          </div>
          
          {/* Word Cloud */}
          <div className="lg:col-span-2">
            <h3 className="text-sm font-medium text-primary-700 mb-3">Most Frequent Words</h3>
            {wordCloudData.length > 0 ? (
              <WordCloud words={wordCloudData} width={600} height={250} />
            ) : (
              <div className="h-64 flex items-center justify-center text-primary-600">
                No comments to analyze
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Comments with Sentiment */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium text-primary-800">
            Student Comments
          </h2>
          <div className="text-sm text-primary-600">
            {comments && comments.length > 0
              ? `Showing ${Math.min(visibleCommentCount, comments.length)} of ${comments.length} comments`
              : '0 comments'}
          </div>
        </div>

        <div className="space-y-3 max-h-96 overflow-y-auto scrollbar-thin">
          {comments?.slice(0, visibleCommentCount).map((comment: any, index: number) => (
            <CommentWithSentiment
              key={index}
              comment={comment.comment_text}
              semester={comment.semester}
              year={comment.year}
              showDetails={false}
            />
          ))}
          {(!comments || comments.length === 0) && (
            <p className="text-sm text-primary-600">No comments available</p>
          )}
        </div>

        {comments && comments.length > visibleCommentCount && (
          <div className="mt-4 flex justify-center">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setVisibleCommentCount((n) => n + COMMENT_PAGE_SIZE)}
            >
              Show {Math.min(COMMENT_PAGE_SIZE, comments.length - visibleCommentCount)} more comments
            </Button>
          </div>
        )}
      </Card>

      {/* Course Improvement Modal */}
      {surveys && surveys.length > 0 && (
        <CourseImprovementModal
          isOpen={isRecommendationModalOpen}
          onClose={() => setIsRecommendationModalOpen(false)}
          surveyId={surveys[0].survey_id}
          unitCode={unitCode!}
          unitName={unitInfo?.unit_name || ''}
          semester={surveys[0].semester}
          year={surveys[0].year}
        />
      )}

      {/* Delete confirmation. Stays mounted so the busy state stays put
          while the IPC round-trip completes. */}
      <ConfirmDialog
        isOpen={deleteTarget !== null}
        destructive
        busy={deleteBusy}
        title={deleteTarget?.kind === 'unit' ? `Delete ${unitCode}?` : 'Delete this survey?'}
        message={
          deleteTarget?.kind === 'unit' ? (
            <>
              <p className="mb-2">
                This removes <strong>{unitCode}</strong> and everything imported for it:
              </p>
              <ul className="list-disc list-inside text-primary-600">
                <li>{surveys?.length ?? 0} survey{(surveys?.length ?? 0) === 1 ? '' : 's'}</li>
                <li>{comments?.length ?? 0} comment{(comments?.length ?? 0) === 1 ? '' : 's'}</li>
                <li>All quantitative results and benchmarks</li>
              </ul>
              <p className="mt-3 text-xs text-primary-500">
                The underlying PDFs are not touched — you can re-import them at any time.
              </p>
            </>
          ) : deleteTarget?.kind === 'survey' ? (
            <>
              <p>
                Remove the <strong>{deleteTarget.periodLabel}</strong> survey for{' '}
                <strong>{unitCode}</strong>, along with its comments and per-question results?
              </p>
              {surveys?.length === 1 && (
                <p className="mt-2 text-xs text-primary-500">
                  This is the unit's only survey — the unit row itself will be removed too.
                </p>
              )}
            </>
          ) : null
        }
        confirmLabel="Delete"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}