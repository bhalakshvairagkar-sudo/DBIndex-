import React, { useState, useEffect } from 'react';
import {
  Play,
  RotateCcw,
  Sparkles,
  Save,
  FolderOpen,
  Trash2,
  Table,
  Layers,
  Search,
  CheckCircle2,
  AlertCircle,
  Copy,
  ChevronDown,
  ChevronRight,
  Plus,
  Terminal,
  Activity,
  FileCode,
  Eye,
  CornerDownRight,
  GitBranch,
  Download,
  X
} from 'lucide-react';
import { PageId, SqlQueryResult, ExplainPlanResponse, MySqlTable, MySqlColumn, SavedQueryItem } from '../types';
import {
  executeSql,
  explainSql,
  getMysqlDatabases,
  getMysqlTables,
  getMysqlTableSchema,
  createSavedQuery,
  getSavedQueries,
  createMysqlDatabase
} from '../services/api';
import { useToast } from '../components/ui';

interface SQLWorkspaceProps {
  onNavigate?: (page: PageId) => void;
}

interface QueryTab {
  id: string;
  title: string;
  sql: string;
}

interface HistoryItem {
  id: number;
  query: string;
  status: 'Success' | 'Error';
  rows: number;
  durationMs: number;
  time: string;
}

const DEFAULT_SQL = `-- DBIndex SQL Workspace
-- Create tables, populate data, run real queries & explain plans

CREATE TABLE IF NOT EXISTS students (
  id INT PRIMARY KEY,
  name VARCHAR(100),
  department VARCHAR(50),
  cgpa DECIMAL(3,2)
);

INSERT INTO students (id, name, department, cgpa) VALUES
  (1, 'Aarav', 'CSE', 8.70),
  (2, 'Ishita', 'IT', 9.10),
  (3, 'Rohan', 'CSE', 8.30),
  (4, 'Sneha', 'ENTC', 8.90),
  (5, 'Aditya', 'CSE', 7.80)
ON DUPLICATE KEY UPDATE cgpa=VALUES(cgpa);

SELECT id, name, department, cgpa 
FROM students 
WHERE department = 'CSE';`;

