# Frequently Asked Questions

Find quick answers to common questions about InsightLens, from basic usage to advanced features.

## General Questions

### What is InsightLens?

**Q: What exactly does InsightLens do?**

A: InsightLens is a desktop application designed specifically for university lecturers and academic staff to analyze student unit survey data. It transforms PDF survey reports and CSV data into interactive visualizations, trend analysis, and AI-powered insights to help improve teaching quality and student satisfaction.

**Q: Is InsightLens free to use?**

A: Yes, InsightLens is free and open-source software released under the MIT license. You can download, use, modify, and distribute it at no cost. However, if you choose to use AI features, you may need to pay for AI service API usage (OpenAI, Claude) or use free local models.

**Q: What institutions or survey formats are supported?**

A: InsightLens works with various institutional survey formats. It has built-in support for common survey report structures and can be configured for different institutions. If your survey format isn't automatically recognized, you can import data via CSV files.

### Privacy and Data Security

**Q: Where is my survey data stored?**

A: All your survey data is stored locally on your computer in an encrypted SQLite database. No survey data is ever sent to external servers, including AI providers. Only your questions to AI assistants are transmitted (not the underlying survey data).

**Q: Can I use InsightLens offline?**

A: Yes! InsightLens works completely offline for all core features including data import, visualization, and analysis. AI features require internet connection unless you're using local AI models (Ollama).

**Q: Is my data shared with AI providers?**

A: No, your survey data is never shared with AI providers. When you ask questions using the AI assistant, only your question and relevant database schema information are sent to generate appropriate queries. The actual survey responses and student data remain on your device.

## Installation and Setup

**Q: What are the system requirements?**

A: InsightLens runs on:
- **Windows**: Windows 10 or later (64-bit)
- **macOS**: macOS 10.15 (Catalina) or later
- **Linux**: Modern distributions (Ubuntu 18.04+, etc.)
- **RAM**: 4GB minimum, 8GB recommended
- **Storage**: 500MB for application + space for your data

**Q: Why does my antivirus flag InsightLens?**

A: Some antivirus software may flag unsigned applications. This is a false positive. InsightLens is open-source and you can verify its safety by checking the source code on GitHub. You may need to add an exception in your antivirus software.

**Q: Can I install InsightLens on multiple computers?**

A: Yes, you can install InsightLens on as many computers as you need. Since data is stored locally, you'll need to sync your database file (via cloud storage) or import data separately on each machine.

## Data Import and Management

**Q: What file formats can I import?**

A: InsightLens supports:
- **PDF files**: Survey reports from various institutions
- **CSV files**: Structured survey data exports
- **Bulk imports**: Multiple files at once
- **OCR processing**: Scanned PDFs (with reduced accuracy)

**Q: How do I import surveys from my institution?**

A: 
1. Download PDF survey reports from your institution's system
2. Open InsightLens and go to the Import page
3. Drag and drop the PDF files onto the upload area
4. Wait for processing and review the import summary

**Q: What if my survey format isn't recognized?**

A: You have several options:
1. Export data to CSV format and import that way
2. Contact support to add support for your format
3. Use manual data entry for small datasets
4. Configure custom parsing rules (advanced users)

**Q: Can I edit survey data after importing?**

A: Currently, InsightLens doesn't support direct editing of imported survey data. If you need to make changes, you should:
1. Correct the source data (PDF or CSV)
2. Re-import the corrected file
3. Use the "Update existing" option to replace previous data

## Using Features

**Q: How do I create charts and visualizations?**

A: InsightLens offers multiple ways to create visualizations:
1. **Automatic charts** on the Dashboard showing key metrics
2. **Unit-specific charts** on individual unit pages
3. **AI-generated charts** by asking questions in natural language
4. **Interactive filtering** to customize existing charts

**Q: What AI features are available?**

A: The AI assistant can:
- Answer questions about your survey data
- Generate custom charts and visualizations
- Provide insights and trend analysis
- Suggest areas that need attention
- Help interpret complex data patterns

**Q: How accurate is the sentiment analysis?**

A: Sentiment analysis accuracy depends on several factors:
- Language clarity and context in comments
- Cultural and linguistic variations
- Subject-specific terminology
- Comment length and detail

Results should be used as indicators rather than definitive assessments. Always review original comments for context.

**Q: Can I export charts and reports?**

A: Yes, you can export:
- **Individual charts** as PNG, SVG, or PDF
- **Data tables** as CSV or Excel files
- **Dashboard views** as image files
- **Custom reports** with multiple charts and analysis

## AI Assistant

**Q: Which AI provider should I choose?**

A: Each has different strengths:
- **OpenAI (ChatGPT)**: Reliable, good general performance, moderate cost
- **Claude (Anthropic)**: Excellent reasoning, safety-focused, higher cost
- **Local models (Ollama)**: Private, free after setup, requires good hardware

