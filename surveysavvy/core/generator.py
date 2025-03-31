"""
Survey data generator module for SurveySavvy.

This module provides functionality for generating realistic survey data,
including response distributions, comments, and sentiment patterns.
"""

import random
import numpy as np
from faker import Faker
from typing import List, Dict, Tuple, Optional, Union
import os
import json
import datetime
from pathlib import Path
import anthropic

from .database import Database


class UnitGenerator:
    """Generates unit and discipline data."""
    
    # Map of discipline codes to names
    DISCIPLINES = {
        "ISYS": "Information Systems",
        "COMP": "Computer Science",
        "BUSN": "Business",
        "MKTG": "Marketing",
        "MGMT": "Management",
        "ACCT": "Accounting",
        "ECON": "Economics",
        "FINA": "Finance",
        "STAT": "Statistics",
        "PSYC": "Psychology",
        "BIOL": "Biology",
        "CHEM": "Chemistry",
        "PHYS": "Physics",
        "MATH": "Mathematics",
        "ENGL": "English",
        "HIST": "History",
        "POLI": "Political Science",
        "SOCL": "Sociology",
        "ARTS": "Arts",
        "EDUC": "Education",
    }
    
    # Unit name templates per discipline
    UNIT_TEMPLATES = {
        "ISYS": [
            "Introduction to {discipline}",
            "Advanced {discipline}",
            "Business Information Systems",
            "Database Design and Implementation",
            "Systems Analysis and Design",
            "Knowledge Management Systems",
            "Enterprise Systems",
            "Business Intelligence",
            "Information Security",
            "Project Management",
        ],
        "COMP": [
            "Introduction to Programming",
            "Data Structures and Algorithms",
            "Operating Systems",
            "Computer Networks",
            "Artificial Intelligence",
            "Machine Learning",
            "Computer Graphics",
            "Software Engineering",
            "Web Development",
            "Mobile Application Development",
        ],
        # Add more discipline-specific templates as needed
    }
    
    # Default unit name templates for disciplines without specific templates
    DEFAULT_TEMPLATES = [
        "Introduction to {discipline}",
        "Advanced {discipline}",
        "Principles of {discipline}",
        "Applied {discipline}",
        "{discipline} Theory",
        "{discipline} Practice",
        "Contemporary Issues in {discipline}",
        "Research Methods in {discipline}",
        "{discipline} Strategy",
        "{discipline} Management",
    ]
    
    def __init__(self, faker_seed: int = 42):
        """
        Initialize the unit generator.
        
        Args:
            faker_seed: Seed for Faker to ensure reproducibility
        """
        self.fake = Faker()
        Faker.seed(faker_seed)
        random.seed(faker_seed)
    
    def generate_unit_code(self, discipline_code: str, level: int) -> str:
        """
        Generate a realistic unit code.
        
        Args:
            discipline_code: The discipline code (e.g., ISYS)
            level: The unit level (1-3 for undergraduate, 5-6 for postgraduate)
            
        Returns:
            A formatted unit code (e.g., ISYS2001)
        """
        unit_number = random.randint(1, 99)
        return f"{discipline_code}{level}{unit_number:02d}"
    
    def generate_unit_name(self, discipline_code: str, level: int) -> str:
        """
        Generate a realistic unit name.
        
        Args:
            discipline_code: The discipline code (e.g., ISYS)
            level: The unit level (1-3 for undergraduate, 5-6 for postgraduate)
            
        Returns:
            A unit name
        """
        discipline_name = self.DISCIPLINES.get(discipline_code, discipline_code)
        
        templates = self.UNIT_TEMPLATES.get(
            discipline_code, 
            self.DEFAULT_TEMPLATES
        )
        
        template = random.choice(templates)
        name = template.format(discipline=discipline_name)
        
        # Add level indicator for some units
        if random.random() < 0.5:
            if level in [1, 2, 3]:
                name += f" {level}"
            elif level in [5, 6]:
                name += " (PG)"
                
        return name
    
    def get_disciplines(self) -> Dict[str, str]:
        """
        Get all available disciplines.
        
        Returns:
            Dictionary mapping discipline codes to names
        """
        return self.DISCIPLINES
    
    def generate_units(self, count: int = 30) -> List[Dict[str, str]]:
        """
        Generate a specified number of units across disciplines.
        
        Args:
            count: Number of units to generate
            
        Returns:
            List of dictionaries containing unit data
        """
        units = []
        disciplines = list(self.DISCIPLINES.keys())
        
        # Distribute units across disciplines
        discipline_distribution = {d: 0 for d in disciplines}
        
        for _ in range(count):
            # Pick discipline with fewer units first
            discipline_code = min(discipline_distribution, key=discipline_distribution.get)
            discipline_distribution[discipline_code] += 1
            
            # Choose level - 70% undergrad, 30% postgrad
            if random.random() < 0.7:
                level = random.randint(1, 3)  # Undergraduate
            else:
                level = random.randint(5, 6)  # Postgraduate
            
            unit_code = self.generate_unit_code(discipline_code, level)
            unit_name = self.generate_unit_name(discipline_code, level)
            
            units.append({
                "unit_code": unit_code,
                "unit_name": unit_name,
                "discipline_code": discipline_code
            })
        
        return units


