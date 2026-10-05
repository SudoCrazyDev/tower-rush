import React from "react";
import type { CastId } from "./cast";

/**
 * Stand-in art for the v1.1 support units until their real portraits exist: a chunky emblem
 * per unit, drawn in the game's navy-outline cartoon style on a 200×200 canvas.
 */

const N = "#14183a";
const S = { stroke: N, strokeWidth: 7, strokeLinejoin: "round" as const, strokeLinecap: "round" as const };
const thin = { ...S, strokeWidth: 5 };

function Eye({ x, y, r = 11, look = 0 }: { x: number; y: number; r?: number; look?: number }) {
  return (
    <g>
      <circle cx={x} cy={y} r={r} fill="#fff" {...thin} />
      <circle cx={x + look} cy={y + 1} r={r * 0.5} fill={N} />
      <circle cx={x + look - r * 0.2} cy={y - r * 0.25} r={r * 0.18} fill="#fff" />
    </g>
  );
}

function Sparkle({ x, y, s = 1, fill = "#fff" }: { x: number; y: number; s?: number; fill?: string }) {
  return <path transform={`translate(${x} ${y}) scale(${s})`} d="M0 -14 Q2 -2 14 0 Q2 2 0 14 Q-2 2 -14 0 Q-2 -2 0 -14Z" fill={fill} />;
}

const Mime = () => (
  <g>
    {/* striped collar */}
    <path d="M52 176 Q100 150 148 176 L148 196 L52 196Z" fill="#fff" {...S} />
    <path d="M66 168 L66 196 M90 160 L90 196 M114 160 L114 196 M136 166 L136 196" stroke={N} strokeWidth={9} />
    {/* face */}
    <ellipse cx={100} cy={112} rx={56} ry={62} fill="#fbfbff" {...S} />
    {/* beret */}
    <path d="M38 78 Q60 34 110 34 Q160 38 164 66 Q140 82 96 78 Q60 76 38 78Z" fill="#27273d" {...S} />
    <circle cx={112} cy={30} r={7} fill="#27273d" {...thin} />
    {/* brows, eyes, tear, star */}
    <path d="M64 88 Q76 78 90 86 M110 86 Q124 78 136 88" fill="none" {...thin} />
    <path d="M66 104 Q77 94 88 104 Q77 112 66 104Z" fill={N} />
    <path d="M112 104 Q123 94 134 104 Q123 112 112 104Z" fill={N} />
    <path d="M124 118 Q129 128 124 134 Q119 128 124 118Z" fill="#5fd4ff" stroke={N} strokeWidth={3} />
    <Sparkle x={76} y={124} s={0.55} fill="#ff7ad9" />
    {/* lips */}
    <path d="M78 146 Q100 164 122 146 Q100 154 78 146Z" fill="#e8344a" {...thin} />
  </g>
);

const PortalImp = () => (
  <g>
    <circle cx={100} cy={100} r={80} fill="#2a1250" {...S} />
    <circle cx={100} cy={100} r={66} fill="none" stroke="#ff8a2b" strokeWidth={14} />
    <circle cx={100} cy={100} r={66} fill="none" stroke="#ffd36b" strokeWidth={4} strokeDasharray="22 16" />
    <circle cx={100} cy={100} r={48} fill="none" stroke="#b05cff" strokeWidth={6} strokeDasharray="34 20" />
    {/* imp */}
    <path d="M70 92 Q58 58 80 54 Q78 76 90 86Z" fill="#f2e6c8" {...thin} />
    <path d="M130 92 Q142 58 120 54 Q122 76 110 86Z" fill="#f2e6c8" {...thin} />
    <ellipse cx={100} cy={116} rx={40} ry={34} fill="#e2402b" {...S} />
    <path d="M78 104 Q86 98 94 106 Q86 114 78 104Z" fill="#ffd93b" stroke={N} strokeWidth={3} />
    <path d="M122 104 Q114 98 106 106 Q114 114 122 104Z" fill="#ffd93b" stroke={N} strokeWidth={3} />
    <circle cx={87} cy={106} r={3} fill={N} />
    <circle cx={113} cy={106} r={3} fill={N} />
    <path d="M80 124 Q100 144 120 124 Q100 132 80 124Z" fill="#fff" {...thin} />
    <path d="M90 128 L92 134 M100 130 L100 137 M110 128 L108 134" stroke={N} strokeWidth={2.5} />
    <Sparkle x={160} y={42} s={0.8} fill="#ffd36b" />
    <Sparkle x={40} y={160} s={0.6} fill="#ff8a2b" />
  </g>
);

