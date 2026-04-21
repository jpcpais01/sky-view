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

const MIN_FOV = 0.35;
const MAX_FOV = 2.3;
const DEFAULT_FOV = 1.4;
const TAP_MAX_MOVE = 10;

export default function ExplorePage() {
  const { location } = useLocation();

  // Real clock ticks every 30s; timeOffsetHours shifts it for time travel.
  const [realNow, setRealNow] = useState(() => new Date());
  const [timeOffsetHours, setTimeOffsetHours] = useState(0);
  const now = useMemo(
    () => new Date(realNow.getTime() + timeOffsetHours * 3_600_000),
    [realNow, timeOffsetHours],
  );

  useEffect(() => {
    const t = setInterval(() => setRealNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  const [camera, setCamera] = useState<Camera>(() => ({
    yaw: Math.PI,
    pitch: 0.6,
    roll: 0,
    fovV: DEFAULT_FOV,
  }));
  const [selected, setSelected] = useState<SkyObject | null>(null);
  const [showConstellations, setShowConstellations] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);
  const canvasHandleRef = useRef<SkyCanvasHandle | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

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

  const centerOn = useCallback((alt: number, az: number, narrow = false) => {
    setCamera((cam) => ({
      yaw: ((az % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI),
      pitch: Math.max(-0.5, Math.min(Math.PI / 2 - 0.05, alt)),
      roll: 0,
      fovV: narrow ? Math.max(MIN_FOV, Math.min(cam.fovV, 0.6)) : cam.fovV,
    }));
  }, []);

  const handleCenterObject = useCallback(
    (object: SkyObject) => {
      centerOn(object.altRad, object.azRad, true);
      setSelected(null);
    },
    [centerOn],
  );

  // --- Pointer handling ---
  type Pt = { x: number; y: number };
  const pointers = useRef<Map<number, Pt>>(new Map());
  const pinchRef = useRef<{ startDist: number; startFov: number } | null>(null);
  const dragRef = useRef<{
    startYaw: number;
    startPitch: number;
    startX: number;
    startY: number;
    moved: boolean;
    pointerId: number;
  } | null>(null);
  const tapBlockedRef = useRef(false);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture?.(e.pointerId);
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
      pinchRef.current = {
        startDist: Math.hypot(a.x - b.x, a.y - b.y),
        startFov: camera.fovV,
      };
    }
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.current.size >= 2 && pinchRef.current) {
      const [a, b] = Array.from(pointers.current.values());
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      const nextFov = Math.max(
        MIN_FOV,
        Math.min(MAX_FOV, pinchRef.current.startFov * (pinchRef.current.startDist / Math.max(1, dist))),
      );
      setCamera((cam) => ({ ...cam, fovV: nextFov }));
      return;
    }

    if (pointers.current.size === 1 && dragRef.current?.pointerId === e.pointerId) {
      const d = dragRef.current;
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const dx = e.clientX - d.startX;
      const dy = e.clientY - d.startY;
      if (!d.moved && Math.hypot(dx, dy) > TAP_MAX_MOVE) d.moved = true;
      if (d.moved) {
        const radPerPx = camera.fovV / rect.height;
        const nextYaw = d.startYaw - dx * radPerPx * Math.cos(camera.pitch);
        const nextPitch = Math.max(
          -Math.PI / 2 + 0.1,
          Math.min(Math.PI / 2 - 0.05, d.startPitch + dy * radPerPx),
        );
        setCamera((cam) => ({
          ...cam,
          yaw: ((nextYaw % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2),
          pitch: nextPitch,
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
      // Block the synthesised click only when the gesture wasn't a plain tap.
      tapBlockedRef.current = wasDragging || wasPinching;
      dragRef.current = null;
    }
  };

  // Hit-test on click so React renders the modal AFTER the event completes —
  // prevents the synthesised click from ghost-closing it.
  const onClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (tapBlockedRef.current) {
      tapBlockedRef.current = false;
      return;
    }
    const canvas = e.currentTarget.querySelector("canvas") as HTMLCanvasElement | null;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = canvas.width / rect.width;
    const x = (e.clientX - rect.left) * dpr;
    const y = (e.clientY - rect.top) * dpr;
    const hit = canvasHandleRef.current?.hitTest(x, y, 44 * dpr);
    if (hit) setSelected(hit);
  };

  const onWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    const factor = Math.exp(e.deltaY * 0.0015);
    setCamera((cam) => ({ ...cam, fovV: Math.max(MIN_FOV, Math.min(MAX_FOV, cam.fovV * factor)) }));
  };

  const zoom = useCallback((mult: number) => {
    setCamera((cam) => ({ ...cam, fovV: Math.max(MIN_FOV, Math.min(MAX_FOV, cam.fovV * mult)) }));
  }, []);

  const resetView = useCallback(() => {
    setCamera({ yaw: Math.PI, pitch: 0.6, roll: 0, fovV: DEFAULT_FOV });
  }, []);

  // Search items list
  const searchItems = useMemo(() => {
    const list: { key: string; label: string; sub: string; onSelect: () => void }[] = [];
    bodies.forEach((b) =>
      list.push({
        key: `body:${b.id}`,
        label: b.name,
        sub: b.kind === "sun" ? "Star" : b.kind === "moon" ? "Moon" : "Planet",
        onSelect: () => { centerOn(b.altRad, b.azRad, true); setSelected({ ...b }); setSearchOpen(false); },
      }),
    );
    STARS.forEach((s, i) => {
      const resolved = stars[i];
      list.push({
        key: `star:${s.id}`,
        label: s.name,
        sub: `${s.bayer ? s.bayer + " · " : ""}${s.constellation}`,
        onSelect: () => { centerOn(resolved.altRad, resolved.azRad, true); setSelected({ kind: "star", ...resolved }); setSearchOpen(false); },
      });
    });
    CONSTELLATIONS.forEach((c) => {
      const members = c.lines.flat().map((i) => stars[i]).filter(Boolean);
      if (members.length === 0) return;
      const avgAlt = members.reduce((a, s) => a + s.altRad, 0) / members.length;
      const avgAzX = members.reduce((a, s) => a + Math.cos(s.azRad), 0) / members.length;
      const avgAzY = members.reduce((a, s) => a + Math.sin(s.azRad), 0) / members.length;
      list.push({
        key: `const:${c.id}`,
        label: c.name,
        sub: "Constellation",
        onSelect: () => { centerOn(avgAlt, Math.atan2(avgAzY, avgAzX), false); setSearchOpen(false); },
      });
    });
    deepSky.forEach((d) =>
      list.push({
        key: `dso:${d.id}`,
        label: d.name,
        sub: d.type,
        onSelect: () => { centerOn(d.altRad, d.azRad, true); setSelected({ kind: "dso", ...d }); setSearchOpen(false); },
      }),
    );
    return list;
  }, [bodies, stars, deepSky, centerOn]);

  const centerHint = useMemo(() => {
    let best: { name: string; dist: number } | null = null;
    for (const s of stars) {
      const d = angularDistance(s.altRad, s.azRad, camera.pitch, camera.yaw);
      if (d < camera.fovV / 4 && (best == null || d < best.dist)) best = { name: s.name, dist: d };
    }
    for (const b of bodies) {
      const d = angularDistance(b.altRad, b.azRad, camera.pitch, camera.yaw);
      if (d < camera.fovV / 4 && (best == null || d < best.dist)) best = { name: b.name, dist: d };
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
        onClick={onClick}
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
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
            <span className="text-[13px] text-[var(--muted)]">Search stars, planets, constellations</span>
          </button>
          <button
            onClick={resetView}
            aria-label="Reset view"
            className="size-9 rounded-xl bg-white/6 hover:bg-white/10 flex items-center justify-center transition-colors"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12a9 9 0 1 0 3-6.7" /><path d="M3 4v5h5" />
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
        <ToggleButton active={showConstellations} onClick={() => setShowConstellations((v) => !v)} label="Lines" />
        <ToggleButton active={showLabels} onClick={() => setShowLabels((v) => !v)} label="Labels" />
      </div>

      {/* Zoom controls */}
      <div className="pointer-events-none absolute left-3 top-[calc(max(env(safe-area-inset-top),12px)+62px)] flex flex-col gap-2">
        <button onClick={() => zoom(0.75)} aria-label="Zoom in" className="pointer-events-auto glass size-10 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors">
          <span className="text-xl leading-none">+</span>
        </button>
        <button onClick={() => zoom(1.33)} aria-label="Zoom out" className="pointer-events-auto glass size-10 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors">
          <span className="text-xl leading-none">−</span>
        </button>
      </div>

      {/* Time travel + compass strip above nav */}
      <div className="pointer-events-none absolute bottom-[calc(env(safe-area-inset-bottom)+88px)] left-0 right-0 px-3 space-y-2">
        {/* Compass / FOV strip */}
        <div className="glass mx-auto max-w-md rounded-2xl px-4 py-2 flex items-center justify-between text-[12px] font-medium text-[var(--foreground)]/85">
          <span>
            {((camera.yaw * 180) / Math.PI).toFixed(0)}°{" "}
            <span className="text-[var(--muted)]">{compassLabel((camera.yaw * 180) / Math.PI)}</span>
          </span>
          <span className="text-[var(--muted)]">alt {((camera.pitch * 180) / Math.PI).toFixed(0)}°</span>
          <span className="text-[var(--muted)]">fov {((camera.fovV * 180) / Math.PI).toFixed(0)}°</span>
        </div>

        {/* Time travel bar */}
        <TimeBar
          offsetHours={timeOffsetHours}
          now={now}
          onChange={setTimeOffsetHours}
        />
      </div>

      {searchOpen && (
        <SearchOverlay items={searchItems} onClose={() => setSearchOpen(false)} />
      )}

      <ObjectInfoModal object={selected} onClose={() => setSelected(null)} onCenter={handleCenterObject} />
    </div>
  );
}

// ---- Time Travel Bar -------------------------------------------------------

function TimeBar({
  offsetHours,
  now,
  onChange,
}: {
  offsetHours: number;
  now: Date;
  onChange: (h: number) => void;
}) {
  const [showPicker, setShowPicker] = useState(false);

  const fmt = new Intl.DateTimeFormat(undefined, {
    month: "short", day: "numeric", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

  const offsetLabel =
    offsetHours === 0
      ? "Now"
      : Math.abs(offsetHours) < 24
        ? `${offsetHours > 0 ? "+" : ""}${offsetHours}h`
        : `${offsetHours > 0 ? "+" : ""}${(offsetHours / 24).toFixed(1)}d`;

  // Convert datetime-local string to offset hours from real now.
  const handlePickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.value) return;
    const picked = new Date(e.target.value);
    const diffMs = picked.getTime() - Date.now();
    onChange(Math.round(diffMs / 3_600_000));
  };

  const localDateStr = (d: Date) => {
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  return (
    <div className="pointer-events-auto glass-strong mx-auto max-w-md rounded-2xl px-4 pt-2 pb-2">
      <div className="flex items-center gap-2 mb-1.5">
        <button
          onClick={() => setShowPicker((v) => !v)}
          className="flex-1 text-left"
        >
          <span className="text-[13px] font-semibold">{fmt.format(now)}</span>
          {offsetHours !== 0 && (
            <span className="ml-2 text-[11px] text-[var(--accent-strong)] font-semibold">{offsetLabel}</span>
          )}
        </button>
        {offsetHours !== 0 && (
          <button
            onClick={() => onChange(0)}
            className="text-[11px] font-semibold text-[var(--accent-strong)] bg-[var(--accent)]/15 rounded-lg px-2.5 py-1 hover:bg-[var(--accent)]/25 transition-colors"
          >
            Back to now
          </button>
        )}
      </div>

      {showPicker && (
        <input
          type="datetime-local"
          value={localDateStr(now)}
          onChange={handlePickerChange}
          className="w-full mb-2 bg-white/8 rounded-xl px-3 py-2 text-[13px] outline-none focus:bg-white/12 text-[var(--foreground)]"
        />
      )}

      <input
        type="range"
        min={-168}
        max={168}
        step={1}
        value={offsetHours}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[var(--accent)] h-1 rounded-full cursor-pointer"
        aria-label="Time offset in hours"
      />
      <div className="flex justify-between text-[10px] text-[var(--muted)] mt-0.5 select-none">
        <span>−7 days</span>
        <span>+7 days</span>
      </div>
    </div>
  );
}

// ---- Search Overlay (top-anchored, keyboard-safe) --------------------------

function SearchOverlay({
  items,
  onClose,
}: {
  items: { key: string; label: string; sub: string; onSelect: () => void }[];
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Slight delay so the animation starts before focus triggers keyboard.
    const t = setTimeout(() => inputRef.current?.focus(), 80);
    return () => clearTimeout(t);
  }, []);

  // Close on Escape.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items.slice(0, 50);
    return items.filter(
      (i) => i.label.toLowerCase().includes(q) || i.sub.toLowerCase().includes(q),
    ).slice(0, 50);
  }, [items, query]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 fade-in" onClick={onClose} />

      {/* Panel — slides in from top, takes only as much height as content + safe areas */}
      <div className="relative z-10 flex flex-col w-full max-h-[85dvh] glass-strong shadow-[0_18px_60px_rgba(0,0,0,0.7)] sheet-down">
        {/* Search input row */}
        <div className="flex items-center gap-3 px-4 pt-[max(env(safe-area-inset-top),16px)] pb-3 border-b border-white/8">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" className="shrink-0 text-[var(--muted)]">
            <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search stars, planets, constellations…"
            className="flex-1 bg-transparent text-[15px] outline-none placeholder:text-[var(--muted)]"
          />
          <button
            onClick={onClose}
            className="shrink-0 text-[13px] font-semibold text-[var(--accent-strong)] px-1 py-1"
          >
            Cancel
          </button>
        </div>

        {/* Results */}
        <ul className="overflow-y-auto overscroll-contain divide-y divide-white/5 flex-1">
          {filtered.length === 0 && (
            <li className="py-12 text-center text-sm text-[var(--muted)]">No results.</li>
          )}
          {filtered.map((item) => (
            <li key={item.key}>
              <button
                onClick={item.onSelect}
                className="w-full text-left py-3.5 px-4 flex items-center justify-between gap-4 hover:bg-white/5 active:bg-white/8 transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-[14.5px] font-medium truncate">{item.label}</p>
                  <p className="text-[12px] text-[var(--muted)] truncate">{item.sub}</p>
                </div>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-[var(--muted)]">
                  <path d="m9 6 6 6-6 6" />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// ---- Helpers ---------------------------------------------------------------

function ToggleButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={[
        "pointer-events-auto glass rounded-full px-3 py-1.5 text-[11px] font-semibold tracking-wide uppercase transition-colors",
        active ? "text-[var(--accent-strong)] border-[var(--border-strong)]" : "text-[var(--muted)]",
      ].join(" ")}
    >
      {label}
    </button>
  );
}

function compassLabel(azDeg: number): string {
  const dirs = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  return dirs[Math.round(((azDeg % 360) + 360) % 360 / 22.5) % 16];
}
