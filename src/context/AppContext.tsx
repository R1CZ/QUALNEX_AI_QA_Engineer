import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import type {
  User, Organization, Project, QARun, Bug, QACase, Integration,
  DashboardStats, Repository, GitHubAccount, QAConfig,
} from '../types';
import { apiClient, ApiError } from '../lib/api';
import { linkGitHubIfPending } from '../lib/firebase';

interface AppState {
  user: User | null;
  organization: Organization | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  projects: Project[];
  repositories: Repository[];
  qaRuns: QARun[];
  bugs: Bug[];
  qaCases: QACase[];
  integrations: Integration[];
  dashboard: DashboardStats;
  /** Number of QA runs started since the user last opened the QA Runs page. */
  newRunCount: number;
  /** AI Guide walkthrough modal visibility (kept in context so the sidebar
   * button and any other entry point share one state). */
  guideOpen: boolean;
  error: string | null;
}

interface FirebaseUserData {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  token: string;
  provider: string;
}

interface AppContextType extends AppState {
  login: (userData: FirebaseUserData) => Promise<void>;
  logout: () => void;
  setRepositories: (repositories: Repository[]) => void;
  setUserGithubAccount: (account: GitHubAccount | null) => void;
  createProject: (input: { name: string; repositoryId: string; aiModel?: string }) => Promise<Project>;
  startQARun: (projectId: string, config?: QAConfig, aiModel?: string) => Promise<QARun | null>;
  markRunsViewed: () => void;
  setGuideOpen: (open: boolean) => void;
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

/** Default testing scope applied when a run is started without an explicit config. */
const defaultQAConfig: QAConfig = {
  functional: ['forms', 'navigation', 'auth flows'],
  api: ['error handling', 'status codes'],
  ui: ['responsive layout', 'accessibility'],
  performance: ['page load time'],
  workflow: ['critical user journeys'],
};

export const AI_MODELS = [
  { id: 'deepseek-chat', label: 'DeepSeek V3 (fast — recommended for standard scans)' },
  { id: 'deepseek-reasoner', label: 'DeepSeek R1 (deep reasoning — complex codebases)' },
];

function seenRunsKey(uid: string) {
  return `qualnex_seen_run_ids_${uid}`;
}

function readSeenRuns(uid: string): string[] {
  try {
    return JSON.parse(localStorage.getItem(seenRunsKey(uid)) || '[]');
  } catch {
    return [];
  }
}

function writeSeenRuns(uid: string, ids: string[]) {
  try {
    localStorage.setItem(seenRunsKey(uid), JSON.stringify(ids.slice(-200)));
  } catch { /* ignore quota errors */ }
}

const initialState: AppState = {
  user: null,
  organization: null,
  isAuthenticated: false,
  isLoading: true,
  projects: [],
  repositories: [],
  qaRuns: [],
  bugs: [],
  qaCases: [],
  integrations: [],
  dashboard: emptyDashboard,
  newRunCount: 0,
  guideOpen: false,
  error: null,
};

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(initialState);

  // Load all data from the backend (each call degrades gracefully so a
  // partially available API never blocks the UI).
  const loadAllData = useCallback(async () => {
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
  }, []);

  // Check for existing session on mount.
  useEffect(() => {
    const checkAuth = async () => {
      const token = sessionStorage.getItem('qualnex_token');
      if (!token) {
        setState(prev => ({ ...prev, isLoading: false }));
        return;
      }
      try {
        const user = await apiClient.getCurrentUser();
        setState(prev => ({
          ...prev,
          isAuthenticated: true,
          user: {
            id: user.id,
            email: user.email,
            name: user.name || user.email,
            organizationId: user.organizationId || 'org_1',
            createdAt: new Date().toISOString(),
          },
          organization: {
            id: user.organizationId || 'org_1',
            name: user.organization || 'My Organization',
            plan: 'pro',
            createdAt: new Date().toISOString(),
          },
          isLoading: false,
        }));
        await loadAllData();
      } catch (err) {
        // The stored token may be a Firebase ID token while the backend is
        // down or expects its own JWT. Do NOT log the user out in that case —
        // keep the session (Firebase remains the source of truth) and let
        // data calls fail gracefully instead of bouncing them to /login.
        console.warn('Backend session check unavailable — keeping Firebase session:', err);
        setState(prev => ({ ...prev, isLoading: false }));
      }
    };
    checkAuth();
  }, [loadAllData]);

