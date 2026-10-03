import type { ArenaDef } from "../data/arenas";

export interface Pt {
  x: number;
  y: number;
}

/** A polyline with arc-length lookup. */
export class Path {
  readonly pts: Pt[];
  readonly cum: number[];
  readonly length: number;

  constructor(pts: Pt[]) {
    this.pts = pts;
    this.cum = [0];
    for (let i = 1; i < pts.length; i++) {
      this.cum.push(this.cum[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
    }
    this.length = this.cum[this.cum.length - 1];
  }

  /** Point at distance `d` along the path (clamped). */
  at(d: number): Pt {
    if (d <= 0) return { ...this.pts[0] };
    if (d >= this.length) return { ...this.pts[this.pts.length - 1] };
    let lo = 0;
    let hi = this.cum.length - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (this.cum[mid] <= d) lo = mid;
      else hi = mid;
    }
    const t = (d - this.cum[lo]) / (this.cum[hi] - this.cum[lo] || 1);
    const a = this.pts[lo];
    const b = this.pts[hi];
    return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
  }
}

/** Replace each interior corner with a quadratic curve of the given radius. */
function rounded(points: Pt[], radius: number, steps = 10): Pt[] {
  const out: Pt[] = [points[0]];
  for (let i = 1; i < points.length - 1; i++) {
    const p0 = points[i - 1];
    const p1 = points[i];
    const p2 = points[i + 1];
    const d1 = Math.hypot(p1.x - p0.x, p1.y - p0.y);
    const d2 = Math.hypot(p2.x - p1.x, p2.y - p1.y);
    const r = Math.min(radius, d1 / 2, d2 / 2);
    const a = { x: p1.x + ((p0.x - p1.x) / d1) * r, y: p1.y + ((p0.y - p1.y) / d1) * r };
    const b = { x: p1.x + ((p2.x - p1.x) / d2) * r, y: p1.y + ((p2.y - p1.y) / d2) * r };
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      const u = 1 - t;
      out.push({ x: u * u * a.x + 2 * u * t * p1.x + t * t * b.x, y: u * u * a.y + 2 * u * t * p1.y + t * t * b.y });
    }
  }
  out.push(points[points.length - 1]);
  return out;
}

/** The two routes (left and right half of the ring) from the top gate to the bottom gate. */
export function arenaPaths(a: ArenaDef): Path[] {
  const { left, right, top, bottom, radius } = a.ring;
  const side = (x: number) =>
    new Path(
      rounded(
        [
          { x: a.cx, y: a.entryY },
          { x: a.cx, y: top },
          { x, y: top },
          { x, y: bottom },
          { x: a.cx, y: bottom },
          { x: a.cx, y: a.exitY },
        ],
        radius,
      ),
    );
  return [side(left), side(right)];
}

export function slotPos(a: ArenaDef, slot: number): Pt {
  const col = slot % 5;
  const row = Math.floor(slot / 5);
  return { x: a.grid.x0 + col * a.grid.dx, y: a.grid.y0 + row * a.grid.dy };
}
