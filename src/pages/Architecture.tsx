import React from 'react';
import { motion } from 'framer-motion';
import {
  Server, Database, Cpu, Globe, Shield, Layers,
  GitBranch, Bot, Monitor, Cloud, ArrowDown,
  CheckCircle2, AlertTriangle, Zap, Lock
} from 'lucide-react';

const layers = [
  {
    name: 'Frontend',
    tech: 'Next.js + React + TypeScript + Tailwind CSS',
    icon: Globe,
    color: 'from-cyan-400 to-cyan-500',
    items: ['Landing Page', 'Authentication UI', 'Dashboard', 'Project Management', 'QA Run Monitor', 'Bug Viewer', 'Reports', 'Settings'],
  },
  {
    name: 'API Gateway',
    tech: 'FastAPI + Pydantic + JWT Auth',
    icon: Server,
    color: 'from-violet-400 to-violet-500',
    items: ['REST API', 'WebSocket (Real-time)', 'OAuth 2.0', 'Rate Limiting', 'RBAC Authorization', 'Audit Logging'],
  },
  {
    name: 'Background Workers',
    tech: 'Redis Queue + Async Workers',
    icon: Cpu,
    color: 'from-amber-400 to-amber-500',
    items: ['QA Run Executor', 'Build Worker', 'Browser Worker', 'Discovery Worker', 'Delivery Worker'],
  },
  {
    name: 'AI Orchestration',
    tech: 'Qwen (Primary) + Provider Abstraction',
    icon: Bot,
    color: 'from-emerald-400 to-emerald-500',
    items: ['Discovery Agent', 'Planning Agent', 'Browser QA Agent', 'API QA Agent', 'Validation Agent', 'Dedup Agent', 'QA Case Agent'],
  },
  {
    name: 'Execution Sandbox',
    tech: 'Docker + Playwright + Network Isolation',
    icon: Shield,
    color: 'from-rose-400 to-rose-500',
    items: ['Container Isolation', 'Non-root Execution', 'Network Restrictions', 'Resource Limits', 'SSRF Protection', 'Ephemeral Storage'],
  },
  {
    name: 'Data Layer',
    tech: 'PostgreSQL + Redis + S3-compatible Storage',
    icon: Database,
    color: 'from-blue-400 to-blue-500',
    items: ['Users & Organizations', 'Projects & Runs', 'Findings & QA Cases', 'App Maps', 'Audit Logs', 'Artifacts'],
  },
  {
    name: 'Integrations',
    tech: 'Universal Adapter Pattern',
    icon: Layers,
    color: 'from-indigo-400 to-indigo-500',
    items: ['Jira', 'GitHub Issues', 'Linear', 'Azure DevOps', 'ServiceNow'],
  },
];

const securityControls = [
  { name: 'OAuth 2.0 (Google/GitHub)', icon: Lock, status: 'designed' },
  { name: 'JWT Session Management', icon: Lock, status: 'designed' },
  { name: 'RBAC (Owner/Admin/Member/Viewer)', icon: Shield, status: 'designed' },
  { name: 'Tenant Isolation', icon: Shield, status: 'designed' },
  { name: 'Docker Container Sandboxing', icon: Shield, status: 'designed' },
  { name: 'SSRF Protection', icon: AlertTriangle, status: 'designed' },
  { name: 'AI Prompt Injection Defense', icon: Bot, status: 'designed' },
  { name: 'Encrypted Credential Storage', icon: Lock, status: 'designed' },
  { name: 'Audit Logging', icon: CheckCircle2, status: 'designed' },
  { name: 'Rate Limiting', icon: Zap, status: 'designed' },
  { name: 'CSP + Security Headers', icon: Shield, status: 'designed' },
  { name: 'Secret Scanning (CI/CD)', icon: CheckCircle2, status: 'designed' },
];

