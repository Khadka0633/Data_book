import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // Auto-updates the SW in the background when a new version is deployed
      registerType: "autoUpdate",

      // Precache ALL build output files — this is what makes the app
      // load from cache when offline instead of showing a blank screen
      includeAssets: ["favicon.ico", "apple-touch-icon.png", "*.png", "*.svg"],

      // Workbox config
      workbox: {
        // Cache all JS, CSS, HTML and common assets from the Vite build
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff,woff2}"],

        // Only cache GET requests — fixes the POST cache error you saw
        // PocketBase API calls are handled by your db.js / cache.js utils
        runtimeCaching: [
          // Exchange rate API — cache for 1 hour
          {
            urlPattern: ({ url }) =>
              url.hostname.includes("exchangerate-api.com"),
            handler: "CacheFirst",
            options: {
              cacheName: "exchange-rates",
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60, // 1 hour
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },

          // Google Fonts / CDN assets — cache for 30 days
          {
            urlPattern: ({ url }) =>
              url.hostname.includes("fonts.googleapis.com") ||
              url.hostname.includes("fonts.gstatic.com") ||
              url.hostname.includes("cdnjs.cloudflare.com"),
            handler: "CacheFirst",
            options: {
              cacheName: "cdn-assets",
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },

      // App manifest — controls how the app looks when installed on mobile
      manifest: {
        name: "Nexus — Personal Finance",
        short_name: "Nexus",
        description: "Personal finance, gym, and life tracker",
        theme_color: "#0f0f17",
        background_color: "#0f0f17",
        display: "standalone",
        orientation: "portrait",
        scope: "/",
        start_url: "/",
        icons: [
          {
            src: "pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },

      // Set to true to test SW behaviour in dev mode
      devOptions: {
        enabled: false,
      },
    }),
  ],

  server: {
    proxy: {
      "/api/football": {
        target: "https://api.football-data.org/v4",
        changeOrigin: true,
        rewrite: (path) => {
          const url = new URL(path, "http://localhost");
          return "/" + url.searchParams.get("path");
        },
        headers: {
          "X-Auth-Token": "6de4bb42c1e746ffb58c92eb452cdbbc",
        },
      },
    },
  },
});
