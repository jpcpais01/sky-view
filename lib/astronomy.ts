// Astronomy engine — coordinate transforms, Sun / Moon / planet positions
// based on Schlyter / Meeus simplified formulas. Accurate to ~0.5° which is
// plenty for a naked-eye planetarium app on a phone.

export const DEG = Math.PI / 180;
export const RAD = 180 / Math.PI;

const TWO_PI = Math.PI * 2;

export const wrap = (x: number, period: number) => {
  const r = x - Math.floor(x / period) * period;
  return r < 0 ? r + period : r;
};
const wrap360 = (d: number) => wrap(d, 360);
export const wrap2pi = (r: number) => wrap(r, TWO_PI);

// --- Time ----------------------------------------------------------------

/** Julian Date for a JS Date (UTC). */
export function julianDate(date: Date): number {
  return date.getTime() / 86400000 + 2440587.5;
}

/** Days since J2000.0 (2000-01-01 12:00 UT). */
export function daysSinceJ2000(date: Date): number {
  return julianDate(date) - 2451545.0;
}

/** Local apparent sidereal time, in radians, for a given longitude (deg, +E). */
export function localSiderealTime(date: Date, longitudeDeg: number): number {
  const d = daysSinceJ2000(date);
  // GMST in degrees (low-precision approximation, < 1' over a century).
  const gmstDeg = wrap360(280.46061837 + 360.98564736629 * d);
  const lstDeg = wrap360(gmstDeg + longitudeDeg);
  return lstDeg * DEG;
}

// --- Coordinate transforms ----------------------------------------------

export type Equatorial = { ra: number; dec: number }; // ra in radians, dec in radians
export type Horizontal = { alt: number; az: number }; // both in radians

/** Convert equatorial → horizontal. RA & Dec in radians. lat in radians.
 *  Returns altitude and azimuth measured clockwise from North (compass convention). */
export function equatorialToHorizontal(
  raRad: number,
  decRad: number,
  lstRad: number,
  latRad: number,
): Horizontal {
  const ha = lstRad - raRad;
  const sinDec = Math.sin(decRad);
  const cosDec = Math.cos(decRad);
  const sinLat = Math.sin(latRad);
  const cosLat = Math.cos(latRad);
  const sinHa = Math.sin(ha);
  const cosHa = Math.cos(ha);

  const sinAlt = sinDec * sinLat + cosDec * cosLat * cosHa;
  const alt = Math.asin(Math.max(-1, Math.min(1, sinAlt)));

  // Azimuth from North, clockwise through East.
  // Direct formula avoids the atan2 sign-flip ambiguity of the Meeus form.
  const y = -sinHa * cosDec;
  const x = sinDec * cosLat - sinLat * cosDec * cosHa;
  const az = wrap2pi(Math.atan2(y, x));
  return { alt, az };
}

// --- Sun -----------------------------------------------------------------

