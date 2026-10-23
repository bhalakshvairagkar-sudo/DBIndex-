import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { DatabaseService } from '../services/db.js';
import { validateDatasetPayload } from '../validators/index.js';
import { RecordItem } from '../types/index.js';

export function listDatasets(req: Request, res: Response): void {
  const db = DatabaseService.getInstance();
  const datasets = db.getDatasets();
  res.json({ status: 'ok', datasets });
}

export function getDataset(req: Request, res: Response): void {
  const db = DatabaseService.getInstance();
  const ds = db.getDataset(req.params.id);
  if (!ds) {
    res.status(404).json({ status: 'error', message: 'Dataset not found' });
    return;
  }
  res.json({ status: 'ok', dataset: ds });
}

export function createDataset(req: Request, res: Response): void {
  const validation = validateDatasetPayload(req.body);
  if (!validation.valid) {
    res.status(400).json({ status: 'error', message: validation.error });
    return;
  }

  const db = DatabaseService.getInstance();
  const id = req.body.id ? req.body.id.trim().toLowerCase().replace(/\s+/g, '_') : uuidv4().slice(0, 8);

  if (db.getDataset(id)) {
    res.status(409).json({ status: 'error', message: 'Dataset with this ID already exists' });
    return;
  }

  const ds = db.createDataset({
    id,
    name: req.body.name,
    description: req.body.description || '',
    fields: req.body.fields
  });

  res.status(201).json({ status: 'ok', dataset: ds });
}

export function deleteDataset(req: Request, res: Response): void {
  const db = DatabaseService.getInstance();
  const deleted = db.deleteDataset(req.params.id);
  if (!deleted) {
    res.status(404).json({ status: 'error', message: 'Dataset not found' });
    return;
  }
  res.json({ status: 'ok', message: 'Dataset deleted' });
}

export function getRecords(req: Request, res: Response): void {
  const db = DatabaseService.getInstance();
  const datasetId = req.params.id;
  const ds = db.getDataset(datasetId);
  if (!ds) {
    res.status(404).json({ status: 'error', message: 'Dataset not found' });
    return;
  }

  const page = parseInt(req.query.page as string, 10) || 1;
  const limit = parseInt(req.query.limit as string, 10) || 50;
  const all = db.getRecords(datasetId);

  const total = all.length;
  const start = (page - 1) * limit;
  const pagedRecords = all.slice(start, start + limit);

  res.json({
    status: 'ok',
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    records: pagedRecords
  });
}

export function insertRecords(req: Request, res: Response): void {
  const db = DatabaseService.getInstance();
  const datasetId = req.params.id;
  const ds = db.getDataset(datasetId);
  if (!ds) {
    res.status(404).json({ status: 'error', message: 'Dataset not found' });
    return;
  }

  const rawRecords = Array.isArray(req.body) ? req.body : req.body.records;
  if (!Array.isArray(rawRecords) || rawRecords.length === 0) {
    res.status(400).json({ status: 'error', message: 'Must supply an array of records' });
    return;
  }

  const recordsToInsert: RecordItem[] = rawRecords.map((r: any, idx: number) => {
    const id = r.id ? String(r.id) : `REC_${Date.now()}_${idx}`;
    const fields: Record<string, string | number> = {};

    for (const f of ds.fields) {
      if (r.fields && r.fields[f.name] !== undefined) {
        fields[f.name] = f.type === 'number' ? Number(r.fields[f.name]) : String(r.fields[f.name]);
      } else if (r[f.name] !== undefined) {
        fields[f.name] = f.type === 'number' ? Number(r[f.name]) : String(r[f.name]);
      } else {
        fields[f.name] = f.type === 'number' ? 0 : '';
      }
    }
    return { id, fields };
  });

  const total = db.addRecords(datasetId, recordsToInsert);
  res.json({ status: 'ok', added: recordsToInsert.length, totalRecords: total });
}

export function deleteRecord(req: Request, res: Response): void {
  const db = DatabaseService.getInstance();
  const datasetId = req.params.id;
  const recordId = req.params.recordId;

  const deleted = db.deleteRecord(datasetId, recordId);
  if (!deleted) {
    res.status(404).json({ status: 'error', message: 'Record not found' });
    return;
  }
  res.json({ status: 'ok', message: 'Record removed successfully' });
}

