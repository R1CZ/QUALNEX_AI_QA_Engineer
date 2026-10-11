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

function ensureConfigured() {
  if (!isFirebaseConfigured()) {
    throw new Error(
      'Firebase is not configured yet. Copy .env.example to .env and set your VITE_FIREBASE_* values (see FIREBASE_SETUP.md).'
    );
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
      // Email already used by another provider (e.g. Google).
      // Remember that the user wants GitHub linked; after they sign in with
      // the original provider, linkGitHubIfPending() re-runs the GitHub
      // flow so both providers end up on one account.
      try {
        sessionStorage.setItem('qualnex_pending_github_link', '1');
      } catch { /* sessionStorage may be unavailable */ }
      const providedEmail: string | undefined = error?.customData?.email;
      const methods: string[] = error?.customData?._methods || [];
      const hint = methods.includes('google.com')
        ? 'Sign in with Google first — your GitHub account will then be linked automatically.'
        : `Sign in with one of your existing methods (${methods.join(', ') || 'Google'}) first — GitHub will then be linked automatically.`;
      throw new Error(
        `This email (${providedEmail || 'your email'}) is already registered with another sign-in method. ${hint}`
      );
    }
    console.error('GitHub sign-in error:', error);
    throw new Error(getAuthErrorMessage(error?.code, error?.message));
  }
}

/**
 * After a successful sign-in with the "original" provider, check whether a
 * GitHub linking was interrupted by an account-exists error and complete it
 * now (linkWithPopup opens the GitHub consent screen again and attaches the
 * GitHub identity to the currently signed-in Firebase account).
 * This prevents the permanent "different credentials" dead-end.
 */
export async function linkGitHubIfPending(): Promise<void> {
  let pending: string | null = null;
  try {
    pending = sessionStorage.getItem('qualnex_pending_github_link');
  } catch {
    return;
  }
  if (!pending) return;
  try {
    sessionStorage.removeItem('qualnex_pending_github_link');
    const user = auth.currentUser;
    if (!user) return;
    // Skip if GitHub is already linked
    if (user.providerData.some((p) => p.providerId === 'github.com')) return;
    await linkWithPopup(user, githubProvider);
  } catch (err: any) {
    // Non-fatal: the account still works with the primary provider.
    console.warn('Deferred GitHub linking failed:', err?.code, err?.message);
  }
}

/**
 * Complete a redirect-based sign-in (called once on app load).
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
    return { ...buildUserData(result.user, providerId), token };
  } catch (error: any) {
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
