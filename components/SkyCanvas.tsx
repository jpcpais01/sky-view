"use client";

import { useEffect, useImperativeHandle, useRef, forwardRef } from "react";
import {
  type Camera,
  type ResolvedBody,
  type ResolvedDSO,
  type ResolvedStar,
  bvToColor,
  project,
} from "@/lib/astronomy";
import { CONSTELLATIONS } from "@/lib/catalog";

export type SkyObject =
  | ({ kind: "star" } & ResolvedStar)
  | ({ kind: "dso" } & ResolvedDSO)
  | ResolvedBody; // ResolvedBody carries its own "sun" | "moon" | "planet" kind

export type CanvasObject = {
  obj: SkyObject;
  x: number;
  y: number;
  radius: number;
};

export type SkyCanvasHandle = {
  /** Returns the closest visible object to a screen point, within `tolerancePx`. */
  hitTest: (x: number, y: number, tolerancePx?: number) => SkyObject | null;
  /** Returns the latest projected positions (for highlight overlays). */
  getProjections: () => CanvasObject[];
};

type Props = {
  stars: ResolvedStar[];
  bodies: ResolvedBody[];
  deepSky: ResolvedDSO[];
  camera: Camera;
  showConstellations?: boolean;
  showHorizon?: boolean;
  showCardinal?: boolean;
  showLabels?: boolean;
  highlightId?: string | null;
  className?: string;
};

const STAR_INDEX_BY_ID = new Map<string, number>();

