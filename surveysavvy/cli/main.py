"""
Command-line interface for SurveySavvy.

This module provides the CLI for generating and exporting survey data.
"""

import os
import typer
from typing import Optional
from pathlib import Path
import rich
from rich.console import Console
from rich.progress import Progress, SpinnerColumn, TextColumn, BarColumn, TimeElapsedColumn
import datetime
import sqlite3
import pdfplumber
import re

from surveysavvy.core import Database, SurveyGenerator

console = Console()
app = typer.Typer(
    name="surveysavvy",
    help="Generate synthetic student unit survey data"
)


@app.command()
def generate(
    output_path: str = typer.Option(
        "unit_survey.db",
        "--output-path", "-o",
        help="Path to output database file"
    ),
    years: int = typer.Option(
        5,
        "--years", "-y",
        help="Number of years to generate data for (5-7 recommended)",
        min=1,
        max=10
    ),
    unit_count: int = typer.Option(
        30,
        "--unit-count", "-u",
        help="Number of units to generate",
        min=5,
        max=100
    ),
    start_year: int = typer.Option(
        datetime.datetime.now().year - 5,  # Default to 5 years
        "--start-year", "-s",
        help="Starting year for data generation"
    ),
    random_seed: int = typer.Option(
        42,
        "--seed",
        help="Random seed for reproducibility"
    ),
    anthropic_api_key: Optional[str] = typer.Option(
        None,
        "--api-key",
        help="Anthropic API key for generating comments (optional)"
    ),
    force: bool = typer.Option(
        False,
        "--force", "-f",
        help="Overwrite existing database if it exists"
    )
):
    """Generate a synthetic survey database."""
    
    # Check if file exists and handle accordingly
    if os.path.exists(output_path) and not force:
        overwrite = typer.confirm(
            f"Database file '{output_path}' already exists. Overwrite?",
            default=False
        )
        if not overwrite:
            console.print("[bold red]Operation cancelled.[/bold red]")
            raise typer.Exit(1)
    
    # Calculate end year
    end_year = start_year + years - 1
    
    # Try to get API key from environment if not provided
    api_key = anthropic_api_key or os.environ.get("ANTHROPIC_API_KEY")
    
    # Show configuration
    console.print("🔍 [bold cyan]SurveySavvy Configuration:[/bold cyan]")
    console.print(f"  📊 Generating [bold]{unit_count}[/bold] units")
    console.print(f"  📅 Data spans [bold]{years}[/bold] years ({start_year}-{end_year})")
    console.print(f"  💾 Output file: [bold]{output_path}[/bold]")
    console.print(f"  🎲 Random seed: [bold]{random_seed}[/bold]")
    console.print(f"  💬 LLM for comments: [bold]{'Enabled' if api_key else 'Disabled'}[/bold]")
    
    if not api_key:
        console.print("\n[yellow]⚠️  Warning: No Anthropic API key provided.[/yellow]")
        console.print("[yellow]   Comments will be generated using templates instead of LLM.[/yellow]")
        console.print("[yellow]   Set the ANTHROPIC_API_KEY environment variable or use --api-key for LLM-generated comments.[/yellow]\n")
    
    # Create and initialize database
    with Progress(
        SpinnerColumn(),
        TextColumn("[bold blue]{task.description}"),
        BarColumn(),
        TimeElapsedColumn(),
        console=console
    ) as progress:
        task = progress.add_task("📊 Initializing database...", total=6)
        
        # Create database
        db = Database(output_path)
        progress.update(task, advance=1, description="📊 Creating database schema...")
        db.create_schema()
        
        # Initialize generator
        progress.update(task, advance=1, description="📊 Initializing generator...")
        generator = SurveyGenerator(db, random_seed=random_seed, anthropic_key=api_key)
        
        # Generate units
        progress.update(task, advance=1, description="📊 Generating units...")
        generator.populate_units(unit_count=unit_count)
        
        # Generate survey data
        progress.update(task, advance=1, description="📊 Generating survey data...")
        generator.generate_surveys(start_year=start_year, end_year=end_year)
        
        # Finalize database
        progress.update(task, advance=1, description="📊 Finalizing database...")
        db.commit()
        db.close()
        
        # Complete
        progress.update(task, advance=1, description="✨ Generation complete!")
    
    # Show stats
    console.print("\n✅ [bold green]Database generated successfully![/bold green]")
    console.print(f"📊 Database file: [bold]{output_path}[/bold]")
    console.print(f"📅 Data spans {start_year} to {end_year}")
    console.print(f"🎓 Contains data for {unit_count} units")


