"""
Database management module for SurveySavvy.

This module provides the core functionality for creating, managing, and exporting
the SQLite database containing unit survey data.
"""

import os
import sqlite3
from pathlib import Path
import pandas as pd
from typing import Optional, Union, List


class Database:
    """Main database class for handling SQLite operations."""
    
    def __init__(self, db_path: str = "unit_survey.db"):
        """
        Initialize database connection.
        
        Args:
            db_path: Path to the SQLite database file
        """
        self.db_path = db_path
        self.conn = sqlite3.connect(db_path)
        self.conn.row_factory = sqlite3.Row
        self.cursor = self.conn.cursor()
    
    def create_schema(self):
        """Create the database schema based on the specification."""
        self.cursor.executescript("""
        -- Discipline table
        CREATE TABLE IF NOT EXISTS discipline (
            discipline_code TEXT PRIMARY KEY,
            discipline_name TEXT
        );
        
        -- Unit table
        CREATE TABLE IF NOT EXISTS unit (
            unit_code TEXT PRIMARY KEY,
            unit_name TEXT,
            discipline_code TEXT,
            FOREIGN KEY (discipline_code) REFERENCES discipline(discipline_code)
        );
        
        -- Unit offering table
        CREATE TABLE IF NOT EXISTS unit_offering (
            unit_offering_id INTEGER PRIMARY KEY AUTOINCREMENT,
            unit_code TEXT,
            semester INTEGER,
            year INTEGER,
            location TEXT,
            availability TEXT,
            UNIQUE(unit_code, semester, year, location, availability),
            FOREIGN KEY (unit_code) REFERENCES unit(unit_code)
        );
        
        -- Survey event table
        CREATE TABLE IF NOT EXISTS survey_event (
            event_id INTEGER PRIMARY KEY AUTOINCREMENT,
            month INTEGER,
            year INTEGER,
            description TEXT
        );
        
        -- Question table
        CREATE TABLE IF NOT EXISTS question (
            question_id INTEGER PRIMARY KEY AUTOINCREMENT,
            question_text TEXT
        );
        
        -- Unit survey table
        CREATE TABLE IF NOT EXISTS unit_survey (
            survey_id INTEGER PRIMARY KEY AUTOINCREMENT,
            unit_offering_id INTEGER,
            event_id INTEGER,
            enrolments INTEGER,
            responses INTEGER,
            response_rate REAL,
            overall_experience REAL,
            FOREIGN KEY (unit_offering_id) REFERENCES unit_offering(unit_offering_id),
            FOREIGN KEY (event_id) REFERENCES survey_event(event_id)
        );
        
        -- Unit survey result table
        CREATE TABLE IF NOT EXISTS unit_survey_result (
            result_id INTEGER PRIMARY KEY AUTOINCREMENT,
            survey_id INTEGER,
            question_id INTEGER,
            strongly_disagree INTEGER,
            disagree INTEGER,
            neutral INTEGER,
            agree INTEGER,
            strongly_agree INTEGER,
            unable_to_judge INTEGER,
            percent_agree REAL,
            FOREIGN KEY (survey_id) REFERENCES unit_survey(survey_id),
            FOREIGN KEY (question_id) REFERENCES question(question_id)
        );
        
        -- Benchmark table
        CREATE TABLE IF NOT EXISTS benchmark (
            benchmark_id INTEGER PRIMARY KEY AUTOINCREMENT,
            survey_id INTEGER,
            question_id INTEGER,
            group_type TEXT,
            percent_agree REAL,
            total_n INTEGER,
            FOREIGN KEY (survey_id) REFERENCES unit_survey(survey_id),
            FOREIGN KEY (question_id) REFERENCES question(question_id)
        );
        
        -- Comments table
        CREATE TABLE IF NOT EXISTS comment (
            comment_id INTEGER PRIMARY KEY AUTOINCREMENT,
            survey_id INTEGER,
            comment_text TEXT,
            sentiment_score REAL,
            FOREIGN KEY (survey_id) REFERENCES unit_survey(survey_id)
        );
        """)
        
        # Populate the standard questions
        self._populate_standard_questions()
        
        self.conn.commit()
    
    def _populate_standard_questions(self):
        """Populate the standard survey questions."""
        questions = [
            "I was engaged by the learning activities.",
            "The resources provided helped me to learn.",
            "My learning was supported.",
            "Assessments helped me to demonstrate my learning.",
            "I knew what was expected of me.",
            "Overall, this unit was a worthwhile experience."
        ]
        
        # Check if questions already exist
        self.cursor.execute("SELECT COUNT(*) FROM question")
        count = self.cursor.fetchone()[0]
        
        if count == 0:
            for q in questions:
                self.cursor.execute(
                    "INSERT INTO question (question_text) VALUES (?)", 
                    (q,)
                )
            self.conn.commit()
    
    def export_to_csv(self, output_dir: str):
        """
        Export all database tables to CSV files.
        
        Args:
            output_dir: Directory to save CSV files
        """
        # Create output directory if it doesn't exist
        os.makedirs(output_dir, exist_ok=True)
        
        # Get all table names
        self.cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tables = [row[0] for row in self.cursor.fetchall()]
        
        # Export each table to CSV
        for table in tables:
            df = pd.read_sql_query(f"SELECT * FROM {table}", self.conn)
            output_path = os.path.join(output_dir, f"{table}.csv")
            df.to_csv(output_path, index=False)
    
    def close(self):
        """Close the database connection."""
        if self.conn:
            self.conn.close()
    
    def __del__(self):
        """Ensure connection is closed when object is deleted."""
        self.close()
    
    def execute(self, query: str, params: tuple = ()):
        """
        Execute a SQL query.
        
        Args:
            query: SQL query to execute
            params: Parameters for the query
            
        Returns:
            Cursor object
        """
        return self.cursor.execute(query, params)
    
    def commit(self):
        """Commit changes to the database."""
        self.conn.commit()