import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import type { User, Organization, Project, QARun, Bug, QACase, Integration, DashboardStats, QAConfig } from '../types';

interface AppState {
  user: User | null;
  organization: Organization | null;
  isAuthenticated: boolean;
  projects: Project[];
  qaRuns: QARun[];
  bugs: Bug[];
  qaCases: QACase[];
  integrations: Integration[];
  dashboard: DashboardStats;
}

interface AppContextType extends AppState {
  login: (provider: 'google' | 'github') => void;
  logout: () => void;
  createProject: (project: Omit<Project, 'id' | 'createdAt' | 'status'>) => void;
  startQARun: (projectId: string) => void;
  connectIntegration: (integration: Omit<Integration, 'id'>) => void;
  isDemoMode: boolean;
  toggleDemoMode: () => void;
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

const demoDashboard: DashboardStats = {
  activeRuns: 1,
  totalTests: 147,
  validatedBugs: 12,
  qaCases: 9,
  severityDistribution: { critical: 2, high: 4, medium: 4, low: 2 },
  recentActivity: [
    { id: '1', type: 'run_completed', message: 'QA run completed for ecommerce-app', timestamp: new Date(Date.now() - 3600000).toISOString() },
    { id: '2', type: 'bug_confirmed', message: 'Confirmed: Form validation bypass on /checkout', timestamp: new Date(Date.now() - 7200000).toISOString() },
    { id: '3', type: 'qa_case_created', message: 'QA case QNX-000042 created', timestamp: new Date(Date.now() - 10800000).toISOString() },
    { id: '4', type: 'integration_sync', message: 'Issue delivered to Jira: PROJ-234', timestamp: new Date(Date.now() - 14400000).toISOString() },
    { id: '5', type: 'project_created', message: 'Project "Dashboard Redesign" created', timestamp: new Date(Date.now() - 86400000).toISOString() },
  ],
};

const demoProjects: Project[] = [
  {
    id: 'prj_demo1',
    name: 'E-Commerce Platform',
    repositoryId: 'repo_1',
    repository: 'acme/ecommerce-app',
    branch: 'main',
    buildCommand: 'npm run build',
    startCommand: 'npm start',
    status: 'active',
    lastRunAt: new Date(Date.now() - 3600000).toISOString(),
    createdAt: new Date(Date.now() - 604800000).toISOString(),
  },
  {
    id: 'prj_demo2',
    name: 'Dashboard Redesign',
    repositoryId: 'repo_2',
    repository: 'acme/dashboard-v2',
    branch: 'develop',
    buildCommand: 'yarn build',
    startCommand: 'yarn dev',
    status: 'active',
    lastRunAt: new Date(Date.now() - 86400000).toISOString(),
    createdAt: new Date(Date.now() - 259200000).toISOString(),
  },
  {
    id: 'prj_demo3',
    name: 'API Gateway',
    repositoryId: 'repo_3',
    repository: 'acme/api-gateway',
    branch: 'main',
    buildCommand: 'go build',
    startCommand: './server',
    status: 'paused',
    createdAt: new Date(Date.now() - 1209600000).toISOString(),
  },
];

const demoRuns: QARun[] = [
  {
    id: 'run_demo1',
    projectId: 'prj_demo1',
    projectName: 'E-Commerce Platform',
    status: 'completed',
    currentStep: 'Completed',
    progress: 100,
    testCount: 147,
    findingsCount: 18,
    confirmedBugs: 12,
    startedAt: new Date(Date.now() - 7200000).toISOString(),
    completedAt: new Date(Date.now() - 3600000).toISOString(),
    config: { functional: ['buttons', 'forms', 'navigation', 'crud'], api: ['api_endpoints', 'validation'], ui: ['visual', 'responsive'], performance: ['page_load'], workflow: ['e2e'] } as QAConfig,
  },
  {
    id: 'run_demo2',
    projectId: 'prj_demo2',
    projectName: 'Dashboard Redesign',
    status: 'testing',
    currentStep: 'Testing /settings',
    progress: 62,
    testCount: 89,
    findingsCount: 5,
    confirmedBugs: 2,
    startedAt: new Date(Date.now() - 1800000).toISOString(),
    config: { functional: ['buttons', 'forms'], api: [], ui: ['visual', 'responsive', 'accessibility'], performance: [], workflow: ['e2e'] },
  },
];

const demoBugs: Bug[] = [
  {
    id: 'bug_1',
    qaCaseId: 'qac_1',
    runId: 'run_demo1',
    title: 'Checkout form accepts invalid email format',
    description: 'The email field on the checkout page does not validate email format properly. Entering "test@" passes validation and submits the form.',
    status: 'confirmed',
    severity: 'high',
    confidence: 'high',
    category: 'Form Validation',
    page: 'Checkout',
    route: '/checkout',
    component: 'EmailInput',
    expectedResult: 'Form should display validation error for invalid email format',
    actualResult: 'Form accepts "test@" as valid email and proceeds to payment',
    reproductionSteps: ['Navigate to /checkout', 'Enter "test@" in email field', 'Click "Continue to Payment"', 'Observe form submits without error'],
    evidence: [{ type: 'screenshot', url: '#', description: 'Screenshot showing invalid email accepted', timestamp: new Date().toISOString() }],
    createdAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 'bug_2',
    runId: 'run_demo1',
    title: 'Product search returns 500 error with special characters',
    description: 'Searching for products with special characters like <script> causes a server 500 error instead of returning empty results or a validation error.',
    status: 'confirmed',
    severity: 'critical',
    confidence: 'high',
    category: 'API Error Handling',
    page: 'Search',
    route: '/search',
    expectedResult: 'Search should handle special characters gracefully',
    actualResult: 'Server returns 500 Internal Server Error',
    reproductionSteps: ['Navigate to /search', 'Enter "<script>" in search box', 'Press Enter', 'Observe 500 error page'],
    evidence: [
      { type: 'screenshot', url: '#', description: '500 error page', timestamp: new Date().toISOString() },
      { type: 'network_log', url: '#', description: 'API response showing 500 status', timestamp: new Date().toISOString() },
    ],
    createdAt: new Date(Date.now() - 5400000).toISOString(),
  },
  {
    id: 'bug_3',
    runId: 'run_demo1',
    title: 'Navigation menu not keyboard accessible',
    description: 'The main navigation dropdown menu cannot be opened or navigated using keyboard only. Tab key skips the menu items entirely.',
    status: 'confirmed',
    severity: 'medium',
    confidence: 'high',
    category: 'Accessibility',
    page: 'Home',
    route: '/',
    component: 'NavigationMenu',
    expectedResult: 'Menu should be fully operable with keyboard (Tab, Enter, Arrow keys)',
    actualResult: 'Tab key skips menu items, no keyboard interaction possible',
    reproductionSteps: ['Navigate to /', 'Press Tab key repeatedly', 'Observe focus skips navigation menu items'],
    evidence: [{ type: 'video', url: '#', description: 'Keyboard navigation attempt', timestamp: new Date().toISOString() }],
    createdAt: new Date(Date.now() - 4800000).toISOString(),
  },
  {
    id: 'bug_4',
    runId: 'run_demo2',
    title: 'Dark mode toggle does not persist across page reload',
    description: 'When toggling dark mode in settings, the preference is not saved. Reloading the page resets to light mode.',
    status: 'confirmed',
    severity: 'medium',
    confidence: 'medium',
    category: 'State Persistence',
    page: 'Settings',
    route: '/settings',
    component: 'ThemeToggle',
    expectedResult: 'Dark mode preference should persist after page reload',
    actualResult: 'Page resets to light mode after reload',
    reproductionSteps: ['Navigate to /settings', 'Toggle dark mode', 'Reload the page', 'Observe theme resets to light'],
    evidence: [{ type: 'screenshot', url: '#', description: 'Theme reset after reload', timestamp: new Date().toISOString() }],
    createdAt: new Date(Date.now() - 2400000).toISOString(),
  },
];

const demoQACases: QACase[] = [
  {
    id: 'qac_1',
    caseNumber: 'QNX-000042',
    bugId: 'bug_1',
    title: 'Checkout form accepts invalid email format',
    severity: 'high',
    priority: 'P1',
    category: 'Form Validation',
    page: 'Checkout',
    route: '/checkout',
    reproductionSteps: ['Navigate to /checkout', 'Enter "test@" in email field', 'Click "Continue to Payment"', 'Observe form submits without error'],
    expectedResult: 'Form should display validation error for invalid email format',
    actualResult: 'Form accepts "test@" as valid email and proceeds to payment',
    evidence: [{ type: 'screenshot', url: '#', description: 'Invalid email accepted', timestamp: new Date().toISOString() }],
    confidence: 'high',
    deliveredTo: 'Jira',
    externalIssueId: 'PROJ-234',
    externalIssueUrl: '#',
    createdAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 'qac_2',
    caseNumber: 'QNX-000043',
    bugId: 'bug_2',
    title: 'Product search returns 500 error with special characters',
    severity: 'critical',
    priority: 'P0',
    category: 'API Error Handling',
    page: 'Search',
    route: '/search',
    reproductionSteps: ['Navigate to /search', 'Enter "<script>" in search box', 'Press Enter', 'Observe 500 error page'],
    expectedResult: 'Search should handle special characters gracefully',
    actualResult: 'Server returns 500 Internal Server Error',
    evidence: [
      { type: 'screenshot', url: '#', description: '500 error page', timestamp: new Date().toISOString() },
      { type: 'network_log', url: '#', description: 'API 500 response', timestamp: new Date().toISOString() },
    ],
    confidence: 'high',
    deliveredTo: 'GitHub Issues',
    externalIssueId: '#156',
    externalIssueUrl: '#',
    createdAt: new Date(Date.now() - 5400000).toISOString(),
  },
];

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>({
    user: null,
    organization: null,
    isAuthenticated: false,
    projects: [],
    qaRuns: [],
    bugs: [],
    qaCases: [],
    integrations: [],
    dashboard: emptyDashboard,
  });

