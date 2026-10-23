import React, { useEffect, useState, useRef } from 'react';
import { Database, Search, Bell, Sun, Moon, CheckCircle2, Server, Cpu, Check, X } from 'lucide-react';
import { getHealth } from '../../services/api';
import { useToast } from '../ui';

interface NavbarProps {
  onSearchClick?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onSearchClick }) => {
  const toast = useToast();
  const [engineOnline, setEngineOnline] = useState<boolean>(true);
  const [mysqlOnline, setMysqlOnline] = useState<boolean>(true);
  const [themeDark, setThemeDark] = useState<boolean>(true);
  const [showNotifications, setShowNotifications] = useState<boolean>(false);
  const [unreadCount, setUnreadCount] = useState<number>(3);
  const notifRef = useRef<HTMLDivElement>(null);

  const [notifications, setNotifications] = useState([
    {
      id: '1',
      title: 'MySQL Server Connected',
      desc: 'Active on localhost:3306 (Service MySQL97). Schema my_database ready.',
      time: 'Just now',
      read: false,
      type: 'success'
    },
    {
      id: '2',
      title: 'C++ Simulator Engine Online',
      desc: 'Modular indexer_engine.exe initialized with B+ Tree and AVL tracing.',
      time: '2m ago',
      read: false,
      type: 'info'
    },
    {
      id: '3',
      title: '1,234 Records Active',
      desc: 'Students table populated with realistic Indian engineering cohort.',
      time: '10m ago',
      read: false,
      type: 'info'
    }
  ]);

  useEffect(() => {
    const check = async () => {
      try {
        const data = await getHealth();
        setEngineOnline(data?.engine?.status === 'running' || data?.engine?.status === 'online');
        setMysqlOnline(data?.mysql?.status === 'connected');
      } catch {
        setEngineOnline(false);
        setMysqlOnline(false);
      }
    };
    check();
    const interval = setInterval(check, 8000);
    return () => clearInterval(interval);
  }, []);

  // Close notifications on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggleTheme = () => {
    const newTheme = !themeDark;
    setThemeDark(newTheme);
    if (newTheme) {
      document.documentElement.classList.add('dark');
      toast('info', 'Dark theme enabled');
    } else {
      document.documentElement.classList.remove('dark');
      toast('info', 'Light theme enabled');
    }
  };

  const handleClearNotifications = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
    toast('info', 'All notifications marked as read');
  };

  return (
    <header className="h-16 border-b border-dark-700/80 bg-dark-900/95 backdrop-blur-xl px-5 md:px-7 flex items-center justify-between sticky top-0 z-40 select-none">
      {/* Left: DBIndex Logo */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-blue via-indigo-600 to-brand-cyan p-0.5 shadow-lg shadow-brand-cyan/15 flex items-center justify-center">
          <div className="w-full h-full bg-dark-900 rounded-[10px] flex items-center justify-center">
            <Database className="w-5 h-5 text-brand-cyan animate-pulse" />
          </div>
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-extrabold text-white tracking-tight flex items-center">
              DB<span className="text-brand-cyan">Index</span>
            </h1>
            <span className="text-[10px] font-mono uppercase px-1.5 py-0.2 bg-brand-cyan/15 text-brand-cyan rounded border border-brand-cyan/30">
              v2.0
            </span>
          </div>
          <p className="text-[11px] text-slate-400 font-medium">Database Indexing Simulator</p>
        </div>
      </div>

      {/* Center: Global Search Bar */}
      <div className="hidden md:flex items-center flex-1 max-w-md mx-8">
        <div
          onClick={onSearchClick}
          className="w-full flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl bg-dark-800/80 border border-dark-600/70 hover:border-brand-cyan/50 text-slate-400 transition-colors cursor-pointer group shadow-inner"
        >
          <Search className="w-4 h-4 text-slate-400 group-hover:text-brand-cyan transition-colors" />
          <span className="text-xs text-slate-400 group-hover:text-slate-200 flex-1 truncate font-sans">
            Search tables, queries, indexes or features...
          </span>
          <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-dark-700/80 text-slate-400 border border-dark-600/60 shadow-xs">
            Ctrl K
          </kbd>
        </div>
      </div>

      {/* Right: Theme Toggle, Notifications, User Avatar */}
      <div className="flex items-center gap-4 relative" ref={notifRef}>
        {/* Theme Toggle */}
        <button
          onClick={handleToggleTheme}
          className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-dark-800 transition-colors cursor-pointer"
          title="Toggle color theme"
        >
          {themeDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* Notifications Button */}
        <button
          onClick={() => setShowNotifications(!showNotifications)}
          className="relative p-2 rounded-lg text-slate-400 hover:text-white hover:bg-dark-800 transition-colors cursor-pointer"
          title="Notifications"
        >
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-brand-rose text-[9px] font-bold text-white flex items-center justify-center border-2 border-dark-900 animate-pulse">
              {unreadCount}
            </span>
          )}
        </button>

        {/* Notifications Dropdown Popover */}
        {showNotifications && (
          <div className="absolute right-32 top-14 w-80 bg-dark-850 border border-dark-600 rounded-2xl shadow-2xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150">
            <div className="p-3 bg-dark-900/90 border-b border-dark-700 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                  Notifications
                </span>
                {unreadCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-brand-cyan/20 text-brand-cyan text-[10px] font-mono font-bold">
                    {unreadCount} new
                  </span>
                )}
              </div>
              {unreadCount > 0 && (
                <button
                  onClick={handleClearNotifications}
                  className="text-[10px] text-slate-400 hover:text-brand-cyan font-mono flex items-center gap-1 cursor-pointer"
                >
                  <Check className="w-3 h-3" />
                  <span>Mark all read</span>
                </button>
              )}
            </div>

            <div className="p-2 divide-y divide-dark-700/50 max-h-72 overflow-y-auto">
              {notifications.map(n => (
                <div
                  key={n.id}
                  className={`p-2.5 rounded-lg transition-colors ${
                    n.read ? 'opacity-60 bg-transparent' : 'bg-dark-800/60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <span className="text-xs font-semibold text-slate-200">{n.title}</span>
                    <span className="text-[9px] font-mono text-slate-500 whitespace-nowrap">{n.time}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed font-sans">{n.desc}</p>
                </div>
              ))}
            </div>

            <div className="p-2 bg-dark-900/70 border-t border-dark-700/60 text-center">
              <span className="text-[10px] font-mono text-slate-400 flex items-center justify-center gap-2">
                <span className={`w-2 h-2 rounded-full ${mysqlOnline ? 'bg-brand-emerald' : 'bg-brand-rose'}`} />
                MySQL 9.7 • C++ Engine Active
              </span>
            </div>
          </div>
        )}

        {/* User Profile */}
        <div className="flex items-center gap-2.5 pl-2 border-l border-dark-700/60">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-brand-cyan to-brand-blue flex items-center justify-center text-dark-900 font-bold text-xs shadow-md shadow-brand-cyan/20">
            B
          </div>
          <div className="hidden lg:block text-left leading-tight">
            <span className="text-xs font-semibold text-white block">Bhalaksha Vairagkar</span>
            <span className="text-[10px] text-slate-400 block font-medium">Student</span>
          </div>
        </div>
      </div>
    </header>
  );
};
