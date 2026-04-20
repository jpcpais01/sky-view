import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background:
            "radial-gradient(circle at 50% 35%, #1c2750 0%, #0a1230 55%, #02040d 100%)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            background:
              "radial-gradient(circle at 62% 47%, rgba(255,247,214,0.45) 0%, rgba(255,247,214,0) 38%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: 78,
            left: 92,
            width: 78,
            height: 78,
            borderRadius: "50%",
            background:
              "radial-gradient(circle at 38% 36%, #ffffff 0%, #f4ecd0 60%, #a99a78 100%)",
            boxShadow: "0 0 50px rgba(255,247,214,0.6)",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: 70,
            left: 75,
            width: 84,
            height: 84,
            borderRadius: "50%",
            background: "#0a1230",
          }}
        />
      </div>
    ),
    { ...size },
  );
}
