import React, { useEffect, useState } from 'react';
import { History, Eye, Calendar, Database, Clock } from 'lucide-react';
import { BenchmarkCharts } from '../components/charts/BenchmarkCharts';
import { getBenchmarks, getBenchmark } from '../services/api';
import { BenchmarkExperiment } from '../types';

export const ExperimentHistory: React.FC = () => {
  const [history, setHistory] = useState<BenchmarkExperiment[]>([]);
  const [selectedExperiment, setSelectedExperiment] = useState<BenchmarkExperiment | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await getBenchmarks();
        if (data?.benchmarks) {
          setHistory(data.benchmarks);
          if (data.benchmarks.length > 0) {
            setSelectedExperiment(data.benchmarks[0]);
          }
        }
      } catch (err) {
        console.error('Failed to load benchmark history:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-dark-800 border border-dark-700/80 rounded-xl p-5 shadow-sm">
        <h2 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
          <History className="w-5 h-5 text-brand-cyan" />
          <span>Experiment History & Saved Benchmarks</span>
        </h2>
        <p className="text-xs text-slate-400">
          Inspect and reload persisted benchmark runs with timestamped performance records.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* History List */}
        <div className="bg-dark-800 border border-dark-700/80 rounded-xl p-4 space-y-3 h-[600px] overflow-y-auto">
          <h3 className="text-xs font-mono uppercase font-bold text-slate-400 mb-2">
            Persisted Experiments ({history.length})
          </h3>
          {history.map(exp => {
            const isSelected = selectedExperiment?.id === exp.id;
            const dateStr = new Date(exp.timestamp).toLocaleString();
            return (
              <div
                key={exp.id}
                onClick={() => setSelectedExperiment(exp)}
                className={`p-3.5 rounded-lg border cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-brand-cyan/10 border-brand-cyan/40 shadow-sm'
                    : 'bg-dark-900/60 border-dark-700 hover:border-dark-500'
                }`}
              >
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-mono font-bold text-white">ID: #{exp.id}</span>
                  <span className="text-[10px] text-slate-400 font-mono">{dateStr}</span>
                </div>
                <div className="text-xs text-slate-300 font-medium">{exp.datasetName}</div>
                <div className="text-[11px] font-mono text-slate-400 mt-1 flex items-center gap-3">
                  <span>Field: {exp.field}</span>
                  <span>•</span>
                  <span>{exp.recordCount} recs</span>
                  <span>•</span>
                  <span>{exp.iterations} iters</span>
                </div>
              </div>
            );
          })}
          {history.length === 0 && !loading && (
            <div className="py-12 text-center text-xs text-slate-500">
              No experiment runs recorded yet. Run a benchmark in Benchmark Lab to save runs.
            </div>
          )}
        </div>

        {/* Experiment Detail / Visualizer */}
        <div className="lg:col-span-2 space-y-4">
          {selectedExperiment ? (
            <div className="space-y-4">
              <div className="bg-dark-800 border border-dark-700/80 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-white">
                    Experiment #{selectedExperiment.id} Details
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Dataset: {selectedExperiment.datasetName} | Field: {selectedExperiment.field} | {selectedExperiment.recordCount} records
                  </p>
                </div>
                <span className="text-xs font-mono px-2.5 py-1 bg-dark-900 border border-dark-700 rounded text-brand-cyan">
                  {selectedExperiment.iterations} Iterations
                </span>
              </div>
              <BenchmarkCharts experiment={selectedExperiment} />
            </div>
          ) : (
            <div className="bg-dark-800 border border-dark-700 rounded-xl p-12 text-center text-slate-500 text-sm">
              Select an experiment on the left to inspect metrics and charts.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
