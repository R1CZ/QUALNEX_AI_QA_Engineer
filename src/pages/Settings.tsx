import React, { useState } from 'react';
import {
  Settings as SettingsIcon, User, Shield, Bell,
  Key, Database, Globe, Trash2, Save, Check
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export default function SettingsPage() {
  const { user, organization } = useApp();
  const [activeTab, setActiveTab] = useState('profile');
  const [saved, setSaved] = useState(false);

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'organization', label: 'Organization', icon: Globe },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'api', label: 'API Keys', icon: Key },
    { id: 'data', label: 'Data & Retention', icon: Database },
  ];

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="p-4 lg:p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-sm text-slate-400 mt-1">Manage your account and organization preferences</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar tabs */}
        <div className="lg:w-56 flex-shrink-0">
          <nav className="flex lg:flex-col gap-1 overflow-x-auto pb-2 lg:pb-0">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                    activeTab === tab.id
                      ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                      : 'text-slate-400 hover:text-white hover:bg-navy-800'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 glass-card rounded-xl p-6">
          {activeTab === 'profile' && (
            <div>
              <h2 className="text-lg font-semibold text-white mb-6">Profile Settings</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Name</label>
                  <input
                    type="text"
                    defaultValue={user?.name || ''}
                    className="w-full px-3 py-2.5 bg-navy-800 border border-navy-700 rounded-lg text-sm text-white focus:outline-none focus:border-cyan-500/50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Email</label>
                  <input
                    type="email"
                    defaultValue={user?.email || ''}
                    className="w-full px-3 py-2.5 bg-navy-800 border border-navy-700 rounded-lg text-sm text-white focus:outline-none focus:border-cyan-500/50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Role</label>
                  <input
                    type="text"
                    value={user?.role || ''}
                    disabled
                    className="w-full px-3 py-2.5 bg-navy-800/50 border border-navy-700 rounded-lg text-sm text-slate-500 capitalize"
                  />
                </div>
              </div>
              <div className="mt-6 flex items-center gap-3">
                <button
                  onClick={handleSave}
                  className="flex items-center gap-2 px-4 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-navy-950 font-medium rounded-lg text-sm transition-colors"
                >
                  {saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                  {saved ? 'Saved' : 'Save Changes'}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'organization' && (
            <div>
              <h2 className="text-lg font-semibold text-white mb-6">Organization Settings</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Organization Name</label>
                  <input
                    type="text"
                    defaultValue={organization?.name || ''}
                    className="w-full px-3 py-2.5 bg-navy-800 border border-navy-700 rounded-lg text-sm text-white focus:outline-none focus:border-cyan-500/50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Plan</label>
                  <div className="px-3 py-2.5 bg-navy-800/50 border border-navy-700 rounded-lg text-sm text-white capitalize">
                    {organization?.plan || 'free'}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Members</label>
                  <div className="text-sm text-slate-400 py-2.5">
                    Team member management — <span className="text-cyan-400">Coming Soon</span>
                  </div>
                </div>
              </div>
              <div className="mt-6">
                <button
                  onClick={handleSave}
                  className="flex items-center gap-2 px-4 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-navy-950 font-medium rounded-lg text-sm transition-colors"
                >
                  {saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                  {saved ? 'Saved' : 'Save Changes'}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div>
              <h2 className="text-lg font-semibold text-white mb-6">Security Settings</h2>
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-navy-800/50 border border-navy-700/30">
                  <h3 className="text-sm font-medium text-white mb-1">Session Management</h3>
                  <p className="text-xs text-slate-400">Secure sessions with HttpOnly cookies, SameSite protection, and automatic expiration.</p>
                </div>
                <div className="p-4 rounded-lg bg-navy-800/50 border border-navy-700/30">
                  <h3 className="text-sm font-medium text-white mb-1">Two-Factor Authentication</h3>
                  <p className="text-xs text-slate-400">2FA — <span className="text-cyan-400">Coming Soon</span></p>
                </div>
                <div className="p-4 rounded-lg bg-navy-800/50 border border-navy-700/30">
                  <h3 className="text-sm font-medium text-white mb-1">Active Sessions</h3>
                  <p className="text-xs text-slate-400">View and manage your active sessions — <span className="text-cyan-400">Coming Soon</span></p>
                </div>
                <div className="p-4 rounded-lg bg-navy-800/50 border border-navy-700/30">
                  <h3 className="text-sm font-medium text-white mb-1">Audit Log</h3>
                  <p className="text-xs text-slate-400">View security and activity audit events — <span className="text-cyan-400">Coming Soon</span></p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div>
              <h2 className="text-lg font-semibold text-white mb-6">Notification Preferences</h2>
              <div className="space-y-4">
                {['QA run completed', 'Bug confirmed', 'QA case delivered', 'Build failure', 'Integration error'].map(pref => (
                  <div key={pref} className="flex items-center justify-between p-3 rounded-lg bg-navy-800/50 border border-navy-700/30">
                    <span className="text-sm text-slate-300">{pref}</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" defaultChecked className="sr-only peer" />
                      <div className="w-9 h-5 bg-navy-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-cyan-500/30 peer-checked:after:bg-cyan-400"></div>
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'api' && (
            <div>
              <h2 className="text-lg font-semibold text-white mb-6">API Keys</h2>
              <div className="p-8 text-center">
                <Key className="w-8 h-8 text-slate-600 mx-auto mb-3" />
                <p className="text-sm text-slate-400 mb-4">
                  API keys allow programmatic access to QUALNEX for CI/CD integration and automation.
                </p>
                <p className="text-sm text-cyan-400">Coming Soon</p>
              </div>
            </div>
          )}

          {activeTab === 'data' && (
            <div>
              <h2 className="text-lg font-semibold text-white mb-6">Data & Retention</h2>
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-navy-800/50 border border-navy-700/30">
                  <h3 className="text-sm font-medium text-white mb-1">Data Retention Policy</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Configure how long QA results, artifacts, and logs are retained.
                  </p>
                  <p className="text-xs text-cyan-400 mt-2">Coming Soon</p>
                </div>
                <div className="p-4 rounded-lg bg-navy-800/50 border border-navy-700/30">
                  <h3 className="text-sm font-medium text-white mb-1">Export Data</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Export your QA data, reports, and artifacts.
                  </p>
                  <p className="text-xs text-cyan-400 mt-2">Coming Soon</p>
                </div>
                <div className="p-4 rounded-lg bg-rose-500/5 border border-rose-500/20">
                  <h3 className="text-sm font-medium text-rose-400 mb-1">Delete Organization Data</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Permanently delete all data associated with your organization. This action cannot be undone.
                  </p>
                  <button className="mt-3 flex items-center gap-1.5 text-xs font-medium text-rose-400 hover:text-rose-300 px-3 py-1.5 rounded-lg border border-rose-500/20 hover:bg-rose-500/5 transition-colors">
                    <Trash2 className="w-3 h-3" />
                    Request Data Deletion
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
