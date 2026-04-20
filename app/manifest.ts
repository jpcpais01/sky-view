import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Sky View — Astronomy",
    short_name: "Sky View",
    description:
      "A pocket planetarium. Point your phone at the sky to identify stars, planets, and constellations in real time.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#05060f",
    theme_color: "#05060f",
    categories: ["education", "utilities", "lifestyle"],
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icon",
        sizes: "256x256",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/apple-icon",
        sizes: "180x180",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