class SentimentGenerator:
    """Generates realistic sentiment patterns for survey responses."""
    
    # Sentiment categories and their weights
    SENTIMENT_CATEGORIES = {
        "very_positive": 0.2,  # 20% strongly positive
        "positive": 0.5,       # 50% slightly positive
        "neutral": 0.2,        # 20% balanced
        "negative": 0.08,      # 8% negative
        "very_negative": 0.02  # 2% strongly negative
    }
    
    # Response distribution templates per sentiment
    RESPONSE_TEMPLATES = {
        "very_positive": {
            "strongly_agree": (50, 70),
            "agree": (20, 35),
            "neutral": (5, 15),
            "disagree": (0, 5),
            "strongly_disagree": (0, 3),
            "unable_to_judge": (0, 2)
        },
        "positive": {
            "strongly_agree": (25, 40),
            "agree": (35, 50),
            "neutral": (10, 20),
            "disagree": (3, 10),
            "strongly_disagree": (0, 5),
            "unable_to_judge": (0, 3)
        },
        "neutral": {
            "strongly_agree": (10, 25),
            "agree": (25, 40),
            "neutral": (20, 40),
            "disagree": (10, 25),
            "strongly_disagree": (5, 15),
            "unable_to_judge": (0, 5)
        },
        "negative": {
            "strongly_agree": (0, 10),
            "agree": (10, 25),
            "neutral": (15, 30),
            "disagree": (30, 45),
            "strongly_disagree": (15, 30),
            "unable_to_judge": (0, 5)
        },
        "very_negative": {
            "strongly_agree": (0, 5),
            "agree": (5, 15),
            "neutral": (10, 20),
            "disagree": (25, 40),
            "strongly_disagree": (30, 50),
            "unable_to_judge": (0, 5)
        }
    }
    
    def __init__(self, random_seed: int = 42):
        """
        Initialize the sentiment generator.
        
        Args:
            random_seed: Seed for random number generation
        """
        self.rng = np.random.RandomState(random_seed)
        random.seed(random_seed)
    
    def generate_sentiment(self, 
                          unit_code: str, 
                          year: int, 
                          semester: int, 
                          history: Optional[List[str]] = None) -> str:
        """
        Generate a sentiment category for a unit survey.
        
        Args:
            unit_code: The unit code
            year: The survey year
            semester: The semester number
            history: Optional list of previous sentiment categories
            
        Returns:
            Sentiment category
        """
        # Check if we should maintain trend from history
        if history and len(history) > 0:
            last_sentiment = history[-1]
            
            # 70% chance to stay in similar sentiment range
            if random.random() < 0.7:
                if last_sentiment == "very_positive":
                    return random.choices(
                        ["very_positive", "positive"], 
                        weights=[0.7, 0.3]
                    )[0]
                elif last_sentiment == "positive":
                    return random.choices(
                        ["very_positive", "positive", "neutral"], 
                        weights=[0.2, 0.6, 0.2]
                    )[0]
                elif last_sentiment == "neutral":
                    return random.choices(
                        ["positive", "neutral", "negative"], 
                        weights=[0.3, 0.4, 0.3]
                    )[0]
                elif last_sentiment == "negative":
                    return random.choices(
                        ["neutral", "negative", "very_negative"], 
                        weights=[0.2, 0.6, 0.2]
                    )[0]
                else:  # very_negative
                    return random.choices(
                        ["negative", "very_negative"], 
                        weights=[0.3, 0.7]
                    )[0]
        
        # Base distribution if no history or random change
        return random.choices(
            list(self.SENTIMENT_CATEGORIES.keys()),
            weights=list(self.SENTIMENT_CATEGORIES.values())
        )[0]
    
    def generate_response_distribution(self, sentiment: str, question_idx: int) -> Dict[str, int]:
        """
        Generate response distribution for a question based on sentiment.
        
        Args:
            sentiment: Sentiment category
            question_idx: Index of the question (0-5)
            
        Returns:
            Dictionary of response counts
        """
        template = self.RESPONSE_TEMPLATES[sentiment]
        total_responses = random.randint(50, 150)
        
        # Start with minimum values
        distribution = {
            k: random.randint(v[0], v[1]) 
            for k, v in template.items()
        }
        
        # Normalize to percentages
        total_percent = sum(distribution.values())
        normalized = {
            k: v / total_percent
            for k, v in distribution.items()
        }
        
        # Convert to actual counts
        counts = {
            k: round(v * total_responses)
            for k, v in normalized.items()
        }
        
        # Adjust to ensure total matches
        current_total = sum(counts.values())
        if current_total != total_responses:
            diff = total_responses - current_total
            # Add/subtract the difference from the largest category
            largest_key = max(counts, key=counts.get)
            counts[largest_key] += diff
        
        # Calculate percent agree
        percent_agree = (counts["strongly_agree"] + counts["agree"]) / total_responses * 100
        counts["percent_agree"] = round(percent_agree, 2)
        counts["total_responses"] = total_responses
        
        return counts


