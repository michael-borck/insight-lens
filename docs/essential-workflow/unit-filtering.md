# Unit Filtering

Effective filtering is essential for focused analysis in InsightLens. This guide shows you how to use filtering tools to drill down into specific units, timeframes, and data segments for meaningful insights.

## Overview of Filtering

### Purpose of Filtering
- **Focus analysis** on specific subsets of data
- **Compare** similar units or groups
- **Isolate** particular time periods or conditions
- **Reduce complexity** in large datasets

### Types of Filters Available
- **Unit Characteristics** (code, name, discipline)
- **Temporal Filters** (year, semester, date ranges)
- **Performance Filters** (response rates, satisfaction scores)
- **Geographic Filters** (campus, location)
- **Data Quality Filters** (completeness, reliability)

## Filter Locations

### Global Filters (Dashboard)
Available across all pages for consistent analysis:

**Time Range Selector**
- Quick options: Last semester, Last year, Custom range
- Academic year vs Calendar year modes
- Semester-specific selections
- Rolling periods (last 6 months, etc.)

**Unit Type Filters**
- Undergraduate vs Postgraduate
- Core vs Elective units
- Online vs Face-to-face delivery
- Credit point ranges

### Page-Specific Filters

**Units Page Filters**
- Advanced search and filtering interface
- Multiple criteria combination
- Saved filter presets
- Bulk action capabilities

**Dashboard Widget Filters**
- Individual chart filtering options
- Quick filter buttons on overview cards
- Contextual filters based on current view
- Temporary filters that don't affect other pages

## Unit Characteristic Filters

### Unit Code Filtering

**Exact Match**
- Enter specific unit code (e.g., "ISYS2001")
- Useful for single unit deep-dive analysis
- Case-insensitive matching
- Partial code matching available

**Pattern Matching**
- Wildcard searches (e.g., "ISYS*" for all ISYS units)
- Multiple unit codes separated by commas
- Regular expression support for advanced users
- Unit family grouping (all 1000-level units)

### Discipline and School Filtering

**Hierarchical Structure**
```
University
├── Business School
│   ├── Accounting
│   ├── Finance
│   └── Information Systems
├── Engineering
│   ├── Civil Engineering
│   ├── Mechanical Engineering
│   └── Software Engineering
└── Arts and Sciences
    ├── Psychology
    ├── Literature
    └── Mathematics
```

**Multi-Level Selection**
- Choose entire schools or specific disciplines
- Mix and match different levels
- Exclude specific subdisciplines
- Compare across school boundaries

### Academic Level Filtering

**Standard Levels**
- **Foundation** (preparatory courses)
- **Undergraduate** (1000-3000 level)
- **Postgraduate Coursework** (4000-5000 level)
- **Postgraduate Research** (6000+ level)

**Custom Level Definitions**
- Institution-specific level codes
- Cross-level analysis capabilities
- Progression tracking through levels
- Prerequisite relationship filtering

## Temporal Filtering

### Academic Calendar Alignment

**Semester-Based Filtering**
- Standard semester 1, 2, summer
- Trimester systems (1, 2, 3)
- Quarter systems (fall, winter, spring, summer)
- Custom academic periods

**Year Selection Options**
- Single year analysis
- Multi-year comparisons
- Academic year vs calendar year
- Rolling year calculations

### Advanced Time Filtering

**Relative Time Periods**
- "Last 3 semesters"
- "Same semester last year"
- "Previous academic year"
- "Rolling 12 months"

**Specific Date Ranges**
- Custom start and end dates
- Survey completion date filtering
- Import date filtering
- Academic period boundaries

### Trend Analysis Time Windows

**Comparison Periods**
- Before/after intervention analysis
- Pre/post curriculum change comparison
- Instructor change impact assessment
- Seasonal variation analysis

## Performance-Based Filtering

### Satisfaction Score Filters

**Score Ranges**
- High performers (4.0+ average)
- Concerning performance (below 3.0)
- Improvement targets (3.0-3.5)
- Excellence recognition (4.5+)

**Percentile-Based Filtering**
- Top 10% performers
- Bottom quartile for attention
- Middle 50% for baseline
- Outlier identification (beyond 2 standard deviations)

### Response Rate Filtering

**Rate Thresholds**
- Minimum response rates for reliability
- High engagement units (>70% response)
- Low engagement concerns (<30% response)
- Target achievement (institutional benchmarks)

**Statistical Confidence**
- Minimum sample sizes for validity
- Confidence interval requirements
- Margin of error considerations
- Power analysis inclusion criteria

### Trend-Based Filtering

**Improvement Patterns**
- Units showing consistent improvement
- Declining performance indicators
- Stable but concerning patterns
- Volatile or inconsistent results

**Change Magnitude**
- Significant positive changes
- Concerning negative shifts
- Minimal change patterns
- Dramatic transformation cases

