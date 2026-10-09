import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  FileCheck, Search, ExternalLink, ArrowUpRight,
  CheckCircle2, Clock, AlertTriangle
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export default function QACases() {
  const { qaCases } = useApp();
  const [search, setSearch] = useState('');

  const filtered = qaCases.filter(c =>
    c.title.toLowerCase().includes(search.toLowerCase()) ||
    c.caseNumber.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">QA Cases</h1>
          <p className="text-sm text-slate-400 mt-1">Standardized quality assurance cases ready for delivery</p>
        </div>
      </div>

      {/* Info banner */}
      <div className="glass-card rounded-xl p-4 mb-6 border-l-2 border-l-emerald-500/50">
        <div className="flex items-start gap-3">
          <FileCheck className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm text-slate-300 font-medium">QA Case Format</p>
            <p className="text-xs text-slate-500 mt-1">
              Each QA case includes: title, severity, priority, category, reproduction steps, expected vs actual results,
              evidence, confidence score, and technical context. Cases are platform-neutral and can be delivered to any issue tracker.
            </p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <input
          type="text"
          placeholder="Search QA cases..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-navy-800 border border-navy-700 rounded-lg text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/50"
        />
      </div>

      {/* Cases list */}
      {filtered.length === 0 ? (
        <div className="glass-card rounded-xl p-12 text-center">
          <div className="w-16 h-16 rounded-xl bg-navy-800 flex items-center justify-center mx-auto mb-4">
            <FileCheck className="w-7 h-7 text-slate-500" />
          </div>
          <h3 className="text-lg font-medium text-white mb-2">
            {search ? 'No matching QA cases' : 'No QA cases yet'}
          </h3>
          <p className="text-sm text-slate-400 max-w-md mx-auto">
            {search
              ? 'Try a different search term.'
              : 'QA cases are generated after validated bugs are confirmed. Run a QA scan to generate cases that can be delivered to your issue tracker.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((qaCase, index) => (
            <motion.div
              key={qaCase.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="glass-card rounded-xl p-5 hover:border-cyan-500/20 transition-colors"
            >
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                  <FileCheck className="w-5 h-5 text-emerald-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono text-cyan-400">{qaCase.caseNumber}</span>
                    <SeverityBadge severity={qaCase.severity} />
                    <span className="text-xs text-slate-500">{qaCase.priority}</span>
                  </div>
                  <h3 className="text-sm font-semibold text-white mb-2">{qaCase.title}</h3>
                  <div className="flex items-center gap-3 text-xs text-slate-500 mb-3">
                    <span>{qaCase.page}</span>
                    <span>·</span>
                    <span>{qaCase.route}</span>
                    <span>·</span>
                    <span>{qaCase.category}</span>
                  </div>
                  
                  {/* Expected vs Actual */}
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="p-2.5 rounded-lg bg-navy-800/50 border border-navy-700/30">
                      <p className="text-xs text-emerald-400 font-medium mb-1">Expected</p>
                      <p className="text-xs text-slate-300 line-clamp-2">{qaCase.expectedResult}</p>
                    </div>
                    <div className="p-2.5 rounded-lg bg-navy-800/50 border border-navy-700/30">
                      <p className="text-xs text-rose-400 font-medium mb-1">Actual</p>
                      <p className="text-xs text-slate-300 line-clamp-2">{qaCase.actualResult}</p>
                    </div>
                  </div>

                  {/* Delivery status */}
                  <div className="flex items-center gap-3">
                    {qaCase.deliveredTo ? (
                      <span className="flex items-center gap-1.5 text-xs text-emerald-400">
                        <CheckCircle2 className="w-3 h-3" />
                        Delivered to {qaCase.deliveredTo}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-xs text-amber-400">
                        <Clock className="w-3 h-3" />
                        Pending delivery
                      </span>
                    )}
                    {qaCase.externalIssueUrl && (
                      <a
                        href={qaCase.externalIssueUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300"
                      >
                        <ExternalLink className="w-3 h-3" />
                        {qaCase.externalIssueId}
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

function SeverityBadge({ severity }: { severity: string }) {
  const colors: Record<string, string> = {
    critical: 'bg-rose-400/10 text-rose-400',
    high: 'bg-amber-400/10 text-amber-400',
    medium: 'bg-cyan-400/10 text-cyan-400',
    low: 'bg-slate-400/10 text-slate-400',
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${colors[severity] || 'bg-slate-400/10 text-slate-400'}`}>
      {severity}
    </span>
  );
}
