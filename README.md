# SurveySavvy

A Python application that generates a realistic SQLite database of student unit surveys spanning multiple years. It models realistic sentiment patterns, correlations between numerical responses and comments, and includes appropriate variance across different disciplines and academic levels.

## Features

- Creates a SQLite database with a comprehensive schema for unit surveys
- Generates realistic survey response distributions based on sentiment patterns
- Produces correlated comment text using LLM integration
- Includes realistic patterns over time and across different unit types
- Exports to CSV for easy analysis

## Installation

Use uv or pip to install:

```bash
# Using uv
uv install -e .

# Using pip
pip install -e .
```

For development, install with dev dependencies:

```bash
# Using uv
uv install -e ".[dev]"

# Using pip
pip install -e ".[dev]"
```

## Usage

### Command Line Interface

```bash
# Generate a database with default settings
surveysavvy generate

# Generate with custom settings
surveysavvy generate --years 7 --unit-count 50 --output-path "surveys.db"

# Export to CSV
surveysavvy export --db-path "surveys.db" --output-dir "exports"

# Show help
surveysavvy --help
```

### As a Python Module

```python
from surveysavvy.core import Database, SurveyGenerator

# Create and configure database
db = Database("surveys.db")
db.create_schema()

# Generate survey data
generator = SurveyGenerator(db)
generator.populate_units(unit_count=30)
generator.generate_surveys(years=5)

# Export data
db.export_to_csv("exports")
```

## Documentation

For more details, see the [documentation](https://your-docs-site.com).

## License

MIT