# Common Issues and Solutions

This guide covers the most frequently encountered issues in InsightLens and provides step-by-step solutions to resolve them quickly.

## Installation and Startup Issues

### Application Won't Start

#### Windows-Specific Issues

**"Windows protected your PC" message**
```
Problem: SmartScreen preventing application launch
Solution:
1. Click "More info" in the dialog
2. Click "Run anyway" button
3. If needed: Right-click app → Properties → Unblock
```

**"Application failed to start correctly"**
```
Problem: Missing system dependencies
Solutions:
1. Install Microsoft Visual C++ Redistributable
2. Update Windows to latest version
3. Run Windows Update and restart
4. Temporarily disable antivirus during installation
```

#### macOS-Specific Issues

**"InsightLens can't be opened because it's from an unidentified developer"**
```
Problem: Gatekeeper security blocking unsigned app
Solution:
1. Right-click InsightLens.app → Open
2. Click "Open" in confirmation dialog
3. Alternative: System Preferences → Security & Privacy → "Open Anyway"
```

**Application crashes on startup**
```
Problem: Missing system frameworks or permissions
Solutions:
1. Check Console.app for crash logs
2. Ensure macOS 10.15+ (Catalina or later)
3. Grant necessary permissions in System Preferences
4. Try launching from Terminal for error messages
```

#### Linux-Specific Issues

**AppImage won't execute**
```
Problem: Missing FUSE or execute permissions
Solutions:
1. Install FUSE: sudo apt install fuse
2. Make executable: chmod +x InsightLens-*.AppImage
3. Run with --no-sandbox flag if needed
4. Check file integrity with md5sum
```

**Database permission errors**
```
Problem: Insufficient file system permissions
Solutions:
1. Check home directory permissions
2. Choose different database location
3. Run: chmod 755 ~/.local/share/InsightLens
4. Verify disk space availability
```

## Data Import Issues

### PDF Import Problems

**"File format not supported"**
```
Problem: Invalid or corrupted PDF file
Diagnosis:
- Check file size (0 bytes indicates corruption)
- Try opening PDF in another application
- Verify file extension is .pdf

Solutions:
1. Re-download original PDF file
2. Convert from other formats using PDF printer
3. Check for password protection and remove
4. Scan for file corruption and repair if needed
```

**"No data extracted from PDF"**
```
Problem: PDF structure not recognized or scanned document
Diagnosis:
- Check if PDF contains selectable text
- Look for table structures in the document
- Verify this is a survey report, not other document type

Solutions:
1. Enable OCR processing in import settings
2. Try converting to text-based PDF
3. Manual data entry for small datasets
4. Contact survey provider for machine-readable format
```

**"Duplicate survey detected"**
```
Problem: Same survey data already exists in database
Diagnosis:
- Check import history for this unit/semester
- Verify unique identifiers (unit code, year, semester)
- Look for multiple versions of same report

Solutions:
1. Use "Update existing" option if data has changed
2. Skip import if truly duplicate
3. Check for version differences and choose latest
4. Clear previous import if it was incomplete
```

### CSV Import Problems

**"Column mapping failed"**
```
Problem: CSV structure doesn't match expected format
Diagnosis:
- Check column headers for standard names
- Verify data types in each column
- Look for missing required fields

Solutions:
1. Use manual column mapping interface
2. Rename headers to standard format
3. Add missing required columns
4. Split complex data into multiple columns
```

**"Invalid data format in row X"**
```
Problem: Data doesn't match expected type or range
Diagnosis:
- Check specific row mentioned in error
- Look for text in numeric fields
- Verify date formats and ranges

Solutions:
1. Fix data in CSV file using spreadsheet application
2. Remove problematic rows temporarily
3. Use data transformation tools
4. Contact data provider for clean dataset
```

## Database and Performance Issues

### Database Connection Problems

**"Cannot connect to database"**
```
Problem: Database file locked, corrupted, or inaccessible
Diagnosis:
- Check if file exists at specified location
- Verify file permissions and ownership
- Look for .db-wal or .db-shm files (indicates active use)

Solutions:
1. Restart InsightLens completely
2. Check database location in settings
3. Restore from backup if file corrupted
4. Choose new database location and re-import data
```

**"Database is locked"**
```
Problem: Another process using database or improper shutdown
Solutions:
1. Close all InsightLens instances
2. Wait 30 seconds and retry
3. Restart computer if problem persists
4. Delete .db-wal and .db-shm files (backup first)
```

### Performance Issues

**Slow application response**
```
Problem: Large dataset or insufficient system resources
Diagnosis:
- Check database size (>1GB may cause slowdowns)
- Monitor system memory usage
- Look for background processes consuming resources

Solutions:
1. Archive old survey data
2. Increase system RAM if possible
3. Use time filters to reduce data scope
4. Close other memory-intensive applications
```