class CommentGenerator:
    """Generates realistic comments for surveys using Anthropic API."""
    
    def __init__(self, api_key: Optional[str] = None):
        """
        Initialize the comment generator.
        
        Args:
            api_key: Optional Anthropic API key. If not provided, will try to get from environment.
        """
        self.api_key = api_key or os.environ.get("ANTHROPIC_API_KEY")
        
        if not self.api_key:
            print("Warning: No Anthropic API key provided. Comment generation will be disabled.")
            self.client = None
        else:
            self.client = anthropic.Anthropic(api_key=self.api_key)
    
    def generate_comments(self, 
                         unit_code: str,
                         unit_name: str,
                         sentiment: str,
                         year: int,
                         semester: int,
                         response_data: Dict[str, Dict[str, int]],
                         count: int = 5) -> List[Dict[str, str]]:
        """
        Generate realistic comments for a survey.
        
        Args:
            unit_code: The unit code
            unit_name: The unit name
            sentiment: Sentiment category
            year: Survey year
            semester: Semester number
            response_data: Response distribution data
            count: Number of comments to generate
            
        Returns:
            List of comment dictionaries
        """
        if not self.client:
            return self._generate_fake_comments(sentiment, count)
        
        # Create the prompt
        prompt = self._create_comment_prompt(
            unit_code, unit_name, sentiment, year, semester, response_data, count
        )
        
        try:
            # Call Anthropic API
            message = self.client.messages.create(
                model="claude-3-haiku-20240307",
                max_tokens=1024,
                temperature=0.7,
                system="You are a helpful assistant that generates realistic student comments for university course surveys.",
                messages=[
                    {"role": "user", "content": prompt}
                ]
            )
            
            # Parse the response
            comments_text = message.content[0].text
            comments = self._parse_comments(comments_text, sentiment)
            
            # If parsing failed or not enough comments, use fallback
            if len(comments) < count:
                comments.extend(self._generate_fake_comments(sentiment, count - len(comments)))
                
            return comments[:count]
        
        except Exception as e:
            print(f"Error calling Anthropic API: {e}")
            return self._generate_fake_comments(sentiment, count)
    
    def _create_comment_prompt(self,
                              unit_code: str,
                              unit_name: str,
                              sentiment: str,
                              year: int,
                              semester: int,
                              response_data: Dict[str, Dict[str, int]],
                              count: int) -> str:
        """Create a prompt for the Anthropic API."""
        
        # Convert sentiment to descriptions
        sentiment_descriptions = {
            "very_positive": "very positive, enthusiastic",
            "positive": "generally positive",
            "neutral": "mixed, with both positive and negative elements",
            "negative": "generally negative",
            "very_negative": "very negative and critical"
        }
        
        sentiment_desc = sentiment_descriptions.get(sentiment, "mixed")
        
        # Extract percent_agree for reference
        percent_agree_values = [data.get("percent_agree", 0) for data in response_data.values()]
        avg_percent_agree = sum(percent_agree_values) / len(percent_agree_values) if percent_agree_values else 50
        
        prompt = f"""Generate {count} realistic student comments for a university course survey.

Course: {unit_code} - {unit_name}
Year: {year}, Semester: {semester}
Overall sentiment: {sentiment_desc}
Average agreement rating: {avg_percent_agree:.1f}%

Generate {count} separate student comments that:
1. Reflect the {sentiment_desc} sentiment
2. Reference specific aspects of the course like lectures, assignments, tutorials, instructor, etc.
3. Vary in length from 1-3 sentences
4. Use natural, conversational student language
5. Are specific to the subject matter implied by the course title
6. Avoid generic statements that could apply to any course

Format each comment on a new line starting with "COMMENT: "

Example:
COMMENT: The professor was extremely knowledgeable but the tutorials didn't align well with the assignments. Found it hard to apply concepts.
"""
        
        return prompt
    
    def _parse_comments(self, text: str, sentiment: str) -> List[Dict[str, str]]:
        """Parse comments from the API response."""
        comments = []
        lines = text.strip().split('\n')
        
        # Map sentiment to a numeric score (0-1)
        sentiment_scores = {
            "very_positive": 0.9,
            "positive": 0.7, 
            "neutral": 0.5,
            "negative": 0.3,
            "very_negative": 0.1
        }
        
        base_score = sentiment_scores.get(sentiment, 0.5)
        
        for line in lines:
            if line.startswith("COMMENT:"):
                comment_text = line.replace("COMMENT:", "").strip()
                if comment_text:
                    # Add small random variation to sentiment score
                    score = base_score + random.uniform(-0.1, 0.1)
                    score = max(0, min(1, score))  # Clamp between 0 and 1
                    
                    comments.append({
                        "comment_text": comment_text,
                        "sentiment_score": round(score, 2)
                    })
        
        return comments
    
    def _generate_fake_comments(self, sentiment: str, count: int) -> List[Dict[str, str]]:
        """Generate fallback comments without API."""
        fake = Faker()
        
        # Templates based on sentiment
        templates = {
            "very_positive": [
                "This unit was excellent! {positive}",
                "I really enjoyed this unit. {positive}",
                "One of the best units I've taken. {positive}",
                "{positive} Overall an outstanding experience.",
                "The {aspect} was fantastic. {positive}"
            ],
            "positive": [
                "Good unit overall. {positive}",
                "I liked the {aspect}. {neutral}",
                "{positive} Would recommend this unit.",
                "The content was interesting and {positive}",
                "Generally well-organized unit. {neutral}"
            ],
            "neutral": [
                "This unit was okay. {neutral}",
                "Some aspects were good, but {negative}",
                "{positive} However, {negative}",
                "The {aspect} could be improved. {neutral}",
                "Mixed feelings about this unit. {neutral}"
            ],
            "negative": [
                "I struggled with this unit. {negative}",
                "The {aspect} was disappointing. {negative}",
                "{negative} Needs improvement.",
                "Not a great experience. {negative}",
                "This unit was challenging for the wrong reasons. {negative}"
            ],
            "very_negative": [
                "This unit was terrible. {negative}",
                "Very disappointed with the {aspect}. {negative}",
                "{negative} Would not recommend.",
                "The {aspect} was extremely poor. {negative}",
                "One of the worst units I've taken. {negative}"
            ]
        }
        
        positive_phrases = [
            "The instructor was very helpful.",
            "The content was well organized.",
            "Assessments were fair and relevant.",
            "The tutorials were engaging.",
            "Materials were clear and useful.",
            "Concepts were explained well."
        ]
        
        neutral_phrases = [
            "The workload was manageable.",
            "Most of the content was relevant.",
            "The pace was reasonable.",
            "Assignments were as expected.",
            "The structure made sense.",
            "The textbook was adequate."
        ]
        
        negative_phrases = [
            "The instructions were unclear.",
            "The workload was too heavy.",
            "Feedback was often delayed.",
            "Lectures were hard to follow.",
            "The assessment criteria were confusing.",
            "The content felt outdated."
        ]
        
        aspects = [
            "lectures", "tutorials", "assignments", "instructor", 
            "course structure", "learning resources", "assessments"
        ]
        
        # Map sentiment to a numeric score (0-1)
        sentiment_scores = {
            "very_positive": 0.9,
            "positive": 0.7, 
            "neutral": 0.5,
            "negative": 0.3,
            "very_negative": 0.1
        }
        
        base_score = sentiment_scores.get(sentiment, 0.5)
        
        comments = []
        for _ in range(count):
            template = random.choice(templates.get(sentiment, templates["neutral"]))
            
            # Fill in the template
            comment = template.format(
                positive=random.choice(positive_phrases),
                neutral=random.choice(neutral_phrases),
                negative=random.choice(negative_phrases),
                aspect=random.choice(aspects)
            )
            
            # Add small random variation to sentiment score
            score = base_score + random.uniform(-0.1, 0.1)
            score = max(0, min(1, score))  # Clamp between 0 and 1
            
            comments.append({
                "comment_text": comment,
                "sentiment_score": round(score, 2)
            })
        
        return comments


