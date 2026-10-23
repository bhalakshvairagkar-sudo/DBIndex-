import {
  Dataset,
  RecordItem,
  QueryResponse,
  BenchmarkExperiment,
  IndexType,
  SqlQueryResult,
  ExplainPlanResponse,
  ComparisonResponse,
  MySqlTable,
  MySqlColumn,
  MySqlIndex,
  SavedQueryItem
} from '../types';

const API_BASE = '/api';

export async function getHealth() {
  const res = await fetch(`${API_BASE}/health`);
  return res.json();
}

// ==========================================
// MySQL Laboratory Endpoints
// ==========================================

export async function executeSql(
  sql: string,
  database = 'my_database'
): Promise<{ status: string; results: SqlQueryResult[]; totalDurationMs: number }> {
  const res = await fetch(`${API_BASE}/sql/execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sql, database })
  });
  return res.json();
}

export async function explainSql(
  sql: string,
  database = 'my_database'
): Promise<ExplainPlanResponse> {
  const res = await fetch(`${API_BASE}/sql/explain`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sql, database })
  });
  return res.json();
}

export async function comparePerformance(payload: {
  sql: string;
  database?: string;
  table?: string;
  indexName?: string;
  runs?: number;
}): Promise<ComparisonResponse> {
  const res = await fetch(`${API_BASE}/performance/compare`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return res.json();
}

export async function getMysqlDatabases(): Promise<{ status: string; databases: string[] }> {
  const res = await fetch(`${API_BASE}/mysql/databases`);
  return res.json();
}

export async function createMysqlDatabase(name: string): Promise<{ status: string; message: string }> {
  const res = await fetch(`${API_BASE}/mysql/databases`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name })
  });
  return res.json();
}

export async function getMysqlTables(
  database = 'my_database'
): Promise<{ status: string; database: string; tables: MySqlTable[] }> {
  const res = await fetch(`${API_BASE}/mysql/databases/${database}/tables`);
  return res.json();
}

export async function getMysqlTableSchema(
  database: string,
  table: string
): Promise<{ status: string; database: string; table: string; columns: MySqlColumn[] }> {
  const res = await fetch(`${API_BASE}/mysql/databases/${database}/tables/${table}/schema`);
  return res.json();
}

export async function getMysqlTableData(
  database: string,
  table: string,
  page = 1,
  pageSize = 10,
  search?: string
): Promise<{
  status: string;
  database: string;
  table: string;
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  rows: any[];
}> {
  let url = `${API_BASE}/mysql/databases/${database}/tables/${table}/data?page=${page}&pageSize=${pageSize}`;
  if (search) url += `&search=${encodeURIComponent(search)}`;
  const res = await fetch(url);
  return res.json();
}

export async function getMysqlTableStats(
  database: string,
  table: string
): Promise<{ status: string; database: string; table: string; stats: any }> {
  const res = await fetch(`${API_BASE}/mysql/databases/${database}/tables/${table}/stats`);
  return res.json();
}

export async function getMysqlColumnAnalytics(
  database: string,
  table: string,
  column = 'cgpa'
): Promise<{
  status: string;
  summary: { average: number; maximum: number; minimum: number; stdDev: number };
  histogram: { bin: number; count: number }[];
  departmentDistribution: { department: string; count: number }[];
}> {
  const res = await fetch(
    `${API_BASE}/mysql/databases/${database}/tables/${table}/analytics?column=${encodeURIComponent(column)}`
  );
  return res.json();
}

export async function getMysqlIndexes(
  database = 'my_database',
  table?: string
): Promise<{ status: string; database: string; indexes: MySqlIndex[] }> {
  let url = `${API_BASE}/mysql/databases/${database}/indexes`;
  if (table) url += `?table=${encodeURIComponent(table)}`;
  const res = await fetch(url);
  return res.json();
}

export async function createMysqlIndex(payload: {
  database?: string;
  table: string;
  indexName: string;
  columns: string[];
  unique?: boolean;
  indexType?: string;
}): Promise<{ status: string; message: string }> {
  const res = await fetch(`${API_BASE}/mysql/indexes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return res.json();
}

export async function dropMysqlIndex(payload: {
  database?: string;
  table: string;
  indexName: string;
}): Promise<{ status: string; message: string }> {
  const res = await fetch(`${API_BASE}/mysql/indexes/drop`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return res.json();
}

export async function getSavedQueries(): Promise<{ status: string; queries: SavedQueryItem[] }> {
  const res = await fetch(`${API_BASE}/saved-queries`);
  return res.json();
}

export async function createSavedQuery(
  payload: Partial<SavedQueryItem>
): Promise<{ status: string; query: SavedQueryItem }> {
  const res = await fetch(`${API_BASE}/saved-queries`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return res.json();
}

export async function updateSavedQuery(
  id: string,
  updates: Partial<SavedQueryItem>
): Promise<{ status: string; query: SavedQueryItem }> {
  const res = await fetch(`${API_BASE}/saved-queries/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates)
  });
  return res.json();
}

export async function deleteSavedQuery(id: string): Promise<{ status: string; message: string }> {
  const res = await fetch(`${API_BASE}/saved-queries/${id}`, { method: 'DELETE' });
  return res.json();
}

// ==========================================
// C++ Simulator Engine Endpoints
// ==========================================

export async function getDatasets(): Promise<{ status: string; datasets: Dataset[] }> {
  const res = await fetch(`${API_BASE}/datasets`);
  return res.json();
}

export async function createDataset(payload: {
  id?: string;
  name: string;
  description?: string;
  fields: { name: string; type: 'number' | 'string' }[];
}) {
  const res = await fetch(`${API_BASE}/datasets`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return res.json();
}

export async function deleteDataset(id: string) {
  const res = await fetch(`${API_BASE}/datasets/${id}`, { method: 'DELETE' });
  return res.json();
}

export async function getRecords(
  datasetId: string,
  page = 1,
  limit = 50
): Promise<{
  status: string;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  records: RecordItem[];
}> {
  const res = await fetch(`${API_BASE}/datasets/${datasetId}/records?page=${page}&limit=${limit}`);
  return res.json();
}

export async function insertRecords(datasetId: string, records: any[]) {
  const res = await fetch(`${API_BASE}/datasets/${datasetId}/records`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ records })
  });
  return res.json();
}

export async function deleteRecord(datasetId: string, recordId: string) {
  const res = await fetch(`${API_BASE}/datasets/${datasetId}/records/${recordId}`, {
    method: 'DELETE'
  });
  return res.json();
}

export async function importCsv(datasetId: string, csv: string) {
  const res = await fetch(`${API_BASE}/datasets/${datasetId}/import-csv`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ csv })
  });
  return res.json();
}

export async function generateRecords(datasetId: string, count = 100) {
  const res = await fetch(`${API_BASE}/datasets/${datasetId}/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ count })
  });
  return res.json();
}

