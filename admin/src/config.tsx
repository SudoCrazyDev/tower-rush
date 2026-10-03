/**
 * Holds the game config being edited. Every editor page changes `draft`; the save bar
 * (in App) publishes it to the server as a new version in one go.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api } from "./api";
import { validateConfig, type GameConfig } from "../../shared/config.ts";

interface ConfigState {
  draft: GameConfig | null;
  saved: GameConfig | null;
  defaults: GameConfig | null;
  version: number;
  dirty: boolean;
  problems: string[];
  edit: (fn: (c: GameConfig) => void) => void;
  discard: () => void;
  save: (note: string) => Promise<void>;
  reload: () => Promise<void>;
}

const Ctx = createContext<ConfigState | null>(null);

export function ConfigProvider({ children }: { children: ReactNode }) {
  const [saved, setSaved] = useState<GameConfig | null>(null);
  const [draft, setDraft] = useState<GameConfig | null>(null);
  const [defaults, setDefaults] = useState<GameConfig | null>(null);
  const [version, setVersion] = useState(0);

  const reload = useCallback(async () => {
    const r = await api<{ version: number; config: GameConfig; defaults: GameConfig }>("GET", "/config");
    setSaved(r.config);
    setDraft(structuredClone(r.config));
    setDefaults(r.defaults);
    setVersion(r.version);
  }, []);

  useEffect(() => {
    reload().catch(() => {});
  }, [reload]);

  const dirty = useMemo(() => !!draft && !!saved && JSON.stringify(draft) !== JSON.stringify(saved), [draft, saved]);
  const problems = useMemo(() => (draft && dirty ? validateConfig(draft) : []), [draft, dirty]);

  const value: ConfigState = {
    draft,
    saved,
    defaults,
    version,
    dirty,
    problems,
    edit: (fn) =>
      setDraft((d) => {
        if (!d) return d;
        const next = structuredClone(d);
        fn(next);
        return next;
      }),
    discard: () => saved && setDraft(structuredClone(saved)),
    save: async (note) => {
      if (!draft) return;
      await api("PUT", "/config", { config: draft, note });
      await reload();
    },
    reload,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useConfig() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useConfig outside ConfigProvider");
  return c;
}
