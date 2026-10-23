import fs from 'fs';
import path from 'path';
import { Dataset, RecordItem, BenchmarkExperiment } from '../types/index.js';

interface StorageData {
  datasets: Dataset[];
  records: Record<string, RecordItem[]>; // datasetId -> RecordItem[]
  benchmarks: BenchmarkExperiment[];
}

export class DatabaseService {
  private static instance: DatabaseService;
  private filePath: string;
  private data: StorageData;

  private constructor() {
    const storageDir = path.resolve(process.cwd(), '../storage/data');
    if (!fs.existsSync(storageDir)) {
      fs.mkdirSync(storageDir, { recursive: true });
    }
    this.filePath = path.join(storageDir, 'database.json');
    this.data = this.load();
    if (this.data.datasets.length === 0) {
      this.seedInitialData();
    }
  }

  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  private load(): StorageData {
    if (fs.existsSync(this.filePath)) {
      try {
        const raw = fs.readFileSync(this.filePath, 'utf-8');
        return JSON.parse(raw);
      } catch (err) {
        console.error('[DB] Error reading storage file, initializing fresh:', err);
      }
    }
    return {
      datasets: [],
      records: {},
      benchmarks: []
    };
  }

  private save(): void {
    try {
      fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (err) {
      console.error('[DB] Error writing to storage file:', err);
    }
  }

  private seedInitialData(): void {
    console.log('[DB] Seeding initial Student dataset...');
    const studentDataset: Dataset = {
      id: 'students',
      name: 'Undergraduate Students',
      description: 'Engineering student directory with ID, name, branch, CGPA, and year of study.',
      fields: [
        { name: 'id', type: 'string' },
        { name: 'name', type: 'string' },
        { name: 'branch', type: 'string' },
        { name: 'cgpa', type: 'number' },
        { name: 'year', type: 'number' }
      ],
      recordCount: 60,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const firstNames = ['Aarav', 'Ananya', 'Rohan', 'Pooja', 'Vikram', 'Aditi', 'Rahul', 'Sneha', 'Arjun', 'Neha', 'Kabir', 'Tanvi', 'Siddharth', 'Meera', 'Rishi', 'Ishita', 'Dhruv', 'Riya', 'Karan', 'Tara'];
    const lastNames = ['Sharma', 'Verma', 'Patel', 'Iyer', 'Reddy', 'Nair', 'Deshmukh', 'Gupta', 'Singh', 'Chopra', 'Joshi', 'Mehta', 'Kulkarni', 'Bose', 'Rao'];
    const branches = ['Computer Science', 'Information Technology', 'Electronics & Comm', 'Mechanical', 'Electrical', 'Civil'];

    const studentRecords: RecordItem[] = [];
    let count = 0;
    for (let i = 1; i <= 60; ++i) {
      const fName = firstNames[(i * 3 + 7) % firstNames.length];
      const lName = lastNames[(i * 5 + 3) % lastNames.length];
      const branch = branches[i % branches.length];
      // Deterministic spread of CGPA between 6.5 and 9.9
      const cgpa = Number((6.5 + ((i * 17) % 35) * 0.1).toFixed(2));
      const year = (i % 4) + 1;

      studentRecords.push({
        id: `STU_${1000 + i}`,
        fields: {
          id: `STU_${1000 + i}`,
          name: `${fName} ${lName}`,
          branch,
          cgpa,
          year
        }
      });
      count++;
    }

    this.data.datasets.push(studentDataset);
    this.data.records['students'] = studentRecords;
    this.save();
    console.log(`[DB] Successfully seeded ${count} student records.`);
  }

  public getDatasets(): Dataset[] {
    return this.data.datasets;
  }

  public getDataset(id: string): Dataset | undefined {
    return this.data.datasets.find(d => d.id === id);
  }

  public createDataset(dataset: Omit<Dataset, 'recordCount' | 'createdAt' | 'updatedAt'>): Dataset {
    const newDs: Dataset = {
      ...dataset,
      recordCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.data.datasets.push(newDs);
    this.data.records[newDs.id] = [];
    this.save();
    return newDs;
  }

  public deleteDataset(id: string): boolean {
    const idx = this.data.datasets.findIndex(d => d.id === id);
    if (idx === -1) return false;
    this.data.datasets.splice(idx, 1);
    delete this.data.records[id];
    this.save();
    return true;
  }

  public getRecords(datasetId: string): RecordItem[] {
    return this.data.records[datasetId] || [];
  }

  public addRecords(datasetId: string, newRecords: RecordItem[]): number {
    if (!this.data.records[datasetId]) {
      this.data.records[datasetId] = [];
    }
    const current = this.data.records[datasetId];
    current.push(...newRecords);

    const ds = this.getDataset(datasetId);
    if (ds) {
      ds.recordCount = current.length;
      ds.updatedAt = new Date().toISOString();
    }
    this.save();
    return current.length;
  }

  public deleteRecord(datasetId: string, recordId: string): boolean {
    const list = this.data.records[datasetId];
    if (!list) return false;
    const idx = list.findIndex(r => r.id === recordId);
    if (idx === -1) return false;
    list.splice(idx, 1);
    const ds = this.getDataset(datasetId);
    if (ds) {
      ds.recordCount = list.length;
      ds.updatedAt = new Date().toISOString();
    }
    this.save();
    return true;
  }

  public saveBenchmark(exp: BenchmarkExperiment): void {
    this.data.benchmarks.unshift(exp);
    // Keep last 50 experiments
    if (this.data.benchmarks.length > 50) {
      this.data.benchmarks = this.data.benchmarks.slice(0, 50);
    }
    this.save();
  }

  public getBenchmarks(): BenchmarkExperiment[] {
    return this.data.benchmarks;
  }

  public getBenchmark(id: string): BenchmarkExperiment | undefined {
    return this.data.benchmarks.find(b => b.id === id);
  }
}
