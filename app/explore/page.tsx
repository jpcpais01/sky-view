"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import SkyCanvas, {
  type SkyCanvasHandle,
  type SkyObject,
} from "@/components/SkyCanvas";
import ObjectInfoModal from "@/components/ObjectInfoModal";
import {
  angularDistance,
  resolveDeepSky,
  resolveSolarSystem,
  resolveStars,
  type Camera,
} from "@/lib/astronomy";
import { useLocation } from "@/lib/useLocation";
import { CONSTELLATIONS, STARS } from "@/lib/catalog";

const MIN_FOV = 0.35; // radians (~20°) — zoomed in
const MAX_FOV = 2.3; // radians (~132°) — wide
const DEFAULT_FOV = 1.4;
const TAP_MAX_MOVE = 10; // px

export default function ExplorePage() {
  const { location } = useLocation();
  const [now, setNow] = useState(() => new Date());
  const [camera, setCamera] = useState<Camera>(() => ({
    yaw: Math.PI, // looking south by default
    pitch: 0.6, // slightly above horizon
    roll: 0,
    fovV: DEFAULT_FOV,
  }));
  const [selected, setSelected] = useState<SkyObject | null>(null);
  const [showConstellations, setShowConstellations] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);
  const canvasHandleRef = useRef<SkyCanvasHandle | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(t);
  }, []);

  const stars = useMemo(
    () => resolveStars(now, location.lat, location.lon),
    [now, location.lat, location.lon],
  );
  const bodies = useMemo(
    () => resolveSolarSystem(now, location.lat, location.lon),
    [now, location.lat, location.lon],
  );
  const deepSky = useMemo(
    () => resolveDeepSky(now, location.lat, location.lon),
    [now, location.lat, location.lon],
  );

  const centerOn = useCallback(
    (alt: number, az: number, narrow = false) => {
      setCamera((cam) => ({
        yaw: ((az % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI),
        pitch: Math.max(-0.5, Math.min(Math.PI / 2 - 0.05, alt)),
        roll: 0,
        fovV: narrow ? Math.max(MIN_FOV, Math.min(cam.fovV, 0.6)) : cam.fovV,
      }));
    },
    [],
  );

  const handleCenterObject = useCallback(
    (object: SkyObject) => {
      centerOn(object.altRad, object.azRad, true);
      setSelected(null);
    },
    [centerOn],
  );

  // --- Pointer handling: drag to pan, pinch to zoom, tap to select ---
  type Pt = { x: number; y: number };
  const pointers = useRef<Map<number, Pt>>(new Map());
  const pinchRef = useRef<{
    startDist: number;
    startFov: number;
    centerX: number;
    centerY: number;
  } | null>(null);
  const dragRef = useRef<{
    startYaw: number;
    startPitch: number;
    startX: number;
    startY: number;
    moved: boolean;
    pointerId: number;
  } | null>(null);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    el.setPointerCapture?.(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 1) {
      dragRef.current = {
        startYaw: camera.yaw,
        startPitch: camera.pitch,
        startX: e.clientX,
        startY: e.clientY,
        moved: false,
        pointerId: e.pointerId,
      };
    } else if (pointers.current.size === 2) {
      dragRef.current = null;
      const [a, b] = Array.from(pointers.current.values());
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      pinchRef.current = {
        startDist: Math.hypot(dx, dy),
        startFov: camera.fovV,
        centerX: (a.x + b.x) / 2,
        centerY: (a.y + b.y) / 2,
      };
    }
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.current.size >= 2 && pinchRef.current) {
      const [a, b] = Array.from(pointers.current.values());
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      const ratio = pinchRef.current.startDist / Math.max(1, dist);
      const nextFov = Math.max(
        MIN_FOV,
        Math.min(MAX_FOV, pinchRef.current.startFov * ratio),
      );
      setCamera((cam) => ({ ...cam, fovV: nextFov }));
      return;
    }

    if (
      pointers.current.size === 1 &&
      dragRef.current &&
      dragRef.current.pointerId === e.pointerId
    ) {
      const d = dragRef.current;
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const dx = e.clientX - d.startX;
      const dy = e.clientY - d.startY;
      if (
        !d.moved &&
        Math.sqrt(dx * dx + dy * dy) > TAP_MAX_MOVE
      ) {
        d.moved = true;
      }
      if (d.moved) {
        // Pixels → radians using current FOV.
        const radPerPx = camera.fovV / rect.height;
        const nextYaw =
          d.startYaw - dx * radPerPx * Math.cos(camera.pitch) -
          0 * dy; // yaw doesn't depend on dy
        const nextPitch = Math.max(
          -Math.PI / 2 + 0.1,
          Math.min(Math.PI / 2 - 0.05, d.startPitch + dy * radPerPx),
        );
        setCamera((cam) => ({
          ...cam,
          yaw: ((nextYaw % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2),
          pitch: nextPitch,
          roll: 0,
        }));
      }
    }
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const wasDragging = dragRef.current?.moved === true;
    const wasPinching = pointers.current.size >= 2;
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinchRef.current = null;

    if (pointers.current.size === 0) {
      // Tap to select (only for the last finger that wasn't dragging/pinching).
      if (
        !wasDragging &&
        !wasPinching &&
        dragRef.current?.pointerId === e.pointerId
      ) {
        const container = containerRef.current;
        const canvas = container?.querySelector("canvas") as HTMLCanvasElement | null;
        if (canvas) {
          const rect = canvas.getBoundingClientRect();
          const dpr = canvas.width / rect.width;
          const x = (e.clientX - rect.left) * dpr;
          const y = (e.clientY - rect.top) * dpr;
          const hit = canvasHandleRef.current?.hitTest(x, y);
          if (hit) setSelected(hit);
        }
      }
      dragRef.current = null;
    }
  };

  const onWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    const factor = Math.exp(e.deltaY * 0.0015);
    setCamera((cam) => ({
      ...cam,
      fovV: Math.max(MIN_FOV, Math.min(MAX_FOV, cam.fovV * factor)),
    }));
  };

  const zoom = useCallback((mult: number) => {
    setCamera((cam) => ({
      ...cam,
      fovV: Math.max(MIN_FOV, Math.min(MAX_FOV, cam.fovV * mult)),
    }));
  }, []);

  const resetView = useCallback(() => {
    setCamera({
      yaw: Math.PI,
      pitch: 0.6,
      roll: 0,
      fovV: DEFAULT_FOV,
    });
  }, []);

  // --- Search: flatten everything, filter by query ---
  const searchItems = useMemo(() => {
    const list: {
      key: string;
      label: string;
      sub: string;
      onSelect: () => void;
    }[] = [];
    bodies.forEach((b) =>
      list.push({
        key: `body:${b.id}`,
        label: b.name,
        sub: b.kind === "sun" ? "Star" : b.kind === "moon" ? "Moon" : "Planet",
        onSelect: () => {
          centerOn(b.altRad, b.azRad, true);
          setSelected({ ...b });
          setSearchOpen(false);
        },
      }),
    );
    STARS.forEach((s, i) => {
      const resolved = stars[i];
      list.push({
        key: `star:${s.id}`,
        label: s.name,
        sub: `${s.bayer ? s.bayer + " · " : ""}${s.constellation}`,
        onSelect: () => {
          centerOn(resolved.altRad, resolved.azRad, true);
          setSelected({ kind: "star", ...resolved });
          setSearchOpen(false);
        },
      });
    });
    CONSTELLATIONS.forEach((c) => {
      // Find average position of its stars.
      const members = c.lines
        .flat()
        .map((i) => stars[i])
        .filter(Boolean);
      if (members.length === 0) return;
      const avgAlt =
        members.reduce((a, s) => a + s.altRad, 0) / members.length;
      const avgAzX =
        members.reduce((a, s) => a + Math.cos(s.azRad), 0) / members.length;
      const avgAzY =
        members.reduce((a, s) => a + Math.sin(s.azRad), 0) / members.length;
      const avgAz = Math.atan2(avgAzY, avgAzX);
      list.push({
        key: `const:${c.id}`,
        label: c.name,
        sub: "Constellation",
        onSelect: () => {
          centerOn(avgAlt, avgAz, false);
          setSearchOpen(false);
        },
      });
    });
    deepSky.forEach((d) =>
      list.push({
        key: `dso:${d.id}`,
        label: d.name,
        sub: d.type,
        onSelect: () => {
          centerOn(d.altRad, d.azRad, true);
          setSelected({ kind: "dso", ...d });
          setSearchOpen(false);
        },
      }),
    );
    return list;
  }, [bodies, stars, deepSky, centerOn]);

  // Highlight the object nearest screen center (useful when zoomed in).
  const centerHint = useMemo(() => {
    let best: { name: string; dist: number } | null = null;
    for (const s of stars) {
      const d = angularDistance(s.altRad, s.azRad, camera.pitch, camera.yaw);
      if (d < camera.fovV / 4 && (best == null || d < best.dist)) {
        best = { name: s.name, dist: d };
      }
    }
    for (const b of bodies) {
      const d = angularDistance(b.altRad, b.azRad, camera.pitch, camera.yaw);
      if (d < camera.fovV / 4 && (best == null || d < best.dist)) {
        best = { name: b.name, dist: d };
      }
    }
    return best?.name;
  }, [stars, bodies, camera]);

  return (
    <div className="fixed inset-0 overflow-hidden">
      <div
        ref={containerRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onWheel={onWheel}
        className="absolute inset-0 touch-none"
        style={{ cursor: "grab" }}
      >
        <SkyCanvas
          ref={canvasHandleRef}
          stars={stars}
          bodies={bodies}
          deepSky={deepSky}
          camera={camera}
          showConstellations={showConstellations}
          showLabels={showLabels}
          highlightId={selected?.id ?? null}
        />
      </div>

      {/* Top bar */}
      <div className="pointer-events-none absolute top-0 left-0 right-0 pt-[max(env(safe-area-inset-top),12px)] px-3">
        <div className="pointer-events-auto glass-strong mx-auto max-w-md rounded-2xl px-3 py-2 flex items-center gap-2">
          <button
            onClick={() => setSearchOpen(true)}
            aria-label="Search sky"
            className="flex-1 flex items-center gap-2 rounded-xl px-3 py-2 bg-white/6 hover:bg-white/10 transition-colors"
          >
            <svg
              viewBox="0 0 24 24"
              width="18"
              height="18"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.7}
              strokeLinecap="round"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
            <span className="text-[13px] text-[var(--muted)]">
              Search stars, planets, constellations
            </span>
          </button>
          <button
            onClick={resetView}
            aria-label="Reset view"
            className="size-9 rounded-xl bg-white/6 hover:bg-white/10 flex items-center justify-center transition-colors"
          >
            <svg
              viewBox="0 0 24 24"
              width="18"
              height="18"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.7}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 12a9 9 0 1 0 3-6.7" />
              <path d="M3 4v5h5" />
            </svg>
          </button>
        </div>
        {centerHint && (
          <div className="pointer-events-none text-center mt-2">
            <span className="glass rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-[var(--accent-strong)]/90">
              Aimed at {centerHint}
            </span>
          </div>
        )}
      </div>

      {/* Side toggles */}
      <div className="pointer-events-none absolute right-3 top-[calc(max(env(safe-area-inset-top),12px)+62px)] flex flex-col gap-2">
        <ToggleButton
          active={showConstellations}
          onClick={() => setShowConstellations((v) => !v)}
          label="Lines"
        />
        <ToggleButton
          active={showLabels}
          onClick={() => setShowLabels((v) => !v)}
          label="Labels"
        />
      </div>

      {/* Zoom controls */}
      <div className="pointer-events-none absolute left-3 top-[calc(max(env(safe-area-inset-top),12px)+62px)] flex flex-col gap-2">
        <button
          onClick={() => zoom(0.75)}
          aria-label="Zoom in"
          className="pointer-events-auto glass size-10 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors"
        >
          <span className="text-xl leading-none">+</span>
        </button>
        <button
          onClick={() => zoom(1.33)}
          aria-label="Zoom out"
          className="pointer-events-auto glass size-10 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors"
        >
          <span className="text-xl leading-none">−</span>
        </button>
      </div>

      {/* Compass / info strip */}
      <div className="pointer-events-none absolute bottom-[calc(env(safe-area-inset-bottom)+88px)] left-0 right-0 px-3">
        <div className="glass mx-auto max-w-md rounded-2xl px-4 py-2 flex items-center justify-between text-[12px] font-medium text-[var(--foreground)]/85">
          <span>
            {((camera.yaw * 180) / Math.PI).toFixed(0)}°{" "}
            <span className="text-[var(--muted)]">
              {compass((camera.yaw * 180) / Math.PI)}
            </span>
          </span>
          <span className="text-[var(--muted)]">
            alt {((camera.pitch * 180) / Math.PI).toFixed(0)}°
          </span>
          <span className="text-[var(--muted)]">
            fov {((camera.fovV * 180) / Math.PI).toFixed(0)}°
          </span>
        </div>
      </div>

      {searchOpen && (
        <SearchSheet
          items={searchItems}
          onClose={() => setSearchOpen(false)}
        />
      )}

      <ObjectInfoModal
        object={selected}
        onClose={() => setSelected(null)}
        onCenter={handleCenterObject}
      />
    </div>
  );
}

function ToggleButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={[
        "pointer-events-auto glass rounded-full px-3 py-1.5 text-[11px] font-semibold tracking-wide uppercase transition-colors",
        active
          ? "text-[var(--accent-strong)] border-[var(--border-strong)]"
          : "text-[var(--muted)]",
      ].join(" ")}
    >
      {label}
    </button>
  );
}

function SearchSheet({
  items,
  onClose,
}: {
  items: { key: string; label: string; sub: string; onSelect: () => void }[];
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items.slice(0, 40);
    return items
      .filter(
        (i) =>
          i.label.toLowerCase().includes(q) ||
          i.sub.toLowerCase().includes(q),
      )
      .slice(0, 40);
  }, [items, query]);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center pointer-events-none">
      <div
        className="absolute inset-0 bg-black/50 fade-in pointer-events-auto"
        onClick={onClose}
      />
      <div className="glass-strong sheet-up pointer-events-auto relative w-full max-w-md mx-3 mb-[max(env(safe-area-inset-bottom),12px)] rounded-3xl overflow-hidden shadow-[0_18px_50px_rgba(0,0,0,0.6)]">
        <div className="h-1 w-10 bg-white/20 rounded-full mx-auto mt-2" />
        <div className="p-4">
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search stars, planets, constellations…"
            className="w-full bg-white/6 rounded-xl px-4 py-3 text-[14px] outline-none focus:bg-white/10 placeholder:text-[var(--muted)]"
          />
          <ul className="mt-3 max-h-[55dvh] overflow-y-auto divide-y divide-white/5">
            {filtered.length === 0 && (
              <li className="py-8 text-center text-sm text-[var(--muted)]">
                No results.
              </li>
            )}
            {filtered.map((item) => (
              <li key={item.key}>
                <button
                  onClick={item.onSelect}
                  className="w-full text-left py-3 px-1 flex items-center justify-between gap-4 hover:bg-white/5 rounded-lg transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-[14.5px] font-medium truncate">
                      {item.label}
                    </p>
                    <p className="text-[12px] text-[var(--muted)] truncate">
                      {item.sub}
                    </p>
                  </div>
                  <svg
                    viewBox="0 0 24 24"
                    width="16"
                    height="16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.7}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-[var(--muted)]"
                  >
                    <path d="m9 6 6 6-6 6" />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function compass(azDeg: number): string {
  const dirs = [
    "N", "NNE", "NE", "ENE",
    "E", "ESE", "SE", "SSE",
    "S", "SSW", "SW", "WSW",
    "W", "WNW", "NW", "NNW",
  ];
  const norm = ((azDeg % 360) + 360) % 360;
  return dirs[Math.round(norm / 22.5) % 16];
}
