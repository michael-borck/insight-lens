// PDF Extraction module for Electron main process
// Uses the JavaScript version we created earlier

import * as fs from 'fs';
import * as path from 'path';
import log from 'electron-log';

// We'll use pdf-parse for Node.js environment instead of pdfjs-dist
// as it's more suitable for Electron main process
const pdfParse = require('pdf-parse');

interface SurveyData {
  unit_info: {
    unit_code?: string;
    unit_name?: string;
    campus_name?: string;
    mode?: string;
    term?: string;
    year?: string;
  };
  response_stats: {
    enrollments?: number;
    responses?: number;
    response_rate?: number;
  };
  percentage_agreement: {
    engagement?: number;
    resources?: number;
    support?: number;
    assessments?: number;
    expectations?: number;
    overall?: number;
  };
  benchmarks: any[];
  detailed_results: any;
  comments: string[];
}

export async function extractSurveyData(pdfPath: string): Promise<{ success: boolean; data?: SurveyData; error?: string }> {
  try {
    // Read PDF file
    const dataBuffer = fs.readFileSync(pdfPath);
    
    // Parse PDF
    const pdfData = await pdfParse(dataBuffer, {
      // Ensure we get page breaks for better parsing
      pagerender: (pageData: any) => {
        return pageData.getTextContent().then((textContent: any) => {
          let text = '';
          for (const item of textContent.items) {
            text += item.str + ' ';
          }
          return text + '\n\n--- PAGE BREAK ---\n\n';
        });
      }
    });

    // Split by pages
    const pages = pdfData.text.split('--- PAGE BREAK ---');
    
    const results: SurveyData = {
      unit_info: {},
      response_stats: {},
      percentage_agreement: {},
      benchmarks: [],
      detailed_results: {},
      comments: []
    };

    // Extract from each page
    if (pages[0]) extractUnitInfo(pages[0], results);
    if (pages[2]) extractResponseStats(pages[2], results);
    if (pages[2]) extractPercentageAgreement(pages[2], results);
    if (pages[3]) extractBenchmarks(pages[3], results);
    if (pages[7]) extractComments(pages[7], results);

    return { success: true, data: results };

  } catch (error) {
    log.error('PDF extraction error:', error);
    return { success: false, error: (error as Error).message };
  }
}

function extractUnitInfo(pageText: string, results: SurveyData) {
  // Extract unit code and name
  const unitMatch = pageText.match(/([A-Z]{4}\d+)\s+(.*?)\s+-\s+Semester/);
  if (unitMatch) {
    results.unit_info.unit_code = unitMatch[1];
    results.unit_info.unit_name = unitMatch[2].trim();
  }

  // Extract campus name and mode
  // Try with "Campus" first
  let campusModeMatch = pageText.match(/- ([^-]+?)\s+Campus\s*[-–]\s*(Internal|Online)/i);
  if (campusModeMatch) {
    results.unit_info.campus_name = campusModeMatch[1].trim();
    results.unit_info.mode = campusModeMatch[2].trim();
  } else {
    // Try without "Campus" for cases like "Curtin Mauritius"
    campusModeMatch = pageText.match(/- (Curtin\s+\w+)\s*[-–]\s*(Internal|Online)/i);
    if (campusModeMatch) {
      results.unit_info.campus_name = campusModeMatch[1].trim();
      results.unit_info.mode = campusModeMatch[2].trim();
    }
  }

  // Extract term and year
  const termYearMatch = pageText.match(/(Semester\s+[12]|Trimester\s+[123])\s+(\d{4})/i);
  if (termYearMatch) {
    results.unit_info.term = termYearMatch[1].trim();
    results.unit_info.year = termYearMatch[2].trim();
  }
}

