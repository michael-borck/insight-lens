import React, { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { toast } from 'react-toastify';
import { Card } from '../components/Card';
import { Button } from '../components/Button';

interface ImportResult {
  file: string;
  status: 'success' | 'duplicate' | 'failed';
  unit?: string;
  period?: string;
  error?: string;
}

export function Import() {
  const [files, setFiles] = useState<File[]>([]);
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState<ImportResult[]>([]);
  const [summary, setSummary] = useState<{ success: number; duplicates: number; failed: number } | null>(null);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'application/pdf': ['.pdf']
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
      // Get file paths
      const filePaths = files.map(f => (f as any).path);
      
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
      console.error('Import error:', error);
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Import Surveys</h1>
        <p className="mt-1 text-sm text-gray-500">
          Upload PDF survey reports to add them to your database
        </p>
      </div>

      {/* Drop zone */}
      <Card className="p-8">
        <div
          {...getRootProps()}
          className={`
            border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
            ${isDragActive ? 'border-primary-500 bg-primary-50' : 'border-gray-300 hover:border-gray-400'}
          `}
        >
          <input {...getInputProps()} />
          <Upload className="w-12 h-12 mx-auto text-gray-400 mb-4" />
          <p className="text-lg font-medium text-gray-900">
            {isDragActive ? 'Drop the files here...' : 'Drag & drop PDF files here'}
          </p>
          <p className="mt-2 text-sm text-gray-500">
            or click to select files
          </p>
        </div>
      </Card>

      {/* File list */}
      {files.length > 0 && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-gray-900">
              Selected Files ({files.length})
            </h2>
            <Button variant="ghost" size="sm" onClick={clearAll}>
              Clear All
            </Button>
          </div>

          <div className="space-y-2 mb-4">
            {files.map((file, index) => {
              const result = results.find(r => r.file === file.name);
              
              return (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{file.name}</p>
                      <p className="text-xs text-gray-500">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {result && (
                      <div className="flex items-center gap-2">
                        {result.status === 'success' && (
                          <>
                            <CheckCircle className="w-5 h-5 text-green-600" />
                            <span className="text-sm text-green-600">Imported</span>
                          </>
                        )}
                        {result.status === 'duplicate' && (
                          <>
                            <AlertCircle className="w-5 h-5 text-orange-600" />
                            <span className="text-sm text-orange-600">Duplicate</span>
                          </>
                        )}
                        {result.status === 'failed' && (
                          <>
                            <XCircle className="w-5 h-5 text-red-600" />
                            <span className="text-sm text-red-600">Failed</span>
                          </>
                        )}
                      </div>
                    )}
                    
                    {!importing && !result && (
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
          <h2 className="text-lg font-medium text-gray-900 mb-4">Import Summary</h2>
          
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-center">
              <p className="text-2xl font-semibold text-green-600">{summary.success}</p>
              <p className="text-sm text-gray-500">Imported</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-semibold text-orange-600">{summary.duplicates}</p>
              <p className="text-sm text-gray-500">Duplicates</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-semibold text-red-600">{summary.failed}</p>
              <p className="text-sm text-gray-500">Failed</p>
            </div>
          </div>

          {results.length > 0 && (
            <div className="border-t pt-4">
              <h3 className="text-sm font-medium text-gray-900 mb-2">Details</h3>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {results.map((result, index) => (
                  <div key={index} className="text-sm">
                    <span className="font-medium">{result.file}:</span>{' '}
                    {result.status === 'success' && (
                      <span className="text-green-600">
                        Imported {result.unit} - {result.period}
                      </span>
                    )}
                    {result.status === 'duplicate' && (
                      <span className="text-orange-600">
                        Already exists ({result.unit} - {result.period})
                      </span>
                    )}
                    {result.status === 'failed' && (
                      <span className="text-red-600">
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