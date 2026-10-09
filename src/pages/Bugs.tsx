import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Bug, Search, Filter, AlertTriangle, CheckCircle2,
  Eye, Clock, XCircle, ChevronDown, ExternalLink
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import type { BugStatus, BugSeverity } from '../types';

export default function Bugs() {
  const { bugs } = useApp();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');

  const filtered = bugs.filter(bug => {
    const matchesSearch = bug.title.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || bug.status === statusFilter;
    const matchesSeverity = severityFilter === 'all' || bug.severity === severityFilter;
    return matchesSearch && matchesStatus && matchesSeverity;
  });

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Bugs</h1>
          <p className="text-sm text-slate-400 mt-1">Detected and validated software defects</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search bugs..."
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
          <option value="suspected">Suspected</option>
          <option value="investigating">Investigating</option>
          <option value="confirmed">Confirmed</option>
          <option value="duplicate">Duplicate</option>
          <option value="not_reproducible">Not Reproducible</option>
          <option value="false_positive">False Positive</option>
        </select>
        <select
          value={severityFilter}
          onChange={e => setSeverityFilter(e.target.value)}
          className="px-3 py-2.5 bg-navy-800 border border-navy-700 rounded-lg text-sm text-white focus:outline-none focus:border-cyan-500/50"
        >
          <option value="all">All Severities</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </div>

      {/* Bug lifecycle info */}
      <div className="glass-card rounded-xl p-4 mb-6 border-l-2 border-l-cyan-500/50">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-cyan-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm text-slate-300 font-medium">Bug Validation Lifecycle</p>
            <p className="text-xs text-slate-500 mt-1">
              Findings follow: Suspected → Investigating → Reproduce → Collect Evidence → Validate → Deduplicate → Classify.
              Only validated findings with sufficient evidence are marked as Confirmed.
            </p>
          </div>
        </div>
      </div>

      {/* Bugs list */}
      {filtered.length === 0 ? (
        <div className="glass-card rounded-xl p-12 text-center">
          <div className="w-16 h-16 rounded-xl bg-navy-800 flex items-center justify-center mx-auto mb-4">
            <Bug className="w-7 h-7 text-slate-500" />
          </div>
          <h3 className="text-lg font-medium text-white mb-2">
            {search || statusFilter !== 'all' || severityFilter !== 'all'
              ? 'No matching bugs'
              : 'No bugs detected yet'}
          </h3>
          <p className="text-sm text-slate-400 max-w-md mx-auto">
            {search || statusFilter !== 'all' || severityFilter !== 'all'
              ? 'Try adjusting your filters.'
              : 'Run a QA scan on your project to detect and validate software defects. Each finding is reproduced and validated before being confirmed.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((bug, index) => (
            <motion.div
              key={bug.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="glass-card rounded-xl p-5 hover:border-cyan-500/20 transition-colors"
            >
              <div className="flex items-start gap-4">
                <SeverityIndicator severity={bug.severity} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-semibold text-white truncate">{bug.title}</h3>
                    <StatusBadge status={bug.status} />
                    <ConfidenceBadge confidence={bug.confidence} />
                  </div>
                  <p className="text-xs text-slate-400 mb-2 line-clamp-2">{bug.description}</p>
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Eye className="w-3 h-3" />
                      {bug.page}
                    </span>
                    <span>{bug.route}</span>
                    <span>{bug.category}</span>
                    {bug.evidence.length > 0 && (
                      <span className="flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        {bug.evidence.length} evidence
                      </span>
                    )}
                  </div>
                </div>
                {bug.externalIssueUrl && (
                  <a
                    href={bug.externalIssueUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 flex-shrink-0"
                  >
                    <ExternalLink className="w-3 h-3" />
                    View
                  </a>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

function SeverityIndicator({ severity }: { severity: BugSeverity }) {
  const colors: Record<BugSeverity, string> = {
    critical: 'bg-rose-400',
    high: 'bg-amber-400',
    medium: 'bg-cyan-400',
    low: 'bg-slate-400',
  };
  return (
    <div className={`w-2 h-10 rounded-full ${colors[severity]} flex-shrink-0`} />
  );
}

function StatusBadge({ status }: { status: BugStatus }) {
  const config: Record<BugStatus, { color: string; label: string }> = {
    suspected: { color: 'bg-slate-400/10 text-slate-400', label: 'Suspected' },
    investigating: { color: 'bg-violet-400/10 text-violet-400', label: 'Investigating' },
    confirmed: { color: 'bg-emerald-400/10 text-emerald-400', label: 'Confirmed' },
    duplicate: { color: 'bg-amber-400/10 text-amber-400', label: 'Duplicate' },
    not_reproducible: { color: 'bg-slate-400/10 text-slate-500', label: 'Not Reproducible' },
    false_positive: { color: 'bg-rose-400/10 text-rose-400', label: 'False Positive' },
  };
  const { color, label } = config[status];
  return <span className={`text-xs px-2 py-0.5 rounded-full ${color}`}>{label}</span>;
}

function ConfidenceBadge({ confidence }: { confidence: string }) {
  const colors: Record<string, string> = {
    high: 'text-emerald-400',
    medium: 'text-amber-400',
    low: 'text-slate-400',
  };
  return (
    <span className={`text-xs ${colors[confidence] || 'text-slate-400'}`}>
      {confidence} confidence
    </span>
  );
}