function extractResponseStats(pageText: string, results: SurveyData) {
  // Extract enrollment, responses, and response rate
  const statsMatch = pageText.match(/# Enrolments.*?\(N\).*?# Responses.*?Response Rate\s*(\d+)\s+(\d+)\s+(\d+\.\d+)/s);
  
  if (statsMatch) {
    results.response_stats.enrollments = parseInt(statsMatch[1]);
    results.response_stats.responses = parseInt(statsMatch[2]);
    results.response_stats.response_rate = parseFloat(statsMatch[3]);
  }
}

function extractPercentageAgreement(pageText: string, results: SurveyData) {
  const metrics = [
    ['I was engaged by the learning activities', 'engagement'],
    ['The resources provided helped me to learn', 'resources'],
    ['My learning was supported', 'support'],
    ['Assessments helped me to demonstrate my learning', 'assessments'],
    ['I knew what was expected of me', 'expectations'],
    ['Overall, this unit was a worthwhile experience', 'overall']
  ];

  for (const [metricText, key] of metrics) {
    const escapedText = metricText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(escapedText + '\\s+(\\d+\\.\\d+)%');
    const match = pageText.match(pattern);
    if (match) {
      results.percentage_agreement[key as keyof typeof results.percentage_agreement] = parseFloat(match[1]);
    }
  }
}

function extractBenchmarks(pageText: string, results: SurveyData) {
  const benchmarkCategories = ['Engaged', 'Resources', 'Support', 'Assessments', 'Expectations', 'Overall'];
  const unitCode = results.unit_info.unit_code || '';
  
  const benchmarkLevels = [
    { name: "Overall", pattern: /Overall/ },
    { name: `Unit - ${unitCode}`, pattern: new RegExp(`Unit\\s*-\\s*${unitCode}`) },
    { name: "School", pattern: /School\s*-\s*School of/ },
    { name: "Faculty", pattern: /Faculty\s*-\s*Faculty of/ },
    { name: "Curtin", pattern: /Curtin/ }
  ];

  for (const level of benchmarkLevels) {
    const levelPattern = new RegExp(`(${level.pattern.source}.*?)(?=(?:${benchmarkLevels[0].pattern.source}|$))`, 'si');
    const levelMatch = pageText.match(levelPattern);
    
    if (levelMatch) {
      const levelText = levelMatch[1];
      const percentages = [...levelText.matchAll(/(\d+\.\d+)%/g)].map(m => m[1]);
      const nValues = [...levelText.matchAll(/\b(\d{2,})\b/g)].map(m => m[1]);
      
      if (percentages.length >= 6) {
        const rowData: any = { Level: level.name };
        
        benchmarkCategories.forEach((category, i) => {
          if (i < percentages.length) {
            rowData[`${category}_PA`] = parseFloat(percentages[i]);
            if (i < nValues.length) {
              rowData[`${category}_N`] = parseInt(nValues[i]);
            }
          }
        });
        
        results.benchmarks.push(rowData);
      }
    }
  }
}

function extractComments(pageText: string, results: SurveyData) {
  const commentsMatch = pageText.match(
    /What are the main reasons for your rating.*?Comments\s*(.*?)(?:This report may contain|$)/si
  );

  if (commentsMatch) {
    const commentsText = commentsMatch[1].trim();
    
    // Split by newlines
    let comments = commentsText.split(/\n+/).map(s => s.trim()).filter(s => s);
    
    // If we get too few comments, try sentence splitting
    if (comments.length < 3 && commentsText.length > 100) {
      const sentenceBreaks = commentsText.split(/\.(?:\s+)(?=[A-Z])/);
      
      if (sentenceBreaks.length > comments.length) {
        comments = sentenceBreaks.map(s => {
          const trimmed = s.trim();
          return trimmed && !trimmed.endsWith('.') ? trimmed + '.' : trimmed;
        }).filter(s => s && s.length > 10);
      }
    }
    
    // Clean and validate comments
    for (const comment of comments) {
      const cleaned = comment.trim();
      if (cleaned && 
          cleaned.length > 10 && 
          !cleaned.match(/^Comments\s*$/i) &&
          !cleaned.includes('This report may contain')) {
        results.comments.push(cleaned);
      }
    }
  }
}