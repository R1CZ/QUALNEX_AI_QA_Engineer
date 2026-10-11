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
  linkWithCredential,
  getRedirectResult,
  GoogleAuthProvider, 
  GithubAuthProvider,
  fetchSignInMethodsForEmail,
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

/** Session keys holding the state of a GitHub sign-in that hit an
 * "account exists with different credential" conflict. After the user signs
 * in with their original provider we complete the link (linkGitHubIfPending)
 * instead of failing with a dead-end error. The email is stored as well so
 * linking can be recovered even if the user reloads the page mid-flow. */
const PENDING_LINK_KEY = 'qualnex_pending_github_link';
const PENDING_LINK_EMAIL_KEY = 'qualnex_pending_github_link_email';

/** Key holding the raw OAuth token response from a GitHub attempt that hit
 * an account-exists conflict, so the credential can be attached without a
 * second consent popup after signing in with the original provider. */
const PENDING_OAUTH_KEY = 'qualnex_pending_github_oauth';

/**
 * True when a GitHub sign-in previously hit an account-exists conflict and
 * the link still needs to be completed after signing in with Google.
 */
export function hasPendingGitHubLink(): boolean {
  return readPendingGitHubLink() !== null;
}

/** Forget a deferred GitHub link intent (completed, cancelled, or stale). */
export function clearPendingGitHubLink() {
  try {
    sessionStorage.removeItem(PENDING_LINK_KEY);
    sessionStorage.removeItem(PENDING_LINK_EMAIL_KEY);
    sessionStorage.removeItem(PENDING_OAUTH_KEY);
  } catch { /* ignore */ }
}

function ensureConfigured() {
  if (!isFirebaseConfigured()) {
    throw new Error(
      'Firebase is not configured yet. Copy .env.example to .env and set your VITE_FIREBASE_* values (see FIREBASE_SETUP.md).'
    );
  }
}

/** Cache key for the GitHub OAuth access token obtained during sign-in. */
const GITHUB_TOKEN_KEY = 'qualnex_github_token';

/** Remember the raw OAuth response Firebase attaches to the account-exists
 * error so linking can be completed without a second consent popup. */
function savePendingGitHubOAuth(error: any) {
  try {
    const oauth = error?.customData?._tokenResponse?.oauth_response;
    if (oauth && typeof oauth === 'object' && oauth.access_token) {
      sessionStorage.setItem(PENDING_OAUTH_KEY, JSON.stringify(oauth));
    }
  } catch { /* ignore */ }
}

