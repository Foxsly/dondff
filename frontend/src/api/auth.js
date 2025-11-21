import { request } from './client';

const STORAGE_KEY = 'authUser';

export function getStoredUser() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function clearStoredUser() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

/**
 * Register a user against the backend users endpoint.
 *
 * For now, we treat registration as "create user by email".
 * The backend is expected to:
 *   - accept { email, password? }
 *   - create the user
 *   - ignore password until real auth is implemented
 */
export async function register(name, email, password) {
  if (!email) {
    throw new Error('Email is required');
  }

  const user = await request('/users', {
    method: 'POST',
    body: {
      name,
      email,
      // Included for forward-compatibility; backend may ignore this for now.
      password,
    },
  });

  localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  return user;
}

/**
 * Login:
 * - Fetch all users via GET /users
 * - Find the one with matching email
 * - Return that user (no password verification yet)
 *
 * If no user is found, an error is thrown.
 * Registration flow is responsible for creating users.
 */
export async function login(email, password) {
  if (!email) {
    throw new Error('Email is required');
  }

  // 1. Get all users
  const users = await request('/users'); // expects an array from the backend

  // 2. Find matching email (case-insensitive compare is usually nicer)
  const user =
    Array.isArray(users) &&
    users.find(
      (u) =>
        typeof u.email === 'string' &&
        u.email.toLowerCase() === email.toLowerCase(),
    );

  if (!user) {
    throw new Error('User not found. Please register first.');
  }

  // 3. Store and return user
  localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  return user;
}

export async function logout() {
  // If you later add /auth/logout, you can call it here.
  clearStoredUser();
}

/**
 * Get the current user.
 *
 * For now this is purely client-side (localStorage).
 * Later you might call GET /users/me or /auth/me to validate the session.
 */
export async function getCurrentUser() {
  return getStoredUser();
}