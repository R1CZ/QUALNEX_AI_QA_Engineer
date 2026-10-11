// NOTE: Role-based access control (Owner/Admin/Member/Viewer) has been removed
// from QUALNEX until it is actually implemented. Every authenticated user has
// full access to their own organization's data.

export interface GitHubAccount {
  login: string;
  name?: string | null;
  avatarUrl?: string | null;
  connectedAt: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  organizationId: string;
  createdAt: string;
  /** Present when the user signed in (or linked) with GitHub — the GitHub
   * account is then already authorized for repository access. */
  githubAccount?: GitHubAccount | null;
}

export interface Organization {
  id: string;
  name: string;
  plan: 'free' | 'pro' | 'enterprise';
  createdAt: string;
}

export interface Repository {
  id: string;
  name: string;
  fullName: string;
  owner: string;
  language: string;
  framework?: string;
  defaultBranch: string;
  lastUpdated: string;
  connected: boolean;
}

export interface Project {
  id: string;
  name: string;
  repositoryId: string;
  repository: string;
  branch: string;
  buildCommand: string;
  startCommand: string;
  /** AI model used for testing/scanning (e.g. "deepseek-chat"). */
  aiModel?: string;
  status: 'active' | 'paused' | 'error';
  /** Saved QA scope from the Configure step — Run QA uses this config. */
  qaConfig?: QAConfig;
  /** True once the user has saved a configuration via the Configure button. */
  configured?: boolean;
  lastRunAt?: string;
  createdAt: string;
}

export type RunStatus = 
  | 'queued' | 'preparing' | 'building' | 'preview' 
  | 'discovering' | 'planning' | 'testing' | 'analyzing' 
  | 'validating' | 'deduplicating' | 'delivering' | 'completed'
  | 'build_failed' | 'preview_failed' | 'environment_failed' 
  | 'partial' | 'cancelled' | 'timed_out';

export interface QARun {
  id: string;
  projectId: string;
  projectName: string;
  status: RunStatus;
  currentStep: string;
  progress: number;
  testCount: number;
  findingsCount: number;
  confirmedBugs: number;
  startedAt: string;
  completedAt?: string;
  config: QAConfig;
  /** AI model performing the testing/scanning for this run. */
  aiModel?: string;
  /** Set when the run failed — surfaced in the QA Runs UI. */
  errorMessage?: string;
}

export interface QAConfig {
  functional: string[];
  api: string[];
  ui: string[];
  performance: string[];
  workflow: string[];
}

export type BugStatus = 'suspected' | 'investigating' | 'confirmed' | 'duplicate' | 'not_reproducible' | 'false_positive';
export type BugSeverity = 'critical' | 'high' | 'medium' | 'low';
export type BugConfidence = 'low' | 'medium' | 'high';

export interface Bug {
  id: string;
  qaCaseId?: string;
  runId: string;
  title: string;
  description: string;
  status: BugStatus;
  severity: BugSeverity;
  confidence: BugConfidence;
  category: string;
  page: string;
  route: string;
  component?: string;
  expectedResult: string;
  actualResult: string;
  reproductionSteps: string[];
  evidence: Evidence[];
  externalIssueId?: string;
  externalIssueUrl?: string;
  createdAt: string;
}

export interface Evidence {
  type: 'screenshot' | 'video' | 'console_log' | 'network_log' | 'trace' | 'api_response';
  url: string;
  description: string;
  timestamp: string;
}

export interface QACase {
  id: string;
  caseNumber: string;
  bugId: string;
  title: string;
  severity: BugSeverity;
  priority: 'P0' | 'P1' | 'P2' | 'P3';
  category: string;
  page: string;
  route: string;
  reproductionSteps: string[];
  expectedResult: string;
  actualResult: string;
  evidence: Evidence[];
  confidence: BugConfidence;
  deliveredTo?: string;
  externalIssueId?: string;
  externalIssueUrl?: string;
  createdAt: string;
}

export interface Integration {
  id: string;
  vendor: 'jira' | 'github' | 'linear' | 'azure_devops' | 'servicenow';
  name: string;
  connected: boolean;
  workspace?: string;
  project?: string;
  lastSync?: string;
  config: Record<string, string>;
}

export interface DiscoveredRoute {
  path: string;
  method?: string;
  component?: string;
  confidence: number;
  tested: boolean;
}

export interface AppMapNode {
  id: string;
  label: string;
  type: 'page' | 'component' | 'api' | 'workflow';
  children?: AppMapNode[];
  route?: string;
}

export interface DashboardStats {
  activeRuns: number;
  totalTests: number;
  validatedBugs: number;
  qaCases: number;
  severityDistribution: { critical: number; high: number; medium: number; low: number };
  recentActivity: ActivityItem[];
}

export interface ActivityItem {
  id: string;
  type: 'run_completed' | 'bug_confirmed' | 'qa_case_created' | 'integration_sync' | 'project_created';
  message: string;
  timestamp: string;
  link?: string;
}
