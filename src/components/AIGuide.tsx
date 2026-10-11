import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Sparkles, X, ChevronLeft, ChevronRight, CheckCircle2, Circle,
  Github, GitBranch, Plug, FolderKanban, BrainCircuit, PlayCircle,
  Bug, FileCheck, ExternalLink
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getCurrentGitHubAccount } from '../lib/github';

interface GuideStep {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  action?: { label: string; to: string };
  /** Returns true when this step is already satisfied by real app state. */
  done: (ctx: GuideContext) => boolean;
  doneLabel: string;
  pendingLabel: string;
}

interface GuideContext {
  githubConnected: boolean;
  repoCount: number;
  jiraConnected: boolean;
  projectCount: number;
  runCount: number;
  completedRunCount: number;
  bugCount: number;
  deliveredCaseCount: number;
}

const steps: GuideStep[] = [
  {
    id: 'connect-github',
    title: 'Connect your GitHub account',
    icon: Github,
    description:
      'Sign in with GitHub (your account is connected automatically), or sign in with Google and use "Connect GitHub" on the Repositories page. QUALNEX requests read-only repository access so it can list what you are authorized to test.',
    action: { label: 'Go to Repositories', to: '/app/repositories' },
    done: ctx => ctx.githubConnected,
    doneLabel: 'GitHub account connected',
    pendingLabel: 'Not connected yet',
  },
  {
    id: 'authorize-repos',
    title: 'Authorize GitHub & load repositories',
    icon: GitBranch,
    description:
      'After authorizing, your available repositories are fetched from GitHub and listed under Repositories. The page shows exactly which GitHub account (@username) is being authorized. Use Refresh any time to reload the list.',
    action: { label: 'Open Repositories', to: '/app/repositories' },
    done: ctx => ctx.repoCount > 0,
    doneLabel: 'Repositories loaded',
    pendingLabel: 'No repositories loaded yet',
  },
  {
    id: 'connect-jira',
    title: 'Connect an integration platform (e.g. Jira)',
    icon: Plug,
    description:
      'Generated QA test cases are delivered automatically to your connected platform. Open Integrations, choose Jira (or Linear / Azure DevOps / ServiceNow) and provide your workspace credentials so findings land in the right project.',
    action: { label: 'Open Integrations', to: '/app/integrations' },
    done: ctx => ctx.jiraConnected,
    doneLabel: 'Jira connected',
    pendingLabel: 'No delivery platform connected (optional but recommended)',
  },
  {
    id: 'create-project',
    title: 'Create a new project',
    icon: FolderKanban,
    description:
      'Click "New Project" under Projects. The form has three fields only: Project Name, Repository (a dropdown of your GitHub repositories) and AI Model. Make sure GitHub is connected first so the dropdown is populated.',
    action: { label: 'Go to Projects', to: '/app/projects' },
    done: ctx => ctx.projectCount > 0,
    doneLabel: 'Projects created',
    pendingLabel: 'No projects yet',
  },
  {
    id: 'start-testing',
    title: 'Select an AI model and start testing',
    icon: BrainCircuit,
    description:
      'Pick DeepSeek V3 for fast standard scans or DeepSeek R1 for deep reasoning on complex codebases, then press "Start Testing". QUALNEX creates the project, queues a QA run and the AI begins scanning the selected repository.',
    action: { label: 'Go to Projects', to: '/app/projects' },
    done: ctx => ctx.runCount > 0,
    doneLabel: 'QA runs started',
    pendingLabel: 'No QA run started yet',
  },
  {
    id: 'monitor-runs',
    title: 'Monitor QA Runs',
    icon: PlayCircle,
    description:
      'The QA Runs section tracks every run through the pipeline (preparing → building → preview → discovering → planning → testing → analyzing → validating → deduplicating → delivering). Unread runs appear as a badge count on the QA Runs menu item; opening the page clears it.',
    action: { label: 'Open QA Runs', to: '/app/qa-runs' },
    done: ctx => ctx.completedRunCount > 0,
    doneLabel: 'Runs have completed',
    pendingLabel: 'Waiting for a run to complete',
  },
  {
    id: 'review-bugs',
    title: 'Review bugs found by the AI',
    icon: Bug,
    description:
      'When testing identifies issues, they appear under Bugs with severity, confidence, reproduction steps and evidence (screenshots, console/network logs). Only validated, deduplicated findings are shown — organized and free of duplicates.',
    action: { label: 'Open Bugs', to: '/app/bugs' },
    done: ctx => ctx.bugCount > 0,
    doneLabel: 'Bugs captured from runs',
    pendingLabel: 'No bugs recorded yet (appears after a run finds issues)',
  },
  {
    id: 'delivered-cases',
    title: 'Generated test cases in your connected platform',
    icon: FileCheck,
    description:
      'After results are available, the AI generates clean, structured test cases from the identified issues and delivers them automatically to the connected platform (e.g. created in your Jira project). Track them under QA Cases — each entry links to its external issue.',
    action: { label: 'Open QA Cases', to: '/app/qa-cases' },
    done: ctx => ctx.deliveredCaseCount > 0,
    doneLabel: 'Test cases delivered externally',
    pendingLabel: 'No delivered cases yet (created automatically after runs)',
  },
];

