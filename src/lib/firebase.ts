/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  getDocFromServer,
  collection, 
  getDocs, 
  setDoc, 
  deleteDoc,
  query,
  where,
  onSnapshot
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// CRITICAL: Specify firestoreDatabaseId from configuration
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

// Test connection on boot per Firebase guidelines
export async function testConnection(): Promise<boolean> {
  try {
    // Attempt anonymous sign-in in background if enabled
    try {
      if (!auth.currentUser) {
        await signInAnonymously(auth);
      }
    } catch {
      // Ignored if anonymous auth is not toggled in console
    }
    await getDocFromServer(doc(db, 'settings', 'test_connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase client is offline or network is restricted.');
    }
    return false;
  }
}

// Error handling helper
export function handleFirestoreError(error: unknown, operationType: string, path: string | null) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    operationType,
    path,
    authInfo: {
      userId: auth.currentUser?.uid || null,
      email: auth.currentUser?.email || null,
      isAnonymous: auth.currentUser?.isAnonymous || null,
    },
  };
  console.warn('Firestore Operation Info:', JSON.stringify(errInfo));
}

export { 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  deleteDoc, 
  query, 
  where, 
  onSnapshot 
};
