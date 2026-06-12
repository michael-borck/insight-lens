import React, { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  Upload,
  FileText,
  CheckCircle,
  XCircle,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  ChevronRight,
  ChevronDown,
} from 'lucide-react';
import { toast } from 'react-toastify';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { logger } from '../utils/logger';
import type { ImportResultDetail } from '@shared/types';

// "Semester 1 2024" -> "S1 2024", "Trimester 2 2023" -> "T2 2023"
const shortPeriod = (period: string) => period.replace('Semester ', 'S').replace('Trimester ', 'T');
const signed = (n: number) => `${n >= 0 ? '+' : ''}${n.toFixed(1)}`;

// Threshold (percentage points of overall experience) above which a change
// is promoted from the muted inline note to the "Notable changes" section.
const NOTABLE_DELTA = 5;

const CSV_COLUMNS: { name: string; required: boolean; note: string }[] = [
  { name: 'unit_code', required: true, note: 'e.g. ISYS2001' },
  { name: 'unit_name', required: true, note: 'e.g. Introduction to Information Systems' },
  { name: 'year', required: true, note: 'e.g. 2024' },
  { name: 'semester', required: true, note: 'Semester 1, Semester 2, Trimester 1, Trimester 2 or Trimester 3' },
  { name: 'location', required: true, note: 'campus, e.g. Bentley' },
  { name: 'mode', required: true, note: 'Internal, Online or Aggregated' },
  { name: 'enrolments', required: true, note: 'whole number' },
  { name: 'responses', required: true, note: 'whole number' },
  { name: 'overall_experience', required: true, note: '0–100 (% agree)' },
  { name: 'response_rate', required: false, note: '0–100; computed from responses/enrolments when omitted' },
  { name: 'discipline', required: false, note: 'defaults to General' },
  {
    name: 'engagement, resources, support, assessments, expectations, overall',
    required: false,
    note: 'per-question % agree, 0–100',
  },
];

