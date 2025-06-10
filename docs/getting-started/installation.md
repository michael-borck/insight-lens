# Installation Guide

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

1. Visit the [InsightLens releases page](https://github.com/insightlens/insightlens/releases)
2. Download the appropriate installer for your operating system:
   - **Windows**: `InsightLens-Setup-1.0.0.exe`
   - **macOS**: `InsightLens-1.0.0.dmg`
   - **Linux**: `InsightLens-1.0.0.AppImage`

## Installation Steps

### Windows Installation

1. **Download** the installer file
2. **Run** `InsightLens-Setup-1.0.0.exe` as Administrator
3. **Follow** the installation wizard:
   - Accept the license agreement
   - Choose installation directory (default is recommended)
   - Select additional tasks (desktop shortcut, start menu entry)
4. **Launch** InsightLens from the desktop shortcut or Start menu

### macOS Installation

1. **Download** the DMG file
2. **Open** `InsightLens-1.0.0.dmg`
3. **Drag** InsightLens.app to your Applications folder
4. **Right-click** on InsightLens in Applications and select "Open"
5. **Confirm** opening the application (macOS security prompt)

> **Note**: If you see a security warning, go to System Preferences > Security & Privacy and click "Open Anyway"

### Linux Installation

1. **Download** the AppImage file
2. **Make executable**: 
   ```bash
   chmod +x InsightLens-1.0.0.AppImage
   ```
3. **Run** the application:
   ```bash
   ./InsightLens-1.0.0.AppImage
   ```
4. **Optional**: Create a desktop entry for easier access

## Post-Installation Setup

After installation, you'll need to complete the initial setup:

### 1. First Launch
- InsightLens will create a default database in your home directory
- The welcome screen will guide you through basic configuration

### 2. Database Location (Optional)
- Choose where to store your survey database
- Consider using a cloud-synced folder for automatic backups
- Default location: `~/InsightLens/surveys.db`

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
- **Solution**: Ensure FUSE is installed: `sudo apt install fuse`
- **Alternative**: Use `--no-sandbox` flag

**Problem**: Database permission errors
- **Solution**: Ensure write permissions in home directory
- **Alternative**: Choose different database location

## Uninstallation

### Windows
1. Use "Add or Remove Programs" in Windows Settings
2. Find "InsightLens" and click "Uninstall"
3. Follow the uninstall wizard

### macOS
1. Drag InsightLens.app from Applications to Trash
2. Delete application data: `~/Library/Application Support/InsightLens`

### Linux
1. Delete the AppImage file
2. Remove application data: `~/.config/InsightLens`

## Next Steps

Once installation is complete:

1. **[Complete First Run Setup](first-run.md)** - Configure your preferences
2. **[Explore the Dashboard](dashboard-overview.md)** - Get familiar with the interface
3. **[Import Your First Survey](../essential-workflow/importing-data.md)** - Start analyzing data

## Getting Help

If you encounter issues during installation:

- Check our [Troubleshooting Guide](../troubleshooting/common-issues.md)
- Search existing [GitHub Issues](https://github.com/insightlens/insightlens/issues)
- Create a new issue with your system details
- Contact support at support@insightlens.app

---

**Next**: [First Run Setup](first-run.md)