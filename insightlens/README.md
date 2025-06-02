# InsightLens

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
cd insightlens
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
insightlens/
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
└── dist/               # Build output
```

## License

MIT