const SkyCanvas = forwardRef<SkyCanvasHandle, Props>(function SkyCanvas(
  {
    stars,
    bodies,
    deepSky,
    camera,
    showConstellations = true,
    showHorizon = true,
    showCardinal = true,
    showLabels = true,
    highlightId = null,
    className,
  },
  ref,
) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const projectionsRef = useRef<CanvasObject[]>([]);
  const cameraRef = useRef<Camera>(camera);
  const starsRef = useRef(stars);
  const bodiesRef = useRef(bodies);
  const deepSkyRef = useRef(deepSky);
  const optsRef = useRef({
    showConstellations,
    showHorizon,
    showCardinal,
    showLabels,
    highlightId,
  });

  // Sync latest props into refs so the rAF loop sees fresh data
  // without having to be torn down and re-established.
  useEffect(() => {
    cameraRef.current = camera;
  }, [camera]);
  useEffect(() => {
    starsRef.current = stars;
    STAR_INDEX_BY_ID.clear();
    stars.forEach((s, i) => STAR_INDEX_BY_ID.set(s.id, i));
  }, [stars]);
  useEffect(() => {
    bodiesRef.current = bodies;
  }, [bodies]);
  useEffect(() => {
    deepSkyRef.current = deepSky;
  }, [deepSky]);
  useEffect(() => {
    optsRef.current = {
      showConstellations,
      showHorizon,
      showCardinal,
      showLabels,
      highlightId,
    };
  }, [
    showConstellations,
    showHorizon,
    showCardinal,
    showLabels,
    highlightId,
  ]);

  useImperativeHandle(
    ref,
    () => ({
      hitTest(x, y, tolerancePx = 28) {
        let best: { obj: SkyObject; d: number } | null = null;
        for (const p of projectionsRef.current) {
          const dx = p.x - x;
          const dy = p.y - y;
          const d = Math.sqrt(dx * dx + dy * dy);
          const r = Math.max(tolerancePx, p.radius + 14);
          if (d < r && (best == null || d < best.d)) {
            best = { obj: p.obj, d };
          }
        }
        return best?.obj ?? null;
      },
      getProjections() {
        return projectionsRef.current;
      },
    }),
    [],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    let animationFrame = 0;
    let running = true;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, Math.round(rect.width * dpr));
      canvas.height = Math.max(1, Math.round(rect.height * dpr));
    };
    resize();

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const draw = () => {
      if (!running) return;
      const w = canvas.width;
      const h = canvas.height;
      const cam = cameraRef.current;
      const opts = optsRef.current;

      // --- Background gradient (zenith → horizon) ---
      const horizonY = projectHorizonY(cam, w, h);
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, "#020410");
      grad.addColorStop(0.5, "#04081d");
      grad.addColorStop(1, "#0a1230");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // Subtle Milky Way band (decorative — equatorial fuzz).
      drawMilkyWay(ctx, cam, w, h);

      const projections: CanvasObject[] = [];

      // --- Constellations (drawn behind stars) ---
      if (opts.showConstellations) {
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.strokeStyle = "rgba(122, 162, 255, 0.32)";
        ctx.lineWidth = 1.0 * dpr;
        const starsArr = starsRef.current;
        for (const c of CONSTELLATIONS) {
          for (const [a, b] of c.lines) {
            const sa = starsArr[a];
            const sb = starsArr[b];
            if (!sa || !sb) continue;
            const pa = project(sa.altRad, sa.azRad, cam, w, h);
            const pb = project(sb.altRad, sb.azRad, cam, w, h);
            if (!pa.visible || !pb.visible) continue;
            if (pa.edge > 1.6 && pb.edge > 1.6) continue;
            ctx.beginPath();
            ctx.moveTo(pa.x, pa.y);
            ctx.lineTo(pb.x, pb.y);
            ctx.stroke();
          }
        }
      }

      // --- Stars ---
      const starsArr = starsRef.current;
      for (const s of starsArr) {
        const p = project(s.altRad, s.azRad, cam, w, h);
        if (!p.visible) continue;
        if (p.edge > 1.7) continue;
        const r = starRadius(s.mag, dpr);
        const color = bvToColor(s.bv);
        // Glow
        const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 5);
        glow.addColorStop(0, hexA(color, 0.7));
        glow.addColorStop(1, hexA(color, 0));
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r * 5, 0, Math.PI * 2);
        ctx.fill();
        // Core
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.fill();
        if (opts.showLabels && s.mag < 1.6) {
          drawLabel(ctx, s.name, p.x + r + 6 * dpr, p.y + 4 * dpr, dpr);
        }
        projections.push({
          obj: { kind: "star", ...s },
          x: p.x,
          y: p.y,
          radius: r,
        });
      }

      // --- Deep-sky objects ---
      for (const dso of deepSkyRef.current) {
        const p = project(dso.altRad, dso.azRad, cam, w, h);
        if (!p.visible || p.edge > 1.6) continue;
        const r = 6 * dpr;
        ctx.save();
        ctx.strokeStyle = "rgba(168, 196, 255, 0.7)";
        ctx.lineWidth = 1.2 * dpr;
        ctx.setLineDash([3 * dpr, 3 * dpr]);
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
        if (opts.showLabels) {
          drawLabel(
            ctx,
            dso.name,
            p.x + r + 6 * dpr,
            p.y + 4 * dpr,
            dpr,
            "rgba(168, 196, 255, 0.85)",
          );
        }
        projections.push({
          obj: { kind: "dso", ...dso },
          x: p.x,
          y: p.y,
          radius: r,
        });
      }

      // --- Solar System bodies (Sun, Moon, planets) ---
      for (const b of bodiesRef.current) {
        const p = project(b.altRad, b.azRad, cam, w, h);
        if (!p.visible || p.edge > 1.6) continue;
        const r = bodyRadius(b, dpr);
        if (b.kind === "sun") {
          drawSun(ctx, p.x, p.y, r);
        } else if (b.kind === "moon") {
          drawMoon(ctx, p.x, p.y, r, b);
        } else {
          drawPlanet(ctx, p.x, p.y, r, b.color);
        }
        if (opts.showLabels) {
          drawLabel(
            ctx,
            b.name,
            p.x + r + 6 * dpr,
            p.y + 4 * dpr,
            dpr,
            "rgba(255, 235, 200, 0.95)",
          );
        }
        projections.push({
          obj: { ...b },
          x: p.x,
          y: p.y,
          radius: r,
        });
      }

      // --- Ground overlay (semi-transparent; objects below horizon remain
      //     faintly visible and tappable). Drawn AFTER objects so it fades them. ---
      if (opts.showHorizon && horizonY != null && horizonY < h) {
        const groundTop = Math.max(0, horizonY);
        const gh = ctx.createLinearGradient(0, groundTop, 0, h);
        gh.addColorStop(0, "rgba(2, 4, 12, 0.35)");
        gh.addColorStop(0.35, "rgba(2, 4, 12, 0.72)");
        gh.addColorStop(1, "rgba(0, 0, 6, 0.88)");
        ctx.fillStyle = gh;
        ctx.fillRect(0, groundTop, w, h - groundTop);
        // Horizon line
        ctx.strokeStyle = "rgba(122, 162, 255, 0.45)";
        ctx.lineWidth = 1.5 * dpr;
        ctx.beginPath();
        ctx.moveTo(0, horizonY);
        ctx.lineTo(w, horizonY);
        ctx.stroke();
      }

      // --- Cardinal directions on the horizon ---
      if (opts.showCardinal) {
        drawCardinals(ctx, cam, w, h, dpr);
      }

      // --- Highlight ring ---
      if (opts.highlightId) {
        const hit = projections.find((p) => objectId(p.obj) === opts.highlightId);
        if (hit) {
          const t = (Date.now() / 600) % (Math.PI * 2);
          const pulse = 0.5 + 0.5 * Math.sin(t);
          ctx.strokeStyle = `rgba(168, 196, 255, ${0.55 + 0.35 * pulse})`;
          ctx.lineWidth = 2 * dpr;
          ctx.beginPath();
          ctx.arc(hit.x, hit.y, hit.radius + 10 * dpr + 4 * pulse * dpr, 0, Math.PI * 2);
          ctx.stroke();
        }
      }

      projectionsRef.current = projections;
      animationFrame = requestAnimationFrame(draw);
    };

    animationFrame = requestAnimationFrame(draw);

    return () => {
      running = false;
      cancelAnimationFrame(animationFrame);
      ro.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={["block touch-none select-none", className ?? ""].join(" ")}
      style={{ width: "100%", height: "100%" }}
    />
  );
});

