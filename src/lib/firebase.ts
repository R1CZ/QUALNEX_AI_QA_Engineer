/**
 * Firebase Configuration
 * 
 * Setup Instructions:
 * 1. Go to https://console.firebase.google.com/
 * 2. Create a new project (or use existing)
 * 3. Go to Project Settings > General > Your apps > Add web app
 * 4. Copy the config values below
 * 5. Enable Authentication providers:
 *    - Google (Authentication > Sign-in method > Google)
 *    - GitHub (Authentication > Sign-in method > GitHub)
 *    - Email/Password (optional)
 * 6. For GitHub, you'll need to create a GitHub OAuth App:
 *    - Go to https://github.com/settings/developers
 *    - Create new OAuth App
 *    - Authorization callback URL: Use the URL shown in Firebase console
 * 7. Copy the Client ID and Secret from GitHub to Firebase
 */

import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  signInWithRedirect, 
  linkWithPopup,
  linkWithRedirect,
  getRedirectResult,
  GoogleAuthProvider, 
  GithubAuthProvider,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';

// Firebase configuration - REPLACE WITH YOUR VALUES
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "YOUR_API_KEY",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "YOUR_PROJECT.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "YOUR_PROJECT_ID",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "YOUR_PROJECT.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "YOUR_SENDER_ID",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "YOUR_APP_ID",
};

/**
 * True when the Firebase config placeholders are still in place.
 * In that state every sign-in attempt fails with opaque errors such as
 * "Request failed" (auth/operation-not-allowed / auth/internal-error),
 * so we surface a clear message instead.
 */
export function isFirebaseConfigured(): boolean {
  return (
    !!firebaseConfig.apiKey && !firebaseConfig.apiKey.startsWith('YOUR_') &&
    !!firebaseConfig.projectId && !firebaseConfig.projectId.startsWith('YOUR_')
  );
}

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication
export const auth = getAuth(app);

// Configure providers
export const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('email');
googleProvider.addScope('profile');
// Ask Google to always return the account email. Without this, users whose
// GitHub account carries the same email end up creating a Google account
// with no email, which later triggers "account exists with different
// credentials" conflicts.
googleProvider.setCustomParameters({ prompt: 'select_account' });

export const githubProvider = new GithubAuthProvider();
githubProvider.addScope('read:user');
githubProvider.addScope('user:email');
githubProvider.addScope('repo');

/** Session key holding the OAuth parameters of a GitHub sign-in that hit an
 * "account exists with different credential" conflict. After the user signs
 * in with their original provider we mark this key so the app can complete
 * the link (linkGitHubIfPending) instead of failing with a dead-end error. */
const PENDING_LINK_KEY = 'qualnex_pending_github_link';

/**
 * True when a GitHub sign-in previously hit an account-exists conflict and
 * the link still needs to be completed after signing in with Google.
 */
export function hasPendingGitHubLink(): boolean {
  return readPendingGitHubLink() !== null;
}

function ensureConfigured() {
  if (!isFirebaseConfigured()) {
    throw new Error(
      'Firebase is not configured yet. Copy .env.example to .env and set your VITE_FIREBASE_* values (see FIREBASE_SETUP.md).'
    );
  }
}

/**
 * Remember that the user intended to link GitHub but hit an account-exists
 * conflict, so the app can finish the linking after they sign in with their
 * original provider (e.g. Google).
 */
function savePendingGitHubLink(_error?: any) {
  try {
    sessionStorage.setItem(PENDING_LINK_KEY, '1');
  } catch { /* sessionStorage may be unavailable */ }
}

function readPendingGitHubLink(): string | null {
  try {
    return sessionStorage.getItem(PENDING_LINK_KEY);
  } catch {
    return null;
  }
}

/**
 * True when the current Firebase account already has GitHub linked.
 */
export function isGitHubConnected(user: FirebaseUser | null = auth.currentUser): boolean {
  return !!user && user.providerData.some((p) => p.providerId === 'github.com');
}

/**
 * Extract the GitHub username from a credential/user (for display & repo fetch).
 */
