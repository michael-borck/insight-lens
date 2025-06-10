# First Run Setup

Congratulations on installing InsightLens! This guide will walk you through the initial setup process to get you up and running quickly.

## Welcome Screen

When you first launch InsightLens, you'll be greeted with a welcome screen that provides:

- **Quick overview** of InsightLens features
- **Setup wizard** for initial configuration
- **Sample data option** for exploring features
- **Links to documentation** and help resources

## Initial Configuration

### Step 1: Database Location

The first important decision is where to store your survey database.

#### Default Location
- **Windows**: `C:\Users\[username]\InsightLens\surveys.db`
- **macOS**: `~/InsightLens/surveys.db`
- **Linux**: `~/.local/share/InsightLens/surveys.db`

#### Custom Location Options

**Cloud Sync Folder** (Recommended)
- Place database in Dropbox, OneDrive, or Google Drive folder
- Enables automatic backup and sync across devices
- Example: `~/Dropbox/InsightLens/surveys.db`

**External Drive**
- USB drive or external SSD for portability
- Useful for traveling between offices
- Remember to safely eject before unplugging

**Network Location**
- Shared network drive for team access
- Requires stable network connection
- Consider permissions and backup strategy

#### Setting Database Location

1. Click **"Choose Database Location"** on welcome screen
2. Browse to your preferred folder
3. Click **"Select Folder"** 
4. InsightLens will create `surveys.db` in that location

### Step 2: Privacy Settings

InsightLens is designed with privacy in mind. Configure these settings:

#### Data Storage
- ✅ **Local Storage**: All data stays on your device
- ✅ **No Cloud Processing**: Survey data never sent to external servers
- ✅ **Encrypted Database**: Survey responses are encrypted at rest

#### AI Features (Optional)
- **Completely Optional**: AI features can be disabled entirely
- **Your Choice of Provider**: OpenAI, Claude, or local models
- **No Data Sharing**: Survey data is not sent to AI providers
- **Query Only**: Only your questions are sent, not survey responses

### Step 3: Initial Data

Choose how to start using InsightLens:

#### Option A: Import Sample Data
- Pre-loaded with realistic sample survey data
- Perfect for exploring features and learning
- Can be deleted later when ready for real data

#### Option B: Start Fresh
- Empty database ready for your survey imports
- Clean slate for production use
- Can add sample data later if needed

#### Option C: Import Existing Data
- If you have survey PDFs ready to import
- Skip sample data and start with real surveys
- Follow the [import guide](../essential-workflow/importing-data.md)

## Feature Tour

After initial setup, InsightLens offers an optional guided tour:

### Dashboard Tour
- **Overview Cards**: Key metrics at a glance
- **Quick Charts**: Immediate visual insights
- **Recent Activity**: Last imported surveys
- **Quick Actions**: Common tasks and shortcuts

### Navigation Tour
- **Sidebar Menu**: Main navigation and features
- **Quick Insights**: Trending data and alerts
- **Settings Access**: Configuration and preferences
- **Help Resources**: Documentation and support

### Chart Tour
- **Interactive Elements**: Hover and click features
- **Filtering Options**: Drill down into data
- **Export Capabilities**: Save charts and data
- **Customization**: Personalize your views

## Settings Overview

Access settings anytime via the sidebar menu:

### Database Settings
- **Location**: Change database path if needed
- **Backup**: Schedule automatic backups
- **Export**: Create data export files
- **Maintenance**: Database optimization tools

### Display Settings
- **Theme**: Light or dark mode
- **Chart Colors**: Customize visualization colors
- **Font Size**: Adjust for readability
- **Language**: Select interface language

### AI Settings (Optional)
- **Provider**: Choose AI service (OpenAI, Claude, local)
- **API Key**: Enter your API credentials
- **Model**: Select specific AI model
- **Connection**: Test and verify setup

### Privacy Settings
- **Analytics**: Usage data collection (opt-in)
- **Crash Reports**: Error reporting (helps development)
- **Updates**: Automatic update checking
- **Telemetry**: Performance monitoring (opt-in)

## Verification Checklist

Before proceeding, verify your setup:

- [ ] **Database Location Set**: Confirm database is in desired location
- [ ] **Sample Data Loaded**: Or ready to import real data
- [ ] **Navigation Familiar**: Understand sidebar and main areas
- [ ] **Settings Configured**: Basic preferences set
- [ ] **AI Setup Complete**: If using AI features
- [ ] **Backup Plan**: Database backup strategy in place

## Common First-Run Issues

### Database Creation Failed
**Symptoms**: Error message about database creation
**Solutions**:
- Check folder permissions
- Choose different location
- Run as administrator (Windows)

### Sample Data Missing
**Symptoms**: Empty dashboard after selecting sample data
**Solutions**:
- Restart application
- Manually import sample data
- Check database location

### Tour Skipped Accidentally
**Solutions**:
- Access Help > Feature Tour anytime
- Visit dashboard overview documentation
- Explore settings menu

## Next Steps

Once first-run setup is complete:

1. **[Explore the Dashboard](dashboard-overview.md)** - Get familiar with the main interface
2. **[Learn Sidebar Navigation](sidebar-navigation.md)** - Understand the menu system
3. **[Import Your First Survey](../essential-workflow/importing-data.md)** - Start with real data

## Quick Tips for New Users

### Start Small
- Begin with one semester of data
- Learn features before importing large datasets
- Use sample data to practice

### Explore Freely
- Click around and explore
- Most actions are reversible
- Database is backed up automatically

### Use Quick Insights
- Check trending data regularly
- Set up alerts for concerning trends
- Review quick recommendations

### Customize Your Experience
- Adjust chart colors to match your institution
- Set up personalized dashboard views
- Configure notification preferences

## Getting Help

If you need assistance during first run:

- **In-App Help**: Click help icons throughout the interface
- **Documentation**: Access full guides from Help menu
- **Video Tutorials**: Step-by-step visual guides
- **Support**: Email support@insightlens.app for personal assistance

---

**Previous**: [Installation Guide](installation.md) | **Next**: [Dashboard Overview](dashboard-overview.md)