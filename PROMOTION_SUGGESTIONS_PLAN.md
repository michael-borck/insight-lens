# Promotion Suggestions Feature Plan

## Overview
Add a "Promotion Suggestions" feature to InsightLens that analyzes survey data to generate evidence for academic promotion applications, aligned with the Academic Capability Framework (ACF) 2025.

## Background
The ACF explicitly mentions survey-related evidence for promotion:
- "Positive student evaluation with evidence of improvement over time"
- "Improved student engagement, progression, retention" 
- "Effective teaching and approaches to student support"
- Survey response rates, satisfaction scores, and positive comments directly map to ACF criteria

## Implementation Plan

### Phase 1: Core Implementation (Current Focus)

#### 1. Embed ACF Framework
- [ ] Create ACF criteria data structure in the codebase
  - Map Teaching, Research, and Engagement categories
  - Define evidence types and requirements for each level (A-E)
  - Store ACF criteria text and mapping rules
- [ ] Map survey metrics to ACF evidence categories
  - Overall satisfaction → Teaching excellence
  - Response rates → Student engagement
  - Positive comments → Innovation and support
  - Benchmark comparisons → Excellence relative to peers
- [ ] Define thresholds for excellence
  - Satisfaction >80% = "Meeting excellence benchmarks"
  - Positive trend >5% YoY = "Continuous improvement"
  - Above faculty average = "Leading performance"

#### 2. Create Analysis Engine
- [ ] Query high-performing units
  ```sql
  -- Units with satisfaction >80%
  SELECT * FROM unit_survey 
  WHERE overall_experience > 80
  ORDER BY overall_experience DESC
  ```
- [ ] Identify improving trends
  ```sql
  -- Year-over-year improvements
  SELECT unit_code, year, overall_experience,
    LAG(overall_experience) OVER (PARTITION BY unit_code ORDER BY year) as prev_year
  FROM unit_survey
  ```
- [ ] Extract positive comments with ACF keywords
  - Keywords: "innovative", "supportive", "engaging", "excellent", "helpful"
  - Filter sentiment_score > 0.5
- [ ] Compare against benchmarks
  - Faculty averages
  - Discipline averages
  - University-wide metrics

#### 3. Build Report Generator
- [ ] Design promotion evidence template structure
  ```typescript
  interface PromotionEvidence {
    academicLevel: 'A' | 'B' | 'C' | 'D' | 'E';
    teachingEvidence: Evidence[];
    researchEvidence: Evidence[];
    engagementEvidence: Evidence[];
    summary: string;
    recommendations: string[];
  }
  ```
- [ ] Map data to ACF levels
  - Level A: Developing (60-70% satisfaction)
  - Level B: Progressing (70-80% satisfaction)
  - Level C: Approaching excellence (80-85% satisfaction)
  - Level D: Meeting excellence (85-90% satisfaction)
  - Level E: Exceeding excellence (>90% satisfaction)
- [ ] Format evidence statements
  - Quantitative: "Achieved 87% student satisfaction in 2024"
  - Qualitative: "Students praised innovative teaching methods"
  - Comparative: "Exceeded faculty average by 12%"
- [ ] Include relevant positive comments as quotes

#### 4. Add UI Components
- [ ] Add "Promotion Suggestions" button to main navigation
- [ ] Create promotion suggestions page (`/promotion-suggestions`)
- [ ] Add filters interface
  - Time period selector (e.g., last 3 years)
  - Unit selection (single or multiple)
  - Academic level target (A through E)
- [ ] Build evidence preview interface
  - Categorized by ACF framework areas
  - Highlight strongest evidence
  - Show data visualizations
- [ ] Implement export functionality
  - PDF export with formatting
  - Word document export
  - Copy-to-clipboard for sections

### Phase 2: Enhancement (Future)

#### Document Upload Support
- [ ] Add document upload interface
- [ ] Parse custom promotion frameworks
- [ ] Map custom criteria to survey data
- [ ] Support multiple institution frameworks

#### AI Enhancement
- [ ] AI-powered evidence writing assistance
- [ ] Automatic narrative generation from data
- [ ] Suggestion improvement based on successful applications

#### Integration Features
- [ ] HR system integration
- [ ] Academic portfolio export
- [ ] Automated annual reports

## Technical Architecture

### Database Queries Needed
```sql
-- High performing units
CREATE VIEW high_performing_units AS
SELECT u.*, us.overall_experience, us.response_rate
FROM unit u
JOIN unit_survey us ON u.unit_code = us.unit_code
WHERE us.overall_experience > 80;

-- Trend analysis
CREATE VIEW unit_trends AS
SELECT unit_code, year, overall_experience,
  overall_experience - LAG(overall_experience) OVER (PARTITION BY unit_code ORDER BY year) as yoy_change
FROM unit_survey;

-- Positive feedback
CREATE VIEW positive_comments AS
SELECT c.*, us.unit_code
FROM comment c
JOIN unit_survey us ON c.survey_id = us.survey_id
WHERE c.sentiment_score > 0.5;
```

### File Structure
```
src/
├── main/
│   ├── acfFramework.ts         # ACF criteria and mapping
│   ├── promotionAnalyzer.ts    # Analysis engine
│   └── promotionGenerator.ts   # Report generation
├── renderer/
│   ├── pages/
│   │   └── PromotionSuggestions.tsx
│   ├── components/
│   │   ├── PromotionFilters.tsx
│   │   ├── EvidencePreview.tsx
│   │   └── PromotionExport.tsx
│   └── services/
│       └── promotionService.ts
└── shared/
    └── types/
        └── promotion.ts

```

### API Endpoints
```typescript
// Main process handlers
ipcMain.handle('promotion:analyze', async (event, filters) => {
  // Analyze units for promotion evidence
});

ipcMain.handle('promotion:generate', async (event, unitCode, level) => {
  // Generate promotion report
});

ipcMain.handle('promotion:export', async (event, format, data) => {
  // Export promotion evidence
});
```

## Success Metrics
- Number of promotion reports generated
- User feedback on evidence quality
- Time saved in promotion application preparation
- Successful promotion applications using the tool

## Dependencies
- Existing survey data and analysis
- Sentiment analysis system
- Benchmarking calculations
- Export libraries (PDF, Word)

## Timeline Estimate
- Phase 1 Core: 2-3 weeks
- Phase 2 Enhancements: 4-6 weeks

## Status Tracking

### Current Status: Planning Complete
- [x] Analyzed ACF requirements
- [x] Mapped survey data to ACF criteria
- [x] Designed technical architecture
- [ ] Implementation started

### Next Steps
1. Create ACF framework data structure
2. Build analysis engine queries
3. Implement basic UI
4. Add export functionality

## Notes
- ACF document embedded from: `/home/michael/Documents/PREP/Academic-Capability-Framework-2025.pdf`
- Focus on Teaching category initially as it has strongest alignment with survey data
- Consider adding Research and Engagement evidence from other data sources in future