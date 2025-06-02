# Python PDF Extraction Guide: Unit Survey Report

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


## Code Refinements for Specific Fields

Based on analysis of the PDF structure and common issues with text extraction, here are specific suggestions to improve the reliability of extracting certain fields:

### 1. Campus Name and Mode (from Page 1)

* **Issue:** Simple regex might fail due to variations in spacing, hyphens, or newlines between the campus name, the word "Campus", the separator, and the mode ('Internal'/'Online').
* **Suggestion:** Use a more robust regex that explicitly looks for the word "Campus", captures the preceding text as the name, handles separators, and matches only the known modes.

    ```python
    import re
    # Assuming page0_text = doc[0].get_text()

    # Regex breakdown:
    # (.+?)          - Capture group 1: Any characters non-greedily (the campus name)
    # \s+Campus\s* - Match one or more spaces, then "Campus", then zero or more spaces
    # [-–]\s* - Match a hyphen or en-dash, then zero or more spaces/newlines
    # (Internal|Online) - Capture group 2: Match either "Internal" or "Online"
    campus_mode_match = re.search(r'(.+?)\s+Campus\s*[-–]\s*(Internal|Online)', page0_text, re.IGNORECASE)

    if campus_mode_match:
        campus_name = campus_mode_match.group(1).strip()
        mode = campus_mode_match.group(2).strip()
        print(f"Campus: {campus_name}, Mode: {mode}")
    else:
        print("Warning: Could not extract Campus Name and Mode.")
    ```

### 2. Term (Semester/Trimester) and Year (from Page 1)

* **Issue:** Generic patterns might misinterpret numbers.
* **Suggestion:** Explicitly search for the known fixed terms ('Semester 1/2', 'Trimester 1/2/3') followed by a 4-digit year.

    ```python
    import re
    # Assuming page0_text = doc[0].get_text()

    # Regex breakdown:
    # (Semester\s+[12]|Trimester\s+[123]) - Capture group 1: Match known terms
    # \s+                               - Match one or more spaces
    # (\d{4})                           - Capture group 2: Match the 4-digit year
    term_year_match = re.search(r'(Semester\s+[12]|Trimester\s+[123])\s+(\d{4})', page0_text, re.IGNORECASE)

    if term_year_match:
        term = term_year_match.group(1).strip()
        year = term_year_match.group(2).strip()
        print(f"Term: {term}, Year: {year}")
    else:
         # Add fallback if needed
         print("Warning: Could not extract Term and Year.")

    ```

### 3, Alternative ideas - Campus Term

  1.  **Campus and Mode (Page 1):**
      * Since the campus name varies but "Campus" and the modes ('Internal', 'Online') are consistent, you can build your regex around that.
      * **Suggestion:** Search Page 1's text [cite: 1] for a pattern that captures the text *before* "Campus", then matches "Campus", the separator (like ` - ` or `-\n`), and finally one of the known modes.
          ```python
          page0_text = doc[0].get_text()
          # Regex breakdown:
          # (.+?)          - Capture group 1: Any characters non-greedily (the campus name)
          # \s+Campus\s* - Match one or more spaces, then "Campus", then zero or more spaces
          # [-–]\s* - Match a hyphen or en-dash, then zero or more spaces/newlines
          # (Internal|Online) - Capture group 2: Match either "Internal" or "Online"
          campus_mode_match = re.search(r'(.+?)\s+Campus\s*[-–]\s*(Internal|Online)', page0_text, re.IGNORECASE)
          
          if campus_mode_match:
              results['unit_info']['campus_name'] = campus_mode_match.group(1).strip()
              results['unit_info']['mode'] = campus_mode_match.group(2).strip()
          else:
              # Fallback or error logging if the pattern isn't found
              print("Warning: Could not extract Campus Name and Mode.")
              results['unit_info']['campus_name'] = None
              results['unit_info']['mode'] = None
          ```

  2.  **Term (Semester/Trimester on Page 1):**
      * Searching directly for the known, fixed terms is much more reliable than a generic pattern.
      * **Suggestion:** Use a regex that explicitly looks for "Semester 1", "Semester 2", "Trimester 1", "Trimester 2", or "Trimester 3" followed by the year on Page 1[cite: 1].
          ```python
          page0_text = doc[0].get_text()
          # Regex breakdown:
          # (Semester\s+[12]|Trimester\s+[123]) - Capture group 1: Match known terms
          # \s+                               - Match one or more spaces
          # (\d{4})                           - Capture group 2: Match the 4-digit year
          term_year_match = re.search(r'(Semester\s+[12]|Trimester\s+[123])\s+(\d{4})', page0_text, re.IGNORECASE)
          
          if term_year_match:
              results['unit_info']['term'] = term_year_match.group(1).strip()
              results['unit_info']['year'] = term_year_match.group(2).strip()
          else:
               # Fallback trying to find just the year near known text if the above fails
               semester_match = re.search(r'Semester\s+(\d+)\s+(\d{4})', page0_text)
               if semester_match:
                   results['unit_info']['term'] = f"Semester {semester_match.group(1)}"
                   results['unit_info']['year'] = semester_match.group(2)
               else: # Add Trimester fallback if needed
                   print("Warning: Could not extract Term and Year.")
                   results['unit_info']['term'] = None
                   results['unit_info']['year'] = None
          ```

