import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  FolderKanban, Plus, Search, PlayCircle,
  GitBranch, Clock, MoreVertical, Settings, Loader2, AlertCircle
} from 'lucide-react';
import { useApp, AI_MODELS } from '../context/AppContext';
import QAConfigModal from '../components/QAConfigModal';

export default function Projects() {
  const { projects, startQARun } = useApp();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [qaConfigProject, setQaConfigProject] = useState<string | null>(null);

  const filtered = projects.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.repository.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Projects</h1>
          <p className="text-sm text-slate-400 mt-1">Manage your QA projects and configurations</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-navy-950 font-medium rounded-lg transition-colors text-sm"
        >
          <Plus className="w-4 h-4" />
          New Project
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <input
          type="text"
          placeholder="Search projects..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-navy-800 border border-navy-700 rounded-lg text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/50"
        />
      </div>

      {/* Projects list */}
      {filtered.length === 0 ? (
        <div className="glass-card rounded-xl p-12 text-center">
          <div className="w-16 h-16 rounded-xl bg-navy-800 flex items-center justify-center mx-auto mb-4">
            <FolderKanban className="w-7 h-7 text-slate-500" />
          </div>
          <h3 className="text-lg font-medium text-white mb-2">
            {search ? 'No matching projects' : 'No projects yet'}
          </h3>
          <p className="text-sm text-slate-400 mb-6 max-w-md mx-auto">
            {search
              ? 'Try a different search term.'
              : 'Create your first QA project by connecting a repository and configuring your testing scope.'}
          </p>
          {!search && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-navy-950 font-medium rounded-lg transition-colors text-sm"
            >
              <Plus className="w-4 h-4" />
              Create Project
            </button>
          )}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((project, index) => (
            <motion.div
              key={project.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="glass-card rounded-xl p-5 hover:border-cyan-500/30 transition-colors group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                  <FolderKanban className="w-5 h-5 text-cyan-400" />
                </div>
                <button className="text-slate-500 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity">
                  <MoreVertical className="w-4 h-4" />
                </button>
              </div>

              <h3 className="text-base font-semibold text-white mb-1">{project.name}</h3>
              
              <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-4">
                <GitBranch className="w-3 h-3" />
                <span className="truncate">{project.repository}</span>
                <span>·</span>
                <span>{project.branch}</span>
              </div>

              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${
                  project.status === 'active' ? 'bg-emerald-400/10 text-emerald-400' :
                  project.status === 'paused' ? 'bg-amber-400/10 text-amber-400' :
                  'bg-rose-400/10 text-rose-400'
                }`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${
                    project.status === 'active' ? 'bg-emerald-400' :
                    project.status === 'paused' ? 'bg-amber-400' :
                    'bg-rose-400'
                  }`} />
                  {project.status}
                </span>

                {project.lastRunAt && (
                  <span className="text-xs text-slate-500 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(project.lastRunAt).toLocaleDateString()}
                  </span>
                )}
              </div>

              <div className="flex gap-2 mt-4 pt-4 border-t border-navy-700/30">
                <button
                  onClick={() => setQaConfigProject(project.id)}
                  className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium text-cyan-400 hover:text-cyan-300 py-1.5 rounded-lg hover:bg-cyan-500/5 transition-colors"
                >
                  <PlayCircle className="w-3.5 h-3.5" />
                  Run QA
                </button>
                <button className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium text-slate-400 hover:text-white py-1.5 rounded-lg hover:bg-navy-700/50 transition-colors">
                  <Settings className="w-3.5 h-3.5" />
                  Configure
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <CreateProjectModal
          onClose={() => setShowCreateModal(false)}
          onStarted={() => { setShowCreateModal(false); navigate('/app/qa-runs'); }}
        />
      )}

      {/* QA Config Modal */}
      <AnimatePresence>
        {qaConfigProject && (
          <QAConfigModal
            projectName={projects.find(p => p.id === qaConfigProject)?.name || 'Project'}
            onClose={() => setQaConfigProject(null)}
            onStart={async (config) => {
              await startQARun(qaConfigProject, config);
              setQaConfigProject(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function CreateProjectModal({ onClose, onStarted }: { onClose: () => void; onStarted: () => void }) {
  const { repositories, createProject, startQARun } = useApp();
  const [name, setName] = useState('');
  const [repositoryId, setRepositoryId] = useState('');
  const [aiModel, setAiModel] = useState(AI_MODELS[0].id);
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleStartTesting = async () => {
    if (!name.trim() || !repositoryId || submitting) return;
    setSubmitting(true);
    setLocalError(null);
    try {
      // 1. Create the project bound to the selected repository + AI model.
      const project = await createProject({ name: name.trim(), repositoryId, aiModel });
      // 2. Immediately begin the automated AI testing/scanning process —
      //    this creates the QA run and updates the QA Runs badge.
      await startQARun(project.id, undefined, aiModel);
      // 3. Hand off to the QA Runs section to monitor execution/results.
      onStarted();
    } catch (err: any) {
      setLocalError(err?.message || 'Failed to start testing. Please try again.');
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative w-full max-w-lg glass-card rounded-xl p-6"
      >
        <h2 className="text-xl font-bold text-white mb-1">New Project</h2>
        <p className="text-sm text-slate-400 mb-6">Create a project and start AI testing in one step.</p>

        {localError && (
          <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-rose-400">{localError}</p>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Project Name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="My Application"
              className="w-full px-3 py-2.5 bg-navy-800 border border-navy-700 rounded-lg text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Repository</label>
            {repositories.length === 0 ? (
              <div className="w-full px-3 py-2.5 bg-navy-800/60 border border-navy-700 rounded-lg text-sm text-slate-500">
                No GitHub repositories available yet — connect your GitHub account in{' '}
                <a href="/app/repositories" className="text-cyan-400 hover:text-cyan-300 underline">Repositories</a>{' '}
                first.
              </div>
            ) : (
              <select
                value={repositoryId}
                onChange={e => setRepositoryId(e.target.value)}
                className="w-full px-3 py-2.5 bg-navy-800 border border-navy-700 rounded-lg text-sm text-white focus:outline-none focus:border-cyan-500/50"
              >
                <option value="">Select a repository...</option>
                {repositories.map(repo => (
                  <option key={repo.id} value={repo.id}>
                    {repo.fullName}{repo.language ? ` · ${repo.language}` : ''}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">AI Model</label>
            <select
              value={aiModel}
              onChange={e => setAiModel(e.target.value)}
              className="w-full px-3 py-2.5 bg-navy-800 border border-navy-700 rounded-lg text-sm text-white focus:outline-none focus:border-cyan-500/50"
            >
              {AI_MODELS.map(model => (
                <option key={model.id} value={model.id}>{model.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            disabled={submitting}
            className="flex-1 px-4 py-2.5 border border-navy-600 text-slate-300 hover:text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleStartTesting}
            disabled={!name.trim() || !repositoryId || submitting}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed text-navy-950 rounded-lg text-sm font-medium transition-colors"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Starting...
              </>
            ) : (
              <>
                <PlayCircle className="w-4 h-4" />
                Start Testing
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