export function Import() {
  const [files, setFiles] = useState<File[]>([]);
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState<ImportResultDetail[]>([]);
  const [summary, setSummary] = useState<{ success: number; duplicates: number; failed: number } | null>(null);
  const [showCsvHelp, setShowCsvHelp] = useState(false);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'application/pdf': ['.pdf'],
      'text/csv': ['.csv']
    },
    onDrop: (acceptedFiles) => {
      setFiles(prev => [...prev, ...acceptedFiles]);
      setResults([]);
      setSummary(null);
    }
  });

  const handleImport = async () => {
    if (files.length === 0) return;

    setImporting(true);
    try {
      // Resolve real on-disk paths via the preload bridge. Electron 32+
      // removed File.path; reading f.path directly returns undefined (and
      // some shims fall back to './<filename>'), so the main process used
      // to receive useless paths and fail with ENOENT. webUtils.getPathForFile,
      // exposed via preload, is the supported replacement.
      const filePaths = files
        .map((f) => window.electronAPI.getPathForFile(f))
        .filter((p): p is string => typeof p === 'string' && p.length > 0);

      if (filePaths.length === 0) {
        toast.error('Could not resolve file paths — try selecting files via the picker instead of drag-and-drop.');
        return;
      }

      // Import surveys
      const result = await window.electronAPI.importSurveys(filePaths);

      setResults(result.details);
      setSummary({
        success: result.success,
        duplicates: result.duplicates,
        failed: result.failed
      });

      if (result.success > 0) {
        toast.success(`Successfully imported ${result.success} survey${result.success > 1 ? 's' : ''}`);
      }

      if (result.duplicates > 0) {
        toast.warning(`${result.duplicates} duplicate${result.duplicates > 1 ? 's' : ''} skipped`);
      }

      if (result.failed > 0) {
        toast.error(`${result.failed} import${result.failed > 1 ? 's' : ''} failed`);
      }

    } catch (error) {
      logger.error('Import error:', error);
      toast.error('Failed to import surveys');
    } finally {
      setImporting(false);
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const clearAll = () => {
    setFiles([]);
    setResults([]);
    setSummary(null);
  };

  // Notable changes: successful imports that moved overall experience by
  // >= NOTABLE_DELTA points vs the unit's previous survey. Smaller shifts
  // show inline (muted) on each detail row instead.
  const notableChanges = results.filter(
    (r) => r.status === 'success' && r.changes && Math.abs(r.changes.overallDelta) >= NOTABLE_DELTA,
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold font-serif text-primary-800 dark:text-primary-100">Import Surveys</h1>
        <p className="mt-1 text-sm text-primary-600 dark:text-primary-300">
          Upload PDF or CSV survey reports to add them to your database
        </p>
      </div>

      {/* Drop zone */}
      <Card className="p-8">
        <div
          {...getRootProps()}
          className={`
            border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
            ${isDragActive ? 'border-primary-300 dark:border-primary-600 bg-primary-50 dark:bg-primary-950' : 'border-primary-200 dark:border-primary-700 hover:border-primary-300 dark:hover:border-primary-600'}
          `}
        >
          <input {...getInputProps()} />
          <Upload className="w-12 h-12 mx-auto text-primary-500 dark:text-primary-400 mb-4" />
          <p className="text-lg font-medium text-primary-800 dark:text-primary-100">
            {isDragActive ? 'Drop the files here...' : 'Drag & drop PDF or CSV files here'}
          </p>
          <p className="mt-2 text-sm text-primary-600 dark:text-primary-300">
            or click to select files
          </p>
        </div>

        {/* CSV format help (collapsible) */}
        <div className="mt-4">
          <button
            type="button"
            onClick={() => setShowCsvHelp((v) => !v)}
            className="flex items-center gap-1 text-sm font-medium text-primary-600 dark:text-primary-300 hover:text-primary-800 dark:hover:text-primary-100"
          >
            {showCsvHelp ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            CSV format
          </button>
          {showCsvHelp && (
            <div className="mt-2 p-4 bg-primary-50 dark:bg-primary-950 rounded-lg text-sm text-primary-700 dark:text-primary-200 space-y-2">
              <p>
                One row per survey, with a header row. Column names are case-insensitive
                and may appear in any order.
              </p>
              <ul className="space-y-1">
                {CSV_COLUMNS.map((col) => (
                  <li key={col.name}>
                    <code className="font-mono text-xs bg-white dark:bg-primary-900 px-1 py-0.5 rounded">{col.name}</code>{' '}
                    <span className={col.required ? 'text-primary-800 dark:text-primary-100 font-medium' : 'text-primary-500 dark:text-primary-400'}>
                      {col.required ? 'required' : 'optional'}
                    </span>
                    {' — '}{col.note}
                  </li>
                ))}
              </ul>
              <p className="text-xs text-primary-500 dark:text-primary-400">
                Rows that duplicate an existing survey (same unit, year, semester, location and
                mode) are skipped; invalid rows are reported individually without stopping the rest
                of the file.
              </p>
            </div>
          )}
        </div>
      </Card>

      {/* File list */}
      {files.length > 0 && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium font-serif text-primary-800 dark:text-primary-100">
              Selected Files ({files.length})
            </h2>
            <Button variant="ghost" size="sm" onClick={clearAll}>
              Clear All
            </Button>
          </div>

          <div className="space-y-2 mb-4">
            {files.map((file, index) => {
              // CSV imports produce one result per data row labelled
              // "name.csv (row N)", so match by exact name OR row-label prefix.
              const fileResults = results.filter(
                (r) => r.file === file.name || r.file.startsWith(`${file.name} (row`),
              );
              const result = fileResults.length === 1 ? fileResults[0] : undefined;
              const counts = {
                success: fileResults.filter((r) => r.status === 'success').length,
                duplicate: fileResults.filter((r) => r.status === 'duplicate').length,
                failed: fileResults.filter((r) => r.status === 'failed').length,
              };

              return (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-primary-50 dark:bg-primary-950 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-primary-500 dark:text-primary-400" />
                    <div>
                      <p className="text-sm font-medium text-primary-800 dark:text-primary-100">{file.name}</p>
                      <p className="text-xs text-primary-600 dark:text-primary-300">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {result && (
                      <div className="flex items-center gap-2">
                        {result.status === 'success' && (
                          <>
                            <CheckCircle className="w-5 h-5 text-success-500 dark:text-success-300" />
                            <span className="text-sm text-success-500 dark:text-success-300">Imported</span>
                            {result.changes && Math.abs(result.changes.overallDelta) < NOTABLE_DELTA && (
                              <span className="text-xs text-primary-400">
                                {signed(result.changes.overallDelta)} vs {shortPeriod(result.changes.prevPeriod)}
                              </span>
                            )}
                          </>
                        )}
                        {result.status === 'duplicate' && (
                          <>
                            <AlertCircle className="w-5 h-5 text-warning-500 dark:text-warning-300" />
                            <span className="text-sm text-warning-500 dark:text-warning-300">Duplicate</span>
                          </>
                        )}
                        {result.status === 'failed' && (
                          <>
                            <XCircle className="w-5 h-5 text-error-500 dark:text-error-300" />
                            <span className="text-sm text-error-500 dark:text-error-300">Failed</span>
                          </>
                        )}
                      </div>
                    )}

                    {/* Multi-row outcome (CSV files): compact per-status tallies */}
                    {fileResults.length > 1 && (
                      <div className="flex items-center gap-3 text-sm">
                        {counts.success > 0 && (
                          <span className="flex items-center gap-1 text-success-500 dark:text-success-300">
                            <CheckCircle className="w-4 h-4" /> {counts.success}
                          </span>
                        )}
                        {counts.duplicate > 0 && (
                          <span className="flex items-center gap-1 text-warning-500 dark:text-warning-300">
                            <AlertCircle className="w-4 h-4" /> {counts.duplicate}
                          </span>
                        )}
                        {counts.failed > 0 && (
                          <span className="flex items-center gap-1 text-error-500 dark:text-error-300">
                            <XCircle className="w-4 h-4" /> {counts.failed}
                          </span>
                        )}
                      </div>
                    )}

                    {!importing && fileResults.length === 0 && results.length === 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(index)}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <Button
            onClick={handleImport}
            disabled={importing || results.length > 0}
            className="w-full"
          >
            {importing ? 'Importing...' : `Import ${files.length} File${files.length > 1 ? 's' : ''}`}
          </Button>
        </Card>
      )}

      {/* Import summary */}
      {summary && (
        <Card className="p-6">
          <h2 className="text-lg font-medium font-serif text-primary-800 dark:text-primary-100 mb-4">Import Summary</h2>

          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-center">
              <p className="text-2xl font-semibold text-success-500 dark:text-success-300">{summary.success}</p>
              <p className="text-sm text-primary-600 dark:text-primary-300">Imported</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-semibold text-warning-500 dark:text-warning-300">{summary.duplicates}</p>
              <p className="text-sm text-primary-600 dark:text-primary-300">Duplicates</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-semibold text-error-500 dark:text-error-300">{summary.failed}</p>
              <p className="text-sm text-primary-600 dark:text-primary-300">Failed</p>
            </div>
          </div>

          {/* Notable changes — imports that moved overall experience by
              >= 5 points vs the unit's previous survey. Omitted when empty. */}
          {notableChanges.length > 0 && (
            <div className="border-t pt-4 mb-4">
              <h3 className="text-sm font-medium text-primary-800 dark:text-primary-100 mb-2">Notable changes</h3>
              <div className="space-y-1.5">
                {notableChanges.map((r, index) => {
                  const c = r.changes!;
                  const up = c.overallDelta >= 0;
                  return (
                    <div key={index} className="flex items-center gap-2 text-sm">
                      {up ? (
                        <TrendingUp className="w-4 h-4 flex-shrink-0 text-success-500 dark:text-success-300" />
                      ) : (
                        <TrendingDown
                          className={`w-4 h-4 flex-shrink-0 ${c.overallDelta <= -10 ? 'text-error-500 dark:text-error-300' : 'text-warning-500 dark:text-warning-300'}`}
                        />
                      )}
                      <span
                        className={
                          up
                            ? 'text-success-500 dark:text-success-300'
                            : c.overallDelta <= -10
                              ? 'text-error-500 dark:text-error-300'
                              : 'text-warning-500 dark:text-warning-300'
                        }
                      >
                        <span className="font-medium">{r.unit}</span>: overall experience{' '}
                        {up ? 'up' : 'down'} {Math.abs(c.overallDelta).toFixed(1)} pts vs{' '}
                        {shortPeriod(c.prevPeriod)} (response rate {signed(c.responseRateDelta)}%)
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {results.length > 0 && (
            <div className="border-t pt-4">
              <h3 className="text-sm font-medium text-primary-800 dark:text-primary-100 mb-2">Details</h3>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {results.map((result, index) => (
                  <div key={index} className="text-sm">
                    <span className="font-medium">{result.file}:</span>{' '}
                    {result.status === 'success' && (
                      <span className="text-success-500 dark:text-success-300">
                        Imported {result.unit} - {result.period}
                        {result.changes && Math.abs(result.changes.overallDelta) < NOTABLE_DELTA && (
                          <span className="text-primary-400">
                            {' '}
                            ({signed(result.changes.overallDelta)} vs {shortPeriod(result.changes.prevPeriod)})
                          </span>
                        )}
                      </span>
                    )}
                    {result.status === 'duplicate' && (
                      <span className="text-warning-500 dark:text-warning-300">
                        Already exists ({result.unit} - {result.period})
                      </span>
                    )}
                    {result.status === 'failed' && (
                      <span className="text-error-500 dark:text-error-300">
                        {result.error || 'Import failed'}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
