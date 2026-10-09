import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  PlayCircle, Search, Filter, Clock, CheckCircle2,
  XCircle, Loader2, AlertTriangle, ChevronRight, Eye
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import type { RunStatus } from '../types';

const runSteps = [
  { key: 'queued', label: 'Queued', icon: Clock },
  { key: 'preparing', label: 'Preparing Repository', icon: Loader2 },
  { key: 'building', label: 'Building Application', icon: Loader2 },
  { key: 'preview', label: 'Starting Preview', icon: Loader2 },
  { key: 'discovering', label: 'Discovering Application', icon: Eye },
  { key: 'planning', label: 'Planning Tests', icon: Loader2 },
  { key: 'testing', label: 'Executing Tests', icon: PlayCircle },
  { key: 'analyzing', label: 'Analyzing Results', icon: Loader2 },
  { key: 'validating', label: 'Validating Findings', icon: AlertTriangle },
  { key: 'deduplicating', label: 'Deduplicating', icon: Loader2 },
  { key: 'delivering', label: 'Delivering QA Cases', icon: CheckCircle2 },
  { key: 'completed', label: 'Completed', icon: CheckCircle2 },
];

export default function QARuns() {
  const { qaRuns } = useApp();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filtered = qaRuns.filter(run => {
    const matchesSearch = run.projectName.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || run.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">QA Runs</h1>
          <p className="text-sm text-slate-400 mt-1">Monitor and manage your quality assurance executions</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search runs..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-navy-800 border border-navy-700 rounded-lg text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/50"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-2.5 bg-navy-800 border border-navy-700 rounded-lg text-sm text-white focus:outline-none focus:border-cyan-500/50"
        >
          <option value="all">All Statuses</option>
          <option value="queued">Queued</option>
          <option value="testing">Testing</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
          <option value="build_failed">Build Failed</option>
        </select>
      </div>

      {/* Runs list */}
      {filtered.length === 0 ? (
        <div className="glass-card rounded-xl p-12 text-center">
          <div className="w-16 h-16 rounded-xl bg-navy-800 flex items-center justify-center mx-auto mb-4">
            <PlayCircle className="w-7 h-7 text-slate-500" />
          </div>
          <h3 className="text-lg font-medium text-white mb-2">No QA Runs</h3>
          <p className="text-sm text-slate-400 max-w-md mx-auto">
            {search || statusFilter !== 'all'
              ? 'No runs match your filters.'
              : 'Start a QA run from a project to see execution results here. Each run discovers, tests, and validates your application.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((run, index) => (
            <motion.div
              key={run.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="glass-card rounded-xl p-5"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                  <PlayCircle className="w-5 h-5 text-cyan-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-white">{run.projectName}</p>
                    <RunStatusBadge status={run.status} />
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Started {new Date(run.startedAt).toLocaleString()}
                    {run.completedAt && ` · Completed ${new Date(run.completedAt).toLocaleString()}`}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-white">{run.testCount} tests</p>
                  <p className="text-xs text-slate-500">{run.findingsCount} findings</p>
                </div>
              </div>

              {/* Progress */}
              {run.status !== 'queued' && run.status !== 'completed' && (
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-slate-400">{run.currentStep}</span>
                    <span className="text-xs text-slate-500">{run.progress}%</span>
                  </div>
                  <div className="h-1.5 bg-navy-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-500 to-violet-500 rounded-full transition-all duration-500"
                      style={{ width: `${run.progress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Steps visualization */}
              <div className="flex items-center gap-1 overflow-x-auto pb-1">
                {runSteps.map((step, i) => {
                  const stepIndex = runSteps.findIndex(s => s.key === run.status);
                  const isComplete = i < stepIndex;
                  const isCurrent = i === stepIndex;
                  const StepIcon = step.icon;
                  
                  return (
                    <div key={step.key} className="flex items-center">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                        isComplete ? 'bg-emerald-400/20 text-emerald-400' :
                        isCurrent ? 'bg-cyan-500/20 text-cyan-400' :
                        'bg-navy-800 text-slate-600'
                      }`}>
                        {isComplete ? (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        ) : (
                          <StepIcon className={`w-3 h-3 ${isCurrent ? 'animate-spin' : ''}`} />
                        )}
                      </div>
                      {i < runSteps.length - 1 && (
                        <div className={`w-4 h-0.5 ${isComplete ? 'bg-emerald-400/40' : 'bg-navy-700'}`} />
                      )}
                    </div>
                  );
                })}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

function RunStatusBadge({ status }: { status: RunStatus }) {
  const config: Record<string, { color: string; label: string }> = {
    queued: { color: 'bg-slate-400/10 text-slate-400', label: 'Queued' },
    preparing: { color: 'bg-violet-400/10 text-violet-400', label: 'Preparing' },
    building: { color: 'bg-violet-400/10 text-violet-400', label: 'Building' },
    preview: { color: 'bg-blue-400/10 text-blue-400', label: 'Preview' },
    discovering: { color: 'bg-cyan-400/10 text-cyan-400', label: 'Discovering' },
    planning: { color: 'bg-cyan-400/10 text-cyan-400', label: 'Planning' },
    testing: { color: 'bg-cyan-400/10 text-cyan-400', label: 'Testing' },
    analyzing: { color: 'bg-amber-400/10 text-amber-400', label: 'Analyzing' },
    validating: { color: 'bg-amber-400/10 text-amber-400', label: 'Validating' },
    deduplicating: { color: 'bg-amber-400/10 text-amber-400', label: 'Deduplicating' },
    delivering: { color: 'bg-emerald-400/10 text-emerald-400', label: 'Delivering' },
    completed: { color: 'bg-emerald-400/10 text-emerald-400', label: 'Completed' },
    build_failed: { color: 'bg-rose-400/10 text-rose-400', label: 'Build Failed' },
    preview_failed: { color: 'bg-rose-400/10 text-rose-400', label: 'Preview Failed' },
    environment_failed: { color: 'bg-rose-400/10 text-rose-400', label: 'Environment Failed' },
    partial: { color: 'bg-amber-400/10 text-amber-400', label: 'Partial' },
    cancelled: { color: 'bg-rose-400/10 text-rose-400', label: 'Cancelled' },
    timed_out: { color: 'bg-rose-400/10 text-rose-400', label: 'Timed Out' },
  };

  const { color, label } = config[status] || { color: 'bg-slate-400/10 text-slate-400', label: status };

  return (
    <span className={`text-xs px-2 py-0.5 rounded-full ${color}`}>{label}</span>
  );
}
