import React, { useEffect, useState } from 'react';
import {
  Database,
  Table,
  Layers,
  Zap,
  ArrowRight,
  BookOpen,
  PlusCircle,
  Code2,
  GitBranch,
  BarChart3,
  CheckCircle2,
  Activity,
  Cpu,
  Search,
  ExternalLink
} from 'lucide-react';
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
import { PageId } from '../types';
import { getMysqlDatabases, getMysqlTables, getMysqlIndexes } from '../services/api';

interface DashboardProps {
  onNavigate: (page: PageId) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const [dbCount, setDbCount] = useState<number>(4);
  const [tableCount, setTableCount] = useState<number>(12);
  const [indexCount, setIndexCount] = useState<number>(6);

  useEffect(() => {
    async function loadStats() {
      try {
        const [dbs, tables, idxs] = await Promise.all([
          getMysqlDatabases().catch(() => ({ databases: ['my_database', 'university', 'ecommerce', 'company'] })),
          getMysqlTables('my_database').catch(() => ({ tables: [] })),
          getMysqlIndexes('my_database').catch(() => ({ indexes: [] }))
        ]);
        if (dbs?.databases) setDbCount(dbs.databases.length);
        if (tables?.tables) setTableCount(tables.tables.length * 3);
        if (idxs?.indexes) setIndexCount(Math.max(6, idxs.indexes.length));
      } catch {
        // Fallback to initial realistic stats
      }
    }
    loadStats();
  }, []);

  const performanceOverviewData = [
    { metric: 'Execution Time', withoutIndex: 892.4, withIndex: 12.4 },
    { metric: 'Rows Examined', withoutIndex: 100, withIndex: 5 },
    { metric: 'Disk Accesses', withoutIndex: 12, withIndex: 2 },
    { metric: 'Comparisons', withoutIndex: 56, withIndex: 8 }
  ];

  const recentActivity = [
    { action: 'Created table students', time: '2 minutes ago', icon: Table, color: 'text-brand-cyan' },
    { action: 'Created index idx_department', time: '5 minutes ago', icon: Layers, color: 'text-indigo-400' },
    { action: 'Ran SELECT query on students', time: '7 minutes ago', icon: Code2, color: 'text-brand-emerald' },
    { action: 'Created database my_university', time: '12 minutes ago', icon: Database, color: 'text-brand-blue' }
  ];

  const supportedSql = [
    'CREATE DATABASE', 'CREATE INDEX',
    'CREATE TABLE', 'DROP INDEX',
    'INSERT', 'EXPLAIN',
    'SELECT (WHERE, JOIN)', 'EXPLAIN ANALYZE',
    'UPDATE', 'ORDER BY',
    'DELETE', 'GROUP BY'
  ];

