import { Request, Response } from 'express';
import { EngineProcessAdapter } from '../engine/process_adapter.js';
import { DatabaseService } from '../services/db.js';
import { validateQueryPayload } from '../validators/index.js';

export async function executeQuery(req: Request, res: Response): Promise<void> {
  const validation = validateQueryPayload(req.body);
  if (!validation.valid) {
    res.status(400).json({ status: 'error', message: validation.error });
    return;
  }

  const { datasetId, indexType, operation, field, value, lowerBound, upperBound, prefix, recordId } = req.body;
  const includeTrace = req.path.includes('simulate') || req.originalUrl.includes('simulate') || req.body.includeTrace === true;
  const db = DatabaseService.getInstance();
  const ds = db.getDataset(datasetId);
  if (!ds) {
    res.status(404).json({ status: 'error', message: 'Dataset not found' });
    return;
  }

  const records = db.getRecords(datasetId);
  const adapter = EngineProcessAdapter.getInstance();

  try {
    // 1. Sync dataset records to engine
    await adapter.sendCommand({
      command: 'loadRecords',
      records
    });

    // 2. Build index on field
    await adapter.sendCommand({
      command: 'build',
      indexType,
      field
    });

    // 3. Run query or simulation
    const queryResp = await adapter.sendCommand({
      command: includeTrace ? 'simulate' : 'query',
      indexType,
      operation,
      field,
      value,
      lowerBound,
      upperBound,
      prefix,
      recordId: recordId || `SIM_${Date.now()}`,
      includeTrace: !!includeTrace
    });

    // If simulating, also attach current structure snapshot
    if (includeTrace && !queryResp.structure) {
      const struct = await adapter.sendCommand({
        command: 'getStructure',
        indexType
      });
      queryResp.structure = struct.structure;
      queryResp.stats = struct.stats;
    }

    res.json(queryResp);
  } catch (err) {
    console.error('[executeQuery] Error:', err);
    res.status(500).json({ status: 'error', message: (err as Error).message });
  }
}
