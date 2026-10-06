import React from "react";
import { AbsoluteFill, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { loadFont as loadLilita } from "@remotion/google-fonts/LilitaOne";
import { loadFont as loadNunito } from "@remotion/google-fonts/Nunito";

/**
 * Promo graphics for v1.3 "Branding Revamp": Tower Rush becomes Crown & Keep.
 * See docs/features/v1.3-branding-revamp/PROMO.md. scripts/promo-rb.mjs copies the art into public/rb.
 */

const { fontFamily: DISPLAY } = loadLilita();
const { fontFamily: BODY } = loadNunito("normal", { weights: ["800"], subsets: ["latin"] });

const NAVY = "#14183a";
const GOLD = "#ffd93b";
const SKY = "#c9d2ff";
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

const chunky = (size: number, color = "#fff"): React.CSSProperties => ({
  fontFamily: DISPLAY,
  fontSize: size,
  color,
  WebkitTextStroke: `${Math.round(size / 8)}px ${NAVY}`,
  paintOrder: "stroke fill",
  textShadow: `0 ${Math.round(size / 11)}px 0 ${NAVY}`,
  lineHeight: 1.02,
  textAlign: "center",
});

const body = (size: number, color = "#e8ecff"): React.CSSProperties => ({ fontFamily: BODY, fontWeight: 800, fontSize: size, color, lineHeight: 1.25, textAlign: "center" });

function usePop(at: number, damping = 11) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - at, fps, config: { damping, mass: 0.7 } });
}

/** The battle key art, blurred and dimmed, with a gold glow behind the centre. */
function Backdrop({ dim = 0.5 }: { dim?: number }) {
  return (
    <AbsoluteFill style={{ background: NAVY }}>
      <Img src={staticFile("rb/keyart.webp")} style={{ width: "100%", height: "100%", objectFit: "cover", filter: "blur(4px)", transform: "scale(1.06)" }} />
      <AbsoluteFill style={{ background: `radial-gradient(ellipse at center, #ffd93b33 0%, ${NAVY}${Math.round(dim * 255).toString(16).padStart(2, "0")} 55%, ${NAVY}f0 100%)` }} />
    </AbsoluteFill>
  );
}

const Logo = ({ w, style }: { w: number; style?: React.CSSProperties }) => (
  <Img src={staticFile("rb/logo.png")} style={{ width: w, filter: `drop-shadow(0 ${w * 0.02}px ${w * 0.03}px #000a)`, ...style }} />
);

/** The old logo, greyed out and struck through. */
function OldLogo({ w }: { w: number }) {
  return (
    <div style={{ position: "relative", width: w }}>
      <Img src={staticFile("rb/logo_old.webp")} style={{ width: w, filter: "grayscale(1) brightness(0.8)", opacity: 0.75 }} />
      <div style={{ position: "absolute", left: "-4%", right: "-4%", top: "48%", height: w * 0.04, background: "#ff5a5a", border: `${w * 0.012}px solid ${NAVY}`, borderRadius: w, transform: "rotate(-12deg)" }} />
    </div>
  );
}

function Ribbon({ text, size }: { text: string; size: number }) {
  return (
    <div style={{ padding: `${size * 0.2}px ${size * 0.8}px`, background: "linear-gradient(#3b6dff, #1f3fbf)", border: `${size * 0.12}px solid ${NAVY}`, borderRadius: size * 0.3, boxShadow: `0 ${size * 0.16}px 0 ${NAVY}` }}>
      <div style={chunky(size)}>{text}</div>
    </div>
  );
}

const Kicker = ({ size }: { size: number }) => <div style={chunky(size, SKY)}>TOWER RUSH IS NOW</div>;
const Footer = ({ size = 26 }: { size?: number }) => <div style={body(size, "#9fb0e8")}>v1.3 Branding Revamp · #CrownAndKeep</div>;
const SameGame = ({ size }: { size: number }) => (
  <div style={body(size)}>Same game, same heroes, same progress. A new name to rule them all.</div>
);

