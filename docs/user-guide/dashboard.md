# Web Dashboard

SurveySavvy includes a web-based dashboard for visualizing and analyzing survey data. The dashboard provides an intuitive interface for exploring trends, comparing units, and examining benchmark data.

## Launching the Dashboard

You can launch the dashboard using the SurveySavvy CLI:

```bash
# Launch with default settings
surveysavvy dashboard

# Specify a custom database and port
surveysavvy dashboard --db-path my_database.db --port 8080 --host 0.0.0.0
```

## Requirements

The dashboard requires additional dependencies which can be installed using:

```bash
# Install with the web extra
pip install "surveysavvy[web]"

# Or install dependencies manually
pip install fasthtml plotly pandas
```

## Dashboard Features

### Main Dashboard

The main dashboard provides an overview of all survey data:

![Dashboard Overview](../images/dashboard-overview.png)

- **Top Units by Overall Experience**: Bar chart showing units with the highest overall experience scores
- **Top Units by Response Rate**: Bar chart showing units with the highest response rates
- **Recent Surveys Table**: Tabular data of the most recent survey results

### Unit Detail View

Click on a unit to see detailed information:

![Unit Detail](../images/unit-detail.png)

- **Historical Trends**: Line charts showing overall experience and response rates over time
- **Benchmark Comparison**: Bar chart comparing unit performance against university, faculty, and school benchmarks
- **Survey History**: Detailed table of all surveys for the unit

## Using the Dashboard for Analysis

The dashboard is designed to support several analytical workflows:

1. **Identifying Top Performing Units**: The main dashboard highlights units with the highest overall experience scores.

2. **Tracking Response Rate Issues**: Units with low response rates can be identified and targeted for improvement.

3. **Comparing Against Benchmarks**: The unit detail view allows comparison against various benchmark levels.

4. **Historical Trend Analysis**: Track how a unit's performance has changed over time to identify patterns or issues.

5. **Semester-to-Semester Comparison**: Compare survey results across different semesters to identify seasonal patterns.

## Programmatic Usage

You can also embed the dashboard in your own applications:

```python
from surveysavvy.web.dashboard import create_app, run_dashboard

# Create and configure the app
app = create_app(db_path="my_database.db")

# Run the dashboard
run_dashboard(db_path="my_database.db", host="127.0.0.1", port=5000)
```