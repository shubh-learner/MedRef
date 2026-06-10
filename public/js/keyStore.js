/**
 * MedRef — Key Store (Firestore)
 * Each user's Groq API key is stored in their own Firestore document.
 *
 * Firestore structure:
 *   users/{uid}/
 *     groqKey: "gsk_..."
 *     updatedAt: timestamp
 *
 * Security Rules (set in Firebase Console):
 *   match /users/{uid} {
 *     allow read, write: if request.auth.uid == uid;
 *   }
 */

import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import { db } from "./firebase.js";

/**
 * Save the user's Groq API key to Firestore.
 * @param {string} uid      - Firebase user UID
 * @param {string} groqKey  - The Groq API key (gsk_...)
 */
export async function saveGroqKey(uid, groqKey) {
  const ref = doc(db, "users", uid);
  await setDoc(ref, {
    groqKey,
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

/**
 * Load the user's Groq API key from Firestore.
 * Returns null if not set yet.
 * @param {string} uid - Firebase user UID
 * @returns {Promise<string|null>}
 */
export async function loadGroqKey(uid) {
  const ref  = doc(db, "users", uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return snap.data().groqKey || null;
}
