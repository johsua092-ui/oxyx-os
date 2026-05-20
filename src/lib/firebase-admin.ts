// ─────────────────────────────────────────────────────────────
// Oxyx OS / Lib / Firebase Admin SDK (Server-side only)
// Used for privileged operations: token verification, user
// management, and blocking unauthorized signups.
// ─────────────────────────────────────────────────────────────

import { initializeApp, getApps, cert, type App } from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';

let adminApp: App;
let adminAuth: Auth;

function getAdminApp(): App {
  if (adminApp) return adminApp;

  if (getApps().length > 0) {
    adminApp = getApps()[0];
    return adminApp;
  }

  // Initialize with service account JSON (from env var) or
  // fall back to Application Default Credentials on GCP/Firebase
  const serviceAccountJSON = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

  if (serviceAccountJSON) {
    try {
      const serviceAccount = JSON.parse(serviceAccountJSON);
      adminApp = initializeApp({
        credential: cert(serviceAccount),
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'oxyx-os',
      });
    } catch (err) {
      console.error('[Firebase Admin] Failed to parse service account JSON:', err);
      // Fall back to project ID only (works in some environments)
      adminApp = initializeApp({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'oxyx-os',
      });
    }
  } else {
    // No service account — initialize with project ID
    // This will work for token verification if deployed on GCP
    // For full functionality, set FIREBASE_SERVICE_ACCOUNT_KEY env var
    console.warn('[Firebase Admin] No service account found. Some admin features may be limited.');
    adminApp = initializeApp({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'oxyx-os',
    });
  }

  return adminApp;
}

export function getAdminAuth(): Auth {
  if (adminAuth) return adminAuth;
  adminAuth = getAuth(getAdminApp());
  return adminAuth;
}
