import { IndexType, QueryOperation } from '../types/index.js';

export const VALID_INDEX_TYPES: IndexType[] = ['LinearScan', 'BST', 'AVL', 'Hash', 'BTree', 'BPlusTree'];
export const VALID_OPERATIONS: QueryOperation[] = ['exact', 'range', 'prefix', 'insert'];

export function isValidIndexType(val: any): val is IndexType {
  return VALID_INDEX_TYPES.includes(val);
}

export function isValidOperation(val: any): val is QueryOperation {
  return VALID_OPERATIONS.includes(val);
}

export function validateDatasetPayload(body: any): { valid: boolean; error?: string } {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Request body must be an object' };
  }
  if (!body.name || typeof body.name !== 'string' || body.name.trim().length === 0) {
    return { valid: false, error: 'Dataset name is required' };
  }
  if (!Array.isArray(body.fields) || body.fields.length === 0) {
    return { valid: false, error: 'Fields must be a non-empty array' };
  }
  for (const f of body.fields) {
    if (!f.name || typeof f.name !== 'string') {
      return { valid: false, error: 'Each field must have a string name' };
    }
    if (f.type !== 'number' && f.type !== 'string') {
      return { valid: false, error: `Field "${f.name}" type must be "number" or "string"` };
    }
  }
  return { valid: true };
}

export function validateQueryPayload(body: any): { valid: boolean; error?: string } {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Request body must be an object' };
  }
  if (!body.datasetId || typeof body.datasetId !== 'string') {
    return { valid: false, error: 'datasetId is required' };
  }
  if (!isValidIndexType(body.indexType)) {
    return { valid: false, error: `Invalid indexType. Must be one of: ${VALID_INDEX_TYPES.join(', ')}` };
  }
  if (!isValidOperation(body.operation)) {
    return { valid: false, error: `Invalid operation. Must be one of: ${VALID_OPERATIONS.join(', ')}` };
  }
  if (!body.field || typeof body.field !== 'string') {
    return { valid: false, error: 'Target query field is required' };
  }

  if (body.operation === 'range') {
    if (body.lowerBound === undefined || body.upperBound === undefined) {
      return { valid: false, error: 'Range queries require both lowerBound and upperBound' };
    }
  } else if (body.operation === 'exact' || body.operation === 'insert') {
    if (body.value === undefined) {
      return { valid: false, error: 'Operation requires a value' };
    }
  } else if (body.operation === 'prefix') {
    if (body.prefix === undefined) {
      return { valid: false, error: 'Prefix search requires a prefix string' };
    }
  }

  return { valid: true };
}
