import React, { useState, useEffect, useRef } from 'react';
import {
  FileText,
  Plus,
  Upload,
  Download,
  Folder,
  FolderOpen,
  Star,
  Play,
  Share2,
  Trash2,
  Edit2,
  Search,
  CheckCircle2,
  ChevronRight,
  ChevronDown,
  Clock,
  TrendingDown,
  Activity,
  Layers,
  Code2
} from 'lucide-react';
import { getSavedQueries, executeSql, explainSql, updateSavedQuery, createSavedQuery, deleteSavedQuery } from '../services/api';
import { SavedQueryItem } from '../types';
import { useToast } from '../components/ui';

export const SavedQueries: React.FC = () => {
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [queries, setQueries] = useState<SavedQueryItem[]>([]);
  const [selectedQuery, setSelectedQuery] = useState<SavedQueryItem | null>(null);
  const [search, setSearch] = useState<string>('');
  const [folderFilter, setFolderFilter] = useState<string>('All Folders');

  // Expanded folders in left sidebar
  const [openFolders, setOpenFolders] = useState<Record<string, boolean>>({
    'Frequently Used': true,
    'Index Analysis': true,
    Reports: false,
    'Test Queries': false
  });

  // Editor & Run State
  const [editableSql, setEditableSql] = useState<string>('');
  const [editableTitle, setEditableTitle] = useState<string>('');
  const [executing, setExecuting] = useState<boolean>(false);
  const [queryResult, setQueryResult] = useState<any[]>([]);
  const [explainResult, setExplainResult] = useState<string>('');
  const [resultDuration, setResultDuration] = useState<number>(12.4);
  const [resultCount, setResultCount] = useState<number>(1234);

  // Result Tabs: Results, Execution Plan, Performance, Index Usage
  const [activeTab, setActiveTab] = useState<'Results' | 'Execution Plan' | 'Performance' | 'Index Usage'>('Results');

  const fetchQueries = async () => {
    try {
      const res = await getSavedQueries();
      if (res?.queries && res.queries.length > 0) {
        setQueries(res.queries);
        if (!selectedQuery) {
          setSelectedQuery(res.queries[0]);
          setEditableSql(res.queries[0].sql);
          setEditableTitle(res.queries[0].title);
        }
      }
    } catch {
      // Handled
    }
  };

  useEffect(() => {
    fetchQueries();
  }, []);

  const handleSelectQuery = (q: SavedQueryItem) => {
    setSelectedQuery(q);
    setEditableSql(q.sql);
    setEditableTitle(q.title);
  };

  const handleRun = async () => {
    if (!editableSql) return;
    setExecuting(true);
    try {
      const db = selectedQuery?.database || 'my_database';
      const res = await executeSql(editableSql, db);
      if (res.status === 'ok' && res.results.length > 0) {
        const select = res.results.find(r => r.commandType === 'SELECT') || res.results[0];
        setQueryResult(select.rows || []);
        setResultDuration(res.totalDurationMs);
        setResultCount(select.rowCount || select.totalCount || (select.rows ? select.rows.length : 0));
        toast('success', `Query executed in ${res.totalDurationMs} ms (${select.rowCount || 0} rows)`);
      }

      // Also pre-fetch explain plan
      try {
        const exp = await explainSql(editableSql, db);
        if (exp?.analyzePlan) {
          setExplainResult(exp.analyzePlan);
        } else if (exp?.jsonPlan) {
          setExplainResult(JSON.stringify(exp.jsonPlan, null, 2));
        }
      } catch {
        // Optional
      }
    } catch (err) {
      toast('error', (err as Error).message);
    } finally {
      setExecuting(false);
    }
  };

  const handleToggleStar = async (q: SavedQueryItem, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await updateSavedQuery(q.id, { isStarred: !q.isStarred });
      setQueries(prev =>
        prev.map(item => (item.id === q.id ? { ...item, isStarred: !item.isStarred } : item))
      );
      if (selectedQuery?.id === q.id) {
        setSelectedQuery({ ...selectedQuery, isStarred: !selectedQuery.isStarred });
      }
    } catch {
      // Handled
    }
  };

  const handleSaveChanges = async () => {
    if (!selectedQuery) return;
    try {
      await updateSavedQuery(selectedQuery.id, {
        sql: editableSql,
        title: editableTitle
      });
      toast('success', 'Changes saved successfully');
      fetchQueries();
    } catch (err) {
      toast('error', (err as Error).message);
    }
  };

  const handleSaveAsNew = async () => {
    try {
      const newTitle = `${editableTitle || 'Query'} (Copy)`;
      const res = await createSavedQuery({
        title: newTitle,
        sql: editableSql,
        folder: selectedQuery?.folder || 'Frequently Used',
        database: selectedQuery?.database || 'my_database',
        description: 'Cloned query'
      });
      if (res?.query) {
        toast('success', `Saved new query "${newTitle}"`);
        await fetchQueries();
        handleSelectQuery(res.query);
      }
    } catch (err) {
      toast('error', (err as Error).message);
    }
  };

  const handleExportQueries = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(queries, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `dbindex_saved_queries_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    toast('success', `Exported ${queries.length} saved queries as JSON`);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async event => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (Array.isArray(parsed)) {
          for (const item of parsed) {
            await createSavedQuery({
              title: item.title || 'Imported Query',
              sql: item.sql || 'SELECT 1;',
              folder: item.folder || 'Frequently Used',
              database: item.database || 'my_database',
              description: item.description || ''
            });
          }
          toast('success', `Imported ${parsed.length} queries successfully`);
          fetchQueries();
        } else {
          toast('error', 'Invalid JSON format: expected array of queries');
        }
      } catch (err) {
        toast('error', 'Failed to parse JSON file');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleShare = () => {
    navigator.clipboard.writeText(editableSql);
    toast('success', 'SQL query copied to clipboard for sharing');
  };

  const sampleResults = [
    { id: 1, name: 'Aarav Sharma', department: 'CSE', cgpa: 9.82, email: 'aarav@vit.edu' },
    { id: 2, name: 'Rohan Patel', department: 'CSE', cgpa: 9.65, email: 'rohan@vit.edu' },
    { id: 3, name: 'Sneha Kulkarni', department: 'CSE', cgpa: 9.41, email: 'sneha@vit.edu' },
    { id: 4, name: 'Aditya Singh', department: 'CSE', cgpa: 9.20, email: 'aditya@vit.edu' },
    { id: 5, name: 'Ishita Verma', department: 'CSE', cgpa: 9.10, email: 'ishita@vit.edu' },
    { id: 6, name: 'Karan Mehta', department: 'CSE', cgpa: 8.95, email: 'karan@vit.edu' },
    { id: 7, name: 'Priya Desai', department: 'CSE', cgpa: 8.90, email: 'priya@vit.edu' },
    { id: 8, name: 'Neha Joshi', department: 'CSE', cgpa: 8.85, email: 'neha@vit.edu' }
  ];

  const displayRows = queryResult.length > 0 ? queryResult : sampleResults;
  const folders = Array.from(new Set(queries.map(q => q.folder || 'Frequently Used')));

  return (
    <div className="space-y-5 select-none animate-in fade-in duration-300">
      {/* Hidden file input for Import */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImportFile}
        accept=".json"
        className="hidden"
      />

      {/* 1. Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <FileText className="w-5 h-5 text-brand-cyan" />
            <span>Saved Queries</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Save, organize, and reuse your frequently used SQL queries
          </p>
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              createSavedQuery({
                title: 'New Query',
                sql: 'SELECT * FROM students LIMIT 10;',
                folder: 'Frequently Used',
                database: 'my_database'
              }).then(() => fetchQueries());
            }}
            className="px-3.5 py-1.5 rounded-lg bg-brand-cyan hover:bg-brand-cyan/90 text-dark-900 font-bold text-xs flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Query</span>
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-1.5 rounded-lg bg-dark-800 hover:bg-dark-700 border border-dark-600 text-xs font-semibold text-slate-300 flex items-center gap-1.5 cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Import Queries</span>
          </button>
          <button
            onClick={handleExportQueries}
            className="px-3 py-1.5 rounded-lg bg-dark-800 hover:bg-dark-700 border border-dark-600 text-xs font-semibold text-slate-300 flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Queries</span>
          </button>
        </div>
      </div>

      {/* 2. Top Metric Cards Row (4 cards matching Page 8) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-dark-800/80 border border-dark-700/80 rounded-xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-3xl font-black text-white block">{queries.length || 12}</span>
              <span className="text-[10px] text-brand-emerald font-mono font-bold">+2 this week</span>
            </div>
            <span className="text-xs text-slate-300 font-medium">Saved Queries</span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-brand-cyan/15 flex items-center justify-center text-brand-cyan">
            <FileText className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-dark-800/80 border border-dark-700/80 rounded-xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-3xl font-black text-white block">{folders.length || 4}</span>
              <span className="text-[10px] text-brand-blue font-mono font-bold">Organized</span>
            </div>
            <span className="text-xs text-slate-300 font-medium">Folders</span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-brand-blue/15 flex items-center justify-center text-brand-blue">
            <Folder className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-dark-800/80 border border-dark-700/80 rounded-xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-3xl font-black text-indigo-400 block">24</span>
              <span className="text-[10px] text-brand-emerald font-mono font-bold">+40%</span>
            </div>
            <span className="text-xs text-slate-300 font-medium">Total Executions</span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-indigo-500/15 flex items-center justify-center text-indigo-400">
            <Activity className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-dark-800/80 border border-dark-700/80 rounded-xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-3xl font-black text-white block">{resultDuration} ms</span>
              <span className="text-[10px] text-brand-emerald font-mono font-bold">↓ 62%</span>
            </div>
            <span className="text-xs text-slate-300 font-medium">Avg Execution Time</span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-brand-amber/15 flex items-center justify-center text-brand-amber">
            <Clock className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 3. Main Split View: Folders & Queries List (Left 4 cols) & Editor & Results (Right 8 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Side: Saved Queries List (4 cols) */}
        <div className="lg:col-span-4 bg-dark-800/80 border border-dark-700/80 rounded-xl p-4 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                Saved Queries List
              </h3>
            </div>

            {/* Search & Filter */}
            <div className="space-y-2 mb-3">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search saved queries..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full bg-dark-900 border border-dark-700 rounded-lg pl-8 pr-3 py-1 text-xs font-mono text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-brand-cyan"
                />
              </div>

              <select
                value={folderFilter}
                onChange={e => setFolderFilter(e.target.value)}
                className="w-full bg-dark-900 border border-dark-700 rounded-lg px-2.5 py-1 text-xs font-mono text-slate-300"
              >
                <option value="All Folders">All Folders</option>
                {folders.map(f => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>

            {/* Folders Accordion Tree */}
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
              {folders
                .filter(f => folderFilter === 'All Folders' || folderFilter === f)
                .map(folderName => {
                  const folderQueries = queries.filter(q => (q.folder || 'Frequently Used') === folderName);
                  const isFolderOpen = openFolders[folderName] ?? true;
                  return (
                    <div key={folderName} className="space-y-1">
                      <div
                        onClick={() =>
                          setOpenFolders(prev => ({ ...prev, [folderName]: !isFolderOpen }))
                        }
                        className="flex items-center justify-between text-xs font-mono font-bold text-brand-amber cursor-pointer hover:text-white py-1"
                      >
                        <div className="flex items-center gap-1.5">
                          {isFolderOpen ? (
                            <ChevronDown className="w-3.5 h-3.5 text-brand-amber" />
                          ) : (
                            <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                          )}
                          <Folder className="w-3.5 h-3.5" />
                          <span>{folderName}</span>
                          <span className="text-slate-500 font-normal">({folderQueries.length})</span>
                        </div>
                      </div>

                      {/* Items */}
                      {isFolderOpen && (
                        <div className="pl-4 space-y-1 border-l border-dark-700 ml-2">
                          {folderQueries
                            .filter(q => q.title.toLowerCase().includes(search.toLowerCase()))
                            .map(q => {
                              const isSelected = selectedQuery?.id === q.id;
                              return (
                                <div
                                  key={q.id}
                                  onClick={() => handleSelectQuery(q)}
                                  className={`p-2 rounded-lg cursor-pointer transition-colors flex items-center justify-between ${
                                    isSelected
                                      ? 'bg-brand-cyan/20 border border-brand-cyan/40 text-brand-cyan'
                                      : 'bg-dark-900/60 hover:bg-dark-900 text-slate-300 border border-dark-700/40'
                                  }`}
                                >
                                  <div className="truncate pr-2">
                                    <span className="text-xs font-bold block truncate">{q.title}</span>
                                    <span className="text-[10px] text-slate-400 block truncate">
                                      {q.description || q.sql.slice(0, 35)}
                                    </span>
                                  </div>
                                  <button
                                    onClick={e => handleToggleStar(q, e)}
                                    className="text-slate-500 hover:text-brand-amber p-1 shrink-0"
                                  >
                                    <Star
                                      className={`w-3.5 h-3.5 ${
                                        q.isStarred ? 'fill-brand-amber text-brand-amber' : ''
                                      }`}
                                    />
                                  </button>
                                </div>
                              );
                            })}
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        </div>

        {/* Right Side: Active Query Detail, Editor & Results (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          {/* Header of Active Query */}
          <div className="bg-dark-800/80 border border-dark-700/80 rounded-xl p-4 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1 mr-4">
              <input
                type="text"
                value={editableTitle}
                onChange={e => setEditableTitle(e.target.value)}
                className="text-sm font-bold text-white bg-transparent border-b border-transparent hover:border-dark-600 focus:border-brand-cyan focus:outline-none w-full"
              />
              <button
                onClick={e => selectedQuery && handleToggleStar(selectedQuery, e)}
                className="text-slate-400 hover:text-brand-amber"
              >
                <Star
                  className={`w-4 h-4 ${
                    selectedQuery?.isStarred ? 'fill-brand-amber text-brand-amber' : ''
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleShare}
                className="p-1.5 rounded bg-dark-700 hover:bg-dark-600 text-slate-300 cursor-pointer"
                title="Copy SQL link"
              >
                <Share2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => {
                  if (selectedQuery) {
                    deleteSavedQuery(selectedQuery.id).then(() => fetchQueries());
                    toast('info', 'Query deleted');
                  }
                }}
                className="p-1.5 rounded bg-dark-700 hover:bg-dark-600 text-slate-300 hover:text-brand-rose cursor-pointer"
                title="Delete"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleRun}
                disabled={executing}
                className="px-4 py-1.5 rounded-lg bg-brand-cyan hover:bg-brand-cyan/90 text-dark-900 font-bold text-xs flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-dark-900" />
                <span>{executing ? 'Executing...' : 'Run Query'}</span>
              </button>
            </div>
          </div>

          {/* SQL Editor Box */}
          <div className="bg-dark-900 border border-dark-700 rounded-xl p-3 shadow-inner">
            <textarea
              value={editableSql}
              onChange={e => setEditableSql(e.target.value)}
              rows={4}
              className="w-full bg-transparent text-xs font-mono text-slate-100 focus:outline-none leading-relaxed selection:bg-brand-cyan/20"
            />
          </div>

          {/* Results Card */}
          <div className="bg-dark-800/80 border border-dark-700/80 rounded-xl overflow-hidden shadow-sm flex flex-col justify-between">
            <div>
              {/* Tab Bar */}
              <div className="p-3 bg-dark-900/90 border-b border-dark-700/80 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {(['Results', 'Execution Plan', 'Performance', 'Index Usage'] as const).map(t => (
                    <button
                      key={t}
                      onClick={() => setActiveTab(t)}
                      className={`px-3 py-1 rounded text-xs font-mono cursor-pointer ${
                        activeTab === t
                          ? 'bg-brand-cyan/20 text-brand-cyan font-bold border border-brand-cyan/30'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2 text-xs font-mono">
                  <span className="text-brand-emerald font-bold">{resultDuration} ms</span>
                  <span className="text-slate-500">•</span>
                  <span className="text-slate-300">{resultCount} rows</span>
                </div>
              </div>

              {/* Tab 1: Results Table */}
              {activeTab === 'Results' && (
                <div className="overflow-x-auto max-h-56">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-dark-900 text-slate-400 border-b border-dark-700">
                      <tr>
                        {displayRows.length > 0 &&
                          Object.keys(displayRows[0]).slice(0, 6).map(col => (
                            <th key={col} className="py-2 px-3">
                              {col}
                            </th>
                          ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-dark-700/40 text-slate-200">
                      {displayRows.slice(0, 25).map((r, i) => (
                        <tr key={r.id || i} className="hover:bg-dark-700/30">
                          {Object.keys(r).slice(0, 6).map((col, cIdx) => (
                            <td
                              key={col}
                              className={`py-1.5 px-3 ${
                                cIdx === 0
                                  ? 'font-bold text-brand-cyan'
                                  : col === 'department'
                                  ? 'text-brand-blue'
                                  : col === 'cgpa'
                                  ? 'text-brand-amber font-bold'
                                  : 'text-slate-300'
                              }`}
                            >
                              {r[col] !== undefined && r[col] !== null ? String(r[col]) : '-'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Tab 2: Execution Plan */}
              {activeTab === 'Execution Plan' && (
                <div className="p-4 bg-dark-950 font-mono text-xs text-slate-300 max-h-56 overflow-y-auto">
                  <pre className="text-brand-cyan text-[11px] leading-relaxed">
                    {explainResult ||
                      `-> Index lookup on students using idx_department (department = 'CSE')\n    -> Rows fetched: 3\n    -> Cost: 12.35`}
                  </pre>
                </div>
              )}

              {/* Tab 3: Performance */}
              {activeTab === 'Performance' && (
                <div className="p-4 space-y-3 font-mono text-xs">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-2.5 rounded bg-dark-900 border border-dark-700 text-center">
                      <span className="text-[10px] text-slate-400 block">Duration</span>
                      <span className="text-base font-bold text-brand-emerald">{resultDuration} ms</span>
                    </div>
                    <div className="p-2.5 rounded bg-dark-900 border border-dark-700 text-center">
                      <span className="text-[10px] text-slate-400 block">Rows Returned</span>
                      <span className="text-base font-bold text-white">{resultCount}</span>
                    </div>
                    <div className="p-2.5 rounded bg-dark-900 border border-dark-700 text-center">
                      <span className="text-[10px] text-slate-400 block">Optimizer Cost</span>
                      <span className="text-base font-bold text-brand-cyan">12.35</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 4: Index Usage */}
              {activeTab === 'Index Usage' && (
                <div className="p-4 space-y-2 font-mono text-xs">
                  <div className="flex items-center justify-between p-2 rounded bg-dark-900 border border-dark-700">
                    <span className="text-brand-cyan font-bold">idx_department</span>
                    <span className="text-brand-emerald">Active • Used for filtering</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded bg-dark-900 border border-dark-700">
                    <span className="text-slate-400">PRIMARY</span>
                    <span className="text-slate-500">Clustered index</span>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Controls */}
            <div className="p-3 bg-dark-900/90 border-t border-dark-700/80 flex items-center justify-between text-xs font-mono">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSaveChanges}
                  className="px-3 py-1 rounded bg-brand-cyan text-dark-900 font-bold hover:bg-brand-cyan/90 cursor-pointer"
                >
                  Save Changes
                </button>
                <button
                  onClick={handleSaveAsNew}
                  className="px-3 py-1 rounded bg-dark-800 text-slate-300 hover:text-white border border-dark-600 cursor-pointer"
                >
                  Save As New
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleShare}
                  className="px-2.5 py-1 rounded bg-dark-800 hover:bg-dark-700 text-slate-300 border border-dark-600 flex items-center gap-1 cursor-pointer"
                >
                  <Share2 className="w-3 h-3" />
                  <span>Share</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
