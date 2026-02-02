import sitemap from "@astrojs/sitemap";
import AstroPWA from "@vite-pwa/astro";
import { defineConfig } from "astro/config";

// https://astro.build/config
export default defineConfig({
  site: "https://arcade-cabinet.github.io",
  base: "/psyducks-infinite-headache",
  integrations: [
    sitemap(),
    AstroPWA({
      registerType: "autoUpdate",
      manifest: {
        name: "Psyduck's Infinite Headache",
        short_name: "Psyduck",
        description: "Psyduck's Infinite Headache - A stacking game where the headache never ends",
        theme_color: "#4A148C",
        background_color: "#4A148C",
        display: "standalone",
        icons: [
          {
            src: "/psyducks-infinite-headache/icons/icon-192x192.svg",
            sizes: "192x192",
            type: "image/svg+xml",
          },
          {
            src: "/psyducks-infinite-headache/icons/icon-512x512.svg",
            sizes: "512x512",
            type: "image/svg+xml",
          },
          {
            src: "/psyducks-infinite-headache/icons/icon-192x192.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{css,js,html,svg,png,ico,txt}"],
      },
      devOptions: {
        enabled: true,
      },
    }),
  ],
  vite: {
    build: {
      sourcemap: process.env.NODE_ENV !== "production",
    },
  },
});
