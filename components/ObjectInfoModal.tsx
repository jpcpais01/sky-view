"use client";

import { useEffect, useMemo } from "react";
import type { SkyObject } from "@/components/SkyCanvas";
import { CONSTELLATIONS } from "@/lib/catalog";
import { RAD } from "@/lib/astronomy";

type Props = {
  object: SkyObject | null;
  onClose: () => void;
  onCenter?: (object: SkyObject) => void;
};

export default function ObjectInfoModal({ object, onClose, onCenter }: Props) {
  useEffect(() => {
    if (!object) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [object, onClose]);

  const data = useMemo(() => describe(object), [object]);
  if (!object || !data) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center pointer-events-none">
      <div
        className="absolute inset-0 bg-black/40 fade-in pointer-events-auto"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={data.title}
        className="glass-strong sheet-up pointer-events-auto relative w-full max-w-md mx-3 mb-[max(env(safe-area-inset-bottom),12px)] rounded-3xl overflow-hidden shadow-[0_18px_50px_rgba(0,0,0,0.6)]"
      >
        <div className="h-1 w-10 bg-white/20 rounded-full mx-auto mt-2" />

        <header className="px-5 pt-3 pb-2">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--accent-strong)]/80 font-semibold">
                {data.kindLabel}
              </p>
              <h2 className="text-2xl font-semibold leading-tight truncate">
                {data.title}
              </h2>
              {data.subtitle && (
                <p className="text-sm text-[var(--muted)] mt-0.5 truncate">
                  {data.subtitle}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              aria-label="Close"
              className="shrink-0 rounded-full size-9 flex items-center justify-center bg-white/5 hover:bg-white/10 transition-colors"
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
                <path d="m6 6 12 12M18 6 6 18" />
              </svg>
            </button>
          </div>
        </header>

        {data.description && (
          <p className="px-5 text-[15px] leading-relaxed text-[var(--foreground)]/90">
            {data.description}
          </p>
        )}

        <dl className="px-5 mt-4 grid grid-cols-2 gap-x-4 gap-y-3">
          {data.facts.map((f) => (
            <div key={f.label} className="min-w-0">
              <dt className="text-[11px] uppercase tracking-wider text-[var(--muted)] font-medium">
                {f.label}
              </dt>
              <dd className="text-[15px] font-medium tabular-nums truncate">
                {f.value}
              </dd>
            </div>
          ))}
        </dl>

        <div className="px-5 pb-5 pt-5 flex gap-2">
          {onCenter && (
            <button
              onClick={() => onCenter(object)}
              className="flex-1 rounded-2xl py-3 text-sm font-semibold bg-[var(--accent)]/90 text-[#06091e] hover:bg-[var(--accent)] transition-colors"
            >
              Center view
            </button>
          )}
          <button
            onClick={onClose}
            className="flex-1 rounded-2xl py-3 text-sm font-semibold bg-white/8 hover:bg-white/12 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

type Fact = { label: string; value: string };

type Described = {
  title: string;
  subtitle?: string;
  kindLabel: string;
  description?: string;
  facts: Fact[];
};

function describe(object: SkyObject | null): Described | null {
  if (!object) return null;
  const altDeg = object.altRad * RAD;
  const azDeg = ((object.azRad * RAD) % 360 + 360) % 360;
  const altLine = `${altDeg.toFixed(1)}°`;
  const azLine = `${azDeg.toFixed(1)}° (${compass(azDeg)})`;

  if (object.kind === "star") {
    const constellation = object.constellation;
    const constInfo = CONSTELLATIONS.find((c) => c.name === constellation);
    return {
      title: object.name,
      subtitle: object.bayer
        ? `${object.bayer} · ${constellation}`
        : constellation,
      kindLabel: "Star",
      description:
        object.description ??
        constInfo?.description ??
        `A naked-eye star in ${constellation}.`,
      facts: [
        { label: "Magnitude", value: object.mag.toFixed(2) },
        { label: "Spectral", value: object.spectral ?? "—" },
        {
          label: "Distance",
          value:
            object.distanceLy != null
              ? `${object.distanceLy.toLocaleString()} ly`
              : "—",
        },
        { label: "Constellation", value: constellation },
        { label: "Altitude", value: altLine },
        { label: "Azimuth", value: azLine },
      ],
    };
  }

  if (object.kind === "dso") {
    return {
      title: object.name,
      subtitle: object.type,
      kindLabel: "Deep-sky object",
      description: object.description,
      facts: [
        { label: "Type", value: object.type },
        { label: "Magnitude", value: object.mag.toFixed(2) },
        { label: "Altitude", value: altLine },
        { label: "Azimuth", value: azLine },
      ],
    };
  }

  // Solar System body
  return {
    title: object.name,
    subtitle:
      object.kind === "sun"
        ? "Our star"
        : object.kind === "moon"
          ? "Earth's moon"
          : "Planet",
    kindLabel:
      object.kind === "sun"
        ? "Star"
        : object.kind === "moon"
          ? "Moon"
          : "Planet",
    description: object.description,
    facts: [
      { label: "Magnitude", value: object.mag.toFixed(2) },
      ...Object.entries(object.extra ?? {}).map(([k, v]) => ({
        label: k,
        value: v,
      })),
      { label: "Altitude", value: altLine },
      { label: "Azimuth", value: azLine },
    ],
  };
}

function compass(azDeg: number): string {
  const dirs = [
    "N",
    "NNE",
    "NE",
    "ENE",
    "E",
    "ESE",
    "SE",
    "SSE",
    "S",
    "SSW",
    "SW",
    "WSW",
    "W",
    "WNW",
    "NW",
    "NNW",
  ];
  const idx = Math.round(azDeg / 22.5) % 16;
  return dirs[idx];
}
