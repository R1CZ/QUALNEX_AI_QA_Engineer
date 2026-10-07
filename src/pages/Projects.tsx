import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FolderKanban, Plus, Search, PlayCircle,
  GitBranch, Clock, MoreVertical, Settings, Trash2
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import QAConfigModal from '../components/QAConfigModal';

export default function Projects() {
  const { projects, startQARun } = useApp();
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
        <CreateProjectModal onClose={() => setShowCreateModal(false)} />
      )}

      {/* QA Config Modal */}
      <AnimatePresence>
        {qaConfigProject && (
          <QAConfigModal
            projectName={projects.find(p => p.id === qaConfigProject)?.name || 'Project'}
            onClose={() => setQaConfigProject(null)}
            onStart={(config) => {
              startQARun(qaConfigProject);
              setQaConfigProject(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function CreateProjectModal({ onClose }: { onClose: () => void }) {
  const { createProject } = useApp();
  const [name, setName] = useState('');
  const [repository, setRepository] = useState('');
  const [branch, setBranch] = useState('main');
  const [buildCommand, setBuildCommand] = useState('npm run build');
  const [startCommand, setStartCommand] = useState('npm start');

  const handleCreate = () => {
    if (!name || !repository) return;
    createProject({
      name,
      repositoryId: 'repo_1',
      repository,
      branch,
      buildCommand,
      startCommand,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative w-full max-w-lg glass-card rounded-xl p-6"
      >
        <h2 className="text-xl font-bold text-white mb-6">Create QA Project</h2>
        
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
            <input
              type="text"
              value={repository}
              onChange={e => setRepository(e.target.value)}
              placeholder="owner/repo"
              className="w-full px-3 py-2.5 bg-navy-800 border border-navy-700 rounded-lg text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/50"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Branch</label>
              <input
                type="text"
                value={branch}
                onChange={e => setBranch(e.target.value)}
                className="w-full px-3 py-2.5 bg-navy-800 border border-navy-700 rounded-lg text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Build Command</label>
              <input
                type="text"
                value={buildCommand}
                onChange={e => setBuildCommand(e.target.value)}
                className="w-full px-3 py-2.5 bg-navy-800 border border-navy-700 rounded-lg text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/50"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Start Command</label>
            <input
              type="text"
              value={startCommand}
              onChange={e => setStartCommand(e.target.value)}
              className="w-full px-3 py-2.5 bg-navy-800 border border-navy-700 rounded-lg text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/50"
            />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 border border-navy-600 text-slate-300 hover:text-white rounded-lg text-sm font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={!name || !repository}
            className="flex-1 px-4 py-2.5 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed text-navy-950 rounded-lg text-sm font-medium transition-colors"
          >
            Create Project
          </button>
        </div>
      </motion.div>
    </div>
  );
}
