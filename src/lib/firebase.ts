// ─────────────────────────────────────────────────────────────
// Oxyx OS / Core / Firebase Setup
// Initializes Firebase App and Firestore for the Virtual File System.
// ─────────────────────────────────────────────────────────────

import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDDkzNDWAqfA_nnaKhccGpIcUxnC7it-D0",
  authDomain: "oxyx-os.firebaseapp.com",
  projectId: "oxyx-os",
  storageBucket: "oxyx-os.firebasestorage.app",
  messagingSenderId: "262126734534",
  appId: "1:262126734534:web:e2e38bd5375ac1b3575bc7"
};

// Initialize Firebase (Singleton pattern to prevent re-initialization)
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize Firestore
const db = getFirestore(app);

export { app, db };
