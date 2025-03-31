# Installation

## Requirements

SurveySavvy requires Python 3.9 or higher. It has been tested on Linux, macOS, and Windows.

## Installation Methods

### Using pip

You can install SurveySavvy using pip:

```bash
pip install -e .
```

### Using uv

[uv](https://github.com/astral-sh/uv) is a fast Python package installer. You can install SurveySavvy using uv:

```bash
uv install -e .
```

## Development Installation

For development, you'll want to install the development dependencies as well:

```bash
# Using pip
pip install -e ".[dev]"

# Using uv
uv install -e ".[dev]"
```

This will install additional packages like pytest, ruff, and mkdocs for testing, linting, and documentation.

## Anthropic API Key (Optional)

For LLM-based comment generation, you'll need an Anthropic API key. You can get one from [Anthropic's website](https://www.anthropic.com/).

Set the API key as an environment variable:

```bash
# Linux/macOS
export ANTHROPIC_API_KEY=your-api-key

# Windows (Command Prompt)
set ANTHROPIC_API_KEY=your-api-key

# Windows (PowerShell)
$env:ANTHROPIC_API_KEY = "your-api-key"
```

## Verifying Installation

You can verify that SurveySavvy is installed correctly by running:

```bash
surveysavvy --help
```

You should see the help message for the SurveySavvy command-line interface.