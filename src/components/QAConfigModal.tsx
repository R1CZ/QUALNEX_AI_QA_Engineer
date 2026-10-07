import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Play, MousePointer, FormInput, Navigation, Search,
  Filter, Table2, Maximize2, ListChecks, Globe, Shield,
  AlertTriangle, Palette, Smartphone, Loader, Eye,
  Gauge, Zap, ArrowRight, CheckCircle2
} from 'lucide-react';

interface QAConfigProps {
  projectName: string;
  onClose: () => void;
  onStart: (config: QAConfigState) => void;
}

interface QAConfigState {
  functional: string[];
  api: string[];
  ui: string[];
  performance: string[];
  workflow: string[];
}

const configSections = [
  {
    id: 'functional',
    title: 'Functional Testing',
    description: 'Test interactive elements and business logic',
    items: [
      { id: 'buttons', label: 'Buttons', icon: MousePointer, desc: 'Click handlers, states, navigation' },
      { id: 'forms', label: 'Forms', icon: FormInput, desc: 'Input validation, submission, errors' },
      { id: 'navigation', label: 'Navigation', icon: Navigation, desc: 'Links, menus, routing' },
      { id: 'search', label: 'Search', icon: Search, desc: 'Search functionality, results, filters' },
      { id: 'filters', label: 'Filters', icon: Filter, desc: 'Filter combinations, sorting' },
      { id: 'tables', label: 'Tables', icon: Table2, desc: 'Data display, pagination, sorting' },
      { id: 'modals', label: 'Modals', icon: Maximize2, desc: 'Dialogs, overlays, interactions' },
      { id: 'crud', label: 'CRUD', icon: ListChecks, desc: 'Create, read, update, delete operations' },
    ],
  },
  {
    id: 'api',
    title: 'API / Backend Testing',
    description: 'Test API endpoints and server behavior',
    items: [
      { id: 'api_endpoints', label: 'API Endpoints', icon: Globe, desc: 'Response validation, schemas' },
      { id: 'validation', label: 'Validation', icon: AlertTriangle, desc: 'Input validation, edge cases' },
      { id: 'auth', label: 'Authentication', icon: Shield, desc: 'Login flows, tokens, sessions' },
      { id: 'authorization', label: 'Authorization', icon: Shield, desc: 'Permissions, access control' },
      { id: 'error_handling', label: 'Error Handling', icon: AlertTriangle, desc: 'Error responses, status codes' },
    ],
  },
  {
    id: 'ui',
    title: 'UI / UX Testing',
    description: 'Test visual appearance and user experience',
    items: [
      { id: 'visual', label: 'Visual', icon: Palette, desc: 'Layout, styling, consistency' },
      { id: 'responsive', label: 'Responsive', icon: Smartphone, desc: 'Mobile, tablet, desktop layouts' },
      { id: 'loading', label: 'Loading States', icon: Loader, desc: 'Spinners, skeletons, transitions' },
      { id: 'error_states', label: 'Error States', icon: AlertTriangle, desc: 'Error messages, recovery' },
      { id: 'accessibility', label: 'Accessibility', icon: Eye, desc: 'ARIA, keyboard nav, contrast' },
    ],
  },
  {
    id: 'performance',
    title: 'Performance Testing',
    description: 'Test speed and resource usage',
    items: [
      { id: 'page_load', label: 'Page Load', icon: Gauge, desc: 'Load time, render performance' },
      { id: 'api_response', label: 'API Response', icon: Zap, desc: 'Response time, throughput' },
    ],
  },
  {
    id: 'workflow',
    title: 'Workflow Testing',
    description: 'Test complete user journeys',
    items: [
      { id: 'e2e', label: 'End-to-End', icon: ArrowRight, desc: 'Complete user flows' },
      { id: 'regression', label: 'Regression', icon: CheckCircle2, desc: 'Previously passing tests' },
    ],
  },
];

export default function QAConfigModal({ projectName, onClose, onStart }: QAConfigProps) {
  const [selected, setSelected] = useState<QAConfigState>({
    functional: [],
    api: [],
    ui: [],
    performance: [],
    workflow: [],
  });

  const toggleItem = (section: string, itemId: string) => {
    setSelected(prev => {
      const current = prev[section as keyof QAConfigState] || [];
      const updated = current.includes(itemId)
        ? current.filter(id => id !== itemId)
        : [...current, itemId];
      return { ...prev, [section]: updated };
    });
  };

  const totalSelected = Object.values(selected).reduce((sum, arr) => sum + arr.length, 0);

  const handleSelectAll = (section: string) => {
    const sectionConfig = configSections.find(s => s.id === section);
    if (!sectionConfig) return;
    
    setSelected(prev => {
      const allIds = sectionConfig.items.map(i => i.id);
      const current = prev[section as keyof QAConfigState] || [];
      const allSelected = allIds.every(id => current.includes(id));
      
      return {
        ...prev,
        [section]: allSelected ? [] : allIds,
      };
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-3xl max-h-[85vh] overflow-hidden glass-card rounded-2xl flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-navy-700/50">
          <div>
            <h2 className="text-xl font-bold text-white">Configure QA Scope</h2>
            <p className="text-sm text-slate-400 mt-0.5">{projectName} — Select what to test</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-navy-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {configSections.map(section => {
            const sectionSelected = selected[section.id as keyof QAConfigState] || [];
            const allSelected = section.items.every(i => sectionSelected.includes(i.id));

            return (
              <div key={section.id}>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-sm font-semibold text-white">{section.title}</h3>
                    <p className="text-xs text-slate-500">{section.description}</p>
                  </div>
                  <button
                    onClick={() => handleSelectAll(section.id)}
                    className={`text-xs px-2.5 py-1 rounded-lg transition-colors ${
                      allSelected
                        ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                        : 'text-slate-400 hover:text-white hover:bg-navy-700'
                    }`}
                  >
                    {allSelected ? 'Deselect All' : 'Select All'}
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                  {section.items.map(item => {
                    const isSelected = sectionSelected.includes(item.id);
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        onClick={() => toggleItem(section.id, item.id)}
                        className={`flex items-center gap-2 p-2.5 rounded-lg text-left transition-all ${
                          isSelected
                            ? 'bg-cyan-500/10 border border-cyan-500/30 text-cyan-400'
                            : 'bg-navy-800/50 border border-navy-700/30 text-slate-400 hover:text-white hover:border-navy-600'
                        }`}
                      >
                        <Icon className="w-4 h-4 flex-shrink-0" />
                        <span className="text-xs font-medium truncate">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-navy-700/50">
          <p className="text-sm text-slate-400">
            <span className="text-cyan-400 font-semibold">{totalSelected}</span> test scope{totalSelected !== 1 ? 's' : ''} selected
          </p>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2.5 border border-navy-600 text-slate-300 hover:text-white rounded-lg text-sm font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => onStart(selected)}
              disabled={totalSelected === 0}
              className="flex items-center gap-2 px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed text-navy-950 font-medium rounded-lg text-sm transition-colors"
            >
              <Play className="w-4 h-4" />
              Start QA Scan
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
