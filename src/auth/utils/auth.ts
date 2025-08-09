// File: adminpanel-service/frontend/src/modules/auth/utils/auth.ts

const TOKEN_KEY = 'iapps_token';
const USER_KEY = 'iapps_user';

export interface StoredUser {
  id?: number | string | null;
  name?: string | null;
  email?: string | null;
  role?: 'admin' | 'staff' | 'user' | string | null;
  isActive?: boolean;
  exp?: number | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  deletedAt?: string | null;
}

// minimal JWT decode (no dependency)
function decodeJwt<T = any>(token: string): T | null {
  try {
    const [, payload] = token.split('.');
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decodeURIComponent(escape(json)));
  } catch {
    return null;
  }
}

/** Accepts ANY login/register response shape and saves token+user consistently. */
export function saveAccessTokenFromResponse(payload: any) {
  const token =
    typeof payload === 'string'
      ? payload
      : payload?.accessToken || payload?.access_token || payload?.token;

  if (!token) {
    console.error('saveAccessTokenFromResponse: No token in payload', payload);
    return;
  }

  localStorage.setItem(TOKEN_KEY, token);

  // Prefer explicit user from API if present; else decode from JWT
  let user: StoredUser | null = payload?.user || null;

  if (!user) {
    const decoded = decodeJwt<any>(token);
    if (decoded) {
      user = {
        id: decoded.sub ?? decoded.id ?? null,
        name: decoded.name ?? null,
        email: decoded.email ?? null,
        role: decoded.role ?? 'user',
        isActive: decoded.isActive ?? undefined,
        exp: decoded.exp ?? null,
        createdAt: decoded.createdAt ?? null,
        updatedAt: decoded.updatedAt ?? null,
        deletedAt: decoded.deletedAt ?? null,
      };
    }
  }

  if (user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(USER_KEY);
  }
}

export function saveAccessToken(token: string) {
  saveAccessTokenFromResponse(token);
}

export function getAccessToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function getUserFromStorage(): StoredUser | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredUser;
  } catch {
    return null;
  }
}

/** Replace the stored user object entirely. */
export function setStoredUser(user: StoredUser | null) {
  if (!user) {
    localStorage.removeItem(USER_KEY);
    return;
  }
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

/** Merge partial fields into the stored user (idempotent update). */
export function mergeStoredUser(patch: Partial<StoredUser>) {
  const current = getUserFromStorage() ?? {};
  setStoredUser({ ...current, ...patch });
}

export function isTokenExpired(): boolean {
  const user = getUserFromStorage();
  if (!user?.exp) return false; // if no exp, don’t block
  const nowSec = Math.floor(Date.now() / 1000);
  return (user.exp ?? 0) <= nowSec;
}

export function logout() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}
