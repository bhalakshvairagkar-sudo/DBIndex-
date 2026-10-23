import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { EngineProcessAdapter } from '../engine/process_adapter.js';
import { DatabaseService } from '../services/db.js';
import { BenchmarkExperiment } from '../types/index.js';

export async function runBenchmark(req: Request, res: Response): Promise<void> {
  const { datasetId, field, indexTypes, queries, iterations = 5 } = req.body;

  if (!datasetId || !field) {
    res.status(400).json({ status: 'error', message: 'datasetId and field are required' });
    return;
  }

  const db = DatabaseService.getInstance();
  const ds = db.getDataset(datasetId);
  if (!ds) {
    res.status(404).json({ status: 'error', message: 'Dataset not found' });
    return;
  }

  const records = db.getRecords(datasetId);
  if (records.length === 0) {
    res.status(400).json({ status: 'error', message: 'Dataset has no records to benchmark' });
    return;
  }

  const adapter = EngineProcessAdapter.getInstance();

  try {
    // 1. Sync records to engine
    await adapter.sendCommand({
      command: 'loadRecords',
      records
    });

    // 2. Prepare default queries if none provided
    const effectiveQueries = (queries && queries.length > 0) ? queries : [
      { operation: 'exact', value: records[Math.floor(records.length / 2)].fields[field] || 8.5 },
      { operation: 'range', lowerBound: 7.0, upperBound: 9.0 }
    ];

    const typesToTest = (indexTypes && indexTypes.length > 0)
      ? indexTypes
      : ['LinearScan', 'BST', 'AVL', 'Hash', 'BTree', 'BPlusTree'];

    // 3. Request engine to run benchmark
    const engineResp = await adapter.sendCommand({
      command: 'benchmark',
      field,
      iterations: Math.min(Math.max(Number(iterations), 1), 50),
      queries: effectiveQueries,
      indexTypes: typesToTest
    }, 15000);

    // 4. Save to experiment history
    const experiment: BenchmarkExperiment = {
      id: uuidv4().slice(0, 8),
      timestamp: new Date().toISOString(),
      datasetId,
      datasetName: ds.name,
      field,
      recordCount: records.length,
      iterations: Number(iterations) || 5,
      results: engineResp.results || []
    };

    db.saveBenchmark(experiment);

    res.json({
      status: 'ok',
      experiment
    });
  } catch (err) {
    console.error('[runBenchmark] Error:', err);
    res.status(500).json({ status: 'error', message: (err as Error).message });
  }
}

export function listBenchmarks(req: Request, res: Response): void {
  const db = DatabaseService.getInstance();
  const benchmarks = db.getBenchmarks();
  res.json({ status: 'ok', benchmarks });
}

export function getBenchmark(req: Request, res: Response): void {
  const db = DatabaseService.getInstance();
  const exp = db.getBenchmark(req.params.id);
  if (!exp) {
    res.status(404).json({ status: 'error', message: 'Benchmark experiment not found' });
    return;
  }
  res.json({ status: 'ok', experiment: exp });
}
