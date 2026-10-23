import React, { useState } from 'react';
import {
  BookOpen,
  Download,
  Search,
  ArrowRight,
  CheckCircle2,
  Database,
  Cpu,
  Layers,
  Code2,
  Server,
  FileText,
  Copy,
  ExternalLink
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid
} from 'recharts';
import { useToast } from '../components/ui';

export const Documentation: React.FC = () => {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<
    'Getting Started' | 'User Guide' | 'Indexing Concepts' | 'API Reference' | 'C++ Engine' | 'Troubleshooting' | 'FAQ'
  >('Getting Started');

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeSection, setActiveSection] = useState<string>('intro');

  const performanceComparisonData = [
    { workload: 'Equality Search', withoutIndex: 892.4, withIndex: 12.4 },
    { workload: 'Range Query', withoutIndex: 1234, withIndex: 56 },
    { workload: 'Join Query', withoutIndex: 456, withIndex: 18.2 },
    { workload: 'Aggregation', withoutIndex: 232, withIndex: 9.1 }
  ];

  const codeSnippet = `CREATE TABLE students (
  id INT PRIMARY KEY,
  name VARCHAR(100),
  department VARCHAR(50),
  cgpa DECIMAL(3,2)
);

CREATE INDEX idx_department ON students(department);

SELECT * FROM students
WHERE department = 'CSE';`;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(codeSnippet);
    toast('success', 'Code snippet copied to clipboard');
  };

  const handleExportPdf = () => {
    window.print();
  };

  return (
    <div className="space-y-5 select-none animate-in fade-in duration-300">
      {/* 1. Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-brand-cyan" />
            <span>Documentation</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Learn how to use DBIndex, understand database indexing, and explore technical details
          </p>
        </div>

        <button
          onClick={handleExportPdf}
          className="px-3.5 py-1.5 rounded-lg bg-dark-800 hover:bg-dark-700 border border-dark-600 text-xs font-semibold text-slate-200 flex items-center gap-2 transition-colors cursor-pointer"
        >
          <Download className="w-4 h-4 text-brand-cyan" />
          <span>Export as PDF</span>
        </button>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto text-xs font-semibold border-b border-dark-700/80 pb-2">
        {[
          'Getting Started',
          'User Guide',
          'Indexing Concepts',
          'API Reference',
          'C++ Engine',
          'Troubleshooting',
          'FAQ'
        ].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === tab
                ? 'bg-brand-cyan/20 text-brand-cyan border border-brand-cyan/40 shadow-xs'
                : 'text-slate-400 hover:text-slate-200 hover:bg-dark-800'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* 2. Main Content & Table of Contents Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Main Content (9 cols) */}
        <div className="lg:col-span-9 space-y-5">
          {/* Hero Welcome Card */}
          <div className="bg-gradient-to-r from-dark-800/90 via-dark-800/80 to-brand-blue/15 border border-dark-600/70 rounded-xl p-5 shadow-sm">
            <h3 className="text-base font-bold text-white mb-1">
              Welcome to DBIndex Documentation
            </h3>
            <p className="text-xs text-slate-300 mb-3">
              A comprehensive guide to understanding and using the Database Indexing Simulator.
            </p>

            <div className="relative max-w-md">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
              <input
                type="text"
                placeholder="Search documentation..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-dark-900 border border-dark-600 rounded-lg pl-8 pr-3 py-1.5 text-xs font-mono text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-brand-cyan"
              />
            </div>
          </div>

          {/* Quick Links Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div
              onClick={() => setActiveSection('intro')}
              className="p-3.5 rounded-xl bg-dark-800/80 border border-dark-700 hover:border-brand-cyan/40 transition-all cursor-pointer flex items-center justify-between group"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-brand-cyan/15 flex items-center justify-center text-brand-cyan">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white group-hover:text-brand-cyan">Quick Start</h4>
                  <p className="text-[10px] text-slate-400">Get up and running in minutes</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-brand-cyan" />
            </div>

            <div
              onClick={() => setActiveSection('concepts')}
              className="p-3.5 rounded-xl bg-dark-800/80 border border-dark-700 hover:border-indigo-500/40 transition-all cursor-pointer flex items-center justify-between group"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/15 flex items-center justify-center text-indigo-400">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white group-hover:text-indigo-400">Indexing Basics</h4>
                  <p className="text-[10px] text-slate-400">Learn core concepts</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-indigo-400" />
            </div>

            <div
              onClick={() => setActiveSection('api')}
              className="p-3.5 rounded-xl bg-dark-800/80 border border-dark-700 hover:border-brand-blue/40 transition-all cursor-pointer flex items-center justify-between group"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-brand-blue/15 flex items-center justify-center text-brand-blue">
                  <Code2 className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white group-hover:text-brand-blue">API Reference</h4>
                  <p className="text-[10px] text-slate-400">Explore available APIs</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-brand-blue" />
            </div>
          </div>

          {/* Section 1 & Section 2 Split: Introduction & System Architecture */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* 1. Introduction */}
            <div className="bg-dark-800/80 border border-dark-700/80 rounded-xl p-4 shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono mb-2">
                  1. Introduction
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed font-sans mb-3">
                  DBIndex is a full-stack web application that helps you understand how database indexes work and their impact on query performance. You can create tables, add different types of indexes, run queries, and visualize execution plans.
                </p>

                <div className="space-y-1.5 text-xs text-slate-300">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-brand-emerald shrink-0" />
                    <span>Create and manage databases and tables</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-brand-emerald shrink-0" />
                    <span>Build different index types (B+ Tree, Hash, etc.)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-brand-emerald shrink-0" />
                    <span>Visualize index structures</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-brand-emerald shrink-0" />
                    <span>Compare query performance with and without indexes</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-brand-emerald shrink-0" />
                    <span>Interactive execution plan analysis</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. System Architecture */}
            <div className="bg-dark-800/80 border border-dark-700/80 rounded-xl p-4 shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono mb-2">
                  2. System Architecture
                </h3>
                <p className="text-xs text-slate-300 font-sans mb-3">
                  DBIndex consists of a modern full-stack architecture:
                </p>

                {/* Architecture Visual Boxes */}
                <div className="space-y-2 font-mono text-xs">
                  <div className="p-2.5 rounded-lg bg-dark-900 border border-brand-cyan/40 text-center">
                    <span className="text-brand-cyan font-bold block">Frontend (React)</span>
                    <span className="text-[10px] text-slate-400">UI, Visualization, Query Builder</span>
                  </div>
                  <div className="text-center text-slate-500 text-xs">↓</div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-2 rounded-lg bg-dark-900 border border-brand-blue/40 text-center">
                      <span className="text-brand-blue font-bold block text-[11px]">Backend (Node.js)</span>
                      <span className="text-[9px] text-slate-400">REST API & Query Processing</span>
                    </div>
                    <div className="p-2 rounded-lg bg-dark-900 border border-indigo-500/40 text-center">
                      <span className="text-indigo-400 font-bold block text-[11px]">C++ Engine</span>
                      <span className="text-[9px] text-slate-400">Algorithms & Execution Tracing</span>
                    </div>
                  </div>
                  <div className="text-center text-slate-500 text-xs">↓</div>
                  <div className="p-2 rounded-lg bg-dark-900 border border-brand-rose/40 text-center">
                    <span className="text-brand-rose font-bold block text-[11px]">MySQL 9.7 Database</span>
                    <span className="text-[10px] text-slate-400">Data Storage & Query Optimizer</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3 & Section 4 Split: Quick Example & Query Performance Comparison */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* 3. Quick Example */}
            <div className="bg-dark-800/80 border border-dark-700/80 rounded-xl p-4 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                    3. Quick Example
                  </h3>
                  <button
                    onClick={handleCopyCode}
                    className="text-slate-400 hover:text-white flex items-center gap-1 text-[11px] font-mono cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </button>
                </div>
                <p className="text-xs text-slate-400 mb-2">Create a table and add an index:</p>

                <pre className="p-3 rounded-lg bg-dark-900/90 border border-dark-700 font-mono text-[11px] text-slate-200 overflow-x-auto leading-relaxed">
                  {codeSnippet}
                </pre>
              </div>
            </div>

            {/* 4. Query Performance Comparison */}
            <div className="bg-dark-800/80 border border-dark-700/80 rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                  4. Query Performance Comparison
                </h3>
              </div>
              <p className="text-xs text-slate-400 mb-2">
                See the difference in execution time with and without an index:
              </p>

              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={performanceComparisonData} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="workload" stroke="#64748b" tick={{ fontSize: 9 }} />
                    <YAxis stroke="#64748b" tick={{ fontSize: 9 }} scale="log" domain={[0.1, 2000]} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        borderColor: '#334155',
                        borderRadius: '8px',
                        fontSize: '11px',
                        color: '#f8fafc'
                      }}
                    />
                    <Bar dataKey="withoutIndex" name="Without Index" fill="#f43f5e" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="withIndex" name="With Index" fill="#06b6d4" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>

        {/* Right Sidebar: Table of Contents (3 cols) */}
        <div className="lg:col-span-3 bg-dark-800/80 border border-dark-700/80 rounded-xl p-4 shadow-sm space-y-2 h-[680px] overflow-y-auto">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono mb-3">
            Table of Contents
          </h3>

          <div className="space-y-1 font-mono text-[11px]">
            <a
              href="#intro"
              className="block p-1.5 rounded bg-brand-cyan/15 text-brand-cyan font-bold"
            >
              1. Introduction
            </a>
            <a href="#arch" className="block p-1.5 rounded text-slate-400 hover:text-white">
              2. System Architecture
            </a>
            <a href="#features" className="block p-1.5 rounded text-slate-400 hover:text-white">
              3. Features Overview
            </a>
            <div className="pl-3 space-y-1 border-l border-dark-700">
              <span className="block text-slate-300 font-bold">4. Getting Started</span>
              <span className="block text-slate-500 pl-2">4.1 Prerequisites</span>
              <span className="block text-slate-500 pl-2">4.2 Installation</span>
              <span className="block text-slate-500 pl-2">4.3 Running the Application</span>
            </div>
            <div className="pl-3 space-y-1 border-l border-dark-700">
              <span className="block text-slate-300 font-bold">5. User Guide</span>
              <span className="block text-slate-500 pl-2">5.1 Creating a Database</span>
              <span className="block text-slate-500 pl-2">5.2 Managing Tables</span>
              <span className="block text-slate-500 pl-2">5.3 Building Indexes</span>
              <span className="block text-slate-500 pl-2">5.4 Running Queries</span>
              <span className="block text-slate-500 pl-2">5.5 Visualizing Execution Plans</span>
            </div>
            <div className="pl-3 space-y-1 border-l border-dark-700">
              <span className="block text-slate-300 font-bold">6. Indexing Concepts</span>
              <span className="block text-slate-500 pl-2">6.1 What is an Index?</span>
              <span className="block text-slate-500 pl-2">6.2 Types of Indexes</span>
              <span className="block text-slate-500 pl-2">6.3 B+ Tree Index</span>
              <span className="block text-slate-500 pl-2">6.4 Hash Index</span>
              <span className="block text-slate-500 pl-2">6.5 When to Use Which Index?</span>
            </div>
            <a href="#api" className="block p-1.5 rounded text-slate-400 hover:text-white">
              7. API Reference
            </a>
            <a href="#engine" className="block p-1.5 rounded text-slate-400 hover:text-white">
              8. C++ Engine Details
            </a>
            <a href="#troubleshooting" className="block p-1.5 rounded text-slate-400 hover:text-white">
              9. Troubleshooting
            </a>
            <a href="#faq" className="block p-1.5 rounded text-slate-400 hover:text-white">
              10. FAQ
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
