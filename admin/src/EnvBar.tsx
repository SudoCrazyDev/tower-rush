import { ENV_LABEL, currentEnv, switchEnv, type Env } from "./env";

/** Full-width bar so the active environment is impossible to miss; also the switcher. */
export function EnvBar() {
  const other: Env = currentEnv === "production" ? "staging" : "production";
  return (
    <div className={`envbar ${currentEnv}`}>
      <strong>{ENV_LABEL[currentEnv]}</strong>
      <span>{currentEnv === "production" ? "Live players. Edits here are real." : "Test data. Safe to experiment."}</span>
      <button className="btn small" onClick={() => switchEnv(other)}>
        Switch to {ENV_LABEL[other]}
      </button>
    </div>
  );
}
