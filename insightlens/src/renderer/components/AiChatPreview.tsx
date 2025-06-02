import React from 'react';
import { Bot, Sparkles, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card } from './Card';
import { Button } from './Button';
import { useStore } from '../utils/store';

export function AiChatPreview() {
  const { settings } = useStore();
  const navigate = useNavigate();

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
    <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/ask')}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-3">
            <Bot className="w-8 h-8 text-primary-600" />
            <h3 className="text-lg font-medium text-gray-900">Ask InsightLens</h3>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            Get AI-powered insights about your survey data. Ask natural language questions to uncover trends, patterns, and actionable insights.
          </p>
          <div className="space-y-1 text-sm text-gray-500">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              <span>Analyze trends across units</span>
            </div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              <span>Compare performance metrics</span>
            </div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              <span>Discover hidden patterns</span>
            </div>
          </div>
        </div>
        <ArrowRight className="w-5 h-5 text-gray-400 flex-shrink-0 mt-1" />
      </div>
    </Card>
  );
}