**Q: How much does AI usage cost?**

A: Costs vary by provider and usage:
- **OpenAI**: Roughly $0.001-0.03 per question depending on model
- **Claude**: Roughly $0.001-0.05 per question depending on model
- **Local models**: Free after initial setup (hardware costs apply)

**Q: Can I use AI without internet?**

A: Yes, if you set up local AI models using Ollama. This requires:
- Installing Ollama software
- Downloading AI models (several GB each)
- Sufficient computer memory (8GB+ RAM recommended)

**Q: Why doesn't the AI understand my question?**

A: Try these tips:
- Be more specific about what you want to analyze
- Include context like time periods or unit types
- Break complex questions into simpler parts
- Use examples to clarify your request

## Technical Issues

**Q: The application is running slowly. What can I do?**

A: Performance tips:
1. **Reduce data scope** using time filters
2. **Archive old data** you no longer need
3. **Close other applications** to free memory
4. **Restart InsightLens** periodically
5. **Check database size** (large databases slow performance)

**Q: Charts aren't displaying correctly. How to fix?**

A: Try these solutions:
1. **Refresh the page** or restart the application
2. **Check your filters** - they might be too restrictive
3. **Verify data exists** for the selected criteria
4. **Clear application cache** in Settings
5. **Update graphics drivers** if using integrated graphics

**Q: Import failed with an error. What should I do?**

A: Troubleshooting steps:
1. **Check the error message** for specific guidance
2. **Verify file format** and ensure it's not corrupted
3. **Try importing a single file** to isolate the problem
4. **Check file permissions** and available disk space
5. **Review the troubleshooting guide** for your specific error

## Data Analysis

**Q: How do I identify units that need attention?**

A: Use these approaches:
1. **Quick Insights** in the sidebar highlight concerning trends
2. **Filter by low satisfaction scores** (< 3.0 on 5-point scale)
3. **Look for declining trends** over multiple semesters
4. **Check response rates** - low rates may indicate problems
5. **Review negative sentiment** patterns in comments

**Q: What's a good response rate for surveys?**

A: Response rate benchmarks vary by institution, but generally:
- **>70%**: Excellent response rate, highly reliable
- **50-70%**: Good response rate, reliable for most purposes
- **30-50%**: Moderate response rate, use with caution
- **<30%**: Low response rate, results may not be representative

**Q: How do I compare units fairly?**

A: Consider these factors:
- **Unit level**: Compare undergraduate with undergraduate
- **Discipline**: Similar fields have similar characteristics
- **Delivery mode**: Online vs face-to-face differences
- **Class size**: Large classes often have different dynamics
- **Time period**: Same semester comparisons are most valid

**Q: What trends should I pay attention to?**

A: Key trends to monitor:
- **Declining satisfaction** over consecutive semesters
- **Widening gaps** between different question areas
- **Decreasing response rates** (may indicate problems)
- **Negative sentiment increase** in student comments
- **Performance below** institutional benchmarks

## Collaboration and Sharing

**Q: Can multiple people use the same InsightLens database?**

A: Yes, but with limitations:
- **Shared network drive**: Multiple users can access same database
- **Cloud sync**: Use Dropbox/OneDrive to sync database between devices
- **Turn-taking**: Only one person should use the database at a time
- **Export/import**: Share specific data rather than entire database

**Q: How do I share insights with colleagues?**

A: Several sharing options:
1. **Export charts** as images for presentations
2. **Generate reports** with key findings
3. **Share database file** (ensure privacy compliance)
4. **Screenshot dashboards** for quick updates
5. **Export data** for use in other analytics tools

**Q: Can I create presentations from InsightLens?**

A: While InsightLens doesn't create presentations directly, you can:
- Export charts as high-quality images
- Generate data tables for inclusion in reports
- Take screenshots of dashboard views
- Use exported data in PowerPoint or other tools

## Getting Help

**Q: Where can I find more detailed help?**

A: Help resources include:
- **Built-in help**: Click help icons throughout the interface
- **Documentation**: Comprehensive guides for all features
- **Video tutorials**: Step-by-step visual guides
- **Community forum**: User discussions and tips
- **Email support**: support@insightlens.app

**Q: How do I report bugs or request features?**

A: You can:
- **GitHub Issues**: Report bugs and request features
- **Email support**: Detailed bug reports with steps to reproduce
- **Community forum**: Discuss with other users first
- **In-app feedback**: Use built-in feedback forms

**Q: Is training available?**

A: Training options include:
- **Self-paced tutorials**: Built into the application
- **Video guides**: Available online
- **Documentation**: Comprehensive written guides
- **Webinars**: Periodic training sessions (check website)
- **Custom training**: Available for institutional licenses

---

**Related**: [Glossary](glossary.md) | [Keyboard Shortcuts](keyboard-shortcuts.md)