export default function AIGuide({ onClose }: { onClose: () => void }) {
  const { projects, qaRuns, bugs, qaCases, integrations, repositories, user } = useApp();
  const [index, setIndex] = useState(0);

  // Start on the first incomplete step so the guide is contextual.
  useEffect(() => {
    const ctx = buildCtx();
    const firstPending = steps.findIndex(s => !s.done(ctx));
    if (firstPending >= 0) setIndex(firstPending);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const buildCtx = (): GuideContext => ({
      githubConnected: user?.githubAccount != null || !!getCurrentGitHubAccount() || repositories.length > 0,
      repoCount: repositories.length,
      jiraConnected: integrations.some(i => i.vendor === 'jira' && i.connected),
      projectCount: projects.length,
      runCount: qaRuns.length,
      completedRunCount: qaRuns.filter(r => r.status === 'completed').length,
      bugCount: bugs.length,
      deliveredCaseCount: qaCases.filter(c => c.externalIssueId || c.deliveredTo).length,
  });

  const ctx = useMemo(buildCtx, [repositories, integrations, projects, qaRuns, bugs, qaCases]);
  const step = steps[index];
  const Icon = step.icon;
  const isDone = step.done(ctx);
  const completedCount = steps.filter(s => s.done(ctx)).length;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        role="dialog"
        aria-modal="true"
        aria-label="AI Guide walkthrough"
        className="relative w-full max-w-xl glass-card rounded-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-navy-700/50 bg-navy-900/60">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-violet-500 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1">
            <h2 className="text-sm font-semibold text-white">AI Guide — Getting started with QUALNEX</h2>
            <p className="text-xs text-slate-400">
              Step {index + 1} of {steps.length} · {completedCount}/{steps.length} setup steps complete
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close guide"
            className="text-slate-400 hover:text-white transition-colors p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-navy-800">
          <div
            className="h-full bg-gradient-to-r from-cyan-500 to-violet-500 transition-all duration-300"
            style={{ width: `${((index + 1) / steps.length) * 100}%` }}
          />
        </div>

        {/* Step content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={step.id}
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.18 }}
            className="px-6 py-5"
          >
            <div className="flex items-start gap-4">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${
                isDone ? 'bg-emerald-400/10' : 'bg-cyan-500/10'
              }`}>
                <Icon className={`w-5 h-5 ${isDone ? 'text-emerald-400' : 'text-cyan-400'}`} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-semibold text-white">{step.title}</h3>
                <p className="text-sm text-slate-400 mt-1.5 leading-relaxed">{step.description}</p>

                <div className={`mt-3 inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full ${
                  isDone ? 'bg-emerald-400/10 text-emerald-400' : 'bg-amber-400/10 text-amber-400'
                }`}>
                  {isDone ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Circle className="w-3.5 h-3.5" />}
                  {isDone ? `Done — ${step.doneLabel}` : `Pending — ${step.pendingLabel}`}
                </div>

                {step.action && (
                  <Link
                    to={step.action.to}
                    onClick={onClose}
                    className="mt-4 flex items-center gap-1.5 text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                    {step.action.label}
                  </Link>
                )}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Step dots */}
        <div className="flex items-center justify-center gap-1.5 px-6 pb-2">
          {steps.map((s, i) => (
            <button
              key={s.id}
              onClick={() => setIndex(i)}
              aria-label={`Go to step ${i + 1}: ${s.title}`}
              className={`w-2 h-2 rounded-full transition-colors ${
                i === index ? 'bg-cyan-400' : s.done(ctx) ? 'bg-emerald-400/60' : 'bg-navy-600'
              }`}
            />
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-navy-700/50">
          <button
            onClick={() => setIndex(i => Math.max(0, i - 1))}
            disabled={index === 0}
            className="flex items-center gap-1 px-3 py-1.5 text-sm text-slate-400 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-4 h-4" /> Back
          </button>
          {index < steps.length - 1 ? (
            <button
              onClick={() => setIndex(i => Math.min(steps.length - 1, i + 1))}
              className="flex items-center gap-1 px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-navy-950 text-sm font-medium rounded-lg transition-colors"
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={onClose}
              className="flex items-center gap-1 px-4 py-2 bg-emerald-400 hover:bg-emerald-300 text-navy-950 text-sm font-medium rounded-lg transition-colors"
            >
              Finish <CheckCircle2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
