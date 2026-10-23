import React from 'react';
import { MultiKeyNodeSnapshot } from '../../types';

interface BTreeVisualizerProps {
  root: MultiKeyNodeSnapshot | null;
  treeType: 'BTree' | 'BPlusTree';
  order?: number;
  leafChain?: { nodeId: number; keys: string[]; nextLeafId: number }[];
  activeNodeId?: number;
  activeKey?: string;
  highlightKey?: string;
}

export const BTreeVisualizer: React.FC<BTreeVisualizerProps> = ({
  root,
  treeType,
  order = 4,
  leafChain,
  activeNodeId,
  activeKey,
  highlightKey
}) => {
  if (!root) {
    return (
      <div className="h-64 flex items-center justify-center text-slate-500 text-sm font-mono">
        Empty tree structure. Build an index or add records to inspect.
      </div>
    );
  }

  // Flatten nodes by level
  const levels: MultiKeyNodeSnapshot[][] = [];
  const traverse = (node: MultiKeyNodeSnapshot, depth = 0) => {
    if (!levels[depth]) levels[depth] = [];
    levels[depth].push(node);
    if (node.children) {
      node.children.forEach(c => traverse(c, depth + 1));
    }
  };
  traverse(root, 0);

  return (
    <div className="w-full bg-dark-900/90 border border-dark-700/80 rounded-xl p-5 overflow-auto shadow-inner">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-dark-800">
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono px-2.5 py-1 bg-brand-blue/15 text-brand-blue font-bold rounded border border-brand-blue/30">
            {treeType} (Order M = {order})
          </span>
          <span className="text-xs text-slate-400 font-mono">
            Max keys/node: {order - 1} | Max child pointers: {order}
          </span>
        </div>
        {treeType === 'BPlusTree' && (
          <span className="text-xs text-brand-cyan bg-brand-cyan/10 border border-brand-cyan/30 px-2.5 py-1 rounded flex items-center gap-1.5 font-mono">
            <span className="w-2 h-2 rounded-full bg-brand-cyan animate-pulse" />
            Leaves are linked for O(log n + k) range scans
          </span>
        )}
      </div>

      <div className="space-y-8 min-w-[680px] py-4">
        {levels.map((levelNodes, levelIdx) => (
          <div key={levelIdx} className="relative">
            <div className="text-[11px] font-mono text-slate-500 mb-2">
              Level {levelIdx} {levelIdx === 0 ? '(Root)' : levelNodes[0]?.isLeaf ? '(Leaves)' : '(Internal Routers)'}
            </div>
            <div className="flex items-center justify-around gap-4 flex-wrap">
              {levelNodes.map(node => {
                const isActive = activeNodeId === node.id;
                return (
                  <div
                    key={node.id}
                    className={`flex flex-col rounded-lg border transition-all duration-300 shadow-md ${
                      isActive
                        ? 'bg-dark-800 border-brand-cyan ring-2 ring-brand-cyan/40 shadow-lg shadow-brand-cyan/20 scale-105'
                        : node.isLeaf
                        ? 'bg-dark-800/90 border-brand-cyan/40 hover:border-brand-cyan'
                        : 'bg-dark-700/60 border-dark-600 hover:border-slate-500'
                    }`}
                  >
                    <div
                      className={`text-[10px] font-mono px-2.5 py-0.5 border-b flex items-center justify-between ${
                        isActive
                          ? 'bg-brand-cyan/20 text-brand-cyan border-brand-cyan/40 font-bold'
                          : 'text-slate-400 border-dark-700/60'
                      }`}
                    >
                      <span>Node #{node.id}</span>
                      <span>{node.isLeaf ? 'LEAF' : 'ROUTER'}</span>
                    </div>
                    <div className="flex items-center divide-x divide-dark-600 p-1">
                      {node.keys.map((k, kIdx) => {
                        const isSlotActive = isActive && activeKey && String(k) === String(activeKey);
                        const isMatch = highlightKey && String(k) === String(highlightKey);

                        return (
                          <div
                            key={kIdx}
                            className={`px-3 py-1.5 text-xs font-mono font-bold transition-colors ${
                              isSlotActive
                                ? 'bg-brand-amber/30 text-brand-amber'
                                : isMatch
                                ? 'bg-brand-emerald/30 text-brand-emerald'
                                : 'bg-dark-900/70 text-slate-200'
                            }`}
                          >
                            {k}
                          </div>
                        );
                      })}
                      {node.keys.length === 0 && (
                        <div className="px-3 py-1 text-xs font-mono text-slate-500 italic">Empty</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {/* B+ Tree Sequential Leaf Chain Indicator */}
        {treeType === 'BPlusTree' && leafChain && leafChain.length > 0 && (
          <div className="mt-6 pt-4 border-t border-dark-800">
            <div className="text-xs font-semibold text-slate-300 mb-2 flex items-center gap-2">
              <span className="text-brand-cyan">➜</span> Linked Leaf Node Sequence (Sequential Sibling Pointers):
            </div>
            <div className="flex items-center gap-2 overflow-x-auto pb-2">
              {leafChain.map((leaf, idx) => {
                const isLeafActive = activeNodeId === leaf.nodeId;
                return (
                  <React.Fragment key={leaf.nodeId}>
                    <div
                      className={`rounded px-3 py-1.5 shrink-0 text-center border transition-all ${
                        isLeafActive
                          ? 'bg-brand-cyan/20 border-brand-cyan ring-1 ring-brand-cyan text-brand-cyan'
                          : 'bg-dark-800 border-brand-cyan/30 text-slate-200'
                      }`}
                    >
                      <span className="text-[10px] text-brand-cyan font-mono block">Leaf #{leaf.nodeId}</span>
                      <span className="text-xs font-mono font-bold">
                        [{leaf.keys.join(', ')}]
                      </span>
                    </div>
                    {idx < leafChain.length - 1 && (
                      <span className={`font-mono text-sm shrink-0 transition-colors ${isLeafActive ? 'text-brand-cyan animate-pulse' : 'text-slate-600'}`}>
                        ──▶
                      </span>
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
