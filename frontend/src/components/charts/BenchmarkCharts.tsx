import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid
} from 'recharts';
import { BenchmarkExperiment } from '../../types';

interface BenchmarkChartsProps {
  experiment: BenchmarkExperiment;
}

export const BenchmarkCharts: React.FC<BenchmarkChartsProps> = ({ experiment }) => {
  if (!experiment || !experiment.results || experiment.results.length === 0) {
    return (
      <div className="p-8 text-center text-slate-500 text-sm">
        No benchmark results available to chart.
      </div>
    );
  }

  const chartData = experiment.results.map(r => ({
    name: r.indexType,
    medianUs: Number(r.medianMicroseconds.toFixed(2)),
    minUs: Number(r.minMicroseconds.toFixed(2)),
    maxUs: Number(r.maxMicroseconds.toFixed(2)),
    avgComparisons: Number(r.avgComparisons.toFixed(1)),
    avgNodes: Number(r.avgNodesVisited.toFixed(1)),
    avgRecordsExamined: Number(r.avgRecordsExamined.toFixed(1)),
    memoryBytes: r.memoryEstimateBytes
  }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Latency */}
        <div className="bg-dark-800 border border-dark-700/80 rounded-xl p-4 shadow-sm">
          <h4 className="text-sm font-bold text-white mb-1 flex items-center justify-between">
            <span>Query Latency (Median & Range)</span>
            <span className="text-xs font-mono text-brand-cyan">Microseconds (µs)</span>
          </h4>
          <p className="text-xs text-slate-400 mb-4">Lower is faster.</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 11 }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#f8fafc', fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
                <Bar dataKey="medianUs" name="Median (µs)" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                <Bar dataKey="maxUs" name="Max (µs)" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Key Comparisons */}
        <div className="bg-dark-800 border border-dark-700/80 rounded-xl p-4 shadow-sm">
          <h4 className="text-sm font-bold text-white mb-1 flex items-center justify-between">
            <span>Algorithmic Key Comparisons</span>
            <span className="text-xs font-mono text-brand-amber">Total Ops</span>
          </h4>
          <p className="text-xs text-slate-400 mb-4">Deterministic algorithmic work performed per query.</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 11 }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#f8fafc', fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
                <Bar dataKey="avgComparisons" name="Key Comparisons" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                <Bar dataKey="avgNodes" name="Nodes Visited" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Summary Table */}
      <div className="bg-dark-800 border border-dark-700/80 rounded-xl overflow-hidden">
        <div className="p-3 bg-dark-900 border-b border-dark-700/80">
          <h4 className="text-xs font-bold font-mono uppercase text-slate-300">
            Benchmark Metrics Matrix ({experiment.recordCount} records, {experiment.iterations} iterations)
          </h4>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-dark-800/80 text-slate-400 border-b border-dark-700/60">
              <tr>
                <th className="py-2.5 px-4">Index Structure</th>
                <th className="py-2.5 px-4">Median Latency</th>
                <th className="py-2.5 px-4">Min / Max Latency</th>
                <th className="py-2.5 px-4">Avg Key Comparisons</th>
                <th className="py-2.5 px-4">Avg Nodes Visited</th>
                <th className="py-2.5 px-4">Memory Footprint</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-700/40">
              {experiment.results.map(r => (
                <tr key={r.indexType} className="hover:bg-dark-700/30 transition-colors">
                  <td className="py-2.5 px-4 font-bold text-brand-cyan">{r.indexType}</td>
                  <td className="py-2.5 px-4 text-white font-bold">{r.medianMicroseconds.toFixed(2)} µs</td>
                  <td className="py-2.5 px-4 text-slate-400">
                    {r.minMicroseconds.toFixed(2)} / {r.maxMicroseconds.toFixed(2)} µs
                  </td>
                  <td className="py-2.5 px-4 text-brand-amber font-semibold">{r.avgComparisons.toFixed(1)}</td>
                  <td className="py-2.5 px-4 text-brand-emerald">{r.avgNodesVisited.toFixed(1)}</td>
                  <td className="py-2.5 px-4 text-slate-400">{r.memoryEstimateBytes} bytes</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
