import React, { useState, useEffect } from 'react';
import { BarChart3, Play, Sliders, CheckSquare, Square, RefreshCw, Zap, Download, FileText } from 'lucide-react';
import { BenchmarkCharts } from '../components/charts/BenchmarkCharts';
import { useToast } from '../components/ui';
import { getDatasets, runBenchmark } from '../services/api';
import { Dataset, IndexType, BenchmarkExperiment } from '../types';

export const BenchmarkLab: React.FC = () => {
  const toast = useToast();
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>('students');
  const [selectedField, setSelectedField] = useState<string>('cgpa');
  const [iterations, setIterations] = useState<number>(5);

  const allIndexes: IndexType[] = ['LinearScan', 'BST', 'AVL', 'Hash', 'BTree', 'BPlusTree'];
  const [selectedIndexes, setSelectedIndexes] = useState<IndexType[]>([...allIndexes]);

  const [workloadType, setWorkloadType] = useState<'mixed' | 'exactOnly' | 'rangeOnly'>('mixed');
  const [loading, setLoading] = useState<boolean>(false);
  const [experiment, setExperiment] = useState<BenchmarkExperiment | null>(null);

  useEffect(() => {
    getDatasets().then(data => {
      if (data?.datasets) {
        setDatasets(data.datasets);
      }
    });
  }, []);

  const currentDataset = datasets.find(d => d.id === selectedDatasetId);

  const toggleIndex = (type: IndexType) => {
    if (selectedIndexes.includes(type)) {
      if (selectedIndexes.length > 1) {
        setSelectedIndexes(selectedIndexes.filter(t => t !== type));
      } else {
        toast('info', 'At least one index structure must remain selected.');
      }
    } else {
      setSelectedIndexes([...selectedIndexes, type]);
    }
  };

  const handleRunBenchmark = async () => {
    if (selectedIndexes.length === 0) return;
    setLoading(true);

    try {
      let queries: any[] = [];
      if (workloadType === 'exactOnly') {
        queries = [
          { operation: 'exact', value: 8.5 },
          { operation: 'exact', value: 7.2 },
          { operation: 'exact', value: 9.1 }
        ];
      } else if (workloadType === 'rangeOnly') {
        queries = [
          { operation: 'range', lowerBound: 7.5, upperBound: 8.5 },
          { operation: 'range', lowerBound: 8.0, upperBound: 9.5 }
        ];
      } else {
        queries = [
          { operation: 'exact', value: 8.5 },
          { operation: 'range', lowerBound: 7.5, upperBound: 9.0 },
          { operation: 'exact', value: 9.2 }
        ];
      }

      const res = await runBenchmark({
        datasetId: selectedDatasetId,
        field: selectedField,
        indexTypes: selectedIndexes,
        queries,
        iterations: Number(iterations)
      });

      if (res?.experiment) {
        setExperiment(res.experiment);
        toast('success', `Benchmark finished (${iterations} iterations). Metrics persisted to history.`);
      }
    } catch (err) {
      toast('error', 'Benchmark failed: ' + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCsv = () => {
    if (!experiment || !experiment.results) return;
    const headers = 'IndexType,MedianUs,MinUs,MaxUs,AvgComparisons,AvgNodesVisited,AvgRecordsExamined,MemoryBytes';
    const rows = experiment.results.map(r =>
      `${r.indexType},${r.medianMicroseconds},${r.minMicroseconds},${r.maxMicroseconds},${r.avgComparisons},${r.avgNodesVisited},${r.avgRecordsExamined},${r.memoryEstimateBytes}`
    );
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `benchmark_${experiment.id}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast('info', 'Exported benchmark metrics to CSV.');
  };

  const handleExportJson = () => {
    if (!experiment) return;
    const jsonStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(experiment, null, 2));
    const link = document.createElement('a');
    link.setAttribute('href', jsonStr);
    link.setAttribute('download', `benchmark_${experiment.id}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast('info', 'Exported benchmark experiment to JSON.');
  };

  return (
    <div className="space-y-6">
      {/* Configuration Box */}
      <div className="bg-dark-800/90 border border-dark-700/80 rounded-2xl p-5 shadow-lg backdrop-blur-md">
        <h2 className="text-xl font-bold text-white mb-1 flex items-center gap-2.5">
          <BarChart3 className="w-5 h-5 text-brand-cyan" />
          <span>Comparative Benchmark Lab</span>
        </h2>
        <p className="text-xs text-slate-400 mb-5">
          Execute head-to-head workloads across multiple index implementations on identical datasets, reporting median latency and deterministic operation counters.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          {/* Dataset */}
          <div>
            <label className="block text-[11px] font-mono text-slate-400 mb-1">Dataset</label>
            <select
              value={selectedDatasetId}
              onChange={e => setSelectedDatasetId(e.target.value)}
              className="w-full bg-dark-900 border border-dark-600 rounded-xl px-3 py-2 text-xs font-mono text-slate-200"
            >
              {datasets.map(d => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.recordCount} recs)
                </option>
              ))}
            </select>
          </div>

          {/* Field */}
          <div>
            <label className="block text-[11px] font-mono text-slate-400 mb-1">Benchmark Field</label>
            <select
              value={selectedField}
              onChange={e => setSelectedField(e.target.value)}
              className="w-full bg-dark-900 border border-dark-600 rounded-xl px-3 py-2 text-xs font-mono text-slate-200"
            >
              {currentDataset?.fields.map(f => (
                <option key={f.name} value={f.name}>
                  {f.name} ({f.type})
                </option>
              ))}
            </select>
          </div>

          {/* Workload Profile */}
          <div>
            <label className="block text-[11px] font-mono text-slate-400 mb-1">Workload Profile</label>
            <select
              value={workloadType}
              onChange={e => setWorkloadType(e.target.value as any)}
              className="w-full bg-dark-900 border border-dark-600 rounded-xl px-3 py-2 text-xs font-mono text-slate-200"
            >
              <option value="mixed">Mixed (Exact + Range Lookups)</option>
              <option value="exactOnly">Point Lookups Only (Exact Match)</option>
              <option value="rangeOnly">Range Queries Only (Bound Scans)</option>
            </select>
          </div>

          {/* Iterations */}
          <div>
            <label className="block text-[11px] font-mono text-slate-400 mb-1">Iterations (Median Filter)</label>
            <select
              value={iterations}
              onChange={e => setIterations(Number(e.target.value))}
              className="w-full bg-dark-900 border border-dark-600 rounded-xl px-3 py-2 text-xs font-mono text-slate-200"
            >
              <option value={3}>3 Runs (Quick Test)</option>
              <option value={5}>5 Runs (Standard Median)</option>
              <option value={10}>10 Runs (High Precision)</option>
            </select>
          </div>
        </div>

        {/* Index Structure Checkboxes */}
        <div className="bg-dark-900/60 border border-dark-700/60 rounded-xl p-3.5 mb-5">
          <span className="text-[10px] font-mono uppercase text-slate-400 block mb-2.5">
            Select Index Implementations to Compare:
          </span>
          <div className="flex items-center gap-3 flex-wrap">
            {allIndexes.map(type => {
              const isSelected = selectedIndexes.includes(type);
              return (
                <button
                  key={type}
                  onClick={() => toggleIndex(type)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-mono border transition-all ${
                    isSelected
                      ? 'bg-brand-cyan/20 text-brand-cyan border-brand-cyan/50 font-bold shadow-sm'
                      : 'bg-dark-800 text-slate-400 border-dark-700 hover:text-slate-200'
                  }`}
                >
                  {isSelected ? <CheckSquare className="w-4 h-4 text-brand-cyan" /> : <Square className="w-4 h-4" />}
                  <span>{type}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Action Button & Export Strip */}
        <div className="flex items-center justify-between gap-4 flex-wrap pt-2">
          <div className="flex items-center gap-2">
            {experiment && (
              <>
                <button
                  onClick={handleExportCsv}
                  className="px-3.5 py-2 bg-dark-700 hover:bg-dark-600 text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-dark-600 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export CSV</span>
                </button>
                <button
                  onClick={handleExportJson}
                  className="px-3.5 py-2 bg-dark-700 hover:bg-dark-600 text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-dark-600 transition-colors"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Export JSON</span>
                </button>
              </>
            )}
          </div>

          <button
            onClick={handleRunBenchmark}
            disabled={loading}
            className="px-6 py-2.5 bg-gradient-to-r from-brand-cyan to-brand-blue hover:from-brand-cyan/90 hover:to-brand-blue/90 text-dark-900 font-bold text-xs rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-brand-cyan/15"
          >
            <Zap className={`w-4 h-4 fill-dark-900 ${loading ? 'animate-spin' : ''}`} />
            <span>{loading ? 'Executing Native C++ Benchmark...' : 'Run Comparative Benchmark'}</span>
          </button>
        </div>
      </div>

      {/* Results and Visual Charts */}
      {experiment && (
        <div className="space-y-4">
          <BenchmarkCharts experiment={experiment} />
        </div>
      )}
    </div>
  );
};
