import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  GitBranch, Search, Plus, ExternalLink,
  Check, AlertCircle, Loader2, RefreshCw
} from 'lucide-react';

interface RepoItem {
  id: string;
  name: string;
  fullName: string;
  owner: string;
  language: string;
  framework: string;
  defaultBranch: string;
  lastUpdated: string;
  connected: boolean;
}

const mockRepos: RepoItem[] = [];

export default function Repositories() {
  const [connected, setConnected] = useState(false);
  const [repos, setRepos] = useState<RepoItem[]>(mockRepos);
  const [search, setSearch] = useState('');
  const [connecting, setConnecting] = useState(false);

  const filtered = repos.filter(r =>
    r.fullName.toLowerCase().includes(search.toLowerCase()) ||
    r.language.toLowerCase().includes(search.toLowerCase())
  );

  const handleConnect = () => {
    setConnecting(true);
    // In production, this would redirect to GitHub App installation
    setTimeout(() => {
      setConnecting(false);
      setConnected(true);
      // No mock repos - showing "Coming Soon" / empty state
    }, 2000);
  };

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Repositories</h1>
          <p className="text-sm text-slate-400 mt-1">Connect and manage your GitHub repositories</p>
        </div>
        {!connected && (
          <button
            onClick={handleConnect}
            disabled={connecting}
            className="flex items-center gap-2 px-4 py-2.5 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-60 text-navy-950 font-medium rounded-lg transition-colors text-sm"
          >
            {connecting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
            {connecting ? 'Connecting...' : 'Connect GitHub'}
          </button>
        )}
      </div>

      {/* Connection Status */}
      <div className="glass-card rounded-xl p-6 mb-6">
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
            connected ? 'bg-emerald-400/10' : 'bg-navy-800'
          }`}>
            {connected ? (
              <Check className="w-6 h-6 text-emerald-400" />
            ) : (
              <GitBranch className="w-6 h-6 text-slate-500" />
            )}
          </div>
          <div className="flex-1">
            <h3 className="text-base font-semibold text-white">
              {connected ? 'GitHub Connected' : 'Connect GitHub'}
            </h3>
            <p className="text-sm text-slate-400">
              {connected
                ? 'Your GitHub account is connected. Select repositories to create QA projects.'
                : 'Connect your GitHub account using the QUALNEX GitHub App with least-privilege permissions.'}
            </p>
          </div>
          {connected && (
            <button className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white px-3 py-1.5 rounded-lg border border-navy-700 hover:border-navy-600 transition-colors">
              <RefreshCw className="w-3 h-3" />
              Refresh
            </button>
          )}
        </div>
      </div>

      {/* Repository list */}
      {connected && (
        <>
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search repositories..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-navy-800 border border-navy-700 rounded-lg text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/50"
            />
          </div>

          {filtered.length === 0 ? (
            <div className="glass-card rounded-xl p-12 text-center">
              <div className="w-16 h-16 rounded-xl bg-navy-800 flex items-center justify-center mx-auto mb-4">
                <GitBranch className="w-7 h-7 text-slate-500" />
              </div>
              <h3 className="text-lg font-medium text-white mb-2">No Repositories Found</h3>
              <p className="text-sm text-slate-400 max-w-md mx-auto">
                {search
                  ? 'No repositories match your search.'
                  : 'No repositories are currently authorized. Install the QUALNEX GitHub App to discover your repositories.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((repo, index) => (
                <motion.div
                  key={repo.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="glass-card rounded-xl p-4 flex items-center gap-4 hover:border-cyan-500/30 transition-colors"
                >
                  <div className="w-10 h-10 rounded-lg bg-navy-800 flex items-center justify-center">
                    <GitBranch className="w-5 h-5 text-slate-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-white truncate">{repo.fullName}</p>
                      {repo.connected && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-emerald-400/10 text-emerald-400">Connected</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-slate-500">{repo.language}</span>
                      {repo.framework && <span className="text-xs text-slate-500">· {repo.framework}</span>}
                      <span className="text-xs text-slate-500">· {repo.defaultBranch}</span>
                    </div>
                  </div>
                  <button className="text-xs text-cyan-400 hover:text-cyan-300 font-medium px-3 py-1.5 rounded-lg hover:bg-cyan-500/5 transition-colors">
                    Create Project
                  </button>
                </motion.div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Info card when not connected */}
      {!connected && (
        <div className="glass-card rounded-xl p-8">
          <div className="max-w-lg mx-auto text-center">
            <div className="w-16 h-16 rounded-xl bg-navy-800 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-7 h-7 text-slate-500" />
            </div>
            <h3 className="text-lg font-medium text-white mb-2">GitHub Integration</h3>
            <p className="text-sm text-slate-400 mb-6">
              QUALNEX uses a GitHub App with least-privilege permissions to securely access your repositories.
              Your source code is never modified — only read for analysis and testing.
            </p>
            <div className="text-xs text-slate-500 space-y-1">
              <p>✓ Read-only access to repository contents</p>
              <p>✓ No source code modifications</p>
              <p>✓ Isolated execution environments</p>
              <p>✓ Secure token storage with encryption</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
