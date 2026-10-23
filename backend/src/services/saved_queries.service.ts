import fs from 'fs';
import path from 'path';

export interface SavedQuery {
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

const DEFAULT_QUERIES: SavedQuery[] = [
  {
    id: 'sq_1',
    title: 'Get Students by Department',
    sql: `SELECT id, name, department, cgpa, email\nFROM students\nWHERE department = 'CSE'\nORDER BY cgpa DESC;`,
    folder: 'Frequently Used',
    description: 'SELECT with WHERE clause on department index and ORDER BY cgpa',
    isStarred: true,
    database: 'my_database',
    executionCount: 14,
    lastExecuted: new Date(Date.now() - 1000 * 60 * 7).toISOString()
  },
  {
    id: 'sq_2',
    title: 'Top CGPA Students',
    sql: `SELECT id, name, department, cgpa, year\nFROM students\nORDER BY cgpa DESC\nLIMIT 10;`,
    folder: 'Frequently Used',
    description: 'Top academic achievers sorted by CGPA index',
    isStarred: true,
    database: 'my_database',
    executionCount: 8,
    lastExecuted: new Date(Date.now() - 1000 * 60 * 30).toISOString()
  },
  {
    id: 'sq_3',
    title: 'Count Students per Department',
    sql: `SELECT department, COUNT(*) as total_students, ROUND(AVG(cgpa), 2) as avg_cgpa\nFROM students\nGROUP BY department\nORDER BY total_students DESC;`,
    folder: 'Frequently Used',
    description: 'Aggregations and group-by department',
    isStarred: false,
    database: 'my_database',
    executionCount: 5
  },
  {
    id: 'sq_4',
    title: 'Find Low CGPA Students',
    sql: `SELECT id, name, department, cgpa\nFROM students\nWHERE cgpa < 7.50\nORDER BY cgpa ASC;`,
    folder: 'Frequently Used',
    description: 'Conditional filtering for academic counseling',
    isStarred: false,
    database: 'my_database',
    executionCount: 3
  },
  {
    id: 'sq_5',
    title: 'Check Index Usage',
    sql: `SHOW INDEXES FROM students;`,
    folder: 'Index Analysis',
    description: 'Inspect cardinality and index collation metadata',
    isStarred: true,
    database: 'my_database',
    executionCount: 12
  },
  {
    id: 'sq_6',
    title: 'Compare Query Performance',
    sql: `EXPLAIN ANALYZE SELECT id, name, department, cgpa FROM students WHERE department = 'CSE' ORDER BY cgpa DESC;`,
    folder: 'Index Analysis',
    description: 'Inspect exact loops, rows, and engine timing',
    isStarred: false,
    database: 'my_database',
    executionCount: 9
  },
  {
    id: 'sq_7',
    title: 'Find Missing Index Opportunities',
    sql: `EXPLAIN SELECT * FROM students WHERE email LIKE '%@vit.edu' AND year = 3;`,
    folder: 'Index Analysis',
    description: 'Evaluate index coverage on compound conditions',
    isStarred: false,
    database: 'my_database',
    executionCount: 4
  },
  {
    id: 'sq_8',
    title: 'Year-wise Performance Summary',
    sql: `SELECT year, COUNT(*) as total, ROUND(AVG(cgpa), 2) as avg_gpa\nFROM students\nGROUP BY year\nORDER BY year ASC;`,
    folder: 'Reports',
    description: 'Cohort progression analysis across 4 academic years',
    isStarred: false,
    database: 'my_database',
    executionCount: 6
  },
  {
    id: 'sq_9',
    title: 'Department CGPA Distribution',
    sql: `SELECT department, MIN(cgpa) as min_gpa, MAX(cgpa) as max_gpa, ROUND(AVG(cgpa), 2) as avg_gpa\nFROM students\nGROUP BY department;`,
    folder: 'Reports',
    description: 'Inter-department comparative performance report',
    isStarred: false,
    database: 'my_database',
    executionCount: 2
  },
  {
    id: 'sq_10',
    title: 'Course Enrollment Overview',
    sql: `SELECT course_id, course_name, credits, department FROM courses ORDER BY credits DESC;`,
    folder: 'Reports',
    description: 'Active curriculum credit allocations',
    isStarred: false,
    database: 'my_database',
    executionCount: 3
  },
  {
    id: 'sq_11',
    title: 'Full Table Scan Benchmark',
    sql: `SELECT * FROM students IGNORE INDEX (idx_department, idx_department_cgpa) WHERE department = 'CSE';`,
    folder: 'Test Queries',
    description: 'Force optimizer to evaluate sequential table scan cost',
    isStarred: false,
    database: 'my_database',
    executionCount: 7
  },
  {
    id: 'sq_12',
    title: 'Composite Index Key Test',
    sql: `SELECT id, name, department, cgpa FROM students WHERE department = 'CSE' AND cgpa > 8.50;`,
    folder: 'Test Queries',
    description: 'Exercise multi-column index prefix matching',
    isStarred: false,
    database: 'my_database',
    executionCount: 5
  }
];

export class SavedQueriesService {
  private static instance: SavedQueriesService;
  private filePath: string;
  private queries: SavedQuery[] = [];

  private constructor() {
    this.filePath = path.resolve(process.cwd(), 'data', 'saved_queries.json');
    this.load();
  }

  public static getInstance(): SavedQueriesService {
    if (!SavedQueriesService.instance) {
      SavedQueriesService.instance = new SavedQueriesService();
    }
    return SavedQueriesService.instance;
  }

  private load() {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf-8');
        this.queries = JSON.parse(raw);
      } else {
        this.queries = [...DEFAULT_QUERIES];
        this.save();
      }
    } catch {
      this.queries = [...DEFAULT_QUERIES];
    }
  }

  private save() {
    try {
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(this.filePath, JSON.stringify(this.queries, null, 2), 'utf-8');
    } catch (err) {
      console.warn('Failed to persist saved queries:', err);
    }
  }

  public getQueries(): SavedQuery[] {
    return this.queries;
  }

  public addQuery(q: Omit<SavedQuery, 'id' | 'executionCount'>): SavedQuery {
    const newQuery: SavedQuery = {
      ...q,
      id: `sq_${Date.now()}`,
      executionCount: 0
    };
    this.queries.unshift(newQuery);
    this.save();
    return newQuery;
  }

  public updateQuery(id: string, updates: Partial<SavedQuery>): SavedQuery | null {
    const idx = this.queries.findIndex(q => q.id === id);
    if (idx === -1) return null;
    this.queries[idx] = { ...this.queries[idx], ...updates };
    this.save();
    return this.queries[idx];
  }

  public deleteQuery(id: string): boolean {
    const initial = this.queries.length;
    this.queries = this.queries.filter(q => q.id !== id);
    if (this.queries.length !== initial) {
      this.save();
      return true;
    }
    return false;
  }
}
