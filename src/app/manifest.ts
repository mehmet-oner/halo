import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Halo",
    short_name: "Halo",
    description: "Status sharing for close circles",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    icons: [
      {
        src: "/icons/halo-icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icons/halo-icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/icons/halo-icon-1024.png",
        sizes: "1024x1024",
        type: "image/png",
      },
    ],
  };
}
