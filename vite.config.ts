import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "icons/apple-touch-icon-180.png"],
      manifest: {
        name: "Life OS",
        short_name: "Life OS",
        description: "Your second brain. Capture anything, from a link to a meeting. Let AI organise it, then see your day, explore, ask and share.",
        id: "/",
        start_url: "/",
        scope: "/",
        display: "standalone",
        orientation: "any",
        background_color: "#FAF8F5",
        theme_color: "#5B33E8",
        categories: ["productivity", "education"],
        icons: [
          { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
        // Android Chrome lists the installed PWA in the system share sheet and opens /capture with these params.
        // iOS does not support share_target; see the capture-channel section of LifeOS-Architecture.md.
        share_target: {
          action: "/capture",
          method: "GET",
          params: { title: "title", text: "text", url: "url" },
        },
        shortcuts: [
          { name: "Capture", short_name: "Capture", url: "/capture", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
          { name: "Explore", short_name: "Explore", url: "/explore", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,webmanifest}"],
        navigateFallback: "/index.html",
        cleanupOutdatedCaches: true,
      },
      devOptions: { enabled: false },
    }),
  ],
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    css: false,
  },
});