export function sunEquatorial(date: Date): Equatorial & {
  lambda: number; // ecliptic longitude (rad)
  distAU: number;
} {
  const d = daysSinceJ2000(date);
  const wDeg = wrap360(282.9404 + 4.70935e-5 * d);
  const e = 0.016709 - 1.151e-9 * d;
  const M = wrap360(356.047 + 0.9856002585 * d) * DEG;
  const oblDeg = 23.4393 - 3.563e-7 * d;
  const obl = oblDeg * DEG;

  // Eccentric anomaly (radians)
  let E = M + e * Math.sin(M) * (1 + e * Math.cos(M));
  for (let i = 0; i < 4; i++) {
    E = E - (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
  }
  const xv = Math.cos(E) - e;
  const yv = Math.sqrt(1 - e * e) * Math.sin(E);
  const v = Math.atan2(yv, xv);
  const r = Math.sqrt(xv * xv + yv * yv);
  const lon = wrap2pi(v + wDeg * DEG);

  const xs = r * Math.cos(lon);
  const ys = r * Math.sin(lon);
  const xe = xs;
  const ye = ys * Math.cos(obl);
  const ze = ys * Math.sin(obl);
  const ra = wrap2pi(Math.atan2(ye, xe));
  const dec = Math.atan2(ze, Math.sqrt(xe * xe + ye * ye));
  return { ra, dec, lambda: lon, distAU: r };
}

// --- Moon ---------------------------------------------------------------

export type MoonInfo = Equatorial & {
  phase: number; // 0..1 (0/1 = new, 0.5 = full)
  illumination: number; // 0..1
  age: number; // days since new moon (0..29.53)
  distKm: number;
};

export function moonEquatorial(date: Date): MoonInfo {
  const d = daysSinceJ2000(date);
  const N = wrap360(125.1228 - 0.0529538083 * d) * DEG;
  const i = 5.1454 * DEG;
  const w = wrap360(318.0634 + 0.1643573223 * d) * DEG;
  const a = 60.2666; // Earth radii
  const e = 0.054900;
  const Mdeg = wrap360(115.3654 + 13.0649929509 * d);
  const M = Mdeg * DEG;
  const oblDeg = 23.4393 - 3.563e-7 * d;
  const obl = oblDeg * DEG;

  let E = M + e * Math.sin(M) * (1 + e * Math.cos(M));
  for (let i2 = 0; i2 < 5; i2++) {
    E = E - (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
  }

  const xv = a * (Math.cos(E) - e);
  const yv = a * Math.sqrt(1 - e * e) * Math.sin(E);
  const v = Math.atan2(yv, xv);
  const r = Math.sqrt(xv * xv + yv * yv);

  // Heliocentric ecliptic of Moon (geocentric, since orbit is around Earth).
  const xh =
    r * (Math.cos(N) * Math.cos(v + w) - Math.sin(N) * Math.sin(v + w) * Math.cos(i));
  const yh =
    r * (Math.sin(N) * Math.cos(v + w) + Math.cos(N) * Math.sin(v + w) * Math.cos(i));
  const zh = r * Math.sin(v + w) * Math.sin(i);

  // Apply major perturbations.
  let lon = Math.atan2(yh, xh);
  let lat = Math.atan2(zh, Math.sqrt(xh * xh + yh * yh));
  const dist = Math.sqrt(xh * xh + yh * yh + zh * zh);

  const sun = sunEquatorialAux(d);
  const Ls = sun.M + sun.w; // mean longitude of Sun
  const Lm = M + w + N; // mean longitude of Moon
  const Dm = Lm - Ls; // mean elongation of Moon
  const Fm = Lm - N; // argument of latitude of Moon

  lon += (
    -1.274 * Math.sin(M - 2 * Dm) +
    0.658 * Math.sin(2 * Dm) +
    -0.186 * Math.sin(sun.M) +
    -0.059 * Math.sin(2 * M - 2 * Dm) +
    -0.057 * Math.sin(M - 2 * Dm + sun.M) +
    0.053 * Math.sin(M + 2 * Dm) +
    0.046 * Math.sin(2 * Dm - sun.M) +
    0.041 * Math.sin(M - sun.M) +
    -0.035 * Math.sin(Dm) +
    -0.031 * Math.sin(M + sun.M)
  ) * DEG;
  lat += (
    -0.173 * Math.sin(Fm - 2 * Dm) +
    -0.055 * Math.sin(M - Fm - 2 * Dm) +
    -0.046 * Math.sin(M + Fm - 2 * Dm) +
    0.033 * Math.sin(Fm + 2 * Dm) +
    0.017 * Math.sin(2 * M + Fm)
  ) * DEG;

  // Convert to geocentric equatorial.
  const cosLat = Math.cos(lat);
  const xg = dist * cosLat * Math.cos(lon);
  const yg = dist * cosLat * Math.sin(lon);
  const zg = dist * Math.sin(lat);
  const xeq = xg;
  const yeq = yg * Math.cos(obl) - zg * Math.sin(obl);
  const zeq = yg * Math.sin(obl) + zg * Math.cos(obl);
  const ra = wrap2pi(Math.atan2(yeq, xeq));
  const dec = Math.atan2(zeq, Math.sqrt(xeq * xeq + yeq * yeq));

  // Phase via elongation from Sun.
  const sunEq = sunEquatorial(date);
  const elong = Math.acos(
    Math.sin(sunEq.dec) * Math.sin(dec) +
      Math.cos(sunEq.dec) * Math.cos(dec) * Math.cos(sunEq.ra - ra),
  );
  const illumination = (1 - Math.cos(elong)) / 2;
  // 0 = new, 0.5 = full, increasing toward full as elong grows.
  const synodic = 29.530588853;
  const knownNew = 2451550.1; // JD of a known new moon
  const jd = julianDate(date);
  const age = wrap(jd - knownNew, synodic);
  const phase = age / synodic;

  return {
    ra,
    dec,
    phase,
    illumination,
    age,
    distKm: dist * 6371,
  };
}

// Internal: compact Sun helper for moon perturbations (returns radians).
function sunEquatorialAux(d: number) {
  const w = wrap360(282.9404 + 4.70935e-5 * d) * DEG;
  const M = wrap360(356.047 + 0.9856002585 * d) * DEG;
  return { w, M };
}

// --- Planets ------------------------------------------------------------

type Elements = {
  // Each is a function of d (days since J2000).
  N: (d: number) => number; // longitude of ascending node, deg
  i: (d: number) => number; // inclination, deg
  w: (d: number) => number; // argument of perihelion, deg
  a: (d: number) => number; // semi-major axis, AU
  e: (d: number) => number; // eccentricity
  M: (d: number) => number; // mean anomaly, deg
};

const ELEMS: Record<string, Elements> = {
  mercury: {
    N: (d) => 48.3313 + 3.24587e-5 * d,
    i: (d) => 7.0047 + 5.0e-8 * d,
    w: (d) => 29.1241 + 1.01444e-5 * d,
    a: () => 0.387098,
    e: (d) => 0.205635 + 5.59e-10 * d,
    M: (d) => 168.6562 + 4.0923344368 * d,
  },
  venus: {
    N: (d) => 76.6799 + 2.4659e-5 * d,
    i: (d) => 3.3946 + 2.75e-8 * d,
    w: (d) => 54.891 + 1.38374e-5 * d,
    a: () => 0.72333,
    e: (d) => 0.006773 - 1.302e-9 * d,
    M: (d) => 48.0052 + 1.6021302244 * d,
  },
  mars: {
    N: (d) => 49.5574 + 2.11081e-5 * d,
    i: (d) => 1.8497 - 1.78e-8 * d,
    w: (d) => 286.5016 + 2.92961e-5 * d,
    a: () => 1.523688,
    e: (d) => 0.093405 + 2.516e-9 * d,
    M: (d) => 18.6021 + 0.5240207766 * d,
  },
  jupiter: {
    N: (d) => 100.4542 + 2.76854e-5 * d,
    i: (d) => 1.303 - 1.557e-7 * d,
    w: (d) => 273.8777 + 1.64505e-5 * d,
    a: () => 5.20256,
    e: (d) => 0.048498 + 4.469e-9 * d,
    M: (d) => 19.895 + 0.0830853001 * d,
  },
  saturn: {
    N: (d) => 113.6634 + 2.3898e-5 * d,
    i: (d) => 2.4886 - 1.081e-7 * d,
    w: (d) => 339.3939 + 2.97661e-5 * d,
    a: () => 9.55475,
    e: (d) => 0.055546 - 9.499e-9 * d,
    M: (d) => 316.967 + 0.0334442282 * d,
  },
  uranus: {
    N: (d) => 74.0005 + 1.3978e-5 * d,
    i: (d) => 0.7733 + 1.9e-8 * d,
    w: (d) => 96.6612 + 3.0565e-5 * d,
    a: (d) => 19.18171 - 1.55e-8 * d,
    e: (d) => 0.047318 + 7.45e-9 * d,
    M: (d) => 142.5905 + 0.011725806 * d,
  },
  neptune: {
    N: (d) => 131.7806 + 3.0173e-5 * d,
    i: (d) => 1.77 - 2.55e-7 * d,
    w: (d) => 272.8461 - 6.027e-6 * d,
    a: (d) => 30.05826 + 3.313e-8 * d,
    e: (d) => 0.008606 + 2.15e-9 * d,
    M: (d) => 260.2471 + 0.005995147 * d,
  },
};

function solveKepler(M: number, e: number): number {
  // M in radians.
  let E = M + e * Math.sin(M) * (1 + e * Math.cos(M));
  for (let i = 0; i < 6; i++) {
    const dE = (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
    E -= dE;
    if (Math.abs(dE) < 1e-9) break;
  }
  return E;
}

/** Heliocentric ecliptic-coordinates of a planet. */
function heliocentric(planet: string, d: number) {
  const el = ELEMS[planet];
  if (!el) throw new Error(`Unknown planet ${planet}`);
  const N = el.N(d) * DEG;
  const i = el.i(d) * DEG;
  const w = el.w(d) * DEG;
  const a = el.a(d);
  const e = el.e(d);
  const M = wrap360(el.M(d)) * DEG;
  const E = solveKepler(M, e);
  const xv = a * (Math.cos(E) - e);
  const yv = a * Math.sqrt(1 - e * e) * Math.sin(E);
  const v = Math.atan2(yv, xv);
  const r = Math.sqrt(xv * xv + yv * yv);

  const cosN = Math.cos(N);
  const sinN = Math.sin(N);
  const cosI = Math.cos(i);
  const sinI = Math.sin(i);
  const cosVw = Math.cos(v + w);
  const sinVw = Math.sin(v + w);

  const x = r * (cosN * cosVw - sinN * sinVw * cosI);
  const y = r * (sinN * cosVw + cosN * sinVw * cosI);
  const z = r * (sinVw * sinI);
  return { x, y, z, r };
}

function earthHelio(d: number) {
  // Earth = Sun position negated in geocentric ecliptic — easier: compute Sun.
  const w = wrap360(282.9404 + 4.70935e-5 * d) * DEG;
  const e = 0.016709 - 1.151e-9 * d;
  const M = wrap360(356.047 + 0.9856002585 * d) * DEG;
  const E = solveKepler(M, e);
  const xv = Math.cos(E) - e;
  const yv = Math.sqrt(1 - e * e) * Math.sin(E);
  const v = Math.atan2(yv, xv);
  const r = Math.sqrt(xv * xv + yv * yv);
  const lon = v + w;
  // Earth heliocentric = -Sun-from-Earth, on the ecliptic.
  return { x: -r * Math.cos(lon), y: -r * Math.sin(lon), z: 0, r };
}

export type PlanetInfo = Equatorial & {
  distAU: number;
  mag: number;
};

export function planetEquatorial(planet: string, date: Date): PlanetInfo {
  const d = daysSinceJ2000(date);
  const oblDeg = 23.4393 - 3.563e-7 * d;
  const obl = oblDeg * DEG;
  const p = heliocentric(planet, d);
  const earth = earthHelio(d);
  // Geocentric ecliptic
  const xg = p.x - earth.x;
  const yg = p.y - earth.y;
  const zg = p.z - earth.z;
  // Ecliptic → equatorial
  const xe = xg;
  const ye = yg * Math.cos(obl) - zg * Math.sin(obl);
  const ze = yg * Math.sin(obl) + zg * Math.cos(obl);
  const ra = wrap2pi(Math.atan2(ye, xe));
  const dec = Math.atan2(ze, Math.sqrt(xe * xe + ye * ye));
  const dist = Math.sqrt(xe * xe + ye * ye + ze * ze);
  return { ra, dec, distAU: dist, mag: estimateMag(planet, p.r, dist) };
}

function estimateMag(planet: string, r: number, dist: number): number {
  // Very rough mean magnitudes — enough for visual scaling.
  const base: Record<string, number> = {
    mercury: -0.42,
    venus: -4.4,
    mars: -1.5,
    jupiter: -2.7,
    saturn: 0.43,
    uranus: 5.5,
    neptune: 7.8,
  };
  const m = base[planet] ?? 0;
  return m + 5 * Math.log10(Math.max(0.1, r * dist));
}

// --- Helpers for catalog stars & DSOs -----------------------------------

import { STARS, type Star, DEEP_SKY } from "./catalog";

export type ResolvedStar = Star & { altRad: number; azRad: number };
export type ResolvedDSO = (typeof DEEP_SKY)[number] & {
  altRad: number;
  azRad: number;
};

export function resolveStars(
  date: Date,
  latDeg: number,
  lonDeg: number,
): ResolvedStar[] {
  const lst = localSiderealTime(date, lonDeg);
  const lat = latDeg * DEG;
  return STARS.map((s) => {
    const { alt, az } = equatorialToHorizontal(
      s.ra * 15 * DEG,
      s.dec * DEG,
      lst,
      lat,
    );
    return { ...s, altRad: alt, azRad: az };
  });
}

export function resolveDeepSky(
  date: Date,
  latDeg: number,
  lonDeg: number,
): ResolvedDSO[] {
  const lst = localSiderealTime(date, lonDeg);
  const lat = latDeg * DEG;
  return DEEP_SKY.map((s) => {
    const { alt, az } = equatorialToHorizontal(
      s.ra * 15 * DEG,
      s.dec * DEG,
      lst,
      lat,
    );
    return { ...s, altRad: alt, azRad: az };
  });
}

export type ResolvedBody = {
  id: string;
  name: string;
  kind: "sun" | "moon" | "planet";
  altRad: number;
  azRad: number;
  mag: number;
  color: string;
  description?: string;
  extra?: Record<string, string>;
};

export function resolveSolarSystem(
  date: Date,
  latDeg: number,
  lonDeg: number,
): ResolvedBody[] {
  const lst = localSiderealTime(date, lonDeg);
  const lat = latDeg * DEG;
  const out: ResolvedBody[] = [];

  const sun = sunEquatorial(date);
  const sH = equatorialToHorizontal(sun.ra, sun.dec, lst, lat);
  out.push({
    id: "sun",
    name: "Sun",
    kind: "sun",
    altRad: sH.alt,
    azRad: sH.az,
    mag: -26.7,
    color: "#ffd267",
    description:
      "The G-type star at the centre of the Solar System. Observing it directly without filters is dangerous — never look at the Sun unaided.",
    extra: {
      Distance: `${sun.distAU.toFixed(3)} AU`,
    },
  });

  const moon = moonEquatorial(date);
  const mH = equatorialToHorizontal(moon.ra, moon.dec, lst, lat);
  out.push({
    id: "moon",
    name: "Moon",
    kind: "moon",
    altRad: mH.alt,
    azRad: mH.az,
    mag: -12.7,
    color: "#f4ecd0",
    description:
      "Earth's only natural satellite. A familiar companion that drives our tides and lights our nights.",
    extra: {
      Phase: phaseLabel(moon.phase),
      Illumination: `${(moon.illumination * 100).toFixed(0)}%`,
      Distance: `${Math.round(moon.distKm).toLocaleString()} km`,
    },
  });

  for (const id of ["mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune"]) {
    const p = planetEquatorial(id, date);
    const pH = equatorialToHorizontal(p.ra, p.dec, lst, lat);
    out.push({
      id,
      name: id[0].toUpperCase() + id.slice(1),
      kind: "planet",
      altRad: pH.alt,
      azRad: pH.az,
      mag: p.mag,
      color: PLANET_COLORS[id] ?? "#ffffff",
      extra: {
        Distance: `${p.distAU.toFixed(3)} AU`,
        "Apparent magnitude": p.mag.toFixed(2),
      },
    });
  }
  return out;
}

const PLANET_COLORS: Record<string, string> = {
  mercury: "#c7b89a",
  venus: "#f3e6b5",
  mars: "#ff7a55",
  jupiter: "#f0c890",
  saturn: "#e9d6a3",
  uranus: "#a8e8ff",
  neptune: "#7aa2ff",
};

export function phaseLabel(phase: number): string {
  // phase: 0 new, 0.25 first quarter, 0.5 full, 0.75 last quarter
  const p = wrap(phase, 1);
  if (p < 0.03 || p > 0.97) return "New Moon";
  if (p < 0.22) return "Waxing Crescent";
  if (p < 0.28) return "First Quarter";
  if (p < 0.47) return "Waxing Gibbous";
  if (p < 0.53) return "Full Moon";
  if (p < 0.72) return "Waning Gibbous";
  if (p < 0.78) return "Last Quarter";
  return "Waning Crescent";
}

// --- B-V index → CSS color ---------------------------------------------

export function bvToColor(bv: number): string {
  // Approximate mapping from B-V color index to RGB. Clamped & smoothed.
  const x = Math.max(-0.4, Math.min(2.0, bv));
  let r: number, g: number, b: number;
  if (x < 0) {
    r = 155 + 70 * (x + 0.4) / 0.4;
    g = 176 + 60 * (x + 0.4) / 0.4;
    b = 255;
  } else if (x < 0.4) {
    r = 220 + 35 * (x / 0.4);
    g = 230 + 15 * (x / 0.4);
    b = 255 - 25 * (x / 0.4);
  } else if (x < 0.8) {
    r = 255;
    g = 245 - 20 * ((x - 0.4) / 0.4);
    b = 230 - 60 * ((x - 0.4) / 0.4);
  } else if (x < 1.4) {
    r = 255;
    g = 225 - 50 * ((x - 0.8) / 0.6);
    b = 170 - 70 * ((x - 0.8) / 0.6);
  } else {
    r = 255;
    g = 175 - 55 * ((x - 1.4) / 0.6);
    b = 100 - 60 * ((x - 1.4) / 0.6);
  }
  const clamp = (v: number) =>
    Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0");
  return `#${clamp(r)}${clamp(g)}${clamp(b)}`;
}

// --- Camera projection --------------------------------------------------

export type Camera = {
  yaw: number; // azimuth radians (0 = N, +E)
  pitch: number; // altitude radians (0 = horizon, +up)
  roll: number; // radians, 0 = up
  fovV: number; // vertical FOV in radians (≈ 1 rad)
};

export type Projected = {
  x: number;
  y: number;
  visible: boolean;
  /** Normalised distance from screen center (0 at center, 1 at edge). */
  edge: number;
};

/** Convert (alt, az) of an object to a unit vector in the local horizontal frame. */
export function altAzToVec(alt: number, az: number): [number, number, number] {
  const cosAlt = Math.cos(alt);
  return [
    cosAlt * Math.sin(az), // x = east
    Math.sin(alt), // y = up
    cosAlt * Math.cos(az), // z = north
  ];
}

/** Project an object alt/az to canvas coords given the camera and viewport. */
export function project(
  objAlt: number,
  objAz: number,
  cam: Camera,
  width: number,
  height: number,
): Projected {
  // Build object vector
  const [ox, oy, oz] = altAzToVec(objAlt, objAz);

  // Apply camera transforms: yaw (about Y), then pitch (about X), then roll (about Z).
  const cyaw = Math.cos(-cam.yaw);
  const syaw = Math.sin(-cam.yaw);
  let x = cyaw * ox + syaw * oz;
  let y = oy;
  let z = -syaw * ox + cyaw * oz;

  const cp = Math.cos(cam.pitch);
  const sp = Math.sin(cam.pitch);
  // Pitch about X: rotate so that increasing pitch tilts camera up.
  const y2 = cp * y - sp * z;
  const z2 = sp * y + cp * z;
  y = y2;
  z = z2;

  // Roll about Z (camera optical axis): rotates the image plane.
  if (cam.roll !== 0) {
    const cr = Math.cos(cam.roll);
    const sr = Math.sin(cam.roll);
    const xr = cr * x + sr * y;
    const yr = -sr * x + cr * y;
    x = xr;
    y = yr;
  }

  if (z <= 0.001) {
    // Behind camera — still return projected coords for debugging,
    // but mark invisible.
    return { x: -1e6, y: -1e6, visible: false, edge: 999 };
  }

  const f = (height / 2) / Math.tan(cam.fovV / 2);
  const sx = width / 2 + (x / z) * f;
  const sy = height / 2 - (y / z) * f;
  const dx = (sx - width / 2) / (width / 2);
  const dy = (sy - height / 2) / (height / 2);
  const edge = Math.sqrt(dx * dx + dy * dy);
  return { x: sx, y: sy, visible: true, edge };
}

/** Angular distance between two alt/az points, in radians. */
export function angularDistance(
  alt1: number,
  az1: number,
  alt2: number,
  az2: number,
): number {
  const c =
    Math.sin(alt1) * Math.sin(alt2) +
    Math.cos(alt1) * Math.cos(alt2) * Math.cos(az1 - az2);
  return Math.acos(Math.max(-1, Math.min(1, c)));
}
