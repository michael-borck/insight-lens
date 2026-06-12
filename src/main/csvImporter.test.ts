import { describe, it, expect } from 'vitest';
// @ts-ignore node:sqlite is a built-in (Node 22+) not yet typed in @types/node v20
import { DatabaseSync } from 'node:sqlite';
import { createSchema } from './schema';
import { parseCsv, importCsv } from './csvImporter';

function makeDb(): any {
  const db = new DatabaseSync(':memory:');
  db.exec('PRAGMA foreign_keys = ON');
  createSchema(db);
  return db;
}

const HEADER =
  'unit_code,unit_name,year,semester,location,mode,enrolments,responses,overall_experience';

describe('parseCsv', () => {
  it('parses simple rows and fields', () => {
    expect(parseCsv('a,b,c\nd,e,f')).toEqual([
      ['a', 'b', 'c'],
      ['d', 'e', 'f'],
    ]);
  });

  it('handles quoted fields with embedded commas', () => {
    expect(parseCsv('a,"b, with comma",c')).toEqual([['a', 'b, with comma', 'c']]);
  });

  it('handles escaped quotes inside quoted fields', () => {
    expect(parseCsv('a,"say ""hi""",c')).toEqual([['a', 'say "hi"', 'c']]);
  });

  it('handles embedded newlines inside quoted fields', () => {
    expect(parseCsv('a,"line1\nline2",c')).toEqual([['a', 'line1\nline2', 'c']]);
  });

  it('handles CRLF line endings', () => {
    expect(parseCsv('a,b\r\nc,d\r\n')).toEqual([
      ['a', 'b'],
      ['c', 'd'],
    ]);
  });

  it('keeps empty fields', () => {
    expect(parseCsv('a,,c')).toEqual([['a', '', 'c']]);
  });

  it('handles a file without a trailing newline', () => {
    expect(parseCsv('a,b\nc,d')).toEqual([
      ['a', 'b'],
      ['c', 'd'],
    ]);
  });
});

