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


@app.command("import-surveys")
def import_surveys(
    pdf_path: str = typer.Option(
        None,
        "--pdf",
        help="Path to a single PDF survey file to import"
    ),
    folder_path: str = typer.Option(
        None,
        "--folder",
        help="Path to folder containing multiple PDF survey files to import"
    ),
    db_path: str = typer.Option(
        "unit_survey.db",
        "--db-path", "-d",
        help="Path to database file"
    ),
    create_db: bool = typer.Option(
        False,
        "--create-db",
        help="Create an empty database if it doesn't exist"
    ),
    debug: bool = typer.Option(
        False,
        "--debug",
        help="Print debug information during processing"
    ),
    save_json: Optional[str] = typer.Option(
        None,
        "--save-json",
        help="Save extracted data as JSON before import (can be a file or directory)"
    )
):
    """
    Import unit survey data from PDF reports.
    
    Extracts data from standardized unit survey PDFs including:
    - Unit and course details (code, name, semester, campus, mode)
    - Response statistics (enrollments, responses, response rate)
    - Benchmark comparisons (across unit, school, faculty, university)
    - Percentage agreement ratings for key questions
    - Student comments with sentiment analysis
    """
    try:
        # Import the PyMuPDF-based PDF processor
        from surveysavvy.core.pdf_import import process_pdf, process_folder
    except ImportError:
        console.print("[bold red]Error: Required package PyMuPDF is missing.[/bold red]")
        console.print("[yellow]Please install it with: pip install \"surveysavvy[pdf]\"[/yellow]")
        console.print("[dim]Or manually install: pip install pymupdf[/dim]")
        raise typer.Exit(1)
    
    if not pdf_path and not folder_path:
        console.print("[bold red]Error: Please specify either a PDF file (--pdf) or a folder (--folder)[/bold red]")
        raise typer.Exit(1)
    
    # Check if database exists
    if not os.path.exists(db_path):
        if create_db:
            console.print(f"[yellow]Database file '{db_path}' not found. Creating new database...[/yellow]")
            db = Database(db_path)
            db.create_schema()
            db.commit()
            db.close()
            console.print(f"[green]✅ Created new empty database: {db_path}[/green]")
        else:
            console.print(f"[bold red]Error: Database file '{db_path}' not found.[/bold red]")
            console.print("[yellow]Use --create-db flag to create a new database[/yellow]")
            raise typer.Exit(1)
    
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
            
            # Process PDF with PyMuPDF
            result = process_pdf(pdf_path, db_path, debug=debug, save_json=save_json)
            progress.update(task, advance=1)
            
            if result["success"]:
                console.print(f"[green]✅ Imported: {result['unit_code']} {result['semester']}/{result['year']}[/green]")
                console.print(f"[green]   → {result['benchmarks']} benchmarks added[/green]")
                console.print(f"[green]   → {result.get('detailed_results_added', 0)} detailed results added[/green]")
                console.print(f"[green]   → {result['comments']} comments added[/green]")
            else:
                console.print(f"[bold red]❌ Error: {result['message']}[/bold red]")
                
        elif folder_path:
            if not os.path.exists(folder_path):
                console.print(f"[bold red]Error: Folder not found: {folder_path}[/bold red]")
                raise typer.Exit(1)
            
            pdf_files = [f for f in os.listdir(folder_path) if f.lower().endswith('.pdf')]
            if not pdf_files:
                console.print(f"[yellow]⚠ No PDF files found in {folder_path}[/yellow]")
                raise typer.Exit(1)
            
            task = progress.add_task(f"📁 Processing {len(pdf_files)} PDF files...", total=len(pdf_files))
            
            # Process folder with PyMuPDF
            results = process_folder(folder_path, db_path, debug=debug, save_json=save_json)
            progress.update(task, advance=len(pdf_files))
            
            # Show summary
            console.print(f"\n📊 [bold green]Summary: {results['successful']}/{results['total']} files imported successfully[/bold green]")
            
            # Show details for successful imports
            if results['successful'] > 0:
                console.print("\n[green]Successfully imported:[/green]")
                for detail in results['details']:
                    if detail['result']['success']:
                        result = detail['result']
                        unit_info = f"{result['unit_code']} {result['semester']}/{result['year']}"
                        campus_info = f"({detail['file'].split('Campus')[-1].split('-')[0].strip() if 'Campus' in detail['file'] else ''})"
                        stats = f"{result['benchmarks']} benchmarks, {result.get('detailed_results_added', 0)} detailed results, {result['comments']} comments"
                        console.print(f"  ✅ {unit_info} {campus_info} - {stats}")
            
            # Show details for failed imports
            if results['failed'] > 0:
                console.print("\n[yellow]Failed imports:[/yellow]")
                for detail in results['details']:
                    if not detail['result']['success']:
                        console.print(f"  ❌ {detail['file']}: {detail['result']['message']}")


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