class SurveyGenerator:
    """Main class for generating survey data."""
    
    def __init__(self, db: Database, random_seed: int = 42, anthropic_key: Optional[str] = None):
        """
        Initialize the survey generator.
        
        Args:
            db: Database instance
            random_seed: Seed for random number generation
            anthropic_key: Optional Anthropic API key
        """
        self.db = db
        self.random_seed = random_seed
        random.seed(random_seed)
        np.random.seed(random_seed)
        
        self.unit_generator = UnitGenerator(random_seed)
        self.sentiment_generator = SentimentGenerator(random_seed)
        self.comment_generator = CommentGenerator(anthropic_key)
        
        # Semester months
        self.semester_months = {
            1: [5, 6],  # Semester 1 surveys in May-June
            2: [10, 11]  # Semester 2 surveys in Oct-Nov
        }
        
        # Standard locations and availabilities
        self.locations = ["Bentley Campus", "City Campus", "Online"]
        self.availabilities = ["Internal", "External", "Online"]
    
    def populate_disciplines(self):
        """Populate disciplines table."""
        disciplines = self.unit_generator.get_disciplines()
        
        for code, name in disciplines.items():
            self.db.execute(
                "INSERT OR IGNORE INTO discipline (discipline_code, discipline_name) VALUES (?, ?)",
                (code, name)
            )
        
        self.db.commit()
    
    def populate_units(self, unit_count: int = 30):
        """
        Generate and populate units.
        
        Args:
            unit_count: Number of units to generate
        """
        # Populate disciplines first
        self.populate_disciplines()
        
        # Generate units
        units = self.unit_generator.generate_units(unit_count)
        
        # Insert units
        for unit in units:
            self.db.execute(
                "INSERT OR IGNORE INTO unit (unit_code, unit_name, discipline_code) VALUES (?, ?, ?)",
                (unit["unit_code"], unit["unit_name"], unit["discipline_code"])
            )
        
        self.db.commit()
    
    def generate_semester_offerings(self, start_year: int, end_year: int):
        """
        Generate unit offerings across semesters.
        
        Args:
            start_year: Starting year
            end_year: Ending year
        """
        # Get all units
        self.db.execute("SELECT unit_code FROM unit")
        units = [row[0] for row in self.db.cursor.fetchall()]
        
        for unit_code in units:
            # Each unit is offered in 70-90% of possible semesters
            offering_rate = random.uniform(0.7, 0.9)
            
            for year in range(start_year, end_year + 1):
                for semester in [1, 2]:
                    # Decide if unit is offered this semester
                    if random.random() < offering_rate:
                        location = random.choice(self.locations)
                        availability = random.choice(self.availabilities)
                        
                        self.db.execute(
                            """INSERT OR IGNORE INTO unit_offering 
                               (unit_code, semester, year, location, availability) 
                               VALUES (?, ?, ?, ?, ?)""",
                            (unit_code, semester, year, location, availability)
                        )
        
        self.db.commit()
    
    def generate_survey_events(self, start_year: int, end_year: int):
        """
        Generate survey events for each semester.
        
        Args:
            start_year: Starting year
            end_year: Ending year
        """
        for year in range(start_year, end_year + 1):
            for semester in [1, 2]:
                month = random.choice(self.semester_months[semester])
                description = f"Semester {semester} {year} Survey"
                
                self.db.execute(
                    "INSERT INTO survey_event (month, year, description) VALUES (?, ?, ?)",
                    (month, year, description)
                )
        
        self.db.commit()
    
    def generate_surveys(self, start_year: int = 2018, end_year: int = 2024):
        """
        Generate all survey data.
        
        Args:
            start_year: Starting year
            end_year: Ending year
        """
        # Create semester offerings
        self.generate_semester_offerings(start_year, end_year)
        
        # Create survey events
        self.generate_survey_events(start_year, end_year)
        
        # Get all questions
        self.db.execute("SELECT question_id, question_text FROM question")
        questions = {row[0]: row[1] for row in self.db.cursor.fetchall()}
        
        # Get all unit offerings
        self.db.execute("""
            SELECT uo.unit_offering_id, uo.unit_code, u.unit_name, uo.semester, uo.year, uo.location
            FROM unit_offering uo
            JOIN unit u ON uo.unit_code = u.unit_code
        """)
        offerings = self.db.cursor.fetchall()
        
        # Get all survey events
        self.db.execute("SELECT event_id, month, year, description FROM survey_event")
        events = {(row[2], row[1]): row[0] for row in self.db.cursor.fetchall()}
        
        # Sentiment history per unit
        sentiment_history = {}
        
        # For each offering, create survey results
        for offering in offerings:
            offering_id, unit_code, unit_name, semester, year, location = offering
            
            # Find corresponding survey event
            event_id = events.get((year, self.semester_months[semester][0]))
            if not event_id:
                continue
            
            # Generate a sentiment category
            history = sentiment_history.get(unit_code, [])
            sentiment = self.sentiment_generator.generate_sentiment(
                unit_code, year, semester, history
            )
            sentiment_history[unit_code] = history + [sentiment]
            
            # Calculate survey metrics
            enrolments = random.randint(30, 200)
            response_rate = random.uniform(0.15, 0.35)  # 15-35%
            responses = round(enrolments * response_rate)
            
            # Create survey record
            self.db.execute(
                """INSERT INTO unit_survey 
                   (unit_offering_id, event_id, enrolments, responses, response_rate) 
                   VALUES (?, ?, ?, ?, ?)""",
                (offering_id, event_id, enrolments, responses, response_rate)
            )
            
            survey_id = self.db.cursor.lastrowid
            
            # Create response data for each question
            response_data = {}
            overall_percent_agree = 0
            
            for q_id, q_text in questions.items():
                # Generate response distribution
                q_idx = q_id - 1  # Adjust for 0-indexing
                distribution = self.sentiment_generator.generate_response_distribution(
                    sentiment, q_idx
                )
                response_data[q_id] = distribution
                
                # If this is the overall question (#6), save its percent_agree
                if q_text.startswith("Overall"):
                    overall_percent_agree = distribution["percent_agree"]
                
                # Insert response data
                self.db.execute(
                    """INSERT INTO unit_survey_result 
                       (survey_id, question_id, strongly_disagree, disagree, neutral, agree, 
                        strongly_agree, unable_to_judge, percent_agree) 
                       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                    (
                        survey_id,
                        q_id,
                        distribution["strongly_disagree"],
                        distribution["disagree"],
                        distribution["neutral"],
                        distribution["agree"],
                        distribution["strongly_agree"],
                        distribution["unable_to_judge"],
                        distribution["percent_agree"]
                    )
                )
            
            # Update overall experience in survey
            self.db.execute(
                "UPDATE unit_survey SET overall_experience = ? WHERE survey_id = ?",
                (overall_percent_agree, survey_id)
            )
            
            # Generate benchmarks for the survey
            self._generate_benchmarks(survey_id, questions, sentiment)
            
            # Generate comments
            comment_count = random.randint(5, 10)
            comments = self.comment_generator.generate_comments(
                unit_code, unit_name, sentiment, year, semester, response_data, comment_count
            )
            
            # Insert comments
            for comment in comments:
                self.db.execute(
                    "INSERT INTO comment (survey_id, comment_text, sentiment_score) VALUES (?, ?, ?)",
                    (survey_id, comment["comment_text"], comment["sentiment_score"])
                )
            
            self.db.commit()
    
    def _generate_benchmarks(self, survey_id: int, questions: Dict[int, str], sentiment: str):
        """
        Generate benchmark data for a survey.
        
        Args:
            survey_id: Survey ID
            questions: Dictionary of question IDs to text
            sentiment: Sentiment category
        """
        # Benchmark groups
        benchmark_groups = ["Unit", "School", "Faculty", "University"]
        
        # Create synthetic benchmarks for each question
        for q_id in questions:
            # Get the actual percent_agree for this question
            self.db.execute(
                "SELECT percent_agree FROM unit_survey_result WHERE survey_id = ? AND question_id = ?",
                (survey_id, q_id)
            )
            result = self.db.cursor.fetchone()
            if not result:
                continue
            
            unit_percent = result[0]
            
            # Generate wider group benchmarks
            for group in benchmark_groups:
                if group == "Unit":
                    # Unit is the same as the survey result
                    percent_agree = unit_percent
                    total_n = random.randint(30, 70)
                else:
                    # Other groups have increasing variance
                    if group == "School":
                        variance = random.uniform(-5, 5)
                        total_n = random.randint(200, 500)
                    elif group == "Faculty":
                        variance = random.uniform(-8, 8)
                        total_n = random.randint(500, 1500)
                    else:  # University
                        variance = random.uniform(-10, 10)
                        total_n = random.randint(2000, 5000)
                    
                    percent_agree = max(0, min(100, unit_percent + variance))
                
                # Insert benchmark
                self.db.execute(
                    """INSERT INTO benchmark 
                       (survey_id, question_id, group_type, percent_agree, total_n) 
                       VALUES (?, ?, ?, ?, ?)""",
                    (survey_id, q_id, group, percent_agree, total_n)
                )
        
        self.db.commit()