// ─────────────────────────────────────────────────────────────
// Oxyx OS / Core / Firebase Setup
// Initializes Firebase App, Firestore, and Auth.
// ─────────────────────────────────────────────────────────────

import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyDDkzNDWAqfA_nnaKhccGpIcUxnC7it-D0",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "oxyx-os.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "oxyx-os",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "oxyx-os.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "262126734534",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:262126734534:web:e2e38bd5375ac1b3575bc7"
};

// Initialize Firebase safely
let app;
let db: any;
let auth: any;

try {
  if (firebaseConfig.apiKey) {
    app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    db = getFirestore(app);
    auth = getAuth(app);
  } else {
    console.error('Firebase config is missing API key. Check Environment Variables.');
  }
} catch (error) {
  console.error('Error initializing Firebase:', error);
}

export { app, db, auth };
