# InsightLens

<!-- BADGES:START -->
[![ai-assistant](https://img.shields.io/badge/-ai--assistant-blue?style=flat-square)](https://github.com/topics/ai-assistant) [![charts](https://img.shields.io/badge/-charts-blue?style=flat-square)](https://github.com/topics/charts) [![cross-platform](https://img.shields.io/badge/-cross--platform-blue?style=flat-square)](https://github.com/topics/cross-platform) [![data-visualization](https://img.shields.io/badge/-data--visualization-blue?style=flat-square)](https://github.com/topics/data-visualization) [![desktop-app](https://img.shields.io/badge/-desktop--app-blue?style=flat-square)](https://github.com/topics/desktop-app) [![education](https://img.shields.io/badge/-education-blue?style=flat-square)](https://github.com/topics/education) [![electron](https://img.shields.io/badge/-electron-47848f?style=flat-square)](https://github.com/topics/electron) [![lecturers](https://img.shields.io/badge/-lecturers-blue?style=flat-square)](https://github.com/topics/lecturers) [![pdf-processing](https://img.shields.io/badge/-pdf--processing-blue?style=flat-square)](https://github.com/topics/pdf-processing) [![react](https://img.shields.io/badge/-react-61dafb?style=flat-square)](https://github.com/topics/react)
<!-- BADGES:END -->

Unit survey analysis tool for lecturers. Analyze survey data with powerful visualizations and AI-powered insights.

## Features

- 📊 **Import PDF Surveys** - Extract data from unit survey PDF reports
- 📈 **Visualizations** - Charts for trends, comparisons, and insights
- 🔒 **Privacy-First** - All data stays on your computer
- 🤖 **AI Assistant** - Optional AI-powered analysis (BYO API key)
- 💾 **Local Database** - SQLite database you control
- 🔄 **Cloud Sync Ready** - Store database in cloud-synced folders

## Development

### Prerequisites

- Node.js 18+
- npm or yarn

### Setup

```bash
npm install
```

### Development Mode

```bash
npm run dev
```

This starts both the Electron main process and Vite dev server for hot-reloading.

### Build

```bash
npm run build
```

This builds the application for your current platform.

### Build for All Platforms

```bash
npm run build:all
```

## Tech Stack

- **Electron** - Desktop application framework
- **React** - UI framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Chart.js** - Visualizations
- **SQLite** - Local database
- **pdf-parse** - PDF extraction

## Project Structure

```
├── src/
│   ├── main/           # Electron main process
│   │   ├── index.ts    # Main entry point
│   │   ├── database.ts # SQLite management
│   │   └── pdfExtractor.ts # PDF parsing
│   ├── renderer/       # React application
│   │   ├── pages/      # Route pages
│   │   ├── components/ # UI components
│   │   └── utils/      # Utilities
│   └── shared/         # Shared types/constants
├── public/             # Static assets
├── dist/               # Build output
└── docs/               # Documentation (including database schema)
```

## License

MIT