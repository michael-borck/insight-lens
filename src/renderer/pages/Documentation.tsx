import React from 'react';
import { ExternalLink, BookOpen, Play, FileText, MessageCircle, Settings, HelpCircle } from 'lucide-react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';

export function Documentation() {
  const handleExternalLink = (url: string) => {
    window.electronAPI?.openExternal?.(url);
  };

  const quickHelp = [
    {
      title: "Getting Started",
      description: "New to InsightLens? Start here for installation and setup.",
      icon: Play,
      color: "text-green-600",
      bgColor: "bg-green-50",
      links: [
        { name: "Installation Guide", url: "/docs/getting-started/installation" },
        { name: "First Run Setup", url: "/docs/getting-started/first-run" },
        { name: "Dashboard Overview", url: "/docs/getting-started/dashboard-overview" }
      ]
    },
    {
      title: "Essential Workflow",
      description: "Learn the core features for analyzing your survey data.",
      icon: FileText,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      links: [
        { name: "Importing Data", url: "/docs/essential-workflow/importing-data" },
        { name: "Exploring Trends", url: "/docs/essential-workflow/exploring-trends" },
        { name: "Unit Filtering", url: "/docs/essential-workflow/unit-filtering" }
      ]
    },
    {
      title: "AI Assistant",
      description: "Set up and use AI features for natural language analysis.",
      icon: MessageCircle,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
      links: [
        { name: "Setup AI Providers", url: "/docs/ai-chat/setup-ai-providers" },
        { name: "Asking Questions", url: "/docs/ai-chat/asking-questions" },
        { name: "Chart Generation", url: "/docs/ai-chat/chart-generation" }
      ]
    },
    {
      title: "Troubleshooting",
      description: "Find solutions to common problems and issues.",
      icon: Settings,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
      links: [
        { name: "Common Issues", url: "/docs/troubleshooting/common-issues" },
        { name: "Connection Errors", url: "/docs/troubleshooting/connection-errors" },
        { name: "Performance Tips", url: "/docs/troubleshooting/performance-tips" }
      ]
    }
  ];

  const resourceLinks = [
    {
      title: "Complete Documentation",
      description: "Full documentation website with detailed guides",
      url: "https://insightlens.github.io/insight-lens/",
      icon: BookOpen,
      primary: true
    },
    {
      title: "FAQ",
      description: "Frequently asked questions and quick answers",
      url: "https://insightlens.github.io/insight-lens/reference/faq",
      icon: HelpCircle,
      primary: false
    },
    {
      title: "Keyboard Shortcuts",
      description: "Speed up your workflow with keyboard shortcuts",
      url: "https://insightlens.github.io/insight-lens/reference/keyboard-shortcuts",
      icon: Settings,
      primary: false
    },
    {
      title: "GitHub Repository",
      description: "Source code, issues, and feature requests",
      url: "https://github.com/insightlens/insightlens",
      icon: ExternalLink,
      primary: false
    }
  ];

  const contextualHelp = [
    {
      page: "Dashboard",
      description: "Overview of key metrics and recent activity",
      tips: ["Use Quick Insights to identify trends", "Filter by time period for focused analysis", "Export charts for presentations"]
    },
    {
      page: "Units",
      description: "Detailed analysis of individual unit performance",
      tips: ["Use search to find specific units quickly", "Compare similar units with filters", "Click unit names for detailed breakdown"]
    },
    {
      page: "AI Chat",
      description: "Natural language queries and chart generation",
      tips: ["Be specific in your questions", "Include time periods and unit types", "Ask follow-up questions for deeper analysis"]
    },
    {
      page: "Import",
      description: "Upload and process survey data files",
      tips: ["Drag and drop multiple files at once", "Check import logs for any issues", "Use CSV format for custom data"]
    }
  ];

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <BookOpen className="w-6 h-6" />
          Documentation & Help
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Get help, learn features, and find solutions to common questions
        </p>
      </div>

      {/* Quick Access Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {quickHelp.map((section) => (
          <Card key={section.title} className="p-6">
            <div className="flex items-start gap-4">
              <div className={`p-3 rounded-lg ${section.bgColor}`}>
                <section.icon className={`w-6 h-6 ${section.color}`} />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {section.title}
                </h3>
                <p className="text-gray-600 text-sm mb-4">
                  {section.description}
                </p>
                <div className="space-y-2">
                  {section.links.map((link) => (
                    <button
                      key={link.name}
                      onClick={() => handleExternalLink(`https://insightlens.github.io/insight-lens${link.url}`)}
                      className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      <ExternalLink className="w-3 h-3" />
                      {link.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Resource Links */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Documentation Resources
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {resourceLinks.map((resource) => (
            <div
              key={resource.title}
              className={`p-4 rounded-lg border-2 ${
                resource.primary 
                  ? 'border-blue-200 bg-blue-50' 
                  : 'border-gray-200 bg-gray-50'
              }`}
            >
              <div className="flex items-start gap-3">
                <resource.icon className={`w-5 h-5 mt-0.5 ${
                  resource.primary ? 'text-blue-600' : 'text-gray-600'
                }`} />
                <div className="flex-1">
                  <h3 className={`font-medium ${
                    resource.primary ? 'text-blue-900' : 'text-gray-900'
                  }`}>
                    {resource.title}
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {resource.description}
                  </p>
                  <Button
                    onClick={() => handleExternalLink(resource.url)}
                    variant={resource.primary ? "primary" : "secondary"}
                    className="mt-3 text-xs px-3 py-1"
                  >
                    Open <ExternalLink className="w-3 h-3 ml-1" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Contextual Help */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Page-Specific Help
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {contextualHelp.map((help) => (
            <div key={help.page} className="border-l-4 border-blue-200 pl-4">
              <h3 className="font-medium text-gray-900 mb-1">
                {help.page} Page
              </h3>
              <p className="text-sm text-gray-600 mb-3">
                {help.description}
              </p>
              <div className="space-y-1">
                <h4 className="text-xs font-medium text-gray-700 uppercase tracking-wide">
                  Quick Tips:
                </h4>
                {help.tips.map((tip, index) => (
                  <div key={index} className="text-xs text-gray-600 flex items-start gap-1">
                    <span className="text-blue-500 mt-1">•</span>
                    <span>{tip}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Quick Actions */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Need More Help?
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Button
            onClick={() => handleExternalLink('https://insightlens.github.io/insight-lens/')}
            className="flex items-center justify-center gap-2"
          >
            <BookOpen className="w-4 h-4" />
            Full Documentation
          </Button>
          
          <Button
            onClick={() => handleExternalLink('https://github.com/insightlens/insightlens/issues')}
            variant="secondary"
            className="flex items-center justify-center gap-2"
          >
            <MessageCircle className="w-4 h-4" />
            Report Issue
          </Button>
          
          <Button
            onClick={() => handleExternalLink('mailto:support@insightlens.app')}
            variant="secondary"
            className="flex items-center justify-center gap-2"
          >
            <HelpCircle className="w-4 h-4" />
            Contact Support
          </Button>
        </div>
      </Card>

      {/* Version Info */}
      <div className="text-center py-4">
        <p className="text-xs text-gray-500">
          InsightLens v1.0.0 • Documentation last updated: January 2024
        </p>
      </div>
    </div>
  );
}