### 4. Benchmarks - Percentage Agreement Table (from Page 4)

* **Issue:** Large, complex regex patterns are brittle and easily broken by minor variations in text spacing/layout within the table[cite: 16].
* **Suggestion:** Use a multi-step approach: Isolate the text block for each benchmark level row more reliably, then use simpler patterns to find all percentages and total numbers (`N`) within that specific block. *Note: This section often requires significant trial-and-error based on the exact text output.*

    ```python
    import re
    # Assuming page3_text = doc[3].get_text() # Page 4

    benchmark_levels = {
        "Overall": r"Overall",
        "Unit - ISYS2001": r"Unit\s*-\s*ISYS2001",
        "School": r"School\s*-\s*School of Management", # Use more specific names
        "Faculty": r"Faculty\s*-\s*Faculty of Business",
        "Curtin": r"Curtin"
    }
    benchmark_categories = ['Engaged', 'Resources', 'Support', 'Assessments', 'Expectations', 'Overall']
    benchmark_data = []
    processed_levels = set()

    for level_name, level_pattern in benchmark_levels.items():
        if level_name in processed_levels: continue

        # Attempt to find the text block for this level (may need refinement)
        block_match = re.search(f"({level_pattern}.*?(?:\n|$))", page3_text, re.IGNORECASE | re.DOTALL)

        if block_match:
            row_text = block_match.group(1)
            percentages = re.findall(r"(\d+\.\d+)%", row_text)
            # Find numbers likely to be Totals (N) - adjust pattern as needed
            totals = re.findall(r"\s(\d{2,})\s?", row_text) # Find numbers with 2+ digits often surrounded by spaces

            if len(percentages) == 6 and len(totals) >= 6:
                 row_data = {'Level': level_name}
                 paired_totals = totals[:6] # Assume first 6 totals correspond
                 for i, category in enumerate(benchmark_categories):
                     row_data[category + "_PA"] = float(percentages[i])
                     row_data[category + "_N"] = int(paired_totals[i])
                 benchmark_data.append(row_data)
                 processed_levels.add(level_name)
            else:
                 print(f"Warning: Found {len(percentages)} percentages and {len(totals)} totals for {level_name}. Expected 6 of each.")

    print("\nBenchmarks:")
    for benchmark in benchmark_data:
         print(f"  {benchmark}")

    ```

### 5. Alternative Idea Benchmarks - Percentage Agreement

  1.  **Benchmarks - Percentage Agreement Table (Page 4)**
      * **Potential Issue:** The large, complex regex you're using (`level_match = re.search(...)`) is very sensitive to the exact spacing and structure of the text extracted from the PDF table[cite: 16]. Minor variations in spaces or newlines returned by `doc[3].get_text()` can easily break it. Also, identifying the start of the row using `level.split('\n')[0]` might be too simple if the level names (like School or Faculty) span lines in the PDF text.
      * **Suggestion:** Use a multi-step, more robust approach:
          * **Isolate Rows:** First, try to get the text block for each benchmark level more reliably. Instead of just searching for the first part of the level name, search for a pattern that uniquely identifies the start of that row, potentially spanning across newlines.
          * **Extract Numbers within Row:** Once you have the text for a specific row (e.g., the line(s) containing "Unit - ISYS2001" and its data), use simpler regex to find *all* relevant numbers within *that specific block*.
          ```python
          page3_text = doc[3].get_text() # Page 4
          benchmark_levels = {
              "Overall": r"Overall",
              "Unit - ISYS2001": r"Unit\s*-\s*ISYS2001", # Handle potential space/newline
              "School": r"School\s*-\s*School of Management", # Be more specific
              "Faculty": r"Faculty\s*-\s*Faculty of Business", # Be more specific
              "Curtin": r"Curtin"
          }
          benchmark_categories = ['Engaged', 'Resources', 'Support', 'Assessments', 'Expectations', 'Overall']
          benchmark_data = []

          # Split the page text roughly by lines that might start a benchmark row
          lines = page3_text.split('\n')
          current_level_text = ""
          current_level_name = None

          # A simplified way to find the block for each level - might need refinement
          processed_levels = set()
          for level_name, level_pattern in benchmark_levels.items():
              if level_name in processed_levels: continue # Skip if already processed

              # Try to find the block for this level
              block_match = re.search(f"({level_pattern}.*?(?:\n|$))", page3_text, re.IGNORECASE | re.DOTALL)
              
              # A more robust way might be needed, maybe iterating line by line
              # to find the start and end of each benchmark's data

              if block_match:
                  row_text = block_match.group(1)
                  # Find all percentages (PA) and totals (N) in this block
                  percentages = re.findall(r"(\d+\.\d+)%", row_text)
                  totals = re.findall(r"(\d{2,})", row_text) # Assuming totals have at least 2 digits

                  # Basic check: expect 6 percentages and 6 totals
                  if len(percentages) == 6 and len(totals) >= 6:
                       row_data = {'Level': level_name}
                       # The first total found after a percentage is likely the N for it.
                       # This pairing logic might need refinement based on exact text structure.
                       paired_totals = totals[:6] # Take the first 6 totals found
                       for i, category in enumerate(benchmark_categories):
                           row_data[category + "_PA"] = float(percentages[i])
                           row_data[category + "_N"] = int(paired_totals[i])
                       benchmark_data.append(row_data)
                       processed_levels.add(level_name) # Mark as processed

          results['benchmarks'] = benchmark_data # Store the extracted data
          ```
          *This benchmark extraction is tricky and highly dependent on `get_text()` output; you might need to print `page3_text` and adjust the row isolation and number extraction logic significantly.*

