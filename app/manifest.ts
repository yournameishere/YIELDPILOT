import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "YieldPilot AI",
    short_name: "YieldPilot",
    description: "Autonomous DeFi yield manager with live risk scoring and OpenAI strategy reasoning.",
    start_url: "/",
    display: "standalone",
    background_color: "#050505",
    theme_color: "#2196f3",
    icons: [
      {
        src: "/icon.svg",
        sizes: "180x180",
        type: "image/svg+xml",
      },
      {
        src: "/apple-icon.png",
        sizes: "180x180",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