**Charts not loading or displaying**
```
Problem: Browser engine issues or corrupted cache
Solutions:
1. Restart InsightLens application
2. Clear application cache: Settings → Advanced → Clear Cache
3. Check available memory and close other apps
4. Update graphics drivers if using integrated graphics
```

## AI Assistant Issues

### Connection Problems

**"AI service unavailable"**
```
Problem: API key issues or service outage
Diagnosis:
- Check API key validity and format
- Verify internet connection
- Check service status pages

Solutions:
1. Test API key in provider's console
2. Check API key permissions and quotas
3. Try different AI provider as backup
4. Wait if service is experiencing outages
```

**"Request failed" or timeout errors**
```
Problem: Network issues or API rate limiting
Solutions:
1. Check internet connectivity
2. Wait a few minutes for rate limits to reset
3. Try simpler, shorter queries
4. Switch to local AI model if available
```

### Query and Response Issues

**AI provides incorrect or irrelevant answers**
```
Problem: Query ambiguity or insufficient context
Solutions:
1. Be more specific in your questions
2. Include relevant context (time periods, unit types)
3. Break complex questions into smaller parts
4. Use examples to clarify what you're looking for
```

**Charts generated incorrectly**
```
Problem: Data interpretation issues or SQL errors
Solutions:
1. Verify your question matches available data
2. Check if filtered data is too limited
3. Try rephrasing the question differently
4. Use manual chart creation for complex visualizations
```

## User Interface Issues

### Display and Rendering Problems

**Blank or white screens**
```
Problem: Rendering engine issues or corrupted interface
Solutions:
1. Restart the application
2. Check display scaling settings (100% recommended)
3. Update graphics drivers
4. Try different display/monitor if available
```

**Text too small or large**
```
Problem: System scaling or font size settings
Solutions:
1. Adjust system display scaling
2. Use browser zoom if available (Ctrl/Cmd + or -)
3. Check accessibility settings
4. Update application for better scaling support
```

### Navigation and Interaction Issues

**Buttons or links not responding**
```
Problem: JavaScript errors or focus issues
Solutions:
1. Try using Tab key to navigate
2. Restart application to clear any errors
3. Check for background processes interfering
4. Try clicking slightly different area of button
```

**Sidebar collapsed and won't expand**
```
Problem: UI state corruption or narrow display
Solutions:
1. Use keyboard shortcut: Ctrl/Cmd + \
2. Check window size and expand if narrow
3. Restart application to reset UI state
4. Try double-clicking the header area
```

## Network and Connectivity Issues

### Internet Connection Problems

**"Unable to check for updates"**
```
Problem: Firewall blocking or no internet access
Solutions:
1. Check internet connectivity in browser
2. Configure firewall to allow InsightLens
3. Check proxy settings if in corporate environment
4. Try connecting from different network
```

**"Cannot download sample data"**
```
Problem: Network restrictions or server issues
Solutions:
1. Verify internet connection
2. Check if downloads are blocked by security software
3. Try again later if server is busy
4. Manual sample data installation
```

## Data Quality and Accuracy Issues

### Unexpected Results

**Charts showing no data**
```
Problem: Filters too restrictive or no matching data
Diagnosis:
- Check active filters and time ranges
- Verify data exists for selected criteria
- Look for spelling errors in unit codes

Solutions:
1. Clear all filters and try again
2. Expand time range to include more data
3. Check if data was imported successfully
4. Verify unit codes and naming conventions
```

**Sentiment analysis seems incorrect**
```
Problem: Language processing limitations or unusual text
Solutions:
1. Review original comments for context
2. Check if comments are in supported language
3. Consider that sentiment can be subjective
4. Use multiple analysis methods for validation
```

### Missing or Incomplete Data

**Some units don't appear in analysis**
```
Problem: Import issues or filtering excluding units
Diagnosis:
- Check import logs for these specific units
- Verify units meet current filter criteria
- Look for data quality issues

Solutions:
1. Re-import affected survey files
2. Check spelling and formatting of unit codes
3. Adjust filters to include missing units
4. Verify survey completion before import
```

## Getting Help

### Diagnostic Information

When reporting issues, include:
- **Operating system** and version
- **InsightLens version** (Help → About)
- **Error messages** (exact text)
- **Steps to reproduce** the problem
- **Sample data** that causes the issue (if possible)

### Self-Help Resources

1. **Check documentation** for specific feature guides
2. **Search error messages** in this troubleshooting guide
3. **Review video tutorials** for visual guidance
4. **Test with sample data** to isolate issues

### Contact Support

- **Community Forum**: Share experiences with other users
- **GitHub Issues**: Report bugs and request features
- **Email Support**: support@insightlens.app for personalized help
- **Live Chat**: Available during business hours (if enabled)

### Before Contacting Support

1. **Try restarting** the application
2. **Update to latest version** if available
3. **Check known issues** in release notes
4. **Gather diagnostic information** mentioned above

---

**Next**: [Connection Errors](connection-errors.md)