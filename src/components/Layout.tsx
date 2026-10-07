import React, { useState } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import {
  LayoutDashboard, FolderKanban, GitBranch, PlayCircle,
  Bug, FileCheck, BarChart3, Plug, Settings, LogOut,
  Menu, X, ChevronRight, Zap, Map
} from 'lucide-react';

const navItems = [
  { path: '/app/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/app/projects', label: 'Projects', icon: FolderKanban },
  { path: '/app/repositories', label: 'Repositories', icon: GitBranch },
  { path: '/app/qa-runs', label: 'QA Runs', icon: PlayCircle },
  { path: '/app/app-map', label: 'App Map', icon: Map },
  { path: '/app/bugs', label: 'Bugs', icon: Bug },
  { path: '/app/qa-cases', label: 'QA Cases', icon: FileCheck },
  { path: '/app/reports', label: 'Reports', icon: BarChart3 },
  { path: '/app/integrations', label: 'Integrations', icon: Plug },
  { path: '/app/settings', label: 'Settings', icon: Settings },
];

export default function AppLayout() {
  const { logout, user, organization } = useApp();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-navy-950 overflow-hidden">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50
        w-64 bg-navy-900 border-r border-navy-700/50
        flex flex-col transition-transform duration-200
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Logo */}
        <div className="h-16 flex items-center px-5 border-b border-navy-700/50">
          <Link to="/app/dashboard" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-violet-500 flex items-center justify-center">
              <Zap className="w-4.5 h-4.5 text-white" />
            </div>
            <span className="text-lg font-bold text-white tracking-tight">QUALNEX</span>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="ml-auto lg:hidden text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 px-3 space-y-0.5 overflow-y-auto">
          {navItems.map(item => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                  transition-all duration-150
                  ${isActive
                    ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-navy-800'
                  }
                `}
              >
                <Icon className="w-4.5 h-4.5 flex-shrink-0" />
                {item.label}
                {isActive && <ChevronRight className="w-3.5 h-3.5 ml-auto" />}
              </Link>
            );
          })}
        </nav>

        {/* User section */}
        <div className="p-3 border-t border-navy-700/50">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-violet-500 flex items-center justify-center text-xs font-bold text-white">
              {user?.name?.charAt(0) || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user?.name}</p>
              <p className="text-xs text-slate-500 truncate">{organization?.name}</p>
            </div>
            <button
              onClick={logout}
              className="text-slate-500 hover:text-rose-400 transition-colors"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="h-16 flex items-center px-4 lg:px-6 border-b border-navy-700/50 bg-navy-900/50 backdrop-blur-sm">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-slate-400 hover:text-white mr-4"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex-1" />
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-400/10 border border-emerald-400/20">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-medium text-emerald-400">System Online</span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <div className="flex-1 overflow-y-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
