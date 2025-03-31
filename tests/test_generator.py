"""Tests for the generator module."""

import pytest
from surveysavvy.core import UnitGenerator, SentimentGenerator


def test_unit_generator_init():
    """Test UnitGenerator initialization."""
    generator = UnitGenerator(faker_seed=42)
    assert generator is not None
    assert hasattr(generator, 'fake')


def test_generate_unit_code():
    """Test unit code generation."""
    generator = UnitGenerator(faker_seed=42)
    code = generator.generate_unit_code("ISYS", 2)
    
    # Check format: discipline code (4 chars) + level (1 digit) + unit number (2 digits)
    assert len(code) == 7
    assert code.startswith("ISYS2")
    assert code[4:5].isdigit()
    assert code[5:7].isdigit()


def test_generate_unit_name():
    """Test unit name generation."""
    generator = UnitGenerator(faker_seed=42)
    
    # Test with a discipline that has templates
    name_isys = generator.generate_unit_name("ISYS", 2)
    assert "Information Systems" in name_isys or any(
        template.format(discipline="Information Systems") in name_isys 
        for template in generator.UNIT_TEMPLATES.get("ISYS", [])
    )
    
    # Test with a discipline using default templates
    name_hist = generator.generate_unit_name("HIST", 3)
    assert "History" in name_hist


def test_generate_units():
    """Test generating multiple units."""
    generator = UnitGenerator(faker_seed=42)
    units = generator.generate_units(count=5)
    
    assert len(units) == 5
    for unit in units:
        assert "unit_code" in unit
        assert "unit_name" in unit
        assert "discipline_code" in unit
        assert unit["discipline_code"] in generator.DISCIPLINES


def test_sentiment_generator():
    """Test sentiment generation."""
    generator = SentimentGenerator(random_seed=42)
    
    # Test sentiment generation without history
    sentiment = generator.generate_sentiment("ISYS1001", 2023, 1)
    assert sentiment in ["very_positive", "positive", "neutral", "negative", "very_negative"]
    
    # Test with history
    history = ["positive", "positive"]
    sentiment_with_history = generator.generate_sentiment("ISYS1001", 2023, 2, history)
    assert sentiment_with_history in ["very_positive", "positive", "neutral", "negative", "very_negative"]


def test_response_distribution():
    """Test response distribution generation."""
    generator = SentimentGenerator(random_seed=42)
    
    # Generate distribution for a positive sentiment
    distribution = generator.generate_response_distribution("positive", 0)
    
    # Check keys
    expected_keys = [
        "strongly_agree", "agree", "neutral", "disagree", 
        "strongly_disagree", "unable_to_judge", "percent_agree", "total_responses"
    ]
    for key in expected_keys:
        assert key in distribution
    
    # Check values make sense
    assert distribution["total_responses"] > 0
    assert 0 <= distribution["percent_agree"] <= 100
    
    # Check that percentages align with sentiment
    if distribution["sentiment"] == "positive":
        assert distribution["strongly_agree"] + distribution["agree"] > distribution["disagree"] + distribution["strongly_disagree"]