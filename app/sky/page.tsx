"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import SkyCanvas, {
  type SkyCanvasHandle,
  type SkyObject,
} from "@/components/SkyCanvas";
import ObjectInfoModal from "@/components/ObjectInfoModal";
import {
  resolveDeepSky,
  resolveSolarSystem,
  resolveStars,
  type Camera,
} from "@/lib/astronomy";
import { useLocation } from "@/lib/useLocation";
import { useOrientation } from "@/lib/useOrientation";

export default function SkyPage() {
  const { location, requesting, requestLocation, error: locError } =
    useLocation();
  const [enabled, setEnabled] = useState(false);
  const orientation = useOrientation(enabled);
  const [now, setNow] = useState(() => new Date());
  const [selected, setSelected] = useState<SkyObject | null>(null);
  const [showConstellations, setShowConstellations] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const canvasRef = useRef<SkyCanvasHandle | null>(null);

  // Refresh sky positions every 10s.
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 10000);
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

  const camera: Camera = useMemo(
    () => ({
      yaw: orientation.yaw,
      pitch: orientation.pitch,
      roll: orientation.roll,
      fovV: 1.1, // ~63°
    }),
    [orientation.yaw, orientation.pitch, orientation.roll],
  );

  const enable = useCallback(async () => {
    if (orientation.permission === "prompt") {
      await orientation.request();
    }
    if (location.source === "default") {
      requestLocation();
    }
    setEnabled(true);
  }, [orientation, location.source, requestLocation]);

  const onTap = (e: React.PointerEvent<HTMLDivElement>) => {
    const canvas = e.currentTarget.querySelector("canvas");
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = canvas.width / rect.width;
    const x = (e.clientX - rect.left) * dpr;
    const y = (e.clientY - rect.top) * dpr;
    const hit = canvasRef.current?.hitTest(x, y);
    if (hit) setSelected(hit);
  };

  const headingLabel = useMemo(() => {
    const az = ((orientation.yaw * 180) / Math.PI + 360) % 360;
    const alt = (orientation.pitch * 180) / Math.PI;
    return {
      heading: `${az.toFixed(0)}° ${compass(az)}`,
      altitude: `${alt >= 0 ? "+" : ""}${alt.toFixed(0)}°`,
    };
  }, [orientation.yaw, orientation.pitch]);

  const needsIntro =
    !enabled ||
    orientation.permission === "prompt" ||
    orientation.permission === "unsupported" ||
    !orientation.hasReading;

  return (
    <div className="fixed inset-0 overflow-hidden">
      <div
        className="absolute inset-0"
        onPointerUp={onTap}
      >
        <SkyCanvas
          ref={canvasRef}
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
        <div className="pointer-events-auto glass-strong mx-auto max-w-md rounded-2xl px-4 py-2.5 flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] uppercase tracking-[0.22em] text-[var(--accent-strong)]/80 font-semibold">
              Live sky
            </p>
            <p className="text-[13px] font-medium truncate">
              {locationLabel(location)}
            </p>
          </div>
          <div className="text-right tabular-nums">
            <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--muted)]">
              Heading
            </p>
            <p className="text-[13px] font-semibold">
              {headingLabel.heading}
              <span className="text-[var(--muted)] ml-1">
                {headingLabel.altitude}
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Side toggles */}
      <div className="pointer-events-none absolute right-3 top-[calc(max(env(safe-area-inset-top),12px)+70px)] flex flex-col gap-2">
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

      {/* Intro / permissions overlay */}
      {needsIntro && (
        <SkyIntro
          orientationPermission={orientation.permission}
          locError={locError}
          locRequesting={requesting}
          onEnable={enable}
        />
      )}

      <ObjectInfoModal object={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

function SkyIntro({
  orientationPermission,
  locError,
  locRequesting,
  onEnable,
}: {
  orientationPermission: "granted" | "denied" | "prompt" | "unsupported";
  locError: string | null;
  locRequesting: boolean;
  onEnable: () => void;
}) {
  return (
    <div className="absolute inset-0 flex items-end sm:items-center justify-center p-4 pb-[calc(env(safe-area-inset-bottom)+96px)]">
      <div className="absolute inset-0 bg-black/45" />
      <div className="glass-strong relative z-10 rounded-3xl p-6 max-w-md w-full float-in">
        <div className="size-12 rounded-2xl bg-[rgba(122,162,255,0.18)] border border-[var(--border-strong)] flex items-center justify-center mb-4">
          <svg
            viewBox="0 0 24 24"
            width="24"
            height="24"
            fill="none"
            stroke="#a8c4ff"
            strokeWidth={1.7}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 2v3M2 12h3M19 12h3M4.6 4.6l2.1 2.1M17.3 17.3l2.1 2.1" />
            <circle cx="12" cy="12" r="3.5" />
            <path d="M15 21a3 3 0 0 1-6 0" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold">Point at the sky</h2>
        <p className="mt-2 text-[14.5px] text-[var(--foreground)]/85 leading-relaxed">
          Sky View uses your phone&rsquo;s compass and tilt sensors to show what
          you&rsquo;re pointing at. It also needs your rough location to compute
          what&rsquo;s visible right now.
        </p>

        <ul className="mt-4 space-y-2 text-[13.5px] text-[var(--foreground)]/85">
          <li className="flex items-start gap-2">
            <Dot />
            Hold the phone vertically, top edge pointing at the sky.
          </li>
          <li className="flex items-start gap-2">
            <Dot />
            Calibrate the compass by moving your phone in a figure-eight.
          </li>
          <li className="flex items-start gap-2">
            <Dot />
            For night observing, enable dark mode or dim your screen.
          </li>
        </ul>

        {orientationPermission === "unsupported" && (
          <p className="mt-4 text-[13px] text-[#ffaf68]">
            This device doesn&rsquo;t expose orientation sensors to the
            browser. Try the Explore tab instead — you can pan the sky freely.
          </p>
        )}
        {locError && (
          <p className="mt-3 text-[13px] text-[#ffaf68]">{locError}</p>
        )}

        <button
          onClick={onEnable}
          disabled={locRequesting}
          className="mt-5 w-full rounded-2xl py-3.5 text-sm font-semibold bg-[var(--accent)] text-[#06091e] hover:bg-[var(--accent-strong)] transition-colors disabled:opacity-70"
        >
          {locRequesting ? "Getting location…" : "Enable sensors"}
        </button>
        <p className="mt-2 text-[11px] text-[var(--muted)] text-center">
          Nothing is uploaded. Your location stays on-device.
        </p>
      </div>
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

function Dot() {
  return (
    <span className="mt-[7px] size-1.5 rounded-full bg-[var(--accent)] shrink-0" />
  );
}

function compass(azDeg: number): string {
  const dirs = [
    "N", "NNE", "NE", "ENE",
    "E", "ESE", "SE", "SSE",
    "S", "SSW", "SW", "WSW",
    "W", "WNW", "NW", "NNW",
  ];
  return dirs[Math.round(azDeg / 22.5) % 16];
}

function locationLabel(loc: { lat: number; lon: number; source: string }): string {
  const lat = `${Math.abs(loc.lat).toFixed(2)}°${loc.lat >= 0 ? "N" : "S"}`;
  const lon = `${Math.abs(loc.lon).toFixed(2)}°${loc.lon >= 0 ? "E" : "W"}`;
  const src =
    loc.source === "geolocation"
      ? ""
      : loc.source === "default"
        ? " · default"
        : " · saved";
  return `${lat} · ${lon}${src}`;
}
