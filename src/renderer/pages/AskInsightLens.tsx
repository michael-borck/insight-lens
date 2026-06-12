import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader, AlertCircle, Sparkles, Pin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { LineChart } from '../components/charts/LineChart';
import { BarChart } from '../components/charts/BarChart';
import { askInsightLens, resolveChartData } from '../services/aiService';
import { OllamaSetupCard } from '../components/OllamaSetupCard';
import { useStore } from '../utils/store';
import { logger } from '../utils/logger';

interface Message {
  id: string;
  type: 'user' | 'ai';
  content: string;
  chartSpec?: any;
  chartData?: any;
  timestamp: Date;
  isLoading?: boolean;
  error?: string;
  /** The user question an AI reply (and its chart) answers. */
  question?: string;
}

export function AskInsightLens() {
  const exampleQuestions = [
    "Show me units with declining satisfaction",
    "Which units have the best response rates?",
    "How has overall experience changed over time?",
    "Compare satisfaction scores across disciplines",
  ];

  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'ai',
      content: "Hello! I can help you explore your survey data. Ask me anything about your units, satisfaction trends, student comments, or response rates.\n\nHere are some questions to get you started:",
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { settings, settingsLoaded } = useStore();
  const navigate = useNavigate();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: input.trim(),
      timestamp: new Date()
    };

    const loadingMessage: Message = {
      id: (Date.now() + 1).toString(),
      type: 'ai',
      content: 'Analyzing your question...',
      timestamp: new Date(),
      isLoading: true
    };

    logger.debug('User message created:', userMessage);
    logger.debug('Input value before trim:', JSON.stringify(input));
    logger.debug('Input value after trim:', JSON.stringify(input.trim()));
    logger.debug('Messages array before adding:', messages.length);
    setMessages(prev => {
      const newMessages = [...prev, userMessage, loadingMessage];
      logger.debug('Messages array after adding:', newMessages.length);
      logger.debug('Last user message in array:', newMessages.find(m => m.type === 'user' && m.id === userMessage.id));
      return newMessages;
    });
    setInput('');
    setIsLoading(true);

    try {
      const response = await askInsightLens(input.trim());
      
      if (!response.success) {
        // Update loading message with error
        setMessages(prev => prev.map(msg => 
          msg.id === loadingMessage.id 
            ? { ...msg, content: response.error || 'Sorry, I encountered an error.', isLoading: false, error: response.error }
            : msg
        ));
        return;
      }

      const aiMessage: Message = {
        id: loadingMessage.id,
        type: 'ai',
        content: response.chartSpec?.insights || 'Here\'s what I found:',
        chartSpec: response.chartSpec,
        timestamp: new Date(),
        isLoading: false,
        question: userMessage.content
      };

      // If we have a chart spec, resolve the data the main process fetched
      // for it. Capture chartSpec in a const so TypeScript keeps the narrowed
      // (non-undefined) type across the closures below — `if (x) {}` only
      // narrows direct references to `x`, not property accesses inside
      // nested callbacks.
      if (response.chartSpec) {
        const chartSpec = response.chartSpec;
        try {
          const chartData = resolveChartData(chartSpec, response);
          aiMessage.chartData = chartData;

          // Check if we should fall back to a different chart type or if all values are null.
          // chartSpec.data.yAxis is optional on the ChartSpec type — when the spec
          // didn't name a y-axis column (e.g. 'summary' / 'table' types) there's
          // no per-row value to validate, so treat as valid-by-default.
          const yAxisKey = chartSpec.data.yAxis;
          const hasValidData = !yAxisKey || (
            chartData && chartData.length > 0 && chartData.some((row: any) => {
              const yValue = row[yAxisKey];
              return yValue !== null && yValue !== undefined && !isNaN(Number(yValue));
            })
          );

          if (!hasValidData && chartSpec.chartType !== 'table') {
            aiMessage.content = `No data found for "${input.trim()}". This could mean:\n\n• The database doesn't contain the specific data requested\n• The time period or criteria is too narrow\n• Survey data may need to be imported first\n\nTry asking a broader question or check what data is available in the database.`;
            aiMessage.chartSpec = {
              chartType: 'summary',
              title: 'No Data Available',
              data: { sql: '', xAxis: '', yAxis: '' },
              insights: aiMessage.content
            };
            aiMessage.chartData = undefined;
          }
        } catch (error) {
          const errorMessage = (error as Error).message;
          logger.error('Chart execution error:', errorMessage);
          
          // Provide helpful error messages based on error type
          if (errorMessage.includes('no such table') || errorMessage.includes('no such column')) {
            aiMessage.error = 'Database structure issue: ' + errorMessage + '. The database may be empty or corrupted.';
            aiMessage.content = 'It looks like the database structure is not as expected. Please try importing survey data first.';
          } else if (errorMessage.includes('No data returned')) {
            aiMessage.error = undefined; // Don't show as error, just explain
            aiMessage.content = 'No data found for your query. This could mean:\n\n• The database is empty - try importing survey data first\n• The query criteria is too specific\n• The data you\'re looking for doesn\'t exist in the current dataset\n\nTry asking a broader question or check if survey data has been imported.';
          } else {
            aiMessage.error = 'Failed to load chart data: ' + errorMessage;
            aiMessage.content = 'I encountered an issue loading the data. Please try rephrasing your question or check if survey data has been imported.';
          }
          
          // Clear chart spec if we can't execute it
          aiMessage.chartSpec = undefined;
          aiMessage.chartData = undefined;
        }
      }

      setMessages(prev => prev.map(msg => 
        msg.id === loadingMessage.id ? aiMessage : msg
      ));

    } catch (error) {
      setMessages(prev => prev.map(msg => 
        msg.id === loadingMessage.id 
          ? { ...msg, content: 'Sorry, I encountered an error. Please check your AI settings and try again.', isLoading: false, error: (error as Error).message }
          : msg
      ));
    } finally {
      setIsLoading(false);
    }
  };

  const handlePin = async (message: Message) => {
    try {
      const result = await window.electronAPI.pinChart(message.question ?? '', message.chartSpec);
      if (result.success) {
        toast.success('Pinned to Dashboard');
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      toast.error(`Failed to pin chart: ${(error as Error).message}`);
    }
  };

  const renderChart = (message: Message) => {
    if (!message.chartSpec || !message.chartData) return null;

    const { chartType, title, data } = message.chartSpec;

    // Summary responses carry no re-runnable SQL, so they can't be pinned.
    const canPin = chartType === 'line' || chartType === 'bar' || chartType === 'table';

    // Title plus the originating question, so the chart card is
    // self-describing even when scrolled away from the conversation.
    const chartHeader = (
      <div className="mb-4 flex items-start justify-between gap-2">
        <div>
          <h4 className="text-lg font-medium text-primary-800 dark:text-primary-100 font-serif">{title}</h4>
          {message.question && (
            <p className="text-xs text-primary-500 dark:text-primary-400 mt-0.5">In response to: "{message.question}"</p>
          )}
        </div>
        {canPin && (
          <button
            type="button"
            onClick={() => handlePin(message)}
            title="Pin to Dashboard"
            aria-label="Pin to Dashboard"
            className="p-1.5 flex-shrink-0 text-primary-400 hover:text-primary-700 dark:hover:text-primary-200 hover:bg-primary-50 dark:hover:bg-primary-800 rounded-md transition-colors"
          >
            <Pin className="w-4 h-4" />
          </button>
        )}
      </div>
    );

    logger.debug('=== CHART DEBUG ===');
    logger.debug('Chart Type:', chartType);
    logger.debug('Chart Title:', title);
    logger.debug('X-Axis:', data.xAxis);
    logger.debug('Y-Axis:', data.yAxis);
    logger.debug('Data Count:', message.chartData?.length);
    logger.debug('RAW DATA:', JSON.stringify(message.chartData, null, 2));
    logger.debug('First Row Keys:', message.chartData?.[0] ? Object.keys(message.chartData[0]) : 'No data');
    logger.debug('Sample Row:', message.chartData?.[0]);
    
    switch (chartType) {
      case 'line':
        return (
          <Card className="mt-4 p-4">
            {chartHeader}
            <LineChart
              data={message.chartData}
              xKey={data.xAxis}
              yKey={data.yAxis}
              xLabel={data.xAxis}
              yLabel={data.yAxis}
            />
          </Card>
        );
      
      case 'bar':
        return (
          <Card className="mt-4 p-4">
            {chartHeader}
            <BarChart
              data={message.chartData}
              xKey={data.xAxis}
              yKey={data.yAxis}
              xLabel={data.xAxis}
              yLabel={data.yAxis}
            />
          </Card>
        );
      
      case 'summary':
        return (
          <Card className="mt-4 p-4">
            {chartHeader}
            <div className="prose prose-sm max-w-none">
              <p className="text-primary-700 dark:text-primary-200 leading-relaxed whitespace-pre-wrap">
                {message.chartSpec.insights}
              </p>
            </div>
          </Card>
        );
      
      case 'table':
        if (!message.chartData || message.chartData.length === 0) {
          return (
            <Card className="mt-4 p-4">
              {chartHeader}
              <div className="p-8 text-center bg-primary-50 dark:bg-primary-950 rounded-lg border-2 border-dashed border-primary-200 dark:border-primary-700">
                <div className="text-primary-400 mb-2">📋</div>
                <h3 className="text-lg font-medium text-primary-800 dark:text-primary-100 mb-1">No Data Available</h3>
                <p className="text-sm text-primary-600 dark:text-primary-300">No rows found for this query</p>
              </div>
            </Card>
          );
        }
        
        return (
          <Card className="mt-4 p-4">
            {chartHeader}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-primary-200 dark:divide-primary-700">
                <thead className="bg-primary-50 dark:bg-primary-950">
                  <tr>
                    {Object.keys(message.chartData[0] || {}).map((key) => (
                      <th key={key} scope="col" className="px-4 py-3 text-left text-xs font-medium text-primary-600 dark:text-primary-300 uppercase tracking-wider">
                        {key.replace(/_/g, ' ')}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-primary-900 divide-y divide-primary-200 dark:divide-primary-700">
                  {message.chartData.slice(0, 10).map((row: any, idx: number) => (
                    <tr key={idx}>
                      {Object.values(row).map((value: any, cellIdx) => (
                        <td key={cellIdx} className="px-4 py-3 whitespace-nowrap text-sm text-primary-800 dark:text-primary-100">
                          {typeof value === 'number' ? value.toFixed(1) : value}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {message.chartData.length > 10 && (
                <p className="text-sm text-primary-600 dark:text-primary-300 mt-2 px-4">
                  Showing first 10 of {message.chartData.length} results
                </p>
              )}
            </div>
          </Card>
        );
      
      default:
        return null;
    }
  };

  if (!settingsLoaded) {
    return (
      <div className="max-w-4xl mx-auto">
        <Card className="p-8">
          <div className="text-center">
            <Loader className="w-16 h-16 text-primary-500 dark:text-primary-400 mx-auto mb-4 animate-spin" />
            <h3 className="text-2xl font-medium text-primary-800 dark:text-primary-100 font-serif mb-2">Loading Settings...</h3>
            <p className="text-primary-600 dark:text-primary-300 mb-6 max-w-md mx-auto">
              Please wait while we load your AI configuration.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  if (!settings.aiModel) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="text-center pt-4">
          <Bot className="w-16 h-16 text-primary-500 dark:text-primary-400 mx-auto mb-4" />
          <h3 className="text-2xl font-medium text-primary-800 dark:text-primary-100 font-serif mb-2">Set Up Your AI Assistant</h3>
          <p className="text-primary-600 dark:text-primary-300 max-w-md mx-auto">
            Ask questions about your survey data in plain English. The private option runs
            entirely on this computer — no account, no API key, no data leaving your machine.
          </p>
        </div>

        <OllamaSetupCard />

        <p className="text-center text-sm text-primary-500 dark:text-primary-400">
          Prefer a cloud provider (Claude, GPT, Gemini)?{' '}
          <button
            onClick={() => navigate('/settings')}
            className="underline hover:text-primary-700 dark:hover:text-primary-200"
          >
            Configure it in Settings
          </button>
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)]">
      {/* Header */}
      <div className="text-center py-4 flex-shrink-0">
        <div className="flex items-center justify-center gap-3 mb-1">
          <Sparkles className="w-7 h-7 text-primary-300" />
          <h1 className="text-2xl font-bold font-serif text-primary-800 dark:text-primary-100">Ask InsightLens</h1>
        </div>
        <p className="text-sm text-primary-600 dark:text-primary-300">
          Ask questions about your survey data and get instant insights
        </p>
      </div>

      {/* Messages - scrollable area */}
      <div className="flex-1 overflow-y-auto px-4 scrollbar-thin">
        <div className="max-w-4xl mx-auto space-y-4 pb-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-3 ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {message.type === 'ai' && (
              <div className="flex-shrink-0 mt-1">
                <div className="w-8 h-8 bg-primary-100 dark:bg-primary-800 rounded-full flex items-center justify-center">
                  <Bot className="w-5 h-5 text-primary-700 dark:text-primary-200" />
                </div>
              </div>
            )}

            <div className="max-w-[70%]">
              <div
                className={`rounded-xl px-4 py-3 ${
                  message.type === 'user'
                    ? 'bg-primary-800 text-primary-100'
                    : 'bg-white dark:bg-primary-900 border border-primary-200 dark:border-primary-700 text-primary-800 dark:text-primary-100'
                }`}
              >
                <div className="flex items-start gap-2">
                  {message.isLoading && <Loader className="w-4 h-4 animate-spin flex-shrink-0 mt-0.5" />}
                  {message.error && <AlertCircle className="w-4 h-4 text-error-500 dark:text-error-300 flex-shrink-0 mt-0.5" />}
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">
                    {message.content}
                  </p>
                </div>

                {message.error && (
                  <p className="text-xs text-error-500 dark:text-error-300 mt-2">{message.error}</p>
                )}
              </div>

              {renderChart(message)}

              <p className="text-xs text-primary-500 dark:text-primary-400 mt-1.5 px-1">
                {message.timestamp.toLocaleTimeString()}
              </p>
            </div>

            {message.type === 'user' && (
              <div className="flex-shrink-0 mt-1">
                <div className="w-8 h-8 bg-primary-100 dark:bg-primary-800 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-primary-700 dark:text-primary-200" />
                </div>
              </div>
            )}
          </div>
        ))}
        {/* Suggestion chips shown when only the welcome message exists */}
        {messages.length === 1 && (
          <div className="flex flex-wrap gap-2 ml-11 mt-1">
            {exampleQuestions.map((q) => (
              <button
                key={q}
                onClick={() => {
                  setInput(q);
                  // Auto-submit after a brief moment so user sees what was selected
                  setTimeout(() => {
                    const form = document.querySelector('form');
                    form?.requestSubmit();
                  }, 100);
                }}
                className="px-3 py-1.5 text-xs text-primary-700 dark:text-primary-200 bg-primary-50 dark:bg-primary-950 hover:bg-primary-100 dark:hover:bg-primary-800 rounded-full border border-primary-200 dark:border-primary-700 transition-colors"
              >
                {q}
              </button>
            ))}
          </div>
        )}
        <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input - pinned to bottom */}
      <div className="flex-shrink-0 border-t border-primary-200 dark:border-primary-700 bg-white dark:bg-primary-900 px-4 py-3">
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your survey data..."
            className="flex-1 px-4 py-2.5 border border-primary-200 dark:border-primary-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-300 text-sm"
            disabled={isLoading}
          />
          <Button type="submit" disabled={isLoading || !input.trim()}>
            <Send className="w-4 h-4 mr-2" />
            Ask
          </Button>
        </form>
      </div>
    </div>
  );
}