const MirrorSlime = () => (
  <g>
    <circle cx={74} cy={44} r={9} fill="#d9b6ff" {...thin} />
    <circle cx={100} cy={34} r={11} fill="#d9b6ff" {...thin} />
    <circle cx={126} cy={44} r={9} fill="#d9b6ff" {...thin} />
    <path d="M30 168 Q24 104 62 74 Q100 50 138 74 Q176 104 170 168 Q100 184 30 168Z" fill="#b05cff" {...S} />
    {/* mirror shine */}
    <path d="M54 104 Q62 82 84 74 Q72 92 66 120Z" fill="#fff" opacity={0.85} />
    <path d="M140 132 Q146 146 138 158" fill="none" stroke="#fff" strokeWidth={6} strokeLinecap="round" opacity={0.7} />
    <Eye x={80} y={124} r={14} look={3} />
    <Eye x={122} y={124} r={14} look={3} />
    <path d="M90 150 Q101 158 112 150" fill="none" {...thin} />
    <Sparkle x={164} y={66} s={0.9} />
    <Sparkle x={34} y={74} s={0.5} />
  </g>
);

const LuckyCat = () => (
  <g>
    {/* raised paw */}
    <rect x={136} y={40} width={34} height={58} rx={17} fill="#fff" {...S} />
    <path d="M144 48 L144 56 M153 46 L153 55 M162 48 L162 56" stroke="#f08aa0" strokeWidth={4} strokeLinecap="round" />
    {/* head */}
    <path d="M44 86 L50 34 L84 62Z" fill="#fff" {...S} />
    <path d="M156 86 L150 34 L116 62Z" fill="#fff" {...S} />
    <path d="M56 70 L58 48 L74 62Z M144 70 L142 48 L126 62Z" fill="#f08aa0" />
    <ellipse cx={100} cy={106} rx={64} ry={54} fill="#fff" {...S} />
    <path d="M62 100 Q72 90 82 100 M118 100 Q128 90 138 100" fill="none" {...S} strokeWidth={6} />
    <path d="M94 116 L106 116 L100 123Z" fill="#f08aa0" stroke={N} strokeWidth={3} strokeLinejoin="round" />
    <path d="M100 123 Q92 132 86 126 M100 123 Q108 132 114 126" fill="none" stroke={N} strokeWidth={4} strokeLinecap="round" />
    <path d="M40 112 L66 116 M40 126 L66 122 M160 112 L134 116 M160 126 L134 122" stroke={N} strokeWidth={3} strokeLinecap="round" />
    {/* collar, bell */}
    <path d="M52 150 Q100 172 148 150" fill="none" stroke="#e8344a" strokeWidth={14} strokeLinecap="round" />
    <circle cx={100} cy={166} r={11} fill="#ffd93b" {...thin} />
    {/* coin */}
    <circle cx={46} cy={160} r={26} fill="#ffcc33" {...S} />
    <circle cx={46} cy={160} r={16} fill="none" stroke="#c98a12" strokeWidth={4} />
    <Sparkle x={46} y={160} s={0.55} fill="#fff6c2" />
  </g>
);

const HourglassOwl = () => (
  <g>
    {/* wings */}
    <path d="M44 88 Q16 124 40 168 Q58 150 62 120Z" fill="#b8742a" {...S} />
    <path d="M156 88 Q184 124 160 168 Q142 150 138 120Z" fill="#b8742a" {...S} />
    {/* body */}
    <path d="M58 60 L50 26 L80 46 Q100 40 120 46 L150 26 L142 60 Q168 110 140 170 Q100 186 60 170 Q32 110 58 60Z" fill="#d99a3c" {...S} />
    {/* eyes with gear rims */}
    <circle cx={78} cy={82} r={24} fill="#ffd93b" stroke={N} strokeWidth={6} strokeDasharray="7 4" />
    <circle cx={122} cy={82} r={24} fill="#ffd93b" stroke={N} strokeWidth={6} strokeDasharray="7 4" />
    <Eye x={78} y={82} r={14} />
    <Eye x={122} y={82} r={14} />
    <path d="M92 100 L108 100 L100 114Z" fill="#ff8a2b" {...thin} />
    {/* hourglass */}
    <rect x={78} y={122} width={44} height={8} rx={3} fill="#7a4a1a" {...thin} />
    <rect x={78} y={162} width={44} height={8} rx={3} fill="#7a4a1a" {...thin} />
    <path d="M84 130 L116 130 Q116 142 100 146 Q116 150 116 162 L84 162 Q84 150 100 146 Q84 142 84 130Z" fill="#bff0ff" {...thin} />
    <path d="M90 134 L110 134 Q106 141 100 143 Q94 141 90 134Z M88 160 Q100 150 112 160Z" fill="#ffcc33" />
    {/* lightning */}
    <path d="M170 34 L156 58 L168 58 L152 84" fill="none" stroke="#ffd93b" strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" />
  </g>
);