@app.command()
def export(
    db_path: str = typer.Option(
        "unit_survey.db",
        "--db-path", "-d",
        help="Path to database file"
    ),
    output_dir: str = typer.Option(
        "exports",
        "--output-dir", "-o",
        help="Directory to output CSV files"
    ),
    force: bool = typer.Option(
        False,
        "--force", "-f",
        help="Overwrite existing files if they exist"
    )
):
    """Export database tables to CSV files."""
    
    # Check if database exists
    if not os.path.exists(db_path):
        console.print(f"[bold red]Error: Database file '{db_path}' not found.[/bold red]")
        raise typer.Exit(1)
    
    # Check if output directory exists and handle accordingly
    if os.path.exists(output_dir) and not force:
        files = os.listdir(output_dir)
        if files and any(file.endswith(".csv") for file in files):
            overwrite = typer.confirm(
                f"CSV files already exist in '{output_dir}'. Overwrite?",
                default=False
            )
            if not overwrite:
                console.print("[bold red]Operation cancelled.[/bold red]")
                raise typer.Exit(1)
    
    # Create output directory if it doesn't exist
    os.makedirs(output_dir, exist_ok=True)
    
    # Open database and export
    with Progress(
        SpinnerColumn(),
        TextColumn("[bold blue]{task.description}"),
        BarColumn(),
        TimeElapsedColumn(),
        console=console
    ) as progress:
        task = progress.add_task("📊 Exporting database...", total=2)
        
        # Open database
        db = Database(db_path)
        progress.update(task, advance=1, description="📊 Exporting to CSV...")
        
        # Export
        db.export_to_csv(output_dir)
        db.close()
        
        # Complete
        progress.update(task, advance=1, description="✨ Export complete!")
    
    # Show stats
    console.print("\n✅ [bold green]Export completed successfully![/bold green]")
    console.print(f"📊 CSV files saved to: [bold]{output_dir}/[/bold]")


@app.command()
def import_surveys(
    pdf_path: str = typer.Option(
        None,
        "--pdf",
        help="Path to PDF file to import"
    ),
    folder_path: str = typer.Option(
        None,
        "--folder",
        help="Path to folder containing PDF files to import"
    ),
    db_path: str = typer.Option(
        "unit_survey.db",
        "--db-path", "-d",
        help="Path to database file"
    )
):
    """Import unit survey data from PDF reports."""
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
    
    if not pdf_path and not folder_path:
        console.print("[bold red]Error: Please specify either a PDF file (--pdf) or a folder (--folder)[/bold red]")
        raise typer.Exit(1)
    
    # Check if database exists
    if not os.path.exists(db_path):
        console.print(f"[bold red]Error: Database file '{db_path}' not found.[/bold red]")
        raise typer.Exit(1)
    
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
    
    def process_pdf(pdf_path, db_path):
        """Process a single PDF file."""
        try:
            # Connect to database
            conn = sqlite3.connect(db_path)
            conn.row_factory = sqlite3.Row
            cur = conn.cursor()
            
            # Extract data from PDF
            result = extract_info_from_pdf(pdf_path)
            if not result:
                console.print(f"[yellow]⚠ Skipped: {os.path.basename(pdf_path)} (no match)[/yellow]")
                conn.close()
                return False
            
            # Get question IDs
            cur.execute("SELECT question_id, question_text FROM question")
            question_ids = {row["question_text"]: row["question_id"] for row in cur.fetchall()}
            
            # Insert discipline
            cur.execute("""
                INSERT OR IGNORE INTO discipline (discipline_code, discipline_name)
                VALUES (?, ?)
            """, (result['discipline_code'], result['discipline_name']))
            
            # Insert unit
            cur.execute("""
                INSERT OR IGNORE INTO unit (unit_code, unit_name, discipline_code)
                VALUES (?, ?, ?)
            """, (result['unit_code'], result['unit_name'], result['discipline_code']))
            
            # Insert unit offering
            cur.execute("""
                INSERT OR IGNORE INTO unit_offering (unit_code, semester, year, location, availability)
                VALUES (?, ?, ?, ?, ?)
            """, (
                result['unit_code'],
                result['semester'],
                result['year'],
                result['location'],
                result['availability']
            ))
            
            # Get the unit_offering_id
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
            
            unit_offering_row = cur.fetchone()
            if not unit_offering_row:
                console.print(f"[yellow]⚠ Failed to insert unit offering for {result['unit_code']}[/yellow]")
                conn.close()
                return False
            
            unit_offering_id = unit_offering_row[0]
            
            # Get or create survey event
            month = 5 if result['semester'] == 1 else 10  # May for sem 1, Oct for sem 2
            description = f"Semester {result['semester']} {result['year']} Survey"
            
            # Check if survey event exists
            cur.execute("""
                SELECT event_id FROM survey_event
                WHERE year = ? AND month = ?
            """, (result['year'], month))
            
            event_row = cur.fetchone()
            if event_row:
                event_id = event_row[0]
            else:
                # Create new survey event
                cur.execute("""
                    INSERT INTO survey_event (month, year, description)
                    VALUES (?, ?, ?)
                """, (month, result['year'], description))
                event_id = cur.lastrowid
            
            # Check if unit survey already exists
            cur.execute("""
                SELECT survey_id FROM unit_survey
                WHERE unit_offering_id = ? AND event_id = ?
            """, (unit_offering_id, event_id))
            
            survey_row = cur.fetchone()
            if survey_row:
                survey_id = survey_row[0]
            else:
                # Insert unit survey
                cur.execute("""
                    INSERT INTO unit_survey (unit_offering_id, event_id, enrolments, responses, response_rate, overall_experience)
                    VALUES (?, ?, ?, ?, ?, ?)
                """, (
                    unit_offering_id,
                    event_id,
                    result.get('enrollments', 0),
                    result.get('responses', 0),
                    result.get('response_rate', 0),
                    result.get('overall_experience', 0)
                ))
                survey_id = cur.lastrowid
            
            # Extract and insert benchmarks
            benchmarks = extract_benchmarks(result['text'])
            benchmark_count = 0
            
            for benchmark in benchmarks:
                # Get question_id from label
                question_text = question_map.get(benchmark['question_label'])
                if not question_text:
                    continue
                
                question_id = question_ids.get(question_text)
                if not question_id:
                    continue
                
                # Check if benchmark already exists
                cur.execute("""
                    SELECT benchmark_id FROM benchmark
                    WHERE event_id = ? AND question_id = ? AND group_type = ?
                """, (event_id, question_id, benchmark['group_type']))
                
                if cur.fetchone():
                    # Benchmark already exists
                    continue
                
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
                
                benchmark_count += 1
            
            conn.commit()
            conn.close()
            
            console.print(f"[green]✅ Imported: {result['unit_code']} {result['semester']}/{result['year']} + {benchmark_count} benchmarks[/green]")
            return True
            
        except Exception as e:
            console.print(f"[bold red]Error processing {os.path.basename(pdf_path)}: {str(e)}[/bold red]")
            return False
    
    with Progress(
        SpinnerColumn(),
        TextColumn("[bold blue]{task.description}"),
        BarColumn(),
        TimeElapsedColumn(),
        console=console
    ) as progress:
        # Process files
        if pdf_path:
            if not os.path.exists(pdf_path):
                console.print(f"[bold red]Error: PDF file not found: {pdf_path}[/bold red]")
                raise typer.Exit(1)
            
            task = progress.add_task("📄 Processing PDF file...", total=1)
            process_pdf(pdf_path, db_path)
            progress.update(task, advance=1)
            
        elif folder_path:
            if not os.path.exists(folder_path):
                console.print(f"[bold red]Error: Folder not found: {folder_path}[/bold red]")
                raise typer.Exit(1)
            
            pdf_files = [f for f in os.listdir(folder_path) if f.endswith('.pdf')]
            if not pdf_files:
                console.print(f"[yellow]⚠ No PDF files found in {folder_path}[/yellow]")
                raise typer.Exit(1)
            
            task = progress.add_task(f"📁 Processing {len(pdf_files)} PDF files...", total=len(pdf_files))
            
            success_count = 0
            for file in pdf_files:
                pdf_path = os.path.join(folder_path, file)
                if process_pdf(pdf_path, db_path):
                    success_count += 1
                progress.update(task, advance=1)
            
            console.print(f"\n📊 [bold green]Summary: {success_count}/{len(pdf_files)} files imported successfully[/bold green]")