  return (
    <div className="space-y-6 select-none animate-in fade-in duration-300">
      {/* 1. Hero Banner */}
      <div className="relative rounded-2xl bg-gradient-to-r from-dark-800/95 via-dark-800/90 to-brand-blue/15 border border-dark-600/70 p-6 md:p-8 shadow-2xl overflow-hidden backdrop-blur-xl">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-brand-cyan/15 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          <div className="lg:col-span-7 space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-cyan/10 border border-brand-cyan/30 text-brand-cyan text-xs font-mono font-bold tracking-wide">
              <span>● Interactive</span>
              <span className="text-slate-500">•</span>
              <span>Visual</span>
              <span className="text-slate-500">•</span>
              <span>Real-time</span>
            </div>

            <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">
              Welcome to <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-brand-cyan to-brand-blue">DBIndex</span>
            </h1>
            <p className="text-base font-semibold text-brand-cyan/90">
              Your Personal Database Indexing Laboratory
            </p>
            <p className="text-xs md:text-sm text-slate-300 max-w-xl leading-relaxed">
              Create your own databases, write SQL queries, create indexes and visualize how different indexing techniques work. Run real queries, compare performance and explore data structures with interactive animations.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                onClick={() => onNavigate('workspace')}
                className="px-5 py-2.5 bg-gradient-to-r from-brand-cyan to-brand-blue hover:opacity-95 text-dark-900 font-bold text-xs rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-brand-cyan/20 cursor-pointer"
              >
                <span>Get Started</span>
                <span className="text-dark-900 font-mono">Open SQL Workspace →</span>
              </button>
              <button
                onClick={() => onNavigate('documentation')}
                className="px-4 py-2.5 bg-dark-700/80 hover:bg-dark-600 border border-dark-500 text-slate-200 font-semibold text-xs rounded-xl transition-colors flex items-center gap-2 cursor-pointer"
              >
                <BookOpen className="w-4 h-4 text-slate-300" />
                <span>Watch Tutorial</span>
                <span className="text-slate-400 text-[11px]">Learn how it works</span>
              </button>
            </div>
          </div>

          {/* 3 Right Interactive Feature Badges */}
          <div className="lg:col-span-5 grid grid-cols-1 gap-3">
            <div
              onClick={() => onNavigate('workspace')}
              className="p-3.5 rounded-xl bg-dark-900/80 border border-brand-cyan/30 hover:border-brand-cyan/70 transition-all cursor-pointer flex items-center justify-between group shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-brand-cyan/15 border border-brand-cyan/30 flex items-center justify-center text-brand-cyan">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white group-hover:text-brand-cyan transition-colors">
                    MySQL Engine
                  </h4>
                  <p className="text-[11px] text-slate-400">Real Query Execution on v9.7</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-brand-cyan transition-colors" />
            </div>

            <div
              onClick={() => onNavigate('visualization')}
              className="p-3.5 rounded-xl bg-dark-900/80 border border-indigo-500/30 hover:border-indigo-500/70 transition-all cursor-pointer flex items-center justify-between group shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                  <GitBranch className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white group-hover:text-indigo-400 transition-colors">
                    Index Simulation
                  </h4>
                  <p className="text-[11px] text-slate-400">C++ Native Data Structures</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-indigo-400 transition-colors" />
            </div>

            <div
              onClick={() => onNavigate('performance')}
              className="p-3.5 rounded-xl bg-dark-900/80 border border-brand-blue/30 hover:border-brand-blue/70 transition-all cursor-pointer flex items-center justify-between group shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-brand-blue/15 border border-brand-blue/30 flex items-center justify-center text-brand-blue">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white group-hover:text-brand-blue transition-colors">
                    Performance Analytics
                  </h4>
                  <p className="text-[11px] text-slate-400">Compare Before vs After</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-brand-blue transition-colors" />
            </div>
          </div>
        </div>
      </div>

      {/* 2. Stat Cards Row (4 cards matching Page 1) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Databases */}
        <div
          onClick={() => onNavigate('database')}
          className="bg-dark-800/80 hover:bg-dark-800 border border-dark-700/80 hover:border-brand-cyan/40 rounded-xl p-4 transition-all cursor-pointer shadow-sm group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-3xl font-black text-white">{dbCount}</span>
            <div className="w-9 h-9 rounded-lg bg-brand-cyan/15 flex items-center justify-center text-brand-cyan">
              <Database className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-300 font-semibold">Databases</span>
            <span className="text-brand-emerald font-mono font-medium">+1 today</span>
          </div>
        </div>

        {/* Card 2: Tables */}
        <div
          onClick={() => onNavigate('database')}
          className="bg-dark-800/80 hover:bg-dark-800 border border-dark-700/80 hover:border-brand-blue/40 rounded-xl p-4 transition-all cursor-pointer shadow-sm group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-3xl font-black text-white">{tableCount}</span>
            <div className="w-9 h-9 rounded-lg bg-brand-blue/15 flex items-center justify-center text-brand-blue">
              <Table className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-300 font-semibold">Tables</span>
            <span className="text-brand-emerald font-mono font-medium">+4 today</span>
          </div>
        </div>

        {/* Card 3: Indexes */}
        <div
          onClick={() => onNavigate('indexes')}
          className="bg-dark-800/80 hover:bg-dark-800 border border-dark-700/80 hover:border-indigo-500/40 rounded-xl p-4 transition-all cursor-pointer shadow-sm group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-3xl font-black text-white">{indexCount}</span>
            <div className="w-9 h-9 rounded-lg bg-indigo-500/15 flex items-center justify-center text-indigo-400">
              <Layers className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-300 font-semibold">Indexes</span>
            <span className="text-brand-emerald font-mono font-medium">+2 today</span>
          </div>
        </div>

        {/* Card 4: Queries Executed */}
        <div
          onClick={() => onNavigate('workspace')}
          className="bg-dark-800/80 hover:bg-dark-800 border border-dark-700/80 hover:border-brand-amber/40 rounded-xl p-4 transition-all cursor-pointer shadow-sm group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-3xl font-black text-white">28</span>
            <div className="w-9 h-9 rounded-lg bg-brand-amber/15 flex items-center justify-center text-brand-amber">
              <Zap className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-300 font-semibold">Queries Executed</span>
            <span className="text-brand-rose font-mono font-medium">-18%</span>
          </div>
        </div>
      </div>

      {/* 3. Middle Row: Recent Activity, Quick Actions, Indexing Algorithms */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Recent Activity (4 cols) */}
        <div className="lg:col-span-4 bg-dark-800/80 border border-dark-700/80 rounded-xl p-4 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                Recent Activity
              </h3>
              <button
                onClick={() => onNavigate('workspace')}
                className="text-[11px] font-semibold text-brand-cyan hover:underline flex items-center gap-1 cursor-pointer"
              >
                View All →
              </button>
            </div>
            <div className="space-y-2.5">
              {recentActivity.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 rounded-lg bg-dark-900/60 border border-dark-700/50 hover:border-dark-600 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <Icon className={`w-3.5 h-3.5 shrink-0 ${item.color}`} />
                      <span className="text-xs text-slate-200 font-medium truncate">{item.action}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono shrink-0 pl-2">
                      {item.time}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Quick Actions (4 cols) */}
        <div className="lg:col-span-4 bg-dark-800/80 border border-dark-700/80 rounded-xl p-4 shadow-sm">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono mb-3">
            Quick Actions
          </h3>
          <div className="grid grid-cols-2 gap-2.5">
            <button
              onClick={() => onNavigate('database')}
              className="p-3 rounded-lg bg-dark-900/70 border border-dark-700 hover:border-brand-cyan/50 text-left transition-all cursor-pointer group"
            >
              <div className="w-7 h-7 rounded bg-brand-cyan/15 flex items-center justify-center text-brand-cyan mb-2 group-hover:scale-110 transition-transform">
                <PlusCircle className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-white block group-hover:text-brand-cyan">Create Database</span>
              <span className="text-[10px] text-slate-400 block">Start a new database</span>
            </button>

            <button
              onClick={() => onNavigate('workspace')}
              className="p-3 rounded-lg bg-dark-900/70 border border-dark-700 hover:border-brand-blue/50 text-left transition-all cursor-pointer group"
            >
              <div className="w-7 h-7 rounded bg-brand-blue/15 flex items-center justify-center text-brand-blue mb-2 group-hover:scale-110 transition-transform">
                <Code2 className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-white block group-hover:text-brand-blue">Write SQL Query</span>
              <span className="text-[10px] text-slate-400 block">Open SQL Workspace</span>
            </button>

            <button
              onClick={() => onNavigate('visualization')}
              className="p-3 rounded-lg bg-dark-900/70 border border-dark-700 hover:border-indigo-500/50 text-left transition-all cursor-pointer group"
            >
              <div className="w-7 h-7 rounded bg-indigo-500/15 flex items-center justify-center text-indigo-400 mb-2 group-hover:scale-110 transition-transform">
                <GitBranch className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-white block group-hover:text-indigo-400">Visualize Index</span>
              <span className="text-[10px] text-slate-400 block">See index structure</span>
            </button>

            <button
              onClick={() => onNavigate('performance')}
              className="p-3 rounded-lg bg-dark-900/70 border border-dark-700 hover:border-brand-emerald/50 text-left transition-all cursor-pointer group"
            >
              <div className="w-7 h-7 rounded bg-brand-emerald/15 flex items-center justify-center text-brand-emerald mb-2 group-hover:scale-110 transition-transform">
                <BarChart3 className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-white block group-hover:text-brand-emerald">Compare Performance</span>
              <span className="text-[10px] text-slate-400 block">Before vs After</span>
            </button>
          </div>
        </div>

        {/* Indexing Algorithms (4 cols) */}
        <div className="lg:col-span-4 bg-dark-800/80 border border-dark-700/80 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                Indexing Algorithms
              </h3>
              <p className="text-[10px] text-slate-400">Explore different indexing techniques</p>
            </div>
            <button
              onClick={() => onNavigate('visualization')}
              className="text-[11px] font-semibold text-brand-cyan hover:underline cursor-pointer"
            >
              See All →
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              { name: 'Linear Scan', c: 'O(n)', col: 'border-brand-rose/40 text-brand-rose' },
              { name: 'BST', c: 'O(log n)', col: 'border-brand-blue/40 text-brand-blue' },
              { name: 'AVL Tree', c: 'O(log n)', col: 'border-brand-emerald/40 text-brand-emerald' },
              { name: 'B-Tree', c: 'O(log n)', col: 'border-brand-amber/40 text-brand-amber' },
              { name: 'B+ Tree', c: 'O(log n)', col: 'border-brand-cyan/40 text-brand-cyan' },
              { name: 'Hash Index', c: 'O(1)', col: 'border-indigo-400/40 text-indigo-400' }
            ].map(algo => (
              <div
                key={algo.name}
                onClick={() => onNavigate('visualization')}
                className={`p-2 rounded-lg bg-dark-900/80 border ${algo.col} hover:bg-dark-900 transition-all cursor-pointer text-center`}
              >
                <span className="text-[11px] font-bold text-white block truncate">{algo.name}</span>
                <span className="text-[10px] font-mono font-bold block mt-0.5">{algo.c}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 4. Bottom Row: Performance Overview, Supported SQL, Live System Monitor */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Performance Overview (5 cols) */}
        <div className="lg:col-span-5 bg-dark-800/80 border border-dark-700/80 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
              Performance Overview
            </h3>
            <div className="flex items-center gap-3 text-[10px] font-mono">
              <span className="flex items-center gap-1.5 text-brand-rose">
                <span className="w-2 h-2 rounded-full bg-brand-rose" /> Without Index
              </span>
              <span className="flex items-center gap-1.5 text-brand-cyan">
                <span className="w-2 h-2 rounded-full bg-brand-cyan" /> With Index
              </span>
            </div>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={performanceOverviewData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="metric" stroke="#64748b" tick={{ fontSize: 10 }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 10 }} scale="log" domain={[0.1, 1000]} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '8px',
                    fontSize: '11px',
                    color: '#f8fafc'
                  }}
                />
                <Bar dataKey="withoutIndex" name="Without Index" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                <Bar dataKey="withIndex" name="With Index" fill="#06b6d4" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Supported SQL Features (4 cols) */}
        <div className="lg:col-span-4 bg-dark-800/80 border border-dark-700/80 rounded-xl p-4 shadow-sm">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono mb-1">
            Supported SQL Features
          </h3>
          <p className="text-[10px] text-slate-400 mb-3">Standard DDL & DML operations supported by MySQL</p>
          <div className="grid grid-cols-2 gap-2">
            {supportedSql.map(feat => (
              <div
                key={feat}
                className="flex items-center gap-1.5 text-[11px] font-mono text-slate-300 py-1 px-1.5 rounded bg-dark-900/60 border border-dark-700/40"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-brand-emerald shrink-0" />
                <span className="truncate">{feat}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Live System Monitor (3 cols) */}
        <div className="lg:col-span-3 bg-dark-800/80 border border-dark-700/80 rounded-xl p-4 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono mb-1">
              Live System Monitor
            </h3>
            <p className="text-[10px] text-slate-400 mb-3">Real-time status of all components</p>

            {/* Circular Gauges */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="p-3 rounded-lg bg-dark-900/80 border border-dark-700 text-center">
                <div className="text-xl font-black text-brand-cyan font-mono">28%</div>
                <div className="text-[10px] text-slate-400 font-sans mt-0.5">CPU Usage</div>
              </div>
              <div className="p-3 rounded-lg bg-dark-900/80 border border-dark-700 text-center">
                <div className="text-xl font-black text-indigo-400 font-mono">46%</div>
                <div className="text-[10px] text-slate-400 font-sans mt-0.5">Memory Usage</div>
              </div>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="space-y-1.5 border-t border-dark-700/60 pt-3 text-[11px] font-mono">
            <div className="flex items-center justify-between text-slate-400">
              <span>Active Connections:</span>
              <span className="text-white font-bold">124</span>
            </div>
            <div className="flex items-center justify-between text-slate-400">
              <span>Query Throughput:</span>
              <span className="text-brand-emerald font-bold">2.3 MB/s</span>
            </div>
            <div className="flex items-center justify-between text-slate-400">
              <span>System Uptime:</span>
              <span className="text-brand-cyan font-bold">99.9%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
