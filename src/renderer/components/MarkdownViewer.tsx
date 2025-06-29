import React, { useEffect, useState } from 'react';
import { ChevronLeft, ExternalLink, Home } from 'lucide-react';
import { Button } from './Button';
import { logger } from '../utils/logger';

interface MarkdownViewerProps {
  content: string;
  title?: string;
  onBack?: () => void;
  onHome?: () => void;
  sourceUrl?: string;
}

export function MarkdownViewer({ content, title, onBack, onHome, sourceUrl }: MarkdownViewerProps) {
  const [processedContent, setProcessedContent] = useState('');

  useEffect(() => {
    // Basic markdown to HTML conversion
    // In a production app, you might want to use a library like marked or remark
    let html = content
      // Headers
      .replace(/^### (.*$)/gim, '<h3 class="text-lg font-semibold text-gray-900 mt-6 mb-3">$1</h3>')
      .replace(/^## (.*$)/gim, '<h2 class="text-xl font-semibold text-gray-900 mt-8 mb-4">$1</h2>')
      .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold text-gray-900 mb-6">$1</h1>')
      // Bold
      .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold">$1</strong>')
      // Italic
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      // Links
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-blue-600 hover:text-blue-800 underline">$1</a>')
      // Lists
      .replace(/^\* (.+)$/gim, '<li class="ml-4 list-disc">$1</li>')
      .replace(/^\d+\. (.+)$/gim, '<li class="ml-4 list-decimal">$1</li>')
      // Code blocks
      .replace(/```([^`]+)```/g, '<pre class="bg-gray-100 p-4 rounded-md overflow-x-auto my-4"><code>$1</code></pre>')
      // Inline code
      .replace(/`([^`]+)`/g, '<code class="bg-gray-100 px-1 py-0.5 rounded text-sm">$1</code>')
      // Paragraphs
      .replace(/\n\n/g, '</p><p class="mb-4 text-gray-700">')
      // Line breaks
      .replace(/\n/g, '<br />');

    // Wrap in paragraph tags
    html = '<p class="mb-4 text-gray-700">' + html + '</p>';

    // Clean up empty paragraphs
    html = html.replace(/<p class="mb-4 text-gray-700"><\/p>/g, '');

    // Wrap lists
    html = html.replace(/(<li class="ml-4 list-disc">.*<\/li>)/s, '<ul class="mb-4 space-y-1">$1</ul>');
    html = html.replace(/(<li class="ml-4 list-decimal">.*<\/li>)/s, '<ol class="mb-4 space-y-1">$1</ol>');

    setProcessedContent(html);
  }, [content]);

  const handleLinkClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'A') {
      e.preventDefault();
      const href = target.getAttribute('href');
      if (href) {
        if (href.startsWith('http')) {
          // External link - open in browser
          window.electronAPI?.openExternal?.(href);
        } else {
          // Internal link - could be handled by navigation
          logger.debug('Internal link:', href);
        }
      }
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-2">
          {onBack && (
            <Button
              onClick={onBack}
              variant="secondary"
              className="p-2"
              title="Back"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
          )}
          {onHome && (
            <Button
              onClick={onHome}
              variant="secondary"
              className="p-2"
              title="Documentation Home"
            >
              <Home className="w-4 h-4" />
            </Button>
          )}
          {title && (
            <h1 className="text-lg font-semibold text-gray-900 ml-2">{title}</h1>
          )}
        </div>
        
        {sourceUrl && (
          <Button
            onClick={() => window.electronAPI?.openExternal?.(sourceUrl)}
            variant="secondary"
            className="text-sm flex items-center gap-1"
          >
            View Online
            <ExternalLink className="w-3 h-3" />
          </Button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6 bg-white">
        <div 
          className="prose prose-sm max-w-none"
          dangerouslySetInnerHTML={{ __html: processedContent }}
          onClick={handleLinkClick}
        />
      </div>
    </div>
  );
}