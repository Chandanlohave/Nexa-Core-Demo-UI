import { initializeApp, getApps, getApp } from "firebase/app";

// Polyfill WebSocket and XMLHttpRequest for Node.js so Firebase Firestore Client works
if (typeof window === "undefined") {
  // In Node 22 native WebSocket and fetch exist.
  // The Firebase client SDK might still complain about XMLHttpRequest, but we'll try without require.
}

import { 
  initializeFirestore, 
  getFirestore,
  persistentLocalCache, 
  persistentMultipleTabManager, 
  memoryLocalCache, 
  setLogLevel,
  Firestore
} from "firebase/firestore";
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  sendPasswordResetEmail,
  User 
} from "firebase/auth";
import { getStorage } from "firebase/storage";
import config from "../firebase-applet-config.json";

// Silence informational warnings from Firestore in sandboxed/iframe preview
setLogLevel('silent');

// Web app's Firebase configuration loaded from environment provisioned file
const firebaseConfig = {
  apiKey: config.apiKey,
  authDomain: config.authDomain,
  projectId: config.projectId,
  storageBucket: config.storageBucket,
  messagingSenderId: config.messagingSenderId,
  appId: config.appId
};

// Initialize Firebase App (HMR safe)
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize Firestore with configured databaseId and fallback cache
const databaseId = (config as any).firestoreDatabaseId || "(default)";
let dbInstance: Firestore;

try {
  // Use experimentalForceLongPolling for robust connectivity across sandboxed iframes & web proxies
  dbInstance = initializeFirestore(app, {
    experimentalForceLongPolling: typeof window !== "undefined",
    localCache: typeof window !== "undefined" ? persistentLocalCache({ tabManager: persistentMultipleTabManager() }) : memoryLocalCache()
  }, databaseId);
} catch (e: any) {
  if (e.code === 'failed-precondition' || (e.message && e.message.includes('already been started'))) {
    // If it's already started (common in HMR), just get the instance
    dbInstance = getFirestore(app, databaseId);
  } else {
    try {
      // Fallback to memory cache with forced long polling
      dbInstance = initializeFirestore(app, {
        experimentalForceLongPolling: typeof window !== "undefined",
        localCache: memoryLocalCache()
      }, databaseId);
    } catch (err: any) {
      dbInstance = getFirestore(app, databaseId);
    }
  }
}

export const db = dbInstance;
export const auth = getAuth(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();

// Full read, write & edit Google Workspace scopes
googleProvider.addScope('https://www.googleapis.com/auth/calendar.events');
googleProvider.addScope('https://www.googleapis.com/auth/drive');
googleProvider.addScope('https://www.googleapis.com/auth/drive.file');
googleProvider.addScope('https://www.googleapis.com/auth/documents');
googleProvider.addScope('https://www.googleapis.com/auth/spreadsheets');
googleProvider.addScope('https://www.googleapis.com/auth/gmail.readonly');
googleProvider.addScope('https://www.googleapis.com/auth/gmail.send');
googleProvider.addScope('https://www.googleapis.com/auth/gmail.modify');
googleProvider.addScope('https://www.googleapis.com/auth/tasks');
googleProvider.setCustomParameters({ prompt: 'consent' });

let cachedAccessToken: string | null = null;

// Auth helper functions
export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (credential?.accessToken) {
      cachedAccessToken = credential.accessToken;
      localStorage.setItem('nexa_workspace_token', credential.accessToken);
      localStorage.setItem('nexa_workspace_token_time', Date.now().toString());
    }
    return { user: result.user, accessToken: cachedAccessToken, error: null };
  } catch (error: any) {
    console.error("Google sign-in error:", error);
    return { user: null, accessToken: null, error: error.message || "Google sign-in failed" };
  }
};

export const getWorkspaceAccessToken = () => {
  if (cachedAccessToken) return cachedAccessToken;
  
  const savedToken = localStorage.getItem('nexa_workspace_token');
  const savedTime = localStorage.getItem('nexa_workspace_token_time');
  
  if (savedToken && savedTime) {
    const elapsed = Date.now() - parseInt(savedTime, 10);
    // Token expires in 1 hour (3600000 ms)
    if (elapsed < 3500000) {
      cachedAccessToken = savedToken;
      return savedToken;
    } else {
      localStorage.removeItem('nexa_workspace_token');
      localStorage.removeItem('nexa_workspace_token_time');
    }
  }
  return null;
};

// Also clear token on explicit signout if needed, but not strictly required here.


export const signUpWithEmail = async (email: string, pass: string) => {
  try {
    const result = await createUserWithEmailAndPassword(auth, email, pass);
    return { user: result.user, error: null };
  } catch (error: any) {
    console.error("Email sign-up error:", error);
    return { user: null, error: error.message || "Failed to create account" };
  }
};

export const signInWithEmail = async (email: string, pass: string) => {
  try {
    const result = await signInWithEmailAndPassword(auth, email, pass);
    return { user: result.user, error: null };
  } catch (error: any) {
    console.error("Email sign-in error:", error);
    return { user: null, error: error.message || "Invalid email or password" };
  }
};

export const resetPassword = async (email: string) => {
  try {
    await sendPasswordResetEmail(auth, email);
    return { success: true, error: null };
  } catch (error: any) {
    console.error("Password reset error:", error);
    return { success: false, error: error.message || "Failed to send reset email" };
  }
};

export const logoutFirebase = async () => {
  try {
    await signOut(auth);
    cachedAccessToken = null;
    return { success: true };
  } catch (error: any) {
    console.error("Sign-out error:", error);
    return { success: false, error: error.message };
  }
};

export const onAuthChange = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, (user) => {
    if (!user) {
      cachedAccessToken = null;
    }
    callback(user);
  });
};

export { app };
