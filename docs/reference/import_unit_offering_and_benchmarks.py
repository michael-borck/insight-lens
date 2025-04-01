import sqlite3
import pdfplumber
import re
import os
import argparse
from datetime import datetime
from pathlib import Path

# Discipline code → description (extend as needed)
discipline_map = {
    "ISYS": "Information Systems",
    "COMP": "Computer Science",
    "MKTG": "Marketing",
    "MGMT": "Management",
    "ACCT": "Accounting"
}

# Question text to question_id mapping based on standard questions
question_map = {
    "Engaged": "I was engaged by the learning activities.",
    "Resources": "The resources provided helped me to learn.",
    "Support": "My learning was supported.",
    "Assessments": "Assessments helped me to demonstrate my learning.",
    "Expectations": "I knew what was expected of me.",
    "Overall": "Overall, this unit was a worthwhile experience."
}

def connect_to_db(db_path):
    """Connect to the SQLite database."""
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    return conn, cur

def extract_benchmarks(text):
    """Extract benchmark table from raw PDF text."""
    benchmarks = []
    question_labels = ["Engaged", "Resources", "Support", "Assessments", "Expectations", "Overall"]

    match = re.search(
        r"Benchmarks\s*-\s*Percentage Agreement\s*Engaged\s+Resources\s+Support\s+Assessments\s+Expectations\s+Overall\s+(.+?)\n\n",
        text,
        re.DOTALL
    )
    if not match:
        return []

    lines = match.group(1).strip().splitlines()
    for line in lines:
        parts = re.split(r'\s{2,}', line.strip())
        if len(parts) < 13:
            continue
        group_type = parts[0].replace(" -", "").strip()
        
        # Map group_type to standardized types
        if "School" in group_type:
            std_group_type = "School"
        elif "Faculty" in group_type:
            std_group_type = "Faculty"
        elif "University" in group_type or "Curtin" in group_type:
            std_group_type = "University"
        else:
            std_group_type = group_type
            
        for i in range(6):
            try:
                percent = float(parts[1 + i * 2].replace('%', ''))
                total_n = int(parts[2 + i * 2])
                benchmarks.append({
                    "group_type": std_group_type,
                    "group_name": group_type,
                    "question_label": question_labels[i],
                    "percent_agree": percent,
                    "total_n": total_n
                })
            except Exception:
                continue
    return benchmarks

def extract_info_from_pdf(filepath):
    """Extract all info from one PDF."""
    with pdfplumber.open(filepath) as pdf:
        text = "\n".join(page.extract_text() for page in pdf.pages if page.extract_text())

    match = re.search(r"Unit Survey Report\s*-\s*([A-Z]{4}\d{4})\s*(.+?)\s*-\s*Semester\s+(\d)\s+(\d{4})", text)
    if not match:
        return None

    unit_code, unit_name, semester, year = match.groups()
    discipline_code = re.match(r"[A-Z]{4}", unit_code).group()

    location = re.search(r"-\s*([^\n]+?)\s*Campus", text)
    availability = re.search(r"Campus\s*-\s*(Internal|External|Online)", text)

    # Try to extract response rate and enrollment
    enrollment_match = re.search(r"Number of students enrolled:\s*(\d+)", text)
    responses_match = re.search(r"Number of responses:\s*(\d+)", text)
    response_rate_match = re.search(r"Response rate:\s*([\d.]+)%", text)
    
    # Overall experience
    overall_exp_match = re.search(r"Overall.*?worthwhile.*?(\d+)%", text)

    return {
        "unit_code": unit_code,
        "unit_name": unit_name.strip(),
        "semester": int(semester),
        "year": int(year),
        "location": location.group(1).strip() if location else "Unknown",
        "availability": availability.group(1).strip() if availability else "Internal",
        "discipline_code": discipline_code,
        "discipline_name": discipline_map.get(discipline_code, discipline_code),
        "enrollments": int(enrollment_match.group(1)) if enrollment_match else 0,
        "responses": int(responses_match.group(1)) if responses_match else 0,
        "response_rate": float(response_rate_match.group(1)) if response_rate_match else 0,
        "overall_experience": float(overall_exp_match.group(1)) if overall_exp_match else 0,
        "text": text  # Keep full text for benchmarks
    }

def insert_discipline_and_unit(conn, cur, data):
    """Insert into discipline and unit tables."""
    cur.execute("""
        INSERT OR IGNORE INTO discipline (discipline_code, discipline_name)
        VALUES (?, ?)
    """, (data['discipline_code'], data['discipline_name']))

    cur.execute("""
        INSERT OR IGNORE INTO unit (unit_code, unit_name, discipline_code)
        VALUES (?, ?, ?)
    """, (data['unit_code'], data['unit_name'], data['discipline_code']))
    
    conn.commit()

def insert_unit_offering(conn, cur, data):
    """Insert into unit_offering table."""
    cur.execute("""
        INSERT OR IGNORE INTO unit_offering (unit_code, semester, year, location, availability)
        VALUES (?, ?, ?, ?, ?)
    """, (
        data['unit_code'],
        data['semester'],
        data['year'],
        data['location'],
        data['availability']
    ))
    
    conn.commit()
    
    # Get the unit_offering_id
    cur.execute("""
        SELECT unit_offering_id FROM unit_offering
        WHERE unit_code = ? AND semester = ? AND year = ? AND location = ? AND availability = ?
    """, (
        data['unit_code'],
        data['semester'],
        data['year'],
        data['location'],
        data['availability']
    ))
    
    row = cur.fetchone()
    return row[0] if row else None

