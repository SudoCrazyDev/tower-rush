import React from "react";
import type { Glyph } from "./storyCast";

/**
 * Placeholder art for v1.2 "Stories": one chunky emblem per unit, monster and boss, in the
 * game's navy-outline style on a 200×200 canvas. Replaced by the real portrait once it exists.
 */

const N = "#14183a";
const S = { stroke: N, strokeWidth: 7, strokeLinejoin: "round" as const, strokeLinecap: "round" as const };
const T = { ...S, strokeWidth: 5 };

/** Violet chaos eyes for corrupted foes. */
const ChaosEyes = ({ y = 100, gap = 22 }: { y?: number; gap?: number }) => (
  <g>
    {[-gap, gap].map((dx) => (
      <path key={dx} d={`M${100 + dx - 12} ${y - 4} L${100 + dx + 12} ${y + 2} L${100 + dx - 8} ${y + 8}Z`} fill="#d9a6ff" stroke={N} strokeWidth={4} strokeLinejoin="round" />
    ))}
  </g>
);

/** A violet chaos tentacle curling up from (x, y); `d` = 1 curls right, -1 curls left. */
const Tentacle = ({ x, y, h = 50, d = 1, w = 12 }: { x: number; y: number; h?: number; d?: number; w?: number }) => {
  const path = `M${x} ${y} Q${x - d * h * 0.4} ${y - h * 0.5} ${x + d * h * 0.1} ${y - h * 0.8} Q${x + d * h * 0.45} ${y - h * 1.05} ${x + d * h * 0.25} ${y - h * 0.7}`;
  return (
    <g>
      <path d={path} fill="none" stroke={N} strokeWidth={w + 8} strokeLinecap="round" />
      <path d={path} fill="none" stroke="#8b3dff" strokeWidth={w} strokeLinecap="round" />
    </g>
  );
};

/** A small staring chaos eye. */
const Eye = ({ x, y, r = 12 }: { x: number; y: number; r?: number }) => (
  <g>
    <ellipse cx={x} cy={y} rx={r * 1.4} ry={r} fill="#f4e6ff" stroke={N} strokeWidth={4} />
    <circle cx={x} cy={y} r={r * 0.6} fill="#8b3dff" stroke={N} strokeWidth={3} />
    <circle cx={x} cy={y} r={r * 0.25} fill={N} />
  </g>
);

/** A plain human head with corrupted eyes, for the villagers. */
const Head = ({ y = 82, skin = "#f2c6a0" }: { y?: number; skin?: string }) => (
  <g>
    <circle cx={100} cy={y} r={36} fill={skin} {...S} />
    <ChaosEyes y={y + 2} gap={14} />
  </g>
);

const Heart = ({ x, y, s = 1, fill = "#ff4fa3" }: { x: number; y: number; s?: number; fill?: string }) => (
  <path transform={`translate(${x} ${y}) scale(${s})`} d="M0 10 C-18 -4 -12 -20 0 -10 C12 -20 18 -4 0 10Z" fill={fill} {...T} />
);

