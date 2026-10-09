import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import type { User, Organization, Project, QARun, Bug, QACase, Integration, DashboardStats } from '../types';
import { apiClient, ApiError } from '../lib/api';

interface AppState {
  user: User | null;
  organization: Organization | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  projects: Project[];
  qaRuns: QARun[];
  bugs: Bug[];
  qaCases: QACase[];
  integrations: Integration[];
  dashboard: DashboardStats;
  error: string | null;
}

interface AppContextType extends AppState {
  login: (provider: 'google' | 'github') => Promise<void>;
  handleOAuthCallback: (code: string, provider: string, state: string) => Promise<void>;
  logout: () => void;
  createProject: (project: Omit<Project, 'id' | 'createdAt' | 'status'>) => Promise<void>;
  startQARun: (projectId: string, config: any) => Promise<void>;
  connectIntegration: (integration: Omit<Integration, 'id'>) => Promise<void>;
  refreshData: () => Promise<void>;
  clearError: () => void;
}

const AppContext = createContext<AppContextType | null>(null);

const emptyDashboard: DashboardStats = {
  activeRuns: 0,
  totalTests: 0,
  validatedBugs: 0,
  qaCases: 0,
  severityDistribution: { critical: 0, high: 0, medium: 0, low: 0 },
  recentActivity: [],
};

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>({
    user: null,
    organization: null,
    isAuthenticated: false,
    isLoading: true,
    projects: [],
    qaRuns: [],
    bugs: [],
    qaCases: [],
    integrations: [],
    dashboard: emptyDashboard,
    error: null,
  });

  // Check for existing session on mount
  useEffect(() => {
    const checkAuth = async () => {
      const token = sessionStorage.getItem('qualnex_token');
      if (token) {
        try {
          const user = await apiClient.getCurrentUser();
          setState(prev => ({
            ...prev,
            isAuthenticated: true,
            user: {
              id: user.id,
              email: user.email,
              name: user.name || user.email,
              role: 'owner',
              organizationId: 'org_1',
              createdAt: new Date().toISOString(),
            },
            organization: {
              id: 'org_1',
              name: user.organization || 'My Organization',
              plan: 'pro',
              createdAt: new Date().toISOString(),
            },
            isLoading: false,
          }));
          // Load data after auth check
          await loadAllData();
        } catch (err) {
          // Token invalid, clear it
          sessionStorage.removeItem('qualnex_token');
          setState(prev => ({ ...prev, isLoading: false }));
        }
      } else {
        setState(prev => ({ ...prev, isLoading: false }));
      }
    };
    checkAuth();
  }, []);

  const loadAllData = async () => {
    try {
      const [projects, runs, bugs, cases, integrations] = await Promise.all([
        apiClient.listProjects().catch(() => ({ projects: [] })),
        apiClient.listRuns().catch(() => ({ runs: [] })),
        apiClient.listFindings().catch(() => ({ findings: [] })),
        apiClient.listQACases().catch(() => ({ qa_cases: [] })),
        apiClient.listIntegrations().catch(() => ({ integrations: [] })),
      ]);

      setState(prev => ({
        ...prev,
        projects: projects.projects || [],
        qaRuns: runs.runs || [],
        bugs: bugs.findings || [],
        qaCases: cases.qa_cases || [],
        integrations: integrations.integrations || [],
      }));
    } catch (err) {
      console.error('Failed to load data:', err);
    }
  };

  const refreshData = useCallback(async () => {
    await loadAllData();
  }, []);

  const login = useCallback(async (provider: 'google' | 'github') => {
    try {
      setState(prev => ({ ...prev, error: null }));
      
      // Get OAuth URL from backend
      if (provider === 'google') {
        const { url } = await apiClient.getGoogleAuthUrl();
        window.location.href = url;
      } else {
        const { url } = await apiClient.getGitHubAuthUrl();
        window.location.href = url;
      }
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Login failed';
      setState(prev => ({ ...prev, error: message }));
      throw err;
    }
  }, []);

  const handleOAuthCallback = useCallback(async (code: string, provider: string, state: string) => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      const result = await apiClient.authCallback(code, provider, state);
      
      setState(prev => ({
        ...prev,
        isAuthenticated: true,
        user: {
          id: result.user.id,
          email: result.user.email,
          name: result.user.name || result.user.email,
          role: 'owner',
          organizationId: 'org_1',
          createdAt: new Date().toISOString(),
        },
        organization: {
          id: 'org_1',
          name: result.user.organization || 'My Organization',
          plan: 'pro',
          createdAt: new Date().toISOString(),
        },
        isLoading: false,
      }));

      await loadAllData();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Authentication failed';
      setState(prev => ({ ...prev, isLoading: false, error: message }));
      throw err;
    }
  }, []);

  const logout = useCallback(() => {
    apiClient.clearToken();
    setState({
      user: null,
      organization: null,
      isAuthenticated: false,
      isLoading: false,
      projects: [],
      qaRuns: [],
      bugs: [],
      qaCases: [],
      integrations: [],
      dashboard: emptyDashboard,
      error: null,
    });
  }, []);

  const createProject = useCallback(async (project: Omit<Project, 'id' | 'createdAt' | 'status'>) => {
    try {
      setState(prev => ({ ...prev, error: null }));
      const newProject = await apiClient.createProject({
        name: project.name,
        repository_id: project.repositoryId,
        branch: project.branch,
        build_command: project.buildCommand,
        start_command: project.startCommand,
      });
      setState(prev => ({
        ...prev,
        projects: [...prev.projects, { ...newProject, status: 'active', createdAt: new Date().toISOString() }],
      }));
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to create project';
      setState(prev => ({ ...prev, error: message }));
      throw err;
    }
  }, []);

  const startQARun = useCallback(async (projectId: string, config: any) => {
    try {
      setState(prev => ({ ...prev, error: null }));
      const newRun = await apiClient.createRun(projectId, config);
      setState(prev => ({
        ...prev,
        qaRuns: [{
          ...newRun,
          projectName: prev.projects.find(p => p.id === projectId)?.name || '',
          status: 'queued',
          currentStep: 'Queued',
          progress: 0,
          testCount: 0,
          findingsCount: 0,
          confirmedBugs: 0,
          startedAt: new Date().toISOString(),
          config,
        }, ...prev.qaRuns],
      }));
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to start QA run';
      setState(prev => ({ ...prev, error: message }));
      throw err;
    }
  }, []);

  const connectIntegration = useCallback(async (integration: Omit<Integration, 'id'>) => {
    try {
      setState(prev => ({ ...prev, error: null }));
      const result = await apiClient.connectIntegration(
        integration.vendor,
        integration.config || {},
        {}
      );
      const newIntegration: Integration = {
        ...integration,
        id: 'int_' + Math.random().toString(36).substr(2, 9),
        connected: true,
      };
      setState(prev => ({
        ...prev,
        integrations: [...prev.integrations, newIntegration],
      }));
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to connect integration';
      setState(prev => ({ ...prev, error: message }));
      throw err;
    }
  }, []);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  return (
    <AppContext.Provider value={{
      ...state,
      login,
      handleOAuthCallback,
      logout,
      createProject,
      startQARun,
      connectIntegration,
      refreshData,
      clearError,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
}