@app.command()
def dashboard(
    db_path: str = typer.Option(
        "unit_survey.db",
        "--db-path", "-d",
        help="Path to database file"
    ),
    port: int = typer.Option(
        5000,
        "--port", "-p",
        help="Port to run the dashboard on"
    ),
    host: str = typer.Option(
        "127.0.0.1",
        "--host", "-h",
        help="Host to run the dashboard on"
    )
):
    """Launch a web dashboard for viewing survey data."""
    try:
        from surveysavvy.web.dashboard import run_dashboard
        console.print("\n🌐 [bold green]Launching SurveySavvy Dashboard...[/bold green]")
        console.print(f"📊 Access the dashboard at: [bold]http://{host}:{port}/[/bold]")
        console.print(f"📋 Using database: [bold]{db_path}[/bold]")
        console.print(f"⚙️  Press CTRL+C to exit\n")
        run_dashboard(db_path=db_path, host=host, port=port)
    except ImportError as e:
        console.print("\n[bold red]Error: The dashboard requires additional dependencies.[/bold red]")
        console.print("[yellow]Please install them with: pip install \"surveysavvy[web]\"[/yellow]\n")
        console.print("[dim]Or manually install: pip install python-fasthtml plotly[/dim]")
        console.print(f"[dim]Technical details: {str(e)}[/dim]")
        raise typer.Exit(1)


@app.callback()
def main():
    """
    SurveySavvy: Generate synthetic student unit survey data.
    
    This tool creates realistic survey data with sentiment patterns,
    response distributions, and comments for university course surveys.
    """
    pass


if __name__ == "__main__":
    app()