  // Demo mode toggle - persisted in localStorage
  const [isDemoMode, setIsDemoMode] = useState(() => {
    const stored = localStorage.getItem('qualnex_demo_mode');
    return stored === null ? true : stored === 'true'; // Default to demo mode
  });

  const toggleDemoMode = useCallback(() => {
    setIsDemoMode(prev => {
      const newValue = !prev;
      localStorage.setItem('qualnex_demo_mode', String(newValue));
      
      // Update state based on mode
      if (newValue) {
        // Switch to demo mode - populate with demo data
        setState(s => ({
          ...s,
          dashboard: demoDashboard,
          projects: demoProjects,
          qaRuns: demoRuns,
          bugs: demoBugs,
          qaCases: demoQACases,
        }));
      } else {
        // Switch to live mode - clear to empty state
        setState(s => ({
          ...s,
          dashboard: emptyDashboard,
          projects: [],
          qaRuns: [],
          bugs: [],
          qaCases: [],
        }));
      }
      
      return newValue;
    });
  }, []);

  const login = useCallback((provider: 'google' | 'github') => {
    // In production, this would redirect to OAuth flow
    // For now, simulate authentication
    setState(prev => ({
      ...prev,
      isAuthenticated: true,
      user: {
        id: 'usr_' + Math.random().toString(36).substr(2, 9),
        email: 'user@qualnex.io',
        name: 'QUALNEX User',
        role: 'owner',
        organizationId: 'org_1',
        createdAt: new Date().toISOString(),
      },
      organization: {
        id: 'org_1',
        name: 'My Organization',
        plan: 'pro',
        createdAt: new Date().toISOString(),
      },
      // Load demo data only if demo mode is enabled
      dashboard: isDemoMode ? demoDashboard : emptyDashboard,
      projects: isDemoMode ? demoProjects : [],
      qaRuns: isDemoMode ? demoRuns : [],
      bugs: isDemoMode ? demoBugs : [],
      qaCases: isDemoMode ? demoQACases : [],
    }));
  }, [isDemoMode]);