export function getGitHubLogin(user: FirebaseUser): string | null {
  const gh = user.providerData.find((p) => p.providerId === 'github.com') as any;
  return gh?.username || user.displayName || null;
}

/**
 * Get a fresh GitHub OAuth access token for the signed-in user.
 * Requires the GitHub provider to be linked (via login or account linking).
 * Used by the Repositories page to list the user's repositories directly
 * from the GitHub API.
 */
export async function getGitHubAccessToken(): Promise<string | null> {
  const user = auth.currentUser;
  if (!user || !isGitHubConnected(user)) return null;
  try {
    // Re-running linkWithPopup for an already-linked provider returns the
    // existing credential without a consent prompt, giving us a fresh GitHub
    // OAuth access token (used to call the GitHub API directly).
    const result = await linkWithPopup(user, githubProvider);
    return (result as any).credential?.accessToken || null;
  } catch (err: any) {
    console.warn('Could not retrieve GitHub access token:', err?.code, err?.message);
    return null;
  }
}

/**
 * Map a FirebaseUser + credential into the payload the app expects.
 */
function buildUserData(user: FirebaseUser, providerId: string) {
  return {
    uid: user.uid,
    email: user.email,
    displayName:
      user.displayName ||
      (user.providerData[0] as any)?.username ||
      user.email ||
      'User',
    photoURL: user.photoURL,
    token: '', // filled in by caller (async getIdToken)
    provider: providerId,
  };
}

/**
 * Sign in with Google.
 * Uses redirect flow as an automatic fallback when popups are blocked
 * (common in embedded browsers, iOS Safari and strict desktop settings).
 */
export async function signInWithGoogle() {
  ensureConfigured();
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const token = await result.user.getIdToken();
    return { ...buildUserData(result.user, 'google'), token };
  } catch (error: any) {
    // Popup unavailable -> fall back to full-page redirect.
    // The result is handled on page load via handlePendingRedirect().
    if (
      error?.code === 'auth/popup-blocked' ||
      error?.code === 'auth/operation-not-supported-in-environment' ||
      error?.code === 'auth/cancelled-popup-request'
    ) {
      await signInWithRedirect(auth, googleProvider);
      return null; // page is navigating away
    }
    console.error('Google sign-in error:', error);
    throw new Error(getAuthErrorMessage(error?.code, error?.message));
  }
}

/**
 * Sign in with GitHub.
 * Handles auth/account-exists-with-different-credential gracefully:
 * if the email is already registered via another provider (e.g. the user
 * first signed in with Google), we link the GitHub credential to the
 * existing Firebase account instead of showing a dead-end error.
 */
export async function signInWithGitHub() {
  ensureConfigured();
  try {
    const result = await signInWithPopup(auth, githubProvider);
    const token = await result.user.getIdToken();
    return { ...buildUserData(result.user, 'github'), token };
  } catch (error: any) {
    if (
      error?.code === 'auth/popup-blocked' ||
      error?.code === 'auth/operation-not-supported-in-environment' ||
      error?.code === 'auth/cancelled-popup-request'
    ) {
      await signInWithRedirect(auth, githubProvider);
      return null; // page is navigating away
    }
    if (error?.code === 'auth/account-exists-with-different-credential') {
      // Email already used by another provider (e.g. Google). This is NOT a
      // dead-end: remember the intent and sign the user in with an existing
      // method instead. After that sign-in completes, GitHub is linked to the
      // same Firebase account automatically (linkGitHubIfPending()).
      savePendingGitHubLink(error);
      const providedEmail: string | undefined = error?.customData?.email;
      const methods: string[] = error?.customData?._methods || [];
      if (methods.includes('google.com')) {
        // Google is one of the registered methods, so complete the sign-in
        // with it right away — the user stays on the success path instead of
        // seeing an error they have to act on manually.
        await signInWithPopup(auth, googleProvider);
        const refreshed = auth.currentUser;
        const token = await refreshed!.getIdToken();
        return { ...buildUserData(refreshed!, 'google'), token };
      }
      throw new Error(
        `This email (${providedEmail || 'your email'}) is already registered with ${methods.join(', ') || 'another sign-in method'}. Sign in that way first — your GitHub account will then be linked automatically.`
      );
    }
    console.error('GitHub sign-in error:', error);
    throw new Error(getAuthErrorMessage(error?.code, error?.message));
  }
}