function readPendingGitHubOAuth(): any | null {
  try {
    const raw = sessionStorage.getItem(PENDING_OAUTH_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/** Build a GithubAuthProvider credential from a raw OAuth token response. */
function githubCredentialFromOAuth(oauth: any) {
  const accessToken = typeof oauth === 'string'
    ? (() => { try { return JSON.parse(oauth)?.access_token; } catch { return undefined; } })()
    : oauth?.access_token || oauth?.accessToken;
  return accessToken ? GithubAuthProvider.credential(accessToken) : null;
}

/** Cache a GitHub access token so repository listing works right after login. */
function cacheGitHubAccessToken(accessToken?: string | null) {
  if (!accessToken) return;
  try { sessionStorage.setItem(GITHUB_TOKEN_KEY, accessToken); } catch { /* ignore */ }
}

/**
 * Return the GitHub OAuth access token captured by the most recent sign-in
 * or link result — no extra popup required. This is what makes repositories
 * available immediately after logging in with GitHub (Scenario B).
 */
export function getStoredGitHubAccessToken(): string | null {
  try {
    return sessionStorage.getItem(GITHUB_TOKEN_KEY);
  } catch {
    return null;
  }
}

/** Clear the cached GitHub access token (used on sign-out / disconnect). */
export function clearStoredGitHubAccessToken() {
  try { sessionStorage.removeItem(GITHUB_TOKEN_KEY); } catch { /* ignore */ }
}

/**
 * Remember that the user intended to link GitHub but hit an account-exists
 * conflict, so the app can finish the linking after they sign in with their
 * original provider (e.g. Google).
 */
function savePendingGitHubLink(error?: any) {
  try {
    sessionStorage.setItem(PENDING_LINK_KEY, '1');
    const email = error?.customData?.email;
    if (email) sessionStorage.setItem(PENDING_LINK_EMAIL_KEY, String(email));
  } catch { /* sessionStorage may be unavailable */ }
  savePendingGitHubOAuth(error);
}

function readPendingGitHubLink(): string | null {
  try {
    return sessionStorage.getItem(PENDING_LINK_KEY);
  } catch {
    return null;
  }
}

function readPendingGitHubEmail(): string | null {
  try {
    return sessionStorage.getItem(PENDING_LINK_EMAIL_KEY);
  } catch {
    return null;
  }
}

/** Human-readable names for Firebase provider ids. */
function providerNames(methods: string[]): string {
  const named = methods.map((m) =>
    m === 'google.com' ? 'Google' : m === 'github.com' ? 'GitHub' : m.split('.')[0]
  );
  return named.join(' or ') || 'another sign-in method';
}

/**
 * Resolve which providers are registered for an email. Prefers the list
 * Firebase attaches to the account-exists error (`_methods`); falls back to
 * fetchSignInMethodsForEmail when the SDK did not include it.
 */
async function resolveRegisteredMethods(
  email: string | undefined,
  errorMethods: string[]
): Promise<string[]> {
  if (errorMethods.length > 0) return errorMethods;
  if (!email) return [];
  try {
    return await fetchSignInMethodsForEmail(auth, email);
  } catch (err: any) {
    console.warn('fetchSignInMethodsForEmail failed:', err?.code, err?.message);
    return [];
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
  // Prefer the token captured during this session's GitHub sign-in/link.
  const cached = getStoredGitHubAccessToken();
  if (cached) return cached;
  try {
    // No cached token (e.g. page was reloaded): refresh it via the GitHub
    // consent flow. linkWithPopup for an already-linked provider re-uses the
    // existing GitHub session (usually no visible prompt) and returns a
    // fresh OAuth access token that we then cache for repository listing.
    const result = await linkWithPopup(user, githubProvider);
    const accessToken = (result as any).credential?.accessToken || null;
    cacheGitHubAccessToken(accessToken);
    return accessToken;
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

/** Extract the GitHub OAuth access token from a sign-in/link UserCredential. */
function cacheTokenFromCredential(cred: any) {
  try {
    const accessToken = cred?.providerUserInfo?.accessToken || cred?._tokenResponse?.oauth_response?.access_token;
    cacheGitHubAccessToken(accessToken);
  } catch { /* ignore */ }
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
    // A previous GitHub attempt may have hit an account-exists conflict;
    // finish that link now so both providers resolve to this one account.
    await linkGitHubIfPending(result.user);
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
    // Cache the provider token so repositories can be listed immediately
    // after login without another consent popup (Scenario B).
    cacheTokenFromCredential(result);
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
      // dead-end: remember the intent and sign the user in with one of the
      // registered methods instead. The GitHub credential is then linked to
      // the same Firebase account automatically — no data is lost and both
      // sign-in methods keep working afterwards.
      savePendingGitHubLink(error);
      const providedEmail: string | undefined = error?.customData?.email;
      const methods = await resolveRegisteredMethods(
        providedEmail,
        error?.customData?._methods || []
      );

      if (methods.includes('google.com')) {
        try {
          let result;
          try {
            result = await signInWithPopup(auth, googleProvider);
          } catch (popupErr: any) {
            if (
              popupErr?.code === 'auth/popup-blocked' ||
              popupErr?.code === 'auth/operation-not-supported-in-environment' ||
              popupErr?.code === 'auth/cancelled-popup-request'
            ) {
              // Popups unavailable — finish via redirect flow on next page
              // load. handlePendingRedirect() completes the deferred GitHub
              // link automatically when the page returns from Google.
              await signInWithRedirect(auth, googleProvider);
              return null;
            }
            throw popupErr;
          }
          // Sign-in with the original provider succeeded — link GitHub to it
          // now so both methods resolve to this one account.
          const linked = await linkGitHubIfPending(result.user);
          const token = await result.user.getIdToken();
          return {
            ...buildUserData(result.user, linked ? 'github' : 'google'),
            token,
          };
        } catch (signInErr: any) {
          if (
            signInErr?.code === 'auth/popup-blocked' ||
            signInErr?.code === 'auth/operation-not-supported-in-environment' ||
            signInErr?.code === 'auth/cancelled-popup-request'
          ) {
            // Popups unavailable — finish via redirect flow on next page load.
            await signInWithRedirect(auth, googleProvider);
            return null;
          }
          if (signInErr?.code === 'auth/popup-closed-by-user') {
            clearPendingGitHubLink();
            throw new Error(
              'Your email is already registered with Google. Sign in with Google — your GitHub account will then be linked automatically.'
            );
          }
          throw new Error(getAuthErrorMessage(signInErr?.code, signInErr?.message));
        }
      }

      throw new Error(
        `This email (${providedEmail || 'your email'}) is already registered with ${providerNames(methods)}. ` +
          'Sign in that way first — your GitHub account will then be linked automatically.'
      );
    }
    console.error('GitHub sign-in error:', error);
    throw new Error(getAuthErrorMessage(error?.code, error?.message));
  }
}

/**
 * Complete a deferred GitHub link after signing in with the original
 * provider (e.g. Google). Uses the OAuth response captured during the
 * failed GitHub attempt when available (no extra consent popup), otherwise
 * runs one normal GitHub consent popup. Non-fatal either way — returns
 * true only when GitHub ended up linked to this account.
 */
export async function linkGitHubIfPending(user?: FirebaseUser | null): Promise<boolean> {
  const target = user ?? auth.currentUser;
  if (!target) return false;
  if (isGitHubConnected(target)) {
    // Already linked — just clear any stale pending intent.
    clearPendingGitHubLink();
    return true;
  }

  const pendingEmail = readPendingGitHubEmail();
  if (pendingEmail && target.email && pendingEmail.toLowerCase() !== target.email.toLowerCase()) {
    // The pending attempt belongs to a different email — ignore it.
    return false;
  }

  // Best case: Firebase surfaced the pending GitHub OAuth response on the
  // account-exists error — attach it without asking the user again.
  try {
    const oauth = readPendingGitHubOAuth();
    const credential = githubCredentialFromOAuth(oauth);
    if (credential) {
      await linkWithCredential(target, credential);
      cacheGitHubAccessToken(credential.accessToken);
      clearPendingGitHubLink();
      return true;
    }
  } catch (err: any) {
    // Most likely cause: "Account linking by same provider with token is
    // not allowed without the automatic linking API set" — fall through to
    // the interactive path below.
    console.warn('Silent GitHub link not permitted, using interactive link:', err?.code);
  }

  if (!readPendingGitHubLink()) return false;

  try {
    const result = await linkWithPopup(target, githubProvider);
    cacheTokenFromCredential(result);
    clearPendingGitHubLink();
    return true;
  } catch (err: any) {
    if (
      err?.code === 'auth/popup-blocked' ||
      err?.code === 'auth/operation-not-supported-in-environment' ||
      err?.code === 'auth/cancelled-popup-request'
    ) {
      // Defer: complete the link through a redirect on next page load.
      try {
        await linkWithRedirect(target, githubProvider);
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
    const result = await linkWithPopup(user, githubProvider);
    cacheTokenFromCredential(result);
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
    let providerId =
      result.operationType === 'link' ||
      result.user.providerData.some((p) => p.providerId === 'github.com')
        ? 'github'
        : 'google';
    if (result.operationType === 'link') clearPendingGitHubLink();
    else if ((await linkGitHubIfPending(result.user)) || isGitHubConnected(result.user)) {
      // A redirected Google sign-in finished — complete any deferred GitHub
      // link so both providers resolve to this one account.
      providerId = 'github';
    }
    return { ...buildUserData(result.user, providerId), token };
  } catch (error: any) {
    if (error?.code === 'auth/account-exists-with-different-credential') {
      // A redirected GitHub sign-in hit an existing account. Save the intent
      // and start a redirected Google sign-in automatically — on return,
      // handlePendingRedirect() links GitHub to that account. The user never
      // sees a dead-end error.
      savePendingGitHubLink(error);
      const methods = await resolveRegisteredMethods(
        error?.customData?.email,
        error?.customData?._methods || []
      );
      if (methods.includes('google.com')) {
        await signInWithRedirect(auth, googleProvider);
        return null; // page is navigating away
      }
      throw new Error(
        `This email is already registered with ${providerNames(methods)}. Sign in that way — your GitHub account will be linked automatically.`
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
