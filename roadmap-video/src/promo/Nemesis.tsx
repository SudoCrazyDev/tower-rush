import React from "react";
import { AbsoluteFill, Img, interpolate, Sequence, staticFile, useCurrentFrame } from "remotion";
import { Board, body, Caption, chunky, clamp, GOLD, GREEN, NAVY, OnPad, along, PopIn, RED, Ribbon, SKY, usePop } from "./CommandMode";

/**
 * Retention pitch: "The Nemesis War". Monsters that escape remember you, grow, hunt you and your
 * friends, and every week the worst of them merge into a Warlord the whole player base fights.
 * See docs/features/concepts/nemesis-war.md. scripts/promo-nm.mjs copies the art into public/cm.
 */

const PURPLE = "#b45cff";
const mon = (id: string) => staticFile(`cm/monsters/${id}.webp`);
const hero = (id: string) => staticFile(`cm/heroes/${id}.webp`);
const item = (id: string) => staticFile(`cm/items/${id}.webp`);

function Bg({ src = "world_map", dim = 0.6, blur = 3 }: { src?: string; dim?: number; blur?: number }) {
  return (
    <AbsoluteFill style={{ background: NAVY }}>
      <Img src={staticFile(`cm/${src}.webp`)} style={{ width: "100%", height: "100%", objectFit: "cover", filter: `blur(${blur}px)`, transform: "scale(1.04)" }} />
      <AbsoluteFill style={{ background: `radial-gradient(ellipse at center, #b45cff22 0%, ${NAVY}${Math.round(dim * 255).toString(16).padStart(2, "0")} 60%, ${NAVY}f0 100%)` }} />
    </AbsoluteFill>
  );
}

function Panel({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div style={{ background: `${NAVY}e6`, border: `5px solid ${SKY}55`, borderRadius: 28, padding: "18px 24px", ...style }}>{children}</div>;
}

/** The goblin nemesis: tinted, scarred, glowing more as its rank climbs. */
function Skrit({ size, rank }: { size: number; rank: number }) {
  const frame = useCurrentFrame();
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <div style={{ position: "absolute", inset: -size * 0.15, borderRadius: "50%", background: `radial-gradient(circle, ${RED}${rank > 1 ? "88" : "44"}, transparent 65%)`, transform: `scale(${1 + Math.sin(frame / 6) * 0.05})` }} />
      <Img src={mon("goblin_runner")} style={{ position: "relative", width: size, height: size, filter: `saturate(1.4) hue-rotate(-25deg) drop-shadow(0 0 ${size * 0.04}px ${RED})` }} />
      {/* The scar: a burn mark from the fire that almost killed it. */}
      <div style={{ position: "absolute", left: size * 0.38, top: size * 0.28, width: size * 0.26, height: size * 0.05, background: "#ff8a3d", borderRadius: size, transform: "rotate(-35deg)", boxShadow: `0 0 ${size * 0.04}px #ff5a00` }} />
      <div style={{ position: "absolute", left: size * 0.38, top: size * 0.34, width: size * 0.2, height: size * 0.04, background: "#ff8a3d", borderRadius: size, transform: "rotate(-35deg)" }} />
    </div>
  );
}

// ---------------------------------------------------------------- scenes

const S_HOOK = 180;
const S_BORN = 240;
const S_BACK = 300;
const S_HUNT = 240;
const S_WAR = 300;
const S_STORY = 210;
const S_MIX = 210;
const S_OUT = 150;
export const NM_LEN = S_HOOK + S_BORN + S_BACK + S_HUNT + S_WAR + S_STORY + S_MIX + S_OUT;

function Hook() {
  const frame = useCurrentFrame();
  // One goblin slips through; the frame freezes on it.
  const d = Math.min(frame, 120) * 26;
  const p = along(d);
  const freeze = frame >= 120;
  const t = usePop(128, 8);
  return (
    <Board>
      <OnPad id="lava_golem" pad={0} at={0} />
      <OnPad id="fox_samurai" pad={1} at={0} />
      <OnPad id="hooded_archer" pad={2} at={0} />
      <OnPad id="frost_sorceress" pad={3} at={0} />
      <div style={{ position: "absolute", left: p.x - 70, top: p.y - 100 }}>
        <Skrit size={140} rank={1} />
      </div>
      {freeze && <AbsoluteFill style={{ background: `${NAVY}aa`, filter: "grayscale(1)" }} />}
      {freeze && (
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 30, transform: `scale(${t})` }}>
          <Skrit size={360} rank={1} />
          <div style={chunky(110, RED)}>IT ESCAPED.</div>
          <div style={body(48)}>And it will remember you.</div>
        </AbsoluteFill>
      )}
      <Caption kicker="FEATURE PITCH" title="THE NEMESIS WAR" top={40} />
    </Board>
  );
}

