"""
Tests for the web dashboard.
"""

import pytest
import sys
import sqlite3
from pathlib import Path

# Skip tests if optional dependencies not installed
try:
    from surveysavvy.web.dashboard import create_app
    from fasthtml.core import Client
    DASHBOARD_AVAILABLE = True
except ImportError:
    DASHBOARD_AVAILABLE = False

# Create a test database
@pytest.fixture
def test_db_path(tmp_path):
    """Create a test database with minimal schema."""
    db_path = tmp_path / "test.db"
    conn = sqlite3.connect(db_path)
    
    # Create minimal schema for testing
    conn.executescript("""
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
        FOREIGN KEY (unit_code) REFERENCES unit(unit_code)
    );
    
    CREATE TABLE survey_event (
        event_id INTEGER PRIMARY KEY AUTOINCREMENT,
        month INTEGER,
        year INTEGER,
        description TEXT
    );
    
    CREATE TABLE question (
        question_id INTEGER PRIMARY KEY AUTOINCREMENT,
        question_text TEXT
    );
    
    CREATE TABLE unit_survey (
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
    
    CREATE TABLE benchmark (
        benchmark_id INTEGER PRIMARY KEY AUTOINCREMENT,
        event_id INTEGER,
        question_id INTEGER,
        group_type TEXT,
        group_name TEXT,
        percent_agree REAL,
        total_n INTEGER,
        FOREIGN KEY (event_id) REFERENCES survey_event(event_id),
        FOREIGN KEY (question_id) REFERENCES question(question_id)
    );
    """)
    
    # Insert test data
    conn.execute("INSERT INTO discipline VALUES ('ISYS', 'Information Systems')")
    conn.execute("INSERT INTO unit VALUES ('ISYS1000', 'Introduction to Information Systems', 'ISYS')")
    conn.execute("INSERT INTO unit_offering VALUES (1, 'ISYS1000', 1, 2023, 'Campus A', 'Internal')")
    conn.execute("INSERT INTO survey_event VALUES (1, 5, 2023, 'Semester 1 2023 Survey')")
    conn.execute("INSERT INTO question VALUES (1, 'Overall, this unit was a worthwhile experience.')")
    conn.execute("INSERT INTO unit_survey VALUES (1, 1, 1, 100, 50, 50.0, 80.0)")
    conn.execute("INSERT INTO benchmark VALUES (1, 1, 1, 'University', 'University', 75.0, 5000)")
    
    conn.commit()
    conn.close()
    
    return db_path

@pytest.mark.skipif(not DASHBOARD_AVAILABLE, reason="Dashboard dependencies not installed")
def test_dashboard_create_app(test_db_path):
    """Test that the dashboard app can be created."""
    app = create_app(db_path=test_db_path)
    assert app is not None

@pytest.mark.skipif(not DASHBOARD_AVAILABLE, reason="Dashboard dependencies not installed")
def test_dashboard_main_route(test_db_path):
    """Test the main dashboard route."""
    app = create_app(db_path=test_db_path)
    client = Client(app)
    response = client.get("/")
    
    # Check that response is successful
    assert response.status_code == 200
    
    # Check that the response contains expected content
    assert "SurveySavvy Dashboard" in response.text
    assert "Overall Experience" in response.text
    assert "Response Rates" in response.text

@pytest.mark.skipif(not DASHBOARD_AVAILABLE, reason="Dashboard dependencies not installed")
def test_dashboard_api_data(test_db_path):
    """Test the API data endpoint."""
    app = create_app(db_path=test_db_path)
    client = Client(app)
    response = client.get("/api/data")
    
    # Check that response is successful
    assert response.status_code == 200
    
    # Parse JSON response
    data = response.json()
    
    # Check data structure
    assert "overall" in data
    assert "response_rates" in data
    assert "recent_surveys" in data
    
    # Check that data contains our test unit
    assert "ISYS1000" in data["overall"]["unit_codes"]