// E2E harness for the InsightLens Electron app.
//
// Each test gets a completely isolated app instance:
//   1. A fresh temp dir holds a seeded surveys.db plus a userData dir
//      containing electron-store's config.json (databasePath pointing at the
//      seeded DB, showOnboardingOnStartup=false so the splash never blocks).
//   2. The app is launched production-style (`electron .`) with
//      INSIGHTLENS_USER_DATA_DIR set — src/main/index.ts redirects
//      app.setPath('userData', ...) before anything reads settings.
//   3. The seeded schema comes from the app's own compiled dist/main/schema.js
//      so the test DB always matches production DDL. `npm run build` must run
//      before `npm run test:e2e` (see playwright.config.ts header).
//
// Specs import { test, expect } from './helpers' — the `page` fixture is the
// app's first window, and cleanup/tracing happen automatically. launchApp()
// and closeApp() are also exported for direct use.

import {
  _electron,
  test as base,
  expect,
  type ElectronApplication,
  type Page,
  type TestInfo,
} from '@playwright/test';
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const APP_ROOT = path.resolve(__dirname, '..', '..');

/** Seed constants shared with the specs. */
export const SEED = {
  units: [
    { code: 'TEST1001', name: 'Intro to Testing' },
    { code: 'TEST2002', name: 'Advanced Testing' },
  ],
  totalUnits: 2,
  totalSurveys: 4,
  // Every survey is a Semester 1 offering, one per year, so period labels
  // ("Semester 1 2024" / "Semester 1 2025") are unique within a unit.
  periods: ['Semester 1 2024', 'Semester 1 2025'],
} as const;

function assertBuildExists(): void {
  const needed = [
    path.join(APP_ROOT, 'dist', 'main', 'index.js'),
    path.join(APP_ROOT, 'dist', 'main', 'schema.js'),
    path.join(APP_ROOT, 'dist', 'renderer', 'index.html'),
  ];
  for (const file of needed) {
    if (!fs.existsSync(file)) {
      throw new Error(`Missing build output ${file} — run \`npm run build\` before \`npm run test:e2e\`.`);
    }
  }
}

/**
 * Create and seed a fresh SQLite DB at dbPath using the app's own compiled
 * schema (which also seeds the standard question rows — we look question_ids
 * up from there rather than hardcoding them).
 */
