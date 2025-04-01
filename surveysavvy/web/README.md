# SurveySavvy Web Dashboard

This module provides a web-based dashboard for visualizing and exploring data from the SurveySavvy application.

## Features

- Overview dashboard with summary charts
- Unit-specific detailed analysis
- Benchmark comparison
- Historical trend visualization
- Responsive design

## Usage

### Using the CLI

The dashboard can be launched using the SurveySavvy CLI:

```bash
# Launch with default settings (localhost:5000)
surveysavvy dashboard

# Specify database path and port
surveysavvy dashboard --db-path my_database.db --port 8080 --host 0.0.0.0
```

### Programmatic Usage

You can also integrate the dashboard into your own application:

```python
from surveysavvy.web.dashboard import create_app, run_dashboard

# Create and configure the app
app = create_app(db_path="my_database.db")

# Run the dashboard
run_dashboard(db_path="my_database.db", host="127.0.0.1", port=5000)
```

## Dependencies

The web dashboard requires the following additional dependencies:

- FastHTML - For web framework components
- Plotly - For interactive charts
- Pandas - For data manipulation

Install them with:

```bash
pip install fasthtml plotly pandas
```

## Dashboard Pages

1. **Main Dashboard** - Overview of all survey data
   - Top units by overall experience
   - Top units by response rate
   - Recent survey table

2. **Unit Detail** - Detailed view of a specific unit
   - Historical trends
   - Benchmark comparisons
   - Survey history table

## Development

### Adding New Charts

To add a new chart, update the appropriate route handler:

1. Add the data query to the API endpoint
2. Add the chart container to the HTML structure
3. Add the JavaScript rendering code

### Data Structure

The dashboard uses the standard SurveySavvy database schema:

- `unit_survey` - Survey responses
- `unit_offering` - Course offerings
- `unit` - Course information
- `benchmark` - Benchmark data for comparisons
- `question` - Standard survey questions