export function importCsv(req: Request, res: Response): void {
  const db = DatabaseService.getInstance();
  const datasetId = req.params.id;
  const ds = db.getDataset(datasetId);
  if (!ds) {
    res.status(404).json({ status: 'error', message: 'Dataset not found' });
    return;
  }

  const csvContent = req.body.csv;
  if (!csvContent || typeof csvContent !== 'string') {
    res.status(400).json({ status: 'error', message: 'CSV string content required in request body { csv: "..." }' });
    return;
  }

  const lines = csvContent.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
  if (lines.length < 2) {
    res.status(400).json({ status: 'error', message: 'CSV must contain a header row and at least one data row' });
    return;
  }

  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  const parsedRecords: RecordItem[] = [];

  for (let i = 1; i < lines.length; ++i) {
    const cols = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''));
    const recId = `CSV_${i}_${Date.now()}`;
    const fields: Record<string, string | number> = {};

    headers.forEach((h, colIdx) => {
      const fieldDef = ds.fields.find(f => f.name.toLowerCase() === h.toLowerCase());
      if (fieldDef) {
        const val = cols[colIdx] ?? '';
        fields[fieldDef.name] = fieldDef.type === 'number' ? (Number(val) || 0) : val;
      }
    });

    parsedRecords.push({ id: recId, fields });
  }

  const total = db.addRecords(datasetId, parsedRecords);
  res.json({
    status: 'ok',
    importedCount: parsedRecords.length,
    totalRecords: total
  });
}

export function generateRecords(req: Request, res: Response): void {
  const db = DatabaseService.getInstance();
  const datasetId = req.params.id;
  const ds = db.getDataset(datasetId);
  if (!ds) {
    res.status(404).json({ status: 'error', message: 'Dataset not found' });
    return;
  }

  const count = Math.min(Math.max(Number(req.body.count) || 100, 10), 2000);
  const firstNames = ['Aarav', 'Ananya', 'Rohan', 'Pooja', 'Vikram', 'Aditi', 'Rahul', 'Sneha', 'Arjun', 'Neha', 'Kabir', 'Tanvi', 'Siddharth', 'Meera', 'Rishi', 'Ishita', 'Dhruv', 'Riya', 'Karan', 'Tara', 'Dev', 'Shreya', 'Manish', 'Kavita', 'Sameer'];
  const lastNames = ['Sharma', 'Verma', 'Patel', 'Iyer', 'Reddy', 'Nair', 'Deshmukh', 'Gupta', 'Singh', 'Chopra', 'Joshi', 'Mehta', 'Kulkarni', 'Bose', 'Rao', 'Bhat', 'Pandey', 'Saxena', 'Kapoor'];
  const branches = ['Computer Science', 'Information Technology', 'Electronics & Comm', 'Mechanical', 'Electrical', 'Civil'];

  const generated: RecordItem[] = [];
  const startId = Date.now();

  for (let i = 0; i < count; ++i) {
    const id = `GEN_${startId}_${i + 1}`;
    const fields: Record<string, string | number> = {};
    for (const f of ds.fields) {
      if (f.name === 'id') {
        fields.id = id;
      } else if (f.name === 'name') {
        const fn = firstNames[Math.floor(Math.random() * firstNames.length)];
        const ln = lastNames[Math.floor(Math.random() * lastNames.length)];
        fields.name = `${fn} ${ln}`;
      } else if (f.name === 'branch') {
        fields.branch = branches[Math.floor(Math.random() * branches.length)];
      } else if (f.name === 'cgpa') {
        fields.cgpa = Number((6.0 + Math.random() * 3.9).toFixed(2));
      } else if (f.name === 'year') {
        fields.year = Math.floor(Math.random() * 4) + 1;
      } else if (f.type === 'number') {
        fields[f.name] = Number((Math.random() * 100).toFixed(2));
      } else {
        fields[f.name] = `Value_${i + 1}`;
      }
    }
    generated.push({ id, fields });
  }

  const total = db.addRecords(datasetId, generated);
  res.json({
    status: 'ok',
    generatedCount: count,
    totalRecords: total
  });
}