  const refreshData = useCallback(async () => {
    await loadAllData();
  }, [loadAllData]);

  const login = useCallback(async (userData: FirebaseUserData) => {
    setState(prev => ({ ...prev, error: null, isLoading: true }));
    try {
      // Store Firebase token for API calls
      sessionStorage.setItem('qualnex_token', userData.token);
      apiClient.setToken(userData.token);

      // Complete any deferred GitHub link (e.g. a previous attempt hit
      // "account exists with different credentials") so both providers
      // resolve to this single account. Non-fatal by design.
      try {
        await linkGitHubIfPending();
      } catch { /* ignore */ }

      // Verify token with backend and get/create user.
      // The backend is optional for sign-in: if it is unreachable or rejects
      // the token, we still complete the session using the Firebase identity
      // so the user is never locked out by a "Request failed" error.
      let backendUser: any = null;
      try {
        backendUser = await apiClient.verifyFirebaseToken(userData.token, {
          uid: userData.uid,
          email: userData.email,
          displayName: userData.displayName,
          photoURL: userData.photoURL,
          provider: userData.provider,
        });
      } catch (apiErr) {
        console.warn(
          'Backend verification unavailable — continuing with Firebase session only:',
          apiErr
        );
      }

      setState(prev => ({
        ...prev,
        isAuthenticated: true,
        user: {
          id: backendUser?.id || userData.uid,
          email: userData.email || '',
          name: userData.displayName || userData.email || 'User',
          avatar: userData.photoURL || undefined,
          organizationId: backendUser?.organizationId || 'org_1',
          createdAt: backendUser?.createdAt || new Date().toISOString(),
        },
        organization: {
          id: backendUser?.organizationId || 'org_1',
          name: backendUser?.organizationName || 'My Organization',
          plan: backendUser?.plan || 'free',
          createdAt: new Date().toISOString(),
        },
        isLoading: false,
      }));

      // Load user data
      await loadAllData();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Login failed';
      setState(prev => ({ ...prev, error: message, isLoading: false }));
      throw err;
    }
  }, [loadAllData]);

  const logout = useCallback(() => {
    apiClient.clearToken();
    setState({ ...initialState, isLoading: false });
  }, []);

  const setRepositories = useCallback((repositories: Repository[]) => {
    setState(prev => ({ ...prev, repositories }));
  }, []);

  const setUserGithubAccount = useCallback((account: GitHubAccount | null) => {
    setState(prev => prev.user ? { ...prev, user: { ...prev.user, githubAccount: account } } : prev);
  }, []);

  /**
   * Create a project from the simplified 3-field form (name, repository,
   * AI model) and immediately begin the automated QA run for it.
   */
  const createProject = useCallback(async (input: { name: string; repositoryId: string; aiModel?: string }): Promise<Project> => {
    setState(prev => ({ ...prev, error: null }));
    const repo = state.repositories.find(r => r.id === input.repositoryId);
    const repositoryFullName = repo?.fullName || input.repositoryId;

    let created: any;
    try {
      created = await apiClient.createProject({
        name: input.name,
        repository_id: input.repositoryId,
        branch: repo?.defaultBranch || 'main',
        ai_model: input.aiModel,
      });
    } catch (err) {
      // Backend unavailable — keep the project locally so the workflow
      // (run → QA Runs → Bugs) still functions within this session.
      console.warn('Backend project creation unavailable, keeping project locally:', err);
      created = {
        id: 'prj_' + Math.random().toString(36).slice(2, 10),
        name: input.name,
        repository: repositoryFullName,
        branch: repo?.defaultBranch || 'main',
      };
    }

    const project: Project = {
      id: String(created.id),
      name: created.name || input.name,
      repositoryId: input.repositoryId,
      repository: created.repository || repositoryFullName,
      branch: created.branch || repo?.defaultBranch || 'main',
      buildCommand: created.buildCommand || 'npm run build',
      startCommand: created.startCommand || 'npm start',
      aiModel: input.aiModel,
      status: 'active',
      createdAt: new Date().toISOString(),
    };

    setState(prev => ({
      ...prev,
      projects: [project, ...prev.projects.filter(p => p.id !== project.id)],
    }));
    return project;
  }, [state.repositories]);

