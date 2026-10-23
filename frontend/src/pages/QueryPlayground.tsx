import React, { useState, useEffect } from 'react';
import { Play, Terminal, AlertTriangle, CheckCircle, Clock, Search, Database } from 'lucide-react';
import { getDatasets, executeQuery } from '../services/api';
import { Dataset, IndexType, QueryOperation, QueryResponse } from '../types';

export const QueryPlayground: React.FC = () => {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>('students');
  const [selectedIndexType, setSelectedIndexType] = useState<IndexType>('AVL');
  const [operation, setOperation] = useState<QueryOperation>('range');
  const [selectedField, setSelectedField] = useState<string>('cgpa');

  // Query Parameters
  const [exactValue, setExactValue] = useState<string>('8.5');
  const [lowerBound, setLowerBound] = useState<string>('8.0');
  const [upperBound, setUpperBound] = useState<string>('9.5');
  const [prefixValue, setPrefixValue] = useState<string>('STU_');

  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<QueryResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getDatasets().then(data => {
      if (data?.datasets) {
        setDatasets(data.datasets);
      }
    });
  }, []);

  const currentDataset = datasets.find(d => d.id === selectedDatasetId);

  // Auto-switch field when dataset changes
  useEffect(() => {
    if (currentDataset && currentDataset.fields.length > 0) {
      if (!currentDataset.fields.find(f => f.name === selectedField)) {
        setSelectedField(currentDataset.fields[0].name);
      }
    }
  }, [selectedDatasetId]);

  const handleRunQuery = async () => {
    setLoading(true);
    setError(null);
    try {
      const fieldDef = currentDataset?.fields.find(f => f.name === selectedField);
      const isNum = fieldDef?.type === 'number';

      const payload: any = {
        datasetId: selectedDatasetId,
        indexType: selectedIndexType,
        operation,
        field: selectedField
      };

      if (operation === 'exact') {
        payload.value = isNum ? Number(exactValue) : exactValue;
      } else if (operation === 'range') {
        payload.lowerBound = isNum ? Number(lowerBound) : lowerBound;
        payload.upperBound = isNum ? Number(upperBound) : upperBound;
      } else if (operation === 'prefix') {
        payload.prefix = prefixValue;
      }

      const res = await executeQuery(payload);
      if (res.status === 'ok') {
        setResult(res);
      } else {
        setError(res.message || 'Query execution failed');
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const isHashRange = selectedIndexType === 'Hash' && operation === 'range';

  return (
    <div className="space-y-6">
      {/* Query Header & Configuration Card */}
      <div className="bg-dark-800 border border-dark-700/80 rounded-xl p-5 shadow-sm">
        <h2 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
          <Terminal className="w-5 h-5 text-brand-cyan" />
          <span>Interactive Query Playground</span>
        </h2>
        <p className="text-xs text-slate-400 mb-5">
          Execute real exact lookups, range filters, and prefix queries directly against the C++ engine.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          {/* Dataset */}
          <div>
            <label className="block text-[11px] font-mono text-slate-400 mb-1">Dataset</label>
            <select
              value={selectedDatasetId}
              onChange={e => setSelectedDatasetId(e.target.value)}
              className="w-full bg-dark-900 border border-dark-600 rounded-lg px-3 py-2 text-xs font-mono text-slate-200"
            >
              {datasets.map(d => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.recordCount} recs)
                </option>
              ))}
            </select>
          </div>

          {/* Index Structure */}
          <div>
            <label className="block text-[11px] font-mono text-slate-400 mb-1">Index Structure</label>
            <select
              value={selectedIndexType}
              onChange={e => setSelectedIndexType(e.target.value as IndexType)}
              className="w-full bg-dark-900 border border-brand-cyan/50 rounded-lg px-3 py-2 text-xs font-mono font-bold text-brand-cyan"
            >
              <option value="LinearScan">Linear Scan (Baseline)</option>
              <option value="BST">Binary Search Tree (BST)</option>
              <option value="AVL">AVL Tree (Balanced)</option>
              <option value="Hash">Hash Index (Buckets)</option>
              <option value="BTree">B-Tree (Order 4)</option>
              <option value="BPlusTree">B+ Tree (Linked Leaves)</option>
            </select>
          </div>

          {/* Operation */}
          <div>
            <label className="block text-[11px] font-mono text-slate-400 mb-1">Operation</label>
            <select
              value={operation}
              onChange={e => setOperation(e.target.value as QueryOperation)}
              className="w-full bg-dark-900 border border-dark-600 rounded-lg px-3 py-2 text-xs font-mono text-slate-200"
            >
              <option value="exact">Exact Match (==)</option>
              <option value="range">Range Query (&gt;= and &lt;=)</option>
              <option value="prefix">Prefix Search (startsWith)</option>
            </select>
          </div>

          {/* Field */}
          <div>
            <label className="block text-[11px] font-mono text-slate-400 mb-1">Target Field</label>
            <select
              value={selectedField}
              onChange={e => setSelectedField(e.target.value)}
              className="w-full bg-dark-900 border border-dark-600 rounded-lg px-3 py-2 text-xs font-mono text-slate-200"
            >
              {currentDataset?.fields.map(f => (
                <option key={f.name} value={f.name}>
                  {f.name} ({f.type})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Dynamic Parameter Inputs */}
        <div className="bg-dark-900/60 border border-dark-700/60 rounded-lg p-3.5 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3 flex-wrap">
            {operation === 'exact' && (
              <div>
                <label className="block text-[10px] font-mono text-slate-400 mb-1">Exact Value:</label>
                <input
                  type="text"
                  value={exactValue}
                  onChange={e => setExactValue(e.target.value)}
                  placeholder="e.g. 8.5 or STU_1001"
                  className="bg-dark-800 border border-dark-600 rounded px-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-brand-cyan"
                />
              </div>
            )}

            {operation === 'range' && (
              <>
                <div>
                  <label className="block text-[10px] font-mono text-slate-400 mb-1">Lower Bound (&gt;=):</label>
                  <input
                    type="text"
                    value={lowerBound}
                    onChange={e => setLowerBound(e.target.value)}
                    placeholder="e.g. 8.0"
                    className="bg-dark-800 border border-dark-600 rounded px-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-brand-cyan"
                  />
                </div>
                <span className="text-slate-500 font-mono text-xs pt-4">to</span>
                <div>
                  <label className="block text-[10px] font-mono text-slate-400 mb-1">Upper Bound (&lt;=):</label>
                  <input
                    type="text"
                    value={upperBound}
                    onChange={e => setUpperBound(e.target.value)}
                    placeholder="e.g. 9.5"
                    className="bg-dark-800 border border-dark-600 rounded px-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-brand-cyan"
                  />
                </div>
              </>
            )}

            {operation === 'prefix' && (
              <div>
                <label className="block text-[10px] font-mono text-slate-400 mb-1">Prefix String:</label>
                <input
                  type="text"
                  value={prefixValue}
                  onChange={e => setPrefixValue(e.target.value)}
                  placeholder="e.g. STU_ or Com"
                  className="bg-dark-800 border border-dark-600 rounded px-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-brand-cyan"
                />
              </div>
            )}
          </div>

          <button
            onClick={handleRunQuery}
            disabled={loading}
            className="px-5 py-2.5 bg-brand-cyan hover:bg-brand-cyan/90 text-dark-900 font-bold text-xs rounded-lg transition-colors flex items-center gap-2 shadow-md shadow-brand-cyan/10 self-end"
          >
            <Play className="w-3.5 h-3.5 fill-dark-900" />
            <span>{loading ? 'Executing in C++...' : 'Execute Query'}</span>
          </button>
        </div>

        {/* Warning if Hash index on Range */}
        {isHashRange && (
          <div className="mt-3 flex items-start gap-2.5 bg-brand-amber/10 border border-brand-amber/30 rounded-lg p-3 text-xs text-brand-amber">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Algorithmic Trade-off Warning:</p>
              <p className="text-slate-300 mt-0.5">
                Hash tables destroy key ordering. Range queries against a Hash index cannot use bucket routing and must scan all buckets ($O(N)$). B+ Tree is strongly recommended for ordered range access!
              </p>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="p-4 bg-brand-rose/10 border border-brand-rose/30 rounded-xl text-xs text-brand-rose font-mono">
          Error: {error}
        </div>
      )}

      {/* Query Results & Telemetry */}
      {result && (
        <div className="space-y-4">
          {/* Telemetry Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-dark-800 border border-dark-700/80 rounded-xl p-4">
              <span className="text-[11px] font-mono text-slate-400 block mb-1">Matches Found</span>
              <span className="text-2xl font-bold font-mono text-white">{result.resultCount}</span>
              <span className="text-[10px] text-slate-500 block mt-1">qualifying records</span>
            </div>

            <div className="bg-dark-800 border border-dark-700/80 rounded-xl p-4">
              <span className="text-[11px] font-mono text-slate-400 block mb-1">Key Comparisons</span>
              <span className="text-2xl font-bold font-mono text-brand-amber">{result.metrics.keyComparisons}</span>
              <span className="text-[10px] text-slate-500 block mt-1">algorithmic comparisons</span>
            </div>

            <div className="bg-dark-800 border border-dark-700/80 rounded-xl p-4">
              <span className="text-[11px] font-mono text-slate-400 block mb-1">Nodes Visited</span>
              <span className="text-2xl font-bold font-mono text-brand-emerald">{result.metrics.nodesVisited}</span>
              <span className="text-[10px] text-slate-500 block mt-1">tree nodes / buckets</span>
            </div>

            <div className="bg-dark-800 border border-dark-700/80 rounded-xl p-4">
              <span className="text-[11px] font-mono text-slate-400 block mb-1">Query Latency</span>
              <span className="text-2xl font-bold font-mono text-brand-cyan">{result.metrics.elapsedMicroseconds.toFixed(2)} µs</span>
              <span className="text-[10px] text-slate-500 block mt-1">microseconds in C++</span>
            </div>
          </div>

          {/* Execution Plan Box */}
          <div className="bg-dark-800 border border-dark-700/80 rounded-xl p-4">
            <h4 className="text-xs font-mono font-bold uppercase text-slate-300 mb-2">
              Query Execution Plan Details
            </h4>
            <div className="space-y-1 font-mono text-xs text-slate-400">
              {result.executionPlan.map((step, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="text-brand-cyan">▶</span>
                  <span>{step}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Result Table */}
          <div className="bg-dark-800 border border-dark-700/80 rounded-xl overflow-hidden shadow-sm">
            <div className="p-3 bg-dark-900 border-b border-dark-700/80 flex items-center justify-between">
              <h4 className="text-xs font-mono uppercase font-bold text-slate-300">
                Matching Records ({result.records.length})
              </h4>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-dark-800 text-slate-400 border-b border-dark-700/60">
                  <tr>
                    <th className="py-2.5 px-4">Record ID</th>
                    {currentDataset?.fields.map(f => (
                      <th key={f.name} className="py-2.5 px-4">
                        {f.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-700/40">
                  {result.records.map(rec => (
                    <tr key={rec.id} className="hover:bg-dark-700/30 transition-colors">
                      <td className="py-2 px-4 font-bold text-brand-cyan">{rec.id}</td>
                      {currentDataset?.fields.map(f => (
                        <td
                          key={f.name}
                          className={`py-2 px-4 ${f.name === selectedField ? 'text-brand-amber font-bold' : 'text-slate-200'}`}
                        >
                          {String(rec.fields[f.name] ?? '')}
                        </td>
                      ))}
                    </tr>
                  ))}
                  {result.records.length === 0 && (
                    <tr>
                      <td colSpan={(currentDataset?.fields.length || 0) + 1} className="py-6 text-center text-slate-500 font-sans">
                        No records matched the criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
