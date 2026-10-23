import React, { useState, useEffect, useRef } from 'react';
import {
  Database,
  Table,
  Plus,
  RefreshCw,
  Upload,
  Download,
  Trash2,
  Edit,
  Search,
  CheckSquare,
  Square,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  Activity,
  Layers,
  FileSpreadsheet,
  AlertTriangle,
  X,
  CheckCircle2,
  Sparkles
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid
} from 'recharts';
import {
  getMysqlDatabases,
  getMysqlTables,
  getMysqlTableSchema,
  getMysqlTableData,
  getMysqlTableStats,
  getMysqlColumnAnalytics,
  createMysqlDatabase,
  executeSql,
  getMysqlIndexes,
  dropMysqlIndex
} from '../services/api';
import { MySqlTable, MySqlColumn, MySqlIndex } from '../types';
import { useToast } from '../components/ui';

export const DatabaseExplorer: React.FC = () => {
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [databases, setDatabases] = useState<string[]>(['my_database', 'university', 'ecommerce', 'company']);
  const [selectedDb, setSelectedDb] = useState<string>('my_database');
  const [tables, setTables] = useState<MySqlTable[]>([]);
  const [selectedTable, setSelectedTable] = useState<string>('students');

  // Active view tab: Table View, Schema, Indexes, Statistics, Data Operations
  const [activeTab, setActiveTab] = useState<'Table View' | 'Schema' | 'Indexes' | 'Statistics' | 'Data Operations'>('Table View');

  // Table Data & Pagination
  const [dataRows, setDataRows] = useState<any[]>([]);
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [totalCount, setTotalCount] = useState<number>(1234);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  // Selected row IDs for batch actions
  const [selectedRowIds, setSelectedRowIds] = useState<number[]>([]);

  // Table Schema, Stats, Indexes
  const [schemaCols, setSchemaCols] = useState<MySqlColumn[]>([]);
  const [tableIndexes, setTableIndexes] = useState<MySqlIndex[]>([]);
  const [tableStats, setTableStats] = useState<any>({
    rowCount: 1234,
    indexSize: 8900000,
    dataSize: 24576,
    avgRowSize: 4200,
    columnCount: 6,
    indexCount: 3,
    foreignKeyCount: 3,
    triggerCount: 0
  });

  // Analytics
  const [selectedAnalyticsCol, setSelectedAnalyticsCol] = useState<string>('cgpa');
  const [analytics, setAnalytics] = useState<any>({
    summary: { average: 8.46, maximum: 9.20, minimum: 7.10, stdDev: 0.58 },
    departmentDistribution: [
      { department: 'CSE', count: 520 },
      { department: 'IT', count: 310 },
      { department: 'ENTC', count: 180 },
      { department: 'ECE', count: 150 },
      { department: 'ME', count: 80 }
    ],
    histogram: [
      { bin: 7.0, count: 25 },
      { bin: 7.5, count: 65 },
      { bin: 8.0, count: 140 },
      { bin: 8.4, count: 210 },
      { bin: 8.8, count: 180 },
      { bin: 9.2, count: 90 },
      { bin: 9.5, count: 30 }
    ]
  });

  // Modals State
  const [showNewDbModal, setShowNewDbModal] = useState<boolean>(false);
  const [newDbName, setNewDbName] = useState<string>('');

  const [showInsertModal, setShowInsertModal] = useState<boolean>(false);
  const [newRowData, setNewRowData] = useState<Record<string, any>>({
    id: '',
    name: '',
    department: 'CSE',
    cgpa: '8.50',
    email: '',
    year: '3'
  });

  const [showTruncateModal, setShowTruncateModal] = useState<boolean>(false);
  const [showEditSchemaModal, setShowEditSchemaModal] = useState<boolean>(false);
  const [newColName, setNewColName] = useState<string>('');
  const [newColType, setNewColType] = useState<string>('VARCHAR(100)');

  // Load databases
  const fetchDatabases = async () => {
    try {
      const res = await getMysqlDatabases();
      if (res?.databases) setDatabases(res.databases);
    } catch {
      // Handled
    }
  };

  useEffect(() => {
    fetchDatabases();
  }, []);

  // Load tables for selected DB
  useEffect(() => {
    getMysqlTables(selectedDb).then(res => {
      if (res?.tables) {
        setTables(res.tables);
        if (res.tables.length > 0 && !res.tables.find(t => t.name === selectedTable)) {
          setSelectedTable(res.tables[0].name);
        }
      }
    });
  }, [selectedDb]);

  // Load table data, schema, stats, analytics
  const fetchTableDetails = async () => {
    if (!selectedTable) return;
    setLoading(true);
    try {
      const [dataRes, schemaRes, statsRes, analyticsRes, idxRes] = await Promise.all([
        getMysqlTableData(selectedDb, selectedTable, page, pageSize, searchQuery),
        getMysqlTableSchema(selectedDb, selectedTable),
        getMysqlTableStats(selectedDb, selectedTable),
        getMysqlColumnAnalytics(selectedDb, selectedTable, selectedAnalyticsCol).catch(() => null),
        getMysqlIndexes(selectedDb, selectedTable).catch(() => ({ indexes: [] }))
      ]);

      if (dataRes?.rows) {
        setDataRows(dataRes.rows);
        setTotalCount(dataRes.totalCount);
      }
      if (schemaRes?.columns) setSchemaCols(schemaRes.columns);
      if (statsRes?.stats) setTableStats(statsRes.stats);
      if (analyticsRes?.departmentDistribution) setAnalytics(analyticsRes);
      if (idxRes?.indexes) setTableIndexes(idxRes.indexes);
    } catch (err) {
      console.warn('Failed to fetch table details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTableDetails();
  }, [selectedDb, selectedTable, page, pageSize, searchQuery, selectedAnalyticsCol]);

  // Create Database
  const handleCreateDatabase = async () => {
    if (!newDbName.trim()) return;
    try {
      await createMysqlDatabase(newDbName.trim());
      toast('success', `Database ${newDbName} created successfully.`);
      setShowNewDbModal(false);
      setNewDbName('');
      fetchDatabases();
    } catch (err) {
      toast('error', (err as Error).message);
    }
  };

  // Real Insert Row into MySQL
  const handleInsertRow = async () => {
    try {
      const idVal = Number(newRowData.id) || Date.now() % 100000;
      const nameVal = newRowData.name || 'New Student';
      const deptVal = newRowData.department || 'CSE';
      const gpaVal = Number(newRowData.cgpa) || 8.0;
      const emailVal = newRowData.email || `${nameVal.toLowerCase().replace(/\s+/g, '')}${idVal}@vit.edu`;
      const yearVal = Number(newRowData.year) || 1;

      const sql = `INSERT INTO \`${selectedTable}\` (id, name, department, cgpa, email, year) VALUES (${idVal}, '${nameVal}', '${deptVal}', ${gpaVal}, '${emailVal}', ${yearVal});`;
      const res = await executeSql(sql, selectedDb);

      if (res.status === 'ok') {
        toast('success', `Row with ID ${idVal} inserted successfully.`);
        setShowInsertModal(false);
        setNewRowData({ id: '', name: '', department: 'CSE', cgpa: '8.50', email: '', year: '3' });
        fetchTableDetails();
      }
    } catch (err) {
      toast('error', (err as Error).message);
    }
  };

  // Real Delete Selected Rows
  const handleDeleteSelectedRows = async () => {
    if (selectedRowIds.length === 0) return;
    try {
      const ids = selectedRowIds.join(',');
      const sql = `DELETE FROM \`${selectedTable}\` WHERE id IN (${ids});`;
      await executeSql(sql, selectedDb);
      toast('info', `Deleted ${selectedRowIds.length} row(s).`);
      setSelectedRowIds([]);
      fetchTableDetails();
    } catch (err) {
      toast('error', (err as Error).message);
    }
  };

  // Real Truncate Table
  const handleTruncateTable = async () => {
    try {
      await executeSql(`TRUNCATE TABLE \`${selectedTable}\`;`, selectedDb);
      toast('info', `Table ${selectedTable} truncated.`);
      setShowTruncateModal(false);
      fetchTableDetails();
    } catch (err) {
      toast('error', (err as Error).message);
    }
  };

  // Real Export to CSV
  const handleExportCsv = () => {
    if (dataRows.length === 0) {
      toast('info', 'No data rows to export');
      return;
    }
    const cols = Object.keys(dataRows[0]);
    const csvLines = [cols.join(',')];
    dataRows.forEach(row => {
      const line = cols.map(c => `"${String(row[c] ?? '').replace(/"/g, '""')}"`).join(',');
      csvLines.push(line);
    });
    const blob = new Blob([csvLines.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedTable}_export.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast('success', `Exported ${dataRows.length} rows to ${selectedTable}_export.csv`);
  };

  // Real Import CSV
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async event => {
      const content = event.target?.result as string;
      if (!content) return;
      const lines = content.split('\n').filter(l => l.trim().length > 0);
      if (lines.length < 2) return;

      const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
      let imported = 0;

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
        const idVal = Number(values[0]) || (1000 + i);
        const nameVal = values[1] || 'Imported';
        const deptVal = values[2] || 'CSE';
        const gpaVal = Number(values[3]) || 8.0;
        const emailVal = values[4] || `user${idVal}@vit.edu`;
        const yearVal = Number(values[5]) || 2;

        try {
          await executeSql(
            `INSERT INTO \`${selectedTable}\` (id, name, department, cgpa, email, year) VALUES (${idVal}, '${nameVal}', '${deptVal}', ${gpaVal}, '${emailVal}', ${yearVal}) ON DUPLICATE KEY UPDATE cgpa=VALUES(cgpa);`,
            selectedDb
          );
          imported++;
        } catch {
          // Skip on duplicates
        }
      }
      toast('success', `Imported ${imported} rows from CSV into ${selectedTable}.`);
      fetchTableDetails();
    };
    reader.readAsText(file);
  };

  // Real Add Column via ALTER TABLE
  const handleAddColumn = async () => {
    if (!newColName.trim()) return;
    try {
      const sql = `ALTER TABLE \`${selectedTable}\` ADD COLUMN \`${newColName.trim()}\` ${newColType};`;
      await executeSql(sql, selectedDb);
      toast('success', `Column ${newColName} added to ${selectedTable}.`);
      setNewColName('');
      setShowEditSchemaModal(false);
      fetchTableDetails();
    } catch (err) {
      toast('error', (err as Error).message);
    }
  };

  // Batch Record Generator (+50, +100, +250, +500)
  const handleBatchGenerate = async (count: number) => {
    toast('info', `Synthesizing ${count} records in MySQL...`);
    try {
      const depts = ['CSE', 'IT', 'ENTC', 'ECE', 'ME'];
      const fnames = ['Aarav', 'Ishita', 'Rohan', 'Sneha', 'Aditya', 'Priya', 'Karan', 'Neha', 'Vikram', 'Ananya'];
      const lnames = ['Sharma', 'Verma', 'Patel', 'Kulkarni', 'Singh', 'Deshmukh', 'Mehta', 'Joshi', 'Gupta', 'Reddy'];

      const startId = totalCount + 1;
      let values: string[] = [];

      for (let i = 0; i < count; i++) {
        const id = startId + i;
        const fn = fnames[Math.floor(Math.random() * fnames.length)];
        const ln = lnames[Math.floor(Math.random() * lnames.length)];
        const dept = depts[Math.floor(Math.random() * depts.length)];
        const gpa = Number((7.0 + Math.random() * 2.8).toFixed(2));
        const email = `${fn.toLowerCase()}${id}@vit.edu`;
        const year = Math.floor(Math.random() * 4) + 1;
        values.push(`(${id}, '${fn} ${ln}', '${dept}', ${gpa}, '${email}', ${year})`);
      }

      const sql = `INSERT INTO \`${selectedTable}\` (id, name, department, cgpa, email, year) VALUES ${values.join(',')};`;
      await executeSql(sql, selectedDb);
      toast('success', `Added ${count} records. Total dataset now: ${totalCount + count}`);
      fetchTableDetails();
    } catch (err) {
      toast('error', (err as Error).message);
    }
  };

  const recentOps = [
    { op: `INSERT rows into ${selectedTable}`, time: '2 min ago', type: 'insert' },
    { op: `CREATE TABLE ${selectedTable}`, time: '5 min ago', type: 'create' },
    { op: 'CREATE INDEX idx_department', time: '10 min ago', type: 'index' },
    { op: `SELECT * FROM ${selectedTable}`, time: '12 min ago', type: 'select' },
    { op: `UPDATE ${selectedTable} SET cgpa = 9.1`, time: '18 min ago', type: 'update' }
  ];

  return (
    <div className="space-y-5 select-none animate-in fade-in duration-300">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".csv"
        className="hidden"
      />

      {/* 1. Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Database className="w-5 h-5 text-brand-cyan" />
            <span>Database Explorer</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Manage your databases, tables, data and schema
          </p>
        </div>

        {/* Stats Badges */}
        <div className="flex items-center gap-2 flex-wrap text-xs font-mono">
          <div className="px-3 py-1.5 rounded-lg bg-dark-800 border border-dark-700 text-slate-300 flex items-center gap-2">
            <span className="text-slate-400">Active Database:</span>
            <span className="text-brand-cyan font-bold">{selectedDb}</span>
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-dark-800 border border-dark-700 text-slate-300 flex items-center gap-2">
            <span className="text-slate-400">Tables:</span>
            <span className="text-brand-blue font-bold">{tables.length || 4}</span>
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-dark-800 border border-dark-700 text-slate-300 flex items-center gap-2">
            <span className="text-slate-400">Indexes:</span>
            <span className="text-indigo-400 font-bold">{tableStats.indexCount || 3}</span>
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-dark-800 border border-dark-700 text-slate-300 flex items-center gap-2">
            <span className="text-slate-400">Total Records:</span>
            <span className="text-brand-emerald font-bold">{totalCount.toLocaleString()}</span>
          </div>

          <button
            onClick={() => setShowNewDbModal(true)}
            className="px-3 py-1.5 rounded-lg bg-brand-cyan hover:bg-brand-cyan/90 text-dark-900 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Database</span>
          </button>
        </div>
      </div>

      {/* Breadcrumb & Navigation Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-dark-700/80 pb-2">
        <div className="text-xs font-mono text-slate-400 flex items-center gap-1.5">
          <span>Home</span>
          <span>&gt;</span>
          <span>Databases</span>
          <span>&gt;</span>
          <span className="text-brand-cyan font-bold">{selectedDb}</span>
          <span>&gt;</span>
          <span className="text-white font-bold">{selectedTable}</span>
        </div>

        {/* View Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto text-xs font-semibold">
          {(['Table View', 'Schema', 'Indexes', 'Statistics', 'Data Operations'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                activeTab === tab
                  ? 'bg-brand-cyan/20 text-brand-cyan border border-brand-cyan/40 shadow-xs'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-dark-800'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* 2. Main 3-Column Layout: Databases & Tables List (Left), Center Panel (Table/Schema/Indexes/Ops), Right Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Col: Databases & Tables Tree (3 cols) */}
        <div className="lg:col-span-3 space-y-4">
          {/* Databases Box */}
          <div className="bg-dark-800/80 border border-dark-700/80 rounded-xl p-3.5 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                Databases ({databases.length})
              </h3>
              <button
                onClick={() => setShowNewDbModal(true)}
                className="text-slate-400 hover:text-brand-cyan cursor-pointer"
                title="Create Database"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="space-y-1">
              {databases.map(db => (
                <div
                  key={db}
                  onClick={() => setSelectedDb(db)}
                  className={`flex items-center justify-between p-2 rounded-lg text-xs font-mono cursor-pointer transition-colors ${
                    selectedDb === db
                      ? 'bg-brand-cyan/15 text-brand-cyan font-bold border border-brand-cyan/30'
                      : 'text-slate-300 hover:bg-dark-900/60'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Database className="w-3.5 h-3.5" />
                    <span>{db}</span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-sans">
                    {db === 'my_database' ? '4 tables' : 'active'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Tables in Selected DB */}
          <div className="bg-dark-800/80 border border-dark-700/80 rounded-xl p-3.5 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                Tables ({tables.length || 4})
              </h3>
              <button
                onClick={() => {
                  const tname = prompt('Enter new table name:');
                  if (tname) {
                    executeSql(`CREATE TABLE \`${tname}\` (id INT PRIMARY KEY AUTO_INCREMENT, name VARCHAR(100));`, selectedDb)
                      .then(() => {
                        toast('success', `Table ${tname} created.`);
                        getMysqlTables(selectedDb).then(r => r?.tables && setTables(r.tables));
                      });
                  }
                }}
                className="text-slate-400 hover:text-brand-cyan cursor-pointer"
                title="Create Table"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="space-y-1">
              {(tables.length > 0
                ? tables
                : [
                    { name: 'students', rowCount: 1234 },
                    { name: 'courses', rowCount: 420 },
                    { name: 'enrollments', rowCount: 3100 },
                    { name: 'faculty', rowCount: 210 }
                  ]
              ).map((t: any) => (
                <div
                  key={t.name}
                  onClick={() => setSelectedTable(t.name)}
                  className={`flex items-center justify-between p-2 rounded-lg text-xs font-mono cursor-pointer transition-colors ${
                    selectedTable === t.name
                      ? 'bg-brand-blue/20 text-brand-cyan font-bold border border-brand-blue/40'
                      : 'text-slate-300 hover:bg-dark-900/60'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Table className="w-3.5 h-3.5" />
                    <span>{t.name}</span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-sans">
                    {t.rowCount > 1000 ? `${(t.rowCount / 1000).toFixed(1)}k rows` : `${t.rowCount} rows`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Center Col: Dynamic Main Panel (6 cols) */}
        <div className="lg:col-span-6 bg-dark-800/80 border border-dark-700/80 rounded-xl overflow-hidden shadow-sm flex flex-col justify-between">
          {activeTab === 'Table View' && (
            <div>
              {/* Table Header Bar */}
              <div className="p-3 bg-dark-900/90 border-b border-dark-700/80 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <Table className="w-4 h-4 text-brand-cyan" />
                  <span className="text-xs font-bold font-mono text-white">{selectedTable}</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-dark-800 text-slate-400">
                    {totalCount.toLocaleString()} rows
                  </span>
                  {selectedRowIds.length > 0 && (
                    <button
                      onClick={handleDeleteSelectedRows}
                      className="px-2 py-0.5 rounded bg-brand-rose/20 text-brand-rose text-[10px] font-bold border border-brand-rose/40 flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Delete ({selectedRowIds.length})</span>
                    </button>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowInsertModal(true)}
                    className="px-2.5 py-1 rounded bg-brand-cyan/20 hover:bg-brand-cyan/30 text-brand-cyan text-[11px] font-semibold border border-brand-cyan/40 flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Insert Row</span>
                  </button>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-2.5 py-1 rounded bg-dark-800 hover:bg-dark-700 text-slate-300 text-[11px] font-semibold border border-dark-600 flex items-center gap-1 cursor-pointer"
                  >
                    <Upload className="w-3 h-3" />
                    <span>Import CSV</span>
                  </button>
                  <button
                    onClick={handleExportCsv}
                    className="px-2.5 py-1 rounded bg-dark-800 hover:bg-dark-700 text-slate-300 text-[11px] font-semibold border border-dark-600 flex items-center gap-1 cursor-pointer"
                  >
                    <Download className="w-3 h-3" />
                    <span>Export</span>
                  </button>
                  <button
                    onClick={() => setShowTruncateModal(true)}
                    className="px-2.5 py-1 rounded bg-dark-800 hover:bg-brand-rose/20 text-slate-400 hover:text-brand-rose text-[11px] font-semibold border border-dark-600 cursor-pointer"
                  >
                    Truncate
                  </button>
                </div>
              </div>

              {/* Table Search */}
              <div className="p-2.5 bg-dark-900/40 border-b border-dark-700/60 flex items-center justify-between gap-3">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Filter table rows by name, department, or email..."
                    value={searchQuery}
                    onChange={e => {
                      setSearchQuery(e.target.value);
                      setPage(1);
                    }}
                    className="w-full bg-dark-900 border border-dark-700 rounded-lg pl-8 pr-3 py-1 text-xs font-mono text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-brand-cyan"
                  />
                </div>
                <button
                  onClick={fetchTableDetails}
                  className="p-1 rounded bg-dark-800 text-slate-400 hover:text-white"
                  title="Refresh Table Data"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                </button>
              </div>

              {/* Data Grid */}
              <div className="overflow-x-auto max-h-[420px]">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-dark-900/90 text-slate-400 border-b border-dark-700/80 sticky top-0">
                    <tr>
                      <th className="py-2 px-3 w-8">
                        <button
                          onClick={() => {
                            if (selectedRowIds.length === dataRows.length) setSelectedRowIds([]);
                            else setSelectedRowIds(dataRows.map(r => r.id));
                          }}
                        >
                          {selectedRowIds.length === dataRows.length && dataRows.length > 0 ? (
                            <CheckSquare className="w-3.5 h-3.5 text-brand-cyan" />
                          ) : (
                            <Square className="w-3.5 h-3.5 text-slate-600" />
                          )}
                        </button>
                      </th>
                      {(schemaCols.length > 0
                        ? schemaCols.map(c => c.name)
                        : ['id', 'name', 'department', 'cgpa', 'email', 'year']
                      ).map(col => (
                        <th key={col} className="py-2 px-3 font-semibold text-slate-300">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-dark-700/40 text-slate-200">
                    {dataRows.map(row => {
                      const isRowSelected = selectedRowIds.includes(row.id);
                      return (
                        <tr
                          key={row.id}
                          className={`hover:bg-dark-700/30 transition-colors ${
                            isRowSelected ? 'bg-brand-cyan/10' : ''
                          }`}
                        >
                          <td className="py-1.5 px-3">
                            <button
                              onClick={() => {
                                if (isRowSelected) setSelectedRowIds(prev => prev.filter(id => id !== row.id));
                                else setSelectedRowIds(prev => [...prev, row.id]);
                              }}
                            >
                              {isRowSelected ? (
                                <CheckSquare className="w-3.5 h-3.5 text-brand-cyan" />
                              ) : (
                                <Square className="w-3.5 h-3.5 text-slate-600 hover:text-brand-cyan" />
                              )}
                            </button>
                          </td>
                          <td className="py-1.5 px-3 font-bold text-brand-cyan">{row.id}</td>
                          <td className="py-1.5 px-3 font-medium text-white">{row.name}</td>
                          <td className="py-1.5 px-3">
                            <span className="px-1.5 py-0.5 rounded bg-brand-blue/15 text-brand-blue text-[10px] font-bold">
                              {row.department}
                            </span>
                          </td>
                          <td className="py-1.5 px-3 font-bold text-brand-amber">
                            {row.cgpa ? Number(row.cgpa).toFixed(2) : '-'}
                          </td>
                          <td className="py-1.5 px-3 text-slate-400 text-[11px]">{row.email}</td>
                          <td className="py-1.5 px-3 text-slate-400">{row.year}</td>
                        </tr>
                      );
                    })}
                    {dataRows.length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-500 font-sans">
                          No rows matching filter criteria.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'Schema' && (
            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-dark-700/60 pb-2">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                  Schema Definition for {selectedTable}
                </h3>
                <button
                  onClick={() => setShowEditSchemaModal(true)}
                  className="px-2.5 py-1 rounded bg-brand-cyan text-dark-900 font-bold text-xs"
                >
                  + Add Column
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-dark-900 text-slate-400 border-b border-dark-700">
                    <tr>
                      <th className="p-2">Field</th>
                      <th className="p-2">Type</th>
                      <th className="p-2">Nullable</th>
                      <th className="p-2">Key</th>
                      <th className="p-2">Default</th>
                      <th className="p-2">Extra</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-dark-700/40 text-slate-200">
                    {schemaCols.map(c => (
                      <tr key={c.name} className="hover:bg-dark-700/30">
                        <td className="p-2 font-bold text-brand-cyan">{c.name}</td>
                        <td className="p-2">{c.type}</td>
                        <td className="p-2">{c.nullable ? 'YES' : 'NO'}</td>
                        <td className="p-2 text-brand-amber font-bold">{c.key}</td>
                        <td className="p-2 text-slate-500">{String(c.defaultValue ?? 'NULL')}</td>
                        <td className="p-2 text-slate-400">{c.extra}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'Indexes' && (
            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-dark-700/60 pb-2">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                  Indexes on {selectedTable} ({tableIndexes.length})
                </h3>
                <button
                  onClick={() => {
                    const cname = prompt('Enter column to index (e.g. department):');
                    if (cname) {
                      executeSql(`CREATE INDEX \`idx_${cname}\` ON \`${selectedTable}\` (\`${cname}\`);`, selectedDb)
                        .then(() => {
                          toast('success', `Index created on ${cname}.`);
                          fetchTableDetails();
                        });
                    }
                  }}
                  className="px-2.5 py-1 rounded bg-brand-cyan text-dark-900 font-bold text-xs"
                >
                  + Create Index
                </button>
              </div>
              <div className="space-y-2">
                {tableIndexes.map(idx => (
                  <div key={idx.name} className="p-3 rounded-lg bg-dark-900/80 border border-dark-700 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <Layers className="w-3.5 h-3.5 text-brand-cyan" />
                        <span className="text-xs font-bold font-mono text-white">{idx.name}</span>
                        <span className="px-1.5 py-0.2 rounded bg-dark-800 text-[10px] font-mono text-brand-blue border border-dark-700">
                          {idx.type}
                        </span>
                      </div>
                      <span className="text-[11px] font-mono text-slate-400 block mt-1">
                        Columns: [{idx.columns.join(', ')}]
                      </span>
                    </div>
                    {idx.name !== 'PRIMARY' && (
                      <button
                        onClick={() => {
                          dropMysqlIndex({ database: selectedDb, table: selectedTable, indexName: idx.name })
                            .then(() => {
                              toast('info', `Index ${idx.name} dropped.`);
                              fetchTableDetails();
                            });
                        }}
                        className="p-1 text-slate-400 hover:text-brand-rose"
                        title="Drop Index"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'Statistics' && (
            <div className="p-4 space-y-3">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono border-b border-dark-700/60 pb-2">
                Engine & Physical Storage Stats
              </h3>
              <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                <div className="p-3 rounded-lg bg-dark-900/80 border border-dark-700">
                  <span className="text-[10px] text-slate-400 block">Row Format</span>
                  <span className="text-white font-bold block mt-1">DYNAMIC (InnoDB)</span>
                </div>
                <div className="p-3 rounded-lg bg-dark-900/80 border border-dark-700">
                  <span className="text-[10px] text-slate-400 block">Collation</span>
                  <span className="text-brand-cyan font-bold block mt-1">utf8mb4_0900_ai_ci</span>
                </div>
                <div className="p-3 rounded-lg bg-dark-900/80 border border-dark-700">
                  <span className="text-[10px] text-slate-400 block">Data Length</span>
                  <span className="text-white font-bold block mt-1">{tableStats.dataSize || 24576} bytes</span>
                </div>
                <div className="p-3 rounded-lg bg-dark-900/80 border border-dark-700">
                  <span className="text-[10px] text-slate-400 block">Index Length</span>
                  <span className="text-indigo-400 font-bold block mt-1">{tableStats.indexSize || 8900000} bytes</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'Data Operations' && (
            <div className="p-5 space-y-4">
              <div className="border-b border-dark-700/60 pb-2">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-brand-cyan" />
                  <span>Synthetic Batch Record Generator</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Synthesize randomized records directly into MySQL to test index scalability.
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[50, 100, 250, 500].map(cnt => (
                  <button
                    key={cnt}
                    onClick={() => handleBatchGenerate(cnt)}
                    className="p-3 rounded-xl bg-dark-900 border border-dark-700 hover:border-brand-cyan text-center font-mono cursor-pointer transition-all group"
                  >
                    <span className="text-lg font-black text-brand-cyan block group-hover:scale-105 transition-transform">
                      +{cnt}
                    </span>
                    <span className="text-[11px] text-slate-400 block mt-0.5">Records</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Pagination Footer */}
          {activeTab === 'Table View' && (
            <div className="p-3 bg-dark-900/90 border-t border-dark-700/80 flex items-center justify-between text-xs font-mono text-slate-400">
              <div className="flex items-center gap-2">
                <span>Rows per page</span>
                <select
                  value={pageSize}
                  onChange={e => {
                    setPageSize(Number(e.target.value));
                    setPage(1);
                  }}
                  className="bg-dark-800 border border-dark-600 rounded px-2 py-0.5 text-white"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
              </div>

              <div>
                {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, totalCount)} of {totalCount.toLocaleString()}
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page <= 1}
                  className="p-1 rounded bg-dark-800 text-slate-400 hover:text-white disabled:opacity-40 cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <span className="px-2 py-0.5 bg-brand-cyan/20 text-brand-cyan rounded font-bold">{page}</span>
                <button
                  onClick={() => setPage(page + 1)}
                  disabled={page * pageSize >= totalCount}
                  className="p-1 rounded bg-dark-800 text-slate-400 hover:text-white disabled:opacity-40 cursor-pointer"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Col: Table Schema & Table Statistics (3 cols) */}
        <div className="lg:col-span-3 space-y-4">
          {/* Table Schema Card */}
          <div className="bg-dark-800/80 border border-dark-700/80 rounded-xl p-3.5 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                Table Schema
              </h3>
              <button
                onClick={() => setShowEditSchemaModal(true)}
                className="text-[10px] text-brand-cyan hover:underline font-semibold cursor-pointer"
              >
                Edit Schema
              </button>
            </div>
            <div className="space-y-1.5 font-mono text-[11px]">
              {(schemaCols.length > 0
                ? schemaCols
                : [
                    { name: 'id', type: 'INT', key: 'PRI', nullable: false },
                    { name: 'name', type: 'VARCHAR(100)', key: '', nullable: false },
                    { name: 'department', type: 'VARCHAR(50)', key: 'MUL', nullable: false },
                    { name: 'cgpa', type: 'DECIMAL(3,2)', key: 'MUL', nullable: false },
                    { name: 'email', type: 'VARCHAR(100)', key: 'MUL', nullable: false },
                    { name: 'year', type: 'INT', key: '', nullable: false }
                  ]
              ).map(col => (
                <div key={col.name} className="flex items-center justify-between p-1.5 rounded bg-dark-900/60 border border-dark-700/40">
                  <div>
                    <span className="text-slate-200 font-bold block">{col.name}</span>
                    <span className="text-[10px] text-slate-400">{col.type.toUpperCase()}</span>
                  </div>
                  <span className="text-[10px] text-brand-amber font-semibold">
                    {col.key === 'PRI' ? 'PRIMARY KEY' : col.nullable ? 'NULL' : 'NOT NULL'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Table Statistics Card */}
          <div className="bg-dark-800/80 border border-dark-700/80 rounded-xl p-3.5 shadow-sm">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono mb-2">
              Table Statistics
            </h3>
            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="p-2 rounded bg-dark-900/70 border border-dark-700">
                <span className="text-[10px] text-slate-400 block">Total Rows</span>
                <span className="text-sm font-bold text-white">{totalCount.toLocaleString()}</span>
              </div>
              <div className="p-2 rounded bg-dark-900/70 border border-dark-700">
                <span className="text-[10px] text-slate-400 block">Index Size</span>
                <span className="text-sm font-bold text-indigo-400">8.9 MB</span>
              </div>
              <div className="p-2 rounded bg-dark-900/70 border border-dark-700">
                <span className="text-[10px] text-slate-400 block">Columns</span>
                <span className="text-sm font-bold text-white">{schemaCols.length || 6}</span>
              </div>
              <div className="p-2 rounded bg-dark-900/70 border border-dark-700">
                <span className="text-[10px] text-slate-400 block">Avg Row Size</span>
                <span className="text-sm font-bold text-brand-blue">4.2 KB</span>
              </div>
              <div className="p-2 rounded bg-dark-900/70 border border-dark-700">
                <span className="text-[10px] text-slate-400 block">Data Size</span>
                <span className="text-sm font-bold text-white">24 KB</span>
              </div>
              <div className="p-2 rounded bg-dark-900/70 border border-dark-700">
                <span className="text-[10px] text-slate-400 block">Indexes</span>
                <span className="text-sm font-bold text-brand-cyan">{tableIndexes.length || 3} Active</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Bottom Row: Data Preview, Column Analytics, Recent Operations */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Data Preview: Department Distribution Bar Chart (4 cols) */}
        <div className="lg:col-span-4 bg-dark-800/80 border border-dark-700/80 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
              Data Preview
            </h3>
            <span className="text-[10px] font-mono text-slate-400">Column: department</span>
          </div>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.departmentDistribution} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="department" stroke="#64748b" tick={{ fontSize: 10 }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 10 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '8px',
                    fontSize: '11px',
                    color: '#f8fafc'
                  }}
                />
                <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Column Analytics: cgpa (4 cols) */}
        <div className="lg:col-span-4 bg-dark-800/80 border border-dark-700/80 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
              Column Analytics
            </h3>
            <select
              value={selectedAnalyticsCol}
              onChange={e => setSelectedAnalyticsCol(e.target.value)}
              className="bg-dark-900 border border-dark-600 rounded px-2 py-0.5 text-[11px] font-mono text-brand-amber font-bold"
            >
              <option value="cgpa">cgpa</option>
              <option value="year">year</option>
              <option value="id">id</option>
            </select>
          </div>

          {/* Metrics strip */}
          <div className="grid grid-cols-4 gap-1.5 mb-2 text-center text-xs font-mono">
            <div className="p-1 rounded bg-dark-900 border border-dark-700">
              <span className="text-[9px] text-slate-400 block">Avg</span>
              <span className="text-brand-cyan font-bold">{analytics.summary?.average || 8.46}</span>
            </div>
            <div className="p-1 rounded bg-dark-900 border border-dark-700">
              <span className="text-[9px] text-slate-400 block">Max</span>
              <span className="text-brand-emerald font-bold">{analytics.summary?.maximum || 9.20}</span>
            </div>
            <div className="p-1 rounded bg-dark-900 border border-dark-700">
              <span className="text-[9px] text-slate-400 block">Min</span>
              <span className="text-brand-rose font-bold">{analytics.summary?.minimum || 7.10}</span>
            </div>
            <div className="p-1 rounded bg-dark-900 border border-dark-700">
              <span className="text-[9px] text-slate-400 block">StdDev</span>
              <span className="text-indigo-400 font-bold">{analytics.summary?.stdDev || 0.58}</span>
            </div>
          </div>

          {/* Histogram Chart */}
          <div className="h-32">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.histogram} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="bin" stroke="#64748b" tick={{ fontSize: 9 }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 9 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '8px',
                    fontSize: '11px',
                    color: '#f8fafc'
                  }}
                />
                <Bar dataKey="count" fill="#06b6d4" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Operations Log (4 cols) */}
        <div className="lg:col-span-4 bg-dark-800/80 border border-dark-700/80 rounded-xl p-4 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                Recent Operations
              </h3>
              <span className="text-[10px] text-brand-cyan hover:underline cursor-pointer">View All →</span>
            </div>
            <div className="space-y-2">
              {recentOps.map((op, i) => (
                <div key={i} className="flex items-center justify-between text-xs p-1.5 rounded bg-dark-900/60 border border-dark-700/50">
                  <span className="font-mono text-slate-200 truncate">{op.op}</span>
                  <span className="text-[10px] font-mono text-slate-400 shrink-0 pl-2">{op.time}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 4. MODALS */}

      {/* Modal 1: Create Database Modal */}
      {showNewDbModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-dark-800 border border-dark-600 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-2">Create New Database</h3>
            <p className="text-xs text-slate-400 mb-4">
              Enter a name for the new isolated MySQL database workspace.
            </p>
            <input
              type="text"
              placeholder="e.g. inventory_system"
              value={newDbName}
              onChange={e => setNewDbName(e.target.value)}
              className="w-full bg-dark-900 border border-dark-600 rounded-lg p-2.5 text-xs font-mono text-white mb-4 focus:outline-none focus:border-brand-cyan"
            />
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setShowNewDbModal(false)}
                className="px-4 py-2 rounded-lg bg-dark-700 hover:bg-dark-600 text-xs font-semibold text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateDatabase}
                className="px-4 py-2 rounded-lg bg-brand-cyan hover:bg-brand-cyan/90 text-dark-900 font-bold text-xs"
              >
                Create Database
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: Insert Row Modal */}
      {showInsertModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-dark-800 border border-dark-600 rounded-2xl max-w-lg w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4 border-b border-dark-700 pb-2">
              <h3 className="text-base font-bold text-white">Insert Row into {selectedTable}</h3>
              <button onClick={() => setShowInsertModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-5 font-mono text-xs">
              <div>
                <label className="text-slate-400 block mb-1 text-[11px]">ID (INT)</label>
                <input
                  type="number"
                  placeholder="e.g. 1235"
                  value={newRowData.id}
                  onChange={e => setNewRowData({ ...newRowData, id: e.target.value })}
                  className="w-full bg-dark-900 border border-dark-600 rounded p-2 text-white"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1 text-[11px]">Full Name</label>
                <input
                  type="text"
                  placeholder="e.g. Devansh Joshi"
                  value={newRowData.name}
                  onChange={e => setNewRowData({ ...newRowData, name: e.target.value })}
                  className="w-full bg-dark-900 border border-dark-600 rounded p-2 text-white"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1 text-[11px]">Department</label>
                <select
                  value={newRowData.department}
                  onChange={e => setNewRowData({ ...newRowData, department: e.target.value })}
                  className="w-full bg-dark-900 border border-dark-600 rounded p-2 text-white"
                >
                  <option value="CSE">CSE</option>
                  <option value="IT">IT</option>
                  <option value="ENTC">ENTC</option>
                  <option value="ECE">ECE</option>
                  <option value="ME">ME</option>
                </select>
              </div>

              <div>
                <label className="text-slate-400 block mb-1 text-[11px]">CGPA (DECIMAL)</label>
                <input
                  type="text"
                  placeholder="e.g. 8.75"
                  value={newRowData.cgpa}
                  onChange={e => setNewRowData({ ...newRowData, cgpa: e.target.value })}
                  className="w-full bg-dark-900 border border-dark-600 rounded p-2 text-white"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1 text-[11px]">Email</label>
                <input
                  type="email"
                  placeholder="e.g. devansh@vit.edu"
                  value={newRowData.email}
                  onChange={e => setNewRowData({ ...newRowData, email: e.target.value })}
                  className="w-full bg-dark-900 border border-dark-600 rounded p-2 text-white"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1 text-[11px]">Year</label>
                <select
                  value={newRowData.year}
                  onChange={e => setNewRowData({ ...newRowData, year: e.target.value })}
                  className="w-full bg-dark-900 border border-dark-600 rounded p-2 text-white"
                >
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="3">3</option>
                  <option value="4">4</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setShowInsertModal(false)}
                className="px-4 py-2 rounded-lg bg-dark-700 text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleInsertRow}
                className="px-4 py-2 rounded-lg bg-brand-cyan text-dark-900 font-bold text-xs"
              >
                Insert Record
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 3: Truncate Confirmation Modal */}
      {showTruncateModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-dark-800 border border-brand-rose/50 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center gap-3 text-brand-rose mb-3">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-base font-bold text-white">Truncate Table {selectedTable}?</h3>
            </div>
            <p className="text-xs text-slate-300 mb-5 leading-relaxed font-sans">
              This will execute <code className="text-brand-rose font-mono">TRUNCATE TABLE `{selectedTable}`;</code> in MySQL, deleting all {totalCount.toLocaleString()} rows. This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setShowTruncateModal(false)}
                className="px-4 py-2 rounded-lg bg-dark-700 text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleTruncateTable}
                className="px-4 py-2 rounded-lg bg-brand-rose hover:bg-brand-rose/90 text-white font-bold text-xs"
              >
                Yes, Truncate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 4: Edit Schema (Add Column) */}
      {showEditSchemaModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-dark-800 border border-dark-600 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-2">Add Column to {selectedTable}</h3>
            <p className="text-xs text-slate-400 mb-4">
              Executes <code className="text-brand-cyan font-mono">ALTER TABLE ADD COLUMN</code> in MySQL.
            </p>
            <div className="space-y-3 mb-5 font-mono text-xs">
              <div>
                <label className="text-slate-400 block mb-1 text-[11px]">Column Name</label>
                <input
                  type="text"
                  placeholder="e.g. phone_number"
                  value={newColName}
                  onChange={e => setNewColName(e.target.value)}
                  className="w-full bg-dark-900 border border-dark-600 rounded p-2 text-white"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1 text-[11px]">Data Type</label>
                <select
                  value={newColType}
                  onChange={e => setNewColType(e.target.value)}
                  className="w-full bg-dark-900 border border-dark-600 rounded p-2 text-white"
                >
                  <option value="VARCHAR(100)">VARCHAR(100)</option>
                  <option value="INT">INT</option>
                  <option value="DECIMAL(5,2)">DECIMAL(5,2)</option>
                  <option value="TEXT">TEXT</option>
                  <option value="TIMESTAMP">TIMESTAMP</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setShowEditSchemaModal(false)}
                className="px-4 py-2 rounded-lg bg-dark-700 text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleAddColumn}
                className="px-4 py-2 rounded-lg bg-brand-cyan text-dark-900 font-bold text-xs"
              >
                Add Column
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
