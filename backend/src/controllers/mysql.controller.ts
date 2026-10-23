import { Request, Response } from 'express';
import { MySqlService } from '../services/mysql.service.js';

const mysqlService = MySqlService.getInstance();

export async function executeSqlHandler(req: Request, res: Response): Promise<void> {
  const { sql, database } = req.body;
  if (!sql || typeof sql !== 'string' || sql.trim().length === 0) {
    res.status(400).json({ status: 'error', message: 'SQL query string is required' });
    return;
  }

  try {
    const result = await mysqlService.executeSql(sql, database || 'my_database');
    res.json({
      status: 'ok',
      ...result
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: (err as Error).message
    });
  }
}

export async function explainSqlHandler(req: Request, res: Response): Promise<void> {
  const { sql, database } = req.body;
  if (!sql) {
    res.status(400).json({ status: 'error', message: 'SQL query string is required' });
    return;
  }

  try {
    const result = await mysqlService.explainQuery(sql, database || 'my_database');
    res.json({
      status: 'ok',
      ...result
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: (err as Error).message
    });
  }
}

export async function compareQueryHandler(req: Request, res: Response): Promise<void> {
  const { sql, database, table, indexName, runs } = req.body;
  if (!sql) {
    res.status(400).json({ status: 'error', message: 'SQL query is required' });
    return;
  }

  try {
    const comparison = await mysqlService.compareQuery(
      sql,
      database || 'my_database',
      table || 'students',
      indexName || 'idx_department',
      runs ? Number(runs) : 3
    );
    res.json({
      status: 'ok',
      ...comparison
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: (err as Error).message
    });
  }
}

export async function getDatabasesHandler(req: Request, res: Response): Promise<void> {
  try {
    const databases = await mysqlService.getDatabases();
    res.json({ status: 'ok', databases });
  } catch (err) {
    res.status(500).json({ status: 'error', message: (err as Error).message });
  }
}

export async function createDatabaseHandler(req: Request, res: Response): Promise<void> {
  const { name } = req.body;
  if (!name) {
    res.status(400).json({ status: 'error', message: 'Database name is required' });
    return;
  }
  try {
    await mysqlService.createDatabase(name);
    res.json({ status: 'ok', message: `Database ${name} created successfully` });
  } catch (err) {
    res.status(500).json({ status: 'error', message: (err as Error).message });
  }
}

export async function getTablesHandler(req: Request, res: Response): Promise<void> {
  const db = (req.params.db as string) || (req.query.db as string) || 'my_database';
  try {
    const tables = await mysqlService.getTables(db);
    res.json({ status: 'ok', database: db, tables });
  } catch (err) {
    res.status(500).json({ status: 'error', message: (err as Error).message });
  }
}

export async function getTableSchemaHandler(req: Request, res: Response): Promise<void> {
  const db = (req.params.db as string) || 'my_database';
  const table = req.params.table as string;
  try {
    const columns = await mysqlService.getTableSchema(db, table);
    res.json({ status: 'ok', database: db, table, columns });
  } catch (err) {
    res.status(500).json({ status: 'error', message: (err as Error).message });
  }
}

export async function getTableDataHandler(req: Request, res: Response): Promise<void> {
  const db = (req.params.db as string) || 'my_database';
  const table = req.params.table as string;
  const page = Number(req.query.page) || 1;
  const pageSize = Number(req.query.pageSize) || 10;
  const search = req.query.search as string;

  try {
    const { rows, totalCount } = await mysqlService.getTableData(db, table, page, pageSize, search);
    res.json({
      status: 'ok',
      database: db,
      table,
      page,
      pageSize,
      totalCount,
      totalPages: Math.ceil(totalCount / pageSize),
      rows
    });
  } catch (err) {
    res.status(500).json({ status: 'error', message: (err as Error).message });
  }
}

export async function getTableStatsHandler(req: Request, res: Response): Promise<void> {
  const db = (req.params.db as string) || 'my_database';
  const table = req.params.table as string;
  try {
    const stats = await mysqlService.getTableStats(db, table);
    res.json({ status: 'ok', database: db, table, stats });
  } catch (err) {
    res.status(500).json({ status: 'error', message: (err as Error).message });
  }
}

export async function getColumnAnalyticsHandler(req: Request, res: Response): Promise<void> {
  const db = (req.params.db as string) || 'my_database';
  const table = req.params.table as string;
  const column = (req.query.column as string) || 'cgpa';
  try {
    const analytics = await mysqlService.getColumnAnalytics(db, table, column);
    res.json({ status: 'ok', database: db, table, column, ...analytics });
  } catch (err) {
    res.status(500).json({ status: 'error', message: (err as Error).message });
  }
}

export async function getIndexesHandler(req: Request, res: Response): Promise<void> {
  const db = (req.params.db as string) || (req.query.db as string) || 'my_database';
  const table = req.query.table as string | undefined;
  try {
    const indexes = await mysqlService.getIndexes(db, table);
    res.json({ status: 'ok', database: db, indexes });
  } catch (err) {
    res.status(500).json({ status: 'error', message: (err as Error).message });
  }
}

export async function createIndexHandler(req: Request, res: Response): Promise<void> {
  const { database, table, indexName, columns, unique, indexType } = req.body;
  if (!table || !indexName || !columns || !Array.isArray(columns) || columns.length === 0) {
    res.status(400).json({ status: 'error', message: 'table, indexName, and columns are required' });
    return;
  }
  try {
    await mysqlService.createIndex(
      database || 'my_database',
      table,
      indexName,
      columns,
      !!unique,
      indexType || 'BTREE'
    );
    res.json({ status: 'ok', message: `Index ${indexName} created successfully` });
  } catch (err) {
    res.status(500).json({ status: 'error', message: (err as Error).message });
  }
}

export async function dropIndexHandler(req: Request, res: Response): Promise<void> {
  const { database, table, indexName } = req.body;
  if (!table || !indexName) {
    res.status(400).json({ status: 'error', message: 'table and indexName are required' });
    return;
  }
  try {
    await mysqlService.dropIndex(database || 'my_database', table, indexName);
    res.json({ status: 'ok', message: `Index ${indexName} dropped successfully` });
  } catch (err) {
    res.status(500).json({ status: 'error', message: (err as Error).message });
  }
}
