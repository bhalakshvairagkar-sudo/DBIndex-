import React from 'react';

interface LinearVisualizerProps {
  count: number;
  items: { key: string; recordId: string }[];
  truncated?: boolean;
  activeRecordId?: string;
  activeKey?: string;
  highlightKey?: string;
}

export const LinearVisualizer: React.FC<LinearVisualizerProps> = ({
  count,
  items = [],
  truncated,
  activeRecordId,
  activeKey,
  highlightKey
}) => {
  return (
    <div className="w-full bg-dark-900/90 border border-dark-700/80 rounded-xl p-5 shadow-inner">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h4 className="text-sm font-bold text-white flex items-center gap-2">
            <span>Flat Sequential Scan (No Index Overhead)</span>
          </h4>
          <p className="text-xs text-slate-400 mt-0.5">
            Database tuples stored in flat insertion sequence. Lookup tests record by record from slot 0 to N-1.
          </p>
        </div>
        <span className="text-xs font-mono px-3 py-1 bg-brand-rose/10 text-brand-rose border border-brand-rose/30 rounded font-semibold">
          Time: O(N) | Space Overhead: 0 bytes
        </span>
      </div>

      <div className="flex items-center gap-2 flex-wrap max-h-80 overflow-y-auto p-3 bg-dark-800/40 rounded-lg border border-dark-700/50">
        {items.map((item, idx) => {
          const isActive = (activeRecordId && item.recordId === activeRecordId) || (activeKey && item.key === activeKey);
          const isMatch = highlightKey && item.key === highlightKey;

          return (
            <div
              key={idx}
              className={`rounded p-2 text-center text-xs font-mono min-w-[76px] transition-all duration-200 border ${
                isActive
                  ? 'bg-brand-cyan/20 border-brand-cyan ring-2 ring-brand-cyan/50 text-white scale-105 shadow-md shadow-brand-cyan/20'
                  : isMatch
                  ? 'bg-brand-emerald/20 border-brand-emerald text-brand-emerald font-bold'
                  : 'bg-dark-800 border-dark-600 text-slate-300'
              }`}
            >
              <div className="flex items-center justify-between text-[10px] text-slate-400 border-b border-dark-700/60 pb-0.5 mb-1">
                <span>#{idx}</span>
                {isActive && <span className="text-brand-cyan text-[9px] font-bold">SCAN</span>}
              </div>
              <span className="text-brand-cyan font-bold block text-sm">{item.key}</span>
              <span className="text-[9px] text-slate-400 block truncate max-w-[70px] mt-0.5">
                {item.recordId}
              </span>
            </div>
          );
        })}
        {truncated && (
          <div className="p-3 text-xs font-mono text-slate-500 italic">
            + {count - items.length} more records in database...
          </div>
        )}
      </div>
    </div>
  );
};
