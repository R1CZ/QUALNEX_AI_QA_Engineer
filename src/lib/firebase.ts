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

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication
export const auth = getAuth(app);

// Configure providers
export const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('email');
googleProvider.addScope('profile');

export const githubProvider = new GithubAuthProvider();
githubProvider.addScope('read:user');
githubProvider.addScope('repo');

/**
 * Sign in with Google
 */
export async function signInWithGoogle() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    const token = await user.getIdToken();
    
    return {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
      token,
      provider: 'google',
    };
  } catch (error: any) {
    console.error('Google sign-in error:', error);
    throw new Error(getAuthErrorMessage(error.code));
  }
}

/**
 * Sign in with GitHub
 */
export async function signInWithGitHub() {
  try {
    const result = await signInWithPopup(auth, githubProvider);
    const user = result.user;
    const token = await user.getIdToken();
    
    return {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName || (user.providerData[0] as any)?.username || user.email,
      photoURL: user.photoURL,
      token,
      provider: 'github',
    };
  } catch (error: any) {
    console.error('GitHub sign-in error:', error);
    throw new Error(getAuthErrorMessage(error.code));
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
function getAuthErrorMessage(code: string): string {
  const messages: Record<string, string> = {
    'auth/popup-closed-by-user': 'Sign-in popup was closed. Please try again.',
    'auth/cancelled-popup-request': 'Sign-in was cancelled.',
    'auth/popup-blocked': 'Pop-up was blocked by your browser. Please allow pop-ups.',
    'auth/account-exists-with-different-credential': 
      'An account already exists with the same email but different sign-in credentials. Try signing in with a different method.',
    'auth/invalid-credential': 'Invalid credentials. Please try again.',
    'auth/invalid-email': 'Invalid email address.',
    'auth/user-disabled': 'This account has been disabled.',
    'auth/user-not-found': 'Account not found.',
    'auth/wrong-password': 'Incorrect password.',
    'auth/too-many-requests': 'Too many attempts. Please try again later.',
    'auth/network-request-failed': 'Network error. Please check your connection.',
    'auth/operation-not-allowed': 'This sign-in method is not enabled. Contact support.',
  };
  
  return messages[code] || 'Authentication failed. Please try again.';
}

export type { FirebaseUser };
export default app;
