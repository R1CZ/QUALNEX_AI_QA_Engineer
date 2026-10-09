import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Plug, Check, ExternalLink, Settings, AlertCircle,
  ArrowRight, Loader2, X
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import type { Integration } from '../types';

interface IntegrationConfig {
  vendor: Integration['vendor'];
  name: string;
  description: string;
  icon: string;
  color: string;
}

const integrations: IntegrationConfig[] = [
  { vendor: 'jira', name: 'Jira', description: 'Create issues in Atlassian Jira projects', icon: 'J', color: 'from-blue-500 to-blue-600' },
  { vendor: 'github', name: 'GitHub Issues', description: 'Create issues in GitHub repositories', icon: 'G', color: 'from-slate-400 to-slate-500' },
  { vendor: 'linear', name: 'Linear', description: 'Create issues in Linear projects', icon: 'L', color: 'from-violet-500 to-violet-600' },
  { vendor: 'azure_devops', name: 'Azure DevOps', description: 'Create work items in Azure DevOps', icon: 'A', color: 'from-blue-400 to-indigo-500' },
  { vendor: 'servicenow', name: 'ServiceNow', description: 'Create incidents in ServiceNow', icon: 'S', color: 'from-green-500 to-teal-600' },
];

export default function Integrations() {
  const { integrations: connectedIntegrations, connectIntegration } = useApp();
  const [connectingVendor, setConnectingVendor] = useState<string | null>(null);
  const [showConfig, setShowConfig] = useState<string | null>(null);

  const handleConnect = (vendor: Integration['vendor']) => {
    setConnectingVendor(vendor);
    // In production, this would initiate OAuth flow with the vendor
    setTimeout(() => {
      setConnectingVendor(null);
      const config = integrations.find(i => i.vendor === vendor);
      if (config) {
        connectIntegration({
          vendor,
          name: config.name,
          connected: true,
          config: {},
        });
      }
    }, 1500);
  };

  const isConnected = (vendor: string) => connectedIntegrations.some(i => i.vendor === vendor);

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Integrations</h1>
        <p className="text-sm text-slate-400 mt-1">Connect issue trackers to deliver validated QA cases</p>
      </div>

      {/* Architecture info */}
      <div className="glass-card rounded-xl p-4 mb-6 border-l-2 border-l-violet-500/50">
        <div className="flex items-start gap-3">
          <Plug className="w-4 h-4 text-violet-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm text-slate-300 font-medium">Universal Integration Architecture</p>
            <p className="text-xs text-slate-500 mt-1">
              QA Case → Integration Router → Vendor Adapter. All integrations use least-privilege credentials,
              encrypted token storage, idempotent operations, and audit logging.
            </p>
          </div>
        </div>
      </div>

      {/* Integration grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {integrations.map((integration, index) => {
          const connected = isConnected(integration.vendor);
          const isConnecting = connectingVendor === integration.vendor;

          return (
            <motion.div
              key={integration.vendor}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.08 }}
              className="glass-card rounded-xl p-6 hover:border-cyan-500/20 transition-colors"
            >
              <div className="flex items-start gap-4 mb-4">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${integration.color} flex items-center justify-center text-white font-bold text-lg`}>
                  {integration.icon}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-semibold text-white">{integration.name}</h3>
                    {connected && (
                      <span className="flex items-center gap-1 text-xs text-emerald-400">
                        <Check className="w-3 h-3" />
                        Connected
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-1">{integration.description}</p>
                </div>
              </div>

              <div className="flex gap-2">
                {connected ? (
                  <>
                    <button className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium text-cyan-400 hover:text-cyan-300 py-2 rounded-lg border border-cyan-500/20 hover:bg-cyan-500/5 transition-colors">
                      <Settings className="w-3.5 h-3.5" />
                      Configure
                    </button>
                    <button className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium text-slate-400 hover:text-rose-400 py-2 rounded-lg border border-navy-700 hover:border-rose-500/20 transition-colors">
                      <X className="w-3.5 h-3.5" />
                      Disconnect
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => handleConnect(integration.vendor)}
                    disabled={isConnecting}
                    className="w-full flex items-center justify-center gap-2 text-xs font-medium text-white py-2.5 rounded-lg bg-navy-700 hover:bg-navy-600 disabled:opacity-60 transition-colors"
                  >
                    {isConnecting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Connecting...
                      </>
                    ) : (
                      <>
                        Connect
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Security note */}
      <div className="mt-8 glass-card rounded-xl p-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-semibold text-white mb-1">Integration Security</h3>
            <ul className="text-xs text-slate-400 space-y-1">
              <li>• All integration credentials are encrypted at rest and never exposed to the browser</li>
              <li>• Only validated, confirmed bugs are delivered to external systems by default</li>
              <li>• All operations are idempotent — retries never create duplicate issues</li>
              <li>• Every integration action is recorded in the audit log</li>
              <li>• Least-privilege tokens with minimal required permissions</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