/**
 * Explicitly connect the user's GitHub account to the currently signed-in
 * Firebase account (used by the Repositories page when logged in via Google).
 * Runs a normal GitHub consent popup and links it to this account. Throws on
 * failure so the UI can show the reason.
 */
export async function connectGitHubAccount(): Promise<void> {
  ensureConfigured();
  const user = auth.currentUser;
  if (!user) throw new Error('You must be signed in to connect GitHub.');
  if (isGitHubConnected(user)) return;

  try {
    await linkWithPopup(user, githubProvider);
  } catch (err: any) {
    if (
      err?.code === 'auth/popup-blocked' ||
      err?.code === 'auth/operation-not-supported-in-environment' ||
      err?.code === 'auth/cancelled-popup-request'
    ) {
      // Fall back to redirect; handlePendingRedirect() completes the link.
      await linkWithRedirect(user, githubProvider);
      return; // page is navigating away
    }
    if (err?.code === 'auth/popup-closed-by-user' || err?.code === 'auth/user-cancelled-flow-navigation') {
      throw new Error('GitHub authorization was cancelled.');
    }
    if (err?.code === 'auth/account-exists-with-different-credential') {
      throw new Error('This GitHub account is already linked to a different QUALNEX account.');
    }
    console.error('GitHub linking error:', err);
    throw new Error(getAuthErrorMessage(err?.code, err?.message));
  }

  clearPendingGitHubLink();
}

function clearPendingGitHubLink() {
  try { sessionStorage.removeItem(PENDING_LINK_KEY); } catch { /* ignore */ }
}

/**
 * After a successful sign-in with the "original" provider, check whether a
 * GitHub linking was interrupted by an account-exists error and complete it
 * now with one GitHub consent popup. Non-fatal: if the user cancels or the
 * popup is blocked, the account still works and the Repositories page offers
 * an explicit "Connect GitHub" action.
 */
export async function linkGitHubIfPending(): Promise<boolean> {
  const pending = readPendingGitHubLink();
  if (!pending) return false;
  clearPendingGitHubLink();
  const user = auth.currentUser;
  if (!user) return false;
  // Skip if GitHub is already linked
  if (isGitHubConnected(user)) return true;

  try {
    await linkWithPopup(user, githubProvider);
    return true;
  } catch (err: any) {
    if (
      err?.code === 'auth/popup-blocked' ||
      err?.code === 'auth/operation-not-supported-in-environment' ||
      err?.code === 'auth/cancelled-popup-request'
    ) {
      // Defer: complete the link through a redirect on next page load.
      try {
        await linkWithRedirect(user, githubProvider);
      } catch { /* page is navigating anyway */ }
      return false;
    }
    // Non-fatal: the account still works with the primary provider and the
    // Repositories page offers an explicit "Connect GitHub" action.
    console.warn('Deferred GitHub linking failed:', err?.code, err?.message);
    return false;
  }
}

/**
 * Complete a redirect-based sign-in or link (called once on app load).
 * Returns the user payload if the page returned from an OAuth redirect.
 */
export async function handlePendingRedirect() {
  if (!isFirebaseConfigured()) return null;
  try {
    const result = await getRedirectResult(auth);
    if (!result) return null;
    const token = await result.user.getIdToken();
    // Determine which provider was just used: a completed GitHub link takes
    // precedence, otherwise fall back to the first linked provider.
    const providerId =
      result.operationType === 'link' ||
      result.user.providerData.some((p) => p.providerId === 'github.com')
        ? 'github'
        : 'google';
    if (result.operationType === 'link') clearPendingGitHubLink();
    return { ...buildUserData(result.user, providerId), token };
  } catch (error: any) {
    if (error?.code === 'auth/account-exists-with-different-credential') {
      // A redirected GitHub sign-in hit an existing account. Save the
      // parameters so linking can finish after Google sign-in, then show a
      // friendly hint instead of a dead-end error.
      savePendingGitHubLink(error);
      const methods: string[] = error?.customData?._methods || [];
      throw new Error(
        `This email is already registered with ${methods.includes('google.com') ? 'Google' : 'another sign-in method'}. Sign in that way — your GitHub account will be linked automatically.`
      );
    }
    console.error('Redirect sign-in error:', error);
    throw new Error(getAuthErrorMessage(error?.code, error?.message));
  }
}

