# Student Unit Survey Database Generator Specification

## 1. Overview
This specification outlines the development of a Python application that generates a realistic SQLite database of student unit surveys spanning 5-7 years. The database will model realistic sentiment patterns, correlations between numerical responses and comments, and will include appropriate variance across different disciplines and academic levels.

## 2. Database Schema

### Tables
- **Units**: `(unit_code, unit_title)`
- **UnitsSemesterMap**: `(unit_code, semester, year)`
- **SurveyEvents**: `(survey_event_id, unit_code, month, year, response_rate, responses)`
- **Responses**: `(response_id, survey_event_id, question_id, strongly_agree, agree, neutral, disagree, strongly_disagree, unable_to_judge)`
- **Comments**: `(comment_id, survey_event_id, comment_text)`
- **Questions**: Pre-populated with the six standard survey questions

### Questions (Pre-populated)
1. "I was engaged by the learning activities."
2. "The resources provided helped me to learn."
3. "My learning was supported."
4. "Assessments helped me to demonstrate my learning."
5. "I knew what was expected of me."
6. "Overall, this unit was a worthwhile experience."

## 3. Data Parameters

### Unit Codes
- Units will use the provided codes following the pattern of 2-4 letters representing discipline followed by 3 digits
- Units cover years 1-3 (undergraduate) and 5-6 (postgraduate)

### Time Period
- Data will span 5-7 years
- 2 semesters per year
- Survey events will occur toward the end of each semester (typically months 5-6 for Semester 1 and 11-12 for Semester 2)

### Response Statistics
- Response rate average: 20% (with realistic variation between 15-35%)
- Each survey will have 5-10 comments
- Response distributions will correlate with the sentiment of comments

## 4. Sentiment Distribution

### Overall Distribution
- Most courses will have balanced to slightly positive sentiment (70% of courses)
- Occasional outlier semesters will have strongly negative sentiment (10% of courses)
- Some courses will have strongly positive sentiment (20% of courses)

### Realistic Patterns
- Sentiment will show plausible variation over time
- Introductory units may show slightly lower satisfaction due to adjustment challenges
- Advanced courses may show bimodal distribution (either very positive or very negative)
- Units will occasionally show improvement or decline in sentiment over time

## 5. Technical Components

### Core Functions
1. **Database Creation**: Function to create the SQLite database with the defined schema
2. **Unit Initialization**: Function to populate the Units table with the provided units
3. **Semester Mapping**: Function to map units to semesters across the time period
4. **Sentiment Generator**: Function to determine sentiment distribution for each unit/semester
5. **Response Generator**: Function to create realistic response distributions based on sentiment
6. **Comment Generator**: Function to generate realistic student comments using an LLM API

### LLM Integration
- Direct API calls to an LLM (Claude/Anthropic) will be implemented
- The API will generate 5-10 comments per survey event based on:
  - Unit code and title
  - Overall sentiment assigned to that survey event
  - Year and semester context
  - Question responses (to ensure alignment)

### Output
- SQLite database (.db file)
- CSV export of all tables for easy analysis

## 6. Implementation Approach

### Database Creation and Population
```python
def create_database(db_name):
    """Create SQLite database with the required schema"""
    # Implementation details...

def populate_units(conn, units_data):
    """Populate the Units table with predefined unit data"""
    # Implementation details...

def map_units_to_semesters(conn, start_year, end_year):
    """Create semester mappings for all units across years"""
    # Implementation details...
```

### Sentiment and Response Generation
```python
def determine_sentiment(conn, unit_code, semester, year):
    """Determine sentiment distribution for a unit/semester"""
    # Implementation details...

def generate_survey_event(conn, unit_code, semester, year):
    """Create a survey event with appropriate response rate"""
    # Implementation details...

def generate_responses(conn, survey_event_id, sentiment):
    """Generate response distributions based on sentiment"""
    # Implementation details...
```

### Comment Generation with LLM
```python
def generate_comments(conn, survey_event_id, sentiment, unit_code, unit_title, semester, year):
    """Generate realistic comments using LLM API"""
    # API integration with prompt engineering
    # Implementation details...
```

### Data Export
```python
def export_to_csv(conn, output_dir):
    """Export all database tables to CSV files"""
    # Implementation details...
```

## 7. Validation and Quality Control
- Verification of sentiment-response correlation
- Checking for realistic variance and outliers
- Validation of comment sentiment against numerical responses
- Database integrity checks