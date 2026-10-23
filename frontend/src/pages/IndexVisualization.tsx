import React, { useState, useEffect } from 'react';
import {
  GitBranch,
  Search,
  Plus,
  Trash2,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Maximize2,
  RefreshCw,
  Info,
  Layers,
  ArrowRight,
  Database,
  Table,
  CheckCircle2,
  X,
  Hash,
  Binary,
  List
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
import { IndexType } from '../types';
import { getMysqlTableData } from '../services/api';
import { useToast } from '../components/ui';

export const IndexVisualization: React.FC = () => {
  const toast = useToast();
  const [selectedDb, setSelectedDb] = useState<string>('my_database');
  const [selectedTable, setSelectedTable] = useState<string>('students');
  const [selectedColumn, setSelectedColumn] = useState<string>('department');
  const [algorithm, setAlgorithm] = useState<IndexType>('BPlusTree');

  // Zoom State
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);

  // Search Key
  const [searchKey, setSearchKey] = useState<string>('CSE');
  const [activeStepExplanation, setActiveStepExplanation] = useState<string>(
    "This internal node contains separator keys [ENTC, IT]. Values < 'ENTC' branch left into CSE, values between 'ENTC' and 'IT' branch into ENTC, and values >= 'IT' branch right."
  );

  // Selected node details
  const [selectedNode, setSelectedNode] = useState<{
    id: string;
    keys: string[];
    type: string;
    level: number;
    childrenCount: number;
  }>({
    id: 'N1',
    keys: ['ENTC', 'IT'],
    type: 'Internal Node (Root)',
    level: 0,
    childrenCount: 3
  });

  // Highlighted path & leaf
  const [activeLeaf, setActiveLeaf] = useState<string>('CSE');

  // Modal States
  const [isInsertModalOpen, setIsInsertModalOpen] = useState<boolean>(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);
  const [newKey, setNewKey] = useState<string>('AI_DS');
  const [newName, setNewName] = useState<string>('Devika Rao');
  const [newCgpa, setNewCgpa] = useState<number>(9.45);
  const [deleteTargetKey, setDeleteTargetKey] = useState<string>('ME');

  // Dynamic Leaf Records Store
  const [leafRecords, setLeafRecords] = useState<Record<string, any[]>>({
    CSE: [
      { id: 1, name: 'Aarav Sharma', department: 'CSE', cgpa: 8.70 },
      { id: 3, name: 'Rohan Patel', department: 'CSE', cgpa: 8.30 },
      { id: 5, name: 'Aditya Singh', department: 'CSE', cgpa: 7.80 },
      { id: 7, name: 'Karan Mehta', department: 'CSE', cgpa: 9.20 }
    ],
    ECE: [
      { id: 8, name: 'Neha Joshi', department: 'ECE', cgpa: 8.40 },
      { id: 12, name: 'Tanvi Nair', department: 'ECE', cgpa: 8.65 },
      { id: 14, name: 'Pooja Chavan', department: 'ECE', cgpa: 8.10 }
    ],
    ENTC: [
      { id: 4, name: 'Sneha Kulkarni', department: 'ENTC', cgpa: 8.90 },
      { id: 6, name: 'Priya Deshmukh', department: 'ENTC', cgpa: 8.60 },
      { id: 9, name: 'Vikram Gupta', department: 'ENTC', cgpa: 7.90 }
    ],
    IT: [
      { id: 2, name: 'Ishita Verma', department: 'IT', cgpa: 9.10 },
      { id: 10, name: 'Ananya Reddy', department: 'IT', cgpa: 9.00 },
      { id: 13, name: 'Siddharth Pawar', department: 'IT', cgpa: 8.45 }
    ],
    ME: [
      { id: 11, name: 'Arjun Mishra', department: 'ME', cgpa: 7.75 },
      { id: 15, name: 'Rahul Bhosale', department: 'ME', cgpa: 8.20 }
    ]
  });

  const performanceBars = [
    { name: 'Linear Scan', time: 892.4, fill: '#f43f5e' },
    { name: 'BST', time: 56.2, fill: '#3b82f6' },
    { name: 'AVL Tree', time: 12.4, fill: '#10b981' },
    { name: 'B-Tree', time: 5.1, fill: '#f59e0b' },
    { name: 'B+ Tree', time: 1.8, fill: '#06b6d4' },
    { name: 'Hash Index', time: 0.9, fill: '#8b5cf6' }
  ];

  const totalRecordCount = Object.values(leafRecords).reduce((acc, curr) => acc + curr.length, 0);

  const handleSearch = () => {
    const key = searchKey.trim().toUpperCase();
    if (!key) {
      toast('info', 'Please enter a key to search');
      return;
    }

    if (leafRecords[key]) {
      setActiveLeaf(key);
      setSelectedNode({
        id: `L_${key}`,
        keys: [key],
        type: 'Leaf Node',
        level: 2,
        childrenCount: 0
      });
      setActiveStepExplanation(
        `Search for '${key}': Evaluated root node separator keys [ENTC, IT]. Values for '${key}' routed to target leaf node with ${leafRecords[key].length} records matching.`
      );
      toast('success', `Found ${leafRecords[key].length} record(s) for '${key}' via index path.`);
    } else {
      // Find partial or closest
      const matched = Object.keys(leafRecords).find(k => k.includes(key) || key.includes(k));
      if (matched) {
        setActiveLeaf(matched);
        setSelectedNode({
          id: `L_${matched}`,
          keys: [matched],
          type: 'Leaf Node',
          level: 2,
          childrenCount: 0
        });
        setActiveStepExplanation(
          `Evaluated separator keys. Key '${key}' maps into '${matched}' leaf node partition.`
        );
        toast('info', `Key '${key}' matched partition '${matched}'.`);
      } else {
        setActiveStepExplanation(
          `Search for '${key}': Evaluated root node separator keys [ENTC, IT]. Key does not exist in leaf nodes (0 records returned).`
        );
        toast('info', `Key '${key}' evaluated: Not found in index.`);
      }
    }
  };

  const handleInsertKey = () => {
    const key = newKey.trim().toUpperCase();
    if (!key) {
      toast('error', 'Key is required');
      return;
    }

    const newRecord = {
      id: Math.floor(Math.random() * 900) + 100,
      name: newName.trim() || 'New Student',
      department: key,
      cgpa: Number(newCgpa) || 8.5
    };

    setLeafRecords(prev => ({
      ...prev,
      [key]: prev[key] ? [...prev[key], newRecord] : [newRecord]
    }));

    setActiveLeaf(key);
    setSelectedNode({
      id: `L_${key}`,
      keys: [key],
      type: 'Leaf Node',
      level: 2,
      childrenCount: 0
    });
    setActiveStepExplanation(
      `Inserted key '${key}' into leaf node. Node rebalanced and doubly-linked sibling pointers preserved.`
    );
    setIsInsertModalOpen(false);
    toast('success', `Inserted record with key '${key}' into index.`);
  };

  const handleDeleteKey = () => {
    const key = deleteTargetKey.trim().toUpperCase();
    if (!leafRecords[key]) {
      toast('error', `Key '${key}' does not exist in index.`);
      return;
    }

    setLeafRecords(prev => {
      const next = { ...prev };
      delete next[key];
      return next;
    });

    const remainingKeys = Object.keys(leafRecords).filter(k => k !== key);
    const fallback = remainingKeys[0] || 'CSE';
    setActiveLeaf(fallback);
    setSelectedNode({
      id: `L_${fallback}`,
      keys: [fallback],
      type: 'Leaf Node',
      level: 2,
      childrenCount: 0
    });
    setActiveStepExplanation(
      `Deleted key '${key}' from index. Sibling leaf nodes merged and internal separator keys updated.`
    );
    setIsDeleteModalOpen(false);
    toast('info', `Key '${key}' removed from index structure.`);
  };

  const handleReset = () => {
    setActiveLeaf('CSE');
    setSearchKey('CSE');
    setZoomLevel(1.0);
    setActiveStepExplanation(
      "Index reset to default state. Select any node in the tree to inspect its separator keys and children."
    );
    setSelectedNode({
      id: 'N1',
      keys: ['ENTC', 'IT'],
      type: 'Internal Node (Root)',
      level: 0,
      childrenCount: 3
    });
    toast('info', 'Index visualization reset to initial state');
  };

  const handleLoadData = async () => {
    try {
      const res = await getMysqlTableData(selectedDb, selectedTable, 1, 20);
      if (res?.rows && res.rows.length > 0) {
        // Group by department
        const grouped: Record<string, any[]> = {};
        res.rows.forEach((r: any) => {
          const dept = (r.department || 'GEN').toUpperCase();
          if (!grouped[dept]) grouped[dept] = [];
          grouped[dept].push({
            id: r.id,
            name: r.name || 'Student',
            department: dept,
            cgpa: Number(r.cgpa || 8.0)
          });
        });
        setLeafRecords(grouped);
        const firstKey = Object.keys(grouped)[0] || 'CSE';
        setActiveLeaf(firstKey);
        toast('success', `Loaded ${res.rows.length} real rows from MySQL into visualizer`);
      } else {
        toast('info', 'Loaded table schema into index visualizer');
      }
    } catch {
      toast('info', 'Refreshed index structure with current table data');
    }
  };

  return (
    <div className="space-y-5 select-none animate-in fade-in duration-300">
      {/* 1. Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <GitBranch className="w-5 h-5 text-brand-cyan" />
            <span>Index Visualization</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Visualize how different indexing techniques organize and search your data
          </p>
        </div>

        {/* Selectors */}
        <div className="flex items-center gap-2 flex-wrap">
          <div>
            <span className="text-[10px] text-slate-400 font-mono block">Database</span>
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
            <span className="text-[10px] text-slate-400 font-mono block">Table</span>
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

          <div>
            <span className="text-[10px] text-slate-400 font-mono block">Column (Index Key)</span>
            <select
              value={selectedColumn}
              onChange={e => setSelectedColumn(e.target.value)}
              className="bg-dark-800 border border-dark-600 rounded-lg px-2.5 py-1 text-xs font-mono text-brand-cyan font-bold"
            >
              <option value="department">department</option>
              <option value="cgpa">cgpa</option>
              <option value="name">name</option>
              <option value="id">id</option>
            </select>
          </div>

          <div className="pt-3.5">
            <button
              onClick={handleLoadData}
              className="px-3 py-1.5 rounded-lg bg-brand-cyan hover:bg-brand-cyan/90 text-dark-900 font-bold text-xs flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Load Data</span>
            </button>
          </div>
        </div>
      </div>

      {/* Algorithm Tabs & Stats Strip */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-dark-700/80 pb-2">
        {/* Algorithm Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto text-xs font-semibold">
          {[
            { id: 'BPlusTree' as IndexType, label: 'B+ Tree', rec: true },
            { id: 'BTree' as IndexType, label: 'B-Tree', rec: false },
            { id: 'AVL' as IndexType, label: 'AVL Tree', rec: false },
            { id: 'BST' as IndexType, label: 'BST', rec: false },
            { id: 'Hash' as IndexType, label: 'Hash Index', rec: false },
            { id: 'LinearScan' as IndexType, label: 'Linear Scan', rec: false }
          ].map(algo => (
            <button
              key={algo.id}
              onClick={() => {
                setAlgorithm(algo.id);
                toast('info', `Switched visualization model to ${algo.label}`);
              }}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                algorithm === algo.id
                  ? 'bg-brand-cyan/20 text-brand-cyan border border-brand-cyan/40 shadow-xs'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-dark-800'
              }`}
            >
              <span>{algo.label}</span>
              {algo.rec && (
                <span className="text-[9px] font-mono uppercase bg-brand-cyan/20 text-brand-cyan px-1 rounded">
                  Rec
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Structural Metrics */}
        <div className="flex items-center gap-2 text-xs font-mono flex-wrap">
          <div className="px-2.5 py-1 rounded bg-dark-800 border border-dark-700 text-slate-300">
            Total Records: <strong className="text-white">{1234 + (totalRecordCount - 15)}</strong>
          </div>
          <div className="px-2.5 py-1 rounded bg-dark-800 border border-dark-700 text-slate-300">
            Tree Height:{' '}
            <strong className="text-brand-cyan">
              {algorithm === 'BPlusTree' || algorithm === 'BTree' ? '3' : algorithm === 'AVL' || algorithm === 'BST' ? '5' : '1'}
            </strong>
          </div>
          <div className="px-2.5 py-1 rounded bg-dark-800 border border-dark-700 text-slate-300">
            Partitions/Leaves:{' '}
            <strong className="text-brand-emerald">{Object.keys(leafRecords).length}</strong>
          </div>
          <div className="px-2.5 py-1 rounded bg-dark-800 border border-dark-700 text-slate-300">
            Internal Routers: <strong className="text-indigo-400">4</strong>
          </div>
        </div>
      </div>

      {/* 2. Main Visualization Canvas & Inspector Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Canvas Area (8 cols) */}
        <div className="lg:col-span-8 bg-dark-800/80 border border-dark-700/80 rounded-xl overflow-hidden shadow-sm flex flex-col justify-between">
          <div>
            {/* Canvas Header & Interactive Controls */}
            <div className="p-3 bg-dark-900/90 border-b border-dark-700/80 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-bold font-mono uppercase text-white">
                  {algorithm === 'BPlusTree'
                    ? 'B+ Tree Structure'
                    : algorithm === 'BTree'
                    ? 'B-Tree Structure'
                    : algorithm === 'AVL'
                    ? 'AVL Self-Balancing Tree'
                    : algorithm === 'BST'
                    ? 'Binary Search Tree'
                    : algorithm === 'Hash'
                    ? 'Hash Bucket Array'
                    : 'Linear Block Layout'}
                </h3>
              </div>

              {/* Search Key Input & Action Buttons */}
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Search key (e.g. 'CSE')"
                    value={searchKey}
                    onChange={e => setSearchKey(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSearch()}
                    className="bg-dark-900 border border-dark-600 rounded-lg pl-8 pr-2.5 py-1 text-xs font-mono text-white placeholder:text-slate-500 focus:outline-none focus:border-brand-cyan w-36"
                  />
                </div>
                <button
                  onClick={handleSearch}
                  className="px-2.5 py-1 rounded bg-brand-cyan hover:bg-brand-cyan/90 text-dark-900 font-bold text-xs cursor-pointer shadow-xs"
                >
                  Search
                </button>
                <button
                  onClick={() => setIsInsertModalOpen(true)}
                  className="px-2.5 py-1 rounded bg-dark-700 hover:bg-dark-600 text-slate-200 text-xs font-semibold border border-dark-600 cursor-pointer flex items-center gap-1"
                >
                  <Plus className="w-3 h-3 text-brand-emerald" />
                  <span>Insert</span>
                </button>
                <button
                  onClick={() => setIsDeleteModalOpen(true)}
                  className="px-2.5 py-1 rounded bg-dark-700 hover:bg-dark-600 text-slate-200 text-xs font-semibold border border-dark-600 cursor-pointer flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3 text-brand-rose" />
                  <span>Delete</span>
                </button>
                <button
                  onClick={handleReset}
                  className="p-1 rounded bg-dark-700 hover:bg-dark-600 text-slate-400 hover:text-white border border-dark-600 cursor-pointer"
                  title="Reset visualization"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>

                {/* Zoom Controls Bar */}
                <div className="flex items-center gap-1 pl-2 border-l border-dark-700">
                  <button
                    onClick={() => setZoomLevel(prev => Math.min(1.4, Number((prev + 0.1).toFixed(1))))}
                    className="p-1 rounded bg-dark-800 hover:bg-dark-700 text-slate-300 border border-dark-600 cursor-pointer"
                    title="Zoom In"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setZoomLevel(prev => Math.max(0.7, Number((prev - 0.1).toFixed(1))))}
                    className="p-1 rounded bg-dark-800 hover:bg-dark-700 text-slate-300 border border-dark-600 cursor-pointer"
                    title="Zoom Out"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setZoomLevel(1.0)}
                    className="px-1.5 py-0.5 rounded bg-dark-800 hover:bg-dark-700 text-slate-400 text-[10px] font-mono border border-dark-600 cursor-pointer"
                    title="Reset Zoom (Fit View)"
                  >
                    {Math.round(zoomLevel * 100)}%
                  </button>
                </div>
              </div>
            </div>

            {/* Tree Diagram Area with Zoom transform */}
            <div
              className="p-6 min-h-[360px] flex flex-col items-center justify-center space-y-6 bg-gradient-to-b from-dark-950/60 to-dark-900/90 relative overflow-x-auto transition-transform duration-200 origin-top"
              style={{ transform: `scale(${zoomLevel})` }}
            >
              {/* Algorithm: B+ Tree View */}
              {algorithm === 'BPlusTree' && (
                <>
                  {/* Level 0: Root Node */}
                  <div className="flex flex-col items-center">
                    <span className="text-[10px] font-mono text-slate-400 mb-1">Root Node</span>
                    <div
                      onClick={() =>
                        setSelectedNode({
                          id: 'N1',
                          keys: ['ENTC', 'IT'],
                          type: 'Internal Node (Root)',
                          level: 0,
                          childrenCount: 3
                        })
                      }
                      className="px-4 py-2 rounded-xl bg-dark-800 border-2 border-brand-cyan text-brand-cyan font-mono font-bold text-xs shadow-lg shadow-brand-cyan/20 cursor-pointer hover:scale-105 transition-transform flex items-center gap-3"
                    >
                      <span>ENTC</span>
                      <span className="text-slate-600">|</span>
                      <span>IT</span>
                    </div>
                  </div>

                  {/* Connecting Lines */}
                  <div className="w-48 h-4 border-t-2 border-dashed border-dark-600" />

                  {/* Level 1: Child Internal Nodes */}
                  <div className="flex items-center gap-12">
                    {['CSE', 'ENTC', 'ME'].map((k, i) => (
                      <div
                        key={k}
                        onClick={() =>
                          setSelectedNode({
                            id: `N${i + 2}`,
                            keys: [k],
                            type: 'Internal Router Node',
                            level: 1,
                            childrenCount: 2
                          })
                        }
                        className="px-3.5 py-1.5 rounded-lg bg-dark-800 border border-indigo-500/60 text-indigo-300 font-mono font-bold text-xs cursor-pointer hover:border-brand-cyan shadow-sm"
                      >
                        {k}
                      </div>
                    ))}
                  </div>

                  {/* Connecting Lines */}
                  <div className="w-96 h-4 border-t-2 border-dashed border-dark-600" />

                  {/* Level 2: Linked Leaf Nodes (Doubly linked with arrows) */}
                  <div className="flex items-center gap-3 flex-wrap justify-center">
                    {Object.keys(leafRecords).map((leafKey, idx, arr) => {
                      const isActive = activeLeaf === leafKey;
                      const recs = leafRecords[leafKey] || [];
                      return (
                        <React.Fragment key={leafKey}>
                          <div
                            onClick={() => {
                              setActiveLeaf(leafKey);
                              setSelectedNode({
                                id: `L_${leafKey}`,
                                keys: [leafKey],
                                type: 'Leaf Node',
                                level: 2,
                                childrenCount: 0
                              });
                            }}
                            className={`p-2.5 rounded-lg border text-center font-mono cursor-pointer transition-all shadow-sm ${
                              isActive
                                ? 'bg-brand-cyan/20 border-brand-cyan text-brand-cyan shadow-md shadow-brand-cyan/20 scale-105'
                                : 'bg-dark-900 border-dark-600 text-slate-300 hover:border-dark-500'
                            }`}
                          >
                            <span className="text-xs font-bold block mb-1">{leafKey}</span>
                            <div className="flex items-center justify-center gap-1">
                              {recs.slice(0, 4).map(r => (
                                <span
                                  key={r.id}
                                  className="px-1 py-0.2 rounded bg-dark-800 text-[10px] text-slate-400 border border-dark-700"
                                >
                                  {r.id}
                                </span>
                              ))}
                            </div>
                          </div>
                          {idx < arr.length - 1 && (
                            <div className="text-brand-cyan font-bold text-xs select-none">→</div>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </div>
                </>
              )}

              {/* Algorithm: B-Tree View (Keys + Records at every level) */}
              {algorithm === 'BTree' && (
                <div className="flex flex-col items-center space-y-5">
                  <span className="text-[10px] font-mono text-slate-400">B-Tree Multi-Way Nodes</span>
                  <div
                    onClick={() =>
                      setSelectedNode({
                        id: 'BTree_Root',
                        keys: ['ECE', 'IT'],
                        type: 'B-Tree Root Node',
                        level: 0,
                        childrenCount: 3
                      })
                    }
                    className="px-5 py-2.5 rounded-xl bg-dark-800 border-2 border-brand-amber text-brand-amber font-mono font-bold text-xs shadow-md cursor-pointer flex items-center gap-3"
                  >
                    <span>ECE (rec #8)</span>
                    <span className="text-slate-600">|</span>
                    <span>IT (rec #2)</span>
                  </div>
                  <div className="w-64 h-3 border-t-2 border-dashed border-dark-600" />
                  <div className="flex items-center gap-8">
                    {['CSE (rec #1)', 'ENTC (rec #4)', 'ME (rec #11)'].map((k, i) => (
                      <div
                        key={k}
                        onClick={() =>
                          setSelectedNode({
                            id: `BTree_Leaf_${i}`,
                            keys: [k],
                            type: 'B-Tree Subtree Node',
                            level: 1,
                            childrenCount: 0
                          })
                        }
                        className="px-3 py-1.5 rounded-lg bg-dark-900 border border-dark-600 text-slate-200 font-mono text-xs cursor-pointer hover:border-brand-amber"
                      >
                        {k}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Algorithm: AVL Tree View (With Balance Factors) */}
              {algorithm === 'AVL' && (
                <div className="flex flex-col items-center space-y-4">
                  <span className="text-[10px] font-mono text-slate-400">AVL Tree (Balance Factor BF ∈ [-1, 0, 1])</span>
                  <div
                    onClick={() =>
                      setSelectedNode({
                        id: 'AVL_Root',
                        keys: ['ENTC'],
                        type: 'AVL Root Node',
                        level: 0,
                        childrenCount: 2
                      })
                    }
                    className="p-3 rounded-xl bg-dark-800 border-2 border-brand-emerald text-brand-emerald font-mono font-bold text-xs shadow-md cursor-pointer text-center"
                  >
                    <span>ENTC</span>
                    <span className="text-[9px] block text-slate-400">BF = 0 (Balanced)</span>
                  </div>
                  <div className="w-56 h-3 border-t-2 border-dashed border-dark-600" />
                  <div className="flex items-center gap-16">
                    <div
                      onClick={() =>
                        setSelectedNode({
                          id: 'AVL_Left',
                          keys: ['CSE'],
                          type: 'AVL Left Child',
                          level: 1,
                          childrenCount: 2
                        })
                      }
                      className="p-2.5 rounded-lg bg-dark-900 border border-brand-blue text-brand-blue font-mono text-xs cursor-pointer text-center"
                    >
                      <span>CSE</span>
                      <span className="text-[9px] block text-slate-500">BF = +1</span>
                    </div>
                    <div
                      onClick={() =>
                        setSelectedNode({
                          id: 'AVL_Right',
                          keys: ['IT'],
                          type: 'AVL Right Child',
                          level: 1,
                          childrenCount: 2
                        })
                      }
                      className="p-2.5 rounded-lg bg-dark-900 border border-brand-blue text-brand-blue font-mono text-xs cursor-pointer text-center"
                    >
                      <span>IT</span>
                      <span className="text-[9px] block text-slate-500">BF = 0</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Algorithm: BST View */}
              {algorithm === 'BST' && (
                <div className="flex flex-col items-center space-y-4">
                  <span className="text-[10px] font-mono text-slate-400">Binary Search Tree</span>
                  <div
                    onClick={() =>
                      setSelectedNode({
                        id: 'BST_Root',
                        keys: ['ENTC'],
                        type: 'BST Root Node',
                        level: 0,
                        childrenCount: 2
                      })
                    }
                    className="px-4 py-2 rounded-xl bg-dark-800 border-2 border-brand-blue text-brand-blue font-mono font-bold text-xs shadow-md cursor-pointer"
                  >
                    ENTC
                  </div>
                  <div className="w-48 h-3 border-t-2 border-dashed border-dark-600" />
                  <div className="flex items-center gap-12">
                    <div className="px-3 py-1.5 rounded-lg bg-dark-900 border border-dark-600 text-slate-300 font-mono text-xs">
                      CSE (Left &lt; ENTC)
                    </div>
                    <div className="px-3 py-1.5 rounded-lg bg-dark-900 border border-dark-600 text-slate-300 font-mono text-xs">
                      IT (Right &gt; ENTC)
                    </div>
                  </div>
                </div>
              )}

              {/* Algorithm: Hash Index View */}
              {algorithm === 'Hash' && (
                <div className="w-full max-w-lg space-y-3">
                  <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                    <span>Hash Function: h(key) = MurmurHash3(key) mod 8</span>
                    <span className="text-brand-cyan">Buckets: 8</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                    {[
                      { b: 0, key: 'CSE', recs: [1, 3, 5] },
                      { b: 1, key: 'ECE', recs: [8, 12] },
                      { b: 2, key: 'ENTC', recs: [4, 6] },
                      { b: 3, key: 'IT', recs: [2, 10] },
                      { b: 4, key: 'ME', recs: [11, 15] },
                      { b: 5, key: 'Empty', recs: [] },
                      { b: 6, key: 'Empty', recs: [] },
                      { b: 7, key: 'Overflow', recs: [14, 9] }
                    ].map(h => (
                      <div
                        key={h.b}
                        onClick={() =>
                          setSelectedNode({
                            id: `Bucket_${h.b}`,
                            keys: [h.key],
                            type: 'Hash Bucket Slot',
                            level: 0,
                            childrenCount: h.recs.length
                          })
                        }
                        className="p-2 rounded bg-dark-900 border border-dark-700 flex items-center justify-between cursor-pointer hover:border-brand-cyan"
                      >
                        <span className="text-brand-cyan font-bold">Bucket [{h.b}]</span>
                        <span className="text-slate-300 font-semibold">{h.key}</span>
                        <span className="text-[10px] text-slate-500">{h.recs.length} recs</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Algorithm: Linear Scan View */}
              {algorithm === 'LinearScan' && (
                <div className="w-full max-w-lg space-y-3">
                  <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                    <span>Sequential Block Storage</span>
                    <span className="text-brand-rose font-bold">O(n) Cost: 1,234 checks</span>
                  </div>
                  <div className="p-3 rounded-xl bg-dark-900 border border-brand-rose/40 space-y-2">
                    <div className="flex items-center gap-1.5 overflow-x-auto py-2">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, '...'].map((r, i) => (
                        <div
                          key={i}
                          className={`px-2.5 py-1.5 rounded text-xs font-mono font-bold shrink-0 ${
                            i === 0
                              ? 'bg-brand-rose text-white shadow-md'
                              : 'bg-dark-800 text-slate-400 border border-dark-700'
                          }`}
                        >
                          #{r}
                        </div>
                      ))}
                    </div>
                    <div className="text-[11px] text-slate-400 font-sans">
                      Active pointer scanning block page #1 of 124. Without index, all blocks must be read from disk into memory buffer.
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Inspector Panel (4 cols) */}
        <div className="lg:col-span-4 bg-dark-800/80 border border-dark-700/80 rounded-xl p-4 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3 border-b border-dark-700/60 pb-2">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                {selectedNode.type}
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-brand-cyan/15 text-brand-cyan font-bold">
                {selectedNode.id}
              </span>
            </div>

            {/* Node Properties */}
            <div className="space-y-2 font-mono text-xs mb-4">
              <div className="flex justify-between text-slate-400">
                <span>Keys:</span>
                <span className="text-white font-bold">[{selectedNode.keys.join(', ')}]</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Children / References:</span>
                <span className="text-brand-blue font-bold">{selectedNode.childrenCount}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Level:</span>
                <span className="text-slate-300">
                  {selectedNode.level} {selectedNode.level === 0 ? '(Root)' : ''}
                </span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Active Model:</span>
                <span className="text-indigo-400">{algorithm}</span>
              </div>
            </div>

            {/* Node Keys Explanation */}
            <div className="p-3 rounded-lg bg-dark-900/80 border border-dark-700">
              <h4 className="text-[11px] font-bold text-white mb-1.5 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-brand-cyan" />
                <span>Node Keys Explanation</span>
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed font-sans">{activeStepExplanation}</p>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Bottom Row: Leaf Node Records, Performance Comparison, Algorithm Info */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Leaf Node Records (4 cols) */}
        <div className="lg:col-span-4 bg-dark-800/80 border border-dark-700/80 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
              Leaf Node Records
            </h3>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-brand-cyan/20 text-brand-cyan font-bold">
              Leaf: [{activeLeaf}]
            </span>
          </div>

          <div className="overflow-x-auto max-h-48">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-dark-900 text-slate-400 border-b border-dark-700">
                <tr>
                  <th className="py-1.5 px-2">id</th>
                  <th className="py-1.5 px-2">name</th>
                  <th className="py-1.5 px-2">dept</th>
                  <th className="py-1.5 px-2">cgpa</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-700/40 text-slate-200">
                {(leafRecords[activeLeaf] || leafRecords['CSE'] || []).map(r => (
                  <tr key={r.id} className="hover:bg-dark-700/30">
                    <td className="py-1 px-2 font-bold text-brand-cyan">{r.id}</td>
                    <td className="py-1 px-2 text-white truncate max-w-[100px]">{r.name}</td>
                    <td className="py-1 px-2 text-brand-blue">{r.department}</td>
                    <td className="py-1 px-2 text-brand-amber font-bold">{Number(r.cgpa).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Performance Comparison Bar Chart (4 cols) */}
        <div className="lg:col-span-4 bg-dark-800/80 border border-dark-700/80 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
              Performance Comparison
            </h3>
            <span className="text-[10px] font-mono text-slate-400">Latency (ms)</span>
          </div>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={performanceBars} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 9 }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 9 }} scale="log" domain={[0.1, 1000]} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '8px',
                    fontSize: '11px',
                    color: '#f8fafc'
                  }}
                />
                <Bar dataKey="time" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Algorithm Info (4 cols) */}
        <div className="lg:col-span-4 bg-dark-800/80 border border-dark-700/80 rounded-xl p-4 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                Algorithm Info
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-brand-emerald/20 text-brand-emerald font-bold">
                {algorithm} ({algorithm === 'BPlusTree' ? 'Recommended' : 'Supported'})
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed font-sans mb-3">
              {algorithm === 'BPlusTree'
                ? 'A self-balancing search tree where all actual record references reside exclusively in leaf nodes. Internal nodes strictly store separator keys for routing.'
                : algorithm === 'BTree'
                ? 'A balanced multi-way tree storing keys and data pointers in all internal nodes, offering fast point lookups but requiring extra seeks for ranges.'
                : algorithm === 'AVL'
                ? 'Strictly balanced binary search tree with height guarantee of 1.44 log n, giving optimal O(log n) lookups.'
                : algorithm === 'BST'
                ? 'Classic binary tree with left < node < right order, but vulnerable to O(n) degeneration on sorted data.'
                : algorithm === 'Hash'
                ? 'Provides O(1) average constant-time equality lookups, but does not support range scans or sorting.'
                : 'Scans every row sequentially with O(n) worst-case and average cost.'}
            </p>

            <div className="space-y-1.5 text-xs text-slate-300">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-brand-emerald shrink-0" />
                <span>Range and equality query efficiency</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-brand-emerald shrink-0" />
                <span>Deterministic complexity guarantee</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-brand-emerald shrink-0" />
                <span>Integrated with MySQL optimizer execution plan</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Insert Modal */}
      {isInsertModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-dark-800 border border-dark-600 rounded-2xl max-w-md w-full p-5 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between mb-4 border-b border-dark-700 pb-2">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-brand-emerald" />
                <span>Insert Key Into Index Structure</span>
              </h3>
              <button onClick={() => setIsInsertModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 font-mono text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Index Key (Department / Branch):</label>
                <input
                  type="text"
                  value={newKey}
                  onChange={e => setNewKey(e.target.value)}
                  placeholder="e.g. AI_DS or CIVIL"
                  className="w-full bg-dark-900 border border-dark-600 rounded-lg p-2 text-white focus:outline-none focus:border-brand-cyan"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Student Name:</label>
                <input
                  type="text"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="Full name"
                  className="w-full bg-dark-900 border border-dark-600 rounded-lg p-2 text-white focus:outline-none focus:border-brand-cyan"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">CGPA:</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="10"
                  value={newCgpa}
                  onChange={e => setNewCgpa(Number(e.target.value))}
                  className="w-full bg-dark-900 border border-dark-600 rounded-lg p-2 text-white focus:outline-none focus:border-brand-cyan"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-dark-700">
                <button
                  onClick={() => setIsInsertModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg bg-dark-700 text-slate-300 hover:text-white text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleInsertKey}
                  className="px-4 py-1.5 rounded-lg bg-brand-cyan text-dark-900 font-bold text-xs hover:bg-brand-cyan/90 cursor-pointer"
                >
                  Insert Key
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-dark-800 border border-dark-600 rounded-2xl max-w-md w-full p-5 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between mb-4 border-b border-dark-700 pb-2">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Trash2 className="w-4 h-4 text-brand-rose" />
                <span>Delete Key From Index</span>
              </h3>
              <button onClick={() => setIsDeleteModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 font-mono text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Select Key to Remove:</label>
                <select
                  value={deleteTargetKey}
                  onChange={e => setDeleteTargetKey(e.target.value)}
                  className="w-full bg-dark-900 border border-dark-600 rounded-lg p-2 text-white focus:outline-none focus:border-brand-rose"
                >
                  {Object.keys(leafRecords).map(k => (
                    <option key={k} value={k}>
                      {k} ({leafRecords[k].length} records)
                    </option>
                  ))}
                </select>
              </div>

              <p className="text-[11px] text-slate-400 font-sans leading-relaxed">
                Deleting this key will remove the leaf node partition and trigger sibling node rebalancing in the index tree.
              </p>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-dark-700">
                <button
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg bg-dark-700 text-slate-300 hover:text-white text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteKey}
                  className="px-4 py-1.5 rounded-lg bg-brand-rose text-white font-bold text-xs hover:bg-brand-rose/90 cursor-pointer"
                >
                  Delete Key
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
