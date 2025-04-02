"""
## Introduction/Background

This document provides guidance on extracting data from the standardized "U1 Unit Survey Report" PDF (specifically using "ISYS2001 Introduction to Business Programming - Semester 1 2024 - Bentley Perth Campus- Internal" [cite: 1] as an example) using Python, the `PyMuPDF` library (`fitz`), and regular expressions (`re`). It covers specific code suggestions to fix extraction issues for certain fields and outlines the overall target data structure and general strategies employed. The goal is to leverage the report's standardized format for reliable data extraction.

## Target Data Structure and General Extraction Strategies

### Target Extracted Fields (JSON Structure Example)

This structure represents the goal for the extracted data:

```json
{
  "unit_info": {
    "unit_code": "ISYS2001",
    "unit_name": "Introduction to Business Programming",
    "campus_name": "Bentley Perth",
    "mode": "Internal",
    "term": "Semester 1",
    "year": "2024"
  },
  "response_stats": {
    "enrollments": 105,
    "responses": 18,
    "response_rate": 17.1
  },
  "percentage_agreement": {
    "engagement": 83.3,
    "resources": 94.4,
    "support": 83.3,
    "assessments": 83.3,
    "expectations": 88.9,
    "overall": 88.2
  },
  "benchmarks": [
    {
      "Level": "Overall", "Engaged_PA": 83.3, "Engaged_N": 18, /*...*/ "Overall_PA": 88.2, "Overall_N": 17
    },
    {
      "Level": "Unit - ISYS2001", "Engaged_PA": 84.2, "Engaged_N": 19, /*...*/ "Overall_PA": 88.9, "Overall_N": 18
    },
    {
      "Level": "School", "Engaged_PA": 82.9, "Engaged_N": 2504, /*...*/ "Overall_PA": 81.2, "Overall_N": 2490
    },
    {
      "Level": "Faculty", "Engaged_PA": 82.6, "Engaged_N": 5337, /*...*/ "Overall_PA": 82.9, "Overall_N": 5314
    },
    {
      "Level": "Curtin", "Engaged_PA": 79.2, "Engaged_N": 23518, /*...*/ "Overall_PA": 80.7, "Overall_N": 23399
    }
  ],
  "detailed_results": {
    "I was engaged by the learning activities": {
      "strongly_disagree": {"count": 0, "percentage": 0.0}, /*...*/ "strongly_agree": {"count": 6, "percentage": 33.3}
    },
    "The resources provided helped me to learn": { /*...*/ },
    "Overall this unit was a worthwhile experience": { /*...*/ }
  },
  "comments": [
    "As I acquire valuable knowledge, it will be useful for my future job.",
    "I got to learn Python which was totally new to me.",
    "best unit ever, michael is amazing"
    // ... more comments ...
  ]
}
```

### Generalized Extraction Strategies

1.  **Use a PDF Parsing Library:** Employ `PyMuPDF` (`fitz`) to open the PDF and extract text page by page.
2.  **Leverage Fixed Page Numbers:** Directly access specific pages known to contain certain sections in the standardized report[cite: 1].
3.  **Employ Regular Expressions (Regex):** Use Python's `re` module to find and capture specific text patterns.
4.  **Target Specific Keywords/Headers:** Anchor regex searches using unique keywords or headers within the expected page[cite: 13, 14, 15, 18, 20, 25, 29, 34, 36, 41].
5.  **Use Known Value Lists:** Incorporate known fixed values (e.g., 'Internal'/'Online', 'Semester 1'/'Semester 2') into regex for precision.
6.  **Handle Text Structure Variations:** Design regex to be robust against variations in whitespace (`\s*`, `\s+`), newlines, and special characters (`[-–]`). Use flags like `re.DOTALL` or `re.IGNORECASE` where needed.
7.  **Isolate Data Blocks/Rows:** For tables or structured lists[cite: 16, 19, 21, 23, 26, 28, 30, 32, 35, 37, 39], first isolate the relevant text block/row, then apply simpler regex within that block.
8.  **Extract Free Text:** Identify start/end markers for free-text sections (like comments [cite: 41, 71]), extract the block, and split by paragraph/line breaks.
9.  **Clean Extracted Data:** Use `.strip()` to remove extra whitespace and convert numeric strings to `int` or `float` types.



**What the code does:**

1.  **Imports:** It imports `fitz` for PDF manipulation, `re` for regular expressions, `json` for printing the output nicely, and `defaultdict` (though `defaultdict` isn't actually used in the provided snippet).
2.  **`extract_survey_data` function:**
    * **Goal:** This function aims to extract specific pieces of information from a PDF file, assumed to be a university unit survey report (likely from Curtin University, based on the patterns like "ISYS", "School of", "Faculty of", "Curtin" benchmarks).
    * **Initialization:** Creates an empty dictionary `results` with predefined keys (`unit_info`, `response_stats`, `percentage_agreement`, etc.) to hold the extracted data in a structured format.
    * **PDF Handling:** Opens the specified PDF file using `fitz.open()`.
    * **Extraction Logic (Page by Page):**
        * **Page 1 (Unit Info):** Extracts text from the first page (`doc[0]`) and uses regular expressions (`re.search`) to find and pull out the unit code, unit name, campus, delivery mode (Internal/Online), term (Semester/Trimester), and year.
        * **Page 3 (Response Stats & Agreement):** Extracts text from the third page (`doc[2]`). Uses `re.search` to find enrollment numbers, response counts, and response rate. It then iterates through a predefined list of survey questions (engagement, resources, etc.) and uses `re.search` again to find the corresponding overall percentage agreement for each.
        * **Page 4 (Benchmarks):** Extracts text from the fourth page (`doc[3]`). It defines benchmark categories (Engaged, Resources, etc.) and comparison levels (Overall, Unit, School, Faculty, Curtin). It uses complex regular expressions (`re.search`, `re.findall`) to attempt to isolate the text block for each level and extract the percentage agreement (PA) and response count (N) for each category within that level.
        * **Pages 5-7 (Detailed Results):** Iterates through pages 5, 6, and 7 (`doc[4]` to `doc[6]`). For each page, it checks if any of the predefined survey questions appear. If a question is found, it uses `re.search` to isolate the text block for that question and extracts the response distribution (counts and percentages for Strongly Disagree, Disagree, Neutral, Agree, Strongly Agree) and the overall agreement percentage for that specific question.
        * **Page 8 (Comments):** Extracts text from the eighth page (`doc[7]`). Uses `re.search` to find the comments section. It then attempts to split the text into individual comments, first trying paragraph breaks (`\n\n`) and falling back to splitting based on common sentence start patterns if the first method is insufficient. It cleans up and stores the extracted comments.
    * **Cleanup:** Closes the PDF document (`doc.close()`).
    * **Return Value:** Returns the `results` dictionary containing all the extracted and structured data.
3.  **Example Usage:** Includes a `try...except` block that calls the function with a placeholder filename (`"unit_survey.pdf"`), prints the returned data as a formatted JSON string, and includes basic error reporting if the PDF processing fails.

**In Summary:** This script is a specialized PDF parser designed to automatically extract structured data (unit details, statistics, agreement scores, benchmarks, detailed responses, comments) from a specific format of university unit survey report PDF files using text extraction (PyMuPDF) and regular expression pattern matching.
"""

