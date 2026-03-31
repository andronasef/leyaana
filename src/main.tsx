import React from "react";
import ReactDOM from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import App from "./App.tsx";

registerSW({
  immediate: true,
  onRegisteredSW(swUrl) {
    console.info(`Service worker registered: ${swUrl}`);
  },
  onOfflineReady() {
    console.info("App is ready for offline usage.");
  },
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
