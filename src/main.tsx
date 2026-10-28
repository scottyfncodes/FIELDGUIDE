import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

/* Sheets move focus to their Back button so keyboard and screen-reader users
   land there. Safari draws a focus ring for that even after a tap, so remember
   how the person last interacted and only ring buttons for keyboard use. */
const root = document.documentElement;
root.dataset.input = window.matchMedia?.("(pointer: coarse)").matches ? "touch" : "keyboard";
window.addEventListener("pointerdown", () => { root.dataset.input = "touch"; }, true);
window.addEventListener("keydown", (e) => { if (!e.metaKey && !e.ctrlKey && !e.altKey) root.dataset.input = "keyboard"; }, true);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

/* Offline shell for the Home Screen app (trailheads rarely have signal) */
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => { /* non-fatal */ });
  });
}
