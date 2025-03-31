"""Tests for the database module."""

import os
import sqlite3
import pytest
from surveysavvy.core import Database


@pytest.fixture
def test_db_path():
    """Provide a temporary database path."""
    path = "test_unit_survey.db"
    yield path
    # Cleanup after tests
    if os.path.exists(path):
        os.remove(path)


def test_database_creation(test_db_path):
    """Test that database is created successfully."""
    db = Database(test_db_path)
    db.create_schema()
    db.close()
    
    # Verify the database exists
    assert os.path.exists(test_db_path)
    
    # Verify tables were created
    conn = sqlite3.connect(test_db_path)
    cursor = conn.cursor()
    
    # Get all tables
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
    tables = [row[0] for row in cursor.fetchall()]
    
    # Check expected tables
    expected_tables = [
        "discipline", "unit", "unit_offering", "survey_event",
        "question", "unit_survey", "unit_survey_result", 
        "benchmark", "comment"
    ]
    
    for table in expected_tables:
        assert table in tables
    
    # Verify question data was populated
    cursor.execute("SELECT COUNT(*) FROM question")
    question_count = cursor.fetchone()[0]
    assert question_count == 6  # Six standard questions
    
    conn.close()


def test_execute_and_commit(test_db_path):
    """Test that database execute and commit work correctly."""
    db = Database(test_db_path)
    db.create_schema()
    
    # Insert test data
    db.execute(
        "INSERT INTO discipline (discipline_code, discipline_name) VALUES (?, ?)",
        ("TEST", "Test Discipline")
    )
    db.commit()
    
    # Verify data was inserted
    result = db.execute("SELECT discipline_name FROM discipline WHERE discipline_code = ?", ("TEST",))
    discipline_name = result.fetchone()[0]
    assert discipline_name == "Test Discipline"
    
    db.close()