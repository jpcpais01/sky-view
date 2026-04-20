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

const SETUP_KEY = "skyview:setup-done";

function loadSetupDone(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(SETUP_KEY) === "true";
}
function saveSetupDone() {
  if (typeof window === "undefined") return;
  localStorage.setItem(SETUP_KEY, "true");
}

export default function SkyPage() {
  const { location, requesting, requestLocation, setManual, error: locError } =
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

  // Auto-enable on return visits when permission doesn't require a gesture.
  useEffect(() => {
    if (loadSetupDone() && orientation.permission === "granted") {
      setEnabled(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
      fovV: 1.1,
    }),
    [orientation.yaw, orientation.pitch, orientation.roll],
  );

  const enable = useCallback(
    async (useGps: boolean, manualLat?: number, manualLon?: number) => {
      if (useGps) {
        requestLocation();
      } else if (manualLat !== undefined && manualLon !== undefined) {
        setManual(manualLat, manualLon);
      }
      if (orientation.permission === "prompt") {
        await orientation.request();
      }
      saveSetupDone();
      setEnabled(true);
    },
    [orientation, requestLocation, setManual],
  );

  const onTap = (e: React.PointerEvent<HTMLDivElement>) => {
    const canvas = e.currentTarget.querySelector("canvas");
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = canvas.width / rect.width;
    const x = (e.clientX - rect.left) * dpr;
    const y = (e.clientY - rect.top) * dpr;
    const hit = canvasRef.current?.hitTest(x, y, 44 * dpr);
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

  // Show the intro overlay when sensors aren't active yet.
  // On iOS (permission === "prompt"), always show until user taps enable.
  const needsIntro =
    !enabled ||
    orientation.permission === "prompt" ||
    orientation.permission === "unsupported" ||
    !orientation.hasReading;

  // Already set up before on a device that needs a re-prompt (iOS).
  const isReturnVisit = loadSetupDone();

  return (
    <div className="fixed inset-0 overflow-hidden">
      <div className="absolute inset-0" onPointerUp={onTap}>
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
          locSource={location.source}
          locError={locError}
          locRequesting={requesting}
          isReturnVisit={isReturnVisit}
          onEnable={enable}
        />
      )}

      <ObjectInfoModal object={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

function SkyIntro({
  orientationPermission,
  locSource,
  locError,
  locRequesting,
  isReturnVisit,
  onEnable,
}: {
  orientationPermission: "granted" | "denied" | "prompt" | "unsupported";
  locSource: "geolocation" | "stored" | "default";
  locError: string | null;
  locRequesting: boolean;
  isReturnVisit: boolean;
  onEnable: (useGps: boolean, lat?: number, lon?: number) => void;
}) {
  const [locMode, setLocMode] = useState<"gps" | "manual">(
    locSource !== "default" ? "gps" : "gps",
  );
  const [latStr, setLatStr] = useState("");
  const [lonStr, setLonStr] = useState("");
  const [coordError, setCoordError] = useState("");

  const handleEnable = () => {
    if (locMode === "manual") {
      const lat = parseFloat(latStr);
      const lon = parseFloat(lonStr);
      if (isNaN(lat) || lat < -90 || lat > 90) {
        setCoordError("Latitude must be between -90 and 90.");
        return;
      }
      if (isNaN(lon) || lon < -180 || lon > 180) {
        setCoordError("Longitude must be between -180 and 180.");
        return;
      }
      setCoordError("");
      onEnable(false, lat, lon);
    } else {
      onEnable(true);
    }
  };

  // Compact return-visit prompt (iOS needs a gesture each session for sensors).
  if (isReturnVisit && orientationPermission === "prompt") {
    return (
      <div className="absolute inset-0 flex items-end sm:items-center justify-center pb-[calc(env(safe-area-inset-bottom)+104px)] px-4">
        <div className="absolute inset-0 bg-black/30" />
        <div className="glass-strong relative z-10 rounded-3xl p-5 max-w-md w-full float-in flex items-center gap-4">
          <div className="size-10 rounded-xl bg-[rgba(122,162,255,0.18)] border border-[var(--border-strong)] flex items-center justify-center shrink-0">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#a8c4ff" strokeWidth={1.7} strokeLinecap="round">
              <path d="M12 2v3M2 12h3M19 12h3M4.6 4.6l2.1 2.1M17.3 17.3l2.1 2.1" />
              <circle cx="12" cy="12" r="3.5" />
              <path d="M15 21a3 3 0 0 1-6 0" />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-semibold">Tap to activate compass</p>
            <p className="text-[11px] text-[var(--muted)]">Sensors need your permission each session.</p>
          </div>
          <button
            onClick={handleEnable}
            className="shrink-0 rounded-2xl px-4 py-2.5 text-[13px] font-semibold bg-[var(--accent)] text-[#06091e] hover:bg-[var(--accent-strong)] transition-colors"
          >
            Enable
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 flex items-end sm:items-center justify-center p-4 pb-[calc(env(safe-area-inset-bottom)+96px)]">
      <div className="absolute inset-0 bg-black/50" />
      <div className="glass-strong relative z-10 rounded-3xl p-6 max-w-md w-full float-in">
        <div className="size-12 rounded-2xl bg-[rgba(122,162,255,0.18)] border border-[var(--border-strong)] flex items-center justify-center mb-4">
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#a8c4ff" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2v3M2 12h3M19 12h3M4.6 4.6l2.1 2.1M17.3 17.3l2.1 2.1" />
            <circle cx="12" cy="12" r="3.5" />
            <path d="M15 21a3 3 0 0 1-6 0" />
          </svg>
        </div>

        <h2 className="text-xl font-semibold">Point at the sky</h2>
        <p className="mt-1.5 text-[14px] text-[var(--foreground)]/80 leading-relaxed">
          Sky View uses your compass and tilt sensors to overlay the sky. Hold the phone vertically and point the top at any star.
        </p>

        {/* Location section */}
        <div className="mt-4 rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
          <div className="px-4 pt-3 pb-2">
            <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--muted)] font-semibold mb-2">
              Your location
            </p>
            <div className="flex gap-2">
              <LocTab active={locMode === "gps"} onClick={() => setLocMode("gps")}>
                GPS
              </LocTab>
              <LocTab active={locMode === "manual"} onClick={() => setLocMode("manual")}>
                Manual
              </LocTab>
            </div>
          </div>

          {locMode === "gps" ? (
            <div className="px-4 pb-4 pt-1 text-[13px] text-[var(--foreground)]/75">
              Your location will be detected automatically and saved on-device. Nothing is uploaded.
            </div>
          ) : (
            <div className="px-4 pb-4 pt-1 space-y-2">
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="block text-[11px] text-[var(--muted)] mb-1">Latitude (−90 to 90)</label>
                  <input
                    type="number"
                    inputMode="decimal"
                    placeholder="e.g. 51.5"
                    value={latStr}
                    onChange={(e) => setLatStr(e.target.value)}
                    className="w-full bg-white/8 rounded-xl px-3 py-2 text-[13px] outline-none focus:bg-white/12 placeholder:text-[var(--muted)]"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-[11px] text-[var(--muted)] mb-1">Longitude (−180 to 180)</label>
                  <input
                    type="number"
                    inputMode="decimal"
                    placeholder="e.g. -0.1"
                    value={lonStr}
                    onChange={(e) => setLonStr(e.target.value)}
                    className="w-full bg-white/8 rounded-xl px-3 py-2 text-[13px] outline-none focus:bg-white/12 placeholder:text-[var(--muted)]"
                  />
                </div>
              </div>
              {coordError && (
                <p className="text-[12px] text-[#ffaf68]">{coordError}</p>
              )}
            </div>
          )}
        </div>

        {orientationPermission === "unsupported" && (
          <p className="mt-3 text-[13px] text-[#ffaf68]">
            This device doesn&rsquo;t expose orientation sensors. Try the Explore tab to pan the sky freely.
          </p>
        )}
        {locError && locMode === "gps" && (
          <p className="mt-3 text-[13px] text-[#ffaf68]">{locError}</p>
        )}

        <button
          onClick={handleEnable}
          disabled={locRequesting}
          className="mt-4 w-full rounded-2xl py-3.5 text-sm font-semibold bg-[var(--accent)] text-[#06091e] hover:bg-[var(--accent-strong)] transition-colors disabled:opacity-70"
        >
          {locRequesting ? "Getting location…" : "Enable sensors"}
        </button>
        <p className="mt-2 text-[11px] text-[var(--muted)] text-center">
          Your choices are saved — you won&rsquo;t be asked again.
        </p>
      </div>
    </div>
  );
}

function LocTab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={[
        "flex-1 rounded-lg py-2 text-[12px] font-semibold transition-colors",
        active
          ? "bg-[var(--accent)] text-[#06091e]"
          : "bg-white/8 text-[var(--muted)] hover:bg-white/12",
      ].join(" ")}
    >
      {children}
    </button>
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
    loc.source === "geolocation" || loc.source === "stored"
      ? ""
      : " · default";
  return `${lat} · ${lon}${src}`;
}
