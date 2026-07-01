/**
 * MedRef — Authentication Module
 * Handles Firebase Email/Password auth.
 * Exports helpers used by auth.html and app.js.
 */

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  signInWithPopup
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import { auth, googleProvider } from "./firebase.js";

/**
 * Register a new user.
 * @param {string} email
 * @param {string} password
 * @param {string} displayName
 * @returns {Promise<UserCredential>}
 */
export async function registerUser(email, password, displayName) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(cred.user, { displayName });
  return cred;
}

/**
 * Sign in existing user.
 * @param {string} email
 * @param {string} password
 * @returns {Promise<UserCredential>}
 */
export async function loginUser(email, password) {
  return signInWithEmailAndPassword(auth, email, password);
}

export async function loginWithGoogle() {
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

/**
 * Sign out current user.
 */
export async function logoutUser() {
  return signOut(auth);
}

/**
 * Get the current Firebase ID token for the logged-in user.
 * Used to authenticate requests to the Express proxy.
 * @returns {Promise<string|null>}
 */
export async function getIdToken() {
  const user = auth.currentUser;
  if (!user) return null;
  return user.getIdToken();
}

/**
 * Subscribe to auth state changes.
 * @param {function} callback - called with (user | null)
 * @returns {function} unsubscribe
 */
export function onAuthChange(callback) {
  return onAuthStateChanged(auth, callback);
}

/**
 * Get currently logged-in user (sync).
 * @returns {User|null}
 */
export function getCurrentUser() {
  return auth.currentUser;
}
