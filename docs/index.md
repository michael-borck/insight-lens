# SurveySavvy Documentation

SurveySavvy is a Python application that generates a realistic SQLite database of student unit surveys. The database models realistic sentiment patterns, correlations between numerical responses and comments, and includes appropriate variance across different disciplines and academic levels.

## Overview

SurveySavvy creates a comprehensive database of university unit surveys with:

- Multiple disciplines and unit levels
- Realistic sentiment patterns over time
- Correlated response distributions and comments
- Automatic CSV export functionality

## Installation

Use pip or uv to install SurveySavvy:

```bash
# Using pip
pip install -e .

# Using uv
uv install -e .
```

For development, install with dev dependencies:

```bash
# Using pip
pip install -e ".[dev]"

# Using uv
uv install -e ".[dev]"
```

## Quick Start

Generate a database with default settings:

```bash
surveysavvy generate
```

This will create a database named `unit_survey.db` with 30 units and 5 years of survey data.

Export the database to CSV files:

```bash
surveysavvy export
```

This will create CSV files in the `exports` directory.

## Using the API

You can also use SurveySavvy as a Python module:

```python
from surveysavvy.core import Database, SurveyGenerator

# Create and initialize database
db = Database("my_surveys.db")
db.create_schema()

# Generate survey data
generator = SurveyGenerator(db)
generator.populate_units(unit_count=20)
generator.generate_surveys(start_year=2018, end_year=2024)

# Export data
db.export_to_csv("my_exports")
```

## Using the LLM Comment Generation

SurveySavvy can use the Anthropic API to generate realistic student comments. To use this feature, you need to provide an API key:

```bash
# Set the environment variable
export ANTHROPIC_API_KEY=your-api-key

# Or provide it as a command-line argument
surveysavvy generate --api-key your-api-key
```

If no API key is provided, comments will be generated using templates.

## License

MIT