export const SQLWorkspace: React.FC<SQLWorkspaceProps> = ({ onNavigate }) => {
  const toast = useToast();
  const [databases, setDatabases] = useState<string[]>(['my_database', 'university', 'ecommerce', 'company']);
  const [selectedDb, setSelectedDb] = useState<string>('my_database');

  // Query Tabs
  const [tabs, setTabs] = useState<QueryTab[]>([
    { id: '1', title: 'Query 1', sql: DEFAULT_SQL },
    { id: '2', title: 'Query 2', sql: 'SELECT * FROM courses;' },
    { id: '3', title: 'Query 3', sql: 'EXPLAIN SELECT * FROM students WHERE department = "CSE";' }
  ]);
  const [activeTabId, setActiveTabId] = useState<string>('1');

  // Execution state
  const [executing, setExecuting] = useState<boolean>(false);
  const [result, setResult] = useState<SqlQueryResult | null>(null);
  const [explainResult, setExplainResult] = useState<ExplainPlanResponse | null>(null);
  const [activeView, setActiveView] = useState<'table' | 'json'>('table');
  const [activePlanView, setActivePlanView] = useState<'visual' | 'raw'>('visual');
  const [message, setMessage] = useState<string>('Query executed successfully, 3 rows returned in 12.4 ms');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');

  // Schema Explorer
  const [tables, setTables] = useState<MySqlTable[]>([]);
  const [schemaTab, setSchemaTab] = useState<'Tables' | 'Indexes' | 'Views' | 'Procedures'>('Tables');
  const [tableSearch, setTableSearch] = useState<string>('');
  const [expandedTables, setExpandedTables] = useState<Record<string, boolean>>({ students: true });
  const [tableColumns, setTableColumns] = useState<Record<string, MySqlColumn[]>>({});

  // Modals: Save Query & Load Query
  const [showSaveModal, setShowSaveModal] = useState<boolean>(false);
  const [saveTitle, setSaveTitle] = useState<string>('My Query');
  const [saveFolder, setSaveFolder] = useState<string>('Frequently Used');
  const [showLoadModal, setShowLoadModal] = useState<boolean>(false);
  const [savedQueriesList, setSavedQueriesList] = useState<SavedQueryItem[]>([]);
  const [showCreateDbModal, setShowCreateDbModal] = useState<boolean>(false);
  const [newDbName, setNewDbName] = useState<string>('');

  // Query History
  const [history, setHistory] = useState<HistoryItem[]>([
    {
      id: 1,
      query: "SELECT * FROM students WHERE department = 'CSE'",
      status: 'Success',
      rows: 3,
      durationMs: 12.4,
      time: 'Just now'
    },
    {
      id: 2,
      query: 'INSERT INTO students VALUES (...)',
      status: 'Success',
      rows: 5,
      durationMs: 8.1,
      time: '1 min ago'
    },
    {
      id: 3,
      query: 'CREATE TABLE students (...)',
      status: 'Success',
      rows: 0,
      durationMs: 5.6,
      time: '2 mins ago'
    }
  ]);

  const activeTab = tabs.find(t => t.id === activeTabId) || tabs[0];

  // Load databases and tables
  useEffect(() => {
    getMysqlDatabases().then(res => {
      if (res?.databases) setDatabases(res.databases);
    });
  }, []);

  const fetchTables = () => {
    getMysqlTables(selectedDb).then(res => {
      if (res?.tables) {
        setTables(res.tables);
        if (res.tables.length > 0) {
          getMysqlTableSchema(selectedDb, res.tables[0].name).then(s => {
            if (s?.columns) {
              setTableColumns(prev => ({ ...prev, [res.tables[0].name]: s.columns }));
            }
          });
        }
      }
    });
  };

  useEffect(() => {
    fetchTables();
  }, [selectedDb]);

  const toggleTableExpand = async (tableName: string) => {
    const isExp = !expandedTables[tableName];
    setExpandedTables(prev => ({ ...prev, [tableName]: isExp }));

    if (isExp && !tableColumns[tableName]) {
      const res = await getMysqlTableSchema(selectedDb, tableName);
      if (res?.columns) {
        setTableColumns(prev => ({ ...prev, [tableName]: res.columns }));
      }
    }
  };

  const handleRunQuery = async () => {
    setExecuting(true);
    try {
      const res = await executeSql(activeTab.sql, selectedDb);
      if (res.status === 'ok' && res.results.length > 0) {
        const selectRes = res.results.find(r => r.commandType === 'SELECT') || res.results[res.results.length - 1];
        setResult(selectRes);

        const rowsCount = selectRes.rows?.length || selectRes.affectedRows || 0;
        setMessage(`Query executed successfully, ${rowsCount} rows returned in ${res.totalDurationMs} ms`);
        setMessageType('success');
        toast('success', `Query executed in ${res.totalDurationMs} ms`);

        // Automatically fetch explain plan for the SELECT query
        if (selectRes.commandType === 'SELECT') {
          explainSql(selectRes.statement, selectedDb).then(plan => {
            if (plan.status === 'ok') setExplainResult(plan);
          });
        }

        // Add to history
        setHistory(prev => [
          {
            id: Date.now(),
            query: selectRes.statement.slice(0, 50),
            status: 'Success',
            rows: rowsCount,
            durationMs: res.totalDurationMs,
            time: 'Just now'
          },
          ...prev.slice(0, 9)
        ]);

        fetchTables();
      } else {
        setMessage('Execution failed: No result returned');
        setMessageType('error');
      }
    } catch (err) {
      setMessage(`Execution error: ${(err as Error).message}`);
      setMessageType('error');
      toast('error', (err as Error).message);
    } finally {
      setExecuting(false);
    }
  };

  const handleExplain = async () => {
    try {
      const plan = await explainSql(activeTab.sql, selectedDb);
      if (plan.status === 'ok') {
        setExplainResult(plan);
        toast('info', 'Query execution plan captured');
      }
    } catch (err) {
      toast('error', `Explain failed: ${(err as Error).message}`);
    }
  };

  const handleFormat = () => {
    const formatted = activeTab.sql
      .replace(/\s+/g, ' ')
      .replace(/\b(SELECT|FROM|WHERE|INSERT|INTO|VALUES|UPDATE|DELETE|CREATE|TABLE|ORDER BY|GROUP BY|LEFT JOIN|JOIN)\b/gi, '\n$1')
      .trim();
    setTabs(prev => prev.map(t => (t.id === activeTabId ? { ...t, sql: formatted } : t)));
    toast('info', 'SQL formatted');
  };

  const handleClear = () => {
    setTabs(prev => prev.map(t => (t.id === activeTabId ? { ...t, sql: '' } : t)));
  };

  const handleAddTab = () => {
    const newId = String(tabs.length + 1);
    setTabs(prev => [...prev, { id: newId, title: `Query ${newId}`, sql: 'SELECT * FROM students LIMIT 10;' }]);
    setActiveTabId(newId);
  };

  const handleCloseTab = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (tabs.length <= 1) return;
    const filtered = tabs.filter(t => t.id !== id);
    setTabs(filtered);
    if (activeTabId === id) setActiveTabId(filtered[0].id);
  };

  // Real Save Query to Backend
  const handleSaveQuery = async () => {
    if (!saveTitle.trim()) return;
    try {
      await createSavedQuery({
        title: saveTitle.trim(),
        sql: activeTab.sql,
        folder: saveFolder,
        database: selectedDb
      });
      toast('success', `Query "${saveTitle}" saved.`);
      setShowSaveModal(false);
    } catch (err) {
      toast('error', (err as Error).message);
    }
  };

  // Real Load Query from Backend
  const handleOpenLoadModal = async () => {
    try {
      const res = await getSavedQueries();
      if (res?.queries) {
        setSavedQueriesList(res.queries);
        setShowLoadModal(true);
      }
    } catch (err) {
      toast('error', (err as Error).message);
    }
  };

  // Export Results to CSV
  const handleExportResultsCsv = () => {
    if (!result?.rows || result.rows.length === 0) {
      toast('info', 'No results to export');
      return;
    }
    const cols = result.columns || Object.keys(result.rows[0]);
    const csvLines = [cols.join(',')];
    result.rows.forEach(row => {
      const line = cols.map(c => `"${String(row[c] ?? '').replace(/"/g, '""')}"`).join(',');
      csvLines.push(line);
    });
    const blob = new Blob([csvLines.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `query_result_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast('success', `Exported ${result.rows.length} rows to CSV`);
  };

  // Insert column/table name at cursor
  const insertTextIntoEditor = (text: string) => {
    setTabs(prev =>
      prev.map(t =>
        t.id === activeTabId ? { ...t, sql: `${t.sql} ${text}` } : t
      )
    );
    toast('info', `Added "${text}" to query`);
  };

  const handleCreateDatabase = async () => {
    if (!newDbName.trim()) return;
    try {
      await createMysqlDatabase(newDbName.trim());
      toast('success', `Database ${newDbName} created.`);
      setShowCreateDbModal(false);
      setNewDbName('');
      getMysqlDatabases().then(r => r?.databases && setDatabases(r.databases));
    } catch (err) {
      toast('error', (err as Error).message);
    }
  };

  return (
    <div className="space-y-5 select-none animate-in fade-in duration-300">
      {/* 1. Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Terminal className="w-5 h-5 text-brand-cyan" />
            <span>SQL Workspace</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Write, execute and analyze SQL queries on your own database
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowCreateDbModal(true)}
            className="px-3 py-1.5 rounded-lg bg-dark-800 hover:bg-dark-700 border border-dark-600 text-xs font-semibold text-slate-300 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-brand-cyan" />
            <span>Create Database</span>
          </button>
          <button
            onClick={() => {
              setTabs(prev =>
                prev.map(t =>
                  t.id === activeTabId
                    ? { ...t, sql: 'SELECT * FROM students WHERE department = "CSE" ORDER BY cgpa DESC;' }
                    : t
                )
              );
              toast('info', 'Loaded sample SELECT query');
            }}
            className="px-3 py-1.5 rounded-lg bg-dark-800 hover:bg-dark-700 border border-dark-600 text-xs font-semibold text-slate-300 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <FileCode className="w-3.5 h-3.5 text-brand-blue" />
            <span>Write Queries</span>
          </button>
          <button
            onClick={() => {
              handleRunQuery();
              handleExplain();
            }}
            className="px-3 py-1.5 rounded-lg bg-brand-cyan/20 hover:bg-brand-cyan/30 border border-brand-cyan/50 text-xs font-semibold text-brand-cyan flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-brand-cyan" />
            <span>Run & Analyze</span>
          </button>
          <button
            onClick={() => onNavigate && onNavigate('visualization')}
            className="px-3 py-1.5 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/50 text-xs font-semibold text-indigo-400 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <GitBranch className="w-3.5 h-3.5" />
            <span>Visualize Indexes</span>
          </button>
        </div>
      </div>

      {/* 2. Main Editor & Schema Explorer Split View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Side: SQL Editor Pane (8 cols) */}
        <div className="lg:col-span-8 space-y-3">
          {/* Tabs bar */}
          <div className="flex items-center justify-between border-b border-dark-700/80 pb-1">
            <div className="flex items-center gap-1 overflow-x-auto">
              {tabs.map(tab => (
                <div
                  key={tab.id}
                  onClick={() => setActiveTabId(tab.id)}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-t-lg text-xs font-mono font-medium border-t border-l border-r cursor-pointer transition-all ${
                    activeTabId === tab.id
                      ? 'bg-dark-800 text-brand-cyan border-dark-600 shadow-sm'
                      : 'bg-dark-900/60 text-slate-400 border-transparent hover:text-slate-200'
                  }`}
                >
                  <span>{tab.title}</span>
                  {tabs.length > 1 && (
                    <button
                      onClick={e => handleCloseTab(tab.id, e)}
                      className="text-slate-500 hover:text-brand-rose rounded p-0.5"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
              <button
                onClick={handleAddTab}
                className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-dark-800 text-xs cursor-pointer"
                title="Add new query tab"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* Subheader Controls */}
            <div className="flex items-center gap-2">
              <select
                value={selectedDb}
                onChange={e => setSelectedDb(e.target.value)}
                className="bg-dark-900 border border-dark-600 rounded-lg px-2.5 py-1 text-xs font-mono text-slate-200 focus:outline-none focus:border-brand-cyan"
              >
                {databases.map(db => (
                  <option key={db} value={db}>
                    {db}
                  </option>
                ))}
              </select>

              <button
                onClick={handleRunQuery}
                disabled={executing}
                className="px-3 py-1 bg-brand-cyan hover:bg-brand-cyan/90 text-dark-900 font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-dark-900" />
                <span>Run (F5)</span>
              </button>

              <button
                onClick={handleFormat}
                className="px-2.5 py-1 bg-dark-800 hover:bg-dark-700 border border-dark-600 text-slate-300 text-xs rounded-lg transition-colors cursor-pointer"
                title="Format SQL query"
              >
                Format
              </button>

              <button
                onClick={handleExplain}
                className="px-2.5 py-1 bg-dark-800 hover:bg-dark-700 border border-dark-600 text-slate-300 text-xs rounded-lg transition-colors cursor-pointer"
                title="Run EXPLAIN plan"
              >
                Explain
              </button>

              <button
                onClick={handleClear}
                className="p-1.5 bg-dark-800 hover:bg-dark-700 border border-dark-600 text-slate-400 hover:text-brand-rose rounded-lg transition-colors cursor-pointer"
                title="Clear editor"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => setShowSaveModal(true)}
                className="p-1.5 bg-dark-800 hover:bg-dark-700 border border-dark-600 text-slate-400 hover:text-brand-cyan rounded-lg transition-colors cursor-pointer"
                title="Save query"
              >
                <Save className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={handleOpenLoadModal}
                className="p-1.5 bg-dark-800 hover:bg-dark-700 border border-dark-600 text-slate-400 hover:text-brand-blue rounded-lg transition-colors cursor-pointer"
                title="Load saved query"
              >
                <FolderOpen className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Code Editor Box */}
          <div className="bg-dark-900/90 border border-dark-700/80 rounded-xl overflow-hidden shadow-inner flex">
            {/* Line numbers */}
            <div className="py-3 px-2.5 bg-dark-950/70 text-slate-600 text-xs font-mono select-none text-right border-r border-dark-800 w-10">
              {activeTab.sql.split('\n').map((_, i) => (
                <div key={i}>{i + 1}</div>
              ))}
            </div>

            {/* Textarea */}
            <textarea
              value={activeTab.sql}
              onChange={e =>
                setTabs(prev =>
                  prev.map(t => (t.id === activeTabId ? { ...t, sql: e.target.value } : t))
                )
              }
              onKeyDown={e => {
                if (e.key === 'F5' || (e.ctrlKey && e.key === 'Enter')) {
                  e.preventDefault();
                  handleRunQuery();
                }
              }}
              rows={14}
              spellCheck={false}
              className="w-full bg-transparent p-3 text-xs font-mono text-slate-100 focus:outline-none resize-y leading-relaxed selection:bg-brand-cyan/20"
            />
          </div>
        </div>

        {/* Right Side: Schema Explorer (4 cols) */}
        <div className="lg:col-span-4 bg-dark-800/80 border border-dark-700/80 rounded-xl p-4 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                Schema Explorer
              </h3>
              <button
                onClick={() => {
                  const tname = prompt('Enter new table name:');
                  if (tname) {
                    executeSql(`CREATE TABLE \`${tname}\` (id INT PRIMARY KEY AUTO_INCREMENT, name VARCHAR(100));`, selectedDb)
                      .then(() => {
                        toast('success', `Table ${tname} created.`);
                        fetchTables();
                      });
                  }
                }}
                className="px-2 py-0.5 rounded bg-brand-cyan/20 text-brand-cyan hover:bg-brand-cyan/30 text-[11px] font-semibold border border-brand-cyan/40 cursor-pointer"
              >
                + Create
              </button>
            </div>

            {/* Database Selector */}
            <div className="mb-3">
              <select
                value={selectedDb}
                onChange={e => setSelectedDb(e.target.value)}
                className="w-full bg-dark-900 border border-dark-600 rounded-lg px-3 py-1.5 text-xs font-mono text-brand-cyan font-bold"
              >
                {databases.map(d => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            {/* Explorer Tabs */}
            <div className="grid grid-cols-4 gap-1 p-1 bg-dark-900/80 rounded-lg mb-3 text-center text-[10px] font-mono">
              {(['Tables', 'Indexes', 'Views', 'Procedures'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setSchemaTab(tab)}
                  className={`py-1 rounded cursor-pointer ${
                    schemaTab === tab ? 'bg-brand-cyan/20 text-brand-cyan font-bold' : 'text-slate-400'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative mb-3">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-500" />
              <input
                type="text"
                placeholder="Search tables..."
                value={tableSearch}
                onChange={e => setTableSearch(e.target.value)}
                className="w-full bg-dark-900 border border-dark-700 rounded-lg pl-8 pr-3 py-1 text-xs font-mono text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-brand-cyan"
              />
            </div>

            {/* Tree View of Tables & Columns */}
            <div className="space-y-1 max-h-64 overflow-y-auto pr-1">
              {tables
                .filter(t => t.name.toLowerCase().includes(tableSearch.toLowerCase()))
                .map(t => {
                  const isExp = expandedTables[t.name];
                  const cols = tableColumns[t.name] || [];
                  return (
                    <div key={t.name} className="rounded-lg bg-dark-900/60 border border-dark-700/50 p-2">
                      <div className="flex items-center justify-between text-xs font-mono font-bold text-slate-200">
                        <div
                          onClick={() => toggleTableExpand(t.name)}
                          className="flex items-center gap-1.5 cursor-pointer hover:text-brand-cyan"
                        >
                          {isExp ? <ChevronDown className="w-3.5 h-3.5 text-brand-cyan" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-500" />}
                          <Table className="w-3.5 h-3.5 text-brand-blue" />
                          <span>{t.name}</span>
                        </div>
                        <button
                          onClick={() => insertTextIntoEditor(t.name)}
                          className="text-[10px] text-slate-500 hover:text-brand-cyan font-normal cursor-pointer"
                          title="Insert table name into query"
                        >
                          + Insert
                        </button>
                      </div>

                      {/* Columns list */}
                      {isExp && (
                        <div className="mt-2 pl-5 space-y-1 border-l border-dark-700 ml-2">
                          {cols.map(c => (
                            <div
                              key={c.name}
                              onClick={() => insertTextIntoEditor(c.name)}
                              className="flex items-center justify-between text-[11px] font-mono text-slate-400 hover:text-white cursor-pointer py-0.5"
                              title="Click to insert column into query"
                            >
                              <span className="text-slate-300">
                                {c.name} {c.key === 'PRI' && <span className="text-brand-amber font-bold">(PK)</span>}
                              </span>
                              <span className="text-[10px] text-slate-500">{c.type.toUpperCase()}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Bottom Panels: Query Result & Execution Plan */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Query Result (7 cols) */}
        <div className="lg:col-span-7 bg-dark-800/80 border border-dark-700/80 rounded-xl overflow-hidden shadow-sm flex flex-col justify-between">
          <div>
            <div className="p-3 bg-dark-900/90 border-b border-dark-700/80 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h4 className="text-xs font-bold font-mono uppercase text-white">
                  Query Result
                </h4>
                <div className="flex items-center gap-1 bg-dark-800 p-0.5 rounded text-[10px] font-mono">
                  <button
                    onClick={() => setActiveView('table')}
                    className={`px-2 py-0.5 rounded cursor-pointer ${activeView === 'table' ? 'bg-brand-cyan/20 text-brand-cyan font-bold' : 'text-slate-400'}`}
                  >
                    Table
                  </button>
                  <button
                    onClick={() => setActiveView('json')}
                    className={`px-2 py-0.5 rounded cursor-pointer ${activeView === 'json' ? 'bg-brand-cyan/20 text-brand-cyan font-bold' : 'text-slate-400'}`}
                  >
                    JSON
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono text-brand-cyan">
                  {result?.rows?.length || 3} rows • {result?.durationMs || 12.4} ms
                </span>
                <button
                  onClick={handleExportResultsCsv}
                  className="p-1 rounded text-slate-400 hover:text-white"
                  title="Export results to CSV"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Results Display */}
            {activeView === 'table' ? (
              <div className="overflow-x-auto max-h-56">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-dark-900 text-slate-400 border-b border-dark-700 sticky top-0">
                    <tr>
                      {(result?.columns || ['id', 'name', 'department', 'cgpa']).map(col => (
                        <th key={col} className="py-2 px-3 font-semibold">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-dark-700/40 text-slate-200">
                    {(result?.rows || [
                      { id: 1, name: 'Aarav Sharma', department: 'CSE', cgpa: 8.70 },
                      { id: 3, name: 'Rohan Patel', department: 'CSE', cgpa: 8.30 },
                      { id: 5, name: 'Aditya Singh', department: 'CSE', cgpa: 7.80 }
                    ]).map((row, idx) => (
                      <tr key={idx} className="hover:bg-dark-700/30 transition-colors">
                        {(result?.columns || ['id', 'name', 'department', 'cgpa']).map(col => (
                          <td key={col} className="py-1.5 px-3">
                            {String(row[col] ?? '')}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <pre className="p-3 text-[11px] font-mono text-slate-300 max-h-56 overflow-y-auto">
                {JSON.stringify(result?.rows || [], null, 2)}
              </pre>
            )}
          </div>
        </div>

        {/* Right: Execution Plan (5 cols) */}
        <div className="lg:col-span-5 bg-dark-800/80 border border-dark-700/80 rounded-xl overflow-hidden shadow-sm flex flex-col justify-between">
          <div>
            <div className="p-3 bg-dark-900/90 border-b border-dark-700/80 flex items-center justify-between">
              <h4 className="text-xs font-bold font-mono uppercase text-white">
                Execution Plan
              </h4>
              <div className="flex items-center gap-1 bg-dark-800 p-0.5 rounded text-[10px] font-mono">
                <button
                  onClick={() => setActivePlanView('visual')}
                  className={`px-2 py-0.5 rounded cursor-pointer ${activePlanView === 'visual' ? 'bg-brand-cyan/20 text-brand-cyan font-bold' : 'text-slate-400'}`}
                >
                  Visual Plan
                </button>
                <button
                  onClick={() => setActivePlanView('raw')}
                  className={`px-2 py-0.5 rounded cursor-pointer ${activePlanView === 'raw' ? 'bg-brand-cyan/20 text-brand-cyan font-bold' : 'text-slate-400'}`}
                >
                  Raw Output
                </button>
              </div>
            </div>

            {/* Plan Display */}
            {activePlanView === 'visual' ? (
              <div className="p-4 grid grid-cols-2 gap-3 items-center">
                {/* Visual Pipeline Nodes */}
                <div className="space-y-3">
                  <div className="p-2.5 rounded-lg bg-dark-900 border border-brand-cyan/40 text-center font-mono text-xs font-bold text-brand-cyan shadow-sm">
                    SELECT
                  </div>
                  <div className="text-center text-slate-500 font-mono text-xs">↓</div>
                  <div className="p-2.5 rounded-lg bg-dark-900 border border-indigo-500/40 text-center font-mono text-xs shadow-sm">
                    <span className="font-bold text-white block">Table Scan</span>
                    <span className="text-[10px] text-slate-400 block">students (cost: 5.25)</span>
                  </div>
                </div>

                {/* Plan Details Table */}
                <div className="space-y-1.5 font-mono text-[11px] p-2.5 rounded-lg bg-dark-900/70 border border-dark-700">
                  <div className="flex justify-between text-slate-400">
                    <span>Select Type:</span>
                    <span className="text-white font-bold">SIMPLE</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Table:</span>
                    <span className="text-brand-cyan">students</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Type:</span>
                    <span className="text-brand-rose font-bold">ALL</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Possible Keys:</span>
                    <span className="text-slate-500">NULL</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Key:</span>
                    <span className="text-slate-500">NULL</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Rows:</span>
                    <span className="text-brand-amber font-bold">5</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Extra:</span>
                    <span className="text-slate-300">Using where</span>
                  </div>
                </div>
              </div>
            ) : (
              <pre className="p-3 text-[10px] font-mono text-slate-300 max-h-56 overflow-y-auto">
                {explainResult?.analyzePlan || JSON.stringify(explainResult?.tabular || [], null, 2)}
              </pre>
            )}
          </div>
        </div>
      </div>

      {/* 4. Bottom Messages & History Bar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Messages Alert (4 cols) */}
        <div className="lg:col-span-4 bg-dark-800/80 border border-dark-700/80 rounded-xl p-4 shadow-sm flex items-center gap-3">
          {messageType === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-brand-emerald shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-brand-rose shrink-0" />
          )}
          <div>
            <h4 className="text-xs font-bold text-white font-mono">Messages</h4>
            <p className="text-xs text-slate-300 mt-0.5">{message}</p>
          </div>
        </div>

        {/* Query History (8 cols) */}
        <div className="lg:col-span-8 bg-dark-800/80 border border-dark-700/80 rounded-xl p-4 shadow-sm">
          <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono mb-2">
            Query History
          </h4>
          <div className="space-y-1.5 font-mono text-xs">
            {history.slice(0, 3).map((item, idx) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-2 rounded-lg bg-dark-900/60 border border-dark-700/40 hover:border-dark-600 transition-colors"
              >
                <div
                  onClick={() => {
                    setTabs(prev =>
                      prev.map(t => (t.id === activeTabId ? { ...t, sql: item.query } : t))
                    );
                    toast('info', 'Loaded query from history');
                  }}
                  className="flex items-center gap-3 truncate cursor-pointer hover:text-brand-cyan"
                >
                  <span className="text-slate-500 font-bold">{idx + 1}</span>
                  <span className="text-slate-200 truncate">{item.query}</span>
                </div>
                <div className="flex items-center gap-4 text-[11px] shrink-0 pl-3">
                  <span className="text-brand-emerald font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Success
                  </span>
                  <span className="text-slate-400">{item.rows} rows</span>
                  <span className="text-brand-cyan">{item.durationMs} ms</span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(item.query);
                      toast('success', 'Copied query to clipboard');
                    }}
                    className="text-slate-500 hover:text-white"
                    title="Copy SQL"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      setHistory(prev => prev.filter(h => h.id !== item.id));
                      toast('info', 'History item removed');
                    }}
                    className="text-slate-500 hover:text-brand-rose"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* MODALS */}
      {/* Save Query Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-dark-800 border border-dark-600 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-3">Save Query</h3>
            <div className="space-y-3 font-mono text-xs mb-4">
              <div>
                <label className="text-slate-400 block mb-1">Query Title</label>
                <input
                  type="text"
                  value={saveTitle}
                  onChange={e => setSaveTitle(e.target.value)}
                  className="w-full bg-dark-900 border border-dark-600 rounded p-2 text-white"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Target Folder</label>
                <select
                  value={saveFolder}
                  onChange={e => setSaveFolder(e.target.value)}
                  className="w-full bg-dark-900 border border-dark-600 rounded p-2 text-white"
                >
                  <option value="Frequently Used">Frequently Used</option>
                  <option value="Index Analysis">Index Analysis</option>
                  <option value="Reports">Reports</option>
                  <option value="Test Queries">Test Queries</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowSaveModal(false)}
                className="px-4 py-2 rounded bg-dark-700 text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveQuery}
                className="px-4 py-2 rounded bg-brand-cyan text-dark-900 font-bold text-xs"
              >
                Save Query
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Load Query Modal */}
      {showLoadModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-dark-800 border border-dark-600 rounded-2xl max-w-lg w-full p-6 shadow-2xl max-h-[500px] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3 border-b border-dark-700 pb-2">
                <h3 className="text-base font-bold text-white">Load Saved Query</h3>
                <button onClick={() => setShowLoadModal(false)} className="text-slate-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-2 overflow-y-auto max-h-80 pr-1">
                {savedQueriesList.map(q => (
                  <div
                    key={q.id}
                    onClick={() => {
                      setTabs(prev =>
                        prev.map(t => (t.id === activeTabId ? { ...t, sql: q.sql } : t))
                      );
                      toast('success', `Loaded "${q.title}"`);
                      setShowLoadModal(false);
                    }}
                    className="p-2.5 rounded-lg bg-dark-900/80 border border-dark-700 hover:border-brand-cyan cursor-pointer transition-colors"
                  >
                    <div className="flex justify-between items-center text-xs font-mono mb-1">
                      <span className="font-bold text-white">{q.title}</span>
                      <span className="text-[10px] text-brand-cyan">{q.folder}</span>
                    </div>
                    <pre className="text-[10px] text-slate-400 font-mono truncate">{q.sql.slice(0, 70)}</pre>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Database Modal */}
      {showCreateDbModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-dark-800 border border-dark-600 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-2">Create New Database</h3>
            <p className="text-xs text-slate-400 mb-4">
              Enter a name for the new MySQL database.
            </p>
            <input
              type="text"
              placeholder="e.g. university_grades"
              value={newDbName}
              onChange={e => setNewDbName(e.target.value)}
              className="w-full bg-dark-900 border border-dark-600 rounded-lg p-2.5 text-xs font-mono text-white mb-4 focus:outline-none focus:border-brand-cyan"
            />
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setShowCreateDbModal(false)}
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
    </div>
  );
};
