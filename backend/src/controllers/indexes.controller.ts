import { Request, Response } from 'express';
import { EngineProcessAdapter } from '../engine/process_adapter.js';
import { DatabaseService } from '../services/db.js';
import { isValidIndexType } from '../validators/index.js';

export async function buildIndex(req: Request, res: Response): Promise<void> {
  const { datasetId, indexType, field } = req.body;

  if (!datasetId || !indexType || !field) {
    res.status(400).json({ status: 'error', message: 'datasetId, indexType, and field are required' });
    return;
  }

  if (!isValidIndexType(indexType)) {
    res.status(400).json({ status: 'error', message: `Invalid indexType: ${indexType}` });
    return;
  }

  const db = DatabaseService.getInstance();
  const ds = db.getDataset(datasetId);
  if (!ds) {
    res.status(404).json({ status: 'error', message: 'Dataset not found' });
    return;
  }

  const records = db.getRecords(datasetId);
  const adapter = EngineProcessAdapter.getInstance();

  try {
    // 1. Load records into engine
    await adapter.sendCommand({
      command: 'loadRecords',
      records
    });

    // 2. Build index
    const buildResp = await adapter.sendCommand({
      command: 'build',
      indexType,
      field
    });

    res.json(buildResp);
  } catch (err) {
    console.error('[buildIndex] Error:', err);
    res.status(500).json({ status: 'error', message: (err as Error).message });
  }
}

export async function getIndexStructure(req: Request, res: Response): Promise<void> {
  const indexType = req.params.id; // or indexType in route
  if (!isValidIndexType(indexType)) {
    res.status(400).json({ status: 'error', message: `Invalid indexType: ${indexType}` });
    return;
  }

  const adapter = EngineProcessAdapter.getInstance();
  try {
    const structureResp = await adapter.sendCommand({
      command: 'getStructure',
      indexType
    });
    res.json(structureResp);
  } catch (err) {
    console.error('[getIndexStructure] Error:', err);
    res.status(500).json({ status: 'error', message: (err as Error).message });
  }
}
