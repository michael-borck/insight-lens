import sqlite3
import pdfplumber
import re
import os

# Discipline code → description (extend as needed)
discipline_map = {
    "ISYS": "Information Systems",
    "COMP": "Computer Science",
    "MKTG": "Marketing",
    "MGMT": "Management",
    "ACCT": "Accounting"
}

# Connect to SQLite DB
conn = sqlite3.connect("unit_survey.db")
cur = conn.cursor()

# Set up schema
cur.executescript("""
DROP TABLE IF EXISTS benchmark;
DROP TABLE IF EXISTS unit_offering;
DROP TABLE IF EXISTS unit;
DROP TABLE IF EXISTS discipline;

CREATE TABLE discipline (
    discipline_code TEXT PRIMARY KEY,
    discipline_name TEXT
);

CREATE TABLE unit (
    unit_code TEXT PRIMARY KEY,
    unit_name TEXT,
    discipline_code TEXT,
    FOREIGN KEY (discipline_code) REFERENCES discipline(discipline_code)
);

CREATE TABLE unit_offering (
    unit_offering_id INTEGER PRIMARY KEY AUTOINCREMENT,
    unit_code TEXT,
    semester INTEGER,
    year INTEGER,
    location TEXT,
    availability TEXT,
    UNIQUE(unit_code, semester, year, location, availability),
    FOREIGN KEY (unit_code) REFERENCES unit(unit_code)
);

CREATE TABLE benchmark (
    benchmark_id INTEGER PRIMARY KEY AUTOINCREMENT,
    unit_offering_id INTEGER,
    group_type TEXT,
    question_label TEXT,
    percent_agree REAL,
    total_n INTEGER,
    FOREIGN KEY (unit_offering_id) REFERENCES unit_offering(unit_offering_id)
);
""")

# Extract benchmark table from raw PDF text
def extract_benchmarks(text):
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
        for i in range(6):
            try:
                percent = float(parts[1 + i * 2].replace('%', ''))
                total_n = int(parts[2 + i * 2])
                benchmarks.append({
                    "group_type": group_type,
                    "question_label": question_labels[i],
                    "percent_agree": percent,
                    "total_n": total_n
                })
            except Exception:
                continue
    return benchmarks

# Extract all info from one PDF
def extract_info_from_pdf(filepath):
    with pdfplumber.open(filepath) as pdf:
        text = "\n".join(page.extract_text() for page in pdf.pages if page.extract_text())

    match = re.search(r"Unit Survey Report\s*-\s*([A-Z]{4}\d{4})\s*(.+?)\s*-\s*Semester\s+(\d)\s+(\d{4})", text)
    if not match:
        return None

    unit_code, unit_name, semester, year = match.groups()
    discipline_code = re.match(r"[A-Z]{4}", unit_code).group()

    location = re.search(r"-\s*([^\n]+?)\s*Campus", text)
    availability = re.search(r"Campus\s*-\s*(Internal|External|Online)", text)

    return {
        "unit_code": unit_code,
        "unit_name": unit_name.strip(),
        "semester": int(semester),
        "year": int(year),
        "location": location.group(1).strip() if location else None,
        "availability": availability.group(1).strip() if availability else None,
        "discipline_code": discipline_code,
        "discipline_name": discipline_map.get(discipline_code),
        "text": text  # Keep full text for benchmarks
    }

# Insert into discipline, unit, unit_offering
def insert_data(data):
    cur.execute("""
        INSERT OR IGNORE INTO discipline (discipline_code, discipline_name)
        VALUES (?, ?)
    """, (data['discipline_code'], data['discipline_name']))

    cur.execute("""
        INSERT OR IGNORE INTO unit (unit_code, unit_name, discipline_code)
        VALUES (?, ?, ?)
    """, (data['unit_code'], data['unit_name'], data['discipline_code']))

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

# Insert benchmark rows
def insert_benchmarks(unit_offering_id, text):
    benchmarks = extract_benchmarks(text)
    for b in benchmarks:
        cur.execute("""
            INSERT INTO benchmark (unit_offering_id, group_type, question_label, percent_agree, total_n)
            VALUES (?, ?, ?, ?, ?)
        """, (
            unit_offering_id,
            b['group_type'],
            b['question_label'],
            b['percent_agree'],
            b['total_n']
        ))
    conn.commit()

# Process all PDFs in folder
def process_folder(folder_path):
    for file in os.listdir(folder_path):
        if file.endswith(".pdf"):
            pdf_path = os.path.join(folder_path, file)
            result = extract_info_from_pdf(pdf_path)
            if not result:
                print(f"⚠ Skipped: {file} (no match)")
                continue

            insert_data(result)

            # Get unit_offering_id
            cur.execute("""
                SELECT unit_offering_id FROM unit_offering
                WHERE unit_code = ? AND semester = ? AND year = ? AND location = ? AND availability = ?
            """, (
                result['unit_code'],
                result['semester'],
                result['year'],
                result['location'],
                result['availability']
            ))
            row = cur.fetchone()
            if row:
                insert_benchmarks(row[0], result['text'])
                print(f"✔ Inserted: {result['unit_code']} {result['semester']}/{result['year']} + benchmarks")
            else:
                print(f"⚠ Could not find unit_offering for {result['unit_code']}")

# ✨ Run it
if __name__ == "__main__":
    folder_path = "/path/to/your/pdf/folder"  # Replace with your folder
    process_folder(folder_path)
    cur.close()
    conn.close()
