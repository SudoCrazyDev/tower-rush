import { useEffect, useMemo, useState } from "react";
import { api, ASSETS } from "../api";
import { PageHead, Thumb, toast } from "../components";
import { artRequests, ART_STATUSES, STYLE_ANCHOR, type ArtRequest, type ArtRow, type ArtStatus, type HaveArt } from "../../../shared/art-requests.ts";

const STATUS_LABEL: Record<ArtStatus, string> = { todo: "To do", ready: "Link pasted", redo: "Redo", done: "Live" };
const STATUS_BADGE: Record<ArtStatus, string> = { todo: "", ready: "info", redo: "err", done: "ok" };

/** Game art refs live at the asset base; raw-pack files (assets/...) are only on the dev machine, and notes aren't files. */
const refUrl = (r: string) => (r.startsWith("assets/") || !/\.(webp|png)$/.test(r) ? null : `${ASSETS}${r}`);

export function ArtPage() {
  const [have, setHave] = useState<HaveArt | null>(null);
  const [rows, setRows] = useState<Record<string, ArtRow>>({});
  const [group, setGroup] = useState("");
  const [status, setStatus] = useState<ArtStatus | "">("");
  const [q, setQ] = useState("");

  useEffect(() => {
    fetch(`${ASSETS}index.json`)
      .then((r) => r.json())
      .then(setHave)
      .catch(() => toast("Couldn't load the asset index", "err"));
    api<ArtRow[]>("GET", "/art")
      .then((list) => setRows(Object.fromEntries(list.map((r) => [r.id, r]))))
      .catch((e) => toast(e.message, "err"));
  }, []);

  // A request with a saved row stays listed after its art ships (so "Live" rows don't vanish).
  const list = useMemo(() => {
    if (!have) return [];
    const keep = (prefix: string, ids: string[]) => ids.filter((id) => !rows[`${prefix}:${id}`]);
    return artRequests({ units_awakened: keep("awakened", have.units_awakened), portraits_awakened: keep("awakened-portrait", have.portraits_awakened) });
  }, [have, rows]);

  const statusOf = (id: string): ArtStatus => rows[id]?.status ?? "todo";
  const groups = [...new Set(list.map((r) => r.group))];
  const shown = list.filter(
    (r) => (!group || r.group === group) && (!status || statusOf(r.id) === status) && (!q || `${r.title} ${r.file}`.toLowerCase().includes(q.toLowerCase())),
  );
  const counts = Object.fromEntries(ART_STATUSES.map((s) => [s, list.filter((r) => statusOf(r.id) === s).length])) as Record<ArtStatus, number>;

  const save = async (id: string, patch: Partial<ArtRow>) => {
    const cur = rows[id] ?? { id, url: "", status: "todo" as ArtStatus, notes: "", updatedAt: 0 };
    const next = { ...cur, ...patch };
    try {
      const saved = await api<ArtRow>("PUT", `/art/${encodeURIComponent(id)}`, { url: next.url, status: next.status, notes: next.notes });
      setRows((r) => ({ ...r, [id]: saved }));
    } catch (e) {
      toast((e as Error).message, "err");
    }
  };

  return (
    <>
      <PageHead
        title="Art requests"
        desc={`Images to make on Higgsfield's unlimited models. Copy a prompt, attach the references (always add ${STYLE_ANCHOR}), generate, then paste the result's link here. Rows marked "Link pasted" get processed into the game.`}
      />
      <div className="toolbar">
        <select value={group} onChange={(e) => setGroup(e.target.value)}>
          <option value="">All groups ({list.length})</option>
          {groups.map((g) => (
            <option key={g} value={g}>
              {g} ({list.filter((r) => r.group === g).length})
            </option>
          ))}
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value as ArtStatus | "")}>
          <option value="">Any status</option>
          {ART_STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s]} ({counts[s]})
            </option>
          ))}
        </select>
        <input placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} />
        <span className="muted small">
          {ART_STATUSES.map((s) => `${STATUS_LABEL[s]} ${counts[s]}`).join(" · ")}
        </span>
      </div>
      {!have ? (
        <div className="muted">Loading…</div>
      ) : (
        <div className="table-wrap">
          <table className="grid art-grid">
            <thead>
              <tr>
                <th>Asset</th>
                <th>References</th>
                <th>Prompt</th>
                <th>Generated link</th>
                <th>Status</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => (
                <ArtRowView key={r.id} req={r} row={rows[r.id]} onSave={(p) => save(r.id, p)} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function ArtRowView({ req, row, onSave }: { req: ArtRequest; row?: ArtRow; onSave: (p: Partial<ArtRow>) => void }) {
  const [url, setUrl] = useState(row?.url ?? "");
  const [notes, setNotes] = useState(row?.notes ?? "");
  const [open, setOpen] = useState(false);
  useEffect(() => setUrl(row?.url ?? ""), [row?.url]);
  useEffect(() => setNotes(row?.notes ?? ""), [row?.notes]);
  const st = row?.status ?? "todo";

  const copy = async () => {
    await navigator.clipboard.writeText(req.prompt);
    toast(`Copied the prompt for ${req.title}`);
  };

  return (
    <tr>
      <td className="art-asset">
        <strong>{req.title}</strong>
        <div className="muted small">{req.group}</div>
        <code className="small">assets/{req.file}</code>
        <div className="art-tags">
          <span className="badge info">{req.model}</span>
          <span className="badge">{req.aspect}</span>
        </div>
      </td>
      <td>
        <div className="art-refs">
          {req.refs.map((ref) => {
            const u = refUrl(ref);
            return u ? (
              <a key={ref} href={u} target="_blank" rel="noreferrer" title={ref}>
                <Thumb src={u} size={56} />
              </a>
            ) : (
              <code key={ref} className="small muted" title={ref.startsWith("assets/") ? "In the raw pack on your PC" : undefined}>
                {ref}
              </code>
            );
          })}
        </div>
      </td>
      <td className="art-prompt">
        <div className={open ? "" : "clamp"} onClick={() => setOpen(!open)} title="Click to expand">
          {req.prompt}
        </div>
        <button className="btn small" onClick={copy}>Copy prompt</button>
      </td>
      <td className="art-link">
        <input
          placeholder="Paste the Higgsfield image link"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onBlur={() => url !== (row?.url ?? "") && onSave({ url })}
          onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
        />
        {row?.url && (
          <a href={row.url} target="_blank" rel="noreferrer">
            <img className="thumb" src={row.url} width={96} height={96} alt="" loading="lazy" />
          </a>
        )}
      </td>
      <td>
        <select value={st} onChange={(e) => onSave({ status: e.target.value as ArtStatus })}>
          {ART_STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s]}
            </option>
          ))}
        </select>
        {STATUS_BADGE[st] && (
          <div>
            <span className={`badge ${STATUS_BADGE[st]}`}>{STATUS_LABEL[st]}</span>
          </div>
        )}
      </td>
      <td>
        <textarea rows={3} value={notes} placeholder="e.g. redo: wrong colors" onChange={(e) => setNotes(e.target.value)} onBlur={() => notes !== (row?.notes ?? "") && onSave({ notes })} />
      </td>
    </tr>
  );
}
