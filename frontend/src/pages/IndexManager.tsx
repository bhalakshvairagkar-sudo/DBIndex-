import React, { useState, useEffect } from 'react';
import {
  Layers,
  Plus,
  Trash2,
  Eye,
  Edit2,
  Search,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  TrendingDown,
  TrendingUp,
  Square,
  CheckSquare,
  Activity,
  BarChart3,
  GitBranch
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid
} from 'recharts';
import {
  getMysqlIndexes,
  createMysqlIndex,
  dropMysqlIndex,
  getMysqlTableSchema
} from '../services/api';
import { MySqlIndex, MySqlColumn } from '../types';
import { useToast } from '../components/ui';

export const IndexManager: React.FC = () => {
  const toast = useToast();
  const [selectedDb, setSelectedDb] = useState<string>('my_database');
  const [selectedTable, setSelectedTable] = useState<string>('students');
  const [indexes, setIndexes] = useState<MySqlIndex[]>([]);
  const [columns, setColumns] = useState<MySqlColumn[]>([]);

  // Search & Filter
  const [search, setSearch] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('All');

  // Create Form State
  const [formTab, setFormTab] = useState<'Basic' | 'Composite' | 'Advanced'>('Basic');
  const [newIndexName, setNewIndexName] = useState<string>('idx_department');
  const [newIndexType, setNewIndexType] = useState<string>('BTREE');
  const [selectedCols, setSelectedCols] = useState<string[]>(['department']);
  const [isUnique, setIsUnique] = useState<boolean>(false);
  const [isParallel, setIsParallel] = useState<boolean>(true);
  const [creating, setCreating] = useState<boolean>(false);

  // 24h Index Access Area Chart Data
  const usageChartData = [
    { time: '00:00', indexAccesses: 45, tableScan: 120 },
    { time: '04:00', indexAccesses: 70, tableScan: 140 },
    { time: '08:00', indexAccesses: 160, tableScan: 80 },
    { time: '12:00', indexAccesses: 195, tableScan: 40 },
    { time: '16:00', indexAccesses: 175, tableScan: 50 },
    { time: '20:00', indexAccesses: 110, tableScan: 65 }
  ];

  const fetchIndexes = async () => {
    try {
      const res = await getMysqlIndexes(selectedDb, selectedTable);
      if (res?.indexes) {
        setIndexes(res.indexes);
      } else {
        // Fallback default index set matching screenshot
        setIndexes([
          { tableName: 'students', name: 'PRIMARY', type: 'PRIMARY', columns: ['id'], sizeBytes: 2100000, sizeFormatted: '2.1 MB', status: 'Active', unique: true },
          { tableName: 'students', name: 'idx_department', type: 'BTREE', columns: ['department'], sizeBytes: 3400000, sizeFormatted: '3.4 MB', status: 'Active', unique: false },
          { tableName: 'students', name: 'idx_cgpa', type: 'BTREE', columns: ['cgpa'], sizeBytes: 2800000, sizeFormatted: '2.8 MB', status: 'Active', unique: false },
          { tableName: 'students', name: 'idx_name', type: 'HASH', columns: ['name'], sizeBytes: 1600000, sizeFormatted: '1.6 MB', status: 'Active', unique: false },
          { tableName: 'students', name: 'idx_department_cgpa', type: 'BTREE', columns: ['department', 'cgpa'], sizeBytes: 6300000, sizeFormatted: '6.3 MB', status: 'Active', unique: false },
          { tableName: 'students', name: 'idx_email', type: 'BTREE', columns: ['email'], sizeBytes: 7800000, sizeFormatted: '7.8 MB', status: 'Active', unique: false }
        ]);
      }
    } catch {
      // Use fallback
    }
  };

  useEffect(() => {
    fetchIndexes();
    getMysqlTableSchema(selectedDb, selectedTable).then(res => {
      if (res?.columns) setColumns(res.columns);
    });
  }, [selectedDb, selectedTable]);

  const handleCreateIndex = async () => {
    if (!newIndexName.trim() || selectedCols.length === 0) {
      toast('error', 'Index name and at least one column required');
      return;
    }
    setCreating(true);
    try {
      await createMysqlIndex({
        database: selectedDb,
        table: selectedTable,
        indexName: newIndexName.trim(),
        columns: selectedCols,
        unique: isUnique,
        indexType: newIndexType
      });
      toast('success', `Index ${newIndexName} created successfully in MySQL`);
      fetchIndexes();
      setNewIndexName('');
    } catch (err) {
      toast('error', (err as Error).message);
    } finally {
      setCreating(false);
    }
  };

  const handleDropIndex = async (indexName: string) => {
    if (indexName === 'PRIMARY') {
      toast('error', 'Cannot drop PRIMARY KEY index directly');
      return;
    }
    try {
      await dropMysqlIndex({ database: selectedDb, table: selectedTable, indexName });
      toast('info', `Index ${indexName} dropped successfully`);
      fetchIndexes();
    } catch (err) {
      toast('error', (err as Error).message);
    }
  };

  const filteredIndexes = indexes.filter(idx => {
    const matchesSearch = idx.name.toLowerCase().includes(search.toLowerCase()) ||
      idx.columns.join(' ').toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter === 'All' || idx.type === typeFilter;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-5 select-none animate-in fade-in duration-300">
      {/* 1. Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Layers className="w-5 h-5 text-brand-cyan" />
            <span>Index Manager</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Create, manage, and optimize indexes for better query performance
          </p>
        </div>

        {/* Database & Table Selectors + Action */}
        <div className="flex items-center gap-3">
          <div>
            <span className="text-[10px] font-mono text-slate-400 block">Database</span>
            <select
              value={selectedDb}
              onChange={e => setSelectedDb(e.target.value)}
              className="bg-dark-800 border border-dark-600 rounded-lg px-2.5 py-1 text-xs font-mono text-slate-200"
            >
              <option value="my_database">my_database</option>
              <option value="university">university</option>
              <option value="ecommerce">ecommerce</option>
            </select>
          </div>

          <div>
            <span className="text-[10px] font-mono text-slate-400 block">Table</span>
            <select
              value={selectedTable}
              onChange={e => setSelectedTable(e.target.value)}
              className="bg-dark-800 border border-dark-600 rounded-lg px-2.5 py-1 text-xs font-mono text-slate-200"
            >
              <option value="students">students</option>
              <option value="courses">courses</option>
              <option value="enrollments">enrollments</option>
            </select>
          </div>

          <div className="pt-3.5">
            <button
              onClick={() => {
                setNewIndexName(`idx_${Date.now().toString().slice(-4)}`);
                toast('info', 'Fill in the creation form on the right');
              }}
              className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-brand-cyan to-indigo-600 hover:opacity-95 text-dark-900 font-bold text-xs flex items-center gap-1.5 shadow-md shadow-brand-cyan/20 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Index</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Top Metric Cards Row (4 cards matching Page 7) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Indexes */}
        <div className="bg-dark-800/80 border border-dark-700/80 rounded-xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-3xl font-black text-white block">{indexes.length || 6}</span>
            <span className="text-xs text-slate-300 font-medium">Total Indexes</span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-brand-emerald/15 flex items-center justify-center text-brand-emerald">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        {/* Card 2: Query Speed Improvement */}
        <div className="bg-dark-800/80 border border-dark-700/80 rounded-xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-3xl font-black text-brand-cyan block">79.3%</span>
            <span className="text-xs text-slate-300 font-medium">Query Speed Improvement</span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-brand-cyan/15 flex items-center justify-center text-brand-cyan">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        {/* Card 3: Total Index Size */}
        <div className="bg-dark-800/80 border border-dark-700/80 rounded-xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-3xl font-black text-indigo-400 block">24 MB</span>
            <span className="text-xs text-slate-300 font-medium">Total Index Size</span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-indigo-500/15 flex items-center justify-center text-indigo-400">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        {/* Card 4: Avg Query Time */}
        <div className="bg-dark-800/80 border border-dark-700/80 rounded-xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-3xl font-black text-white block">312 ms</span>
              <span className="text-[11px] text-brand-emerald font-mono font-bold">↓ 68%</span>
            </div>
            <span className="text-xs text-slate-300 font-medium">Avg Query Time (with index)</span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-brand-rose/15 flex items-center justify-center text-brand-rose">
            <TrendingDown className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 3. Middle Section: Indexes Table (Left 8 cols) & Create New Index Panel (Right 4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Indexes Table (8 cols) */}
        <div className="lg:col-span-8 bg-dark-800/80 border border-dark-700/80 rounded-xl overflow-hidden shadow-sm flex flex-col justify-between">
          <div>
            {/* Table Header & Search Filter */}
            <div className="p-3 bg-dark-900/90 border-b border-dark-700/80 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-bold font-mono uppercase text-white">
                  Indexes on {selectedTable}
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Search indexes..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="bg-dark-900 border border-dark-700 rounded-lg pl-8 pr-3 py-1 text-xs font-mono text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-brand-cyan"
                  />
                </div>

                <select
                  value={typeFilter}
                  onChange={e => setTypeFilter(e.target.value)}
                  className="bg-dark-900 border border-dark-700 rounded-lg px-2.5 py-1 text-xs font-mono text-slate-300"
                >
                  <option value="All">All Types</option>
                  <option value="PRIMARY">PRIMARY</option>
                  <option value="BTREE">BTREE</option>
                  <option value="HASH">HASH</option>
                </select>
              </div>
            </div>

            {/* Table of Indexes */}
            <div className="overflow-x-auto max-h-[360px]">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-dark-900/80 text-slate-400 border-b border-dark-700">
                  <tr>
                    <th className="py-2.5 px-3 w-8">
                      <Square className="w-3.5 h-3.5 text-slate-600" />
                    </th>
                    <th className="py-2.5 px-3">Name</th>
                    <th className="py-2.5 px-3">Columns</th>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3">Size</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-700/40 text-slate-200">
                  {filteredIndexes.map(idx => (
                    <tr key={idx.name} className="hover:bg-dark-700/30 transition-colors">
                      <td className="py-2 px-3">
                        <Square className="w-3.5 h-3.5 text-slate-600" />
                      </td>
                      <td className="py-2 px-3 font-bold text-white flex items-center gap-2">
                        <Layers className="w-3.5 h-3.5 text-brand-cyan" />
                        <span>{idx.name}</span>
                      </td>
                      <td className="py-2 px-3 text-brand-cyan">{idx.columns.join(', ')}</td>
                      <td className="py-2 px-3">
                        <span className="px-1.5 py-0.5 rounded bg-dark-900 text-[10px] font-bold text-slate-300 border border-dark-700">
                          {idx.type}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-slate-400">{idx.sizeFormatted || '2.8 MB'}</td>
                      <td className="py-2 px-3">
                        <span className="flex items-center gap-1 text-[11px] text-brand-emerald">
                          <span className="w-1.5 h-1.5 rounded-full bg-brand-emerald animate-pulse" />
                          Active
                        </span>
                      </td>
                      <td className="py-2 px-3 text-right">
                        <div className="flex items-center justify-end gap-2 text-slate-400">
                          <button
                            onClick={() => toast('info', `Inspecting index ${idx.name}`)}
                            className="hover:text-brand-cyan"
                            title="Inspect"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => toast('info', `Editing index ${idx.name}`)}
                            className="hover:text-brand-blue"
                            title="Edit"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDropIndex(idx.name)}
                            className="hover:text-brand-rose"
                            title="Drop index"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right: Create New Index Form (4 cols) */}
        <div className="lg:col-span-4 bg-dark-800/80 border border-dark-700/80 rounded-xl p-4 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono mb-3">
              Create New Index
            </h3>

            {/* Form Tabs */}
            <div className="grid grid-cols-3 gap-1 p-1 bg-dark-900 rounded-lg mb-3 text-center text-xs font-mono">
              {(['Basic', 'Composite', 'Advanced'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setFormTab(tab)}
                  className={`py-1 rounded cursor-pointer ${
                    formTab === tab ? 'bg-brand-cyan/20 text-brand-cyan font-bold' : 'text-slate-400'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Inputs */}
            <div className="space-y-3 font-mono text-xs">
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Index Name</label>
                <input
                  type="text"
                  value={newIndexName}
                  onChange={e => setNewIndexName(e.target.value)}
                  placeholder="e.g. idx_department"
                  className="w-full bg-dark-900 border border-dark-600 rounded-lg p-2 text-white focus:outline-none focus:border-brand-cyan"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Index Type</label>
                <select
                  value={newIndexType}
                  onChange={e => setNewIndexType(e.target.value)}
                  className="w-full bg-dark-900 border border-dark-600 rounded-lg p-2 text-white"
                >
                  <option value="BTREE">B+ Tree (Default)</option>
                  <option value="HASH">Hash Index</option>
                  <option value="FULLTEXT">Fulltext</option>
                  <option value="SPATIAL">Spatial</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Columns</label>
                <div className="flex items-center gap-1.5 flex-wrap p-2 bg-dark-900 border border-dark-600 rounded-lg min-h-9">
                  {selectedCols.map(col => (
                    <span
                      key={col}
                      className="px-2 py-0.5 rounded bg-brand-cyan/20 text-brand-cyan text-[11px] flex items-center gap-1"
                    >
                      <span>{col}</span>
                      <button
                        onClick={() => setSelectedCols(prev => prev.filter(c => c !== col))}
                        className="text-slate-400 hover:text-brand-rose"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                  <select
                    onChange={e => {
                      if (e.target.value && !selectedCols.includes(e.target.value)) {
                        setSelectedCols(prev => [...prev, e.target.value]);
                      }
                    }}
                    value=""
                    className="bg-transparent text-slate-400 text-xs focus:outline-none"
                  >
                    <option value="" disabled>
                      + Add column
                    </option>
                    {(columns.length > 0 ? columns.map(c => c.name) : ['id', 'name', 'department', 'cgpa', 'email', 'year']).map(c => (
                      <option key={c} value={c} className="bg-dark-900 text-white">
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Checkbox Options */}
              <div className="space-y-1.5 pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isUnique}
                    onChange={e => setIsUnique(e.target.checked)}
                    className="rounded bg-dark-900 border-dark-600 text-brand-cyan"
                  />
                  <span className="text-slate-300 text-xs">Unique Index</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isParallel}
                    onChange={e => setIsParallel(e.target.checked)}
                    className="rounded bg-dark-900 border-dark-600 text-brand-cyan"
                  />
                  <span className="text-slate-300 text-xs">Use Parallel Build (Faster)</span>
                </label>
              </div>
            </div>
          </div>

          <div className="pt-4">
            <button
              onClick={handleCreateIndex}
              disabled={creating}
              className="w-full py-2 bg-gradient-to-r from-brand-cyan to-brand-blue hover:opacity-95 text-dark-900 font-bold text-xs rounded-lg transition-all flex items-center justify-center gap-1.5 shadow-md shadow-brand-cyan/20 cursor-pointer"
            >
              <Layers className="w-4 h-4 fill-dark-900" />
              <span>{creating ? 'Creating in MySQL...' : 'Create Index'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4. Bottom Row (3 panels): Index Structure Visualization, 24h Usage Statistics, Index Impact Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* 1: Miniature Index Structure Visualization (4 cols) */}
        <div className="lg:col-span-4 bg-dark-800/80 border border-dark-700/80 rounded-xl p-4 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                Index Structure Visualization
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-dark-900 text-brand-cyan">
                idx_department
              </span>
            </div>

            {/* Tree nodes schema */}
            <div className="p-4 rounded-lg bg-dark-900/80 border border-dark-700 flex flex-col items-center space-y-4 font-mono text-[11px]">
              <div className="px-3 py-1 rounded bg-dark-800 border border-brand-cyan text-brand-cyan font-bold">
                [ECE | ENTC | IT | ME]
              </div>
              <div className="w-44 h-2 border-t border-dashed border-dark-600" />
              <div className="grid grid-cols-4 gap-2 text-center w-full">
                <div className="p-1 rounded bg-dark-800 border border-indigo-500/50 text-indigo-300">ECE</div>
                <div className="p-1 rounded bg-dark-800 border border-indigo-500/50 text-indigo-300">ENTC</div>
                <div className="p-1 rounded bg-dark-800 border border-indigo-500/50 text-indigo-300">IT</div>
                <div className="p-1 rounded bg-dark-800 border border-indigo-500/50 text-indigo-300">ME</div>
              </div>
              <div className="grid grid-cols-4 gap-2 text-[10px] text-slate-400 w-full text-center">
                <div className="p-1 rounded bg-dark-950 border border-dark-700">1, 5, 12</div>
                <div className="p-1 rounded bg-dark-950 border border-dark-700">2, 6, 14</div>
                <div className="p-1 rounded bg-dark-950 border border-dark-700">3, 8, 15</div>
                <div className="p-1 rounded bg-dark-950 border border-dark-700">4, 9, 17</div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center gap-3 text-[10px] font-mono text-slate-400 pt-3 border-t border-dark-700/60 mt-3">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-brand-cyan" /> Root Node
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-indigo-500" /> Internal Node
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-slate-600" /> Leaf Node
            </span>
          </div>
        </div>

        {/* 2: Index Usage Statistics (4 cols) */}
        <div className="lg:col-span-4 bg-dark-800/80 border border-dark-700/80 rounded-xl p-4 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                Index Usage Statistics
              </h3>
              <span className="text-[10px] font-mono text-slate-400">Last 24 hours</span>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-4 gap-1.5 mb-3 text-center text-xs font-mono">
              <div className="p-1.5 rounded bg-dark-900 border border-dark-700">
                <span className="text-[9px] text-slate-400 block">Total Uses</span>
                <span className="text-white font-bold">1,284</span>
              </div>
              <div className="p-1.5 rounded bg-dark-900 border border-dark-700">
                <span className="text-[9px] text-slate-400 block">Hit Ratio</span>
                <span className="text-brand-emerald font-bold">96.2%</span>
              </div>
              <div className="p-1.5 rounded bg-dark-900 border border-dark-700">
                <span className="text-[9px] text-slate-400 block">Access Time</span>
                <span className="text-brand-cyan font-bold">45 ms</span>
              </div>
              <div className="p-1.5 rounded bg-dark-900 border border-dark-700">
                <span className="text-[9px] text-slate-400 block">Traversal</span>
                <span className="text-indigo-400 font-bold">0.8 ms</span>
              </div>
            </div>

            {/* Area Chart */}
            <div className="h-32">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={usageChartData} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 9 }} />
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
                  <Area type="monotone" dataKey="indexAccesses" stroke="#06b6d4" fill="#06b6d4" fillOpacity={0.2} />
                  <Area type="monotone" dataKey="tableScan" stroke="#f43f5e" fill="#f43f5e" fillOpacity={0.1} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* 3: Index Impact Analysis (4 cols) */}
        <div className="lg:col-span-4 bg-dark-800/80 border border-dark-700/80 rounded-xl p-4 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                Index Impact Analysis
              </h3>
              <span className="text-[10px] font-mono text-slate-400 truncate max-w-[140px]">
                SELECT * FROM students...
              </span>
            </div>

            {/* Comparison Table */}
            <div className="grid grid-cols-2 gap-2 text-xs font-mono mb-3">
              <div className="p-2.5 rounded-lg bg-dark-900/80 border border-brand-rose/40 text-center">
                <span className="text-[10px] text-brand-rose uppercase font-bold block mb-1">Without Index</span>
                <span className="text-base font-black text-white block">892.4 ms</span>
                <span className="text-[10px] text-slate-400 block mt-0.5">1,234 Rows</span>
                <span className="text-[9px] text-slate-500 block">0 Index Usage</span>
              </div>

              <div className="p-2.5 rounded-lg bg-dark-900/80 border border-brand-cyan/40 text-center">
                <span className="text-[10px] text-brand-cyan uppercase font-bold block mb-1">With Index</span>
                <span className="text-base font-black text-brand-cyan block">12.4 ms</span>
                <span className="text-[10px] text-slate-400 block mt-0.5">56 Rows</span>
                <span className="text-[9px] text-brand-emerald block">1 Index Usage</span>
              </div>
            </div>

            {/* Big Badge */}
            <div className="p-3 rounded-lg bg-gradient-to-r from-brand-cyan/20 to-brand-emerald/20 border border-brand-cyan/40 text-center">
              <span className="text-xl font-black text-brand-cyan font-mono block">
                71.9x Faster
              </span>
              <span className="text-[11px] text-slate-300 block mt-0.5 font-sans">
                Using idx_department lookup
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
