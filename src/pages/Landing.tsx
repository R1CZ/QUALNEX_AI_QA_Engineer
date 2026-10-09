import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Zap, ArrowRight, GitBranch, Cpu, Map, TestTube,
  Bug, FileCheck, ArrowDown, Shield, Clock, Layers
} from 'lucide-react';

const workflowSteps = [
  { icon: GitBranch, label: 'GitHub', color: 'from-slate-400 to-slate-500' },
  { icon: Layers, label: 'Repository', color: 'from-blue-400 to-blue-500' },
  { icon: Cpu, label: 'AI Analysis', color: 'from-violet-400 to-violet-500' },
  { icon: Map, label: 'App Map', color: 'from-cyan-400 to-cyan-500' },
  { icon: TestTube, label: 'Testing', color: 'from-emerald-400 to-emerald-500' },
  { icon: Bug, label: 'Bug Detection', color: 'from-amber-400 to-amber-500' },
  { icon: FileCheck, label: 'QA Case', color: 'from-rose-400 to-rose-500' },
  { icon: Zap, label: 'Deliver', color: 'from-cyan-400 to-violet-500' },
];

const features = [
  {
    icon: Cpu,
    title: 'Autonomous Discovery',
    description: 'AI agents automatically map your application structure, routes, components, and workflows.',
  },
  {
    icon: TestTube,
    title: 'Intelligent Testing',
    description: 'Browser and API testing powered by AI that understands your application context.',
  },
  {
    icon: Bug,
    title: 'Validated Bugs',
    description: 'Every finding is reproduced, validated with evidence, and deduplicated before delivery.',
  },
  {
    icon: Shield,
    title: 'Secure Execution',
    description: 'Isolated container environments with hardened security for untrusted code execution.',
  },
  {
    icon: Clock,
    title: 'Real-Time Progress',
    description: 'Watch your QA runs execute in real-time with live status updates and diagnostics.',
  },
  {
    icon: Zap,
    title: 'Instant Delivery',
    description: 'Validated QA cases delivered directly to Jira, GitHub Issues, Linear, and more.',
  },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-navy-950 text-white overflow-hidden">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-navy-950/80 backdrop-blur-xl border-b border-navy-700/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-violet-500 flex items-center justify-center">
              <Zap className="w-4.5 h-4.5 text-white" />
            </div>
            <span className="text-lg font-bold tracking-tight">QUALNEX</span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="text-sm text-slate-400 hover:text-white transition-colors px-3 py-2"
            >
              Sign In
            </Link>
            <Link
              to="/login"
              className="text-sm font-medium bg-cyan-500 hover:bg-cyan-400 text-navy-950 px-4 py-2 rounded-lg transition-colors"
            >
              Start Testing
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative pt-32 pb-20 px-4 sm:px-6">
        {/* Background effects */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-violet-500/5 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-5xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 mb-8">
              <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              <span className="text-xs font-medium text-cyan-400">Autonomous AI Quality Engineering</span>
            </div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight mb-6"
          >
            Your AI QA Engineer
            <br />
            <span className="gradient-text">for the entire application</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto mb-10"
          >
            Connect your project. Let QUALNEX discover, test, validate, and organize software defects automatically.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link
              to="/login"
              className="flex items-center gap-2 px-6 py-3 bg-cyan-500 hover:bg-cyan-400 text-navy-950 font-semibold rounded-lg transition-all hover:shadow-lg hover:shadow-cyan-500/20"
            >
              Start Testing
              <ArrowRight className="w-4 h-4" />
            </Link>
            <a
              href="#how-it-works"
              className="flex items-center gap-2 px-6 py-3 border border-navy-600 hover:border-navy-500 text-white font-medium rounded-lg transition-colors"
            >
              See How It Works
            </a>
          </motion.div>
        </div>
      </section>

      {/* Workflow */}
      <section id="how-it-works" className="py-20 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl font-bold mb-4">How QUALNEX Works</h2>
            <p className="text-slate-400 max-w-xl mx-auto">
              From repository connection to validated QA cases — fully autonomous.
            </p>
          </motion.div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4">
            {workflowSteps.map((step, index) => {
              const Icon = step.icon;
              return (
                <motion.div
                  key={step.label}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.08 }}
                  className="flex flex-col items-center text-center"
                >
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${step.color} flex items-center justify-center mb-3 shadow-lg`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-xs font-medium text-slate-300">{step.label}</span>
                  {index < workflowSteps.length - 1 && (
                    <ArrowRight className="w-3 h-3 text-slate-600 mt-2 hidden lg:block absolute" />
                  )}
                </motion.div>
              );
            })}
          </div>

          {/* Flow visualization */}
          <div className="mt-12 flex items-center justify-center">
            <div className="flex items-center gap-1 relative">
              {workflowSteps.map((_, i) => (
                <React.Fragment key={i}>
                  <div className="w-2.5 h-2.5 rounded-full bg-cyan-500/60 relative z-10" />
                  {i < workflowSteps.length - 1 && (
                    <div className="w-6 sm:w-10 h-0.5 bg-gradient-to-r from-cyan-500/30 to-violet-500/30 relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent animate-pulse" style={{ animationDelay: `${i * 0.2}s` }} />
                    </div>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl font-bold mb-4">Built for Production Quality</h2>
            <p className="text-slate-400 max-w-xl mx-auto">
              Enterprise-grade QA automation with AI-powered intelligence.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.08 }}
                  className="glass-card rounded-xl p-6 hover:border-cyan-500/30 transition-colors"
                >
                  <div className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center mb-4">
                    <Icon className="w-5 h-5 text-cyan-400" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">{feature.description}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="glass-card rounded-2xl p-10 glow-border"
          >
            <h2 className="text-3xl font-bold mb-4">Ready to automate your QA?</h2>
            <p className="text-slate-400 mb-8">
              Connect your repository and let QUALNEX handle the rest.
            </p>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 px-8 py-3.5 bg-cyan-500 hover:bg-cyan-400 text-navy-950 font-semibold rounded-lg transition-all hover:shadow-lg hover:shadow-cyan-500/20"
            >
              Get Started Free
              <ArrowRight className="w-4 h-4" />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-navy-700/30 py-8 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-gradient-to-br from-cyan-400 to-violet-500 flex items-center justify-center">
              <Zap className="w-3 h-3 text-white" />
            </div>
            <span className="text-sm font-semibold">QUALNEX</span>
          </div>
          <p className="text-xs text-slate-500">
            © 2026 QUALNEX. Autonomous AI Quality Engineering.
          </p>
        </div>
      </footer>
    </div>
  );
}
