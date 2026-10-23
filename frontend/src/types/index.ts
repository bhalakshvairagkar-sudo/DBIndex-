export type IndexType = 'LinearScan' | 'BST' | 'AVL' | 'Hash' | 'BTree' | 'BPlusTree';

export type QueryOperation = 'exact' | 'range' | 'prefix' | 'insert';

export type PageId =
  | 'dashboard'
  | 'workspace'
  | 'database'
  | 'visualization'
  | 'analysis'
  | 'performance'
  | 'indexes'
  | 'saved'
  | 'documentation';

export interface FieldDefinition {
  name: string;
  type: 'number' | 'string';
}

export interface Dataset {
  id: string;
  name: string;
  description: string;
  fields: FieldDefinition[];
  recordCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface RecordItem {
  id: string;
  fields: Record<string, number | string>;
}

export interface QueryMetrics {
  keyComparisons: number;
  nodesVisited: number;
  recordsExamined: number;
  elapsedMicroseconds: number;
  memoryEstimateBytes: number;
}

export interface TraceStep {
  stepNumber: number;
  action: string;
  nodeId: number;
  bucketIndex: number;
  recordId: string;
  keyExamined: string;
  targetKey: string;
  explanation: string;
  comparisonsSoFar: number;
  nodesVisitedSoFar: number;
  activePath: number[];
}

export interface QueryResponse {
  status: 'ok' | 'error';
  message?: string;
  datasetId: string;
  indexType: IndexType;
  operation: QueryOperation;
  field: string;
  resultCount: number;
  records: RecordItem[];
  metrics: QueryMetrics;
  executionPlan: string[];
  trace?: TraceStep[];
  structure?: any;
  stats?: any;
}

export interface TreeNodeSnapshot {
  id: number;
  key: string;
  recordCount: number;
  recordIds: string[];
  depth?: number;
  height?: number;
  balanceFactor?: number;
  left?: TreeNodeSnapshot | null;
  right?: TreeNodeSnapshot | null;
}

export interface MultiKeyNodeSnapshot {
  id: number;
  isLeaf: boolean;
  keys: string[];
  keyCount: number;
  nextLeafId?: number;
  children?: MultiKeyNodeSnapshot[];
}

export interface HashBucketEntry {
  key: string;
  recordCount: number;
  recordIds: string[];
}

export interface HashBucketSnapshot {
  bucketIndex: number;
  chainLength: number;
  entries: HashBucketEntry[];
}

export interface BenchmarkExperiment {
  id: string;
  timestamp: string;
  datasetId: string;
  datasetName: string;
  field: string;
  recordCount: number;
  iterations: number;
  results: {
    indexType: IndexType;
    medianMicroseconds: number;
    minMicroseconds: number;
    maxMicroseconds: number;
    avgComparisons: number;
    avgNodesVisited: number;
    avgRecordsExamined: number;
    memoryEstimateBytes: number;
  }[];
}

// ==========================================
// DBIndex MySQL Laboratory Types
// ==========================================

export interface MySqlColumn {
  name: string;
  type: string;
  nullable: boolean;
  key: string;
  defaultValue: any;
  extra: string;
}

export interface MySqlTable {
  name: string;
  rowCount: number;
  dataSize: number;
  indexSize: number;
  avgRowSize: number;
}

export interface MySqlIndex {
  tableName: string;
  name: string;
  type: string;
  columns: string[];
  sizeBytes: number;
  sizeFormatted: string;
  status: string;
  unique: boolean;
}

export interface SqlQueryResult {
  statement: string;
  commandType: string;
  columns?: string[];
  rows?: any[];
  rowCount?: number;
  totalCount?: number;
  affectedRows?: number;
  insertId?: number;
  durationMs: number;
  status: 'success' | 'error';
  message?: string;
}

export interface ExplainPlanResponse {
  status: string;
  tabular: any[];
  jsonPlan?: any;
  analyzePlan?: string;
  summary: {
    accessType: string;
    selectedKey: string | null;
    possibleKeys: string[];
    rowsExamined: number;
    estimatedCost: number;
    extra: string;
    isTableScan: boolean;
  };
}

export interface ComparisonResponse {
  status: string;
  withoutIndex: {
    durationMs: number;
    rowsExamined: number;
    rowsReturned: number;
    diskAccesses: number;
    plan: any[];
    accessType: string;
    key: string | null;
    extra: string;
  };
  withIndex: {
    durationMs: number;
    rowsExamined: number;
    rowsReturned: number;
    diskAccesses: number;
    plan: any[];
    accessType: string;
    key: string | null;
    extra: string;
  };
  speedup: number;
  rowsRatio: number;
  diskRatio: number;
  memoryRatio: number;
  summary: string;
}

export interface SavedQueryItem {
  id: string;
  title: string;
  sql: string;
  folder: string;
  description: string;
  isStarred: boolean;
  database: string;
  lastExecuted?: string;
  executionCount: number;
}
