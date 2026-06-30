import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    background_color: "#f5f4ee",
    categories: ["business", "food", "productivity"],
    description: "Gestao operacional e administrativa para restaurantes no Brasil.",
    display: "standalone",
    icons: [
      {
        purpose: "any",
        sizes: "192x192",
        src: "/icons/icon-192.svg",
        type: "image/svg+xml"
      },
      {
        purpose: "any",
        sizes: "512x512",
        src: "/icons/icon-512.svg",
        type: "image/svg+xml"
      },
      {
        purpose: "maskable",
        sizes: "512x512",
        src: "/icons/icon-maskable.svg",
        type: "image/svg+xml"
      }
    ],
    id: "/",
    lang: "pt-BR",
    name: "Restaurant Brasil",
    orientation: "portrait",
    scope: "/",
    short_name: "Restaurant",
    start_url: "/login",
    theme_color: "#313925"
  };
}
