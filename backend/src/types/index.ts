export type IndexType = 'LinearScan' | 'BST' | 'AVL' | 'Hash' | 'BTree' | 'BPlusTree';

export type QueryOperation = 'exact' | 'range' | 'prefix' | 'insert';

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

export interface QueryRequest {
  datasetId: string;
  indexType: IndexType;
  operation: QueryOperation;
  field: string;
  value?: number | string;
  lowerBound?: number | string;
  upperBound?: number | string;
  prefix?: string;
  includeTrace?: boolean;
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

export interface BenchmarkQueryConfig {
  operation: QueryOperation;
  value?: number | string;
  lowerBound?: number | string;
  upperBound?: number | string;
  prefix?: string;
}

export interface BenchmarkRunRequest {
  datasetId: string;
  field: string;
  indexTypes: IndexType[];
  queries: BenchmarkQueryConfig[];
  iterations: number;
}

export interface BenchmarkResultItem {
  indexType: IndexType;
  medianMicroseconds: number;
  minMicroseconds: number;
  maxMicroseconds: number;
  avgComparisons: number;
  avgNodesVisited: number;
  avgRecordsExamined: number;
  memoryEstimateBytes: number;
}

export interface BenchmarkExperiment {
  id: string;
  timestamp: string;
  datasetId: string;
  datasetName: string;
  field: string;
  recordCount: number;
  iterations: number;
  results: BenchmarkResultItem[];
}