// ---------------------------------------------------------------- stills

export const RbKeyArt = () => (
  <AbsoluteFill>
    <Backdrop />
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 26 }}>
      <Kicker size={64} />
      <Logo w={900} />
      <SameGame size={34} />
      <Footer />
    </AbsoluteFill>
  </AbsoluteFill>
);

export const RbSquare = () => (
  <AbsoluteFill>
    <Backdrop />
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 30, padding: 60 }}>
      <OldLogo w={300} />
      <Kicker size={60} />
      <Logo w={760} />
      <Ribbon text="v1.3 · OUT NOW" size={40} />
    </AbsoluteFill>
  </AbsoluteFill>
);

export const RbStory = () => (
  <AbsoluteFill>
    <Backdrop />
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 50, padding: 70 }}>
      <OldLogo w={420} />
      <Kicker size={74} />
      <Logo w={900} />
      <SameGame size={42} />
      <Ribbon text="PLAY NOW" size={60} />
      <Footer size={30} />
    </AbsoluteFill>
  </AbsoluteFill>
);

/** X (Twitter) / Facebook header banner, 1500×500. */
export const RbBanner = () => (
  <AbsoluteFill>
    <Backdrop dim={0.4} />
    <AbsoluteFill style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 70 }}>
      <Img src={staticFile("rb/icon.png")} style={{ width: 300, filter: "drop-shadow(0 10px 0 #14183a)" }} />
      <Logo w={560} />
    </AbsoluteFill>
  </AbsoluteFill>
);

/** Square app/store icon on its own, 1024×1024 (handy for profile pictures). */
export const RbIcon = () => (
  <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
    <Img src={staticFile("rb/icon.png")} style={{ width: 1024 }} />
  </AbsoluteFill>
);

// ---------------------------------------------------------------- reveal video (vertical, 9 s)

export const REVEAL_LEN = 270;

/** The old logo shakes and cracks, a flash, then the new logo slams in. */
export const RbReveal = () => {
  const frame = useCurrentFrame();
  const oldIn = usePop(4, 12);
  const shake = frame > 40 && frame < 90 ? Math.sin(frame * 2.3) * interpolate(frame, [40, 90], [2, 22], clamp) : 0;
  const oldOut = interpolate(frame, [88, 100], [1, 0], clamp);
  const flash = interpolate(frame, [96, 100, 118], [0, 1, 0], clamp);
  const kicker = usePop(104, 12);
  const logo = usePop(112, 8);
  const tag = interpolate(frame, [160, 180], [0, 1], clamp);
  const cta = usePop(200, 10);
  return (
    <AbsoluteFill>
      <Backdrop dim={interpolate(frame, [0, 100], [0.8, 0.5], clamp)} />
      {frame < 100 && (
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity: oldOut }}>
          <div style={{ transform: `scale(${oldIn}) translateX(${shake}px) rotate(${shake * 0.15}deg)`, filter: `grayscale(${interpolate(frame, [30, 90], [0, 1], clamp)})` }}>
            <Img src={staticFile("rb/logo_old.webp")} style={{ width: 760 }} />
          </div>
          <div style={{ ...body(44, SKY), marginTop: 40, opacity: interpolate(frame, [20, 34], [0, 1], clamp) }}>You knew us as...</div>
        </AbsoluteFill>
      )}
      {frame >= 100 && (
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 50, padding: 70 }}>
          <div style={{ transform: `scale(${kicker})` }}>
            <Kicker size={74} />
          </div>
          <div style={{ transform: `scale(${logo}) rotate(${(1 - logo) * -8}deg)` }}>
            <Logo w={920} />
          </div>
          <div style={{ opacity: tag }}>
            <SameGame size={42} />
          </div>
          <div style={{ transform: `scale(${cta})` }}>
            <Ribbon text="PLAY NOW · v1.3" size={60} />
          </div>
        </AbsoluteFill>
      )}
      <AbsoluteFill style={{ background: "#fff8d8", opacity: flash }} />
    </AbsoluteFill>
  );
};