function Born() {
  const frame = useCurrentFrame();
  const card = usePop(10, 10);
  const taunt = usePop(150, 7);
  return (
    <AbsoluteFill>
      <Bg src="arena" />
      <Caption kicker="1 · A NEMESIS IS BORN" title="EVERY LEAK CAN RISE" sub="A monster that escapes gets a name, a rank and a scar." />
      <div style={{ position: "absolute", top: 540, left: 70, right: 70, transform: `scale(${card})` }}>
        <Panel style={{ border: `8px solid ${RED}`, display: "flex", flexDirection: "column", alignItems: "center", gap: 14, padding: 30 }}>
          <Skrit size={340} rank={1} />
          <div style={chunky(76, GOLD)}>SKRIT</div>
          <div style={chunky(44, RED)}>THE EMBER-SCARRED</div>
          {[
            ["RANK", "1"],
            ["SCAR", "Lava Golem nearly burned it: −50% Fire damage"],
            ["GRUDGE", "Hunts your Fox Samurai deck"],
            ["ESCAPED", frame > 90 ? "1 time" : "…"],
          ].map(([k, v], i) => (
            <PopIn key={k} at={40 + i * 14} style={{ width: "100%" }}>
              <div style={{ display: "flex", gap: 20, alignItems: "center", background: "#0b0e24", borderRadius: 16, padding: "10px 18px" }}>
                <div style={{ ...chunky(34, SKY), width: 190, textAlign: "left" }}>{k}</div>
                <div style={{ ...body(32), textAlign: "left", flex: 1 }}>{v}</div>
              </div>
            </PopIn>
          ))}
        </Panel>
      </div>
      {frame >= 150 && <Img src={staticFile("cm/emotes/goblin_laugh.webp")} style={{ position: "absolute", top: 560, right: 60, width: 220, transform: `scale(${taunt}) rotate(10deg)` }} />}
    </AbsoluteFill>
  );
}

function Back() {
  const frame = useCurrentFrame();
  const d = interpolate(frame, [30, 200], [0, 2600], clamp);
  const p = along(d);
  const banner = usePop(20, 9);
  const resist = frame >= 90 && frame < 150;
  const dead = frame >= 200;
  const rev = usePop(205, 7);
  return (
    <Board>
      <OnPad id="lava_golem" pad={0} at={0} />
      <OnPad id="fox_samurai" pad={1} at={0} />
      <OnPad id="phoenix_chick" pad={2} at={0} />
      <OnPad id="frost_sorceress" pad={3} at={0} label="NEW PICK" />
      {!dead && (
        <div style={{ position: "absolute", left: p.x - 110, top: p.y - 160 }}>
          <Skrit size={220} rank={3} />
          <div style={{ ...chunky(34, GOLD), marginTop: -20 }}>SKRIT · R3</div>
          {resist && <div style={{ ...chunky(46, "#ff8a3d"), position: "absolute", top: -40, left: 20 }}>RESIST!</div>}
        </div>
      )}
      <Caption kicker="2 · IT COMES BACK" title="SKRIT IS HUNTING YOU" sub="Stronger each escape. Your fire can't touch it. Change your deck." top={40} />
      {dead && (
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", background: `${NAVY}99`, gap: 24 }}>
          <div style={{ ...chunky(130, GREEN), transform: `scale(${rev})` }}>REVENGE!</div>
          <PopIn at={225}>
            <Panel style={{ display: "flex", alignItems: "center", gap: 20 }}>
              <Img src={item("star_shard")} style={{ width: 120 }} />
              <div>
                <div style={{ ...chunky(44, GOLD), textAlign: "left" }}>Skrit's Trophy</div>
                <div style={{ ...body(30), textAlign: "left" }}>Bounty grows with its rank</div>
              </div>
            </Panel>
          </PopIn>
        </AbsoluteFill>
      )}
      {frame < 60 && (
        <div style={{ position: "absolute", top: 300, left: 0, right: 0, display: "flex", justifyContent: "center", transform: `scale(${banner})` }}>
          <Ribbon text="⚠ NEMESIS INCOMING" size={54} color={`linear-gradient(${RED}, #a01d3a)`} />
        </div>
      )}
    </Board>
  );
}

const FRIENDS = [
  { h: "sea_witch", n: "Marisol", s: "invaded · held it off", ok: true },
  { h: "orc_warchief", n: "Grukk", s: "invaded · it escaped again!", ok: false },
  { h: "elf_archmage", n: "Lyra", s: "killed it · split the bounty", ok: true },
];

