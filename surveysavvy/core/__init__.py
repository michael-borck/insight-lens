"""Core functionality for SurveySavvy."""

from .database import Database
from .generator import (
    UnitGenerator,
    SentimentGenerator,
    CommentGenerator,
    SurveyGenerator
)

# Import PDF processing functionality
try:
    from .pdf_import import (
        process_pdf,
        process_folder,
        extract_info_from_pdf,
        extract_benchmarks,
        extract_comments,
        extract_survey_data,
        estimate_sentiment
    )
    __pdf_import_available = True
except ImportError:
    # PyMuPDF might not be installed
    __pdf_import_available = False

__all__ = [
    "Database",
    "UnitGenerator",
    "SentimentGenerator",
    "CommentGenerator",
    "SurveyGenerator",
]

# Add PDF import functions if available
if __pdf_import_available:
    __all__.extend([
        "process_pdf",
        "process_folder",
        "extract_info_from_pdf",
        "extract_benchmarks",
        "extract_comments",
        "extract_survey_data",
        "estimate_sentiment"
    ])
