"""
Example of how to use SurveySavvy as a Python module.

This script demonstrates the basic functionality of SurveySavvy:
1. Creating a database
2. Generating units and survey data
3. Exporting to CSV

Usage:
    python basic_usage.py
"""

import os
import argparse
from surveysavvy.core import Database, SurveyGenerator


def main():
    """Run the example script."""
    parser = argparse.ArgumentParser(description="SurveySavvy example script")
    parser.add_argument("--output-path", default="example_survey.db", help="Path to output database")
    parser.add_argument("--unit-count", type=int, default=10, help="Number of units to generate")
    parser.add_argument("--years", type=int, default=5, help="Number of years of data")
    parser.add_argument("--start-year", type=int, default=2018, help="Starting year")
    parser.add_argument("--export-dir", default="example_exports", help="Directory for CSV exports")
    args = parser.parse_args()
    
    print(f"Creating database at {args.output_path}")
    
    # Create the database
    db = Database(args.output_path)
    db.create_schema()
    
    # Create a generator
    generator = SurveyGenerator(db)
    
    # Generate units
    print(f"Generating {args.unit_count} units")
    generator.populate_units(unit_count=args.unit_count)
    
    # Generate survey data
    end_year = args.start_year + args.years - 1
    print(f"Generating survey data for years {args.start_year}-{end_year}")
    generator.generate_surveys(start_year=args.start_year, end_year=end_year)
    
    # Close the database connection
    db.close()
    
    print("Database generation complete!")
    
    # Export to CSV
    print(f"Exporting to CSV in {args.export_dir}")
    os.makedirs(args.export_dir, exist_ok=True)
    
    db = Database(args.output_path)
    db.export_to_csv(args.export_dir)
    db.close()
    
    print("Export complete!")
    print(f"Database file: {args.output_path}")
    print(f"CSV exports: {args.export_dir}/")


if __name__ == "__main__":
    main()