/**
 * Sign out
 */
export async function signOut() {
  try {
    await firebaseSignOut(auth);
  } catch (error: any) {
    console.error('Sign-out error:', error);
    throw new Error('Failed to sign out');
  }
}

/**
 * Listen to auth state changes
 */
export function onAuthChange(callback: (user: FirebaseUser | null) => void) {
  return onAuthStateChanged(auth, callback);
}

/**
 * Get current user's ID token (for API calls)
 */
export async function getCurrentToken(): Promise<string | null> {
  const user = auth.currentUser;
  if (!user) return null;
  return await user.getIdToken();
}

/**
 * Convert Firebase error codes to user-friendly messages
 */
function getAuthErrorMessage(code?: string, rawMessage?: string): string {
  const messages: Record<string, string> = {
    'auth/popup-closed-by-user': 'Sign-in popup was closed. Please try again.',
    'auth/cancelled-popup-request': 'Sign-in was cancelled.',
    'auth/popup-blocked': 'Pop-up was blocked by your browser. Signing you in with a redirect instead...',
    'auth/account-exists-with-different-credential':
      'This email is already registered with another sign-in method. Sign in with that method first — this provider will then be linked automatically.',
    'auth/invalid-credential': 'Invalid credentials. Please try again.',
    'auth/invalid-app-credential': 'The OAuth app configuration is invalid. Check the provider setup in the Firebase console.',
    'auth/invalid-api-key': 'Firebase API key is invalid or missing. Set VITE_FIREBASE_API_KEY in your .env file.',
    'auth/invalid-email': 'Invalid email address.',
    'user-not-found': 'No account exists for this email yet. Please sign in with Google or GitHub to create one.',
    'auth/requires-recent-login': 'For security, please sign in again before linking a new provider.',
    'auth/user-disabled': 'This account has been disabled.',
    'auth/user-not-found': 'Account not found.',
    'auth/wrong-password': 'Incorrect password.',
    'auth/too-many-requests': 'Too many attempts. Please try again later.',
    'auth/network-request-failed': 'Network error while contacting Firebase. Check your connection (ad blockers can also cause this).',
    'auth/operation-not-allowed':
      'This sign-in provider is not enabled in your Firebase project. Enable it under Authentication → Sign-in method.',
    'auth/unsupported-provider':
      'This browser/environment does not support pop-up sign-in. The redirect flow will be used instead.',
    'auth/internal-error':
      'Firebase returned an internal error. This usually means the API key or Auth domain in .env is wrong, or the provider is not fully configured.',
    'auth/configuration-not-found':
      'Firebase Authentication is not set up for this project. Enable a sign-in provider in the Firebase console.',
    'auth/unauthorized-domain':
      'This site\'s domain is not authorized in Firebase. Add it under Authentication → Settings → Authorized domains.',
    'auth/invalid-auth-domain':
      'The Firebase auth domain is invalid. Verify VITE_FIREBASE_AUTH_DOMAIN in your .env file.',
    'auth/missing-continue-uri': 'Redirect sign-in is misconfigured. Check the authDomain value in your Firebase config.',
  };

  if (code && messages[code]) return messages[code];

  // "Request failed" / generic XHR errors from Firebase often mean a bad
  // API key, wrong authDomain, or an unauthorized domain — give a hint.
  if (rawMessage && /request failed|CORS|network/i.test(rawMessage)) {
    return (
      'Could not reach Firebase Authentication ("Request failed"). ' +
      'Verify VITE_FIREBASE_API_KEY / VITE_FIREBASE_AUTH_DOMAIN in .env and that this domain is listed under ' +
      'Firebase Console → Authentication → Settings → Authorized domains.'
    );
  }

  return rawMessage ? `Authentication failed: ${rawMessage}` : 'Authentication failed. Please try again.';
}

export type { FirebaseUser };
export default app;
