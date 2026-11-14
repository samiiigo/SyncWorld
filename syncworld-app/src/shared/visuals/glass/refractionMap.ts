// ──────────────────────────────────────────────
// refractionMap.ts — displacement map for the web glass refraction.
//
// Port of the edge refraction in liquid-glass-js (github.com/dashersw/
// liquid-glass-js, MIT). That library samples a screenshot of the page in a
// WebGL shader and pushes each sample outward along the shape's normal:
//   intensity = edge * exp(-d * edgeDistance) + rim * exp(-d * rimDistance)
// where d is the distance (px) from the glass edge. Taking screenshots of a
// React Native tree isn't possible, so here the same field is baked into an
// image that an SVG feDisplacementMap applies to the live backdrop instead
// (backdrop-filter: url(#…)), which Chromium supports.
// ──────────────────────────────────────────────

export type RefractionParams = {
  /** Share of the max shift from the wide edge falloff. */
  edge: number;
  /** Share of the max shift from the tight rim falloff. */
  rim: number;
  /** Falloff per px for the edge term (liquid-glass-js edgeDistance). */
  edgeDistance: number;
  /** Falloff per px for the rim term (liquid-glass-js rimDistance). */
  rimDistance: number;
};

export const DEFAULT_REFRACTION: RefractionParams = {
  edge: 0.45,
  rim: 0.55,
  edgeDistance: 0.15,
  rimDistance: 0.8,
};

/** Largest map we bake; bigger surfaces get a scaled map (stretched back by feImage). */
const MAX_PIXELS = 60_000;

export type RefractionMap = { width: number; height: number; data: Uint8ClampedArray };

/**
 * RGBA pixels where R/G encode the x/y shift (128 = none) for a rounded
 * rectangle of `width` x `height` CSS px with corner `radius`.
 */
export function buildRefractionMap(
  width: number,
  height: number,
  radius: number,
  params: RefractionParams = DEFAULT_REFRACTION,
): RefractionMap {
  const scale = Math.min(1, Math.sqrt(MAX_PIXELS / Math.max(1, width * height)));
  const w = Math.max(1, Math.round(width * scale));
  const h = Math.max(1, Math.round(height * scale));
  const r = Math.min(radius * scale, w / 2, h / 2);
  const cx = w / 2;
  const cy = h / 2;
  const data = new Uint8ClampedArray(w * h * 4);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const px = x + 0.5;
      const py = y + 0.5;
      const sx = px < cx ? -1 : 1;
      const sy = py < cy ? -1 : 1;
      const qx = Math.abs(px - cx) - (cx - r);
      const qy = Math.abs(py - cy) - (cy - r);
      const outside = Math.hypot(Math.max(qx, 0), Math.max(qy, 0));
      const inside = Math.min(Math.max(qx, qy), 0);
      const signedDist = outside + inside - r; // < 0 inside the shape
      const d = Math.max(-signedDist, 0) / scale; // back to CSS px

      // Outward normal of the rounded rectangle.
      let nx: number;
      let ny: number;
      if (qx > 0 && qy > 0) {
        const len = Math.hypot(qx, qy) || 1;
        nx = (qx / len) * sx;
        ny = (qy / len) * sy;
      } else if (qx > qy) {
        nx = sx;
        ny = 0;
      } else {
        nx = 0;
        ny = sy;
      }

      const intensity = Math.min(
        1,
        params.edge * Math.exp(-d * params.edgeDistance) + params.rim * Math.exp(-d * params.rimDistance),
      );
      const i = (y * w + x) * 4;
      data[i] = Math.round(128 + nx * intensity * 127);
      data[i + 1] = Math.round(128 + ny * intensity * 127);
      data[i + 2] = 128;
      data[i + 3] = 255;
    }
  }
  return { width: w, height: h, data };
}