  const logout = useCallback(() => {
    setState(prev => ({
      ...prev,
      isAuthenticated: false,
      user: null,
      organization: null,
      projects: [],
      qaRuns: [],
      bugs: [],
      qaCases: [],
      integrations: [],
      dashboard: emptyDashboard,
    }));
  }, []);

  const createProject = useCallback((project: Omit<Project, 'id' | 'createdAt' | 'status'>) => {
    const newProject: Project = {
      ...project,
      id: 'prj_' + Math.random().toString(36).substr(2, 9),
      status: 'active',
      createdAt: new Date().toISOString(),
    };
    setState(prev => ({ ...prev, projects: [...prev.projects, newProject] }));
  }, []);

  const startQARun = useCallback((projectId: string) => {
    const project = state.projects.find(p => p.id === projectId);
    if (!project) return;
    
    const newRun: QARun = {
      id: 'run_' + Math.random().toString(36).substr(2, 9),
      projectId,
      projectName: project.name,
      status: 'queued',
      currentStep: 'Queued',
      progress: 0,
      testCount: 0,
      findingsCount: 0,
      confirmedBugs: 0,
      startedAt: new Date().toISOString(),
      config: { functional: [], api: [], ui: [], performance: [], workflow: [] },
    };
    setState(prev => ({ ...prev, qaRuns: [newRun, ...prev.qaRuns] }));
  }, [state.projects]);

  const connectIntegration = useCallback((integration: Omit<Integration, 'id'>) => {
    const newIntegration: Integration = {
      ...integration,
      id: 'int_' + Math.random().toString(36).substr(2, 9),
    };
    setState(prev => ({ ...prev, integrations: [...prev.integrations, newIntegration] }));
  }, []);

  return (
    <AppContext.Provider value={{
      ...state,
      login,
      logout,
      createProject,
      startQARun,
      connectIntegration,
      isDemoMode,
      toggleDemoMode,
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
