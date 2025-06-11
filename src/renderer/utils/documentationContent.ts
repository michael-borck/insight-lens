// Embedded documentation content for in-app viewing
export interface DocSection {
  id: string;
  title: string;
  content: string;
  category: string;
  sourceUrl?: string;
}

export const documentationSections: DocSection[] = [
  {
    id: 'installation',
    title: 'Installation Guide',
    category: 'getting-started',
    sourceUrl: 'https://insightlens.github.io/insight-lens/getting-started/installation',
    content: `# Installation Guide

Welcome to InsightLens! This guide will help you install and set up the application on your computer.

## System Requirements

Before installing InsightLens, ensure your system meets these minimum requirements:

### Windows
- **OS**: Windows 10 or later (64-bit)
- **RAM**: 4 GB minimum, 8 GB recommended
- **Storage**: 500 MB free space for application
- **Additional**: 1 GB for survey data storage

### macOS
- **OS**: macOS 10.15 (Catalina) or later
- **RAM**: 4 GB minimum, 8 GB recommended
- **Storage**: 500 MB free space for application
- **Additional**: 1 GB for survey data storage

### Linux
- **OS**: Ubuntu 18.04+ / Debian 10+ / Fedora 32+ / other modern distributions
- **RAM**: 4 GB minimum, 8 GB recommended
- **Storage**: 500 MB free space for application
- **Additional**: 1 GB for survey data storage

## Download InsightLens

1. Visit the [InsightLens releases page](https://github.com/michael-borck/insight-lens/releases)
2. Download the appropriate installer for your operating system:
   - **Windows**: \`InsightLens-Setup-1.0.0.exe\`
   - **macOS**: \`InsightLens-1.0.0.dmg\`
   - **Linux**: \`InsightLens-1.0.0.AppImage\`

## Installation Steps

### Windows Installation

1. **Download** the installer file
2. **Run** \`InsightLens-Setup-1.0.0.exe\` as Administrator
3. **Follow** the installation wizard:
   - Accept the license agreement
   - Choose installation directory (default is recommended)
   - Select additional tasks (desktop shortcut, start menu entry)
4. **Launch** InsightLens from the desktop shortcut or Start menu

### macOS Installation

1. **Download** the DMG file
2. **Open** \`InsightLens-1.0.0.dmg\`
3. **Drag** InsightLens.app to your Applications folder
4. **Right-click** on InsightLens in Applications and select "Open"
5. **Confirm** opening the application (macOS security prompt)

> **Note**: If you see a security warning, go to System Preferences > Security & Privacy and click "Open Anyway"

### Linux Installation

1. **Download** the AppImage file
2. **Make executable**: 
   \`\`\`bash
   chmod +x InsightLens-1.0.0.AppImage
   \`\`\`
3. **Run** the application:
   \`\`\`bash
   ./InsightLens-1.0.0.AppImage
   \`\`\`
4. **Optional**: Create a desktop entry for easier access

## Post-Installation Setup

After installation, you'll need to complete the initial setup:

### 1. First Launch
- InsightLens will create a default database in your home directory
- The welcome screen will guide you through basic configuration

### 2. Database Location (Optional)
- Choose where to store your survey database
- Consider using a cloud-synced folder for automatic backups
- Default location: \`~/InsightLens/surveys.db\`

### 3. AI Setup (Optional)
If you plan to use AI features:
- Configure your AI provider (OpenAI, Claude, or local)
- Add your API key in Settings
- Test the connection

## Verification

To verify your installation:

1. **Launch InsightLens**
2. **Check the About page** (Help > About) for version information
3. **Test basic functionality** by exploring the dashboard
4. **Import sample data** if available

## Troubleshooting Installation

### Windows Issues

**Problem**: "Windows protected your PC" message
- **Solution**: Click "More info" then "Run anyway"

**Problem**: Installation fails
- **Solution**: Run installer as Administrator
- **Alternative**: Temporarily disable antivirus software

### macOS Issues

**Problem**: "InsightLens can't be opened because it's from an unidentified developer"
- **Solution**: Right-click the app and select "Open"
- **Alternative**: System Preferences > Security & Privacy > "Open Anyway"

**Problem**: Application won't start
- **Solution**: Check Console.app for error messages
- **Alternative**: Reinstall from fresh download

### Linux Issues

**Problem**: AppImage won't run
- **Solution**: Ensure FUSE is installed: \`sudo apt install fuse\`
- **Alternative**: Use \`--no-sandbox\` flag

**Problem**: Database permission errors
- **Solution**: Ensure write permissions in home directory
- **Alternative**: Choose different database location

## Next Steps

Once installation is complete, proceed to First Run Setup to configure your preferences and start analyzing survey data.`
  },
  
  {
    id: 'importing-data',
    title: 'Importing Survey Data',
    category: 'workflow',
    sourceUrl: 'https://insightlens.github.io/insight-lens/essential-workflow/importing-data',
    content: `# Importing Survey Data

Learn how to import your unit survey data into InsightLens for analysis.

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

### Method 3: Folder Import

For bulk importing entire directories:

1. **Click "Import Folder"** option
2. **Select directory** containing survey files
3. **Choose file types** to include/exclude
4. **Start batch processing** with progress tracking

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

## Best Practices

### File Organization
**Before Importing:**
- Organize files by semester and year
- Use consistent naming conventions
- Remove duplicate or test files
- Ensure files are not corrupted

**Naming Conventions:**
- \`UNIT_YEAR_SEMESTER.pdf\` (e.g., ISYS2001_2024_S1.pdf)
- \`Campus_Unit_Period.pdf\` for multiple campuses
- \`Batch_YYYYMMDD.pdf\` for bulk imports

### Data Quality
**Maximize Success:**
- Use original, unmodified survey reports
- Ensure PDFs are not password-protected
- Check for complete data (no missing pages)
- Verify survey completion before importing

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
- Review data version control`
  },
  
  {
    id: 'ai-setup',
    title: 'Setting Up AI Providers',
    category: 'ai',
    sourceUrl: 'https://insightlens.github.io/insight-lens/ai-chat/setup-ai-providers',
    content: `# Setting Up AI Providers

InsightLens supports multiple AI providers for natural language analysis.

## Supported AI Providers

### OpenAI (ChatGPT)
- **Models**: GPT-4o, GPT-4o Mini, GPT-4 Turbo, GPT-3.5 Turbo
- **Best For**: General analysis, reliable responses
- **Cost**: Pay-per-use via OpenAI API
- **Setup Difficulty**: Easy

### Anthropic (Claude)
- **Models**: Claude 3.5 Sonnet, Claude 3.5 Haiku, Claude 3 Opus
- **Best For**: Detailed analysis, safety-focused responses
- **Cost**: Pay-per-use via Anthropic API
- **Setup Difficulty**: Easy

### Local Models (Ollama)
- **Models**: Llama 3.2, Llama 3.1, Mistral, Qwen 2.5 Coder
- **Best For**: Privacy, offline use, no usage costs
- **Cost**: Free (hardware requirements apply)
- **Setup Difficulty**: Moderate

## Getting API Keys

### OpenAI API Key

1. **Visit** [OpenAI's website](https://platform.openai.com/)
2. **Create account** or sign in to existing account
3. **Navigate** to API Keys section
4. **Create new secret key**
5. **Copy and save** the key securely (starts with \`sk-\`)

**Important Notes:**
- Keys are only shown once - save immediately
- Keep keys secure and never share publicly
- Monitor usage to control costs
- Set usage limits to prevent unexpected charges

### Anthropic API Key

1. **Visit** [Anthropic's Console](https://console.anthropic.com/)
2. **Create account** or sign in
3. **Go to** API Keys section
4. **Generate new key**
5. **Copy and save** the key securely (starts with \`sk-ant-\`)

## Configuration in InsightLens

### Basic Setup Steps

1. **Open InsightLens** and navigate to Settings (⚙️ in sidebar)
2. **Locate** the "AI Assistant" section
3. **Select** your preferred provider from dropdown
4. **Enter** your API key in the secure field
5. **Choose** your preferred model
6. **Test connection** to verify setup

### Provider-Specific Configuration

#### OpenAI Setup
\`\`\`
API Provider: OpenAI
API URL: https://api.openai.com (auto-filled)
API Key: sk-your-openai-key-here
Model: gpt-4o-mini (recommended for most users)
\`\`\`

**Model Selection Guide:**
- **GPT-4o Mini**: Best balance of cost and performance
- **GPT-4o**: Higher quality, more expensive
- **GPT-4 Turbo**: Good for complex analysis
- **GPT-3.5 Turbo**: Budget option, lower quality

#### Anthropic (Claude) Setup
\`\`\`
API Provider: Claude (Anthropic)
API URL: https://api.anthropic.com (auto-filled)
API Key: sk-ant-your-anthropic-key-here
Model: claude-3-5-sonnet-20241022 (recommended)
\`\`\`

#### Ollama (Local) Setup
\`\`\`
API Provider: Ollama (Local)
API URL: http://localhost:11434 (default)
Model: llama3.2 (or your installed model)
\`\`\`

**Prerequisites:**
- Ollama installed and running on your system
- At least one model downloaded
- Sufficient RAM (8GB+ recommended)

## Local AI Setup (Ollama)

### Installing Ollama

#### Windows/macOS/Linux
1. **Download** Ollama from [ollama.ai](https://ollama.ai/)
2. **Install** following platform instructions
3. **Verify installation**: \`ollama --version\`

### Installing Models

#### Recommended Models
\`\`\`bash
# Fast, good for basic analysis
ollama pull llama3.2

# Better quality, moderate resource usage
ollama pull llama3.1

# Good alternative
ollama pull mistral

# Excellent for structured data analysis
ollama pull qwen2.5-coder
\`\`\`

### System Requirements for Local Models

#### Minimum Requirements
- **RAM**: 8GB (for 3B models)
- **Storage**: 4GB per model
- **CPU**: Modern multi-core processor

#### Recommended Specifications
- **RAM**: 16GB+ (for 7B+ models)
- **GPU**: Optional but improves performance
- **Storage**: SSD for better model loading

## Testing Your Setup

### Connection Test

1. **In Settings**, click "Test Connection" button
2. **Wait for response** - should show green checkmark
3. **Check error messages** if test fails
4. **Verify model availability** in dropdown

### First AI Query

1. **Navigate** to "Ask InsightLens" page
2. **Enter simple question**: "How many units are in my database?"
3. **Wait for response** and generated chart
4. **Verify** results match your expectations

## Security Best Practices

### API Key Security
- **Never share** API keys publicly
- **Use environment variables** when possible
- **Rotate keys** periodically
- **Revoke unused** or compromised keys

### Data Privacy
- **Understand** what data is sent to AI providers
- **Review** privacy policies of your chosen provider
- **Consider local models** for sensitive data
- **Implement data minimization** strategies`
  },
  
  {
    id: 'troubleshooting',
    title: 'Common Issues and Solutions',
    category: 'help',
    sourceUrl: 'https://insightlens.github.io/insight-lens/troubleshooting/common-issues',
    content: `# Common Issues and Solutions

This guide covers the most frequently encountered issues in InsightLens.

## Installation and Startup Issues

### Application Won't Start

#### Windows-Specific Issues

**"Windows protected your PC" message**
\`\`\`
Problem: SmartScreen preventing application launch
Solution:
1. Click "More info" in the dialog
2. Click "Run anyway" button
3. If needed: Right-click app → Properties → Unblock
\`\`\`

**"Application failed to start correctly"**
\`\`\`
Problem: Missing system dependencies
Solutions:
1. Install Microsoft Visual C++ Redistributable
2. Update Windows to latest version
3. Run Windows Update and restart
4. Temporarily disable antivirus during installation
\`\`\`

#### macOS-Specific Issues

**"InsightLens can't be opened because it's from an unidentified developer"**
\`\`\`
Problem: Gatekeeper security blocking unsigned app
Solution:
1. Right-click InsightLens.app → Open
2. Click "Open" in confirmation dialog
3. Alternative: System Preferences → Security & Privacy → "Open Anyway"
\`\`\`

#### Linux-Specific Issues

**AppImage won't execute**
\`\`\`
Problem: Missing FUSE or execute permissions
Solutions:
1. Install FUSE: sudo apt install fuse
2. Make executable: chmod +x InsightLens-*.AppImage
3. Run with --no-sandbox flag if needed
4. Check file integrity with md5sum
\`\`\`

## Data Import Issues

### PDF Import Problems

**"File format not supported"**
\`\`\`
Problem: Invalid or corrupted PDF file
Solutions:
1. Re-download original PDF file
2. Convert from other formats using PDF printer
3. Check for password protection and remove
4. Scan for file corruption and repair if needed
\`\`\`

**"No data extracted from PDF"**
\`\`\`
Problem: PDF structure not recognized or scanned document
Solutions:
1. Enable OCR processing in import settings
2. Try converting to text-based PDF
3. Manual data entry for small datasets
4. Contact survey provider for machine-readable format
\`\`\`

**"Duplicate survey detected"**
\`\`\`
Problem: Same survey data already exists in database
Solutions:
1. Use "Update existing" option if data has changed
2. Skip import if truly duplicate
3. Check for version differences and choose latest
4. Clear previous import if it was incomplete
\`\`\`

## Database and Performance Issues

### Database Connection Problems

**"Cannot connect to database"**
\`\`\`
Problem: Database file locked, corrupted, or inaccessible
Solutions:
1. Restart InsightLens completely
2. Check database location in settings
3. Restore from backup if file corrupted
4. Choose new database location and re-import data
\`\`\`

**"Database is locked"**
\`\`\`
Problem: Another process using database or improper shutdown
Solutions:
1. Close all InsightLens instances
2. Wait 30 seconds and retry
3. Restart computer if problem persists
4. Delete .db-wal and .db-shm files (backup first)
\`\`\`

### Performance Issues

**Slow application response**
\`\`\`
Problem: Large dataset or insufficient system resources
Solutions:
1. Archive old survey data
2. Increase system RAM if possible
3. Use time filters to reduce data scope
4. Close other memory-intensive applications
\`\`\`

**Charts not loading or displaying**
\`\`\`
Problem: Browser engine issues or corrupted cache
Solutions:
1. Restart InsightLens application
2. Clear application cache: Settings → Advanced → Clear Cache
3. Check available memory and close other apps
4. Update graphics drivers if using integrated graphics
\`\`\`

## AI Assistant Issues

### Connection Problems

**"AI service unavailable"**
\`\`\`
Problem: API key issues or service outage
Solutions:
1. Test API key in provider's console
2. Check API key permissions and quotas
3. Try different AI provider as backup
4. Wait if service is experiencing outages
\`\`\`

**"Request failed" or timeout errors**
\`\`\`
Problem: Network issues or API rate limiting
Solutions:
1. Check internet connectivity
2. Wait a few minutes for rate limits to reset
3. Try simpler, shorter queries
4. Switch to local AI model if available
\`\`\`

### Query and Response Issues

**AI provides incorrect or irrelevant answers**
\`\`\`
Problem: Query ambiguity or insufficient context
Solutions:
1. Be more specific in your questions
2. Include relevant context (time periods, unit types)
3. Break complex questions into smaller parts
4. Use examples to clarify what you're looking for
\`\`\`

**Charts generated incorrectly**
\`\`\`
Problem: Data interpretation issues or SQL errors
Solutions:
1. Verify your question matches available data
2. Check if filtered data is too limited
3. Try rephrasing the question differently
4. Use manual chart creation for complex visualizations
\`\`\`

## Getting Help

### Contact Support

- **Community Forum**: Share experiences with other users
- **GitHub Issues**: Report bugs and request features
- **Email Support**: support@insightlens.app for personalized help

### Before Contacting Support

1. **Try restarting** the application
2. **Update to latest version** if available
3. **Check known issues** in release notes
4. **Gather diagnostic information**:
   - Operating system and version
   - InsightLens version (Help → About)
   - Error messages (exact text)
   - Steps to reproduce the problem`
  },
  
  {
    id: 'keyboard-shortcuts',
    title: 'Keyboard Shortcuts',
    category: 'reference',
    sourceUrl: 'https://insightlens.github.io/insight-lens/reference/keyboard-shortcuts',
    content: `# Keyboard Shortcuts

Master InsightLens with these keyboard shortcuts for faster navigation and analysis.

## Global Shortcuts

| Shortcut | Action | Description |
|----------|--------|-------------|
| \`Ctrl/Cmd + F\` | Quick Search | Search across all data and features |
| \`Ctrl/Cmd + ,\` | Settings | Open application settings |
| \`Ctrl/Cmd + R\` | Refresh | Reload current page/data |
| \`Ctrl/Cmd + \\\` | Toggle Sidebar | Show/hide navigation sidebar |
| \`F11\` | Fullscreen | Toggle fullscreen mode |
| \`Ctrl/Cmd + Q\` | Quit | Exit application |

## Navigation Shortcuts

| Shortcut | Action | Description |
|----------|--------|-------------|
| \`Alt + 1\` | Dashboard | Navigate to main dashboard |
| \`Alt + 2\` | Units | Go to units overview page |
| \`Alt + 3\` | AI Chat | Open AI assistant |
| \`Alt + 4\` | Import | Access data import page |
| \`Alt + 5\` | Documentation | Open documentation |
| \`Alt + 6\` | Settings | Open settings page |
| \`Ctrl/Cmd + H\` | Home | Return to dashboard |

## Data Analysis Shortcuts

| Shortcut | Action | Description |
|----------|--------|-------------|
| \`N\` | New Analysis | Start new analysis or query |
| \`E\` | Export | Export current view/chart |
| \`D\` | Download | Download data for current view |
| \`P\` | Print | Print current page |
| \`Ctrl/Cmd + Z\` | Undo | Undo last filter/action |
| \`Ctrl/Cmd + Y\` | Redo | Redo last undone action |

## Chart and Visualization Shortcuts

| Shortcut | Action | Description |
|----------|--------|-------------|
| \`+\` or \`=\` | Zoom In | Zoom into chart details |
| \`-\` | Zoom Out | Zoom out of chart |
| \`0\` | Reset Zoom | Return to default zoom level |
| \`Space\` | Pan Mode | Hold and drag to pan charts |
| \`Shift + Click\` | Multi-select | Select multiple data points |
| \`Ctrl/Cmd + A\` | Select All | Select all visible data points |

## AI Assistant Shortcuts

| Shortcut | Action | Description |
|----------|--------|-------------|
| \`Ctrl/Cmd + '\` | AI Chat | Quick access to AI assistant |
| \`Shift + Enter\` | New Line | Add line break in AI query |
| \`Enter\` | Send Query | Submit question to AI |
| \`↑\` | Previous Query | Recall previous question |
| \`↓\` | Next Query | Navigate forward in query history |
| \`Ctrl/Cmd + L\` | Clear Chat | Clear conversation history |

## Import and Data Management

| Shortcut | Action | Description |
|----------|--------|-------------|
| \`Ctrl/Cmd + O\` | Open File | Browse for files to import |
| \`Ctrl/Cmd + I\` | Import | Open import dialog |
| \`Ctrl/Cmd + Shift + I\` | Bulk Import | Import multiple files |
| \`Ctrl/Cmd + S\` | Save | Save current state/view |

## Platform-Specific Variations

### Windows Additional Shortcuts
| Shortcut | Action | Description |
|----------|--------|-------------|
| \`Alt + F4\` | Close Window | Close current window |
| \`Alt + Tab\` | Switch Apps | Switch between applications |

### macOS Additional Shortcuts
| Shortcut | Action | Description |
|----------|--------|-------------|
| \`Cmd + W\` | Close Window | Close current window |
| \`Cmd + M\` | Minimize | Minimize window |
| \`Cmd + Tab\` | Switch Apps | Switch between applications |

### Linux Additional Shortcuts
| Shortcut | Action | Description |
|----------|--------|-------------|
| \`Alt + F4\` | Close Window | Close current window |
| \`Alt + Tab\` | Switch Apps | Switch between applications |

## Tips for Efficient Use

### Memory Aids
- **Navigation**: Alt + Number follows sidebar order
- **Common Actions**: Ctrl/Cmd + Letter (standard conventions)
- **View Controls**: Function keys and symbols
- **Context**: Letter keys for page-specific actions

### Workflow Optimization
1. **Learn core navigation** shortcuts first (Alt + 1-6)
2. **Master your most-used features** (likely filtering and export)
3. **Practice AI shortcuts** if you use AI features frequently
4. **Customize** shortcuts for your specific workflow

### Accessibility Benefits
- **Faster navigation** for power users
- **Reduced mouse dependency** for accessibility needs
- **Consistent experience** across different platforms
- **Muscle memory** development for frequent tasks`
  }
];

export function getDocumentationSection(id: string): DocSection | undefined {
  return documentationSections.find(section => section.id === id);
}

export function getDocumentationByCategory(category: string): DocSection[] {
  return documentationSections.filter(section => section.category === category);
}

export function getAllDocumentationSections(): DocSection[] {
  return documentationSections;
}