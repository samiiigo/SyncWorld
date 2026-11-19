// ──────────────────────────────────────────────
// shaders.ts — GLSL for the sky gradient and the globe.
//
// The gradient is a port of ShaderGradient's "waterPlane" shader
// (github.com/ruucm/shadergradient, MIT): a finely divided plane pushed
// along its normal by classic Perlin noise, colored by mixing three stops
// across the bent surface. ShaderGradient relies on MeshPhysicalMaterial
// plus an HDR environment map for lighting; that doesn't load on React
// Native, so lighting here is computed in the shader from a noise-derived
// normal, which runs the same on iOS, Android and the web.
// ──────────────────────────────────────────────

/** Classic 3D Perlin noise (Stefan Gustavson, public domain), as used by ShaderGradient. */
const CNOISE = /* glsl */ `
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
vec3 fade(vec3 t) { return t * t * t * (t * (t * 6.0 - 15.0) + 10.0); }
float cnoise(vec3 P) {
  vec3 Pi0 = floor(P);
  vec3 Pi1 = Pi0 + vec3(1.0);
  Pi0 = mod289(Pi0);
  Pi1 = mod289(Pi1);
  vec3 Pf0 = fract(P);
  vec3 Pf1 = Pf0 - vec3(1.0);
  vec4 ix = vec4(Pi0.x, Pi1.x, Pi0.x, Pi1.x);
  vec4 iy = vec4(Pi0.yy, Pi1.yy);
  vec4 iz0 = Pi0.zzzz;
  vec4 iz1 = Pi1.zzzz;
  vec4 ixy = permute(permute(ix) + iy);
  vec4 ixy0 = permute(ixy + iz0);
  vec4 ixy1 = permute(ixy + iz1);
  vec4 gx0 = ixy0 * (1.0 / 7.0);
  vec4 gy0 = fract(floor(gx0) * (1.0 / 7.0)) - 0.5;
  gx0 = fract(gx0);
  vec4 gz0 = vec4(0.5) - abs(gx0) - abs(gy0);
  vec4 sz0 = step(gz0, vec4(0.0));
  gx0 -= sz0 * (step(0.0, gx0) - 0.5);
  gy0 -= sz0 * (step(0.0, gy0) - 0.5);
  vec4 gx1 = ixy1 * (1.0 / 7.0);
  vec4 gy1 = fract(floor(gx1) * (1.0 / 7.0)) - 0.5;
  gx1 = fract(gx1);
  vec4 gz1 = vec4(0.5) - abs(gx1) - abs(gy1);
  vec4 sz1 = step(gz1, vec4(0.0));
  gx1 -= sz1 * (step(0.0, gx1) - 0.5);
  gy1 -= sz1 * (step(0.0, gy1) - 0.5);
  vec3 g000 = vec3(gx0.x, gy0.x, gz0.x);
  vec3 g100 = vec3(gx0.y, gy0.y, gz0.y);
  vec3 g010 = vec3(gx0.z, gy0.z, gz0.z);
  vec3 g110 = vec3(gx0.w, gy0.w, gz0.w);
  vec3 g001 = vec3(gx1.x, gy1.x, gz1.x);
  vec3 g101 = vec3(gx1.y, gy1.y, gz1.y);
  vec3 g011 = vec3(gx1.z, gy1.z, gz1.z);
  vec3 g111 = vec3(gx1.w, gy1.w, gz1.w);
  vec4 norm0 = taylorInvSqrt(vec4(dot(g000, g000), dot(g010, g010), dot(g100, g100), dot(g110, g110)));
  g000 *= norm0.x; g010 *= norm0.y; g100 *= norm0.z; g110 *= norm0.w;
  vec4 norm1 = taylorInvSqrt(vec4(dot(g001, g001), dot(g011, g011), dot(g101, g101), dot(g111, g111)));
  g001 *= norm1.x; g011 *= norm1.y; g101 *= norm1.z; g111 *= norm1.w;
  float n000 = dot(g000, Pf0);
  float n100 = dot(g100, vec3(Pf1.x, Pf0.yz));
  float n010 = dot(g010, vec3(Pf0.x, Pf1.y, Pf0.z));
  float n110 = dot(g110, vec3(Pf1.xy, Pf0.z));
  float n001 = dot(g001, vec3(Pf0.xy, Pf1.z));
  float n101 = dot(g101, vec3(Pf1.x, Pf0.y, Pf1.z));
  float n011 = dot(g011, vec3(Pf0.x, Pf1.yz));
  float n111 = dot(g111, Pf1);
  vec3 fade_xyz = fade(Pf0);
  vec4 n_z = mix(vec4(n000, n100, n010, n110), vec4(n001, n101, n011, n111), fade_xyz.z);
  vec2 n_yz = mix(n_z.xy, n_z.zw, fade_xyz.y);
  float n_xyz = mix(n_yz.x, n_yz.y, fade_xyz.x);
  return 2.2 * n_xyz;
}
`;

