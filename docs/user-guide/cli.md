# Command Line Interface

SurveySavvy provides a command-line interface (CLI) built with [Typer](https://typer.tiangolo.com/) for easy interaction.

## Commands

### Generate

The `generate` command creates a new survey database with synthetic data.

```bash
surveysavvy generate [OPTIONS]
```

#### Options

- `--output-path`, `-o`: Path to the output database file. Default: `unit_survey.db`
- `--years`, `-y`: Number of years to generate data for (5-7 recommended). Default: `5`
- `--unit-count`, `-u`: Number of units to generate. Default: `30`
- `--start-year`, `-s`: Starting year for data generation. Default: Current year minus `years`
- `--seed`: Random seed for reproducibility. Default: `42`
- `--api-key`: Anthropic API key for generating comments (optional).
- `--force`, `-f`: Overwrite existing database if it exists.

#### Examples

Generate a database with default settings:

```bash
surveysavvy generate
```

Generate a database with custom settings:

```bash
surveysavvy generate --years 7 --unit-count 50 --output-path "my_surveys.db"
```

### Export

The `export` command exports the database tables to CSV files.

```bash
surveysavvy export [OPTIONS]
```

#### Options

- `--db-path`, `-d`: Path to the database file. Default: `unit_survey.db`
- `--output-dir`, `-o`: Directory to output CSV files. Default: `exports`
- `--force`, `-f`: Overwrite existing files if they exist.

#### Examples

Export a database to CSV files:

```bash
surveysavvy export
```

Export a custom database to a custom directory:

```bash
surveysavvy export --db-path "my_surveys.db" --output-dir "my_exports"
```

## Global Options

- `--help`: Show the help message and exit.

## Examples

### Complete Workflow

```bash
# Generate a database with 40 units over 6 years starting from 2018
surveysavvy generate --years 6 --start-year 2018 --unit-count 40 --output-path "surveys.db"

# Export the database to CSV files
surveysavvy export --db-path "surveys.db" --output-dir "csv_exports"
```

### Using Anthropic API

```bash
# Set API key as environment variable
export ANTHROPIC_API_KEY=your-api-key

# Generate database with LLM-generated comments
surveysavvy generate
```

Or provide the API key directly:

```bash
surveysavvy generate --api-key your-api-key
```