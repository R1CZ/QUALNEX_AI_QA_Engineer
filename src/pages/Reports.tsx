import React from 'react';
import { BarChart3, TrendingUp, Clock, Bug, FileCheck, PlayCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';

export default function Reports() {
  const { dashboard, qaRuns, bugs, qaCases } = useApp();

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Reports</h1>
        <p className="text-sm text-slate-400 mt-1">Analytics and quality metrics</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <SummaryCard icon={PlayCircle} label="Total Runs" value={qaRuns.length} color="cyan" />
        <SummaryCard icon={Bug} label="Total Bugs" value={bugs.length} color="amber" />
        <SummaryCard icon={FileCheck} label="QA Cases" value={qaCases.length} color="emerald" />
        <SummaryCard icon={Clock} label="Avg Duration" value="—" color="violet" />
      </div>

      {/* Charts area */}
      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        {/* Test Results Over Time */}
        <div className="glass-card rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Test Results Over Time</h2>
          <div className="h-48 flex items-center justify-center">
            <EmptyChart message="Run QA scans to see test result trends" />
          </div>
        </div>

        {/* Bug Severity Distribution */}
        <div className="glass-card rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Bug Severity Distribution</h2>
          <div className="h-48 flex items-center justify-center">
            {dashboard.validatedBugs === 0 ? (
              <EmptyChart message="No validated bugs to display" />
            ) : (
              <div className="w-full space-y-3">
                {Object.entries(dashboard.severityDistribution).map(([severity, count]) => (
                  <div key={severity} className="flex items-center gap-3">
                    <span className="text-xs text-slate-400 w-16 capitalize">{severity}</span>
                    <div className="flex-1 h-6 bg-navy-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          severity === 'critical' ? 'bg-rose-400' :
                          severity === 'high' ? 'bg-amber-400' :
                          severity === 'medium' ? 'bg-cyan-400' :
                          'bg-slate-400'
                        }`}
                        style={{ width: `${dashboard.validatedBugs > 0 ? (count / dashboard.validatedBugs) * 100 : 0}%` }}
                      />
                    </div>
                    <span className="text-xs text-white w-6 text-right">{count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bug Categories */}
      <div className="glass-card rounded-xl p-6 mb-6">
        <h2 className="text-lg font-semibold text-white mb-4">Bug Categories</h2>
        <div className="h-40 flex items-center justify-center">
          <EmptyChart message="Bug categories will appear after QA runs" />
        </div>
      </div>

      {/* Integration Delivery Stats */}
      <div className="glass-card rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Integration Delivery</h2>
        <div className="h-40 flex items-center justify-center">
          <EmptyChart message="Connect integrations to track delivery metrics" />
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value, color }: {
  icon: React.ElementType;
  label: string;
  value: number | string;
  color: string;
}) {
  const colorMap: Record<string, string> = {
    cyan: 'bg-cyan-500/10 text-cyan-400',
    violet: 'bg-violet-500/10 text-violet-400',
    amber: 'bg-amber-500/10 text-amber-400',
    emerald: 'bg-emerald-500/10 text-emerald-400',
  };

  return (
    <div className="glass-card rounded-xl p-5">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${colorMap[color]}`}>
        <Icon className="w-4.5 h-4.5" />
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="text-xs text-slate-400 mt-1">{label}</p>
    </div>
  );
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="text-center">
      <BarChart3 className="w-8 h-8 text-slate-600 mx-auto mb-2" />
      <p className="text-sm text-slate-500">{message}</p>
    </div>
  );
}
