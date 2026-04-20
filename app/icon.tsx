import { ImageResponse } from "next/og";

export const size = { width: 256, height: 256 };
export const contentType = "image/png";

export default function Icon() {
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
          borderRadius: 56,
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
            top: 122,
            left: 142,
            width: 110,
            height: 110,
            borderRadius: "50%",
            background:
              "radial-gradient(circle at 38% 36%, #ffffff 0%, #f4ecd0 60%, #a99a78 100%)",
            boxShadow: "0 0 60px rgba(255,247,214,0.55)",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: 110,
            left: 118,
            width: 118,
            height: 118,
            borderRadius: "50%",
            background:
              "radial-gradient(circle at 50% 50%, #0a1230 0%, #0a1230 100%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: 32,
            left: 40,
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: "#ffffff",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: 70,
            left: 80,
            width: 4,
            height: 4,
            borderRadius: "50%",
            background: "#cfd8ff",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: 196,
            left: 60,
            width: 5,
            height: 5,
            borderRadius: "50%",
            background: "#ffffff",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: 220,
            left: 200,
            width: 4,
            height: 4,
            borderRadius: "50%",
            background: "#ffd9a8",
          }}
        />
      </div>
    ),
    { ...size },
  );
}
