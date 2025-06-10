import React from 'react';
import { ExternalLink, Heart, Github } from 'lucide-react';
import { Card } from '../components/Card';

export function About() {
  const dependencies = [
    {
      category: "Core Framework",
      items: [
        { name: "Electron", description: "Cross-platform desktop application framework", license: "MIT" },
        { name: "React", description: "JavaScript library for building user interfaces", license: "MIT" },
        { name: "TypeScript", description: "Typed superset of JavaScript", license: "Apache-2.0" }
      ]
    },
    {
      category: "UI & Styling", 
      items: [
        { name: "Tailwind CSS", description: "Utility-first CSS framework", license: "MIT" },
        { name: "Lucide React", description: "Beautiful & consistent icons", license: "ISC" },
        { name: "React Router", description: "Declarative routing for React", license: "MIT" }
      ]
    },
    {
      category: "Data Visualization",
      items: [
        { name: "Chart.js", description: "Flexible JavaScript charting library", license: "MIT" },
        { name: "D3", description: "Data-driven documents", license: "BSD-3-Clause" },
        { name: "react-chartjs-2", description: "React components for Chart.js", license: "MIT" }
      ]
    },
    {
      category: "Database & Processing",
      items: [
        { name: "better-sqlite3", description: "Fast SQLite3 library for Node.js", license: "MIT" },
        { name: "pdf-parse", description: "Pure JavaScript PDF text extraction", license: "MIT" },
        { name: "pdfjs-dist", description: "PDF parsing and rendering", license: "Apache-2.0" }
      ]
    }
  ];

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">About InsightLens</h1>
        <p className="text-lg text-gray-600 mb-4">
          Unit survey analysis tool for lecturers
        </p>
        <div className="flex items-center justify-center gap-4 text-sm text-gray-500">
          <span>Version 1.0.0</span>
          <span>•</span>
          <span>MIT License</span>
        </div>
      </div>

      {/* Description */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">What is InsightLens?</h2>
        <div className="space-y-4 text-gray-700">
          <p>
            InsightLens is a powerful desktop application designed to help university lecturers 
            analyze unit survey data with ease. Built with privacy in mind, all your data stays 
            on your computer while providing powerful visualizations and AI-powered insights.
          </p>
          
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <h3 className="font-medium text-gray-900 mb-2">Key Features</h3>
              <ul className="space-y-1 text-sm">
                <li>• Import PDF survey reports</li>
                <li>• Interactive charts and visualizations</li>
                <li>• AI-powered analysis (optional)</li>
                <li>• Local SQLite database</li>
                <li>• Privacy-first design</li>
                <li>• Cloud sync ready</li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-medium text-gray-900 mb-2">Tech Stack</h3>
              <ul className="space-y-1 text-sm">
                <li>• Electron + React + TypeScript</li>
                <li>• Tailwind CSS for styling</li>
                <li>• Chart.js for visualizations</li>
                <li>• SQLite for data storage</li>
                <li>• PDF parsing capabilities</li>
              </ul>
            </div>
          </div>
        </div>
      </Card>

      {/* Open Source Attribution */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Heart className="w-5 h-5 text-red-500" />
          <h2 className="text-xl font-semibold text-gray-900">Open Source Attribution</h2>
        </div>
        
        <p className="text-gray-700 mb-6">
          InsightLens is built with many excellent open source projects. We gratefully 
          acknowledge the work of their contributors and maintainers.
        </p>

        <div className="space-y-6">
          {dependencies.map((category) => (
            <div key={category.category}>
              <h3 className="font-medium text-gray-900 mb-3 border-b border-gray-200 pb-1">
                {category.category}
              </h3>
              <div className="grid gap-3">
                {category.items.map((item) => (
                  <div key={item.name} className="flex items-start justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">{item.name}</span>
                        <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded">
                          {item.license}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-900">
            <ExternalLink className="w-4 h-4 inline mr-1" />
            For complete license texts and more details, see the{' '}
            <button 
              onClick={() => window.electronAPI?.openExternal?.('file://' + __dirname + '/../../../ATTRIBUTION.md')}
              className="underline hover:no-underline"
            >
              ATTRIBUTION.md
            </button>{' '}
            file in the application directory.
          </p>
        </div>
      </Card>

      {/* License */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">License</h2>
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-sm text-gray-700 leading-relaxed">
            <strong>MIT License</strong><br />
            Copyright (c) 2024 InsightLens Contributors<br /><br />
            
            Permission is hereby granted, free of charge, to any person obtaining a copy
            of this software and associated documentation files (the "Software"), to deal
            in the Software without restriction, including without limitation the rights
            to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
            copies of the Software, and to permit persons to whom the Software is
            furnished to do so, subject to the following conditions:
            <br /><br />
            
            The above copyright notice and this permission notice shall be included in all
            copies or substantial portions of the Software.
            <br /><br />
            
            THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
            IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
            FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
          </p>
        </div>
      </Card>

      {/* Footer */}
      <div className="text-center py-8">
        <p className="text-gray-500 text-sm">
          Made with <Heart className="w-4 h-4 inline text-red-500" /> for educators
        </p>
        <p className="text-xs text-gray-400 mt-2">
          Thank you to all the open source contributors who made this possible! 🙏
        </p>
      </div>
    </div>
  );
}