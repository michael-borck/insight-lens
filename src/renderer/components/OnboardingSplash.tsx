import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileSearch,
  Upload,
  BarChart3,
  Bot,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';
import { Button } from './Button';
import { useStore } from '../utils/store';
import { logger } from '../utils/logger';

interface Slide {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  body: string;
}

const slides: Slide[] = [
  {
    icon: FileSearch,
    title: 'Welcome to InsightLens',
    body: 'InsightLens turns unit survey PDFs into trends, comparisons, and comment-level insight — all on your own machine.',
  },
  {
    icon: Upload,
    title: 'Import your surveys',
    body: 'Drag-and-drop PDF survey reports onto the Import page. InsightLens extracts the stats and comments and stores them in a local SQLite database.',
  },
  {
    icon: BarChart3,
    title: 'Explore the dashboard',
    body: 'See trend charts, top performers, and units needing attention at a glance. Drill into any unit for semester-by-semester detail.',
  },
  {
    icon: Bot,
    title: 'Ask InsightLens (optional)',
    body: 'Bring your own AI provider — OpenAI, Anthropic, Google, Groq, OpenRouter, or a local Ollama model — to ask questions in plain English.',
  },
  {
    icon: ShieldCheck,
    title: 'Privacy first',
    body: 'Your survey data never leaves your computer unless you choose to use a cloud AI provider. You can change settings any time.',
  },
];

interface OnboardingSplashProps {
  onClose: () => void;
}

export function OnboardingSplash({ onClose }: OnboardingSplashProps) {
  const navigate = useNavigate();
  const { settings, setSettings } = useStore();
  const [index, setIndex] = useState(0);
  const [dontShowAgain, setDontShowAgain] = useState(!settings.showOnboardingOnStartup);

  const slide = slides[index];
  const Icon = slide.icon;
  const isLast = index === slides.length - 1;
  const isFirst = index === 0;

  const persistPreference = async () => {
    const showOnboardingOnStartup = !dontShowAgain;
    setSettings({ showOnboardingOnStartup });
    try {
      await window.electronAPI.setSettings({ showOnboardingOnStartup });
    } catch (error) {
      logger.error('Failed to save onboarding preference:', error);
    }
  };

  const handleClose = async () => {
    await persistPreference();
    onClose();
  };

  const handleGetStarted = async () => {
    await persistPreference();
    onClose();
    navigate('/docs');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-primary-900/60 backdrop-blur-sm">
      <div className="w-full max-w-xl mx-4 rounded-lg bg-white shadow-xl border border-primary-200 relative">
        <button
          onClick={handleClose}
          className="absolute top-3 right-3 p-1 text-primary-500 hover:text-primary-800 hover:bg-primary-100 rounded"
          title="Skip"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="px-8 pt-10 pb-6 text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center mb-5">
            <Icon className="w-8 h-8 text-primary-700" />
          </div>
          <h2 className="text-2xl font-semibold font-serif text-primary-800 mb-3">
            {slide.title}
          </h2>
          <p className="text-primary-700 leading-relaxed">{slide.body}</p>
        </div>

        {/* Dots */}
        <div className="flex justify-center gap-2 mb-5">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setIndex(i)}
              className={`h-2 rounded-full transition-all ${
                i === index ? 'w-6 bg-primary-700' : 'w-2 bg-primary-300 hover:bg-primary-400'
              }`}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>

        {/* Controls */}
        <div className="px-8 pb-6 flex items-center justify-between gap-3">
          <Button
            variant="secondary"
            onClick={() => setIndex((i) => Math.max(0, i - 1))}
            disabled={isFirst}
            className="flex items-center gap-1"
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </Button>

          {isLast ? (
            <Button onClick={handleGetStarted}>Open documentation</Button>
          ) : (
            <Button
              onClick={() => setIndex((i) => Math.min(slides.length - 1, i + 1))}
              className="flex items-center gap-1"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </Button>
          )}
        </div>

        <div className="px-8 pb-6 flex items-center justify-between text-sm border-t border-primary-200 pt-4">
          <label className="flex items-center gap-2 text-primary-700 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              className="rounded border-primary-300 text-primary-700 focus:ring-primary-400"
            />
            Don't show this again on startup
          </label>
          <button
            onClick={handleClose}
            className="text-primary-600 hover:text-primary-800"
          >
            Skip for now
          </button>
        </div>
      </div>
    </div>
  );
}
