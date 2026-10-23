import React, { useState, useEffect } from 'react';
import { Search, Database, Table, Layers, Code2, BookOpen, BarChart3, X } from 'lucide-react';
import { PageId } from '../../types';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (page: PageId) => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({ isOpen, onClose, onNavigate }) => {
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else onNavigate('workspace'); // Or toggle
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  if (!isOpen) return null;

  const searchItems = [
    { title: 'students table', cat: 'Tables', page: 'database' as PageId, icon: Table },
    { title: 'courses table', cat: 'Tables', page: 'database' as PageId, icon: Table },
    { title: 'idx_department index', cat: 'Indexes', page: 'indexes' as PageId, icon: Layers },
    { title: 'idx_cgpa index', cat: 'Indexes', page: 'indexes' as PageId, icon: Layers },
    { title: 'Get Students by Department query', cat: 'Queries', page: 'saved' as PageId, icon: Code2 },
    { title: 'B+ Tree Visualization', cat: 'Visualizer', page: 'visualization' as PageId, icon: Layers },
    { title: 'Before vs After Performance Lab', cat: 'Benchmarks', page: 'performance' as PageId, icon: BarChart3 },
    { title: 'EXPLAIN Query Analysis', cat: 'Tools', page: 'analysis' as PageId, icon: Search },
    { title: 'Documentation & Architecture', cat: 'Docs', page: 'documentation' as PageId, icon: BookOpen }
  ];

  const filtered = searchItems.filter(item =>
    item.title.toLowerCase().includes(query.toLowerCase()) ||
    item.cat.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-start justify-center pt-20 p-4">
      <div className="bg-dark-800 border border-dark-600 rounded-2xl max-w-xl w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="p-3.5 border-b border-dark-700 flex items-center gap-3 bg-dark-900/90">
          <Search className="w-4 h-4 text-brand-cyan" />
          <input
            type="text"
            autoFocus
            placeholder="Search tables, queries, indexes, or features..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="w-full bg-transparent text-sm font-sans text-white focus:outline-none placeholder:text-slate-500"
          />
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-2 max-h-80 overflow-y-auto space-y-1">
          {filtered.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                onClick={() => {
                  onNavigate(item.page);
                  onClose();
                }}
                className="flex items-center justify-between p-2.5 rounded-xl hover:bg-dark-700/60 cursor-pointer transition-colors text-xs font-mono group"
              >
                <div className="flex items-center gap-2.5">
                  <Icon className="w-4 h-4 text-slate-400 group-hover:text-brand-cyan" />
                  <span className="text-slate-200 group-hover:text-white font-medium">{item.title}</span>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded bg-dark-900 text-slate-400 border border-dark-700">
                  {item.cat}
                </span>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div className="p-6 text-center text-xs text-slate-500 font-sans">
              No matching tables, queries, or features found.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
