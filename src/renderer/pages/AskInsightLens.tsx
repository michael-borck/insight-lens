import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader, AlertCircle, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { LineChart } from '../components/charts/LineChart';
import { BarChart } from '../components/charts/BarChart';
import { askInsightLens, executeChartSpec } from '../services/aiService';
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
}

export function AskInsightLens() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'ai',
      content: "Hi! I'm InsightLens AI. I can help you analyze your survey data. Try asking questions like:\n\n• \"Show me units with declining satisfaction\"\n• \"Which campus has the best response rates?\"\n• \"How has sentiment changed over time?\"\n• \"Compare engagement scores across disciplines\"\n\nI can create charts, tables, and provide insights based on your survey data.",
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
        isLoading: false
      };

      // If we have a chart spec, execute the SQL to get data
      if (response.chartSpec) {
        try {
          const chartData = await executeChartSpec(response.chartSpec);
          aiMessage.chartData = chartData;
          
          // Check if we should fall back to a different chart type or if all values are null
          const hasValidData = chartData && chartData.length > 0 && chartData.some((row: any) => {
            const yValue = row[response.chartSpec.data.yAxis];
            return yValue !== null && yValue !== undefined && !isNaN(Number(yValue));
          });
          
          if (!hasValidData && response.chartSpec.chartType !== 'table') {
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

  const renderChart = (message: Message) => {
    if (!message.chartSpec || !message.chartData) return null;

    const { chartType, title, data } = message.chartSpec;
    
    logger.debug('=== CHART DEBUG ===');
    logger.debug('Chart Type:', chartType);
    logger.debug('Chart Title:', title);
    logger.debug('X-Axis:', data.xAxis);
    logger.debug('Y-Axis:', data.yAxis);
    logger.debug('Data Count:', message.chartData?.length);
    logger.debug('RAW DATA:', JSON.stringify(message.chartData, null, 2));
    logger.debug('First Row Keys:', message.chartData?.[0] ? Object.keys(message.chartData[0]) : 'No data');
    logger.debug('Sample Row:', message.chartData?.[0]);
    
    // Special check for sentiment queries - let's debug the data
    if (data.yAxis === 'avg_sentiment') {
      logger.debug('🔍 SENTIMENT DEBUG: Checking if comments exist...');
      window.electronAPI.queryDatabase('SELECT COUNT(*) as total_comments FROM comment').then(result => {
        logger.debug('Total comments in database:', result);
      });
      window.electronAPI.queryDatabase('SELECT COUNT(*) as comments_with_sentiment FROM comment WHERE sentiment_score IS NOT NULL').then(result => {
        logger.debug('Comments with sentiment scores:', result);
      });
      window.electronAPI.queryDatabase('SELECT comment_text, sentiment_score, sentiment_label FROM comment LIMIT 3').then(result => {
        logger.debug('Sample comments:', result);
      });
    }

    switch (chartType) {
      case 'line':
        return (
          <Card className="mt-4 p-4">
            <h4 className="text-lg font-medium text-gray-900 mb-4">{title}</h4>
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
            <h4 className="text-lg font-medium text-gray-900 mb-4">{title}</h4>
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
            <h4 className="text-lg font-medium text-gray-900 mb-4">{title}</h4>
            <div className="prose prose-sm max-w-none">
              <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                {message.chartSpec.insights}
              </p>
            </div>
          </Card>
        );
      
      case 'table':
        if (!message.chartData || message.chartData.length === 0) {
          return (
            <Card className="mt-4 p-4">
              <h4 className="text-lg font-medium text-gray-900 mb-4">{title}</h4>
              <div className="p-8 text-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                <div className="text-gray-400 mb-2">📋</div>
                <h3 className="text-lg font-medium text-gray-900 mb-1">No Data Available</h3>
                <p className="text-sm text-gray-500">No rows found for this query</p>
              </div>
            </Card>
          );
        }
        
        return (
          <Card className="mt-4 p-4">
            <h4 className="text-lg font-medium text-gray-900 mb-4">{title}</h4>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {Object.keys(message.chartData[0] || {}).map((key) => (
                      <th key={key} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {key.replace(/_/g, ' ')}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {message.chartData.slice(0, 10).map((row: any, idx: number) => (
                    <tr key={idx}>
                      {Object.values(row).map((value: any, cellIdx) => (
                        <td key={cellIdx} className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          {typeof value === 'number' ? value.toFixed(1) : value}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {message.chartData.length > 10 && (
                <p className="text-sm text-gray-500 mt-2 px-4">
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
            <Loader className="w-16 h-16 text-gray-400 mx-auto mb-4 animate-spin" />
            <h3 className="text-2xl font-medium text-gray-900 mb-2">Loading Settings...</h3>
            <p className="text-gray-500 mb-6 max-w-md mx-auto">
              Please wait while we load your AI configuration.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  if (!settings.apiUrl) {
    return (
      <div className="max-w-4xl mx-auto">
        <Card className="p-8">
          <div className="text-center">
            <Bot className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-2xl font-medium text-gray-900 mb-2">AI Assistant Not Configured</h3>
            <p className="text-gray-500 mb-6 max-w-md mx-auto">
              To start asking questions about your survey data, you'll need to set up your AI provider in Settings.
            </p>
            <Button onClick={() => navigate('/settings')} size="lg">
              Go to Settings
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="flex items-center justify-center gap-3 mb-3">
          <Sparkles className="w-8 h-8 text-primary-600" />
          <h1 className="text-3xl font-bold text-gray-900">Ask InsightLens</h1>
        </div>
        <p className="text-lg text-gray-600">
          Focus the lens by asking AI-powered questions about your survey data
        </p>
      </div>

      {/* Messages */}
      <div className="max-w-5xl mx-auto space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-4 ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {message.type === 'ai' && (
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                  <Bot className="w-5 h-5 text-primary-600" />
                </div>
              </div>
            )}
            
            <div className={`max-w-[70%] ${message.type === 'user' ? 'order-first' : ''}`}>
              <Card
                className={`p-4 ${
                  message.type === 'user'
                    ? 'bg-primary-600'
                    : 'bg-white'
                }`}
              >
                <div className="flex items-center gap-2">
                  {message.isLoading && <Loader className="w-4 h-4 animate-spin" />}
                  {message.error && <AlertCircle className="w-4 h-4 text-red-500" />}
                  <div 
                    className="text-sm whitespace-pre-wrap font-bold"
                    style={{
                      color: message.type === 'user' ? '#000000' : '#1f2937',
                      backgroundColor: message.type === 'user' ? '#ffffff' : 'transparent',
                      padding: '4px 8px',
                      borderRadius: '4px'
                    }}
                  >
                    {message.content}
                  </div>
                </div>
                
                {message.error && (
                  <p className="text-xs text-red-500 mt-2">{message.error}</p>
                )}
              </Card>
              
              {renderChart(message)}
              
              <p className="text-xs text-gray-500 mt-2">
                {message.timestamp.toLocaleTimeString()}
              </p>
            </div>
            
            {message.type === 'user' && (
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-gray-600" />
                </div>
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="max-w-4xl mx-auto">
        <Card className="p-4">
          <form onSubmit={handleSubmit} className="flex gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about your survey data..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              disabled={isLoading}
            />
            <Button type="submit" disabled={isLoading || !input.trim()}>
              <Send className="w-4 h-4 mr-2" />
              Send
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}