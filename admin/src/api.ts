import { API_BASE, currentEnv, type Env } from "./env";

const TOKEN_KEY = "tower-rush-admin-token";
/** Each environment has its own admin accounts and sessions, so its own token. */
const keyFor = (env: Env) => `${TOKEN_KEY}:${env}`;

export class ApiError extends Error {
  status: number;
  errors: string[];
  constructor(status: number, message: string, errors: string[] = []) {
    super(message);
    this.status = status;
    this.errors = errors;
  }
}

export const tokenFor = {
  get: (env: Env) => sessionStorage.getItem(keyFor(env)) ?? localStorage.getItem(keyFor(env)),
  set: (env: Env, t: string | null, remember = false) => {
    sessionStorage.removeItem(keyFor(env));
    localStorage.removeItem(keyFor(env));
    if (t) (remember ? localStorage : sessionStorage).setItem(keyFor(env), t);
  },
};

/** The selected environment's token. */
export const token = {
  get: () => tokenFor.get(currentEnv),
  set: (t: string | null, remember = false) => tokenFor.set(currentEnv, t, remember),
};

let onUnauthorized = () => {};
export const setOnUnauthorized = (fn: () => void) => (onUnauthorized = fn);

/** `env` targets the other environment (only the staging-to-production config copy does). */
export async function api<T = unknown>(method: string, path: string, body?: unknown, env: Env = currentEnv): Promise<T> {
  const t = tokenFor.get(env);
  let res: Response;
  try {
    res = await fetch(`${API_BASE[env]}/api/admin${path}`, {
      method,
      headers: {
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(t ? { Authorization: `Bearer ${t}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, "Can't reach the server. Is it running?");
  }
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && path !== "/login" && env === currentEnv) onUnauthorized();
  if (!res.ok) throw new ApiError(res.status, data.error ?? `Request failed (${res.status})`, data.errors ?? []);
  return data as T;
}

/** Game art: the game dev server in dev, the R2 bucket in production (see vite.config.ts). */
export const ASSETS = __ASSET_BASE__;
export const asset = (folder: string, id: string) => `${ASSETS}${folder}/${id}.webp`;