export default SkyCanvas;

// ---- Helpers -----------------------------------------------------------

function objectId(o: SkyObject): string {
  return o.id;
}

function starRadius(mag: number, dpr: number): number {
  // Brighter (lower mag) → larger.
  const m = Math.max(-1.5, Math.min(6.5, mag));
  const base = Math.max(0.6, 2.6 - 0.6 * m);
  return base * dpr;
}

function bodyRadius(b: ResolvedBody, dpr: number): number {
  if (b.kind === "sun") return 14 * dpr;
  if (b.kind === "moon") return 14 * dpr;
  // Planets: scale by magnitude, but with sensible min/max.
  const m = Math.max(-4.5, Math.min(7, b.mag));
  return Math.max(2.2, 5 - 0.5 * m) * dpr;
}

function drawSun(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  const corona = ctx.createRadialGradient(x, y, 0, x, y, r * 4);
  corona.addColorStop(0, "rgba(255, 220, 130, 0.85)");
  corona.addColorStop(0.4, "rgba(255, 180, 90, 0.35)");
  corona.addColorStop(1, "rgba(255, 160, 60, 0)");
  ctx.fillStyle = corona;
  ctx.beginPath();
  ctx.arc(x, y, r * 4, 0, Math.PI * 2);
  ctx.fill();
  const disc = ctx.createRadialGradient(x, y, 0, x, y, r);
  disc.addColorStop(0, "#fff7d6");
  disc.addColorStop(0.6, "#ffd267");
  disc.addColorStop(1, "#ff9a3d");
  ctx.fillStyle = disc;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

function drawMoon(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  b: ResolvedBody,
) {
  // Glow halo
  const halo = ctx.createRadialGradient(x, y, 0, x, y, r * 2.6);
  halo.addColorStop(0, "rgba(244, 236, 208, 0.55)");
  halo.addColorStop(1, "rgba(244, 236, 208, 0)");
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(x, y, r * 2.6, 0, Math.PI * 2);
  ctx.fill();

  // Disc
  const disc = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, 0, x, y, r);
  disc.addColorStop(0, "#fffaee");
  disc.addColorStop(0.7, "#e9dfbf");
  disc.addColorStop(1, "#a99a78");
  ctx.fillStyle = disc;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();

  // Phase shadow.
  const phase =
    (b.extra && b.extra.Phase
      ? phaseFromLabel(b.extra.Phase)
      : 0.5) || 0.5;
  drawMoonShadow(ctx, x, y, r, phase);
}

function phaseFromLabel(label: string): number {
  switch (label) {
    case "New Moon":
      return 0;
    case "Waxing Crescent":
      return 0.12;
    case "First Quarter":
      return 0.25;
    case "Waxing Gibbous":
      return 0.37;
    case "Full Moon":
      return 0.5;
    case "Waning Gibbous":
      return 0.62;
    case "Last Quarter":
      return 0.75;
    case "Waning Crescent":
      return 0.87;
    default:
      return 0.5;
  }
}