describe('importCsv', () => {
  it('persists a valid multi-row file: surveys, offerings and question results', () => {
    const db = makeDb();
    const csv = [
      `${HEADER},response_rate,engagement,overall`,
      'ISYS2001,Intro to IS,2024,Semester 1,Bentley,Internal,100,50,82,50,80,82',
      'MKTG1000,Marketing,2024,Semester 2,Sydney,Online,60,30,75,,71,75',
    ].join('\n');

    const outcomes = importCsv(csv, db, 'data.csv');

    expect(outcomes).toHaveLength(2);
    expect(outcomes[0]).toMatchObject({ row: 2, status: 'success', unit: 'ISYS2001', period: 'Semester 1 2024' });
    expect(outcomes[1]).toMatchObject({ row: 3, status: 'success', unit: 'MKTG1000', period: 'Semester 2 2024' });
    expect(outcomes[0].surveyId).toEqual(expect.any(Number));

    const surveys = db.prepare('SELECT * FROM unit_survey ORDER BY survey_id').all();
    expect(surveys).toHaveLength(2);
    expect(surveys[0].overall_experience).toBe(82);
    expect(surveys[0].response_rate).toBe(50);
    expect(surveys[0].pdf_file_name).toBe('data.csv (row 2)');
    // response_rate computed from responses/enrolments when the column is empty.
    expect(surveys[1].response_rate).toBe(50);

    const offering = db
      .prepare(`SELECT * FROM unit_offering WHERE unit_code = 'MKTG1000'`)
      .get();
    expect(offering.semester).toBe('Semester 2');
    expect(offering.location).toBe('Sydney');
    expect(offering.mode).toBe('Online');

    // Question results: engagement + overall were provided for row 2.
    const isysResults = db
      .prepare(
        `SELECT q.question_short, usr.percent_agree
         FROM unit_survey_result usr JOIN question q ON usr.question_id = q.question_id
         WHERE usr.survey_id = ? ORDER BY q.question_short`,
      )
      .all(outcomes[0].surveyId);
    expect(isysResults).toEqual([
      { question_short: 'engagement', percent_agree: 80 },
      { question_short: 'overall', percent_agree: 82 },
    ]);
  });

  it('falls back to overall_experience for the overall result when the column is absent', () => {
    const db = makeDb();
    const csv = `${HEADER}\nISYS2001,Intro to IS,2024,Semester 1,Bentley,Internal,100,50,82`;
    const [outcome] = importCsv(csv, db, 'data.csv');
    expect(outcome.status).toBe('success');

    const rows = db
      .prepare(
        `SELECT q.question_short, usr.percent_agree
         FROM unit_survey_result usr JOIN question q ON usr.question_id = q.question_id
         WHERE usr.survey_id = ?`,
      )
      .all(outcome.surveyId);
    expect(rows).toEqual([{ question_short: 'overall', percent_agree: 82 }]);
  });

  it('accepts case-insensitive headers and semester/mode values, and quoted unit names', () => {
    const db = makeDb();
    const csv = [
      'UNIT_CODE,Unit_Name,YEAR,Semester,Location,MODE,Enrolments,Responses,Overall_Experience',
      'isys2001,"Systems, Design ""B""",2024,semester 1,Bentley Perth,internal,100,50,82',
    ].join('\r\n');

    const [outcome] = importCsv(csv, db, 'data.csv');
    expect(outcome.status).toBe('success');
    expect(outcome.unit).toBe('ISYS2001');

    const unit = db.prepare(`SELECT * FROM unit WHERE unit_code = 'ISYS2001'`).get();
    expect(unit.unit_name).toBe('Systems, Design "B"');
    // Campus normalization is shared with the PDF importer.
    const offering = db.prepare('SELECT * FROM unit_offering').get();
    expect(offering.location).toBe('Bentley');
    expect(offering.mode).toBe('Internal');
    expect(offering.semester).toBe('Semester 1');
  });

  it('reports a bad row while still persisting the good rows', () => {
    const db = makeDb();
    const csv = [
      HEADER,
      'ISYS2001,Intro to IS,2024,Semester 1,Bentley,Internal,100,50,82',
      'BADU1000,Bad Unit,2024,Semester 1,Bentley,Hologram,100,50,82', // invalid mode
      'MKTG1000,Marketing,2024,Semester 1,Sydney,Online,60,30,75',
    ].join('\n');

    const outcomes = importCsv(csv, db, 'data.csv');

    expect(outcomes.map((o) => o.status)).toEqual(['success', 'failed', 'success']);
    expect(outcomes[1].row).toBe(3);
    expect(outcomes[1].error).toMatch(/Invalid mode "Hologram"/);
    expect(db.prepare('SELECT COUNT(*) AS c FROM unit_survey').get().c).toBe(2);
    expect(db.prepare(`SELECT 1 FROM unit WHERE unit_code = 'BADU1000'`).get()).toBeFalsy();
  });

  it('rejects out-of-range numbers and bad years', () => {
    const db = makeDb();
    const csv = [
      HEADER,
      'ISYS2001,Intro to IS,1024,Semester 1,Bentley,Internal,100,50,82', // bad year
      'ISYS2001,Intro to IS,2024,Semester 1,Bentley,Internal,100,50,182', // overall > 100
      'ISYS2001,Intro to IS,2024,Semester 1,Bentley,Internal,abc,50,82', // non-numeric
    ].join('\n');

    const outcomes = importCsv(csv, db, 'data.csv');
    expect(outcomes.every((o) => o.status === 'failed')).toBe(true);
    expect(outcomes[0].error).toMatch(/year/);
    expect(outcomes[1].error).toMatch(/overall_experience/);
    expect(outcomes[2].error).toMatch(/enrolments/);
    expect(db.prepare('SELECT COUNT(*) AS c FROM unit_survey').get().c).toBe(0);
  });

  it('marks a row duplicating an existing offering as "duplicate", not failed', () => {
    const db = makeDb();
    const row = 'ISYS2001,Intro to IS,2024,Semester 1,Bentley,Internal,100,50,82';
    importCsv(`${HEADER}\n${row}`, db, 'first.csv');

    // Same offering identity again — within one file and across files.
    const outcomes = importCsv(`${HEADER}\n${row}`, db, 'second.csv');
    expect(outcomes[0].status).toBe('duplicate');
    expect(outcomes[0].unit).toBe('ISYS2001');
    expect(outcomes[0].period).toBe('Semester 1 2024');
    expect(db.prepare('SELECT COUNT(*) AS c FROM unit_survey').get().c).toBe(1);

    // A different mode is a distinct offering, not a duplicate.
    const online = importCsv(
      `${HEADER}\nISYS2001,Intro to IS,2024,Semester 1,Bentley,Online,100,50,82`,
      db,
      'third.csv',
    );
    expect(online[0].status).toBe('success');
  });

  it('fails the whole file (single row-1 outcome) when required header columns are missing', () => {
    const db = makeDb();
    const outcomes = importCsv('unit_code,year\nISYS2001,2024', db, 'data.csv');
    expect(outcomes).toHaveLength(1);
    expect(outcomes[0]).toMatchObject({ row: 1, status: 'failed' });
    expect(outcomes[0].error).toMatch(/Missing required column/);
    expect(outcomes[0].error).toMatch(/unit_name/);
  });

  it('fails an empty file and a header-only file gracefully', () => {
    const db = makeDb();
    expect(importCsv('', db, 'data.csv')[0]).toMatchObject({ status: 'failed' });
    const headerOnly = importCsv(`${HEADER}\n`, db, 'data.csv');
    expect(headerOnly).toHaveLength(1);
    expect(headerOnly[0].error).toMatch(/No data rows/);
  });

  it('skips blank lines between data rows', () => {
    const db = makeDb();
    const csv = `${HEADER}\n\nISYS2001,Intro to IS,2024,Semester 1,Bentley,Internal,100,50,82\n\n`;
    const outcomes = importCsv(csv, db, 'data.csv');
    expect(outcomes).toHaveLength(1);
    expect(outcomes[0].status).toBe('success');
    expect(outcomes[0].row).toBe(3); // physical record number is preserved
  });

  it('reports missing required values per-row', () => {
    const db = makeDb();
    const csv = `${HEADER}\n,Intro to IS,2024,Semester 1,Bentley,Internal,100,50,82`;
    const outcomes = importCsv(csv, db, 'data.csv');
    expect(outcomes[0].status).toBe('failed');
    expect(outcomes[0].error).toMatch(/required column "unit_code"/);
  });
});
