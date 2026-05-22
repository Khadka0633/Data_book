import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";

// ── Service Worker ─────────────────────────────────────────────────
// vite-plugin-pwa registers the SW automatically during build.
// No manual registration needed here.
// If you want to handle SW update events (e.g. show "New version available"):
//
// import { registerSW } from 'virtual:pwa-register'
// registerSW({
//   onNeedRefresh() { /* show update prompt */ },
//   onOfflineReady() { console.log('App ready to work offline') },
// })

createRoot(document.getElementById("root")).render(<App />);
