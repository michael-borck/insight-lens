# Importing Survey Data

Learn how to import your unit survey data into InsightLens for analysis. This guide covers all supported formats and best practices for successful imports.

## Supported File Formats

InsightLens supports the following survey data formats:

### PDF Survey Reports
- **Curtin University** standard unit survey reports
- **Other institutional** PDF formats (with configuration)
- **Multi-page documents** with embedded tables
- **Scanned PDFs** with OCR capabilities

### CSV Data Files
- **Structured survey data** in comma-separated format
- **Custom export files** from survey platforms
- **Manual data compilation** spreadsheets
- **Batch import** of multiple CSV files

### Supported PDF Structures
- Standard institutional survey report templates
- Table-based data with clear column headers
- Comment sections with identifiable student feedback
- Numerical rating scales and Likert responses

## Import Methods

### Method 1: Drag and Drop (Recommended)

The easiest way to import survey data:

1. **Navigate** to the Import page (📤 in sidebar)
2. **Drag PDF or CSV files** directly onto the drop zone
3. **Wait for processing** - progress bar shows status
4. **Review results** in the import summary

**Advantages:**
- Quick and intuitive
- Supports multiple files at once
- Immediate visual feedback
- Automatic format detection

### Method 2: File Browser

For more controlled importing:

1. **Click "Browse Files"** button on Import page
2. **Select one or more files** using file dialog
3. **Confirm file selection** and click "Import"
4. **Monitor progress** in the status panel

**When to Use:**
- Selecting files from deep folder structures
- Importing from network drives
- Precise file selection needed
- Accessibility requirements

### Method 3: Folder Import

For bulk importing entire directories:

1. **Click "Import Folder"** option
2. **Select directory** containing survey files
3. **Choose file types** to include/exclude
4. **Start batch processing** with progress tracking

**Benefits:**
- Process entire semesters at once
- Maintain folder organization
- Automatic file filtering
- Background processing

## Import Process

### Step 1: File Upload
- Files are securely copied to your local database
- **No data** is sent to external servers
- **Original files** remain unchanged
- **Validation** checks run automatically

### Step 2: Format Detection
InsightLens automatically identifies:
- **File type** (PDF vs CSV)
- **Institution format** (if recognized)
- **Data structure** within the file
- **Quality indicators** for successful processing

### Step 3: Data Extraction
For PDF files:
- **Text extraction** from embedded text
- **Table parsing** for structured data
- **OCR processing** for scanned documents (if needed)
- **Comment identification** and sentiment analysis

For CSV files:
- **Column mapping** to database fields
- **Data type validation** and conversion
- **Duplicate detection** and handling
- **Missing value** identification

### Step 4: Data Validation
- **Schema compliance** checking
- **Data range validation** (e.g., response rates 0-100%)
- **Consistency checks** across related fields
- **Quality warnings** for unusual patterns

### Step 5: Database Integration
- **Duplicate prevention** - won't import same survey twice
- **Relationship building** - links units, offerings, and responses
- **Index creation** for fast querying
- **Backup checkpoint** before major changes

## Column Mapping (CSV Imports)

When importing CSV files, you may need to map columns:

### Automatic Mapping
InsightLens attempts to automatically match columns based on:
- **Standard column names** (Unit Code, Year, Semester)
- **Common variations** (UnitCode, unit_code, Unit_Code)
- **Data patterns** (numeric ranges, date formats)
- **File headers** and metadata

### Manual Mapping
For non-standard CSV files:

1. **Review suggested mappings** in the preview
2. **Adjust incorrect mappings** using dropdown menus
3. **Skip unmapped columns** that aren't needed
4. **Add custom mappings** for special fields

### Required Fields
Essential columns for successful import:
- **Unit Code** (e.g., ISYS2001)
- **Unit Name** (e.g., Introduction to Business Programming)
- **Year and Semester** (e.g., 2024, Semester 1)
- **Response Data** (ratings, comments, response counts)

### Optional Fields
Additional data that enhances analysis:
- **Campus Location** (Perth, Sydney, etc.)
- **Delivery Mode** (Face-to-face, Online, Mixed)
- **Student Demographics** (if available and privacy-compliant)
- **Instructor Information** (if included)

## PDF Processing Details