function seedDatabase(dbPath: string): void {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { createSchema } = require(path.join(APP_ROOT, 'dist', 'main', 'schema.js')) as {
    createSchema: (db: DatabaseSync) => void;
  };

  const db = new DatabaseSync(dbPath);
  try {
    db.exec('PRAGMA foreign_keys = ON');
    createSchema(db);

    const qid = (short: string): number => {
      const row = db
        .prepare('SELECT question_id FROM question WHERE question_short = ?')
        .get(short) as { question_id: number | bigint } | undefined;
      if (!row) throw new Error(`Seed failed: question_short "${short}" not found in schema seed`);
      return Number(row.question_id);
    };
    const questionIds = ['engagement', 'resources', 'support', 'assessments', 'expectations', 'overall'].map(qid);

    db.prepare('INSERT INTO discipline (discipline_code, discipline_name) VALUES (?, ?)').run(
      'CS',
      'Computer Science',
    );

    const insertUnit = db.prepare(
      'INSERT INTO unit (unit_code, unit_name, discipline_code, academic_level) VALUES (?, ?, ?, ?)',
    );
    for (const unit of SEED.units) {
      insertUnit.run(unit.code, unit.name, 'CS', 'UG');
    }

    const insertEvent = db.prepare('INSERT INTO survey_event (event_name, institution) VALUES (?, ?)');
    const event2024 = Number(insertEvent.run('Semester 1 2024', 'Curtin University').lastInsertRowid);
    const event2025 = Number(insertEvent.run('Semester 1 2025', 'Curtin University').lastInsertRowid);

    const insertOffering = db.prepare(
      // mode CHECK allows 'Internal' | 'Online' | 'Aggregated'
      `INSERT INTO unit_offering (unit_code, year, semester, location, mode)
       VALUES (?, ?, 'Semester 1', 'Bentley Campus', 'Internal')`,
    );
    const insertSurvey = db.prepare(
      `INSERT INTO unit_survey (unit_offering_id, event_id, enrolments, responses, response_rate, overall_experience)
       VALUES (?, ?, ?, ?, ?, ?)`,
    );
    const insertResult = db.prepare(
      `INSERT INTO unit_survey_result
         (survey_id, question_id, percent_agree, strongly_agree, agree, neutral, disagree, strongly_disagree)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    );

    const addSurvey = (
      unitCode: string,
      year: number,
      eventId: number,
      stats: { enrolments: number; responses: number; responseRate: number; overall: number },
    ): number => {
      const offeringId = Number(insertOffering.run(unitCode, year).lastInsertRowid);
      const surveyId = Number(
        insertSurvey.run(offeringId, eventId, stats.enrolments, stats.responses, stats.responseRate, stats.overall)
          .lastInsertRowid,
      );
      for (const questionId of questionIds) {
        insertResult.run(surveyId, questionId, stats.overall, 12, 18, 6, 3, 1);
      }
      return surveyId;
    };

    // Two units x two surveys (2024 + 2025) = 4 surveys total.
    const t1Survey2024 = addSurvey('TEST1001', 2024, event2024, {
      enrolments: 100, responses: 40, responseRate: 40.0, overall: 85.0,
    });
    addSurvey('TEST1001', 2025, event2025, {
      enrolments: 90, responses: 45, responseRate: 50.0, overall: 88.0,
    });
    const t2Survey2024 = addSurvey('TEST2002', 2024, event2024, {
      enrolments: 60, responses: 20, responseRate: 33.3, overall: 75.5,
    });
    const t2Survey2025 = addSurvey('TEST2002', 2025, event2025, {
      enrolments: 80, responses: 30, responseRate: 37.5, overall: 78.5,
    });

    // Comments on BOTH units — TEST1001 deliberately included so the specs
    // that open its detail page exercise the WordCloud/sentiment rendering
    // path (a synchronous-'end' bug there once blanked the whole page).
    const insertComment = db.prepare(
      'INSERT INTO comment (survey_id, comment_text, sentiment_score, sentiment_label) VALUES (?, ?, ?, ?)',
    );
    insertComment.run(t1Survey2024, 'Great unit, the labs were really engaging.', 0.8, 'positive');
    insertComment.run(t1Survey2024, 'The workload felt heavy around week eight.', -0.4, 'negative');
    insertComment.run(t2Survey2025, 'Clear expectations and helpful feedback throughout.', 0.7, 'positive');
    insertComment.run(t2Survey2025, 'Content was fine but the lectures were a bit dry.', -0.1, 'neutral');
  } finally {
    db.close();
  }
}

export interface LaunchedApp {
  app: ElectronApplication;
  page: Page;
  /** Root temp dir (contains surveys.db and the userData dir). */
  tmpDir: string;
  userDataDir: string;
  dbPath: string;
}

export async function launchApp(): Promise<LaunchedApp> {
  assertBuildExists();

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'insightlens-e2e-'));
  const userDataDir = path.join(tmpDir, 'user-data');
  fs.mkdirSync(userDataDir, { recursive: true });

  const dbPath = path.join(tmpDir, 'surveys.db');
  seedDatabase(dbPath);

  // electron-store (v8) persists settings as plain JSON in <userData>/config.json.
  fs.writeFileSync(
    path.join(userDataDir, 'config.json'),
    JSON.stringify({ databasePath: dbPath, showOnboardingOnStartup: false }, null, 2),
  );

  const app = await _electron.launch({
    args: ['.', '--no-sandbox'],
    cwd: APP_ROOT,
    env: {
      ...(process.env as Record<string, string>),
      // Neither 'development' (would load the Vite dev server) nor
      // 'production' (would kick off the auto-updater).
      NODE_ENV: 'test',
      INSIGHTLENS_USER_DATA_DIR: userDataDir,
    },
  });

  // Manual tracing: the Electron context isn't created by Playwright's
  // built-in fixtures, so config-level `use.trace` wouldn't capture it.
  // closeApp() keeps the trace only on failure (retain-on-failure).
  await app.context().tracing.start({ screenshots: true, snapshots: true });

  const page = await app.firstWindow();
  await page.waitForLoadState('domcontentloaded');

  return { app, page, tmpDir, userDataDir, dbPath };
}

export async function closeApp(launched: LaunchedApp, testInfo?: TestInfo): Promise<void> {
  const failed = !!testInfo && testInfo.status !== testInfo.expectedStatus;
  try {
    if (failed && testInfo) {
      const tracePath = testInfo.outputPath('trace.zip');
      await launched.app.context().tracing.stop({ path: tracePath });
      testInfo.attachments.push({ name: 'trace', path: tracePath, contentType: 'application/zip' });
    } else {
      await launched.app.context().tracing.stop();
    }
  } catch {
    // Tracing is best-effort; never mask the test result.
  }
  await launched.app.close();
  if (!failed) {
    fs.rmSync(launched.tmpDir, { recursive: true, force: true });
  }
}

interface ElectronFixtures {
  launched: LaunchedApp;
  page: Page;
}

/**
 * Test object whose `page` fixture is the Electron app's first window.
 * Overriding `page` means Playwright's browser fixtures are never
 * instantiated, so no browsers need to be installed.
 */
export const test = base.extend<ElectronFixtures>({
  launched: async ({}, use, testInfo) => {
    const launched = await launchApp();
    await use(launched);
    await closeApp(launched, testInfo);
  },
  page: async ({ launched }, use) => {
    await use(launched.page);
  },
});

export { expect };
