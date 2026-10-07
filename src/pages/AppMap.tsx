import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Map, Globe, Component, Zap, ArrowRight,
  CheckCircle2, Circle, Eye, Layers, Route
} from 'lucide-react';

interface MapNode {
  id: string;
  label: string;
  type: 'page' | 'component' | 'api' | 'workflow';
  route?: string;
  confidence: number;
  tested: boolean;
  children?: MapNode[];
}

const demoAppMap: MapNode[] = [
  {
    id: 'home',
    label: 'Home',
    type: 'page',
    route: '/',
    confidence: 0.95,
    tested: true,
    children: [
      { id: 'hero', label: 'Hero Section', type: 'component', confidence: 0.9, tested: true },
      { id: 'features', label: 'Features Grid', type: 'component', confidence: 0.85, tested: true },
      { id: 'cta', label: 'CTA Banner', type: 'component', confidence: 0.9, tested: false },
    ],
  },
  {
    id: 'login',
    label: 'Login',
    type: 'page',
    route: '/login',
    confidence: 0.98,
    tested: true,
    children: [
      { id: 'login-form', label: 'Login Form', type: 'component', confidence: 0.95, tested: true },
      { id: 'oauth', label: 'OAuth Buttons', type: 'component', confidence: 0.92, tested: true },
    ],
  },
  {
    id: 'dashboard',
    label: 'Dashboard',
    type: 'page',
    route: '/dashboard',
    confidence: 0.92,
    tested: true,
    children: [
      { id: 'stats', label: 'Stats Cards', type: 'component', confidence: 0.88, tested: true },
      { id: 'activity', label: 'Activity Feed', type: 'component', confidence: 0.85, tested: false },
      { id: 'chart', label: 'Charts', type: 'component', confidence: 0.8, tested: false },
    ],
  },
  {
    id: 'settings',
    label: 'Settings',
    type: 'page',
    route: '/settings',
    confidence: 0.88,
    tested: false,
    children: [
      { id: 'profile', label: 'Profile Form', type: 'component', confidence: 0.85, tested: false },
      { id: 'security', label: 'Security Settings', type: 'component', confidence: 0.82, tested: false },
    ],
  },
  {
    id: 'api-users',
    label: 'GET /api/users',
    type: 'api',
    confidence: 0.9,
    tested: true,
  },
  {
    id: 'api-auth',
    label: 'POST /api/auth',
    type: 'api',
    confidence: 0.95,
    tested: true,
  },
  {
    id: 'workflow-signup',
    label: 'Sign Up Flow',
    type: 'workflow',
    confidence: 0.75,
    tested: false,
  },
];