### Text-Based PDFs
- **Direct text extraction** for crisp, clear results
- **Table structure recognition** maintains data relationships
- **Font and formatting** analysis for improved parsing
- **Embedded metadata** utilization when available

### Scanned PDFs (OCR)
- **Optical Character Recognition** for image-based PDFs
- **Quality assessment** before processing
- **Manual review recommended** for critical data
- **Accuracy indicators** provided with results

### Multi-Page Documents
- **Page sequence** maintained throughout processing
- **Cross-page tables** handled automatically
- **Section identification** (demographics, questions, comments)
- **Appendix processing** for additional data

## Import Best Practices

### File Organization
**Before Importing:**
- Organize files by semester and year
- Use consistent naming conventions
- Remove duplicate or test files
- Ensure files are not corrupted

**Naming Conventions:**
- `UNIT_YEAR_SEMESTER.pdf` (e.g., ISYS2001_2024_S1.pdf)
- `Campus_Unit_Period.pdf` for multiple campuses
- `Batch_YYYYMMDD.pdf` for bulk imports

### Data Quality
**Maximize Success:**
- Use original, unmodified survey reports
- Ensure PDFs are not password-protected
- Check for complete data (no missing pages)
- Verify survey completion before importing

**Common Issues to Avoid:**
- Cropped or truncated PDFs
- Files with embedded images only
- Corrupted or damaged files
- Wrong file formats (e.g., Word documents)

### Timing Considerations
**When to Import:**
- **End of semester** when all responses are collected
- **Batch processing** during low-usage periods
- **Before analysis deadlines** to allow for issue resolution
- **After data validation** by survey administrators

## Monitoring Import Progress

### Progress Indicators
- **File-by-file status** with success/error indicators
- **Overall completion percentage** for batch imports
- **Time estimates** for remaining files
- **Detailed logs** of processing steps

### Error Handling
- **Automatic retry** for temporary failures
- **Skip and continue** for problematic files
- **Detailed error messages** for troubleshooting
- **Manual intervention options** when needed

### Success Verification
After import completion:
- **Data summary** showing imported records
- **Quality report** highlighting any concerns
- **Preview charts** with initial insights
- **Next steps** recommendations

## Troubleshooting Common Issues

### "File format not supported"
**Causes:**
- Wrong file type (Word, Excel, etc.)
- Corrupted PDF structure
- Encrypted or password-protected files

**Solutions:**
- Convert to PDF if in different format
- Re-download original file
- Remove password protection
- Contact survey administrator

### "No data extracted"
**Causes:**
- Scanned PDF without OCR
- Non-standard table formats
- Empty or template files

**Solutions:**
- Enable OCR processing
- Try manual data entry
- Check file completeness
- Review format compatibility

### "Duplicate survey detected"
**Causes:**
- Same survey imported previously
- Multiple versions of same data
- File naming inconsistencies

**Solutions:**
- Check import history
- Use update/overwrite option
- Verify file uniqueness
- Review data version control

### "Incomplete data extraction"
**Causes:**
- Complex table structures
- Mixed data formats
- Partial file corruption

**Solutions:**
- Review extraction settings
- Try manual mapping
- Import as CSV alternative
- Split complex files

## Post-Import Actions

### Immediate Next Steps
1. **Review import summary** for any warnings
2. **Check data quality** in Units page
3. **Verify key metrics** on Dashboard
4. **Run basic analysis** to confirm success

### Data Validation
- **Spot-check** a few units for accuracy
- **Compare totals** with known values
- **Review sentiment** analysis results
- **Check for missing** or unusual data

### Analysis Preparation
- **Update filters** to include new data
- **Refresh dashboards** and saved views
- **Configure alerts** for new trends
- **Plan analysis** for stakeholder reports

## Getting Help

### Documentation Resources
- **[File Format Guide](../reference/file-formats.md)** - Detailed format specifications
- **[Troubleshooting](../troubleshooting/import-errors.md)** - Common problems and solutions
- **[Video Tutorials](../reference/video-guides.md)** - Step-by-step visual guides

### Support Options
- **In-app help** during import process
- **Error logs** with detailed diagnostic information
- **Community forum** for user-to-user assistance
- **Email support** for complex issues

---

**Next**: [Exploring Trends](exploring-trends.md)