function Hunt() {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill>
      <Bg />
      <Caption kicker="3 · IT INVADES YOUR FRIENDS" title="SHARE THE HUNT" sub="Your nemesis crashes into friends' runs. Whoever kills it splits the bounty." />
      <div style={{ position: "absolute", top: 560, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
        <Skrit size={260} rank={4} />
      </div>
      <div style={{ position: "absolute", top: 880, left: 60, right: 60, display: "flex", flexDirection: "column", gap: 20 }}>
        {FRIENDS.map((f, i) => (
          <PopIn key={f.h} at={30 + i * 40}>
            <Panel style={{ display: "flex", alignItems: "center", gap: 20, borderColor: f.ok ? GREEN : RED }}>
              <Img src={hero(f.h)} style={{ width: 130 }} />
              <div style={{ flex: 1 }}>
                <div style={{ ...chunky(48), textAlign: "left" }}>{f.n}</div>
                <div style={{ ...body(32, f.ok ? GREEN : RED), textAlign: "left" }}>{f.s}</div>
              </div>
              <div style={{ fontSize: 70 }}>{f.ok ? "🛡️" : "💨"}</div>
            </Panel>
          </PopIn>
        ))}
      </div>
      <PopIn at={170} style={{ position: "absolute", bottom: 120, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
        <Ribbon text="+240 GEMS · SHARED BOUNTY" size={50} color={`linear-gradient(${GOLD}, #c98a00)`} />
      </PopIn>
    </AbsoluteFill>
  );
}

const NEMESES = ["goblin_runner", "orc_brute", "vampire_bat", "skeleton_soldier", "wolf_raider", "troll_healer", "lava_imp", "gargoyle", "boar_rider", "yeti_cub"];

function War() {
  const frame = useCurrentFrame();
  const pull = interpolate(frame, [20, 120], [0, 1], clamp);
  const lord = usePop(118, 8);
  const bars = interpolate(frame, [150, 210], [0, 1], clamp);
  const stats = [
    ["Fire", 38, "#ff7a3d"],
    ["Arcane", 24, PURPLE],
    ["Ice", 9, "#7fd6ff"],
  ] as const;
  return (
    <AbsoluteFill>
      <Bg />
      <Caption kicker="4 · EVERY SUNDAY" title="THE WARLORD RISES" sub="The worst nemeses of the week fuse into one boss for the whole server." />
      {frame < 125 &&
        NEMESES.map((m, i) => {
          const a = (i / NEMESES.length) * Math.PI * 2;
          const r = 480 * (1 - pull);
          return <Img key={i} src={mon(m)} style={{ position: "absolute", left: 540 + Math.cos(a) * r - 70, top: 900 + Math.sin(a) * r - 70, width: 140, filter: `hue-rotate(-25deg) drop-shadow(0 0 8px ${RED})`, opacity: 1 - pull * 0.3 }} />;
        })}
      {frame >= 118 && (
        <div style={{ position: "absolute", left: 540 - 260, top: 640, width: 520, transform: `scale(${lord})` }}>
          <div style={{ position: "absolute", inset: -40, borderRadius: "50%", background: `radial-gradient(circle, ${RED}88, transparent 65%)` }} />
          <Img src={staticFile("cm/bosses/demon_lord.webp")} style={{ width: 520, position: "relative" }} />
        </div>
      )}
      {frame >= 145 && (
        <div style={{ position: "absolute", top: 1200, left: 60, right: 60 }}>
          <Panel>
            <div style={{ ...chunky(40, GOLD), marginBottom: 10 }}>THIS WEEK'S DAMAGE, ALL PLAYERS</div>
            {stats.map(([el, pct, c], i) => (
              <div key={el} style={{ display: "flex", alignItems: "center", gap: 16, margin: "10px 0" }}>
                <div style={{ ...chunky(36), width: 170, textAlign: "left" }}>{el}</div>
                <div style={{ flex: 1, height: 36, background: "#0b0e24", borderRadius: 18, overflow: "hidden", position: "relative" }}>
                  <div style={{ width: `${pct * 2 * bars}%`, height: "100%", background: c }} />
                  {i === 0 && frame >= 215 && <div style={{ ...chunky(28), position: "absolute", left: 16, top: 2 }}>🛡 WARLORD RESISTS</div>}
                </div>
                <div style={{ ...chunky(36), width: 90 }}>{Math.round(pct * bars)}%</div>
              </div>
            ))}
            <div style={{ ...body(34, GREEN), marginTop: 12, opacity: interpolate(frame, [220, 240], [0, 1], clamp) }}>The Warlord resists the most-used element. The meta balances itself.</div>
          </Panel>
        </div>
      )}
    </AbsoluteFill>
  );
}

function Story() {
  const frame = useCurrentFrame();
  const won = frame >= 110;
  const s = usePop(110, 9);
  return (
    <AbsoluteFill>
      <Bg dim={0.35} blur={0} />
      <Caption kicker="5 · THE SERVER WRITES THE STORY" title="WIN OR LOSE, IT'S CANON" sub="The Warlord's fate decides the next Story chapter." />
      <div style={{ position: "absolute", top: 600, left: 60, right: 60, display: "flex", gap: 24 }}>
        {[
          { t: "SERVER WINS", d: "The Elven Wilds are freed. Next chapter: the counterattack.", c: GREEN, on: won },
          { t: "SERVER LOSES", d: "Corruption spreads on the map. Next chapter: a rescue mission.", c: PURPLE, on: false },
        ].map((o, i) => (
          <PopIn key={o.t} at={20 + i * 14} style={{ flex: 1 }}>
            <Panel style={{ borderColor: o.c, minHeight: 520, display: "flex", flexDirection: "column", gap: 16, opacity: won && !o.on ? 0.45 : 1, transform: o.on ? `scale(${1 + s * 0.05})` : undefined }}>
              <div style={chunky(52, o.c)}>{o.t}</div>
              <div style={body(34)}>{o.d}</div>
              {o.on && <div style={{ ...chunky(60, GOLD), marginTop: 30 }}>✔ THIS WEEK</div>}
            </Panel>
          </PopIn>
        ))}
      </div>
      <PopIn at={140} style={{ position: "absolute", bottom: 150, left: 60, right: 60 }}>
        <div style={{ ...body(40, SKY), background: `${NAVY}cc`, padding: "14px 24px", borderRadius: 18 }}>Players don't read the next book. They decide it.</div>
      </PopIn>
    </AbsoluteFill>
  );
}

function Mix() {
  const rows = [
    ["Shadow of Mordor", "Enemies who remember you"],
    ["Dark Souls", "Invasions into friends' worlds"],
    ["Helldivers 2", "One war the whole server fights"],
  ];
  const plus = usePop(120, 9);
  return (
    <AbsoluteFill>
      <Bg dim={0.65} />
      <Caption kicker="WHY IT'S FRESH" title="THREE IDEAS, ONE FIRST" sub="Each one is proven. We haven't seen them combined in a tower defense game." />
      <div style={{ position: "absolute", top: 560, left: 60, right: 60, display: "flex", flexDirection: "column", gap: 18 }}>
        {rows.map(([g, s], i) => (
          <PopIn key={g} at={15 + i * 18}>
            <Panel style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
              <div style={chunky(52, GOLD)}>{g}</div>
              <div style={{ ...body(34), textAlign: "left" }}>{s}</div>
            </Panel>
          </PopIn>
        ))}
      </div>
      <div style={{ position: "absolute", bottom: 150, left: 0, right: 0, display: "flex", justifyContent: "center", transform: `scale(${plus})` }}>
        <Ribbon text="= A REASON TO OPEN THE GAME TODAY" size={46} color={`linear-gradient(${RED}, #a01d3a)`} />
      </div>
    </AbsoluteFill>
  );
}

function Outro() {
  const a = usePop(5, 10);
  const b = usePop(35, 10);
  const c = usePop(65, 12);
  return (
    <AbsoluteFill>
      <Bg dim={0.55} />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 40, padding: 70 }}>
        <div style={{ transform: `scale(${a})` }}>
          <Skrit size={300} rank={5} />
        </div>
        <div style={{ ...chunky(84), transform: `scale(${a})` }}>YOUR MONSTERS. YOUR STORY.</div>
        <div style={{ ...chunky(140, RED), transform: `scale(${b})` }}>THE NEMESIS WAR</div>
        <Img src={staticFile("cm/logo.png")} style={{ width: 600, transform: `scale(${c})` }} />
        <div style={{ ...body(32, "#9fb0e8"), opacity: c }}>Feature pitch · not on the roadmap yet</div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}

export const Nemesis = () => {
  let t = 0;
  const seq = (len: number, node: React.ReactNode) => {
    const from = t;
    t += len;
    return (
      <Sequence from={from} durationInFrames={len}>
        {node}
      </Sequence>
    );
  };
  return (
    <AbsoluteFill style={{ background: NAVY }}>
      {seq(S_HOOK, <Hook />)}
      {seq(S_BORN, <Born />)}
      {seq(S_BACK, <Back />)}
      {seq(S_HUNT, <Hunt />)}
      {seq(S_WAR, <War />)}
      {seq(S_STORY, <Story />)}
      {seq(S_MIX, <Mix />)}
      {seq(S_OUT, <Outro />)}
    </AbsoluteFill>
  );
};
