// Unit Survey PDF Extractor - JavaScript Version
// Uses PDF.js to extract text and regex patterns to parse survey data

// This can be used in Node.js or browser (Electron)
// For Node.js: npm install pdfjs-dist
// For browser/Electron: include PDF.js via CDN or local file

async function extractSurveyData(pdfPath) {
    const results = {
        unit_info: {},
        response_stats: {},
        percentage_agreement: {},
        benchmarks: [],
        detailed_results: {},
        comments: []
    };

    try {
        // For Node.js environment
        let pdfjsLib;
        if (typeof window === 'undefined') {
            // Node.js
            pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.js');
            const pdfWorker = await import('pdfjs-dist/legacy/build/pdf.worker.entry.js');
            pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker.default;
        } else {
            // Browser/Electron - assumes pdfjsLib is available globally
            pdfjsLib = window.pdfjsLib;
        }

        // Load the PDF
        const loadingTask = pdfjsLib.getDocument(pdfPath);
        const pdf = await loadingTask.promise;

        // Helper function to extract text from a page
        async function getPageText(pageNum) {
            const page = await pdf.getPage(pageNum);
            const textContent = await page.getTextContent();
            const text = textContent.items.map(item => item.str).join(' ');
            return text;
        }

        // ----- EXTRACT UNIT INFO (PAGE 1) -----
        const page1Text = await getPageText(1);
        
        // Extract unit code and name
        const unitMatch = page1Text.match(/([A-Z]{4}\d+)\s+(.*?)\s+-\s+Semester/);
        if (unitMatch) {
            results.unit_info.unit_code = unitMatch[1];
            results.unit_info.unit_name = unitMatch[2];
        }

        // Extract campus name and mode (internal/online)
        // Try with "Campus" first
        let campusModeMatch = page1Text.match(/- ([^-]+?)\s+Campus\s*[-–]\s*(Internal|Online)/i);
        if (campusModeMatch) {
            results.unit_info.campus_name = campusModeMatch[1].trim();
            results.unit_info.mode = campusModeMatch[2].trim();
        } else {
            // Try without "Campus" for cases like "Curtin Mauritius"
            campusModeMatch = page1Text.match(/- (Curtin\s+\w+)\s*[-–]\s*(Internal|Online)/i);
            if (campusModeMatch) {
                results.unit_info.campus_name = campusModeMatch[1].trim();
                results.unit_info.mode = campusModeMatch[2].trim();
            }
        }

        // Extract term (semester/trimester) and year
        const termYearMatch = page1Text.match(/(Semester\s+[12]|Trimester\s+[123])\s+(\d{4})/i);
        if (termYearMatch) {
            results.unit_info.term = termYearMatch[1].trim();
            results.unit_info.year = termYearMatch[2].trim();
        } else {
            // Fallback for term/year extraction
            const semesterMatch = page1Text.match(/Semester\s+(\d+)\s+(\d{4})/);
            if (semesterMatch) {
                results.unit_info.term = `Semester ${semesterMatch[1]}`;
                results.unit_info.year = semesterMatch[2];
            }
        }

        // ----- EXTRACT RESPONSE STATISTICS (PAGE 3) -----
        const page3Text = await getPageText(3);

        // Extract enrollment, responses, and response rate
        const statsMatch = page3Text.match(/# Enrolments.*?\(N\).*?# Responses.*?Response Rate\s*(\d+)\s+(\d+)\s+(\d+\.\d+)/s);
        
        if (statsMatch) {
            results.response_stats.enrollments = parseInt(statsMatch[1]);
            results.response_stats.responses = parseInt(statsMatch[2]);
            results.response_stats.response_rate = parseFloat(statsMatch[3]);
        }

        // ----- EXTRACT PERCENTAGE AGREEMENT (PAGE 3) -----
        const metrics = [
            ['I was engaged by the learning activities', 'engagement'],
            ['The resources provided helped me to learn', 'resources'],
            ['My learning was supported', 'support'],
            ['Assessments helped me to demonstrate my learning', 'assessments'],
            ['I knew what was expected of me', 'expectations'],
            ['Overall, this unit was a worthwhile experience', 'overall']
        ];

        for (const [metricText, key] of metrics) {
            // Escape special regex characters in the metric text
            const escapedText = metricText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const pattern = new RegExp(escapedText + '\\s+(\\d+\\.\\d+)%');
            const match = page3Text.match(pattern);
            if (match) {
                results.percentage_agreement[key] = parseFloat(match[1]);
            }
        }

        // ----- EXTRACT BENCHMARKS (PAGE 4) -----
        const page4Text = await getPageText(4);

        // Define benchmark categories and levels
        const benchmarkCategories = ['Engaged', 'Resources', 'Support', 'Assessments', 'Expectations', 'Overall'];
        const unitCode = results.unit_info.unit_code || '';
        const benchmarkLevels = [
            { name: "Overall", pattern: /Overall/ },
            { name: `Unit - ${unitCode}`, pattern: /Unit\s*-\s*[A-Z]{4}\d+/ },
            { name: "School", pattern: /School\s*-\s*School of/ },
            { name: "Faculty", pattern: /Faculty\s*-\s*Faculty of/ },
            { name: "Curtin", pattern: /Curtin/ }
        ];

        // Process each benchmark level
        for (const level of benchmarkLevels) {
            // Find the text block for this level
            const levelPattern = new RegExp(`(${level.pattern.source}.*?)(?=(?:${benchmarkLevels[0].pattern.source}|$))`, 'si');
            let levelMatch = page4Text.match(levelPattern);
            
            if (!levelMatch) {
                // Try a simpler pattern if the complex one fails
                const simplePattern = new RegExp(`(${level.pattern.source}.*?\n)`, 'si');
                levelMatch = page4Text.match(simplePattern);
            }

            if (levelMatch) {
                const levelText = levelMatch[1];
                
                // Extract all percentages and N values from this level's text
                const percentages = [...levelText.matchAll(/(\d+\.\d+)%/g)].map(m => m[1]);
                const nValues = [...levelText.matchAll(/\b(\d{2,})\b/g)].map(m => m[1]);
                
                // Create a row for this benchmark level
                if (percentages.length >= 6) {
                    const rowData = { Level: level.name };
                    
                    // Add percentages for each category
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

        // ----- EXTRACT DETAILED RESULTS (PAGES 5-7) -----
        const detailedResults = {};

        // Process pages 5-7 for detailed question results
        for (let pageIdx = 5; pageIdx <= 7; pageIdx++) {
            const pageText = await getPageText(pageIdx);
            
            // Check each metric to see if it's on this page
            for (const [questionText, _] of metrics) {
                if (pageText.includes(questionText)) {
                    const escapedQuestion = questionText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    const questionPattern = new RegExp(`${escapedQuestion}(.*?)(?=(Base \\(above\\)|$))`, 's');
                    const questionMatch = pageText.match(questionPattern);
                    
                    if (questionMatch) {
                        const questionBlock = questionMatch[1];
                        
                        // Extract response distributions
                        const distributions = {
                            strongly_disagree: { count: 0, percentage: 0.0 },
                            disagree: { count: 0, percentage: 0.0 },
                            neutral: { count: 0, percentage: 0.0 },
                            agree: { count: 0, percentage: 0.0 },
                            strongly_agree: { count: 0, percentage: 0.0 }
                        };
                        
                        // Patterns for each response type
                        const distributionPatterns = [
                            [/1 Strongly Disagree\s+(\d+)\s+(\d+\.\d+)%/, 'strongly_disagree'],
                            [/2 Disagree\s+(\d+)\s+(\d+\.\d+)%/, 'disagree'],
                            [/3 Neither Agree nor Disagree\s+(\d+)\s+(\d+\.\d+)%/, 'neutral'],
                            [/4 Agree\s+(\d+)\s+(\d+\.\d+)%/, 'agree'],
                            [/5 Strongly Agree\s+(\d+)\s+(\d+\.\d+)%/, 'strongly_agree']
                        ];
                        
                        // Extract each distribution
                        for (const [pattern, key] of distributionPatterns) {
                            const distMatch = pageText.match(pattern);
                            if (distMatch) {
                                distributions[key] = {
                                    count: parseInt(distMatch[1]),
                                    percentage: parseFloat(distMatch[2])
                                };
                            }
                        }
                        
                        // Extract agreement percentage
                        const agreementMatch = pageText.match(/Agreement\s+(\d+\.\d+)%/);
                        if (agreementMatch) {
                            distributions.agreement_percentage = parseFloat(agreementMatch[1]);
                        }
                        
                        detailedResults[questionText] = distributions;
                    }
                }
            }
        }
        
        results.detailed_results = detailedResults;

        // ----- EXTRACT STUDENT COMMENTS (PAGE 8) -----
        const page8Text = await getPageText(8);

        // Find the comments section between the heading and the warning text
        const commentsMatch = page8Text.match(
            /What are the main reasons for your rating.*?Comments\s*(.*?)(?:This report may contain|$)/si
        );

        if (commentsMatch) {
            const commentsText = commentsMatch[1].trim();
            
            // Split by single newlines first since that's how PDF.js typically extracts text
            let comments = commentsText.split(/\n+/).map(s => s.trim()).filter(s => s);
            
            // Sometimes PDF.js concatenates lines, so check if we need to split differently
            if (comments.length < 3) {
                // Try to identify sentence boundaries that might be comments
                // Look for patterns like: sentence ending + capital letter start
                const sentenceBreaks = commentsText.split(/\.(?:\s+)(?=[A-Z])/);
                
                if (sentenceBreaks.length > comments.length) {
                    comments = sentenceBreaks.map(s => {
                        // Add back the period if it was removed
                        const trimmed = s.trim();
                        return trimmed && !trimmed.endsWith('.') ? trimmed + '.' : trimmed;
                    }).filter(s => s && s.length > 10); // Filter out very short fragments
                }
            }
            
            // Clean up and validate comments
            const cleanedComments = [];
            for (const comment of comments) {
                const cleaned = comment.trim();
                
                // Skip if it's just "Comments" header or too short
                if (cleaned && 
                    cleaned.length > 10 && 
                    !cleaned.match(/^Comments\s*$/i) &&
                    !cleaned.includes('This report may contain')) {
                    cleanedComments.push(cleaned);
                }
            }
            
            // If we still have too few comments, try one more approach
            // Sometimes multi-sentence comments are on one line
            if (cleanedComments.length < 3 && commentsText.length > 100) {
                // Split by common sentence starters after periods
                const patterns = [
                    /\.\s+(?=I )/g,
                    /\.\s+(?=The )/g,
                    /\.\s+(?=Overall)/g,
                    /\.\s+(?=It )/g,
                    /\.\s+(?=Was )/g,
                    /\.\s+(?=Good )/g,
                    /\.\s+(?=Fun )/g,
                    /\.\s+(?=My )/g,
                    /\.\s+(?=This )/g
                ];
                
                let workingText = commentsText;
                for (const pattern of patterns) {
                    workingText = workingText.replace(pattern, '.|SPLIT|');
                }
                
                const splitComments = workingText.split('|SPLIT|')
                    .map(s => s.trim())
                    .filter(s => s && s.length > 10);
                
                if (splitComments.length > cleanedComments.length) {
                    results.comments = splitComments;
                } else {
                    results.comments = cleanedComments;
                }
            } else {
                results.comments = cleanedComments;
            }
        }

        return results;

    } catch (error) {
        console.error('Error processing PDF:', error);
        throw error;
    }
}

// Export for Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { extractSurveyData };
}

// Example usage (Node.js)
async function example() {
    try {
        const data = await extractSurveyData('unit_survey.pdf');
        console.log(JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Failed to extract survey data:', error);
    }
}

// Uncomment to run example
// example();