const G: Record<Glyph, () => React.ReactElement> = {
  heart_mug: () => (
    <g>
      <path d="M50 70 L140 70 L132 170 L58 170Z" fill="#fff4fb" {...S} />
      <path d="M140 92 Q172 96 168 124 Q164 148 136 146" fill="none" {...S} />
      <path d="M56 88 L136 88 L134 112 L58 112Z" fill="#ff8cc6" />
      <path d="M44 72 Q60 46 82 60 Q96 38 116 56 Q138 44 146 70Z" fill="#fff" {...S} />
      <Heart x={96} y={136} s={1.5} />
      <Heart x={160} y={44} s={0.9} fill="#ffc2e2" />
      <Heart x={34} y={118} s={0.7} fill="#ffc2e2" />
    </g>
  ),
  pentagon: () => (
    <g>
      <path d="M100 26 L172 78 L145 166 L55 166 L28 78Z" fill="#ffd93b" {...S} />
      <path d="M100 52 L148 87 L130 146 L70 146 L52 87Z" fill="#4f8dff" {...T} />
      <path d="M100 74 L100 128 M76 98 L124 98" stroke="#fff" strokeWidth={12} strokeLinecap="round" />
    </g>
  ),
  daggers: () => (
    <g>
      {[-1, 1].map((d) => (
        <g key={d} transform={`rotate(${d * 35} 100 110)`}>
          <path d="M92 30 L108 30 L106 120 L94 120Z" fill="#dfe6ff" {...S} />
          <rect x={74} y={118} width={52} height={14} rx={6} fill="#e8344a" {...T} />
          <rect x={92} y={132} width={16} height={36} rx={6} fill="#5b2a2a" {...T} />
        </g>
      ))}
      <path d="M40 170 Q100 150 160 172" fill="none" stroke="#e8344a" strokeWidth={10} strokeLinecap="round" />
    </g>
  ),
  aegis: () => (
    <g>
      <path d="M100 24 Q140 40 168 40 Q170 130 100 178 Q30 130 32 40 Q60 40 100 24Z" fill="#9fc4ff" {...S} />
      <path d="M100 48 Q128 58 146 58 Q144 120 100 152 Q56 120 54 58 Q72 58 100 48Z" fill="#fff" {...T} />
      <path d="M78 98 L94 116 L126 80" fill="none" stroke="#3a7d2a" strokeWidth={12} strokeLinecap="round" strokeLinejoin="round" />
    </g>
  ),
  lance: () => (
    <g transform="rotate(-35 100 100)">
      <path d="M100 14 L116 70 L84 70Z" fill="#dfe6ff" {...S} />
      <path d="M88 70 L112 70 L118 150 L82 150Z" fill="#4f8dff" {...S} />
      <path d="M70 150 L130 150 L120 166 L80 166Z" fill="#ffd93b" {...S} />
      <rect x={92} y={166} width={16} height={24} rx={5} fill="#7a4a2a" {...T} />
      <path d="M118 84 L156 92 L118 106" fill="#e8344a" {...T} />
    </g>
  ),
  oath: () => (
    <g>
      <path d="M92 20 L108 20 L108 130 L92 130Z" fill="#dfe6ff" {...S} />
      <path d="M58 128 L142 128 L142 144 L58 144Z" fill="#ffd93b" {...S} />
      <rect x={91} y={144} width={18} height={36} rx={6} fill="#4f8dff" {...T} />
      <path d="M150 50 L156 64 L170 66 L160 76 L162 90 L150 84 L138 90 L140 76 L130 66 L144 64Z" fill="#ffd93b" {...T} />
    </g>
  ),
  lantern: () => (
    <g>
      <path d="M86 24 Q100 10 114 24" fill="none" {...S} />
      <rect x={68} y={34} width={64} height={18} rx={6} fill="#4f8dff" {...S} />
      <path d="M64 52 L136 52 L130 150 L70 150Z" fill="#ffe9a3" {...S} />
      <path d="M100 76 Q120 104 100 130 Q80 104 100 76Z" fill="#ff8f3b" {...T} />
      <rect x={60} y={150} width={80} height={20} rx={6} fill="#4f8dff" {...S} />
    </g>
  ),
  axe: () => (
    <g transform="rotate(-20 100 100)">
      <rect x={92} y={30} width={16} height={150} rx={6} fill="#7a4a2a" {...S} />
      <path d="M108 40 Q170 30 172 92 Q140 80 108 96Z" fill="#dfe6ff" {...S} />
      <path d="M92 40 Q30 30 28 92 Q60 80 92 96Z" fill="#dfe6ff" {...S} />
      <path d="M150 50 L160 40 M46 50 L36 40" stroke="#e8344a" strokeWidth={8} strokeLinecap="round" />
    </g>
  ),
  bomb: () => (
    <g>
      <circle cx={96} cy={118} r={56} fill="#2e3354" {...S} />
      <rect x={108} y={52} width={30} height={20} rx={5} transform="rotate(35 123 62)" fill="#8a8fb0" {...T} />
      <path d="M134 50 Q150 28 170 34" fill="none" stroke="#7a4a2a" strokeWidth={7} strokeLinecap="round" />
      <path d="M172 34 L186 20 M172 34 L190 38 M172 34 L176 16" stroke="#ffb02e" strokeWidth={7} strokeLinecap="round" />
      <circle cx={76} cy={98} r={12} fill="#fff" opacity={0.5} />
    </g>
  ),
  coin_blade: () => (
    <g>
      <circle cx={84} cy={116} r={54} fill="#ffd93b" {...S} />
      <circle cx={84} cy={116} r={36} fill="none" {...T} />
      <text x={84} y={134} textAnchor="middle" fontSize={52} fontWeight={900} fill={N}>$</text>
      <path d="M140 20 L156 26 L120 130 L108 124Z" fill="#dfe6ff" {...S} />
      <path d="M96 118 L132 134" stroke={N} strokeWidth={12} strokeLinecap="round" />
    </g>
  ),
  gummy: () => (
    <g>
      <circle cx={62} cy={58} r={22} fill="#ff5a5a" {...S} />
      <circle cx={138} cy={58} r={22} fill="#ff5a5a" {...S} />
      <ellipse cx={100} cy={112} rx={64} ry={66} fill="#ff5a5a" {...S} />
      <ChaosEyes y={100} />
      <path d="M84 136 Q100 128 116 136" fill="none" {...T} />
      <ellipse cx={74} cy={84} rx={10} ry={16} fill="#fff" opacity={0.45} />
    </g>
  ),
  corn: () => (
    <g>
      <path d="M100 20 L164 172 L36 172Z" fill="#fff6e0" {...S} />
      <path d="M62 110 L138 110 L164 172 L36 172Z" fill="#ffb02e" {...S} />
      <path d="M50 142 L150 142 L164 172 L36 172Z" fill="#ff7a1a" {...S} />
      <ChaosEyes y={84} gap={16} />
    </g>
  ),
  bean: () => (
    <g>
      <path d="M50 118 Q30 54 92 46 Q150 40 160 92 Q168 150 112 156 Q92 158 82 146 Q62 160 50 118Z" fill="#5fd46a" {...S} />
      <ChaosEyes y={98} />
      <ellipse cx={70} cy={84} rx={8} ry={14} fill="#fff" opacity={0.45} />
    </g>
  ),
  cotton: () => (
    <g>
      <path d="M100 172 L100 128" stroke="#e8d6b0" strokeWidth={14} strokeLinecap="round" />
      <path d="M44 110 Q24 80 54 66 Q56 34 92 40 Q112 18 138 40 Q176 40 168 76 Q190 100 160 122 Q140 142 100 130 Q62 144 44 110Z" fill="#ff9ad5" {...S} />
      <ChaosEyes y={88} />
    </g>
  ),
  choco: () => (
    <g>
      <rect x={38} y={40} width={124} height={136} rx={16} fill="#8a5a3c" {...S} />
      <path d="M38 86 L162 86 M38 132 L162 132 M100 40 L100 176" stroke="#5e3a22" strokeWidth={6} />
      <ChaosEyes y={64} gap={30} />
      <path d="M70 108 Q100 96 130 108" fill="none" {...T} />
    </g>
  ),
  mint: () => (
    <g>
      <ellipse cx={100} cy={150} rx={70} ry={22} fill="#7fd36a" {...S} />
      <circle cx={100} cy={104} r={62} fill="#fff" {...S} />
      {[0, 60, 120, 180, 240, 300].map((a) => (
        <path key={a} transform={`rotate(${a} 100 104)`} d="M100 104 L100 44 Q124 48 134 66Z" fill="#ff4d6a" />
      ))}
      <circle cx={100} cy={104} r={62} fill="none" {...S} />
      <ChaosEyes y={104} gap={20} />
    </g>
  ),
  licorice: () => (
    <g>
      <path d="M70 30 Q130 50 80 80 Q30 110 100 130 Q170 150 110 178" fill="none" stroke="#33263f" strokeWidth={34} strokeLinecap="round" />
      <path d="M70 30 Q130 50 80 80 Q30 110 100 130 Q170 150 110 178" fill="none" stroke={N} strokeWidth={6} strokeDasharray="4 22" strokeLinecap="round" />
      <path d="M128 40 L152 40 M140 28 L140 52" stroke="#ff5a5a" strokeWidth={10} strokeLinecap="round" />
      <ChaosEyes y={80} gap={14} />
    </g>
  ),
  pinata: () => (
    <g>
      <path d="M100 20 L122 72 L178 76 L134 112 L150 168 L100 138 L50 168 L66 112 L22 76 L78 72Z" fill="#3fc6ff" {...S} />
      <path d="M58 90 L142 90 M66 122 L134 122" stroke="#ff4fa3" strokeWidth={10} />
      <path d="M100 20 L122 72 L178 76 L134 112 L150 168 L100 138 L50 168 L66 112 L22 76 L78 72Z" fill="none" {...S} />
      <ChaosEyes y={104} gap={16} />
    </g>
  ),
  sprinkles: () => (
    <g>
      {[
        [60, 60, 20], [110, 46, -30], [150, 84, 60], [84, 104, -10], [130, 130, 30], [56, 140, 80], [100, 166, -50], [160, 150, 10], [36, 100, 45],
      ].map(([x, y, r], i) => (
        <rect key={i} x={x - 18} y={y - 7} width={36} height={14} rx={7} transform={`rotate(${r} ${x} ${y})`} fill={["#8b3dff", "#ff4fa3", "#c24dff", "#ffd93b"][i % 4]} {...T} />
      ))}
    </g>
  ),
  shard: () => (
    <g>
      <path d="M100 18 L150 70 L134 176 L66 176 L50 70Z" fill="#b6ff3b" {...S} />
      <path d="M100 18 L100 176 M50 70 L134 176 M150 70 L66 176" stroke={N} strokeWidth={4} opacity={0.5} />
      <ChaosEyes y={96} gap={18} />
    </g>
  ),
  taffy: () => (
    <g>
      <path d="M30 100 Q60 60 100 100 Q140 140 170 100" fill="none" stroke="#c24dff" strokeWidth={46} strokeLinecap="round" />
      <path d="M30 100 Q60 60 100 100 Q140 140 170 100" fill="none" stroke={N} strokeWidth={6} strokeDasharray="2 30" strokeLinecap="round" />
      <path d="M22 88 L8 70 M22 112 L8 130 M178 88 L192 70 M178 112 L192 130" stroke="#c24dff" strokeWidth={10} strokeLinecap="round" />
      <ChaosEyes y={100} gap={16} />
    </g>
  ),
  warlord: () => (
    <g>
      <path d="M40 186 Q30 120 100 120 Q170 120 160 186Z" fill="#e8344a" {...S} />
      <circle cx={60} cy={60} r={20} fill="#ff5a5a" {...S} />
      <circle cx={140} cy={60} r={20} fill="#ff5a5a" {...S} />
      <ellipse cx={100} cy={104} rx={58} ry={56} fill="#ff5a5a" {...S} />
      <path d="M66 54 L78 22 L100 44 L122 22 L134 54Z" fill="#ffd93b" {...S} />
      <ChaosEyes y={98} />
      <path d="M82 128 L94 120 L106 128 L118 120" fill="none" {...T} />
    </g>
  ),
  witch: () => (
    <g>
      <ellipse cx={100} cy={128} rx={46} ry={50} fill="#9b7bb3" {...S} />
      <path d="M30 92 L170 92 L150 104 L50 104Z" fill="#33263f" {...S} />
      <path d="M62 92 L100 10 L120 50 L140 92Z" fill="#33263f" {...S} />
      <path d="M68 84 L136 84" stroke={"#8b3dff"} strokeWidth={10} />
      <ChaosEyes y={128} gap={18} />
      <path d="M150 140 Q180 150 176 182 M50 140 Q20 150 24 182" fill="none" stroke="#33263f" strokeWidth={12} strokeLinecap="round" />
    </g>
  ),
  plum: () => (
    <g>
      <path d="M100 52 Q160 40 166 110 Q168 176 100 180 Q32 176 34 110 Q40 40 100 52Z" fill="#9b3dcc" {...S} />
      <path d="M100 52 Q96 80 100 110" fill="none" {...T} />
      <path d="M64 50 L72 18 L90 38 L100 12 L110 38 L128 18 L136 50Z" fill="#ffd93b" {...S} />
      <ChaosEyes y={116} gap={24} />
      <path d="M60 150 L80 140 M140 150 L120 140" stroke="#d9a6ff" strokeWidth={6} strokeLinecap="round" />
    </g>
  ),
  hydra: () => (
    <g>
      <ellipse cx={100} cy={160} rx={70} ry={30} fill="#9de02a" {...S} />
      {[
        [48, 74, -16],
        [100, 52, 0],
        [152, 74, 16],
      ].map(([x, y, r], i) => (
        <g key={i} transform={`rotate(${r} ${x} ${y + 60})`}>
          <path d={`M${x - 12} ${y + 90} L${x - 10} ${y + 20} L${x + 10} ${y + 20} L${x + 12} ${y + 90}Z`} fill="#b6ff3b" {...T} />
          <circle cx={x} cy={y} r={26} fill="#b6ff3b" {...S} />
          <circle cx={x - 9} cy={y - 4} r={5} fill="#d9a6ff" stroke={N} strokeWidth={3} />
          <circle cx={x + 9} cy={y - 4} r={5} fill="#d9a6ff" stroke={N} strokeWidth={3} />
        </g>
      ))}
    </g>
  ),
  jawbreaker: () => (
    <g>
      <circle cx={100} cy={100} r={82} fill="#ff4fa3" {...S} />
      <circle cx={100} cy={100} r={64} fill="#3fc6ff" {...T} />
      <circle cx={100} cy={100} r={46} fill="#ffd93b" {...T} />
      <circle cx={100} cy={100} r={28} fill="#8b3dff" {...T} />
      <path d="M100 18 L92 54 L110 70 L96 100 M170 70 L140 86 L132 112 M40 140 L70 124 L76 100" fill="none" stroke="#e9d2ff" strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" />
      <path d="M100 18 L92 54 L110 70 L96 100 M170 70 L140 86 L132 112 M40 140 L70 124 L76 100" fill="none" stroke={N} strokeWidth={2} />
    </g>
  ),
  villager: () => (
    <g>
      <path d="M46 186 Q44 120 100 118 Q156 120 154 186Z" fill="#c9a26b" {...S} />
      <path d="M80 122 L100 150 L120 122" fill="none" {...T} />
      <Head />
      <path d="M64 70 Q100 30 136 70" fill="#7a4a2a" {...T} />
      <Tentacle x={150} y={182} h={60} d={1} />
    </g>
  ),
  courier: () => (
    <g>
      <path d="M50 186 Q48 124 100 122 Q152 124 150 186Z" fill="#4f8dff" {...S} />
      <path d="M62 126 L148 176" stroke="#7a4a2a" strokeWidth={10} strokeLinecap="round" />
      <rect x={120} y={146} width={50} height={38} rx={8} fill="#c9a26b" {...S} />
      <Head y={84} />
      <path d="M62 70 Q100 38 138 70 L146 76 L60 76Z" fill="#e8344a" {...T} />
      <path d="M28 110 L50 110 M22 132 L46 132" stroke="#9fb2ff" strokeWidth={8} strokeLinecap="round" />
    </g>
  ),
  farmer: () => (
    <g>
      <path d="M150 30 L150 186" stroke="#7a4a2a" strokeWidth={10} strokeLinecap="round" />
      <path d="M136 30 L136 56 Q150 66 164 56 L164 30 M150 30 L150 60" fill="none" stroke="#dfe6ff" strokeWidth={6} strokeLinecap="round" />
      <path d="M44 186 Q42 122 96 120 Q146 122 144 186Z" fill="#3fa0c6" {...S} />
      <Head y={86} />
      <path d="M40 72 L152 72 L130 60 Q100 30 70 60Z" fill="#ffd93b" {...S} />
      <path d="M50 150 L60 140 L70 150 L60 146Z" fill={N} />
      <path d="M70 168 L80 158 L90 168 L80 164Z" fill={N} />
    </g>
  ),
  fisherman: () => (
    <g>
      <path d="M40 186 Q38 118 100 116 Q162 118 160 186Z" fill="#ffb02e" {...S} />
      <path d="M100 116 L100 186" stroke={N} strokeWidth={5} />
      <circle cx={70} cy={160} r={7} fill="#e8ecff" {...T} />
      <circle cx={134} cy={146} r={6} fill="#e8ecff" {...T} />
      <Head y={80} />
      <path d="M54 70 Q100 24 146 70 L162 84 L40 84Z" fill="#ffb02e" {...S} />
      <path d="M20 120 L60 150 M20 150 L60 120 M28 108 L28 170" stroke="#b8c0e0" strokeWidth={4} />
    </g>
  ),
  lumberjack: () => (
    <g>
      <path d="M28 190 Q24 112 100 108 Q176 112 172 190Z" fill="#e8344a" {...S} />
      <path d="M60 112 L60 190 M100 108 L100 190 M140 112 L140 190 M28 150 L172 150" stroke={N} strokeWidth={4} opacity={0.5} />
      <circle cx={100} cy={74} r={38} fill="#f2c6a0" {...S} />
      <path d="M64 82 Q100 150 136 82 Q120 96 100 96 Q80 96 64 82Z" fill="#7a4a2a" {...T} />
      <ChaosEyes y={66} gap={15} />
      <Tentacle x={88} y={118} h={30} d={-1} w={8} />
      <Tentacle x={114} y={118} h={30} d={1} w={8} />
      <path d="M170 20 L176 120" stroke="#7a4a2a" strokeWidth={10} strokeLinecap="round" />
      <path d="M174 26 Q206 30 202 62 Q186 54 176 58Z" fill="#dfe6ff" {...T} />
    </g>
  ),
  herbalist: () => (
    <g>
      <path d="M48 186 Q46 120 100 118 Q154 120 152 186Z" fill="#5fd46a" {...S} />
      <Head y={84} />
      <path d="M60 80 Q60 34 100 34 Q140 34 140 80 Q130 56 100 56 Q70 56 60 80Z" fill="#2f7a3a" {...T} />
      <path d="M118 150 L176 150 L168 186 L126 186Z" fill="#c9a26b" {...S} />
      <path d="M130 150 Q128 124 140 116 M150 150 Q154 120 166 114 M140 150 Q140 132 152 124" fill="none" stroke="#c24dff" strokeWidth={7} strokeLinecap="round" />
      <circle cx={140} cy={116} r={7} fill="#e9d2ff" stroke={N} strokeWidth={3} />
      <circle cx={166} cy={114} r={7} fill="#e9d2ff" stroke={N} strokeWidth={3} />
    </g>
  ),
  merchant: () => (
    <g>
      <rect x={110} y={96} width={70} height={84} rx={14} fill="#a86a3a" {...S} />
      <path d="M44 186 Q42 122 96 120 Q146 122 144 186Z" fill="#9b3dcc" {...S} />
      <Head y={84} />
      <path d="M58 64 Q100 34 142 64 L142 72 L58 72Z" fill="#33263f" {...T} />
      {[
        [126, 92],
        [150, 84],
        [168, 98],
      ].map(([x, y], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r={13} fill="#ffd93b" {...T} />
          <text x={x} y={y + 6} textAnchor="middle" fontSize={16} fontWeight={900} fill={N}>$</text>
        </g>
      ))}
    </g>
  ),
  chaos_eye: () => (
    <g>
      <Tentacle x={100} y={186} h={70} d={-1} w={16} />
      <circle cx={100} cy={90} r={66} fill="#f4e6ff" {...S} />
      <circle cx={100} cy={90} r={38} fill="#8b3dff" {...T} />
      <ellipse cx={100} cy={90} rx={10} ry={26} fill={N} />
      <path d="M44 70 L62 76 M52 120 L68 112 M156 70 L138 76 M150 122 L134 112" stroke="#e8344a" strokeWidth={4} strokeLinecap="round" />
      <circle cx={82} cy={70} r={9} fill="#fff" opacity={0.8} />
    </g>
  ),
  fae: () => (
    <g>
      <path d="M96 100 Q30 30 22 80 Q16 120 70 116 L60 132 Q20 150 40 172 Q66 176 92 120Z" fill="#e9d2ff" {...S} />
      <path d="M104 100 Q170 30 178 80 Q184 120 130 116 L140 132 Q180 150 160 172 Q134 176 108 120Z" fill="#e9d2ff" {...S} />
      <path d="M40 60 L60 92 M164 66 L146 92 M50 156 L70 140" stroke="#8b3dff" strokeWidth={6} strokeLinecap="round" />
      <path d="M78 186 Q80 120 100 118 Q120 120 122 186Z" fill="#ff9ad5" {...S} />
      <circle cx={100} cy={86} r={30} fill="#d8f0c8" {...S} />
      <ChaosEyes y={88} gap={12} />
      <path d="M74 66 Q86 46 100 60 Q114 46 126 66" fill="#c24dff" {...T} />
    </g>
  ),
  bear: () => (
    <g>
      <circle cx={52} cy={48} r={24} fill="#8a5a3c" {...S} />
      <circle cx={148} cy={48} r={24} fill="#8a5a3c" {...S} />
      <ellipse cx={100} cy={104} rx={74} ry={70} fill="#8a5a3c" {...S} />
      <ellipse cx={100} cy={128} rx={36} ry={28} fill="#c9a26b" {...T} />
      <ChaosEyes y={88} gap={26} />
      <path d="M78 136 L88 128 L100 140 L112 128 L122 136" fill="none" {...T} />
      <Eye x={60} y={54} r={8} />
      <Eye x={140} y={54} r={8} />
      <Tentacle x={84} y={154} h={40} d={-1} w={9} />
      <Tentacle x={116} y={154} h={40} d={1} w={9} />
    </g>
  ),
  portal_wizard: () => (
    <g>
      <ellipse cx={100} cy={112} rx={86} ry={86} fill="none" stroke="#8b3dff" strokeWidth={14} />
      <ellipse cx={100} cy={112} rx={86} ry={86} fill="none" stroke="#3fc6ff" strokeWidth={5} strokeDasharray="18 14" />
      <path d="M52 190 Q56 120 100 116 Q144 120 148 190Z" fill="#3a0f73" {...S} />
      <path d="M100 116 L100 190" stroke="#c24dff" strokeWidth={6} />
      <circle cx={100} cy={96} r={28} fill="#d9c2ff" {...S} />
      <path d="M86 112 Q100 160 114 112Z" fill="#e8ecff" {...T} />
      <ChaosEyes y={94} gap={11} />
      <path d="M58 76 L142 76 L126 66 L104 6 L86 40 L74 66Z" fill="#3a0f73" {...S} />
      <circle cx={104} cy={12} r={8} fill="#3fc6ff" {...T} />
      <path d="M160 70 L160 170" stroke="#7a4a2a" strokeWidth={8} strokeLinecap="round" />
      <circle cx={160} cy={62} r={14} fill="#3fc6ff" {...T} />
    </g>
  ),
  upside_village: () => (
    <g>
      <rect x={6} y={6} width={188} height={188} rx={22} fill="#2a1450" />
      {/* houses hanging from the sky, roofs pointing down */}
      {[
        [40, 0],
        [100, 18],
        [156, 4],
      ].map(([x, dy], i) => (
        <g key={i}>
          <rect x={x - 22} y={14 + dy} width={44} height={34} fill="#e8d6b0" {...T} />
          <path d={`M${x - 28} ${48 + dy} L${x + 28} ${48 + dy} L${x} ${76 + dy}Z`} fill="#e8344a" {...T} />
          <rect x={x - 7} y={18 + dy} width={14} height={16} fill="#7a4a2a" stroke={N} strokeWidth={3} />
        </g>
      ))}
      {/* trees */}
      <path d="M22 150 L22 104 M178 150 L178 110" stroke="#7a4a2a" strokeWidth={8} strokeLinecap="round" />
      <circle cx={22} cy={100} r={16} fill="#2f7a3a" {...T} />
      <circle cx={178} cy={106} r={14} fill="#2f7a3a" {...T} />
      {/* chaos ground with tentacles and eyes */}
      <path d="M6 168 Q50 150 100 162 Q150 174 194 156 L194 180 Q194 194 180 194 L20 194 Q6 194 6 180Z" fill="#3a0f73" {...T} />
      <Tentacle x={52} y={170} h={64} d={1} />
      <Tentacle x={136} y={172} h={74} d={-1} w={14} />
      <Tentacle x={164} y={170} h={40} d={1} w={9} />
      <Eye x={92} y={128} r={14} />
      <Eye x={48} y={128} r={7} />
      <Eye x={150} y={116} r={8} />
    </g>
  ),
};

export function StoryGlyph({ glyph, size }: { glyph: Glyph; size: number }) {
  const Draw = G[glyph];
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" style={{ overflow: "visible" }}>
      <Draw />
    </svg>
  );
}
