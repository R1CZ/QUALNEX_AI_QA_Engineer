/**
 * Shared GitHub repository access.
 *
 * Works for both sign-in scenarios:
 *  - Logged in with Google + manually connected GitHub (Repositories page)
 *  - Logged in directly with GitHub (provider already attached at auth time)
 */
import { auth, isGitHubConnected, getGitHubAccessToken, getGitHubLogin } from './firebase';
import type { Repository } from '../types';

export interface GitHubViewer {
  login: string;
  name?: string | null;
  avatarUrl?: string | null;
}

/** The GitHub account currently authorized for this session, if any. */
export function getCurrentGitHubAccount(): GitHubViewer | null {
  const user = auth.currentUser;
  if (!user || !isGitHubConnected(user)) return null;
  const gh = user.providerData.find((p) => p.providerId === 'github.com') as any;
  const login = gh?.username || getGitHubLogin(user);
  if (!login) return null;
  return {
    login,
    name: gh?.displayName || user.displayName || null,
    avatarUrl: gh?.photoURL || user.photoURL || null,
  };
}

/**
 * List repositories visible to the authorized GitHub account.
 * Throws when no GitHub account is connected so callers can show a clear
 * "connect GitHub first" message instead of an empty list.
 */
export async function fetchGitHubRepositories(): Promise<Repository[]> {
  const account = getCurrentGitHubAccount();
  if (!account) {
    throw new Error('No GitHub account is connected. Connect GitHub first.');
  }
  const token = await getGitHubAccessToken();
  if (!token) {
    throw new Error(
      'Could not obtain a GitHub authorization token. Reconnect your GitHub account and try again.'
    );
  }

  const res = await fetch(
    'https://api.github.com/user/repos?per_page=100&sort=pushed&affiliation=owner,collaborator,organization_member',
    { headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' } }
  );
  if (res.status === 401) {
    throw new Error('The GitHub authorization expired or lacks the repo scope. Reconnect your GitHub account.');
  }
  if (!res.ok) {
    throw new Error(`GitHub returned an error while listing repositories (${res.status}).`);
  }

  const data: any[] = await res.json();
  return data.map((r: any) => ({
    id: String(r.id),
    name: r.name,
    fullName: r.full_name,
    owner: typeof r.owner === 'string' ? r.owner : r.owner?.login || account.login,
    language: r.language || 'Unknown',
    framework: undefined,
    defaultBranch: r.default_branch || 'main',
    lastUpdated: r.pushed_at || r.updated_at || new Date().toISOString(),
    connected: true,
  }));
}
