import React, { useState, useEffect } from 'react';
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';
import { SearchModal } from './components/layout/SearchModal';
import { AnimatedVideoBackground } from './components/layout/AnimatedVideoBackground';
import { ToastProvider } from './context/ToastContext';
import { PageId } from './types';

// The 9 DBIndex Laboratory Pages
import { Dashboard } from './pages/Dashboard';
import { SQLWorkspace } from './pages/SQLWorkspace';
import { DatabaseExplorer } from './pages/DatabaseExplorer';
import { IndexVisualization } from './pages/IndexVisualization';
import { QueryAnalysis } from './pages/QueryAnalysis';
import { PerformanceLab } from './pages/PerformanceLab';
import { IndexManager } from './pages/IndexManager';
import { SavedQueries } from './pages/SavedQueries';
import { Documentation } from './pages/Documentation';

export function App() {
  const [currentPage, setCurrentPage] = useState<PageId>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const [searchOpen, setSearchOpen] = useState<boolean>(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <ToastProvider>
      <div className="min-h-screen relative bg-dark-900/90 text-slate-100 flex flex-col font-sans antialiased selection:bg-brand-cyan/20 selection:text-brand-cyan">
        {/* Cinematic Live Background Video */}
        <AnimatedVideoBackground
          intensity={
            currentPage === 'visualization' ? 'cinematic' : currentPage === 'dashboard' ? 'medium' : 'subtle'
          }
        />

        {/* Global Search Modal */}
        <SearchModal
          isOpen={searchOpen}
          onClose={() => setSearchOpen(false)}
          onNavigate={p => setCurrentPage(p)}
        />

        {/* Top Navbar */}
        <Navbar onSearchClick={() => setSearchOpen(true)} />

        <div className="flex-1 flex overflow-hidden">
          {/* Collapsible Sidebar */}
          <Sidebar
            currentPage={currentPage}
            onSelectPage={setCurrentPage}
            collapsed={sidebarCollapsed}
            onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          />

          {/* Main Content Area */}
          <main className="flex-1 overflow-y-auto p-5 md:p-7 relative z-10">
            <div className="max-w-7xl mx-auto">
              {currentPage === 'dashboard' && <Dashboard onNavigate={setCurrentPage} />}
              {currentPage === 'workspace' && <SQLWorkspace onNavigate={setCurrentPage} />}
              {currentPage === 'database' && <DatabaseExplorer />}
              {currentPage === 'visualization' && <IndexVisualization />}
              {currentPage === 'analysis' && <QueryAnalysis />}
              {currentPage === 'performance' && <PerformanceLab />}
              {currentPage === 'indexes' && <IndexManager />}
              {currentPage === 'saved' && <SavedQueries />}
              {currentPage === 'documentation' && <Documentation />}
            </div>
          </main>
        </div>
      </div>
    </ToastProvider>
  );
}

export default App;
