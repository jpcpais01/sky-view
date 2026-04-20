"use client";

import { useEffect, useState } from "react";

export type LocationState = {
  lat: number;
  lon: number;
  source: "geolocation" | "stored" | "default";
  accuracy?: number;
};

const DEFAULT_LOCATION: LocationState = {
  // Greenwich, a sensible "neutral" default if geolocation is denied.
  lat: 51.4779,
  lon: -0.0015,
  source: "default",
};

const STORAGE_KEY = "skyview:location";

function loadStored(): LocationState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed.lat !== "number" || typeof parsed.lon !== "number") {
      return null;
    }
    return { lat: parsed.lat, lon: parsed.lon, source: "stored" };
  } catch {
    return null;
  }
}

function persist(state: LocationState) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ lat: state.lat, lon: state.lon }),
    );
  } catch {
    // ignore quota errors
  }
}

export function useLocation() {
  const [location, setLocation] = useState<LocationState>(() => {
    if (typeof window === "undefined") return DEFAULT_LOCATION;
    return loadStored() ?? DEFAULT_LOCATION;
  });
  const [requesting, setRequesting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestLocation = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setError("Location is not available on this device.");
      return;
    }
    setRequesting(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const next: LocationState = {
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          source: "geolocation",
          accuracy: pos.coords.accuracy,
        };
        persist(next);
        setLocation(next);
        setRequesting(false);
      },
      (err) => {
        setError(err.message || "Location request was denied.");
        setRequesting(false);
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 5 * 60 * 1000 },
    );
  };

  // Auto-attempt once if previously granted.
  useEffect(() => {
    if (typeof navigator === "undefined") return;
    const perms = (navigator as Navigator & {
      permissions?: { query: (q: { name: string }) => Promise<{ state: string }> };
    }).permissions;
    if (!perms?.query) return;
    perms
      .query({ name: "geolocation" })
      .then((status) => {
        if (status.state === "granted") requestLocation();
      })
      .catch(() => {});
  }, []);

  const setManual = (lat: number, lon: number) => {
    const next: LocationState = { lat, lon, source: "stored" };
    persist(next);
    setLocation(next);
    setError(null);
  };

  return { location, requesting, error, requestLocation, setManual };
}
