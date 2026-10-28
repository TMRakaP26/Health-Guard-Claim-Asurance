const COOKIE_PREFIX = 'hg_';
const MAX_QUICK_USERS = 5;

export interface QuickUser {
  name: string;
  email: string;
  role: 'client' | 'analyst';
  password: string;
}

export function setCookie(name: string, value: string, days: number = 365) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${COOKIE_PREFIX}${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}

export function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${COOKIE_PREFIX}${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export function removeCookie(name: string) {
  document.cookie = `${COOKIE_PREFIX}${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax`;
}

/** Get the list of saved quick sign-in users from cookie */
export function getQuickUsers(): QuickUser[] {
  try {
    const raw = getCookie('quick_user');
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((u: any) => u?.name && u?.email && u?.role && u?.password) as QuickUser[];
  } catch {
    return [];
  }
}

/** Add or move a user to the top of the quick sign-in list */
export function addQuickUser(user: QuickUser) {
  const users = getQuickUsers().filter(u => u.email !== user.email);
  users.unshift(user);
  setCookie('quick_user', JSON.stringify(users.slice(0, MAX_QUICK_USERS)));
}

/** Remove a single user from the quick sign-in list */
export function removeQuickUserByEmail(email: string) {
  const users = getQuickUsers().filter(u => u.email !== email);
  if (users.length === 0) {
    removeCookie('quick_user');
  } else {
    setCookie('quick_user', JSON.stringify(users));
  }
}
