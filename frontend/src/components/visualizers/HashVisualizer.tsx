import React from 'react';
import { HashBucketSnapshot } from '../../types';

interface HashVisualizerProps {
  buckets: HashBucketSnapshot[];
  bucketCount: number;
  totalEntries: number;
  collisionCount: number;
  loadFactor: number;
  activeBucketIndex?: number;
  highlightKey?: string;
}

export const HashVisualizer: React.FC<HashVisualizerProps> = ({
  buckets = [],
  bucketCount,
  totalEntries,
  collisionCount,
  loadFactor,
  activeBucketIndex,
  highlightKey
}) => {
  return (
    <div className="w-full bg-dark-900/90 border border-dark-700/80 rounded-xl p-5 shadow-inner">
      {/* Metric badges */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="bg-dark-800/80 border border-dark-700/60 p-3 rounded-lg text-center">
          <span className="text-[10px] text-slate-400 block uppercase font-mono">Total Buckets</span>
          <span className="text-lg font-mono font-bold text-white">{bucketCount}</span>
        </div>
        <div className="bg-dark-800/80 border border-dark-700/60 p-3 rounded-lg text-center">
          <span className="text-[10px] text-slate-400 block uppercase font-mono">Total Keys</span>
          <span className="text-lg font-mono font-bold text-white">{totalEntries}</span>
        </div>
        <div className="bg-dark-800/80 border border-dark-700/60 p-3 rounded-lg text-center">
          <span className="text-[10px] text-slate-400 block uppercase font-mono">Collisions</span>
          <span className="text-lg font-mono font-bold text-brand-amber">{collisionCount}</span>
        </div>
        <div className="bg-dark-800/80 border border-dark-700/60 p-3 rounded-lg text-center">
          <span className="text-[10px] text-slate-400 block uppercase font-mono">Load Factor (N/M)</span>
          <span className="text-lg font-mono font-bold text-brand-cyan">{Number(loadFactor).toFixed(2)}</span>
        </div>
      </div>

      <div className="text-xs font-semibold text-slate-300 mb-3 flex items-center justify-between">
        <span>Bucket Slots & Separate Collision Chaining:</span>
        <span className="text-[11px] text-slate-400 font-mono">hash(key) % {bucketCount}</span>
      </div>

      {/* Bucket rows */}
      <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-2">
        {buckets.map(b => {
          const isBucketActive = activeBucketIndex === b.bucketIndex;

          return (
            <div
              key={b.bucketIndex}
              className={`flex items-center gap-3 rounded-lg p-2.5 transition-all duration-300 border ${
                isBucketActive
                  ? 'bg-brand-cyan/10 border-brand-cyan ring-1 ring-brand-cyan shadow-md shadow-brand-cyan/10'
                  : 'bg-dark-800/60 border-dark-700/50 hover:border-dark-600'
              }`}
            >
              {/* Bucket Slot */}
              <div
                className={`w-18 shrink-0 text-center py-1.5 px-3 rounded font-mono text-xs font-bold transition-colors ${
                  isBucketActive
                    ? 'bg-brand-cyan text-dark-900 shadow-sm'
                    : 'bg-dark-900 border border-dark-600 text-brand-cyan'
                }`}
              >
                Slot [{b.bucketIndex}]
              </div>

              {/* Chained entries */}
              <div className="flex items-center gap-2 overflow-x-auto flex-1">
                {b.entries.length === 0 ? (
                  <span className="text-xs font-mono text-slate-600 italic">Empty slot</span>
                ) : (
                  b.entries.map((entry, idx) => {
                    const isKeyMatch = highlightKey && String(entry.key) === String(highlightKey);

                    return (
                      <React.Fragment key={idx}>
                        <div
                          className={`border rounded px-3 py-1.5 text-xs font-mono flex items-center gap-2 shrink-0 transition-colors ${
                            isKeyMatch
                              ? 'bg-brand-emerald/20 border-brand-emerald text-brand-emerald font-bold'
                              : isBucketActive
                              ? 'bg-dark-700 border-brand-cyan/40 text-slate-100'
                              : 'bg-dark-700/80 border-dark-500 text-slate-200'
                          }`}
                        >
                          <span className="font-semibold">{entry.key}</span>
                          <span className="text-[10px] px-1.5 py-0.5 bg-dark-900/80 text-slate-400 rounded">
                            {entry.recordCount} rec{entry.recordCount > 1 ? 's' : ''}
                          </span>
                        </div>
                        {idx < b.entries.length - 1 && (
                          <span className="text-brand-amber font-mono text-xs shrink-0">➔</span>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