### 6. Student Comments (from Page 8)

* **Issue:** Splitting comments based on specific starting words or simple capital letters is unreliable and can miss comments or split them incorrectly. Length filters might exclude short comments.
* **Suggestion:** Extract the entire text block between the known start heading ("What are the main reasons...") [cite: 41] and end marker ("This report may contain...")[cite: 71]. Then, split this block into paragraphs, assuming each paragraph is a distinct comment.

    ```python
    import re
    # Assuming page7_text = doc[7].get_text() # Page 8

    comments_section_match = re.search(
        r'What are the main reasons for your rating.*?Comments\s*(.*?)\s*This report may contain',
        page7_text,
        re.DOTALL | re.IGNORECASE
    )
    extracted_comments = []
    if comments_section_match:
        comments_text = comments_section_match.group(1).strip()

        # Split by two or more newlines (common paragraph separator)
        potential_comments = re.split(r'\n\s*\n+', comments_text)

        # Fallback: if few results, try splitting by single newline
        if len(potential_comments) < 3: # Adjust heuristic as needed
             potential_comments = comments_text.split('\n')

        for para in potential_comments:
            clean_comment = para.strip()
            if clean_comment: # Append if not empty
                extracted_comments.append(clean_comment)
    else:
         print("Warning: Could not isolate comments section text.")

    print("\nStudent Comments:")
    for i, comment in enumerate(extracted_comments, 1):
         print(f"{i}. {comment}")

    ```
### 7. Alternative Idea - Student Comments

1.  **Student Comments (Page 8)**
    * **Potential Issue:** The primary splitting logic based on starting words (`As `, `The `, etc.) is likely too restrictive and misses comments. The secondary logic (capital letters) might split multi-sentence comments incorrectly. The tertiary logic (paragraph splits `\n\s*\n`) is often better but depends on consistent double newlines in the output. The filter `len(comment) > 5` might exclude short but valid comments like "Fun Unit"[cite: 70].
    * **Suggestion:** Simplify and focus on paragraph separation:
        ```python
        page7_text = doc[7].get_text() # Page 8

        # Extract the block between the question and the warning footer
        comments_section_match = re.search(
            r'What are the main reasons for your rating.*?Comments\s*(.*?)\s*This report may contain',
            page7_text,
            re.DOTALL | re.IGNORECASE
        )

        if comments_section_match:
            comments_text = comments_section_match.group(1).strip()
            
            # Split into paragraphs - adjust regex if needed based on actual newlines
            # Try splitting by two or more newlines first
            potential_comments = re.split(r'\n\s*\n+', comments_text)

            # If that yields few results, try splitting by single newline (less reliable)
            if len(potential_comments) < 3: # Heuristic: expect more than a couple comments
                 potential_comments = comments_text.split('\n')

            results['comments'] = []
            for para in potential_comments:
                clean_comment = para.strip()
                # Remove the length filter or adjust if you want short comments
                if clean_comment: # Check if not empty
                    results['comments'].append(clean_comment)
        else:
             print("Warning: Could not isolate comments section text.")
             results['comments'] = [] # Ensure it's an empty list if extraction failed

        ```
    *This approach focuses on robustly extracting the entire comment block and splitting it into paragraphs, assuming each paragraph is a distinct comment. Adjust the paragraph split regex as needed based on the actual text output.*
