import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader, AlertCircle, BarChart3 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card } from './Card';
import { Button } from './Button';
import { LineChart } from './charts/LineChart';
import { BarChart } from './charts/BarChart';
import { askInsightLens, executeChartSpec } from '../services/aiService';
import { useStore } from '../utils/store';

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

export function AiChat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'ai',
      content: "Hi! I'm InsightLens AI. I can help you analyze your survey data. Try asking questions like:\n\n• \"Show me units with declining satisfaction\"\n• \"Which campus has the best response rates?\"\n• \"How has sentiment changed over time?\"\n• \"Compare engagement scores across disciplines\"",
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

    setMessages(prev => [...prev, userMessage, loadingMessage]);
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
          
          // Check if we should fall back to a different chart type
          if ((!chartData || chartData.length === 0) && response.chartSpec.chartType !== 'table') {
            aiMessage.content = 'No data found for the requested visualization. You may need to import survey data first, or try asking a different question.';
            aiMessage.chartSpec = undefined;
            aiMessage.chartData = undefined;
          }
        } catch (error) {
          const errorMessage = (error as Error).message;
          console.error('Chart execution error:', errorMessage);
          
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

    switch (chartType) {
      case 'line':
        return (
          <div className="mt-4">
            <h4 className="text-sm font-medium text-gray-900 mb-2">{title}</h4>
            <LineChart
              data={message.chartData}
              xKey={data.xAxis}
              yKey={data.yAxis}
              xLabel={data.xAxis}
              yLabel={data.yAxis}
            />
          </div>
        );
      
      case 'summary':
        return (
          <div className="mt-4">
            <h4 className="text-sm font-medium text-gray-900 mb-2">{title}</h4>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                {message.chartSpec.insights}
              </p>
            </div>
          </div>
        );
      
      case 'bar':
        return (
          <div className="mt-4">
            <h4 className="text-sm font-medium text-gray-900 mb-2">{title}</h4>
            <BarChart
              data={message.chartData}
              xKey={data.xAxis}
              yKey={data.yAxis}
              xLabel={data.xAxis}
              yLabel={data.yAxis}
            />
          </div>
        );
      
      case 'table':
        if (!message.chartData || message.chartData.length === 0) {
          return (
            <div className="mt-4">
              <h4 className="text-sm font-medium text-gray-900 mb-2">{title}</h4>
              <div className="p-8 text-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                <div className="text-gray-400 mb-2">📋</div>
                <h3 className="text-lg font-medium text-gray-900 mb-1">No Data Available</h3>
                <p className="text-sm text-gray-500">No rows found for this query</p>
              </div>
            </div>
          );
        }
        
        return (
          <div className="mt-4">
            <h4 className="text-sm font-medium text-gray-900 mb-2">{title}</h4>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {Object.keys(message.chartData[0] || {}).map((key) => (
                      <th key={key} className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {key.replace(/_/g, ' ')}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {message.chartData.slice(0, 10).map((row: any, idx: number) => (
                    <tr key={idx}>
                      {Object.values(row).map((value: any, cellIdx) => (
                        <td key={cellIdx} className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                          {typeof value === 'number' ? value.toFixed(1) : value}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {message.chartData.length > 10 && (
                <p className="text-xs text-gray-500 mt-2">
                  Showing first 10 of {message.chartData.length} results
                </p>
              )}
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  if (!settingsLoaded) {
    return (
      <Card className="p-6">
        <div className="text-center">
          <Loader className="w-12 h-12 text-gray-400 mx-auto mb-4 animate-spin" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Loading Settings...</h3>
          <p className="text-sm text-gray-500">
            Please wait while we load your configuration.
          </p>
        </div>
      </Card>
    );
  }

  if (!settings.apiUrl) {
    return (
      <Card className="p-6">
        <div className="text-center">
          <Bot className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">AI Assistant Not Configured</h3>
          <p className="text-sm text-gray-500 mb-4">
            Set up your AI provider in Settings to start asking questions about your survey data.
          </p>
          <Button onClick={() => navigate('/settings')}>
            Go to Settings
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col h-96">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-gray-200">
        <Bot className="w-6 h-6 text-primary-600" />
        <h3 className="text-lg font-medium text-gray-900">Ask InsightLens</h3>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-3 ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {message.type === 'ai' && (
              <div className="flex-shrink-0">
                <Bot className="w-6 h-6 text-primary-600" />
              </div>
            )}
            
            <div className={`max-w-[80%] ${message.type === 'user' ? 'order-first' : ''}`}>
              <div
                className={`rounded-lg p-3 ${
                  message.type === 'user'
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}
              >
                <div className="flex items-center gap-2">
                  {message.isLoading && <Loader className="w-4 h-4 animate-spin" />}
                  {message.error && <AlertCircle className="w-4 h-4 text-red-500" />}
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                </div>
                
                {message.error && (
                  <p className="text-xs text-red-500 mt-2">{message.error}</p>
                )}
              </div>
              
              {renderChart(message)}
              
              <p className="text-xs text-gray-500 mt-1">
                {message.timestamp.toLocaleTimeString()}
              </p>
            </div>
            
            {message.type === 'user' && (
              <div className="flex-shrink-0">
                <User className="w-6 h-6 text-gray-600" />
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-gray-200">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your survey data..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
            disabled={isLoading}
          />
          <Button type="submit" disabled={isLoading || !input.trim()}>
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </form>
    </Card>
  );
}