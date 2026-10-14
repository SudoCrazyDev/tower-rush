import { useEffect, useState } from "react";
import { api } from "../api";
import { PageHead, Stat, toast } from "../components";
import type { ArtRow } from "../../../shared/art-requests.ts";
import {
  CREDITS_LEFT,
  PAID_DAY_COST,
  PLAN,
  THEMES,
  planDate,
  platformCopy,
  weekCost,
  type PlanDay,
} from "../marketingPlan";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const copy = async (text: string, what: string) => {
  await navigator.clipboard.writeText(text);
  toast(`Copied ${what}`);
};

export function MarketingPage() {
  const [week, setWeek] = useState(0);
  // Still links and finished clips reuse the art_requests table under mkt:w<week>d<day> ids.
  const [rows, setRows] = useState<Record<string, ArtRow>>({});
  useEffect(() => {
    api<ArtRow[]>("GET", "/art")
      .then((list) => setRows(Object.fromEntries(list.filter((r) => r.id.startsWith("mkt:")).map((r) => [r.id, r]))))
      .catch((e) => toast(e.message, "err"));
  }, []);
  const save = async (id: string, url: string) => {
    const cur = rows[id];
    try {
      const saved = await api<ArtRow>("PUT", `/art/${encodeURIComponent(id)}`, { url, status: cur?.status ?? "todo", notes: cur?.notes ?? "" });
      setRows((r) => ({ ...r, [id]: saved }));
    } catch (e) {
      toast((e as Error).message, "err");
    }
  };
  const reelsReady = Object.values(rows).filter((r) => r.notes.includes("/reels/")).length;
  const total = Math.round(PLAN.reduce((s, w) => s + weekCost(w), 0) * 100) / 100;
  const paidDays = PLAN.flatMap((w) => w.days).filter((d) => THEMES[d.theme].paid).length;
  const w = PLAN[week];

  return (
    <>
      <PageHead
        title="Marketing plan"
        desc="One post a day for 9 weeks, cut once and posted to TikTok, FB Reels, X, the FB feed and Discord. Each paid day is one GPT Image 2.5 still animated into two 4s Seedance 1.5 Pro 720p clips (an 8s reel); the reel, still and clips are linked on each day. Gameplay and recap days are free screen recordings."
      />
      <div className="stats tight">
        <Stat label="Credits left" value={CREDITS_LEFT} sub="Higgsfield, 2026-10-14" />
        <Stat label="Planned spend" value={total} sub={`${paidDays} paid days × ${PAID_DAY_COST}`} />
        <Stat label="Buffer" value={Math.round((CREDITS_LEFT - total) * 100) / 100} sub="Left for retries" />
        <Stat label="Reels ready" value={`${reelsReady} / ${paidDays}`} sub="Reels generated" />
        <Stat label="Schedule" value={`${planDate(0, 0)} → ${planDate(PLAN.length - 1, 6)}`} sub={`${PLAN.length} weeks, ${PLAN.length * 7} posts`} />
      </div>

      <div className="toolbar">
        {PLAN.map((p, i) => (
          <button key={i} className={`chip ${i === week ? "on" : ""}`} onClick={() => setWeek(i)}>
            Week {i + 1}
          </button>
        ))}
      </div>

      <div className="card-group-head">
        <strong>
          Week {week + 1} · {w.phase}
        </strong>
        <span className="muted small">
          {planDate(week, 0)} to {planDate(week, 6)} · {weekCost(w)} credits
        </span>
      </div>
      <p className="muted small">{w.focus}</p>

      <div className="table-wrap">
        <table className="grid art-grid">
          <thead>
            <tr>
              <th>Day</th>
              <th>Post</th>
              <th>Make</th>
              <th>Media</th>
              <th>Copy</th>
            </tr>
          </thead>
          <tbody>
            {w.days.map((d, i) => (
              <DayRow
                key={`${week}-${i}`}
                day={d}
                date={`${WEEKDAYS[i]} ${planDate(week, i)}`}
                row={rows[`mkt:w${week + 1}d${i + 1}`]}
                onSave={(url) => save(`mkt:w${week + 1}d${i + 1}`, url)}
              />
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function DayRow({ day, date, row, onSave }: { day: PlanDay; date: string; row?: ArtRow; onSave: (url: string) => void }) {
  const t = THEMES[day.theme];
  const posts = platformCopy(day);
  const [url, setUrl] = useState(row?.url ?? "");
  useEffect(() => setUrl(row?.url ?? ""), [row?.url]);
  // Notes hold the finished links: the joined 8s reel first, then the two raw Seedance clips.
  const [reel, ...clips] = (row?.notes ?? "").split(/\s+/).filter((l) => l.startsWith("https://"));
  return (
    <tr>
      <td>
        <strong>{date}</strong>
        <div className="art-tags">
          <span className="badge">{t.label}</span>
          <span className={`badge ${t.paid ? "info" : "ok"}`}>{t.paid ? `${PAID_DAY_COST} credits` : "Free"}</span>
        </div>
      </td>
      <td className="art-asset">
        <strong>{day.title}</strong>
        <div className="small">
          Hook: <em>{day.hook}</em>
        </div>
      </td>
      <td className="art-prompt">
        <div className="small">
          <strong>{t.paid ? "Still:" : "Record:"}</strong> {day.still}
        </div>
        {t.paid && (
          <div className="art-link">
            <button className="btn small" onClick={() => copy(day.still, "the still prompt")}>
              Copy still prompt
            </button>
            <input
              placeholder="Paste the still's Higgsfield link"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onBlur={() => url !== (row?.url ?? "") && onSave(url)}
              onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
            />
          </div>
        )}
        {day.clips.length > 0 && (
          <ol className="small">
            {day.clips.map((c, i) => (
              <li key={i}>
                {c}{" "}
                <button className="btn small ghost" onClick={() => copy(c, `clip ${i + 1}`)}>
                  Copy
                </button>
              </li>
            ))}
          </ol>
        )}
      </td>
      <td>
        {reel && <video src={reel} crossOrigin="anonymous" controls loop muted playsInline preload="none" poster={row?.url} width={135} height={240} />}
        {!reel && row?.url && (
          <a href={row.url} target="_blank" rel="noreferrer">
            <img className="thumb" crossOrigin="anonymous" src={row.url} width={72} height={128} alt="" loading="lazy" />
          </a>
        )}
        {(reel || row?.url) && (
          <div className="small">
            {reel && (
              <a href={reel} download target="_blank" rel="noreferrer">
                Reel
              </a>
            )}{" "}
            {row?.url && (
              <a href={row.url} download target="_blank" rel="noreferrer">
                Still
              </a>
            )}{" "}
            {clips.map((c, i) => (
              <a key={c} href={c} target="_blank" rel="noreferrer">
                Clip {i + 1}{" "}
              </a>
            ))}
          </div>
        )}
      </td>
      <td>
        <div className="art-refs">
          {Object.entries(posts).map(([platform, text]) => (
            <button key={platform} className="btn small" title={text} onClick={() => copy(text, `the ${platform} post`)}>
              {platform}
            </button>
          ))}
        </div>
        <div className="muted small">{day.caption}</div>
      </td>
    </tr>
  );
}