## Geographic and Delivery Filters

### Campus Location

**Physical Locations**
- Main campus units
- Regional campus offerings
- International campus data
- Distance education providers

**Location-Specific Analysis**
- Resource availability impacts
- Student demographic differences
- Local cultural factors
- Infrastructure variations

### Delivery Mode Filtering

**Teaching Methods**
- Face-to-face instruction
- Online delivery
- Blended/hybrid models
- Block/intensive modes

**Technology Integration**
- High-tech delivery methods
- Traditional approaches
- Simulation and lab-based units
- Field experience components

## Data Quality Filters

### Completeness Filters

**Response Completeness**
- Units with complete survey data
- Partial response filtering
- Missing data tolerance levels
- Data quality scoring

**Question Coverage**
- All required questions answered
- Optional question participation
- Comment section completion
- Demographic data availability

### Reliability Filters

**Sample Size Adequacy**
- Minimum student enrollment
- Sufficient response numbers
- Statistical power requirements
- Confidence level maintenance

**Data Consistency**
- Internal consistency checks
- Cross-validation results
- Outlier detection and handling
- Quality assurance passed

## Advanced Filtering Techniques

### Combined Filter Logic

**AND Logic** (All conditions must be met)
- Business School AND Undergraduate AND High Performance
- Creates narrow, focused datasets
- Useful for specific case studies
- Ensures all criteria satisfaction

**OR Logic** (Any condition can be met)
- Engineering OR Computer Science units
- Expands dataset inclusively
- Useful for broad comparisons
- Captures related categories

**NOT Logic** (Exclude specific conditions)
- All units EXCEPT foundation courses
- Remove outliers or special cases
- Focus on standard offerings
- Clean datasets for analysis

### Filter Combinations

**Nested Filtering**
```
(Business School OR Engineering) 
AND Undergraduate 
AND (Response Rate > 50%) 
AND (Year = 2023 OR Year = 2024)
```

**Sequential Filtering**
1. Start with broad criteria
2. Progressively narrow focus
3. Evaluate results at each step
4. Fine-tune for optimal dataset

### Saved Filter Presets

**Common Preset Examples**
- **"High Priority Units"**: Low satisfaction + High enrollment
- **"Success Stories"**: High satisfaction + Improving trends
- **"New Offerings"**: First or second year of delivery
- **"Core Curriculum"**: Required units for degree programs

**Custom Preset Creation**
1. Configure desired filter combination
2. Save with descriptive name
3. Share with colleagues if appropriate
4. Update as criteria evolve

## Filter Management

### Performance Optimization

**Large Dataset Handling**
- Progressive filtering for better performance
- Index-optimized filter combinations
- Cached results for common filters
- Background processing for complex queries

**Memory Management**
- Filter result caching
- Automatic cleanup of temporary filters
- Efficient data loading strategies
- Resource usage monitoring

### User Experience Features

**Filter Persistence**
- Maintain filters across sessions
- Remember last-used configurations
- Quick restoration of previous settings
- Cross-page filter consistency

**Visual Feedback**
- Active filter indicators
- Result count updates
- Performance impact warnings
- Filter conflict detection

## Best Practices

### Effective Filter Strategies

**Start Broad, Then Narrow**
1. Begin with general time period
2. Add major category filters
3. Refine with performance criteria
4. Fine-tune with specific requirements

**Maintain Context**
- Always show applied filters clearly
- Provide easy filter removal options
- Include unfiltered comparisons when relevant
- Document filter rationale in reports

### Common Pitfalls to Avoid

**Over-Filtering**
- Too restrictive criteria yielding minimal data
- Loss of statistical power
- Missing important patterns
- Reduced generalizability

**Filter Bias**
- Unconsciously selecting favorable data
- Ignoring inconvenient results
- Cherry-picking for desired outcomes
- Inadequate representative sampling

### Quality Assurance

**Filter Validation**
- Check result counts for reasonableness
- Verify filter logic accuracy
- Test with known data subsets
- Cross-validate with alternative approaches

**Documentation Standards**
- Record filter criteria used
- Note any unusual selections
- Explain rationale for choices
- Include filter information in reports

## Troubleshooting Filters

### Common Issues

**No Results Returned**
- Criteria too restrictive
- Date range issues
- Data availability problems
- Filter logic errors

**Too Many Results**
- Insufficient filtering
- Broad criteria combinations
- Missing quality filters
- Performance impact concerns

**Unexpected Results**
- Filter logic conflicts
- Data interpretation errors
- Cache consistency issues
- System synchronization problems

### Diagnostic Steps

1. **Review each filter individually**
2. **Test simplified filter combinations**
3. **Check data availability for time periods**
4. **Verify filter logic interpretation**
5. **Clear cache and retry if needed**

---

**Previous**: [Exploring Trends](exploring-trends.md) | **Next**: [Chart Interactions](chart-interactions.md)