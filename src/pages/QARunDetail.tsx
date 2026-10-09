import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft, PlayCircle, CheckCircle2, Clock, AlertTriangle,
  Loader2, Eye, Bug, FileCheck, Zap, Globe, Cpu,
  Monitor, Code, Terminal, ChevronRight, ExternalLink
} from 'lucide-react';
import { useApp } from '../context/AppContext';

const executionSteps = [
  { key: 'queued', label: 'Queued', description: 'Run added to execution queue', icon: Clock, duration: '~5s' },
  { key: 'preparing', label: 'Preparing Repository', description: 'Cloning repository and setting up environment', icon: Loader2, duration: '~15s' },
  { key: 'building', label: 'Building Application', description: 'Installing dependencies and building', icon: Cpu, duration: '~45s' },
  { key: 'preview', label: 'Starting Preview', description: 'Launching application in isolated container', icon: Monitor, duration: '~10s' },
  { key: 'discovering', label: 'Discovering Application', description: 'AI agent mapping routes, components, and APIs', icon: Eye, duration: '~30s' },
  { key: 'planning', label: 'Planning Tests', description: 'Generating test plan based on scope and app map', icon: Zap, duration: '~10s' },
  { key: 'testing', label: 'Executing Tests', description: 'Running browser and API tests via Playwright', icon: PlayCircle, duration: '~3min' },
  { key: 'analyzing', label: 'Analyzing Results', description: 'AI analyzing test outputs for potential defects', icon: Cpu, duration: '~30s' },
  { key: 'validating', label: 'Validating Findings', description: 'Reproducing and validating each potential bug', icon: AlertTriangle, duration: '~1min' },
  { key: 'deduplicating', label: 'Deduplicating', description: 'Removing duplicate findings', icon: CheckCircle2, duration: '~5s' },
  { key: 'delivering', label: 'Delivering QA Cases', description: 'Generating and delivering standardized QA cases', icon: FileCheck, duration: '~10s' },
  { key: 'completed', label: 'Completed', description: 'QA run finished successfully', icon: CheckCircle2, duration: '' },
];

