"""
Dashboard application for SurveySavvy.

This module provides a web-based dashboard for visualizing and exploring survey data.
Server-side rendered with FastHTML and minimal JavaScript.
"""

try:
    from fasthtml.common import *
except ImportError:
    print("Error: FastHTML package not found.")
    print("Please install it with: pip install python-fasthtml")
    import sys
    sys.exit(1)

import sqlite3
import pandas as pd
import numpy as np
import io
import base64
import matplotlib
matplotlib.use('Agg')  # Use non-interactive backend
import matplotlib.pyplot as plt
from pathlib import Path
from fastlite import database

def create_app(db_path="unit_survey.db"):
    """Create the dashboard application with server-side rendering.
    
    Args:
        db_path: Path to the SQLite database file
        
    Returns:
        FastHTML application
    """
    # Create FastHTML app
    app, rt = fast_app(title="SurveySavvy Dashboard")
    
    # Connect to database using fastlite (which is part of FastHTML ecosystem)
    db = database(db_path)
    
    # Helper function to generate HTML table
    def generate_table(df, caption=None):
        """Generate HTML table from dataframe"""
        rows = []
        
        # Generate header row
        header = Tr(*[Th(col) for col in df.columns])
        rows.append(header)
        
        # Generate data rows
        for _, row in df.iterrows():
            cells = [Td(str(val)) for val in row]
            rows.append(Tr(*cells))
        
        # Create the table with optional caption
        if caption:
            return Table(Caption(caption), *rows)
        else:
            return Table(*rows)
    
    # Helper function to generate a chart image as base64 encoded string
    def create_chart(data, chart_type='bar', title=None, xlabel=None, ylabel=None, figsize=(8, 4)):
        """Create a chart and return as base64 encoded string"""
        plt.figure(figsize=figsize)
        
        if chart_type == 'bar':
            plt.bar(data['x'], data['y'])
        elif chart_type == 'line':
            plt.plot(data['x'], data['y'], marker='o')
        
        if title:
            plt.title(title)
        if xlabel:
            plt.xlabel(xlabel)
        if ylabel:
            plt.ylabel(ylabel)
        
        plt.tight_layout()
        plt.grid(True, linestyle='--', alpha=0.6)
        
        # Save to buffer and convert to base64
        buffer = io.BytesIO()
        plt.savefig(buffer, format='png')
        plt.close()
        
        # Convert to base64 string
        img_str = base64.b64encode(buffer.getvalue()).decode('utf-8')
        
        return f"data:image/png;base64,{img_str}"
    
    # Helper function to create a multi-series chart
    def create_multi_chart(series_list, chart_type='bar', title=None, xlabel=None, ylabel=None, 
                          figsize=(10, 5), barmode='group'):
        """Create a chart with multiple series and return as base64 encoded string"""
        plt.figure(figsize=figsize)
        
        if chart_type == 'bar':
            # Calculate the width of the bars
            n_bars = len(series_list)
            bar_width = 0.8 / n_bars
            
            # Plot each series
            for i, series in enumerate(series_list):
                x_pos = np.arange(len(series['x']))
                offset = (i - n_bars/2 + 0.5) * bar_width
                plt.bar([p + offset for p in x_pos], series['y'], 
                        width=bar_width, label=series['name'])
                
            plt.xticks(np.arange(len(series_list[0]['x'])), series_list[0]['x'], rotation=45, ha='right')
            
        elif chart_type == 'line':
            for series in series_list:
                plt.plot(series['x'], series['y'], marker='o', label=series['name'])
        
        if title:
            plt.title(title)
        if xlabel:
            plt.xlabel(xlabel)
        if ylabel:
            plt.ylabel(ylabel)
        
        plt.legend()
        plt.tight_layout()
        plt.grid(True, linestyle='--', alpha=0.6)
        
        # Save to buffer and convert to base64
        buffer = io.BytesIO()
        plt.savefig(buffer, format='png')
        plt.close()
        
        # Convert to base64 string
        img_str = base64.b64encode(buffer.getvalue()).decode('utf-8')
        
        return f"data:image/png;base64,{img_str}"
    
    # Main dashboard route (server-side rendered)
    @rt("/")
    def get():
        # Run SQL queries directly using pandas
        conn = sqlite3.connect(db_path)

        # Overall experience by unit
        overall_df = pd.read_sql_query("""
            SELECT u.unit_code, AVG(us.overall_experience) as avg_experience 
            FROM unit_survey us
            JOIN unit_offering uo ON us.unit_offering_id = uo.unit_offering_id
            JOIN unit u ON uo.unit_code = u.unit_code
            GROUP BY u.unit_code
            ORDER BY avg_experience DESC
            LIMIT 10
        """, conn)
        
        # Response rates by unit
        response_df = pd.read_sql_query("""
            SELECT u.unit_code, AVG(us.response_rate) as avg_response_rate
            FROM unit_survey us
            JOIN unit_offering uo ON us.unit_offering_id = uo.unit_offering_id
            JOIN unit u ON uo.unit_code = u.unit_code
            GROUP BY u.unit_code
            ORDER BY avg_response_rate DESC
            LIMIT 10
        """, conn)
        
        # Recent surveys
        recent_df = pd.read_sql_query("""
            SELECT u.unit_code, uo.semester, uo.year, us.responses, us.overall_experience
            FROM unit_survey us
            JOIN unit_offering uo ON us.unit_offering_id = uo.unit_offering_id
            JOIN unit u ON uo.unit_code = u.unit_code
            ORDER BY uo.year DESC, uo.semester DESC
            LIMIT 10
        """, conn)
        
        conn.close()
        
        # Format recent surveys table for better display
        recent_df['overall_experience'] = recent_df['overall_experience'].round(1).astype(str) + '%'
        
        # Prepare chart data
        overall_chart_data = {
            'x': overall_df['unit_code'].tolist(),
            'y': overall_df['avg_experience'].tolist()
        }
        
        response_chart_data = {
            'x': response_df['unit_code'].tolist(),
            'y': response_df['avg_response_rate'].tolist()
        }
        
        # Generate chart images
        overall_chart_img = create_chart(
            overall_chart_data, 
            title='Overall Experience by Unit',
            xlabel='Unit Code',
            ylabel='Average Experience (%)'
        )
        
        response_chart_img = create_chart(
            response_chart_data,
            title='Response Rates by Unit',
            xlabel='Unit Code',
            ylabel='Average Response Rate'
        )
        
        # Create tables
        recent_table = generate_table(
            recent_df, 
            caption="Recent Surveys"
        )
        
        # Add links to unit detail pages
        linked_units = []
        for i, row in recent_df.iterrows():
            unit_code = row['unit_code']
            linked_units.append(Li(A(unit_code, href=f"/units/{unit_code}")))
        
        # Return complete dashboard
        return Titled("SurveySavvy Dashboard", 
            Div(
                P("Dashboard showing survey data"),
                
                H2("Unit Quick Links"),
                Ul(*linked_units, cls="unit-links"),
                
                Grid(
                    Card(
                        H2("Overall Experience"), 
                        Img(src=overall_chart_img, alt="Overall Experience by Unit")
                    ),
                    Card(
                        H2("Response Rates"), 
                        Img(src=response_chart_img, alt="Response Rates by Unit")
                    ),
                ),
                
                H2("Recent Surveys"),
                recent_table
            ),
            hdrs=(
                Style("""
                .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
                table { width: 100%; margin-top: 1rem; border-collapse: collapse; }
                th, td { padding: 0.5rem; text-align: left; border-bottom: 1px solid #ddd; }
                th { background-color: #f8f9fa; }
                img { max-width: 100%; height: auto; }
                .unit-links { columns: 3; }
                caption { font-weight: bold; margin-bottom: 0.5rem; }
                """)
            )
        )
    
    # Unit detail route (server-side rendered)
    @rt("/units/{unit_code}")
    def get(unit_code: str):
        conn = sqlite3.connect(db_path)
        
        # Get unit info
        unit_df = pd.read_sql_query("""
            SELECT u.unit_code, u.unit_name, d.discipline_name
            FROM unit u
            JOIN discipline d ON u.discipline_code = d.discipline_code
            WHERE u.unit_code = ?
        """, (unit_code,), conn)
        
        if unit_df.empty:
            return Titled("Unit Not Found", P(f"Unit {unit_code} not found"))
        
        unit_info = unit_df.iloc[0]
        
        # Get survey results for this unit
        surveys_df = pd.read_sql_query("""
            SELECT uo.semester, uo.year, uo.location, us.enrolments, us.responses, us.response_rate, us.overall_experience
            FROM unit_survey us
            JOIN unit_offering uo ON us.unit_offering_id = uo.unit_offering_id
            WHERE uo.unit_code = ?
            ORDER BY uo.year DESC, uo.semester DESC
        """, (unit_code,), conn)
        
        # Get benchmarks for this unit
        benchmarks_df = pd.read_sql_query("""
            SELECT q.question_text, b.percent_agree, b.group_type
            FROM benchmark b
            JOIN survey_event se ON b.event_id = se.event_id
            JOIN question q ON b.question_id = q.question_id
            JOIN unit_survey us ON us.event_id = se.event_id
            JOIN unit_offering uo ON us.unit_offering_id = uo.unit_offering_id
            WHERE uo.unit_code = ?
            GROUP BY q.question_text, b.group_type
        """, (unit_code,), conn)
        
        conn.close()
        
        # Format data for display
        surveys_display = surveys_df.copy()
        surveys_display['response_rate'] = surveys_display['response_rate'].round(2).astype(str) + '%'
        surveys_display['overall_experience'] = surveys_display['overall_experience'].round(1).astype(str) + '%'
        
        # Prepare chart data
        if not surveys_df.empty:
            labels = [f"{row['semester']}/{row['year']}" for _, row in surveys_df.iterrows()]
            
            experience_data = {
                'x': labels,
                'y': surveys_df['overall_experience'].tolist()
            }
            
            response_data = {
                'x': labels,
                'y': surveys_df['response_rate'].tolist()
            }
            
            # Generate chart images
            experience_chart_img = create_chart(
                experience_data,
                chart_type='line',
                title='Overall Experience Over Time',
                xlabel='Semester/Year',
                ylabel='Experience (%)'
            )
            
            response_chart_img = create_chart(
                response_data,
                chart_type='line',
                title='Response Rates Over Time',
                xlabel='Semester/Year',
                ylabel='Response Rate'
            )
        else:
            experience_chart_img = None
            response_chart_img = None
        
        # Benchmarks chart (if available)
        if not benchmarks_df.empty:
            # Group by question and group_type
            questions = benchmarks_df['question_text'].unique()
            group_types = benchmarks_df['group_type'].unique()
            
            # Prepare data for multi-series chart
            benchmark_series = []
            for group in group_types:
                group_data = benchmarks_df[benchmarks_df['group_type'] == group]
                series = {
                    'name': group,
                    'x': group_data['question_text'].tolist(),
                    'y': group_data['percent_agree'].tolist()
                }
                benchmark_series.append(series)
            
            # Create benchmarks chart
            benchmarks_chart_img = create_multi_chart(
                benchmark_series,
                chart_type='bar',
                title='Benchmark Comparison',
                xlabel='Questions',
                ylabel='Percent Agree',
                figsize=(12, 6)
            )
        else:
            benchmarks_chart_img = None
        
        # Create survey history table
        surveys_table = generate_table(surveys_display, caption="Survey History")
        
        # Return complete unit detail page
        return Titled(f"{unit_code} - {unit_info['unit_name']}", 
            Div(
                Div(
                    H1(f"{unit_code} - {unit_info['unit_name']}"),
                    P(f"Discipline: {unit_info['discipline_name']}"),
                    P(A("Back to Dashboard", href="/")),
                ),
                
                Grid(
                    Card(
                        H2("Overall Experience Over Time"), 
                        Div(
                            Img(src=experience_chart_img, alt="Overall Experience Over Time") if experience_chart_img else 
                            P("No experience data available")
                        )
                    ),
                    Card(
                        H2("Response Rates Over Time"), 
                        Div(
                            Img(src=response_chart_img, alt="Response Rates Over Time") if response_chart_img else 
                            P("No response rate data available")
                        )
                    ),
                ),
                
                H2("Survey History"),
                surveys_table if not surveys_df.empty else P("No survey history available"),
                
                H2("Benchmarks"),
                Div(
                    Img(src=benchmarks_chart_img, alt="Benchmark Comparison") if benchmarks_chart_img else 
                    P("No benchmark data available")
                ),
            ),
            hdrs=(
                Style("""
                .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
                table { width: 100%; margin-top: 1rem; border-collapse: collapse; }
                th, td { padding: 0.5rem; text-align: left; border-bottom: 1px solid #ddd; }
                th { background-color: #f8f9fa; }
                img { max-width: 100%; height: auto; }
                caption { font-weight: bold; margin-bottom: 0.5rem; }
                """)
            )
        )
    
    return app

def run_dashboard(db_path="unit_survey.db", host="127.0.0.1", port=5000):
    """Run the dashboard application."""
    app = create_app(db_path)
    
    # Use uvicorn directly instead of serve() to avoid loading issues
    import uvicorn
    print(f"🌐 SurveySavvy Dashboard")
    print(f"📊 Database: {db_path}")
    print(f"🔗 URL: http://{host}:{port}")
    print(f"⚙️  Press CTRL+C to exit")
    uvicorn.run(app, host=host, port=port)