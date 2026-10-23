import React, { useEffect, useState } from 'react';
import {
  LayoutDashboard,
  Code2,
  Database,
  GitBranch,
  Search,
  BarChart3,
  Layers,
  FileText,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Cpu,
  Server
} from 'lucide-react';
import { PageId } from '../../types';
import { getHealth } from '../../services/api';

interface SidebarProps {
  currentPage: PageId;
  onSelectPage: (page: PageId) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentPage,
  onSelectPage,
  collapsed,
  onToggleCollapse
}) => {
  const [mysqlConnected, setMysqlConnected] = useState<boolean>(true);
  const [engineRunning, setEngineRunning] = useState<boolean>(true);
  const [apiOnline, setApiOnline] = useState<boolean>(true);

  useEffect(() => {
    const check = async () => {
      try {
        const h = await getHealth();
        setMysqlConnected(h?.mysql?.status === 'connected');
        setEngineRunning(h?.engine?.status === 'running' || h?.engine?.status === 'online');
        setApiOnline(h?.api?.status === 'online' || h?.status === 'ok');
      } catch {
        setMysqlConnected(false);
        setEngineRunning(false);
        setApiOnline(false);
      }
    };
    check();
    const interval = setInterval(check, 8000);
    return () => clearInterval(interval);
  }, []);

  const navItems = [
    { id: 'dashboard' as PageId, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'workspace' as PageId, label: 'SQL Workspace', icon: Code2 },
    { id: 'database' as PageId, label: 'Database Explorer', icon: Database },
    { id: 'visualization' as PageId, label: 'Index Visualization', icon: GitBranch },
    { id: 'analysis' as PageId, label: 'Query Analysis', icon: Search },
    { id: 'performance' as PageId, label: 'Performance Lab', icon: BarChart3 },
    { id: 'indexes' as PageId, label: 'Index Manager', icon: Layers },
    { id: 'saved' as PageId, label: 'Saved Queries', icon: FileText },
    { id: 'documentation' as PageId, label: 'Documentation', icon: BookOpen }
  ];

  return (
    <aside
      className={`h-[calc(100vh-4rem)] bg-dark-900/95 border-r border-dark-700/80 transition-all duration-300 flex flex-col justify-between select-none z-30 ${
        collapsed ? 'w-16' : 'w-60'
      }`}
    >
      {/* Navigation Links */}
      <div className="p-3 space-y-1 overflow-y-auto">
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectPage(item.id)}
              title={collapsed ? item.label : undefined}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                isActive
                  ? 'bg-gradient-to-r from-brand-cyan/20 to-brand-blue/20 text-brand-cyan border border-brand-cyan/40 shadow-sm shadow-brand-cyan/10'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-dark-800/80'
              }`}
            >
              <Icon
                className={`w-4 h-4 shrink-0 transition-colors ${
                  isActive ? 'text-brand-cyan' : 'text-slate-400 group-hover:text-slate-200'
                }`}
              />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </button>
          );
        })}
      </div>

      {/* Bottom Section: System Status & Collapse Toggle */}
      <div className="p-3 border-t border-dark-700/70 space-y-3 bg-dark-950/40">
        {!collapsed && (
          <div className="bg-dark-900/90 border border-dark-700/60 rounded-xl p-3 space-y-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold block mb-1">
              System Status
            </span>

            {/* MySQL Status */}
            <div className="flex items-center justify-between text-[11px] font-sans">
              <span className="text-slate-300 flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-brand-cyan" />
                <span>MySQL Database</span>
              </span>
              <span
                className={`inline-flex items-center gap-1 text-[10px] font-medium ${
                  mysqlConnected ? 'text-brand-emerald' : 'text-brand-rose'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    mysqlConnected ? 'bg-brand-emerald animate-pulse' : 'bg-brand-rose'
                  }`}
                />
                {mysqlConnected ? 'Connected' : 'Offline'}
              </span>
            </div>

            {/* C++ Engine Status */}
            <div className="flex items-center justify-between text-[11px] font-sans">
              <span className="text-slate-300 flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-brand-blue" />
                <span>C++ Engine</span>
              </span>
              <span
                className={`inline-flex items-center gap-1 text-[10px] font-medium ${
                  engineRunning ? 'text-brand-emerald' : 'text-brand-rose'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    engineRunning ? 'bg-brand-emerald animate-pulse' : 'bg-brand-rose'
                  }`}
                />
                {engineRunning ? 'Running' : 'Stopped'}
              </span>
            </div>

            {/* API Server Status */}
            <div className="flex items-center justify-between text-[11px] font-sans">
              <span className="text-slate-300 flex items-center gap-1.5">
                <Server className="w-3.5 h-3.5 text-indigo-400" />
                <span>API Server</span>
              </span>
              <span
                className={`inline-flex items-center gap-1 text-[10px] font-medium ${
                  apiOnline ? 'text-brand-emerald' : 'text-brand-rose'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    apiOnline ? 'bg-brand-emerald animate-pulse' : 'bg-brand-rose'
                  }`}
                />
                {apiOnline ? 'Online' : 'Offline'}
              </span>
            </div>
          </div>
        )}

        {/* Collapse Button */}
        <button
          onClick={onToggleCollapse}
          className="w-full flex items-center justify-center gap-2 py-2 text-xs text-slate-400 hover:text-slate-200 hover:bg-dark-800 rounded-lg transition-colors cursor-pointer"
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <>
              <ChevronLeft className="w-4 h-4" />
              <span className="text-[11px] font-medium">Collapse Sidebar</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
};
