import { useState } from "react";
import { PageHead, Stat, toast } from "../components";
import {
  CREDITS_BUFFER,
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
  const total = Math.round(PLAN.reduce((s, w) => s + weekCost(w), 0) * 100) / 100;
  const paidDays = PLAN.flatMap((w) => w.days).filter((d) => THEMES[d.theme].paid).length;
  const w = PLAN[week];

  return (
    <>
      <PageHead
        title="Marketing plan"
        desc="One post a day for 9 weeks, cut once and posted to TikTok, FB Reels, X, the FB feed and Discord. Make the still on Higgsfield's website (unlimited, 0 credits), animate it into three 5s Seedance 1.5 Pro 720p clips, then post with the copy below. Gameplay and recap days are free screen recordings."
      />
      <div className="stats tight">
        <Stat label="Credits left" value={CREDITS_LEFT} sub="Higgsfield, 2026-10-14" />
        <Stat label="Planned spend" value={total} sub={`${paidDays} paid days × ${PAID_DAY_COST}`} />
        <Stat label="Buffer" value={Math.round((CREDITS_LEFT - total) * 100) / 100} sub={`Target ${CREDITS_BUFFER} for retries and a trailer shot`} />
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
              <th>Copy</th>
            </tr>
          </thead>
          <tbody>
            {w.days.map((d, i) => (
              <DayRow key={`${week}-${i}`} day={d} date={`${WEEKDAYS[i]} ${planDate(week, i)}`} />
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function DayRow({ day, date }: { day: PlanDay; date: string }) {
  const t = THEMES[day.theme];
  const posts = platformCopy(day);
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
          <strong>{t.paid ? "Still (website, 0 credits):" : "Record:"}</strong> {day.still}
        </div>
        {t.paid && (
          <button className="btn small" onClick={() => copy(day.still, "the still prompt")}>
            Copy still prompt
          </button>
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
