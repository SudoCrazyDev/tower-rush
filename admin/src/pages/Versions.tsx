import { useEffect, useRef, useState } from "react";
import { api, tokenFor } from "../api";
import { currentEnv } from "../env";
import { useConfig } from "../config";
import { PageHead, fmtDate, toast } from "../components";
import { validateConfig, type GameConfig } from "../../../shared/config.ts";

interface Version {
  id: number;
  note: string | null;
  createdAt: number;
  admin: string | null;
}

export function VersionsPage() {
  const { version, reload, draft, edit, dirty } = useConfig();
  const [list, setList] = useState<Version[]>([]);
  const file = useRef<HTMLInputElement>(null);
  const load = () => api<Version[]>("GET", "/config/versions").then(setList).catch((e) => toast(e.message, "err"));
  useEffect(() => void load(), [version]);

  const restore = async (id: number) => {
    if (dirty && !confirm("You have unpublished changes. Restoring will discard them. Continue?")) return;
    if (!confirm(`Publish version ${id} again as the live config?`)) return;
    try {
      await api("POST", `/config/versions/${id}/restore`);
      await reload();
      toast(`Version ${id} is live again`);
    } catch (e) {
      toast((e as Error).message, "err");
    }
  };

  const reset = async () => {
    if (!confirm("Replace the live config with the original defaults? (You can restore the current one from this list later.)")) return;
    try {
      await api("POST", "/config/reset");
      await reload();
      toast("Defaults restored");
    } catch (e) {
      toast((e as Error).message, "err");
    }
  };

  const download = async (id?: number) => {
    const cfg = id ? await api<GameConfig>("GET", `/config/versions/${id}`) : draft;
    const blob = new Blob([JSON.stringify(cfg, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `tower-rush-config${id ? `-v${id}` : "-draft"}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const importFile = async (f: File) => {
    try {
      const cfg = JSON.parse(await f.text()) as GameConfig;
      const problems = validateConfig(cfg);
      if (problems.length) return toast(`That file has problems: ${problems[0]}`, "err");
      edit((c) => Object.assign(c, cfg));
      toast("Imported into your draft. Review it, then Publish.");
    } catch {
      toast("That isn't a valid config JSON file", "err");
    }
  };

  /** Staging only: publish the live staging config as a new production version. */
  const copyToProduction = async () => {
    if (tokenFor.get("production") === null) return toast("Sign in to Production first (switch environment, then sign in).", "err");
    if (!confirm(`Copy the live STAGING config (v${version}) to PRODUCTION?

This publishes it to live players as a new production version. You can restore the previous production version from Production > Versions.`)) return;
    try {
      const staging = await api<{ config: GameConfig }>("GET", "/config");
      const r = await api<{ version: number }>("PUT", "/config", { config: staging.config, note: `Copied from staging v${version}` }, "production");
      toast(`Production is now on v${r.version}`);
    } catch (e) {
      toast(`Copy failed: ${(e as Error).message}`, "err");
    }
  };

  return (
    <>
      <PageHead title="Versions" desc="Every publish is kept. Restore any version to make it live again.">
        <button className="btn ghost" onClick={() => download()}>Export draft</button>
        <button className="btn ghost" onClick={() => file.current?.click()}>Import JSON</button>
        <input ref={file} type="file" accept="application/json" hidden onChange={(e) => e.target.files?.[0] && importFile(e.target.files[0])} />
        {currentEnv === "staging" && <button className="btn" onClick={copyToProduction}>Copy config to Production</button>}
        <button className="btn danger" onClick={reset}>Reset to defaults</button>
      </PageHead>
      <div className="table-wrap">
        <table className="grid">
          <thead>
            <tr>
              <th>Version</th>
              <th>Published</th>
              <th>By</th>
              <th>Note</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {list.map((v) => (
              <tr key={v.id}>
                <td>
                  v{v.id} {v.id === version && <span className="badge ok">live</span>}
                </td>
                <td>{fmtDate(v.createdAt)}</td>
                <td>{v.admin ?? "system"}</td>
                <td>{v.note}</td>
                <td className="actions">
                  <button className="btn small ghost" onClick={() => download(v.id)}>Download</button>
                  {v.id !== version && (
                    <button className="btn small" onClick={() => restore(v.id)}>Restore</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