import fitz  # PyMuPDF
import re
import json
from collections import defaultdict

def extract_survey_data(pdf_path):
    results = {
        'unit_info': {},
        'response_stats': {},
        'percentage_agreement': {},
        'benchmarks': [],
        'detailed_results': {},
        'comments': []
    }
    
    # Open the PDF
    doc = fitz.open(pdf_path)
    
    # ----- EXTRACT UNIT INFO (PAGE 1) -----
    page0_text = doc[0].get_text()
    
    # Extract unit code and name
    unit_match = re.search(r'([A-Z]{4}\d+)\s+(.*?)\s+-\s+Semester', page0_text)
    if unit_match:
        results['unit_info']['unit_code'] = unit_match.group(1)
        results['unit_info']['unit_name'] = unit_match.group(2)
    
    # Extract campus name and mode (internal/online)
    campus_mode_match = re.search(r'- ([^-]+?)\s+Campus\s*[-–]\s*(Internal|Online)', page0_text, re.IGNORECASE)
    if campus_mode_match:
        results['unit_info']['campus_name'] = campus_mode_match.group(1).strip()
        results['unit_info']['mode'] = campus_mode_match.group(2).strip()
    
    # Extract term (semester/trimester) and year
    term_year_match = re.search(r'(Semester\s+[12]|Trimester\s+[123])\s+(\d{4})', page0_text, re.IGNORECASE)
    if term_year_match:
        results['unit_info']['term'] = term_year_match.group(1).strip()
        results['unit_info']['year'] = term_year_match.group(2).strip()
    else:
        # Fallback for term/year extraction
        semester_match = re.search(r'Semester\s+(\d+)\s+(\d{4})', page0_text)
        if semester_match:
            results['unit_info']['term'] = f"Semester {semester_match.group(1)}"
            results['unit_info']['year'] = semester_match.group(2)
    
    # ----- EXTRACT RESPONSE STATISTICS (PAGE 3) -----
    # Look for the response statistics table on page 3
    page2_text = doc[2].get_text()
    
    # Extract enrollment, responses, and response rate
    stats_match = re.search(r'# Enrolments.*?\(N\).*?# Responses.*?Response Rate\s*(\d+)\s+(\d+)\s+(\d+\.\d+)', 
                           page2_text, re.DOTALL)
    
    if stats_match:
        results['response_stats']['enrollments'] = int(stats_match.group(1))
        results['response_stats']['responses'] = int(stats_match.group(2))
        results['response_stats']['response_rate'] = float(stats_match.group(3))
    
    # ----- EXTRACT PERCENTAGE AGREEMENT (PAGE 3) -----
    metrics = [
        ('I was engaged by the learning activities', 'engagement'),
        ('The resources provided helped me to learn', 'resources'),
        ('My learning was supported', 'support'),
        ('Assessments helped me to demonstrate my learning', 'assessments'),
        ('I knew what was expected of me', 'expectations'),
        ('Overall, this unit was a worthwhile experience', 'overall')
    ]
    
    for metric_text, key in metrics:
        # Look for each metric and its percentage
        pattern = re.escape(metric_text) + r'\s+(\d+\.\d+)%'
        match = re.search(pattern, page2_text)
        if match:
            results['percentage_agreement'][key] = float(match.group(1))
    
    # ----- EXTRACT BENCHMARKS (PAGE 4) -----
    page3_text = doc[3].get_text()
    
    # Define benchmark categories and levels
    benchmark_categories = ['Engaged', 'Resources', 'Support', 'Assessments', 'Expectations', 'Overall']
    unit_code = results['unit_info'].get('unit_code', '')
    benchmark_levels = {
        "Overall": r"Overall",
        f"Unit - {unit_code}": r"Unit\s*-\s*[A-Z]{4}\d+",
        "School": r"School\s*-\s*School of",
        "Faculty": r"Faculty\s*-\s*Faculty of",
        "Curtin": r"Curtin"
    }
    
    # Process each benchmark level
    for level_name, level_pattern in benchmark_levels.items():
        # Find the text block for this level
        level_text_match = re.search(f"({level_pattern}.*?)(?=(?:{list(benchmark_levels.values())[0]}|$))", 
                                   page3_text, re.DOTALL | re.IGNORECASE)
        
        if not level_text_match:
            # Try a simpler pattern if the complex one fails
            level_text_match = re.search(f"({level_pattern}.*?\n)", page3_text, re.DOTALL | re.IGNORECASE)
        
        if level_text_match:
            level_text = level_text_match.group(1)
            
            # Extract all percentages and N values from this level's text
            percentages = re.findall(r"(\d+\.\d+)%", level_text)
            n_values = re.findall(r"\b(\d{2,})\b", level_text)  # Numbers with 2+ digits
            
            # Create a row for this benchmark level
            if len(percentages) >= 6:
                row_data = {'Level': level_name}
                
                # Add percentages for each category
                for i, category in enumerate(benchmark_categories):
                    if i < len(percentages):
                        # Add percentage agreement (PA)
                        row_data[f"{category}_PA"] = float(percentages[i])
                        
                        # Try to match N values (total responses)
                        # This matching logic might need adjustment based on text layout
                        if i < len(n_values):
                            row_data[f"{category}_N"] = int(n_values[i])
                
                results['benchmarks'].append(row_data)
    
    # ----- EXTRACT DETAILED RESULTS (PAGES 5-7) -----
    detailed_results = {}
    
    # Process pages 5-7 for detailed question results
    for page_idx in range(4, 7):  # 0-indexed, so pages 5-7
        page_text = doc[page_idx].get_text()
        
        # Check each metric to see if it's on this page
        for question_text, _ in metrics:
            if question_text in page_text:
                question_match = re.search(f"{re.escape(question_text)}(.*?)(?=(Base \(above\)|$))", 
                                          page_text, re.DOTALL)
                
                if question_match:
                    question_block = question_match.group(1)
                    
                    # Extract response distributions
                    distributions = {
                        'strongly_disagree': {'count': 0, 'percentage': 0.0},
                        'disagree': {'count': 0, 'percentage': 0.0},
                        'neutral': {'count': 0, 'percentage': 0.0},
                        'agree': {'count': 0, 'percentage': 0.0},
                        'strongly_agree': {'count': 0, 'percentage': 0.0},
                    }
                    
                    # Patterns for each response type
                    distribution_patterns = [
                        (r'1 Strongly Disagree\s+(\d+)\s+(\d+\.\d+)%', 'strongly_disagree'),
                        (r'2 Disagree\s+(\d+)\s+(\d+\.\d+)%', 'disagree'),
                        (r'3 Neither Agree nor Disagree\s+(\d+)\s+(\d+\.\d+)%', 'neutral'),
                        (r'4 Agree\s+(\d+)\s+(\d+\.\d+)%', 'agree'),
                        (r'5 Strongly Agree\s+(\d+)\s+(\d+\.\d+)%', 'strongly_agree')
                    ]
                    
                    # Extract each distribution
                    for pattern, key in distribution_patterns:
                        dist_match = re.search(pattern, page_text)
                        if dist_match:
                            distributions[key] = {
                                'count': int(dist_match.group(1)),
                                'percentage': float(dist_match.group(2))
                            }
                    
                    # Extract agreement percentage
                    agreement_match = re.search(r'Agreement\s+(\d+\.\d+)%', page_text)
                    if agreement_match:
                        distributions['agreement_percentage'] = float(agreement_match.group(1))
                    
                    detailed_results[question_text] = distributions
    
    results['detailed_results'] = detailed_results
    
    # ----- EXTRACT STUDENT COMMENTS (PAGE 8) -----
    page7_text = doc[7].get_text()
    
    # Find the comments section between the heading and the warning text
    comments_match = re.search(
        r'What are the main reasons for your rating.*?Comments\s*(.*?)(?:This report may contain|$)',
        page7_text,
        re.DOTALL | re.IGNORECASE
    )
    
    if comments_match:
        comments_text = comments_match.group(1).strip()
        
        # Try splitting by blank lines first (paragraph separation)
        paragraphs = re.split(r'\n\s*\n', comments_text)
        
        # If we don't get enough paragraphs, try by single newlines
        if len(paragraphs) < 3:
            # Look for lines that start with known comment patterns
            comment_starts = [
                r'(?:^|\n)(?:As )', r'(?:^|\n)(?:The )', r'(?:^|\n)(?:I )', 
                r'(?:^|\n)(?:Overall)', r'(?:^|\n)(?:It was)', r'(?:^|\n)(?:Was )', 
                r'(?:^|\n)(?:Fun )', r'(?:^|\n)(?:Good )', r'(?:^|\n)(?:best )'
            ]
            
            # Join all patterns with OR
            combined_pattern = '|'.join(comment_starts)
            paragraphs = re.split(combined_pattern, comments_text)
            
            # Clean up and reconstruct with the starting words
            starts = re.findall(combined_pattern, comments_text)
            clean_paragraphs = []
            
            for i, para in enumerate(paragraphs):
                if i == 0 and not para.strip():
                    continue  # Skip empty first split
                
                if i > 0 and i-1 < len(starts):
                    # Add back the starting word that was removed in the split
                    start_word = starts[i-1].strip()
                    clean_para = start_word + para.strip()
                    clean_paragraphs.append(clean_para)
                elif para.strip():
                    clean_paragraphs.append(para.strip())
            
            paragraphs = clean_paragraphs
        
        # Add all non-empty paragraphs as comments
        for para in paragraphs:
            clean_para = para.strip().replace('\n', ' ')
            if clean_para and 'Comments' not in clean_para:
                results['comments'].append(clean_para)
    
    # Close the document
    doc.close()
    
    return results

# Example usage
try:
    data = extract_survey_data("unit_survey.pdf")
    
    # Print the extracted data
    print(json.dumps(data, indent=2))
    
except Exception as e:
    import traceback
    print(f"Error processing PDF: {str(e)}")
    traceback.print_exc()