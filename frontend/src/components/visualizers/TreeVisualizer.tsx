import React from 'react';
import { TreeNodeSnapshot } from '../../types';

interface TreeVisualizerProps {
  root: TreeNodeSnapshot | null;
  treeType: 'BST' | 'AVL';
  highlightKey?: string;
  activeNodeId?: number;
  activePath?: number[];
  actionType?: string;
}

export const TreeVisualizer: React.FC<TreeVisualizerProps> = ({
  root,
  treeType,
  highlightKey,
  activeNodeId,
  activePath = [],
  actionType
}) => {
  if (!root) {
    return (
      <div className="h-64 flex items-center justify-center text-slate-500 text-sm font-mono">
        Empty tree structure. Build an index or add records to inspect.
      </div>
    );
  }

  const renderNode = (
    node: TreeNodeSnapshot | null | undefined,
    x: number,
    y: number,
    offset: number
  ): React.ReactNode => {
    if (!node) return null;

    const isActive = activeNodeId === node.id;
    const isKeyMatch = highlightKey && String(node.key) === String(highlightKey);
    const isInPath = activePath.includes(node.id);

    return (
      <g key={node.id}>
        {/* Branch Lines with Dynamic Highlight */}
        {node.left && (
          <line
            x1={x}
            y1={y}
            x2={x - offset}
            y2={y + 70}
            stroke={isInPath && activePath.includes(node.left.id) ? '#06b6d4' : '#334155'}
            strokeWidth={isInPath && activePath.includes(node.left.id) ? '2.5' : '1.5'}
            className="transition-all duration-300"
          />
        )}
        {node.right && (
          <line
            x1={x}
            y1={y}
            x2={x + offset}
            y2={y + 70}
            stroke={isInPath && activePath.includes(node.right.id) ? '#06b6d4' : '#334155'}
            strokeWidth={isInPath && activePath.includes(node.right.id) ? '2.5' : '1.5'}
            className="transition-all duration-300"
          />
        )}

        {/* Node Outer Pulsing Ring if Active */}
        {isActive && (
          <circle
            cx={x}
            cy={y}
            r="28"
            className="fill-none stroke-brand-cyan/40 stroke-2 animate-ping"
          />
        )}

        {/* Node Circle */}
        <circle
          cx={x}
          cy={y}
          r="23"
          className={`transition-all duration-300 ${
            isActive
              ? 'fill-brand-cyan/30 stroke-brand-cyan stroke-2 drop-shadow-[0_0_12px_#06b6d4]'
              : isKeyMatch
              ? 'fill-brand-emerald/25 stroke-brand-emerald stroke-2'
              : isInPath
              ? 'fill-brand-blue/20 stroke-brand-blue stroke-1.5'
              : 'fill-dark-800 stroke-dark-600 hover:stroke-slate-400'
          }`}
        />

        {/* Key Label */}
        <text
          x={x}
          y={y + 4}
          textAnchor="middle"
          className={`text-xs font-mono font-bold pointer-events-none transition-colors ${
            isActive ? 'fill-brand-cyan' : isKeyMatch ? 'fill-brand-emerald' : 'fill-slate-100'
          }`}
        >
          {node.key}
        </text>

        {/* Node ID Badge */}
        <text
          x={x}
          y={y - 12}
          textAnchor="middle"
          className="text-[9px] font-mono fill-slate-400 pointer-events-none"
        >
          #{node.id}
        </text>

        {/* Balance Factor badge for AVL */}
        {treeType === 'AVL' && node.balanceFactor !== undefined && (
          <g>
            <circle
              cx={x + 20}
              cy={y - 14}
              r="8"
              className={
                Math.abs(node.balanceFactor) <= 1
                  ? 'fill-brand-emerald/20 stroke-brand-emerald stroke-1'
                  : 'fill-brand-rose/30 stroke-brand-rose stroke-1.5'
              }
            />
            <text
              x={x + 20}
              y={y - 11}
              textAnchor="middle"
              className="text-[9px] font-mono font-bold fill-slate-300"
            >
              {node.balanceFactor > 0 ? `+${node.balanceFactor}` : node.balanceFactor}
            </text>
          </g>
        )}

        {/* Record count label */}
        <text
          x={x}
          y={y + 36}
          textAnchor="middle"
          className="text-[10px] font-mono fill-slate-400"
        >
          {node.recordCount} rec{node.recordCount !== 1 ? 's' : ''}
        </text>

        {/* Recursive Children */}
        {node.left && renderNode(node.left, x - offset, y + 70, Math.max(offset / 1.8, 30))}
        {node.right && renderNode(node.right, x + offset, y + 70, Math.max(offset / 1.8, 30))}
      </g>
    );
  };

  return (
    <div className="w-full h-[400px] overflow-auto bg-dark-900/90 border border-dark-700/80 rounded-xl p-4 flex items-center justify-center relative shadow-inner">
      <svg className="min-w-[720px] min-h-[360px] w-full h-full" viewBox="0 0 820 380">
        {renderNode(root, 410, 50, 180)}
      </svg>
      {treeType === 'AVL' && (
        <div className="absolute bottom-3 left-4 text-xs text-slate-300 bg-dark-800/90 border border-dark-700 rounded-md px-3 py-1 flex items-center gap-2 font-mono">
          <span className="w-2.5 h-2.5 rounded-full bg-brand-emerald/40 border border-brand-emerald inline-block" />
          <span>AVL Balance Factor: height(left) - height(right) | Rotates if |BF| &gt; 1</span>
        </div>
      )}
    </div>
  );
};
