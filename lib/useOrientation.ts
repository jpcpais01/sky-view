"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { DEG } from "./astronomy";

export type OrientationState = {
  yaw: number; // azimuth, radians (0 = N, +E)
  pitch: number; // altitude, radians (0 = horizon, +up)
  roll: number; // radians (0 = phone vertical, "up" toward sky)
  hasReading: boolean;
  /** True if the browser's compass has had a chance to settle (alpha is absolute or webkit heading present). */
  absolute: boolean;
};

type OrientationHook = OrientationState & {
  permission: "granted" | "denied" | "prompt" | "unsupported";
  request: () => Promise<void>;
};

const DEFAULT: OrientationState = {
  yaw: 0,
  pitch: 0,
  roll: 0,
  hasReading: false,
  absolute: false,
};

function detectInitialPermission():
  | "granted"
  | "denied"
  | "prompt"
  | "unsupported" {
  if (typeof window === "undefined") return "prompt";
  if (!("DeviceOrientationEvent" in window)) return "unsupported";
  const requires =
    typeof (
      DeviceOrientationEvent as unknown as {
        requestPermission?: () => Promise<string>;
      }
    ).requestPermission === "function";
  return requires ? "prompt" : "granted";
}

export function useOrientation(enabled: boolean): OrientationHook {
  const [state, setState] = useState<OrientationState>(DEFAULT);
  const [permission, setPermission] = useState<
    "granted" | "denied" | "prompt" | "unsupported"
  >(() => detectInitialPermission());
  const targetRef = useRef<OrientationState>(DEFAULT);
  const rafRef = useRef<number>(0);
  const screenAngleRef = useRef<number>(0);

  // Listen for screen orientation so we can compensate.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const update = () => {
      const so = window.screen?.orientation;
      const angle = (so?.angle ?? (window as unknown as { orientation?: number }).orientation ?? 0) as number;
      screenAngleRef.current = angle;
    };
    update();
    window.addEventListener("orientationchange", update);
    window.screen?.orientation?.addEventListener?.("change", update);
    return () => {
      window.removeEventListener("orientationchange", update);
      window.screen?.orientation?.removeEventListener?.("change", update);
    };
  }, []);

  // Listener wiring.
  useEffect(() => {
    if (!enabled) return;
    if (permission !== "granted") return;
    if (typeof window === "undefined") return;

    const handler = (event: DeviceOrientationEvent) => {
      const out = orientationToCamera(
        event,
        screenAngleRef.current,
      );
      if (!out) return;
      targetRef.current = out;
      if (!state.hasReading) {
        // First reading — snap immediately so the camera doesn't whip from 0.
        setState(out);
      }
    };

    const eventName: keyof WindowEventMap =
      "ondeviceorientationabsolute" in window
        ? ("deviceorientationabsolute" as keyof WindowEventMap)
        : ("deviceorientation" as keyof WindowEventMap);

    window.addEventListener(eventName, handler as EventListener, true);
    return () =>
      window.removeEventListener(eventName, handler as EventListener, true);
  }, [enabled, permission, state.hasReading]);

  // Smoothing loop (target → state)
  useEffect(() => {
    if (!enabled) return;
    const loop = () => {
      const target = targetRef.current;
      setState((prev) => {
        if (!target.hasReading) return prev;
        const t = 0.28;
        // Only dampen yaw/roll near the zenith/nadir where gimbal lock makes
        // them unreliable. Below ~60° pitch they track at full speed; between
        // 60° and ~84° they fade to zero.
        const pitchAbs = Math.abs(target.pitch);
        const fadeStart = Math.PI / 3; // 60°
        const fadeEnd = Math.PI / 2 - 0.1; // ~84°
        const yawScale =
          pitchAbs <= fadeStart
            ? 1
            : pitchAbs >= fadeEnd
              ? 0
              : (fadeEnd - pitchAbs) / (fadeEnd - fadeStart);
        const dampedT = t * yawScale;
        return {
          hasReading: true,
          absolute: target.absolute,
          yaw: yawScale > 0
            ? lerpAngle(prev.yaw, target.yaw, dampedT)
            : prev.yaw,
          pitch: lerp(prev.pitch, target.pitch, t),
          roll: yawScale > 0
            ? lerpAngle(prev.roll, target.roll, dampedT)
            : prev.roll,
        };
      });
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [enabled]);

  const request = useCallback(async () => {
    if (typeof window === "undefined") return;
    const ctor = DeviceOrientationEvent as unknown as {
      requestPermission?: () => Promise<string>;
    };
    if (typeof ctor.requestPermission === "function") {
      try {
        const result = await ctor.requestPermission();
        setPermission(result === "granted" ? "granted" : "denied");
      } catch {
        setPermission("denied");
      }
    } else {
      setPermission("granted");
    }
  }, []);

  return { ...state, permission, request };
}

function orientationToCamera(
  e: DeviceOrientationEvent,
  screenAngle: number,
): OrientationState | null {
  // Use webkitCompassHeading on iOS for absolute heading.
  const webkit = (e as DeviceOrientationEvent & {
    webkitCompassHeading?: number;
  }).webkitCompassHeading;

  let alpha = e.alpha; // 0..360, degrees
  const beta = e.beta; // -180..180
  const gamma = e.gamma; // -90..90

  if (alpha == null || beta == null || gamma == null) return null;

  let absolute = e.absolute === true;
  if (typeof webkit === "number" && !Number.isNaN(webkit)) {
    // webkitCompassHeading is the heading clockwise from north.
    alpha = (360 - webkit + 360) % 360;
    absolute = true;
  }

  // Convert browser device orientation to camera yaw/pitch/roll.
  // Convention used: the user is holding the phone in portrait, screen facing
  // them, top of phone pointing up. The "look direction" is out of the back of
  // the phone.
  const a = alpha * DEG; // around z (compass)
  const b = beta * DEG; // around x (front-back tilt)
  const g = gamma * DEG; // around y (left-right tilt)

  // Rotation matrix from device to world (Z-X-Y intrinsic Tait-Bryan).
  const cA = Math.cos(a), sA = Math.sin(a);
  const cB = Math.cos(b), sB = Math.sin(b);
  const cG = Math.cos(g), sG = Math.sin(g);

  // Device "look" axis is -Z of phone. In world coords:
  // R = Rz(a) * Rx(b) * Ry(g)
  // We want the back of phone direction in world frame.
  // Following standard formulas (W3C orientation spec):
  const m11 = cA * cG - sA * sB * sG;
  const m12 = -sA * cB;
  const m13 = cA * sG + sA * sB * cG;
  const m21 = sA * cG + cA * sB * sG;
  const m22 = cA * cB;
  const m23 = sA * sG - cA * sB * cG;
  const m31 = -cB * sG;
  const m32 = sB;
  const m33 = cB * cG;

  // The back-camera direction is the -Z of the phone, which in world frame is
  // column 3 of R negated:
  const dx = -m13;
  const dy = -m23;
  const dz = -m33;
  void m11; void m12; void m21; void m22; void m31; void m32;
  // World axes per W3C: X=East, Y=North, Z=Up.
  // We want yaw measured from north clockwise (compass).
  // World East: dx, North: dy, Up: dz
  const horiz = Math.sqrt(dx * dx + dy * dy);
  let yaw = Math.atan2(dx, dy); // 0 when pointing N, +π/2 when E
  if (yaw < 0) yaw += Math.PI * 2;
  const pitch = Math.atan2(dz, horiz);

  // Compensate for screen rotation (the phone is held landscape, etc).
  // Roll: angle around the camera optical axis. Use the phone's "up" (top of screen)
  // direction projected into the plane perpendicular to look vector.
  // Phone "up" axis = +Y of phone in world coords = column 2 of R:
  const ux = m12;
  const uy = m22;
  const uz = m32;
  // Project u onto the camera image plane (perp to look dir).
  const dot = ux * dx + uy * dy + uz * dz;
  const upx = ux - dot * dx;
  const upy = uy - dot * dy;
  const upz = uz - dot * dz;
  // We need to compute the angle between this "up in image plane" and the
  // local zenith projected into the same plane (so a level horizon is roll=0).
  // Local zenith in world: (0,0,1). Project to plane perp to look:
  const zdot = dz; // (0,0,1)·look
  const zx = -zdot * dx;
  const zy = -zdot * dy;
  const zz = 1 - zdot * dz;
  // Roll: signed angle from zenith-up to phone-up around look axis.
  // Compute cross product to get sign.
  const cross_x = zy * upz - zz * upy;
  const cross_y = zz * upx - zx * upz;
  const cross_z = zx * upy - zy * upx;
  const sign = cross_x * dx + cross_y * dy + cross_z * dz;
  const upMag = Math.sqrt(upx * upx + upy * upy + upz * upz) || 1;
  const zMag = Math.sqrt(zx * zx + zy * zy + zz * zz);
  // zMag → 0 when looking straight up/down (zenith/nadir singularity).
  // Roll is undefined there — return 0 and let the smoothing loop hold it.
  let roll = 0;
  if (zMag > 0.1) {
    const cosRoll = (upx * zx + upy * zy + upz * zz) / (upMag * zMag);
    roll = Math.acos(Math.max(-1, Math.min(1, cosRoll)));
    if (sign < 0) roll = -roll;
  }

  // Apply screen rotation compensation.
  roll += (screenAngle * Math.PI) / 180;

  return { yaw, pitch, roll, hasReading: true, absolute };
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function lerpAngle(a: number, b: number, t: number) {
  let diff = b - a;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return a + diff * t;
}
