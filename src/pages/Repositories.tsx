import React, { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  GitBranch, Search, Plus, Check, AlertCircle, Loader2, RefreshCw, Github
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { connectGitHubAccount, isFirebaseConfigured } from '../lib/firebase';
import { fetchGitHubRepositories, getCurrentGitHubAccount } from '../lib/github';
import type { Repository } from '../types';

export default function Repositories() {
  const { repositories, setRepositories, setUserGithubAccount, error, clearError } = useApp();
  const [search, setSearch] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const account = getCurrentGitHubAccount();
  const connected = !!account;

  const loadRepos = useCallback(async () => {
    if (!connected) return;
    setLoading(true);
    setLocalError(null);
    try {
      const repos = await fetchGitHubRepositories();
      setRepositories(repos);
    } catch (err: any) {
      setLocalError(err?.message || 'Failed to load your GitHub repositories.');
    } finally {
      setLoading(false);
    }
  }, [connected, setRepositories]);

  // Scenario B: signed in with GitHub -> already authorized, fetch repos
  // automatically. Scenario A: after connecting via "Connect GitHub" below,
  // the same effect runs and lists the repositories.
  useEffect(() => {
    if (connected && repositories.length === 0 && !loading) {
      void loadRepos();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected]);

  const handleConnect = async () => {
    if (!isFirebaseConfigured()) {
      setLocalError('Firebase is not configured yet — set your VITE_FIREBASE_* values in .env before connecting GitHub.');
      return;
    }
    setConnecting(true);
    setLocalError(null);
    clearError();
    try {
      // Authorize GitHub and link it to the current (e.g. Google) account.
      await connectGitHubAccount();
      const gh = getCurrentGitHubAccount();
      setUserGithubAccount(gh ? { ...gh, connectedAt: new Date().toISOString() } : null);
      await loadRepos();
    } catch (err: any) {
      setLocalError(err?.message || 'Failed to connect GitHub.');
    } finally {
      setConnecting(false);
    }
  };

  const filtered = repositories.filter(r =>
    r.fullName.toLowerCase().includes(search.toLowerCase()) ||
    r.language.toLowerCase().includes(search.toLowerCase())
  );

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
            {connecting ? 'Waiting for GitHub authorization...' : 'Connect GitHub'}
          </button>
        )}
      </div>

      {(localError || error) && (
        <div className="mb-6 p-4 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-rose-400 flex-1">{localError || error}</p>
          <button
            onClick={() => { setLocalError(null); clearError(); }}
            className="text-xs text-rose-400 hover:text-rose-300 underline"
          >
            Dismiss
          </button>
        </div>
      )}

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
              {connected ? (
                <span className="inline-flex items-center gap-2">
                  <Github className="w-4 h-4 text-slate-300" />
                  Authorized as{' '}
                  <span className="text-cyan-400 font-medium">@{account!.login}</span>
                  {account!.name && account!.name !== account!.login ? ` (${account!.name})` : ''}
                  {' '}— read access granted during OAuth authorization.
                </span>
              ) : (
                'Connect your GitHub account so QUALNEX can list the repositories you are authorized to test.'
              )}
            </p>
          </div>
          {connected && (
            <button
              onClick={loadRepos}
              disabled={loading}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white px-3 py-1.5 rounded-lg border border-navy-700 hover:border-navy-600 transition-colors disabled:opacity-60"
            >
              <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
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

          {loading && repositories.length === 0 ? (
            <div className="glass-card rounded-xl p-12 text-center">
              <Loader2 className="w-7 h-7 text-cyan-400 animate-spin mx-auto mb-4" />
              <p className="text-sm text-slate-400">Loading your GitHub repositories...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="glass-card rounded-xl p-12 text-center">
              <div className="w-16 h-16 rounded-xl bg-navy-800 flex items-center justify-center mx-auto mb-4">
                <GitBranch className="w-7 h-7 text-slate-500" />
              </div>
              <h3 className="text-lg font-medium text-white mb-2">No Repositories Found</h3>
              <p className="text-sm text-slate-400 max-w-md mx-auto">
                {search
                  ? 'No repositories match your search.'
                  : 'No repositories are available for this GitHub account.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((repo, index) => (
                <motion.div
                  key={repo.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(index * 0.03, 0.3) }}
                  className="glass-card rounded-xl p-4 flex items-center gap-4 hover:border-cyan-500/30 transition-colors"
                >
                  <div className="w-10 h-10 rounded-lg bg-navy-800 flex items-center justify-center">
                    <GitBranch className="w-5 h-5 text-slate-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-white truncate">{repo.fullName}</p>
                      <span className="text-xs px-1.5 py-0.5 rounded bg-emerald-400/10 text-emerald-400">Connected</span>
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-slate-500">{repo.language}</span>
                      {repo.framework && <span className="text-xs text-slate-500">· {repo.framework}</span>}
                      <span className="text-xs text-slate-500">· {repo.defaultBranch}</span>
                    </div>
                  </div>
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
              Click <span className="text-cyan-400">Connect GitHub</span> to authorize your GitHub account.
              QUALNEX requests read-only repository access — your source code is never modified,
              only analyzed for testing. If you signed in with GitHub directly, your account is
              already connected here.
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
