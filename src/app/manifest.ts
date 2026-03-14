import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "פלוגת דותן",
    short_name: "דותן",
    description: "מערכת ניהול פלוגת דותן",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#f0faf5",
    theme_color: "#2d5a27",
    orientation: "portrait",
    icons: [
      {
        src: "/dotanLogo.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/dotanLogo.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
