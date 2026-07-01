/**
 * MedRef — Firebase Initialization
 * Replace the firebaseConfig object below with your own project config.
 * Get it from: Firebase Console → Project Settings → Your Apps → SDK setup
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore }  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// ── REPLACE THIS WITH YOUR FIREBASE PROJECT CONFIG ──────────────
// Firebase Console → Project Settings → General → Your Apps → Config
const firebaseConfig = {
  apiKey: "AIzaSyCPPfi9Xoe3kMBqmf-TlO1vO19Da2mRxHA",
  authDomain: "medref-2e271.firebaseapp.com",
  projectId: "medref-2e271",
  storageBucket: "medref-2e271.firebasestorage.app",
  messagingSenderId: "745792206106",
  appId: "1:745792206106:web:01b77b2c34ab072db828a3",
  measurementId: "G-D3NS481KCG"
};
// ────────────────────────────────────────────────────────────────

const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);

const googleProvider = new GoogleAuthProvider();
export { auth, db, googleProvider };