export const gradientVertex = /* glsl */ `
uniform float uPhase;     // 0..1 through the loop, from the shared UTC clock
uniform float uLoopRadius;
uniform float uDensity;
uniform float uStrength;
varying vec3 vPos;
varying vec3 vN;
varying float vDisp;
${CNOISE}
// ShaderGradient's seamless loop: sample the noise at four points on a circle
// and blend by angle, so the motion repeats exactly every loop. Because the
// phase comes from UTC, every device in a room shows the same sky motion at
// the same moment.
float height(vec3 p) {
  vec3 q = 0.43 * p * uDensity;
  float a = uPhase * 6.28318530718;
  float r = uLoopRadius;
  float n0 = cnoise(q + vec3(cos(a) * r, sin(a) * r, 0.0));
  float n1 = cnoise(q + vec3(cos(a + 1.5707963) * r, sin(a + 1.5707963) * r, 0.0));
  float n2 = cnoise(q + vec3(cos(a + 3.1415926) * r, sin(a + 3.1415926) * r, 0.0));
  float n3 = cnoise(q + vec3(cos(a + 4.7123889) * r, sin(a + 4.7123889) * r, 0.0));
  float w0 = (cos(a) + 1.0) * 0.5;
  float w1 = (cos(a + 1.5707963) + 1.0) * 0.5;
  float w2 = (cos(a + 3.1415926) + 1.0) * 0.5;
  float w3 = (cos(a + 4.7123889) + 1.0) * 0.5;
  float n = (n0 * w0 + n1 * w1 + n2 * w2 + n3 * w3) / (w0 + w1 + w2 + w3);
  return 0.75 * n * 1.5;
}
void main() {
  float d = height(position);
  // Normal from the noise slope, so the folds catch light without an env map.
  float e = 0.06;
  float dx = height(position + vec3(e, 0.0, 0.0)) - d;
  float dy = height(position + vec3(0.0, e, 0.0)) - d;
  vec3 n = normalize(vec3(-dx * uStrength / e, -dy * uStrength / e, 1.0));
  vec3 pos = position + vec3(0.0, 0.0, d * uStrength);
  vPos = pos;
  vDisp = d;
  vN = normalize(normalMatrix * n);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
`;

export const gradientFragment = /* glsl */ `
uniform vec3 uC1;
uniform vec3 uC2;
uniform vec3 uC3;
uniform float uPhase;
uniform float uGrain;
uniform float uBrightness;
varying vec3 vPos;
varying vec3 vN;
varying float vDisp;
float rand(vec2 co) { return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453); }
void main() {
  // ShaderGradient's mix: stop 1 -> 2 across x, then the crests lift toward stop 3.
  vec3 base = mix(uC1, uC2, smoothstep(-3.0, 3.0, vPos.x));
  base = mix(base, uC3, smoothstep(-0.15, 0.9, vDisp));
  vec3 N = normalize(vN);
  vec3 L = normalize(vec3(-0.45, 0.6, 0.7));
  vec3 H = normalize(L + vec3(0.0, 0.0, 1.0));
  float diffuse = 0.78 + 0.32 * dot(N, L);
  float sheen = pow(max(dot(N, H), 0.0), 48.0) * 0.16;
  vec3 col = base * diffuse * uBrightness + sheen;
  // Film grain, as in ShaderGradient's "grain: on".
  col += (rand(gl_FragCoord.xy + fract(uPhase * 997.0)) - 0.5) * uGrain;
  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`;

// ── Globe ────────────────────────────────────

export const globeVertex = /* glsl */ `
varying vec3 vObj;
varying vec3 vN;
varying vec3 vView;
void main() {
  vObj = normalize(position);
  vN = normalize(normalMatrix * normal);
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vView = normalize(-mv.xyz);
  gl_Position = projectionMatrix * mv;
}
`;

