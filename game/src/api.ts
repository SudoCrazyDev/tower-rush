/** Thin client for the Crown & Keep server (see ../server). */

const TOKEN_KEY = "tower-rush-token";

export class ApiError extends Error {
  status: number;
  data: Record<string, unknown>;
  constructor(status: number, message: string, data: Record<string, unknown>) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    // Storage blocked: the session just won't survive a reload.
  }
  memoryToken = token;
}
let memoryToken: string | null = null;

/**
 * This tab's id, so the server can tell devices apart (one battle at a time, see play.ts).
 * Kept per tab, so it survives a reload but a second tab counts as another device.
 */
export const deviceId = (() => {
  const key = "tower-rush-device";
  try {
    const id = sessionStorage.getItem(key);
    if (id) return id;
  } catch {
    // Storage blocked: a fresh id per page load.
  }
  const id = [...crypto.getRandomValues(new Uint8Array(12))].map((b) => b.toString(16).padStart(2, "0")).join("");
  try {
    sessionStorage.setItem(key, id);
  } catch {
    // As above.
  }
  return id;
})();

/** API origin: "" in dev (Vite proxy), else the API Worker (vite.config.ts). */
export const API_BASE = __API_BASE__;
/** Headers every game request carries; the server refuses versions below MIN_CLIENT with 426. */
export const clientHeaders = { "X-Device": deviceId, "X-Client-Version": __APP_VERSION__ };

/** "2.3.0" < "2.10.0": compares dotted numeric versions. */
export function versionBelow(a: string, b: string) {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < 3; i++) if ((pa[i] || 0) !== (pb[i] || 0)) return (pa[i] || 0) < (pb[i] || 0);
  return false;
}

/** Called when this build is older than the server's minimum (426, or config minClient). */
export let onOutdated: () => void = () => {};
export const setOnOutdated = (fn: typeof onOutdated) => (onOutdated = fn);

/** Called when the server says the account is banned (any request). */
export let onBanned: (reason: string | null) => void = () => {};
export const setOnBanned = (fn: typeof onBanned) => (onBanned = fn);

export async function api<T = Record<string, unknown>>(method: string, path: string, body?: unknown): Promise<T> {
  const token = getToken() ?? memoryToken;
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/api${path}`, {
      method,
      headers: {
        ...clientHeaders,
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, "Can't reach the server", {});
  }
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    if (res.status === 426) onOutdated();
    if (res.status === 403 && data.error === "banned") onBanned((data.reason as string) ?? null);
    throw new ApiError(res.status, String(data.error ?? `Request failed (${res.status})`), data);
  }
  return data as T;
}

export const get = <T>(path: string) => api<T>("GET", path);
export const post = <T>(path: string, body: unknown = {}) => api<T>("POST", path, body);
export const put = <T>(path: string, body: unknown) => api<T>("PUT", path, body);
export const del = <T>(path: string) => api<T>("DELETE", path);

/** After a WebSocket refusal (browsers hide the 426): a plain request surfaces the update prompt. */
export const probeVersion = () => void get("/config").catch(() => {});
