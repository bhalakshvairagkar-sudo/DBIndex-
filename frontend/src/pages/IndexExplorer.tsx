import React, { useEffect, useState } from 'react';
import { GitBranch, RefreshCw, Layers, ShieldCheck, Box } from 'lucide-react';
import { TreeVisualizer } from '../components/visualizers/TreeVisualizer';
import { BTreeVisualizer } from '../components/visualizers/BTreeVisualizer';
import { HashVisualizer } from '../components/visualizers/HashVisualizer';
import { LinearVisualizer } from '../components/visualizers/LinearVisualizer';
import { getDatasets, buildIndex, getIndexStructure } from '../services/api';
import { Dataset, IndexType } from '../types';

export const IndexExplorer: React.FC = () => {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>('students');
  const [selectedIndexType, setSelectedIndexType] = useState<IndexType>('AVL');
  const [selectedField, setSelectedField] = useState<string>('cgpa');
  const [structure, setStructure] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [buildTime, setBuildTime] = useState<number | null>(null);

  useEffect(() => {
    getDatasets().then(data => {
      if (data?.datasets) {
        setDatasets(data.datasets);
      }
    });
  }, []);

  const handleBuildAndFetch = async () => {
    setLoading(true);
    try {
      // 1. Ask engine to build index
      const buildRes = await buildIndex(selectedDatasetId, selectedIndexType, selectedField);
      if (buildRes.buildTimeMicroseconds !== undefined) {
        setBuildTime(buildRes.buildTimeMicroseconds);
      }

      // 2. Fetch structural snapshot
      const structRes = await getIndexStructure(selectedIndexType);
      if (structRes?.structure) {
        setStructure(structRes.structure);
        setStats(structRes.stats);
      }
    } catch (err) {
      console.error('Failed to build/inspect index:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    handleBuildAndFetch();
  }, [selectedDatasetId, selectedIndexType, selectedField]);

  const currentDataset = datasets.find(d => d.id === selectedDatasetId);

  return (
    <div className="space-y-6">
      {/* Controls Bar */}
      <div className="bg-dark-800 border border-dark-700/80 rounded-xl p-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              Index Explorer & Structure Visualizer
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Live structural snapshot directly populated from C++ engine in-memory pointers.
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Dataset Selector */}
            <div>
              <label className="block text-[10px] font-mono text-slate-400 mb-1">Dataset</label>
              <select
                value={selectedDatasetId}
                onChange={e => setSelectedDatasetId(e.target.value)}
                className="bg-dark-900 border border-dark-600 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-200"
              >
                {datasets.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Field Selector */}
            <div>
              <label className="block text-[10px] font-mono text-slate-400 mb-1">Indexed Field</label>
              <select
                value={selectedField}
                onChange={e => setSelectedField(e.target.value)}
                className="bg-dark-900 border border-dark-600 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-200"
              >
                {currentDataset?.fields.map(f => (
                  <option key={f.name} value={f.name}>
                    {f.name} ({f.type})
                  </option>
                ))}
              </select>
            </div>

            {/* Index Type Selector */}
            <div>
              <label className="block text-[10px] font-mono text-slate-400 mb-1">Index Algorithm</label>
              <select
                value={selectedIndexType}
                onChange={e => setSelectedIndexType(e.target.value as IndexType)}
                className="bg-dark-900 border border-brand-cyan/50 rounded-lg px-3 py-1.5 text-xs font-mono font-bold text-brand-cyan"
              >
                <option value="LinearScan">Linear Scan (No Index)</option>
                <option value="BST">Binary Search Tree (BST)</option>
                <option value="AVL">AVL Tree (Balanced)</option>
                <option value="Hash">Hash Index (Buckets)</option>
                <option value="BTree">B-Tree (Order M=4)</option>
                <option value="BPlusTree">B+ Tree (Linked Leaves)</option>
              </select>
            </div>

            <div className="pt-4">
              <button
                onClick={handleBuildAndFetch}
                disabled={loading}
                className="px-4 py-2 bg-brand-cyan hover:bg-brand-cyan/90 text-dark-900 font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span>Rebuild Snapshot</span>
              </button>
            </div>
          </div>
        </div>

        {/* Structural Metrics Strip */}
        {stats && (
          <div className="mt-4 pt-4 border-t border-dark-700/60 flex items-center gap-4 flex-wrap text-xs font-mono">
            {stats.height !== undefined && (
              <span className="px-2.5 py-1 bg-dark-900 border border-dark-700 rounded text-slate-300">
                Height: <strong className="text-brand-cyan">{stats.height}</strong>
              </span>
            )}
            {stats.nodeCount !== undefined && (
              <span className="px-2.5 py-1 bg-dark-900 border border-dark-700 rounded text-slate-300">
                Node Count: <strong className="text-brand-blue">{stats.nodeCount}</strong>
              </span>
            )}
            {stats.totalRotations !== undefined && (
              <span className="px-2.5 py-1 bg-dark-900 border border-dark-700 rounded text-slate-300">
                Rotations Performed: <strong className="text-brand-amber">{stats.totalRotations}</strong>
              </span>
            )}
            {stats.bucketCount !== undefined && (
              <span className="px-2.5 py-1 bg-dark-900 border border-dark-700 rounded text-slate-300">
                Bucket Count: <strong className="text-brand-indigo">{stats.bucketCount}</strong>
              </span>
            )}
            {buildTime !== null && (
              <span className="px-2.5 py-1 bg-dark-900 border border-dark-700 rounded text-slate-300">
                Build Time: <strong className="text-brand-emerald">{buildTime.toFixed(1)} µs</strong>
              </span>
            )}
            <span className="text-slate-400 italic font-sans">{stats.description}</span>
          </div>
        )}
      </div>

      {/* Visual Canvas */}
      {loading ? (
        <div className="h-80 flex flex-col items-center justify-center bg-dark-800 rounded-xl border border-dark-700 gap-3">
          <RefreshCw className="w-8 h-8 text-brand-cyan animate-spin" />
          <p className="text-xs font-mono text-slate-400">Querying C++ engine memory snapshot...</p>
        </div>
      ) : structure ? (
        <div>
          {selectedIndexType === 'BST' && (
            <TreeVisualizer root={structure.root} treeType="BST" />
          )}
          {selectedIndexType === 'AVL' && (
            <TreeVisualizer root={structure.root} treeType="AVL" />
          )}
          {selectedIndexType === 'BTree' && (
            <BTreeVisualizer root={structure.root} treeType="BTree" order={structure.order} />
          )}
          {selectedIndexType === 'BPlusTree' && (
            <BTreeVisualizer
              root={structure.root}
              treeType="BPlusTree"
              order={structure.order}
              leafChain={structure.leafChain}
            />
          )}
          {selectedIndexType === 'Hash' && (
            <HashVisualizer
              buckets={structure.buckets}
              bucketCount={structure.bucketCount}
              totalEntries={structure.totalEntries}
              collisionCount={structure.collisionCount}
              loadFactor={structure.loadFactor}
            />
          )}
          {selectedIndexType === 'LinearScan' && (
            <LinearVisualizer
              count={structure.count}
              items={structure.items}
              truncated={structure.truncated}
            />
          )}
        </div>
      ) : (
        <div className="p-8 text-center text-slate-500 text-sm bg-dark-800 rounded-xl border border-dark-700">
          Click "Rebuild Snapshot" to view structure.
        </div>
      )}
    </div>
  );
};
