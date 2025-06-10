import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader, AlertCircle, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { LineChart } from '../components/charts/LineChart';
import { BarChart } from '../components/charts/BarChart';
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
        } catch (error) {
          aiMessage.error = 'Failed to load chart data: ' + (error as Error).message;
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
      
      case 'table':
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
                    ? 'bg-primary-600 text-white'
                    : 'bg-white'
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