import { ipcMain } from 'electron';
import log from 'electron-log';
import { dbHelpers } from '../database';
import { runQuery } from '../queries';
import type { QueryParams } from '../../shared/types';

export function registerQueryHandlers() {
  // App data access: named queries from the repository — no raw SQL crosses the boundary. ADR-0001.
  ipcMain.handle('query', async (event, name: string, params?: QueryParams) => {
    try {
      return runQuery(name, params);
    } catch (error) {
      log.error('Query error:', name, error);
      throw error;
    }
  });

  // Database introspection handlers for AI context
  ipcMain.handle('db:getStats', async () => {
    try {
      return dbHelpers.getDatabaseStats();
    } catch (error) {
      log.error('Database stats error:', error);
      throw error;
    }
  });

  ipcMain.handle('db:getSampleData', async () => {
    try {
      return dbHelpers.getSampleData();
    } catch (error) {
      log.error('Sample data error:', error);
      throw error;
    }
  });

  ipcMain.handle('db:getDataAvailability', async () => {
    try {
      return dbHelpers.getDataAvailability();
    } catch (error) {
      log.error('Data availability error:', error);
      throw error;
    }
  });

  ipcMain.handle('db:getCourseRecommendationData', async (event, surveyId: number) => {
    try {
      return dbHelpers.getCourseRecommendationData(surveyId);
    } catch (error) {
      log.error('Course recommendation data error:', error);
      throw error;
    }
  });
}
