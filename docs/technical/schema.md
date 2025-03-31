# Database Schema

SurveySavvy uses an SQLite database with the following schema to model university unit surveys.

## Tables

### Discipline

Stores discipline code and full name.

| Field Name | Type | Description |
|------------|------|-------------|
| `discipline_code` | TEXT | **Primary Key** (e.g., `ISYS`) |
| `discipline_name` | TEXT | e.g., `Information Systems` |

### Unit

Stores core unit information.

| Field Name | Type | Description |
|------------|------|-------------|
| `unit_code` | TEXT | **Primary Key** (e.g., `ISYS6014`) |
| `unit_name` | TEXT | Full title of the unit |
| `discipline_code` | TEXT | Foreign Key → `discipline(discipline_code)` |

### Unit Offering

Represents a specific offering of a unit in a particular semester and year.

| Field Name | Type | Description |
|------------|------|-------------|
| `unit_offering_id` | INTEGER | **Primary Key** |
| `unit_code` | TEXT | Foreign Key → `unit(unit_code)` |
| `semester` | INTEGER | e.g., 1, 2 |
| `year` | INTEGER | e.g., 2024 |
| `location` | TEXT | e.g., `Bentley Campus` |
| `availability` | TEXT | e.g., `Internal` |

### Survey Event

Represents the institutional survey event during which data was collected.

| Field Name | Type | Description |
|------------|------|-------------|
| `event_id` | INTEGER | **Primary Key** |
| `month` | INTEGER | e.g., 5 for May, 10 for October |
| `year` | INTEGER | e.g., 2024 |
| `description` | TEXT | e.g., `Semester 2 2024` |

### Question

Standardized survey questions.

| Field Name | Type | Description |
|------------|------|-------------|
| `question_id` | INTEGER | **Primary Key** |
| `question_text` | TEXT | e.g., *"I was engaged by the learning activities"* |

### Unit Survey

Stores aggregated survey results for a unit offering during a survey event.

| Field Name | Type | Description |
|------------|------|-------------|
| `survey_id` | INTEGER | **Primary Key** |
| `unit_offering_id` | INTEGER | Foreign Key → `unit_offering(unit_offering_id)` |
| `event_id` | INTEGER | Foreign Key → `survey_event(event_id)` |
| `enrolments` | INTEGER | Number of enrolled students |
| `responses` | INTEGER | Number of student responses |
| `response_rate` | REAL | e.g., 19.30 (%) |
| `overall_experience` | REAL | % SA+A for the "Overall, this unit was worthwhile" |

### Unit Survey Result

Breaks down survey responses per question for each unit survey.

| Field Name | Type | Description |
|------------|------|-------------|
| `result_id` | INTEGER | **Primary Key** |
| `survey_id` | INTEGER | Foreign Key → `unit_survey(survey_id)` |
| `question_id` | INTEGER | Foreign Key → `question(question_id)` |
| `strongly_disagree` | INTEGER | Count |
| `disagree` | INTEGER | Count |
| `neutral` | INTEGER | Count |
| `agree` | INTEGER | Count |
| `strongly_agree` | INTEGER | Count |
| `unable_to_judge` | INTEGER | Count |
| `percent_agree` | REAL | (Agree + Strongly Agree) % |

### Benchmark

Compares each survey result to broader aggregates.

| Field Name | Type | Description |
|------------|------|-------------|
| `benchmark_id` | INTEGER | **Primary Key** |
| `survey_id` | INTEGER | Foreign Key → `unit_survey(survey_id)` |
| `question_id` | INTEGER | Foreign Key → `question(question_id)` |
| `group_type` | TEXT | e.g., `Unit`, `School`, `Faculty`, `University` |
| `percent_agree` | REAL | Percentage of agreement |
| `total_n` | INTEGER | Total responses in the benchmark group |

### Comment

Stores student comments for surveys.

| Field Name | Type | Description |
|------------|------|-------------|
| `comment_id` | INTEGER | **Primary Key** |
| `survey_id` | INTEGER | Foreign Key → `unit_survey(survey_id)` |
| `comment_text` | TEXT | The student comment |
| `sentiment_score` | REAL | A score from 0-1 indicating sentiment (1 is positive) |

## Entity Relationships

```
discipline(1) ────< unit(1) ────< unit_offering(1) ────< unit_survey(1)
                                            ↑                 ↑   ↑
                                          (1)               (1) (1)
                                    survey_event           unit_survey_result(*) >───── question(1)
                                                                ↑
                                                           benchmark(*) >──────────────┘
                                                           comment(*) >────────────────┘
```

Legend:  
`─────<` = one-to-many  
`(*)` = many  
`question(1)` = each record relates to one question