export default function Architecture() {
  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">System Architecture</h1>
        <p className="text-sm text-slate-400 mt-1">
          Complete technical architecture of the QUALNEX platform
        </p>
      </div>

      {/* Architecture Layers */}
      <div className="space-y-4 mb-12">
        {layers.map((layer, index) => {
          const Icon = layer.icon;
          return (
            <motion.div
              key={layer.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.08 }}
              className="glass-card rounded-xl p-5"
            >
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${layer.color} flex items-center justify-center flex-shrink-0`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="text-base font-semibold text-white">{layer.name}</h3>
                    <span className="text-xs text-slate-500 font-mono">{layer.tech}</span>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {layer.items.map(item => (
                      <span
                        key={item}
                        className="text-xs px-2.5 py-1 rounded-lg bg-navy-800 border border-navy-700/50 text-slate-300"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              {index < layers.length - 1 && (
                <div className="flex justify-center mt-3">
                  <ArrowDown className="w-4 h-4 text-slate-600" />
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Data Flow */}
      <div className="glass-card rounded-xl p-6 mb-8">
        <h2 className="text-lg font-semibold text-white mb-4">QA Run Data Flow</h2>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {[
            'Connect GitHub',
            'Clone Repository',
            'Detect Stack',
            'Install Dependencies',
            'Build Application',
            'Start Preview',
            'Health Check',
            'AI Discovery',
            'Generate App Map',
            'Plan Tests',
            'Execute Browser Tests',
            'Execute API Tests',
            'AI Analysis',
            'Validate Findings',
            'Collect Evidence',
            'Deduplicate',
            'Classify Severity',
            'Generate QA Case',
            'Deliver to Integration',
          ].map((step, i) => (
            <React.Fragment key={step}>
              <span className="px-2.5 py-1 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 whitespace-nowrap">
                {step}
              </span>
              {i < 18 && <span className="text-slate-600">→</span>}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Security Controls */}
      <div className="glass-card rounded-xl p-6 mb-8">
        <h2 className="text-lg font-semibold text-white mb-4">Security Controls</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {securityControls.map(control => {
            const Icon = control.icon;
            return (
              <div
                key={control.name}
                className="flex items-center gap-3 p-3 rounded-lg bg-navy-800/50 border border-navy-700/30"
              >
                <Icon className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span className="text-xs text-slate-300">{control.name}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tech Stack Summary */}
      <div className="glass-card rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Technology Stack</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StackSection title="Frontend" items={['TypeScript', 'React 18', 'Next.js', 'Tailwind CSS', 'Framer Motion']} />
          <StackSection title="Backend" items={['Python 3.12', 'FastAPI', 'SQLAlchemy', 'Pydantic', 'httpx']} />
          <StackSection title="Infrastructure" items={['Docker', 'PostgreSQL 16', 'Redis 7', 'MinIO (S3)', 'GitHub Actions']} />
          <StackSection title="QA Engine" items={['Playwright', 'Qwen AI', 'Chromium', 'Container Sandbox', 'WebSocket/SSE']} />
        </div>
      </div>

      {/* Deployment */}
      <div className="mt-8 glass-card rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Deployment Architecture</h2>
        <div className="grid sm:grid-cols-2 gap-6">
          <div>
            <h3 className="text-sm font-medium text-cyan-400 mb-2">Development</h3>
            <pre className="text-xs text-slate-400 bg-navy-950 rounded-lg p-3 overflow-x-auto border border-navy-700/50">
{`docker-compose up
# Starts: frontend, api, worker,
# postgres, redis, minio`}
            </pre>
          </div>
          <div>
            <h3 className="text-sm font-medium text-cyan-400 mb-2">Production</h3>
            <pre className="text-xs text-slate-400 bg-navy-950 rounded-lg p-3 overflow-x-auto border border-navy-700/50">
{`Frontend → Netlify/Vercel
API → Kubernetes/Docker Swarm
Workers → Auto-scaling pods
DB → Managed PostgreSQL
Redis → Managed Redis
Storage → S3/GCS`}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}

function StackSection({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h3 className="text-sm font-medium text-slate-300 mb-2">{title}</h3>
      <div className="space-y-1">
        {items.map(item => (
          <div key={item} className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-cyan-500/60" />
            <span className="text-xs text-slate-400">{item}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