export const globeFragment = /* glsl */ `
uniform vec3 uSun;
uniform vec3 uDay;
uniform vec3 uNight;
uniform vec3 uGrid;
uniform vec3 uGlow;
varying vec3 vObj;
varying vec3 vN;
varying vec3 vView;
const float PI = 3.14159265;
// 1 on the line (where v is a whole number), fading to 0 within width.
float gridLine(float v, float width) {
  float f = abs(fract(v) - 0.5);
  return smoothstep(0.5 - width, 0.5, f);
}
void main() {
  vec3 p = normalize(vObj);
  float lat = asin(clamp(p.y, -1.0, 1.0));
  float lon = atan(-p.z, p.x);
  // One meridian per hour of time zone (15 deg), parallels every 30 deg.
  float meridians = gridLine(lon / (PI / 12.0), 0.022);
  float parallels = gridLine(lat / (PI / 6.0), 0.016);
  float grid = max(meridians, parallels);

  float sunDot = dot(p, normalize(uSun));
  float day = smoothstep(-0.12, 0.22, sunDot);
  vec3 col = mix(uNight, uDay, day);
  col += uGrid * grid * mix(0.18, 0.42, day);
  // The terminator, where it's dawn or dusk right now, glows gold.
  col += uGlow * exp(-sunDot * sunDot * 70.0) * 0.55;
  // Rim light.
  float fres = pow(1.0 - max(dot(normalize(vN), normalize(vView)), 0.0), 2.5);
  col += uGlow * fres * 0.35;
  gl_FragColor = vec4(col, 1.0);
}
`;

export const atmosphereFragment = /* glsl */ `
uniform vec3 uGlow;
varying vec3 vN;
varying vec3 vView;
void main() {
  // Drawn on the back faces of a sphere 1.14x the globe: facing = 0 at the
  // halo's outer edge and about 0.48 at the globe's limb, so the glow hugs
  // the limb and fades outward.
  float facing = -dot(normalize(vN), normalize(vView));
  float i = smoothstep(0.0, 0.48, facing);
  // Normal alpha blending, so the canvas stays transparent outside the glow.
  gl_FragColor = vec4(uGlow, i * i * 0.8);
}
`;

// ── Stars (night sky) ────────────────────────

export const starsVertex = /* glsl */ `
uniform float uTime;
uniform float uPixelRatio;
attribute float aSize;
attribute float aSeed;
varying float vTwinkle;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  vTwinkle = 0.55 + 0.45 * sin(uTime * (0.6 + aSeed * 1.4) + aSeed * 40.0);
  gl_PointSize = aSize * uPixelRatio * (0.8 + 0.4 * vTwinkle);
}
`;

export const starsFragment = /* glsl */ `
uniform float uOpacity;
varying float vTwinkle;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  float d = length(c);
  float core = smoothstep(0.5, 0.0, d);
  float a = core * core * vTwinkle * uOpacity;
  if (a < 0.01) discard;
  gl_FragColor = vec4(vec3(1.0, 0.96, 0.88), a);
}
`;

// ── Sun orb (alarm ringing) ──────────────────
// ShaderGradient's "sphere" type: a sphere pushed along its normal by noise,
// colored from the displacement. Here it pulses like a waking sun.

export const orbVertex = /* glsl */ `
uniform float uTime;
uniform float uStrength;
varying float vDisp;
varying vec3 vN;
varying vec3 vView;
${CNOISE}
void main() {
  // Low-frequency swell plus a fine shimmer: a sun's surface, not a lump.
  float d = cnoise(normal * 1.1 + uTime * 0.35) * 0.5 + cnoise(normal * 4.0 - uTime * 0.6) * 0.12;
  vec3 pos = position + normal * d * uStrength;
  vDisp = d;
  vN = normalize(normalMatrix * normal);
  vec4 mv = modelViewMatrix * vec4(pos, 1.0);
  vView = normalize(-mv.xyz);
  gl_Position = projectionMatrix * mv;
}
`;

export const orbFragment = /* glsl */ `
uniform vec3 uC1;
uniform vec3 uC2;
uniform vec3 uC3;
varying float vDisp;
varying vec3 vN;
varying vec3 vView;
void main() {
  vec3 col = mix(uC1, uC2, smoothstep(-0.45, 0.05, vDisp));
  col = mix(col, uC3, smoothstep(0.1, 0.5, vDisp));
  // Limb darkening (like the real sun) and a hot rim.
  float facing = max(dot(normalize(vN), normalize(vView)), 0.0);
  col *= 0.72 + 0.28 * facing;
  col += uC3 * pow(1.0 - facing, 3.0) * 0.5;
  gl_FragColor = vec4(col, 1.0);
}
`;
