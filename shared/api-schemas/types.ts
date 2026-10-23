export type IndexType = 'LinearScan' | 'BST' | 'AVL' | 'Hash' | 'BTree' | 'BPlusTree';

export type QueryOperation = 'exact' | 'range' | 'prefix';

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

export interface QueryRequest {
  datasetId: string;
  indexType: IndexType;
  operation: QueryOperation;
  field: string;
  value?: number | string;
  lowerBound?: number | string;
  upperBound?: number | string;
  prefix?: string;
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

export interface HashIndexSnapshot {
  type: 'Hash';
  bucketCount: number;
  totalEntries: number;
  collisionCount: number;
  loadFactor: number;
  buckets: HashBucketSnapshot[];
}

export interface TreeIndexSnapshot {
  type: 'BST' | 'AVL';
  height: number;
  nodeCount: number;
  totalRotations?: number;
  root: TreeNodeSnapshot | null;
}

export interface MultiKeyIndexSnapshot {
  type: 'BTree' | 'BPlusTree';
  order: number;
  height: number;
  nodeCount: number;
  root: MultiKeyNodeSnapshot | null;
  leafChain?: {
    nodeId: number;
    keys: string[];
    nextLeafId: number;
  }[];
}

export interface LinearScanSnapshot {
  type: 'LinearScan';
  count: number;
  items: { key: string; recordId: string }[];
  truncated: boolean;
}

export type IndexStructureSnapshot =
  | TreeIndexSnapshot
  | MultiKeyIndexSnapshot
  | HashIndexSnapshot
  | LinearScanSnapshot;

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