export default function QARunDetail() {
  const { runId } = useParams<{ runId: string }>();
  const { qaRuns } = useApp();
  const run = qaRuns.find(r => r.id === runId);

  if (!run) {
    return (
      <div className="p-4 lg:p-8 max-w-5xl mx-auto">
        <div className="glass-card rounded-xl p-12 text-center">
          <PlayCircle className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-white mb-2">QA Run Not Found</h3>
          <p className="text-sm text-slate-400 mb-4">This QA run may have been removed or you don't have access.</p>
          <Link to="/app/qa-runs" className="text-sm text-cyan-400 hover:text-cyan-300">
            ← Back to QA Runs
          </Link>
        </div>
      </div>
    );
  }

  const currentStepIndex = executionSteps.findIndex(s => s.key === run.status);
  const isRunning = !['completed', 'cancelled', 'build_failed', 'preview_failed', 'environment_failed', 'timed_out'].includes(run.status);
  const isFailed = ['build_failed', 'preview_failed', 'environment_failed', 'timed_out'].includes(run.status);

  return (
    <div className="p-4 lg:p-8 max-w-5xl mx-auto">
      {/* Back link */}
      <Link to="/app/qa-runs" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Back to QA Runs
      </Link>

      {/* Header */}
      <div className="glass-card rounded-xl p-6 mb-6">
        <div className="flex items-start gap-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
            isRunning ? 'bg-cyan-500/10' : isFailed ? 'bg-rose-500/10' : 'bg-emerald-500/10'
          }`}>
            {isRunning ? (
              <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
            ) : isFailed ? (
              <AlertTriangle className="w-6 h-6 text-rose-400" />
            ) : (
              <CheckCircle2 className="w-6 h-6 text-emerald-400" />
            )}
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-white">{run.projectName}</h1>
            <p className="text-sm text-slate-400 mt-0.5">
              Started {new Date(run.startedAt).toLocaleString()}
              {run.completedAt && ` · Completed ${new Date(run.completedAt).toLocaleString()}`}
            </p>
            <div className="flex items-center gap-3 mt-3">
              <span className="text-xs text-slate-500">{run.testCount} tests executed</span>
              <span className="text-xs text-slate-500">·</span>
              <span className="text-xs text-slate-500">{run.findingsCount} findings</span>
              <span className="text-xs text-slate-500">·</span>
              <span className="text-xs text-emerald-400">{run.confirmedBugs} confirmed bugs</span>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        {isRunning && (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-cyan-400 font-medium">{run.currentStep}</span>
              <span className="text-xs text-slate-500">{run.progress}%</span>
            </div>
            <div className="h-2 bg-navy-800 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-cyan-500 to-violet-500 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${run.progress}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Execution Steps */}
      <div className="glass-card rounded-xl p-6 mb-6">
        <h2 className="text-lg font-semibold text-white mb-4">Execution Pipeline</h2>
        <div className="space-y-1">
          {executionSteps.map((step, index) => {
            const isComplete = index < currentStepIndex;
            const isCurrent = index === currentStepIndex && isRunning;
            const isPending = index > currentStepIndex;
            const Icon = step.icon;

            return (
              <motion.div
                key={step.key}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.03 }}
                className={`flex items-center gap-4 p-3 rounded-lg transition-colors ${
                  isCurrent ? 'bg-cyan-500/5 border border-cyan-500/20' :
                  isComplete ? 'opacity-70' : 'opacity-40'
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  isComplete ? 'bg-emerald-400/10' :
                  isCurrent ? 'bg-cyan-500/10' :
                  'bg-navy-800'
                }`}>
                  {isComplete ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : isCurrent ? (
                    <Icon className="w-4 h-4 text-cyan-400 animate-spin" />
                  ) : (
                    <Icon className="w-4 h-4 text-slate-600" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${isComplete ? 'text-slate-300' : isCurrent ? 'text-white' : 'text-slate-500'}`}>
                    {step.label}
                  </p>
                  <p className="text-xs text-slate-500 truncate">{step.description}</p>
                </div>
                {step.duration && (
                  <span className="text-xs text-slate-600 flex-shrink-0">{step.duration}</span>
                )}
                {isCurrent && (
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                    <span className="text-xs text-cyan-400">Active</span>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Results summary (for completed runs) */}
      {run.status === 'completed' && (
        <div className="grid sm:grid-cols-3 gap-4 mb-6">
          <div className="glass-card rounded-xl p-5">
            <div className="flex items-center gap-2 mb-2">
              <PlayCircle className="w-4 h-4 text-cyan-400" />
              <span className="text-xs text-slate-400">Tests Executed</span>
            </div>
            <p className="text-2xl font-bold text-white">{run.testCount}</p>
          </div>
          <div className="glass-card rounded-xl p-5">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span className="text-xs text-slate-400">Findings</span>
            </div>
            <p className="text-2xl font-bold text-white">{run.findingsCount}</p>
          </div>
          <div className="glass-card rounded-xl p-5">
            <div className="flex items-center gap-2 mb-2">
              <Bug className="w-4 h-4 text-rose-400" />
              <span className="text-xs text-slate-400">Confirmed Bugs</span>
            </div>
            <p className="text-2xl font-bold text-white">{run.confirmedBugs}</p>
          </div>
        </div>
      )}

      {/* Failure diagnostics */}
      {isFailed && (
        <div className="glass-card rounded-xl p-6 border border-rose-500/20 mb-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold text-rose-400 mb-1">
                {run.status === 'build_failed' && 'Build Failed'}
                {run.status === 'preview_failed' && 'Preview Failed'}
                {run.status === 'environment_failed' && 'Environment Failed'}
                {run.status === 'timed_out' && 'Execution Timed Out'}
              </h3>
              <p className="text-xs text-slate-400 mb-3">
                The {run.status.replace('_', ' ')} stage encountered an error. Check the logs below for details.
              </p>
              <div className="bg-navy-950 rounded-lg p-3 font-mono text-xs text-slate-400 border border-navy-700/50">
                <p className="text-rose-400">ERROR: Stage "{run.currentStep}" failed</p>
                <p className="text-slate-500 mt-1">Exit code: 1</p>
                <p className="text-slate-500">Timestamp: {new Date().toISOString()}</p>
                <p className="text-slate-500 mt-2">Full build logs available in the execution artifacts.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* QA Scope used */}
      <div className="glass-card rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">QA Configuration</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {Object.entries(run.config).map(([category, items]) => (
            <div key={category} className="p-3 rounded-lg bg-navy-800/50 border border-navy-700/30">
              <p className="text-xs font-medium text-slate-400 capitalize mb-2">{category}</p>
              {(items as string[]).length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {(items as string[]).map((item: string) => (
                    <span key={item} className="text-xs px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400">
                      {item}
                    </span>
                  ))}
                </div>
              ) : (
                <span className="text-xs text-slate-600">None selected</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