function drawMoonShadow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  phase: number,
) {
  // phase: 0 = new (fully shadowed), 0.5 = full (no shadow), 1 = new again
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = "rgba(8, 12, 28, 0.86)";
  if (phase <= 0.005 || phase >= 0.995) {
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  } else if (Math.abs(phase - 0.5) < 0.005) {
    // full — no shadow
  } else {
    // The terminator is an ellipse — width changes with phase.
    const f = Math.cos(phase * Math.PI * 2); // -1 .. 1
    // f = 1 at new, -1 at full. Combine with sign for waxing/waning.
    const waxing = phase < 0.5;
    const ellipseRx = Math.abs(f) * r;
    ctx.beginPath();
    if ((waxing && f > 0) || (!waxing && f < 0)) {
      // crescent / gibbous on the appropriate side
      if (waxing) {
        // waxing crescent: shadow on the LEFT, terminator on the right of disc center.
        ctx.moveTo(x, y - r);
        ctx.ellipse(x, y, ellipseRx, r, 0, -Math.PI / 2, Math.PI / 2);
        ctx.arc(x, y, r, Math.PI / 2, -Math.PI / 2);
      } else {
        // waning crescent: shadow on the RIGHT.
        ctx.moveTo(x, y - r);
        ctx.arc(x, y, r, -Math.PI / 2, Math.PI / 2);
        ctx.ellipse(x, y, ellipseRx, r, 0, Math.PI / 2, -Math.PI / 2);
      }
    } else {
      // gibbous
      if (waxing) {
        // waxing gibbous: small shadow on left.
        ctx.moveTo(x, y - r);
        ctx.arc(x, y, r, -Math.PI / 2, Math.PI / 2, true);
        ctx.ellipse(x, y, ellipseRx, r, 0, Math.PI / 2, -Math.PI / 2, true);
      } else {
        // waning gibbous: small shadow on right.
        ctx.moveTo(x, y - r);
        ctx.arc(x, y, r, -Math.PI / 2, Math.PI / 2);
        ctx.ellipse(x, y, ellipseRx, r, 0, Math.PI / 2, -Math.PI / 2, true);
      }
    }
    ctx.fill();
  }
  ctx.restore();
}

function drawPlanet(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  color: string,
) {
  const halo = ctx.createRadialGradient(x, y, 0, x, y, r * 2.4);
  halo.addColorStop(0, hexA(color, 0.6));
  halo.addColorStop(1, hexA(color, 0));
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(x, y, r * 2.4, 0, Math.PI * 2);
  ctx.fill();

  const disc = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, 0, x, y, r);
  disc.addColorStop(0, lighten(color, 0.35));
  disc.addColorStop(1, color);
  ctx.fillStyle = disc;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

function drawLabel(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  dpr: number,
  color: string = "rgba(230, 236, 255, 0.85)",
) {
  ctx.font = `${11 * dpr}px var(--font-geist-sans), system-ui, sans-serif`;
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.fillText(text, x + dpr, y + dpr);
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
}

function projectHorizonY(cam: Camera, w: number, h: number): number | null {
  // The horizon is the plane y=0 in world coords; in camera space
  // it's a line. For our pinhole projection, the horizon line
  // appears as a straight horizontal line only if there's no roll.
  // We use the project() of an alt=0 point at the camera's azimuth as a proxy.
  const p = project(0, cam.yaw, cam, w, h);
  if (!p.visible) return null;
  return p.y;
}

function drawMilkyWay(
  ctx: CanvasRenderingContext2D,
  cam: Camera,
  w: number,
  h: number,
) {
  // Faint diagonal band proxy. A real ecliptic/galactic-equator render is more
  // expensive — for an indie planetarium this gives just enough atmosphere.
  ctx.save();
  const grad = ctx.createLinearGradient(0, 0, w, h);
  grad.addColorStop(0, "rgba(128, 128, 200, 0)");
  grad.addColorStop(0.45, "rgba(140, 150, 220, 0.06)");
  grad.addColorStop(0.55, "rgba(200, 180, 240, 0.07)");
  grad.addColorStop(1, "rgba(128, 128, 200, 0)");
  ctx.fillStyle = grad;
  ctx.translate(w / 2, h / 2);
  ctx.rotate(cam.roll - 0.4);
  ctx.fillRect(-w, -h * 0.18, w * 2, h * 0.36);
  ctx.restore();
}

function drawCardinals(
  ctx: CanvasRenderingContext2D,
  cam: Camera,
  w: number,
  h: number,
  dpr: number,
) {
  const dirs = [
    { name: "N", az: 0 },
    { name: "E", az: Math.PI / 2 },
    { name: "S", az: Math.PI },
    { name: "W", az: -Math.PI / 2 },
  ];
  ctx.font = `bold ${15 * dpr}px var(--font-geist-sans), system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (const d of dirs) {
    const p = project(0, d.az, cam, w, h);
    if (!p.visible || p.edge > 1.4) continue;
    const isCardinalPrimary = d.name === "N";
    ctx.fillStyle = isCardinalPrimary
      ? "rgba(255, 196, 134, 0.95)"
      : "rgba(168, 196, 255, 0.85)";
    ctx.shadowColor = "rgba(0, 0, 0, 0.6)";
    ctx.shadowBlur = 6 * dpr;
    ctx.fillText(d.name, p.x, p.y - 6 * dpr);
  }
  ctx.shadowBlur = 0;
  ctx.textAlign = "start";
}

function hexA(hex: string, a: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

function lighten(hex: string, amount: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const mix = (c: number) => Math.round(c + (255 - c) * amount);
  const toHex = (c: number) => c.toString(16).padStart(2, "0");
  return `#${toHex(mix(r))}${toHex(mix(g))}${toHex(mix(b))}`;
}