export default function AppMap() {
  const [filter, setFilter] = useState<string>('all');
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(['home', 'login', 'dashboard']));

  const toggleNode = (id: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const filteredMap = demoAppMap.filter(node => {
    if (filter === 'all') return true;
    return node.type === filter;
  });

  const stats = {
    total: demoAppMap.length,
    pages: demoAppMap.filter(n => n.type === 'page').length,
    components: demoAppMap.filter(n => n.type === 'component').length,
    apis: demoAppMap.filter(n => n.type === 'api').length,
    tested: demoAppMap.filter(n => n.tested).length,
  };

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Application Map</h1>
          <p className="text-sm text-slate-400 mt-1">Discovered application structure and coverage</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">Last discovered: —</span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
        <StatCard label="Total Nodes" value={stats.total} icon={Layers} color="cyan" />
        <StatCard label="Pages" value={stats.pages} icon={Globe} color="violet" />
        <StatCard label="Components" value={stats.components} icon={Component} color="amber" />
        <StatCard label="APIs" value={stats.apis} icon={Zap} color="emerald" />
        <StatCard label="Tested" value={stats.tested} icon={CheckCircle2} color="cyan" />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 mb-6">
        {['all', 'page', 'component', 'api', 'workflow'].map(type => (
          <button
            key={type}
            onClick={() => setFilter(type)}
            className={`text-xs px-3 py-1.5 rounded-lg capitalize transition-colors ${
              filter === type
                ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                : 'text-slate-400 hover:text-white hover:bg-navy-800'
            }`}
          >
            {type}
          </button>
        ))}
      </div>

      {/* Map visualization */}
      <div className="glass-card rounded-xl p-6">
        {filteredMap.length === 0 ? (
          <div className="text-center py-12">
            <Map className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <p className="text-sm text-slate-400">No nodes match the current filter.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredMap.map((node, index) => (
              <MapNodeItem
                key={node.id}
                node={node}
                expanded={expandedNodes.has(node.id)}
                onToggle={() => toggleNode(node.id)}
                index={index}
              />
            ))}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="mt-6 glass-card rounded-xl p-4 border-l-2 border-l-violet-500/50">
        <div className="flex items-start gap-3">
          <Eye className="w-4 h-4 text-violet-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm text-slate-300 font-medium">Application Discovery</p>
            <p className="text-xs text-slate-500 mt-1">
              The Discovery Agent crawls your application to map routes, components, APIs, and workflows.
              This map drives the test planning process — only discovered elements are tested.
              Confidence scores indicate how certain the AI is about each discovery.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function MapNodeItem({ node, expanded, onToggle, index }: {
  node: MapNode;
  expanded: boolean;
  onToggle: () => void;
  index: number;
}) {
  const typeColors: Record<string, string> = {
    page: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
    component: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    api: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    workflow: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  };

  const typeIcons: Record<string, React.ElementType> = {
    page: Globe,
    component: Component,
    api: Zap,
    workflow: Route,
  };

  const Icon = typeIcons[node.type] || Globe;

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.03 }}
    >
      <div className={`flex items-center gap-3 p-3 rounded-lg border ${typeColors[node.type]} ${
        node.children ? 'cursor-pointer hover:bg-navy-800/50' : ''
      }`} onClick={node.children ? onToggle : undefined}>
        <Icon className="w-4 h-4 flex-shrink-0" />
        <span className="text-sm font-medium flex-1">{node.label}</span>
        {node.route && (
          <span className="text-xs text-slate-500 font-mono">{node.route}</span>
        )}
        <span className="text-xs text-slate-500">{Math.round(node.confidence * 100)}%</span>
        {node.tested ? (
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
        ) : (
          <Circle className="w-4 h-4 text-slate-600" />
        )}
        {node.children && (
          <ArrowRight className={`w-3.5 h-3.5 text-slate-500 transition-transform ${expanded ? 'rotate-90' : ''}`} />
        )}
      </div>
      {expanded && node.children && (
        <div className="ml-8 mt-1 space-y-1">
          {node.children.map((child, i) => (
            <motion.div
              key={child.id}
              initial={{ opacity: 0, x: -5 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03 }}
              className={`flex items-center gap-3 p-2.5 rounded-lg border ${typeColors[child.type]}`}
            >
              <Component className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="text-xs font-medium flex-1">{child.label}</span>
              <span className="text-xs text-slate-500">{Math.round(child.confidence * 100)}%</span>
              {child.tested ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Circle className="w-3.5 h-3.5 text-slate-600" />
              )}
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

function StatCard({ label, value, icon: Icon, color }: {
  label: string;
  value: number;
  icon: React.ElementType;
  color: string;
}) {
  const colorMap: Record<string, string> = {
    cyan: 'bg-cyan-500/10 text-cyan-400',
    violet: 'bg-violet-500/10 text-violet-400',
    amber: 'bg-amber-500/10 text-amber-400',
    emerald: 'bg-emerald-500/10 text-emerald-400',
  };

  return (
    <div className="glass-card rounded-xl p-4">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${colorMap[color]}`}>
        <Icon className="w-4 h-4" />
      </div>
      <p className="text-lg font-bold text-white">{value}</p>
      <p className="text-xs text-slate-400">{label}</p>
    </div>
  );
}
