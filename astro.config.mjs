import sitemap from "@astrojs/sitemap";
import { defineConfig } from "astro/config";
import AstroPWA from "@vite-pwa/astro";

// https://astro.build/config
export default defineConfig({
  site: "https://arcade-cabinet.github.io",
  base: "/psyduck-stsck",
  integrations: [
    sitemap(),
    AstroPWA({
      registerType: "autoUpdate",
      manifest: {
        name: "Psyduck Stack",
        short_name: "Psyduck",
        description: "Psyduck's Infinite Headache Tower - A stacking game",
        theme_color: "#4A148C",
        background_color: "#4A148C",
        display: "standalone",
        icons: [
          {
            src: "/psyduck-stsck/icons/icon-192x192.svg",
            sizes: "192x192",
            type: "image/svg+xml",
          },
          {
            src: "/psyduck-stsck/icons/icon-512x512.svg",
            sizes: "512x512",
            type: "image/svg+xml",
          },
          {
            src: "/psyduck-stsck/icons/icon-192x192.svg",
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
      sourcemap: true,
    },
  },
});
