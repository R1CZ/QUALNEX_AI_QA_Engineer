import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  PlayCircle, Bug, FileCheck, FolderKanban,
  ArrowRight, Activity, Clock, TrendingUp, Plus
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export default function Dashboard() {
  const { dashboard, projects, qaRuns, bugs, qaCases } = useApp();

  const stats = [
    { label: 'Active Runs', value: dashboard.activeRuns, icon: PlayCircle, color: 'cyan' },
    { label: 'Total Tests', value: dashboard.totalTests, icon: Activity, color: 'violet' },
    { label: 'Validated Bugs', value: dashboard.validatedBugs, icon: Bug, color: 'amber' },
    { label: 'QA Cases', value: dashboard.qaCases, icon: FileCheck, color: 'emerald' },
  ];

  const colorMap: Record<string, string> = {
    cyan: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
    violet: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
    amber: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  };

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-sm text-slate-400 mt-1">Overview of your quality engineering activity</p>
        </div>
        <Link
          to="/app/projects"
          className="flex items-center gap-2 px-4 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-navy-950 font-medium rounded-lg transition-colors text-sm"
        >
          <Plus className="w-4 h-4" />
          New Project
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.08 }}
              className="glass-card rounded-xl p-5"
            >
              <div className={`w-9 h-9 rounded-lg border flex items-center justify-center mb-3 ${colorMap[stat.color]}`}>
                <Icon className="w-4.5 h-4.5" />
              </div>
              <p className="text-2xl font-bold text-white">{stat.value}</p>
              <p className="text-xs text-slate-400 mt-1">{stat.label}</p>
            </motion.div>
          );
        })}
      </div>

      {/* Main content */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent QA Runs */}
        <div className="lg:col-span-2 glass-card rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Recent QA Runs</h2>
            <Link to="/app/qa-runs" className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          
          {qaRuns.length === 0 ? (
            <EmptyState
              icon={PlayCircle}
              title="No QA Runs Yet"
              description="Create a project and start your first QA run to see results here."
              action={
                <Link to="/app/projects" className="text-sm text-cyan-400 hover:text-cyan-300 flex items-center gap-1">
                  Create Project <ArrowRight className="w-3 h-3" />
                </Link>
              }
            />
          ) : (
            <div className="space-y-3">
              {qaRuns.slice(0, 5).map(run => (
                <div key={run.id} className="flex items-center gap-4 p-3 rounded-lg bg-navy-800/50 border border-navy-700/30">
                  <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                    <PlayCircle className="w-4 h-4 text-cyan-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{run.projectName}</p>
                    <p className="text-xs text-slate-500">{run.currentStep}</p>
                  </div>
                  <StatusBadge status={run.status} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Severity Distribution */}
        <div className="glass-card rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Severity Distribution</h2>
          
          {dashboard.validatedBugs === 0 ? (
            <EmptyState
              icon={Bug}
              title="No Bugs Found"
              description="Run a QA scan to discover defects."
            />
          ) : (
            <div className="space-y-3">
              {Object.entries(dashboard.severityDistribution).map(([severity, count]) => (
                <div key={severity} className="flex items-center gap-3">
                  <SeverityDot severity={severity} />
                  <span className="text-sm text-slate-300 capitalize flex-1">{severity}</span>
                  <span className="text-sm font-medium text-white">{count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Projects */}
      <div className="mt-6 glass-card rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Projects</h2>
          <Link to="/app/projects" className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1">
            View all <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {projects.length === 0 ? (
          <EmptyState
            icon={FolderKanban}
            title="No Projects"
            description="Connect a repository to create your first QA project."
            action={
              <Link to="/app/repositories" className="text-sm text-cyan-400 hover:text-cyan-300 flex items-center gap-1">
                Connect Repository <ArrowRight className="w-3 h-3" />
              </Link>
            }
          />
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.slice(0, 6).map(project => (
              <Link
                key={project.id}
                to={`/app/projects/${project.id}`}
                className="p-4 rounded-lg bg-navy-800/50 border border-navy-700/30 hover:border-cyan-500/30 transition-colors"
              >
                <div className="flex items-center gap-3 mb-2">
                  <FolderKanban className="w-4 h-4 text-cyan-400" />
                  <span className="text-sm font-medium text-white truncate">{project.name}</span>
                </div>
                <p className="text-xs text-slate-500 truncate">{project.repository}</p>
                <div className="flex items-center gap-2 mt-3">
                  <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${
                    project.status === 'active' ? 'bg-emerald-400/10 text-emerald-400' :
                    project.status === 'paused' ? 'bg-amber-400/10 text-amber-400' :
                    'bg-rose-400/10 text-rose-400'
                  }`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${
                      project.status === 'active' ? 'bg-emerald-400' :
                      project.status === 'paused' ? 'bg-amber-400' :
                      'bg-rose-400'
                    }`} />
                    {project.status}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Recent Activity */}
      <div className="mt-6 glass-card rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Recent Activity</h2>
        
        {dashboard.recentActivity.length === 0 ? (
          <EmptyState
            icon={Clock}
            title="No Activity Yet"
            description="Your activity timeline will appear here as you use QUALNEX."
          />
        ) : (
          <div className="space-y-2">
            {dashboard.recentActivity.map(item => (
              <div key={item.id} className="flex items-center gap-3 p-2">
                <Activity className="w-4 h-4 text-slate-500" />
                <span className="text-sm text-slate-300 flex-1">{item.message}</span>
                <span className="text-xs text-slate-500">{new Date(item.timestamp).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyState({ icon: Icon, title, description, action }: {
  icon: React.ElementType;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <div className="w-12 h-12 rounded-xl bg-navy-800 flex items-center justify-center mb-3">
        <Icon className="w-5 h-5 text-slate-500" />
      </div>
      <p className="text-sm font-medium text-slate-300 mb-1">{title}</p>
      <p className="text-xs text-slate-500 max-w-xs mb-3">{description}</p>
      {action}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colorMap: Record<string, string> = {
    completed: 'bg-emerald-400/10 text-emerald-400',
    testing: 'bg-cyan-400/10 text-cyan-400',
    building: 'bg-violet-400/10 text-violet-400',
    queued: 'bg-slate-400/10 text-slate-400',
    cancelled: 'bg-rose-400/10 text-rose-400',
    build_failed: 'bg-rose-400/10 text-rose-400',
  };

  return (
    <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${colorMap[status] || 'bg-slate-400/10 text-slate-400'}`}>
      {status.replace('_', ' ')}
    </span>
  );
}

function SeverityDot({ severity }: { severity: string }) {
  const colors: Record<string, string> = {
    critical: 'bg-rose-400',
    high: 'bg-amber-400',
    medium: 'bg-cyan-400',
    low: 'bg-slate-400',
  };
  return <div className={`w-2.5 h-2.5 rounded-full ${colors[severity] || 'bg-slate-400'}`} />;
}
