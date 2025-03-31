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
        datetime.datetime.now().year - years,
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