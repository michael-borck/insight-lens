#!/usr/bin/env python3
"""
Build distribution packages for SurveySavvy.

This script builds standalone packages for different components of SurveySavvy:
1. Dashboard package - Web-based dashboard for visualizing survey data
2. Import tool package - Tool for importing survey PDFs into a database

Each package is self-contained and includes all necessary files to run independently.
"""

import os
import sys
import shutil
import sqlite3
import argparse
import zipfile
from pathlib import Path
from rich.console import Console
from rich.progress import Progress, SpinnerColumn, TextColumn, BarColumn, TimeElapsedColumn

# Initialize console for rich output
console = Console()

def ensure_directory(path):
    """Ensure a directory exists, creating it if necessary."""
    if not os.path.exists(path):
        os.makedirs(path)
    return path

def clean_directory(path):
    """Remove and recreate a directory to ensure it's empty."""
    if os.path.exists(path):
        shutil.rmtree(path)
    os.makedirs(path)
    return path

def create_empty_database(db_path):
    """Create an empty database with the SurveySavvy schema."""
    console.print(f"Creating empty database at [bold]{db_path}[/bold]")
    
    # Extract schema from database.py
    project_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    db_file = os.path.join(project_dir, "surveysavvy/core/database.py")
    
    with open(db_file, 'r') as f:
        code = f.read()
    
    # Extract the schema
    start_marker = "self.cursor.executescript(\"\"\""
    end_marker = "\"\"\")"
    
    start_idx = code.find(start_marker)
    if start_idx == -1:
        console.print("[bold red]Could not find schema in database.py[/bold red]")
        return False
    
    end_idx = code.find(end_marker, start_idx + len(start_marker))
    if end_idx == -1:
        console.print("[bold red]Could not find end of schema in database.py[/bold red]")
        return False
    
    schema = code[start_idx + len(start_marker):end_idx]
    
    # Create the database
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.executescript(schema)
    
    # Add standard questions
    questions = [
        "I was engaged by the learning activities.",
        "The resources provided helped me to learn.",
        "My learning was supported.",
        "Assessments helped me to demonstrate my learning.",
        "I knew what was expected of me.",
        "Overall, this unit was a worthwhile experience."
    ]
    
    # Check if questions already exist
    cursor.execute("SELECT COUNT(*) FROM question")
    count = cursor.fetchone()[0]
    
    if count == 0:
        for q in questions:
            cursor.execute("INSERT INTO question (question_text) VALUES (?)", (q,))
    
    conn.commit()
    conn.close()
    
    console.print("[green]✓[/green] Empty database created successfully")
    return True