export async function buildIndex(datasetId: string, indexType: IndexType, field: string) {
  const res = await fetch(`${API_BASE}/indexes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ datasetId, indexType, field })
  });
  return res.json();
}

export async function getIndexStructure(indexType: IndexType) {
  const res = await fetch(`${API_BASE}/indexes/${indexType}/structure`);
  return res.json();
}

export async function executeQuery(payload: {
  datasetId: string;
  indexType: IndexType;
  operation: string;
  field: string;
  value?: any;
  lowerBound?: any;
  upperBound?: any;
  prefix?: string;
  includeTrace?: boolean;
  recordId?: string;
}): Promise<QueryResponse> {
  const res = await fetch(`${API_BASE}/queries/execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return res.json();
}

export async function runBenchmark(payload: {
  datasetId: string;
  field: string;
  indexTypes?: IndexType[];
  queries?: any[];
  iterations?: number;
}): Promise<{ status: string; experiment: BenchmarkExperiment }> {
  const res = await fetch(`${API_BASE}/benchmarks/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return res.json();
}

export async function getBenchmarks(): Promise<{ status: string; benchmarks: BenchmarkExperiment[] }> {
  const res = await fetch(`${API_BASE}/benchmarks`);
  return res.json();
}

export async function getBenchmark(id: string): Promise<{ status: string; experiment: BenchmarkExperiment }> {
  const res = await fetch(`${API_BASE}/benchmarks/${id}`);
  return res.json();
}
