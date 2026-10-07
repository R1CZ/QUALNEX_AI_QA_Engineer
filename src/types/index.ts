export type UserRole = 'owner' | 'admin' | 'member' | 'viewer';

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role: UserRole;
  organizationId: string;
  createdAt: string;
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
  status: 'active' | 'paused' | 'error';
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