def build_dashboard_package(output_dir, db_path=None, copy_db=True):
    """Build the dashboard package.
    
    Args:
        output_dir: Directory to output the built package
        db_path: Path to database file to include in the package
        copy_db: Whether to copy the provided database (if False, an empty db will be created)
    
    Returns:
        Path to the created zip file
    """
    dashboard_dir = os.path.join(output_dir, "dashboard")
    clean_directory(dashboard_dir)
    
    console.print("\n[bold cyan]Building dashboard package...[/bold cyan]")
    
    # Copy dashboard.py from web module
    project_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    source_file = os.path.join(project_dir, "surveysavvy/web/dashboard.py")
    
    if not os.path.exists(source_file):
        console.print(f"[bold red]Error: Source file not found - {source_file}[/bold red]")
        return None
    
    # Copy or create database
    if db_path and os.path.exists(db_path) and copy_db:
        db_dest = os.path.join(dashboard_dir, "unit_survey.db")
        shutil.copy2(db_path, db_dest)
        console.print(f"[green]✓[/green] Copied database from [bold]{db_path}[/bold]")
    else:
        db_dest = os.path.join(dashboard_dir, "unit_survey.db")
        create_empty_database(db_dest)
    
    # Modify dashboard.py for standalone use
    dest_file = os.path.join(dashboard_dir, "dashboard.py")
    
    with open(source_file, 'r') as f:
        dashboard_code = f.read()
    
    # Make the code standalone with direct uvicorn import
    standalone_code = """#!/usr/bin/env python3
"""
    standalone_code += '"""'
    standalone_code += """
SurveySavvy Dashboard - Standalone Edition
"""
    standalone_code += '"""'
    standalone_code += """

try:
    from fasthtml.common import *
except ImportError:
    print("Error: FastHTML package not found.")
    print("Please install it with: pip install python-fasthtml")
    import sys
    sys.exit(1)
import sqlite3
import pandas as pd
import json
from pathlib import Path
import argparse
import uvicorn

"""
    # Replace the run_dashboard function to use uvicorn directly
    modified_code = dashboard_code.replace(
        "def run_dashboard(db_path=\"unit_survey.db\", host=\"127.0.0.1\", port=5000):",
        """def run_app(db_path='unit_survey.db', host='127.0.0.1', port=5000):
    """
        + '"""Run the application directly without using Uvicorn\'s auto-load."""'
        + """
    print(f"🌐 SurveySavvy Dashboard - Standalone Edition")
    print(f"📊 Database: {db_path}")
    print(f"🔗 URL: http://{host}:{port}")
    print(f"⚙️  Press CTRL+C to exit")
    
    app = create_app(db_path=db_path)
    
    # Manually run uvicorn
    uvicorn.run(app, host=host, port=port)

def run_dashboard(db_path="unit_survey.db", host="127.0.0.1", port=5000):"""
    )
    
    # Replace existing run_dashboard implementation
    modified_code = modified_code.replace(
        "    app = create_app(db_path)\n    \n    # Use uvicorn directly instead of serve() to avoid loading issues\n    import uvicorn\n    uvicorn.run(app, host=host, port=port)",
        "    run_app(db_path=db_path, host=host, port=port)"
    )
    
    # Add main function for CLI usage
    if "if __name__ == \"__main__\":" not in modified_code:
        modified_code += """

def main():
    parser = argparse.ArgumentParser(description='Run the SurveySavvy Dashboard')
    parser.add_argument('--db-path', default='unit_survey.db', help='Path to the SQLite database')
    parser.add_argument('--port', type=int, default=5000, help='Port to run the server on')
    parser.add_argument('--host', default='127.0.0.1', help='Host to run the server on')
    
    args = parser.parse_args()
    run_app(db_path=args.db_path, host=args.host, port=args.port)

if __name__ == "__main__":
    main()
"""
    
    # Write the modified code to the destination file
    with open(dest_file, 'w') as f:
        f.write(standalone_code + modified_code)
    
    # Make the script executable
    os.chmod(dest_file, 0o755)
    console.print(f"[green]✓[/green] Created standalone dashboard script")
    
    # Create requirements.txt
    requirements = """python-fasthtml
plotly>=5.8.0
pandas>=1.4.0
uvicorn[standard]
"""
    
    with open(os.path.join(dashboard_dir, "requirements.txt"), 'w') as f:
        f.write(requirements)
    console.print(f"[green]✓[/green] Created requirements.txt")
    
    # Create README.md
    readme_content = "# SurveySavvy Dashboard - Standalone Edition\n\n"
    readme_content += "This is a standalone dashboard for visualizing SurveySavvy unit survey data. It provides interactive charts and tables for exploring survey results.\n\n"
    readme_content += "## Setup with Virtual Environment (Recommended)\n\n"
    readme_content += "The dashboard requires Python 3.9+ and several packages. We recommend using a virtual environment:\n\n"
    readme_content += "### Windows\n"
    readme_content += "```bash\n"
    readme_content += "# Create a virtual environment\n"
    readme_content += "python -m venv venv\n\n"
    readme_content += "# Activate the virtual environment\n"
    readme_content += "venv\\Scripts\\activate\n\n"
    readme_content += "# Install requirements\n"
    readme_content += "pip install -r requirements.txt\n"
    readme_content += "```\n\n"
    readme_content += "### macOS/Linux\n"
    readme_content += "```bash\n"
    readme_content += "# Create a virtual environment\n"
    readme_content += "python3 -m venv venv\n\n"
    readme_content += "# Activate the virtual environment\n"
    readme_content += "source venv/bin/activate\n\n"
    readme_content += "# Install requirements\n"
    readme_content += "pip install -r requirements.txt\n"
    readme_content += "```\n\n"
    readme_content += "## Quick Setup (Alternative)\n\n"
    readme_content += "If you prefer not to use a virtual environment, you can install the required packages directly:\n\n"
    readme_content += "```bash\n"
    readme_content += "pip install python-fasthtml plotly pandas uvicorn\n"
    readme_content += "```\n\n"
    readme_content += "## Usage\n\n"
    readme_content += "1. Make sure your database file is accessible (it should be included in this package)\n"
    readme_content += "2. Activate your virtual environment (if you created one)\n"
    readme_content += "3. Run the dashboard:\n\n"
    readme_content += "```bash\n"
    readme_content += "# Using the included database\n"
    readme_content += "python dashboard.py\n\n"
    readme_content += "# Or with a custom database\n"
    readme_content += "python dashboard.py --db-path your_database.db\n"
    readme_content += "```\n\n"
    readme_content += "3. Open your browser and navigate to: http://127.0.0.1:5000\n\n"
    readme_content += "## Command Line Options\n\n"
    readme_content += "- `--db-path`: Path to the SQLite database file (default: `unit_survey.db`)\n"
    readme_content += "- `--port`: Port to run the server on (default: 5000)\n"
    readme_content += "- `--host`: Host to run the server on (default: 127.0.0.1, set to 0.0.0.0 to allow external access)\n\n"
    readme_content += "Example:\n\n"
    readme_content += "```bash\n"
    readme_content += "# Run on a specific port and allow external access\n"
    readme_content += "python dashboard.py --db-path survey_data.db --port 8080 --host 0.0.0.0\n"
    readme_content += "```\n\n"
    readme_content += "## Dashboard Features\n\n"
    readme_content += "- Overview of unit survey data with interactive charts\n"
    readme_content += "- Unit-specific detailed analysis\n"
    readme_content += "- Benchmark comparison\n"
    readme_content += "- Historical trend visualization\n"
    
    with open(os.path.join(dashboard_dir, "README.md"), 'w') as f:
        f.write(readme_content)
    console.print(f"[green]✓[/green] Created README.md")
    
    # Create startup scripts
    setup_bat = """@echo off
echo Setting up SurveySavvy Dashboard...

REM Check if Python is installed
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Python is not installed or not in PATH.
    echo Please install Python 3.9 or higher from python.org
    pause
    exit /b
)

REM Create virtual environment
echo Creating virtual environment...
python -m venv venv

REM Activate virtual environment
echo Activating virtual environment...
call venv\\Scripts\\activate

REM Install requirements
echo Installing required packages...
pip install -r requirements.txt

echo Setup complete!
echo.
echo To start the dashboard:
echo 1. Open a command prompt in this directory
echo 2. Run: venv\\Scripts\\activate
echo 3. Run: python dashboard.py
echo.
echo Press any key to exit...
pause
"""
    
    with open(os.path.join(dashboard_dir, "setup.bat"), 'w') as f:
        f.write(setup_bat)
    
    start_bat = """@echo off
echo Starting SurveySavvy Dashboard...

REM Activate virtual environment if it exists
if exist venv\\Scripts\\activate (
    call venv\\Scripts\\activate
)

REM Run the dashboard
python dashboard.py %*
"""
    
    with open(os.path.join(dashboard_dir, "start.bat"), 'w') as f:
        f.write(start_bat)
    
    setup_sh = """#!/bin/bash

echo "Setting up SurveySavvy Dashboard..."

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "Python is not installed or not in PATH."
    echo "Please install Python 3.9 or higher."
    exit 1
fi

# Create virtual environment
echo "Creating virtual environment..."
python3 -m venv venv

# Activate virtual environment
echo "Activating virtual environment..."
source venv/bin/activate

# Install requirements
echo "Installing required packages..."
pip install -r requirements.txt

echo "Setup complete!"
echo
echo "To start the dashboard:"
echo "1. Open a terminal in this directory"
echo "2. Run: source venv/bin/activate"
echo "3. Run: python dashboard.py"
echo
echo "Alternatively, you can run the dashboard now with:"
echo "./start.sh"
echo
"""
    
    with open(os.path.join(dashboard_dir, "setup.sh"), 'w') as f:
        f.write(setup_sh)
    os.chmod(os.path.join(dashboard_dir, "setup.sh"), 0o755)
    
    start_sh = """#!/bin/bash

# Activate virtual environment if it exists
if [ -d "venv" ]; then
    source venv/bin/activate
fi

# Run the dashboard
python dashboard.py "$@"
"""
    
    with open(os.path.join(dashboard_dir, "start.sh"), 'w') as f:
        f.write(start_sh)
    os.chmod(os.path.join(dashboard_dir, "start.sh"), 0o755)
    
    console.print(f"[green]✓[/green] Created startup scripts")
    
    # Create the zip file
    zip_path = os.path.join(output_dir, "surveysavvy-dashboard.zip")
    with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for root, _, files in os.walk(dashboard_dir):
            for file in files:
                file_path = os.path.join(root, file)
                arcname = os.path.relpath(file_path, dashboard_dir)
                zipf.write(file_path, arcname)
    
    console.print(f"[green]✓[/green] Created zip package at [bold]{zip_path}[/bold]")
    return zip_path