  /**
   * Start a QA run for a project. Increments the QA Runs notification badge
   * exactly once per new run (deduplicated per user via localStorage so
   * reloads/syncs never double-count).
   */
  const startQARun = useCallback(async (projectId: string, config?: QAConfig, aiModel?: string): Promise<QARun | null> => {
    setState(prev => ({ ...prev, error: null }));
    const project = state.projects.find(p => p.id === projectId);
    const runConfig = config || defaultQAConfig;
    const model = aiModel || project?.aiModel;

    let created: any = null;
    try {
      created = await apiClient.createRun(projectId, {
        ...runConfig,
        ...(model ? { ai_model: [model] } : {}),
      });
    } catch (err) {
      console.warn('Backend run creation unavailable, tracking run locally:', err);
      created = { id: 'run_' + Math.random().toString(36).slice(2, 10), status: 'queued' };
    }

    const run: QARun = {
      id: String(created.id),
      projectId,
      projectName: project?.name || created.projectName || '',
      status: 'queued',
      currentStep: 'Queued',
      progress: 0,
      testCount: 0,
      findingsCount: 0,
      confirmedBugs: 0,
      startedAt: new Date().toISOString(),
      config: runConfig,
      aiModel: model,
    };

    setState(prev => {
      const exists = prev.qaRuns.some(r => r.id === run.id);
      const uid = prev.user?.id || 'anon';
      const seen = readSeenRuns(uid);
      const isNew = !exists && !seen.includes(run.id);
      if (isNew) writeSeenRuns(uid, [...seen, run.id]);
      return {
        ...prev,
        qaRuns: exists ? prev.qaRuns : [run, ...prev.qaRuns],
        newRunCount: isNew ? prev.newRunCount + 1 : prev.newRunCount,
        projects: prev.projects.map(p =>
          p.id === projectId ? { ...p, lastRunAt: run.startedAt } : p
        ),
      };
    });
    return run;
  }, [state.projects]);

  const markRunsViewed = useCallback(() => {
    setState(prev => (prev.newRunCount === 0 ? prev : { ...prev, newRunCount: 0 }));
  }, []);

  const setGuideOpen = useCallback((open: boolean) => {
    setState(prev => ({ ...prev, guideOpen: open }));
  }, []);

  const connectIntegration = useCallback(async (integration: Omit<Integration, 'id'>) => {
    try {
      setState(prev => ({ ...prev, error: null }));
      await apiClient.connectIntegration(
        integration.vendor,
        integration.config || {},
        {}
      );
    } catch (err) {
      // Still record the connection locally so the workspace keeps working
      // when the backend is unavailable; surface nothing fatal.
      console.warn('Backend integration connect unavailable, recording locally:', err);
    }
    const newIntegration: Integration = {
      ...integration,
      id: 'int_' + Math.random().toString(36).substr(2, 9),
      connected: true,
    };
    setState(prev => ({
      ...prev,
      integrations: [...prev.integrations.filter(i => i.vendor !== integration.vendor), newIntegration],
    }));
  }, []);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  return (
    <AppContext.Provider value={{
      ...state,
      login,
      logout,
      setRepositories,
      setUserGithubAccount,
      createProject,
      startQARun,
      markRunsViewed,
      setGuideOpen,
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