def get_or_create_survey_event(conn, cur, year, semester):
    """Get or create a survey event for the given year and semester."""
    # Determine month based on semester
    month = 5 if semester == 1 else 10  # May for sem 1, Oct for sem 2
    description = f"Semester {semester} {year} Survey"
    
    # Check if survey event exists
    cur.execute("""
        SELECT event_id FROM survey_event
        WHERE year = ? AND month = ?
    """, (year, month))
    
    row = cur.fetchone()
    if row:
        return row[0]
    
    # Create new survey event
    cur.execute("""
        INSERT INTO survey_event (month, year, description)
        VALUES (?, ?, ?)
    """, (month, year, description))
    
    conn.commit()
    return cur.lastrowid

def get_question_id(cur, question_text):
    """Get the question_id for a given question text."""
    cur.execute("SELECT question_id FROM question WHERE question_text = ?", (question_text,))
    row = cur.fetchone()
    return row[0] if row else None

def insert_benchmark(conn, cur, event_id, benchmark, question_ids):
    """Insert benchmark data."""
    # Get question_id from label
    question_text = question_map.get(benchmark['question_label'])
    if not question_text:
        print(f"⚠ Unknown question label: {benchmark['question_label']}")
        return
    
    question_id = question_ids.get(question_text)
    if not question_id:
        print(f"⚠ Could not find question ID for: {question_text}")
        return
    
    # Check if benchmark already exists
    cur.execute("""
        SELECT benchmark_id FROM benchmark
        WHERE event_id = ? AND question_id = ? AND group_type = ?
    """, (event_id, question_id, benchmark['group_type']))
    
    if cur.fetchone():
        # Benchmark already exists for this event, question, and group type
        return
    
    # Insert new benchmark
    cur.execute("""
        INSERT INTO benchmark (event_id, question_id, group_type, group_name, percent_agree, total_n)
        VALUES (?, ?, ?, ?, ?, ?)
    """, (
        event_id,
        question_id,
        benchmark['group_type'],
        benchmark['group_name'],
        benchmark['percent_agree'],
        benchmark['total_n']
    ))
    
    conn.commit()

def insert_unit_survey(conn, cur, unit_offering_id, event_id, data):
    """Insert unit survey data."""
    # Check if survey already exists
    cur.execute("""
        SELECT survey_id FROM unit_survey
        WHERE unit_offering_id = ? AND event_id = ?
    """, (unit_offering_id, event_id))
    
    row = cur.fetchone()
    if row:
        return row[0]
    
    # Insert new survey
    cur.execute("""
        INSERT INTO unit_survey (unit_offering_id, event_id, enrolments, responses, response_rate, overall_experience)
        VALUES (?, ?, ?, ?, ?, ?)
    """, (
        unit_offering_id,
        event_id,
        data.get('enrollments', 0),
        data.get('responses', 0),
        data.get('response_rate', 0),
        data.get('overall_experience', 0)
    ))
    
    conn.commit()
    return cur.lastrowid

def process_pdf(pdf_path, db_path):
    """Process a single PDF file."""
    conn, cur = connect_to_db(db_path)
    
    result = extract_info_from_pdf(pdf_path)
    if not result:
        print(f"⚠ Skipped: {pdf_path} (no match)")
        conn.close()
        return False
    
    # Get question IDs
    cur.execute("SELECT question_id, question_text FROM question")
    question_ids = {row["question_text"]: row["question_id"] for row in cur.fetchall()}
    
    # Insert discipline and unit
    insert_discipline_and_unit(conn, cur, result)
    
    # Insert unit offering
    unit_offering_id = insert_unit_offering(conn, cur, result)
    if not unit_offering_id:
        print(f"⚠ Failed to insert unit offering for {result['unit_code']}")
        conn.close()
        return False
    
    # Get or create survey event
    event_id = get_or_create_survey_event(conn, cur, result['year'], result['semester'])
    
    # Insert unit survey
    survey_id = insert_unit_survey(conn, cur, unit_offering_id, event_id, result)
    
    # Extract and insert benchmarks
    benchmarks = extract_benchmarks(result['text'])
    for benchmark in benchmarks:
        insert_benchmark(conn, cur, event_id, benchmark, question_ids)
    
    print(f"✅ Imported: {result['unit_code']} {result['semester']}/{result['year']} + {len(benchmarks)} benchmarks")
    conn.close()
    return True

def process_folder(folder_path, db_path):
    """Process all PDFs in a folder."""
    files_processed = 0
    files_succeeded = 0
    
    for file in os.listdir(folder_path):
        if file.endswith(".pdf"):
            pdf_path = os.path.join(folder_path, file)
            files_processed += 1
            if process_pdf(pdf_path, db_path):
                files_succeeded += 1
    
    print(f"\n📊 Summary: {files_succeeded}/{files_processed} files imported successfully")
    return files_succeeded

def main():
    parser = argparse.ArgumentParser(description='Import unit survey PDFs into SurveySavvy database')
    parser.add_argument('--pdf', help='Path to PDF file to import')
    parser.add_argument('--folder', help='Path to folder containing PDF files to import')
    parser.add_argument('--db', default='unit_survey.db', help='Path to the SQLite database file')
    
    args = parser.parse_args()
    
    if not args.pdf and not args.folder:
        print("⚠ Please specify either a PDF file (--pdf) or a folder (--folder)")
        return
    
    if args.pdf:
        if not os.path.exists(args.pdf):
            print(f"⚠ PDF file not found: {args.pdf}")
            return
        
        process_pdf(args.pdf, args.db)
    
    if args.folder:
        if not os.path.exists(args.folder):
            print(f"⚠ Folder not found: {args.folder}")
            return
        
        process_folder(args.folder, args.db)

if __name__ == "__main__":
    main()