def build_import_package(output_dir, pdf_dir=None):
    """Build the import tool package.
    
    Args:
        output_dir: Directory to output the built package
        pdf_dir: Directory containing sample PDF files to include
    
    Returns:
        Path to the created zip file
    """
    import_dir = os.path.join(output_dir, "import-tool")
    clean_directory(import_dir)
    
    console.print("\n[bold cyan]Building import tool package...[/bold cyan]")
    
    # Create empty database
    db_path = os.path.join(import_dir, "empty_db.sqlite")
    create_empty_database(db_path)
    
    # Copy example PDFs if provided
    if pdf_dir and os.path.exists(pdf_dir):
        example_dir = os.path.join(import_dir, "example_pdfs")
        ensure_directory(example_dir)
        
        pdf_count = 0
        for file in os.listdir(pdf_dir):
            if file.lower().endswith('.pdf'):
                pdf_path = os.path.join(pdf_dir, file)
                shutil.copy2(pdf_path, os.path.join(example_dir, file))
                pdf_count += 1
        
        if pdf_count > 0:
            console.print(f"[green]✓[/green] Copied {pdf_count} example PDFs")
        else:
            console.print(f"[yellow]⚠[/yellow] No PDF files found in {pdf_dir}")
    
    # Create the import script
    project_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    ref_file = os.path.join(project_dir, "docs/reference/import_unit_offering_and_benchmarks.py")
    
    if not os.path.exists(ref_file):
        console.print(f"[bold red]Error: Reference file not found - {ref_file}[/bold red]")
        return None
    
    # Read the reference implementation
    with open(ref_file, 'r') as f:
        ref_code = f.read()
    
    # Create a simplified import script that uses the reference implementation with Rich UI enhancements
    
    # Read import_unit_offering_and_benchmarks.py and extract relevant parts
    import_script = """#!/usr/bin/env python3
\"\"\"
Standalone utility to import unit survey PDFs into an SQLite database.

This script can:
1. Create a new database with the required schema
2. Import unit survey data from PDF files
3. Show a summary of imported data
\"\"\"

import os
import sys
import sqlite3
import argparse
import re
import pdfplumber
from pathlib import Path
from rich.console import Console
from rich.progress import Progress, SpinnerColumn, TextColumn, BarColumn, TimeElapsedColumn

# Initialize the console for rich output
console = Console()

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

def create_db_schema(db_path):
    \"\"\"Create a new database with the required schema.\"\"\"
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    cursor.executescript(\"\"\"
CREATE TABLE IF NOT EXISTS discipline (
    discipline_code TEXT PRIMARY KEY,
    discipline_name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS unit (
    unit_code TEXT PRIMARY KEY,
    unit_name TEXT NOT NULL,
    discipline_code TEXT,
    FOREIGN KEY (discipline_code) REFERENCES discipline(discipline_code)
);

CREATE TABLE IF NOT EXISTS unit_offering (
    unit_offering_id INTEGER PRIMARY KEY AUTOINCREMENT,
    unit_code TEXT NOT NULL,
    semester TEXT NOT NULL,
    year INTEGER NOT NULL,
    campus TEXT,
    mode TEXT,
    FOREIGN KEY (unit_code) REFERENCES unit(unit_code),
    UNIQUE(unit_code, semester, year, campus, mode)
);

CREATE TABLE IF NOT EXISTS survey_event (
    survey_event_id INTEGER PRIMARY KEY AUTOINCREMENT,
    unit_offering_id INTEGER NOT NULL,
    response_count INTEGER NOT NULL,
    FOREIGN KEY (unit_offering_id) REFERENCES unit_offering(unit_offering_id)
);

CREATE TABLE IF NOT EXISTS question (
    question_id INTEGER PRIMARY KEY AUTOINCREMENT,
    question_text TEXT UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS unit_survey (
    unit_survey_id INTEGER PRIMARY KEY AUTOINCREMENT,
    survey_event_id INTEGER NOT NULL,
    question_id INTEGER NOT NULL,
    agreement_percent REAL NOT NULL,
    FOREIGN KEY (survey_event_id) REFERENCES survey_event(survey_event_id),
    FOREIGN KEY (question_id) REFERENCES question(question_id),
    UNIQUE(survey_event_id, question_id)
);

CREATE TABLE IF NOT EXISTS benchmark (
    benchmark_id INTEGER PRIMARY KEY AUTOINCREMENT,
    survey_event_id INTEGER NOT NULL,
    question_id INTEGER NOT NULL,
    benchmark_type TEXT NOT NULL,
    agreement_percent REAL NOT NULL,
    FOREIGN KEY (survey_event_id) REFERENCES survey_event(survey_event_id),
    FOREIGN KEY (question_id) REFERENCES question(question_id),
    UNIQUE(survey_event_id, question_id, benchmark_type)
);

CREATE TABLE IF NOT EXISTS comment (
    comment_id INTEGER PRIMARY KEY AUTOINCREMENT,
    survey_event_id INTEGER NOT NULL,
    comment_text TEXT NOT NULL,
    FOREIGN KEY (survey_event_id) REFERENCES survey_event(survey_event_id)
);
    \"\"\")
    
    # Populate the standard questions
    questions = [
        "I was engaged by the learning activities.",
        "The resources provided helped me to learn.",
        "My learning was supported.",
        "Assessments helped me to demonstrate my learning.",
        "I knew what was expected of me.",
        "Overall, this unit was a worthwhile experience."
    ]
    
    # Check if questions already exist
    cursor.execute("SELECT COUNT(*) FROM question")
    count = cursor.fetchone()[0]
    
    if count == 0:
        for q in questions:
            cursor.execute(
                "INSERT INTO question (question_text) VALUES (?)", 
                (q,)
            )
    
    conn.commit()
    conn.close()
    return True

def extract_benchmarks(text):
    \"\"\"Extract benchmark table from raw PDF text.\"\"\"
    benchmarks = []
    question_labels = ["Engaged", "Resources", "Support", "Assessments", "Expectations", "Overall"]

    match = re.search(
        r"Benchmarks\\s*-\\s*Percentage Agreement\\s*Engaged\\s+Resources\\s+Support\\s+Assessments\\s+Expectations\\s+Overall\\s+(.+?)\\n\\n",
        text,
        re.DOTALL
    )
    if not match:
        return []

    lines = match.group(1).strip().splitlines()
    for line in lines:
        parts = re.split(r'\\s{2,}', line.strip())
        
        # Skip if we don't have at least benchmark type + 6 values
        if len(parts) < 7:
            continue
            
        benchmark_type = parts[0]
        values = []
        
        # Extract numeric values, handling potential formatting issues
        for val in parts[1:7]:  # Take the first 6 numeric values
            try:
                # Remove % sign and convert to float
                value = float(val.replace('%', '').strip())
                values.append(value)
            except ValueError:
                # Skip invalid values
                values.append(None)
        
        # Skip if we don't have all 6 values
        if len(values) < 6 or any(v is None for v in values):
            continue
            
        # Create benchmark dictionary with question label -> value mapping
        benchmark = {"type": benchmark_type}
        for i, label in enumerate(question_labels):
            benchmark[label] = values[i]
            
        benchmarks.append(benchmark)
    
    return benchmarks

def extract_info_from_pdf(pdf_path):
    \"\"\"Extract all info from one PDF.\"\"\"
    try:
        with pdfplumber.open(pdf_path) as pdf:
            # Extract first page text
            text = pdf.pages[0].extract_text()
            
            # Extract unit code and name
            unit_match = re.search(r"Unit Survey Report - ([A-Z]{4}\\d{4})\\s+(.*?)\\s+- Semester", text)
            if not unit_match:
                return None
                
            unit_code = unit_match.group(1)
            unit_name = unit_match.group(2).strip()
            
            # Extract discipline code
            discipline_code = unit_code[:4]
            
            # Extract semester and year
            semester_match = re.search(r"Semester (\\d)\\s+(\\d{4})", text)
            if not semester_match:
                return None
                
            semester = f"S{semester_match.group(1)}"
            year = int(semester_match.group(2))
            
            # Extract campus and mode
            campus_match = re.search(r"- (.*?)(?:Campus|Centre)\\s+-\\s+(.*?)(?:_|$)", text)
            if campus_match:
                campus = campus_match.group(1).strip()
                mode = campus_match.group(2).strip()
            else:
                campus = "Unknown"
                mode = "Unknown"
            
            # Extract response count
            response_match = re.search(r"Responses:\\s+(\\d+)", text)
            if response_match:
                response_count = int(response_match.group(1))
            else:
                response_count = 0
            
            # Extract agreement percentages
            agreement_match = re.search(
                r"Percentage Agreement\\s+Engaged\\s+(\\d+%)\\s+Resources\\s+(\\d+%)\\s+Support\\s+(\\d+%)\\s+"
                r"Assessments\\s+(\\d+%)\\s+Expectations\\s+(\\d+%)\\s+Overall\\s+(\\d+%)",
                text,
                re.DOTALL
            )
            
            # Initialize empty agreement values
            agreement_values = {}
            
            if agreement_match:
                question_labels = ["Engaged", "Resources", "Support", "Assessments", "Expectations", "Overall"]
                for i, label in enumerate(question_labels, 1):
                    value_str = agreement_match.group(i)
                    value = float(value_str.replace('%', ''))
                    agreement_values[label] = value
                    
            # Extract benchmarks
            full_text = "\\n".join(p.extract_text() for p in pdf.pages)
            benchmarks = extract_benchmarks(full_text)
            
            # Format data for database import
            result = {
                "unit": {
                    "unit_code": unit_code,
                    "unit_name": unit_name,
                    "discipline_code": discipline_code
                },
                "discipline": {
                    "discipline_code": discipline_code,
                    "discipline_name": discipline_map.get(discipline_code, discipline_code)
                },
                "unit_offering": {
                    "unit_code": unit_code,
                    "semester": semester,
                    "year": year,
                    "campus": campus,
                    "mode": mode
                },
                "survey_event": {
                    "response_count": response_count
                },
                "agreement_values": agreement_values,
                "benchmarks": benchmarks
            }
            
            return result
            
    except Exception as e:
        console.print(f"[bold red]Error processing {pdf_path}: {e}[/bold red]")
        return None

def process_pdf(pdf_path, db_path):
    \"\"\"Process a single PDF file.\"\"\"
    try:
        # Extract info from PDF
        data = extract_info_from_pdf(pdf_path)
        if not data:
            console.print(f"[yellow]⚠ Could not extract required information from {pdf_path}[/yellow]")
            return False
            
        # Connect to database
        conn = sqlite3.connect(db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        # Extract components
        unit_data = data["unit"]
        discipline_data = data["discipline"]
        unit_offering_data = data["unit_offering"]
        survey_event_data = data["survey_event"]
        agreement_values = data["agreement_values"]
        benchmarks = data["benchmarks"]
        
        # Insert discipline if not exists
        cursor.execute(
            "INSERT OR IGNORE INTO discipline (discipline_code, discipline_name) VALUES (?, ?)",
            (discipline_data["discipline_code"], discipline_data["discipline_name"])
        )
        
        # Insert unit if not exists
        cursor.execute(
            "INSERT OR IGNORE INTO unit (unit_code, unit_name, discipline_code) VALUES (?, ?, ?)",
            (unit_data["unit_code"], unit_data["unit_name"], unit_data["discipline_code"])
        )
        
        # Insert or get unit_offering
        cursor.execute(
            "INSERT OR IGNORE INTO unit_offering (unit_code, semester, year, campus, mode) VALUES (?, ?, ?, ?, ?)",
            (
                unit_offering_data["unit_code"],
                unit_offering_data["semester"],
                unit_offering_data["year"],
                unit_offering_data["campus"],
                unit_offering_data["mode"]
            )
        )
        
        # Get unit_offering_id
        cursor.execute(
            "SELECT unit_offering_id FROM unit_offering WHERE unit_code = ? AND semester = ? AND year = ? AND campus = ? AND mode = ?",
            (
                unit_offering_data["unit_code"],
                unit_offering_data["semester"],
                unit_offering_data["year"],
                unit_offering_data["campus"],
                unit_offering_data["mode"]
            )
        )
        unit_offering_id = cursor.fetchone()[0]
        
        # Insert survey_event
        cursor.execute(
            "INSERT INTO survey_event (unit_offering_id, response_count) VALUES (?, ?)",
            (unit_offering_id, survey_event_data["response_count"])
        )
        survey_event_id = cursor.lastrowid
        
        # Insert agreement values
        for label, value in agreement_values.items():
            question_text = question_map.get(label)
            if not question_text:
                continue
                
            # Get question_id
            cursor.execute("SELECT question_id FROM question WHERE question_text = ?", (question_text,))
            row = cursor.fetchone()
            if not row:
                console.print(f"[yellow]⚠ Question not found: {question_text}[/yellow]")
                continue
                
            question_id = row[0]
            
            # Insert unit_survey
            cursor.execute(
                "INSERT OR REPLACE INTO unit_survey (survey_event_id, question_id, agreement_percent) VALUES (?, ?, ?)",
                (survey_event_id, question_id, value)
            )
        
        # Insert benchmarks
        for benchmark in benchmarks:
            benchmark_type = benchmark["type"]
            
            for label, value in benchmark.items():
                if label == "type":
                    continue
                    
                question_text = question_map.get(label)
                if not question_text:
                    continue
                    
                # Get question_id
                cursor.execute("SELECT question_id FROM question WHERE question_text = ?", (question_text,))
                row = cursor.fetchone()
                if not row:
                    continue
                    
                question_id = row[0]
                
                # Insert benchmark
                cursor.execute(
                    "INSERT OR REPLACE INTO benchmark (survey_event_id, question_id, benchmark_type, agreement_percent) VALUES (?, ?, ?, ?)",
                    (survey_event_id, question_id, benchmark_type, value)
                )
        
        conn.commit()
        conn.close()
        
        console.print(f"[green]✅ Successfully imported {os.path.basename(pdf_path)}[/green]")
        return True
        
    except Exception as e:
        console.print(f"[bold red]Error importing {pdf_path}: {e}[/bold red]")
        return False

def process_folder(folder_path, db_path):
    \"\"\"Process all PDFs in a folder.\"\"\"
    pdf_files = [f for f in os.listdir(folder_path) if f.lower().endswith('.pdf')]
    if not pdf_files:
        console.print(f"[yellow]⚠ No PDF files found in {folder_path}[/yellow]")
        return 0
    
    with Progress(
        SpinnerColumn(),
        TextColumn("[bold blue]{task.description}"),
        BarColumn(),
        TimeElapsedColumn(),
        console=console
    ) as progress:
        task = progress.add_task(f"📁 Processing {len(pdf_files)} PDF files...", total=len(pdf_files))
        
        success_count = 0
        for file in pdf_files:
            pdf_path = os.path.join(folder_path, file)
            if process_pdf(pdf_path, db_path):
                success_count += 1
            progress.update(task, advance=1)
        
        console.print(f"\\n📊 [bold green]Summary: {success_count}/{len(pdf_files)} files imported successfully[/bold green]")
    
    return success_count

def list_database_contents(db_path):
    \"\"\"List the contents of the database.\"\"\"
    if not os.path.exists(db_path):
        console.print(f"[bold red]Error: Database file '{db_path}' not found.[/bold red]")
        return
    
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    
    # Count records in each table
    tables = [
        "discipline", "unit", "unit_offering", "survey_event", 
        "question", "unit_survey", "benchmark", "comment"
    ]
    
    console.print("\\n[bold cyan]Database Summary:[/bold cyan]")
    
    for table in tables:
        cur.execute(f"SELECT COUNT(*) FROM {table}")
        count = cur.fetchone()[0]
        console.print(f"  [bold]{table}:[/bold] {count} records")
    
    # List units
    cur.execute('''
        SELECT u.unit_code, u.unit_name, COUNT(DISTINCT uo.unit_offering_id) as offerings
        FROM unit u
        LEFT JOIN unit_offering uo ON u.unit_code = uo.unit_code
        GROUP BY u.unit_code
        ORDER BY u.unit_code
    ''')
    
    units = cur.fetchall()
    
    if units:
        console.print("\\n[bold cyan]Units in Database:[/bold cyan]")
        for unit in units:
            console.print(f"  [bold]{unit['unit_code']}:[/bold] {unit['unit_name']} ({unit['offerings']} offerings)")
    
    conn.close()

def main():
    parser = argparse.ArgumentParser(description='Import unit survey PDFs into an SQLite database')
    parser.add_argument('--pdf', help='Path to PDF file to import')
    parser.add_argument('--folder', help='Path to folder containing PDF files to import')
    parser.add_argument('--db', default='unit_survey.db', help='Path to the SQLite database file')
    parser.add_argument('--new-db', action='store_true', help='Create a new database (overwrites existing)')
    parser.add_argument('--list', action='store_true', help='List database contents')
    
    args = parser.parse_args()
    
    if args.new_db:
        if os.path.exists(args.db) and input(f"Database {args.db} exists. Overwrite? (y/n): ").lower() != 'y':
            console.print("[yellow]Operation cancelled.[/yellow]")
            return
        
        console.print(f"[bold]Creating new database: {args.db}[/bold]")
        create_db_schema(args.db)
        console.print("[green]✅ Database schema created successfully[/green]")
    
    if args.list:
        list_database_contents(args.db)
        return
    
    if not args.pdf and not args.folder:
        parser.print_help()
        console.print("\\n[yellow]Please specify either a PDF file (--pdf) or a folder (--folder)[/yellow]")
        return
    
    # Check if database exists
    if not os.path.exists(args.db):
        console.print(f"[yellow]Database {args.db} does not exist. Creating new database...[/yellow]")
        create_db_schema(args.db)
    
    if args.pdf:
        if not os.path.exists(args.pdf):
            console.print(f"[bold red]Error: PDF file not found: {args.pdf}[/bold red]")
            return
        
        console.print(f"[bold]Importing file: {args.pdf}[/bold]")
        process_pdf(args.pdf, args.db)
    
    if args.folder:
        if not os.path.exists(args.folder):
            console.print(f"[bold red]Error: Folder not found: {args.folder}[/bold red]")
            return
        
        console.print(f"[bold]Importing PDFs from folder: {args.folder}[/bold]")
        process_folder(args.folder, args.db)
    
    # Show database contents after import
    list_database_contents(args.db)

if __name__ == "__main__":
    main()
"""
    
    with open(os.path.join(import_dir, "import_surveys.py"), 'w') as f:
        f.write(import_script)
    os.chmod(os.path.join(import_dir, "import_surveys.py"), 0o755)
    console.print(f"[green]✓[/green] Created import script")
    
    # Create requirements.txt
    with open(os.path.join(import_dir, "requirements.txt"), 'w') as f:
        f.write("pdfplumber\nrich\n")
    console.print(f"[green]✓[/green] Created requirements.txt")
    
    # Create README
    readme_content = "# SurveySavvy PDF Import Tool\n\n"
    readme_content += "This is a standalone utility for importing unit survey PDF reports into an SQLite database.\n\n"
    readme_content += "## Features\n\n"
    readme_content += "- Create a new database with the SurveySavvy schema\n"
    readme_content += "- Import unit survey data from PDF files\n"
    readme_content += "- Import benchmarks and survey statistics\n"
    readme_content += "- Show summary of database contents\n"
    readme_content += "- Works independently of the main SurveySavvy application\n\n"
    readme_content += "## Setup\n\n"
    readme_content += "### Installation\n\n"
    readme_content += "1. Ensure you have Python 3.9+ installed\n"
    readme_content += "2. Install dependencies:\n\n"
    readme_content += "```bash\n"
    readme_content += "pip install -r requirements.txt\n"
    readme_content += "```\n\n"
    readme_content += "### Usage\n\n"
    readme_content += "```bash\n"
    readme_content += "# Create a new empty database\n"
    readme_content += "python import_surveys.py --new-db --db my_surveys.db\n\n"
    readme_content += "# Import a single PDF file\n"
    readme_content += "python import_surveys.py --pdf path/to/survey.pdf --db my_surveys.db\n\n"
    readme_content += "# Import all PDFs in a folder\n"
    readme_content += "python import_surveys.py --folder path/to/pdf/folder --db my_surveys.db\n\n"
    readme_content += "# List contents of the database\n"
    readme_content += "python import_surveys.py --list --db my_surveys.db\n"
    readme_content += "```\n\n"
    readme_content += "### Options\n\n"
    readme_content += "- `--pdf`: Path to a single PDF file to import\n"
    readme_content += "- `--folder`: Path to a folder containing PDF files to import\n"
    readme_content += "- `--db`: Path to the database file (default: unit_survey.db)\n"
    readme_content += "- `--new-db`: Create a new database (will prompt before overwriting)\n"
    readme_content += "- `--list`: List database contents\n\n"
    readme_content += "## Example Workflow\n\n"
    readme_content += "1. Create a new database:\n"
    readme_content += "   ```bash\n"
    readme_content += "   python import_surveys.py --new-db\n"
    readme_content += "   ```\n\n"
    readme_content += "2. Import PDF reports:\n"
    readme_content += "   ```bash\n"
    readme_content += "   python import_surveys.py --folder my_reports\n"
    readme_content += "   ```\n\n"
    readme_content += "3. Check database contents:\n"
    readme_content += "   ```bash\n"
    readme_content += "   python import_surveys.py --list\n"
    readme_content += "   ```\n\n"
    readme_content += "## Notes\n\n"
    readme_content += "- The script automatically creates a new database if it does not exist\n"
    readme_content += "- PDF reports must follow a specific format to be parsed correctly\n"
    readme_content += "- The empty_db.sqlite file is provided as a starting point if needed\n\n"
    readme_content += "## Database Structure\n\n"
    readme_content += "The database follows the SurveySavvy schema and includes tables for:\n\n"
    readme_content += "- `discipline` - Academic disciplines\n"
    readme_content += "- `unit` - Course units\n"
    readme_content += "- `unit_offering` - Specific offerings of a unit\n"
    readme_content += "- `survey_event` - Survey events\n"
    readme_content += "- `question` - Standard survey questions\n"
    readme_content += "- `unit_survey` - Survey responses\n"
    readme_content += "- `benchmark` - Benchmark data for comparison\n"
    
    with open(os.path.join(import_dir, "README.md"), 'w') as f:
        f.write(readme_content)
    console.print(f"[green]✓[/green] Created README.md")
    
    # Create startup scripts
    setup_bat = """@echo off
echo Setting up SurveySavvy PDF Import Tool...

REM Check if Python is installed
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Python is not installed or not in PATH.
    echo Please install Python 3.9 or higher from python.org
    pause
    exit /b
)

REM Create virtual environment
echo Creating virtual environment...
python -m venv venv

REM Activate virtual environment
echo Activating virtual environment...
call venv\\Scripts\\activate

REM Install requirements
echo Installing required packages...
pip install -r requirements.txt

echo Setup complete!
echo.
echo To use the tool:
echo 1. Open a command prompt in this directory
echo 2. Run: venv\\Scripts\\activate
echo 3. Run: python import_surveys.py --help
echo.
echo For example, to import PDFs from a folder:
echo import.bat --folder pdf_reports
echo.
echo Press any key to exit...
pause
"""
    
    with open(os.path.join(import_dir, "setup.bat"), 'w') as f:
        f.write(setup_bat)
    
    import_bat = """@echo off

REM Activate virtual environment if it exists
if exist venv\\Scripts\\activate (
    call venv\\Scripts\\activate
)

REM Run the import command with all arguments passed to this script
python import_surveys.py %*
"""
    
    with open(os.path.join(import_dir, "import.bat"), 'w') as f:
        f.write(import_bat)
    
    setup_sh = """#!/bin/bash

echo "Setting up SurveySavvy PDF Import Tool..."

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "Python is not installed or not in PATH."
    echo "Please install Python 3.9 or higher."
    exit 1
fi

# Create virtual environment
echo "Creating virtual environment..."
python3 -m venv venv

# Activate virtual environment
echo "Activating virtual environment..."
source venv/bin/activate

# Install requirements
echo "Installing required packages..."
pip install -r requirements.txt

echo "Setup complete!"
echo
echo "To use the tool:"
echo "1. Open a terminal in this directory"
echo "2. Run: source venv/bin/activate"
echo "3. Run: python import_surveys.py --help"
echo
echo "For example, to import PDFs from a folder:"
echo "./import.sh --folder pdf_reports"
echo
"""
    
    with open(os.path.join(import_dir, "setup.sh"), 'w') as f:
        f.write(setup_sh)
    os.chmod(os.path.join(import_dir, "setup.sh"), 0o755)
    
    import_sh = """#!/bin/bash

# Activate virtual environment if it exists
if [ -d "venv" ]; then
    source venv/bin/activate
fi

# Run the import command with all arguments passed to this script
python import_surveys.py "$@"
"""
    
    with open(os.path.join(import_dir, "import.sh"), 'w') as f:
        f.write(import_sh)
    os.chmod(os.path.join(import_dir, "import.sh"), 0o755)
    
    console.print(f"[green]✓[/green] Created startup scripts")
    
    # Create zip file
    zip_path = os.path.join(output_dir, "surveysavvy-import-tool.zip")
    with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for root, _, files in os.walk(import_dir):
            for file in files:
                file_path = os.path.join(root, file)
                arcname = os.path.relpath(file_path, import_dir)
                zipf.write(file_path, arcname)
    
    console.print(f"[green]✓[/green] Created zip package at [bold]{zip_path}[/bold]")
    return zip_path

