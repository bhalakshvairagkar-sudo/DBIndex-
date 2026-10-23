import { Router } from 'express';
import { healthCheck } from '../controllers/health.controller.js';
import {
  listDatasets,
  getDataset,
  createDataset,
  deleteDataset,
  getRecords,
  insertRecords,
  deleteRecord,
  importCsv,
  generateRecords
} from '../controllers/datasets.controller.js';
import { buildIndex, getIndexStructure } from '../controllers/indexes.controller.js';
import { executeQuery } from '../controllers/queries.controller.js';
import { runBenchmark, listBenchmarks, getBenchmark } from '../controllers/benchmarks.controller.js';
import {
  executeSqlHandler,
  explainSqlHandler,
  compareQueryHandler,
  getDatabasesHandler,
  createDatabaseHandler,
  getTablesHandler,
  getTableSchemaHandler,
  getTableDataHandler,
  getTableStatsHandler,
  getColumnAnalyticsHandler,
  getIndexesHandler,
  createIndexHandler,
  dropIndexHandler
} from '../controllers/mysql.controller.js';
import {
  getSavedQueriesHandler,
  createSavedQueryHandler,
  updateSavedQueryHandler,
  deleteSavedQueryHandler
} from '../controllers/saved_queries.controller.js';

const router = Router();

// 1. Health
router.get('/health', healthCheck);

// 2. Real MySQL SQL Workspace & Execution
router.post('/sql/execute', executeSqlHandler);
router.post('/sql/explain', explainSqlHandler);
router.post('/performance/compare', compareQueryHandler);

// 3. Real MySQL Database & Schema Management
router.get('/mysql/databases', getDatabasesHandler);
router.post('/mysql/databases', createDatabaseHandler);
router.get('/mysql/databases/:db/tables', getTablesHandler);
router.get('/mysql/databases/:db/tables/:table/schema', getTableSchemaHandler);
router.get('/mysql/databases/:db/tables/:table/data', getTableDataHandler);
router.get('/mysql/databases/:db/tables/:table/stats', getTableStatsHandler);
router.get('/mysql/databases/:db/tables/:table/analytics', getColumnAnalyticsHandler);
router.get('/mysql/databases/:db/indexes', getIndexesHandler);
router.post('/mysql/indexes', createIndexHandler);
router.post('/mysql/indexes/drop', dropIndexHandler);

// 4. Saved Queries
router.get('/saved-queries', getSavedQueriesHandler);
router.post('/saved-queries', createSavedQueryHandler);
router.patch('/saved-queries/:id', updateSavedQueryHandler);
router.delete('/saved-queries/:id', deleteSavedQueryHandler);

// 5. C++ Simulation Engine & Datasets (Preserved & Integrated)
router.get('/datasets', listDatasets);
router.post('/datasets', createDataset);
router.get('/datasets/:id', getDataset);
router.delete('/datasets/:id', deleteDataset);
router.get('/datasets/:id/records', getRecords);
router.post('/datasets/:id/records', insertRecords);
router.delete('/datasets/:id/records/:recordId', deleteRecord);
router.post('/datasets/:id/import-csv', importCsv);
router.post('/datasets/:id/generate', generateRecords);

router.post('/indexes', buildIndex);
router.get('/indexes/:id/structure', getIndexStructure);

router.post('/queries/execute', executeQuery);
router.post('/simulate', executeQuery);

router.post('/benchmarks/run', runBenchmark);
router.get('/benchmarks', listBenchmarks);
router.get('/benchmarks/:id', getBenchmark);

export default router;
