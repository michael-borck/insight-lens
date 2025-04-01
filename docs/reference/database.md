## 🎓 **Unit Survey Database Schema**

---

### 📘 `discipline`
Stores discipline code and full name.

| Field Name        | Type         | Description                      |
|-------------------|--------------|----------------------------------|
| `discipline_code` | VARCHAR(10)  | **Primary Key** (e.g., `ISYS`)   |
| `discipline_name` | TEXT         | e.g., `Information Systems`      |

---

### 📘 `unit`
Stores core unit information.

| Field Name        | Type         | Description                                  |
|-------------------|--------------|----------------------------------------------|
| `unit_code`       | VARCHAR(10)  | **Primary Key** (e.g., `ISYS6014`)           |
| `unit_name`       | TEXT         | Full title of the unit                       |
| `discipline_code` | VARCHAR(10)  | Foreign Key → `discipline(discipline_code)`  |

---

### 📘 `unit_offering`
Represents a specific offering of a unit in a particular semester and year.

| Field Name         | Type         | Description                                        |
|--------------------|--------------|----------------------------------------------------|
| `unit_offering_id` | SERIAL       | **Primary Key**                                    |
| `unit_code`        | VARCHAR(10)  | Foreign Key → `unit(unit_code)`                    |
| `semester`         | INT          | e.g., 1, 2                                         |
| `year`             | INT          | e.g., 2024                                         |
| `location`         | TEXT         | e.g., `Bentley Campus`                             |
| `availability`     | TEXT         | e.g., `Internal`                                   |

---

### 📘 `survey_event`
Represents the institutional survey event during which data was collected.

| Field Name     | Type         | Description                              |
|----------------|--------------|------------------------------------------|
| `event_id`     | SERIAL       | **Primary Key**                          |
| `month`        | INT          | e.g., 5 for May, 10 for October          |
| `year`         | INT          | e.g., 2024                               |
| `description`  | TEXT         | e.g., `Semester 2 2024` or `Oct 2023`    |

---

### 📘 `question`
Standardized survey questions.

| Field Name     | Type         | Description                                          |
|----------------|--------------|------------------------------------------------------|
| `question_id`  | SERIAL       | **Primary Key**                                      |
| `question_text`| TEXT         | e.g., *"I was engaged by the learning activities"*   |

---

### 📘 `unit_survey`
Stores aggregated survey results for a unit offering during a survey event.

| Field Name         | Type           | Description                                          |
|--------------------|----------------|------------------------------------------------------|
| `survey_id`        | SERIAL         | **Primary Key**                                      |
| `unit_offering_id` | INT            | Foreign Key → `unit_offering(unit_offering_id)`      |
| `event_id`         | INT            | Foreign Key → `survey_event(event_id)`               |
| `enrolments`       | INT            | Number of enrolled students                          |
| `responses`        | INT            | Number of student responses                          |
| `response_rate`    | DECIMAL(5,2)   | e.g., 19.30 (%)                                      |
| `overall_experience` | DECIMAL(5,2) | % SA+A for the “Overall, this unit was worthwhile”   |

---

### 📘 `unit_survey_result`
Breaks down survey responses per question for each unit survey.

| Field Name         | Type           | Description                                          |
|--------------------|----------------|------------------------------------------------------|
| `result_id`        | SERIAL         | **Primary Key**                                      |
| `survey_id`        | INT            | Foreign Key → `unit_survey(survey_id)`              |
| `question_id`      | INT            | Foreign Key → `question(question_id)`               |
| `strongly_disagree`| INT            | Count                                                |
| `disagree`         | INT            | Count                                                |
| `neutral`          | INT            | Count                                                |
| `agree`            | INT            | Count                                                |
| `strongly_agree`   | INT            | Count                                                |
| `unable_to_judge`  | INT            | Count                                                |
| `percent_agree`    | DECIMAL(5,2)   | (Agree + Strongly Agree) %                           |

---

### 📘 `benchmark`
Compares each survey result to broader aggregates.

| Field Name     | Type           | Description                                      |
|----------------|----------------|--------------------------------------------------|
| `benchmark_id` | SERIAL         | **Primary Key**                                  |
| `survey_id`    | INT            | Foreign Key → `unit_survey(survey_id)`          |
| `question_id`  | INT            | Foreign Key → `question(question_id)`           |
| `group_type`   | TEXT           | e.g., `Unit`, `School`, `Faculty`, `Curtin`     |
| `percent_agree`| DECIMAL(5,2)   | Percentage of agreement                         |
| `total_n`      | INT            | Total responses in the benchmark group          |

Absolutely! Here’s a breakdown of the **relationships between the tables** in your unit survey database schema, along with a high-level diagram-style description.

---

## 🔄 **Entity Relationships Overview**

---

### 🔹 `discipline` ← 🧩→ `unit`
- **One-to-Many**
- A discipline (e.g., `ISYS`) can have **many units** (e.g., `ISYS2001`, `ISYS6014`), but each unit belongs to **one discipline**.

```text
discipline.discipline_code → unit.discipline_code
```

---

### 🔹 `unit` ← 🧩→ `unit_offering`
- **One-to-Many**
- Each unit can be offered in **multiple semesters and years** (e.g., `ISYS6014` in Semester 2, 2023; Semester 2, 2024).

```text
unit.unit_code → unit_offering.unit_code
```

---

### 🔹 `unit_offering` ← 🧩→ `unit_survey`
- **One-to-Many**
- Each unit offering can be surveyed **once per survey event**, producing one `unit_survey` record.
- (You could allow multiple surveys per offering if needed, but typically this is 1:1.)

```text
unit_offering.unit_offering_id → unit_survey.unit_offering_id
```

---

### 🔹 `survey_event` ← 🧩→ `unit_survey`
- **One-to-Many**
- Each unit survey is associated with one survey event (e.g., `Semester 1 2024 Survey`), but each event can have many surveys.

```text
survey_event.event_id → unit_survey.event_id
```

---

### 🔹 `unit_survey` ← 🧩→ `unit_survey_result`
- **One-to-Many**
- Each survey has **a result per question**.
- This is where the actual Likert-scale counts and % agree are stored.

```text
unit_survey.survey_id → unit_survey_result.survey_id
```

---

### 🔹 `question` ← 🧩→ `unit_survey_result`
- **One-to-Many**
- Every `unit_survey_result` record relates to **one question**, and each question appears in **many surveys**.

```text
question.question_id → unit_survey_result.question_id
```

---

### 🔹 `unit_survey` ← 🧩→ `benchmark`
- **One-to-Many**
- Each unit survey can have **multiple benchmark records** — one for each question and benchmark group (e.g., `Unit`, `Faculty`, `Curtin`).

```text
unit_survey.survey_id → benchmark.survey_id
```

---

### 🔹 `question` ← 🧩→ `benchmark`
- **One-to-Many**
- Each benchmark result relates to **one question**, and benchmarks exist for many surveys/questions.

```text
question.question_id → benchmark.question_id
```

---

## 🧭 ER-style Relationship Summary

```text
discipline(1) ────< unit(1) ────< unit_offering(1) ────< unit_survey(1)
                                            ↑                         ↑
                                          (1)                      (1)
                                    survey_event           unit_survey_result(*) >───── question(1)
                                                              benchmark(*) >───────────┘
```

> Legend:  
> `─────<` = one-to-many  
> `(*)` = many  
> `question(1)` = each record relates to one question  
