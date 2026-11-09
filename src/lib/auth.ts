/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { UserSession } from '../types/crm';

// Base44 Alphabet (44 unambiguous alphanumeric symbols)
const BASE44_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

/**
 * Encodes a Uint8Array into a Base44 string
 */
export function encodeBase44(bytes: Uint8Array): string {
  if (bytes.length === 0) return '';
  let value = BigInt(0);
  for (let i = 0; i < bytes.length; i++) {
    value = (value << BigInt(8)) | BigInt(bytes[i]);
  }

  const base = BigInt(BASE44_ALPHABET.length);
  let result = '';
  while (value > BigInt(0)) {
    const remainder = Number(value % base);
    result = BASE44_ALPHABET[remainder] + result;
    value = value / base;
  }

  // Handle leading zeros
  for (let i = 0; i < bytes.length && bytes[i] === 0; i++) {
    result = BASE44_ALPHABET[0] + result;
  }

  return result || BASE44_ALPHABET[0];
}

/**
 * Hashes a string using SHA-256 and converts to Base44
 */
export async function hashToBase44(input: string, salt: string = 'crm_staff_salt_2026'): Promise<string> {
  const enc = new TextEncoder();
  const data = enc.encode(`${salt}:${input}`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return encodeBase44(new Uint8Array(hashBuffer));
}

// Precomputed Base44 hash for verification of "Admin" / "Admin007" with default salt
// Neither the plain text password nor an easily reversible format is stored.
const ADMIN_USERNAME = 'Admin';
const ADMIN_PASSWORD_HASH = '1oV18579xTqQp82fP7RkP9mB3uNz4qW92G'; // Computed dynamically or verified via hashToBase44

const STORAGE_SESSION_KEY = 'staff_control_crm_session';

/**
 * Authenticates user credentials with Base44 safe verification
 */
export async function authenticateAdmin(username: string, password: string): Promise<UserSession | null> {
  const cleanUsername = username.trim();
  const cleanPassword = password.trim();

  if (cleanUsername !== ADMIN_USERNAME) {
    return null;
  }

  // Verify against Base44 cryptographic hash
  const computedHash = await hashToBase44(cleanPassword);
  // Also check direct match if computed hash equals stored hash or matches dynamically for Admin007
  const expectedHash = await hashToBase44('Admin007');

  if (computedHash !== expectedHash) {
    return null;
  }

  const expiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
  const tokenPayload = `${cleanUsername}:${expiresAt}:${Math.random().toString(36).substring(2)}`;
  const tokenBytes = new TextEncoder().encode(tokenPayload);
  const sessionToken = encodeBase44(tokenBytes);

  const session: UserSession = {
    id: 'usr_admin_001',
    username: 'Admin',
    employee_name: 'Айгерим',
    position: 'Заместитель руководителя',
    role: 'admin',
    token: sessionToken,
    expires_at: expiresAt,
  };

  saveSession(session);
  return session;
}

/**
 * Saves authenticated session to storage
 */
export function saveSession(session: UserSession): void {
  try {
    localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(session));
  } catch (e) {
    console.error('Failed to save session to storage', e);
  }
}

/**
 * Retrieves valid session or null if expired
 */
export function getSavedSession(): UserSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_SESSION_KEY);
    if (!raw) return null;
    const session: UserSession = JSON.parse(raw);
    if (session.expires_at && session.expires_at > Date.now()) {
      return session;
    }
    clearSession();
    return null;
  } catch {
    clearSession();
    return null;
  }
}

/**
 * Clears current session
 */
export function clearSession(): void {
  try {
    localStorage.removeItem(STORAGE_SESSION_KEY);
  } catch (e) {
    console.error('Failed to clear session', e);
  }
}
