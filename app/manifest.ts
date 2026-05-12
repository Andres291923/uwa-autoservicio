import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Autoservicio ÜWA",
    short_name: "ÜWA",
    description: "Tótem de autoservicio ÜWA",
    start_url: "/",
    scope: "/",
    display: "fullscreen",
    orientation: "landscape",
    background_color: "#10B557",
    theme_color: "#10B557",
    icons: [
      {
        src: "/icons/icon-192.svg",
        sizes: "192x192",
        type: "image/svg+xml",
        purpose: "any maskable",
      },
      {
        src: "/icons/icon-512.svg",
        sizes: "512x512",
        type: "image/svg+xml",
        purpose: "any maskable",
      },
    ],
  };
}
