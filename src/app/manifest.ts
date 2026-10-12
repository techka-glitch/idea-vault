import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Idea Vault",
    short_name: "Ideas",
    description: "Personal ideas, projects and lists.",
    start_url: "/",
    display: "standalone",
    background_color: "#FFF8F4",
    theme_color: "#EB518F",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