const EchoSpirit = () => (
  <g>
    {/* sound rings */}
    <path d="M150 70 Q166 100 150 130" fill="none" stroke="#5fd4ff" strokeWidth={7} strokeLinecap="round" />
    <path d="M166 58 Q190 100 166 142" fill="none" stroke="#5fd4ff" strokeWidth={6} strokeLinecap="round" opacity={0.6} />
    <path d="M44 166 Q36 74 100 44 Q150 64 146 140 Q144 160 132 172 Q120 160 110 176 Q98 160 86 176 Q74 160 62 174 Q54 160 44 166Z" fill="#cdf3ff" {...S} />
    <path d="M70 70 Q84 56 102 54" fill="none" stroke="#fff" strokeWidth={8} strokeLinecap="round" />
    <ellipse cx={80} cy={104} rx={9} ry={13} fill={N} />
    <ellipse cx={116} cy={104} rx={9} ry={13} fill={N} />
    <circle cx={77} cy={99} r={3} fill="#fff" />
    <circle cx={113} cy={99} r={3} fill="#fff" />
    <ellipse cx={98} cy={130} rx={8} ry={10} fill={N} />
    {/* bell */}
    <path d="M30 120 Q30 96 46 92 Q62 96 62 120 L66 128 L26 128Z" fill="#ffd93b" {...thin} />
    <circle cx={46} cy={134} r={6} fill="#ffd93b" {...thin} />
    <Sparkle x={34} y={64} s={0.6} fill="#bff0ff" />
  </g>
);

const BannerHerald = () => (
  <g>
    <rect x={40} y={30} width={14} height={164} rx={6} fill="#8a5a2b" {...S} />
    <circle cx={47} cy={26} r={12} fill="#ffcc33" {...S} />
    <path d="M54 44 L170 44 L150 82 L170 120 L54 120Z" fill="#e8344a" {...S} />
    <path d="M54 56 L150 56" stroke="#ffcc33" strokeWidth={6} />
    <path d="M54 108 L150 108" stroke="#ffcc33" strokeWidth={6} />
    <path d="M102 62 L109 77 L125 79 L113 89 L117 105 L102 97 L87 105 L91 89 L79 79 L95 77Z" fill="#ffd93b" {...thin} />
    {/* horn */}
    <path d="M70 172 Q110 168 150 136 L164 150 Q130 180 72 186Z" fill="#f2e6c8" {...thin} />
    <ellipse cx={157} cy={143} rx={9} ry={12} transform="rotate(40 157 143)" fill="#ffcc33" {...thin} />
    <Sparkle x={176} y={170} s={0.6} fill="#ffd93b" />
  </g>
);

const GnomeBrewer = () => (
  <g>
    {/* gnome hat peeking */}
    <path d="M120 92 L150 14 L176 92Z" fill="#3fa34d" {...S} />
    <path d="M118 92 Q148 102 178 92" fill="none" stroke="#fff" strokeWidth={10} strokeLinecap="round" />
    {/* ladle */}
    <path d="M56 40 L92 104" stroke="#8a5a2b" strokeWidth={10} strokeLinecap="round" />
    <path d="M56 40 L92 104" stroke={N} strokeWidth={3} strokeLinecap="round" opacity={0.4} />
    {/* bubbles */}
    <circle cx={86} cy={58} r={14} fill="#5fb8ff" {...thin} />
    <circle cx={82} cy={54} r={4} fill="#fff" />
    <circle cx={110} cy={38} r={9} fill="#5fb8ff" {...thin} />
    <circle cx={64} cy={78} r={8} fill="#5fb8ff" {...thin} />
    {/* cauldron */}
    <path d="M40 170 L32 192 M160 170 L168 192" stroke={N} strokeWidth={9} strokeLinecap="round" />
    <path d="M30 108 Q22 180 100 184 Q178 180 170 108Z" fill="#c8743a" {...S} />
    <ellipse cx={100} cy={106} rx={74} ry={18} fill="#5fb8ff" {...S} />
    <path d="M50 130 Q60 166 100 170" fill="none" stroke="#f0a060" strokeWidth={6} strokeLinecap="round" />
    <circle cx={76} cy={104} r={6} fill="#bfe6ff" />
    <circle cx={120} cy={102} r={4} fill="#bfe6ff" />
  </g>
);

const ART: Record<CastId, () => React.JSX.Element> = {
  mime: Mime,
  portal_imp: PortalImp,
  mirror_slime: MirrorSlime,
  lucky_cat: LuckyCat,
  hourglass_owl: HourglassOwl,
  echo_spirit: EchoSpirit,
  banner_herald: BannerHerald,
  gnome_brewer: GnomeBrewer,
};

export function Emblem({ id, size, silhouette = false }: { id: CastId; size: number; silhouette?: boolean }) {
  const Art = ART[id];
  return (
    <svg
      viewBox="0 0 200 200"
      width={size}
      height={size}
      style={silhouette ? { filter: "brightness(0) drop-shadow(0 0 18px rgba(140,180,255,0.75))", opacity: 0.92 } : undefined}
    >
      <Art />
    </svg>
  );
}