def main():
    """Main entry point for the build script."""
    parser = argparse.ArgumentParser(description='Build SurveySavvy distribution packages')
    parser.add_argument('--dashboard', action='store_true', help='Build the dashboard package')
    parser.add_argument('--import-tool', action='store_true', help='Build the import tool package')
    parser.add_argument('--all', action='store_true', help='Build all packages')
    parser.add_argument('--db-path', help='Path to database file to include in the dashboard package')
    parser.add_argument('--pdf-dir', default='docs/reference', help='Directory with example PDFs')
    parser.add_argument('--output-dir', default='dist', help='Output directory')
    parser.add_argument('--no-db-copy', action='store_true', help='Do not copy the database (create empty instead)')
    
    args = parser.parse_args()
    
    # Get project directory and ensure output directory exists
    project_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    output_dir = os.path.join(project_dir, args.output_dir)
    ensure_directory(output_dir)
    
    # Determine which packages to build
    build_all = args.all or (not args.dashboard and not args.import_tool)
    
    # Build dashboard package if requested
    if build_all or args.dashboard:
        build_dashboard_package(output_dir, args.db_path, not args.no_db_copy)
    
    # Build import tool package if requested
    if build_all or args.import_tool:
        pdf_dir = os.path.join(project_dir, args.pdf_dir) if args.pdf_dir else None
        build_import_package(output_dir, pdf_dir)
    
    console.print("\n[bold green]✓ Build completed successfully![/bold green]")
    console.print(f"Packages are available in the [bold]{output_dir}/[/bold] directory")

if __name__ == "__main__":
    main()