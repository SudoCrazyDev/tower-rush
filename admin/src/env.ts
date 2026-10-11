/**
 * One admin app serves both environments. The choice is kept in localStorage and switching
 * reloads the page, so no loaded data survives from the other environment.
 */
export type Env = "production" | "staging";

const KEY = "tower-rush-admin-env";
const dev = location.hostname === "localhost" || location.hostname === "127.0.0.1";

/** API origin per environment. In dev, Production is the local server through the Vite proxy. */
export const API_BASE: Record<Env, string> = {
  production: dev ? "" : "https://api.crownnkeep.com",
  staging: "https://staging-api.crownnkeep.com",
};

export const ENV_LABEL: Record<Env, string> = { production: "PRODUCTION", staging: "STAGING" };

function read(): Env {
  try {
    return localStorage.getItem(KEY) === "staging" ? "staging" : "production";
  } catch {
    return "production";
  }
}

export const currentEnv: Env = read();

export function switchEnv(env: Env) {
  try {
    localStorage.setItem(KEY, env);
  } catch {
    // Storage blocked: the switch won't stick across a reload.
  }
  location.reload();
}
