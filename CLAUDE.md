# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Essential Commands

### Development
- `npm run dev` - Start development mode (runs main process, renderer, and Electron concurrently)
- `npm run typecheck` - Run TypeScript type checking
- `npm run build` - Build the complete application
- `npm run start` - Start the built application

### Component Commands
- `npm run dev:main` - Watch-compile main process TypeScript
- `npm run dev:renderer` - Start Vite dev server for renderer
- `npm run dev:electron` - Launch Electron (waits for renderer on port 5173)

## Architecture Overview

InsightLens is an Electron-based desktop application for analyzing unit survey data with the following architecture:

### Process Structure
- **Main Process** (`src/main/`): Node.js backend handling file system, database, and PDF extraction
- **Renderer Process** (`src/renderer/`): React frontend with TypeScript and Tailwind CSS
- **Shared Types** (`src/shared/`): Type definitions used across processes

### Key Components

#### Database Layer (`src/main/database.ts`)
- SQLite database with Better-SQLite3
- Comprehensive schema for survey data (units, offerings, surveys, results, comments, benchmarks)
- Helper functions for common queries
- Auto-creates tables on initialization

#### PDF Processing (`src/main/pdfExtractor.ts`)
- Extracts survey data from PDF reports using pdf-parse
- Structured data extraction for unit information, stats, and comments

#### State Management (`src/renderer/utils/store.ts`)
- Zustand store for global application state
- Manages settings, selected units, and filters
- AI service configuration (OpenAI API integration)

#### IPC Communication (`src/main/ipcHandlers.ts`)
- Bridges main and renderer processes
- Handles database operations, file imports, and settings

### Data Flow
1. PDFs imported via drag-and-drop or file selection
2. Main process extracts data and stores in SQLite
3. Renderer queries data via IPC for visualization
4. Charts and insights generated using Chart.js and D3
5. Optional AI analysis through OpenAI API

### Key Features
- Privacy-first local data storage
- Multi-format export capabilities
- Sentiment analysis of comments
- Comprehensive survey benchmarking
- AI-powered insights (optional, BYO API key)

### Path Aliases
- `@/` - src directory root
- `@renderer/` - src/renderer directory
- `@shared/` - src/shared directory