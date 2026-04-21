import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import AppRaf from "./AppRaf.tsx";

// Switch between implementations by setting `?raf=1` in the URL
const RootApp = new URL(window.location.href).searchParams.has("raf")
  ? AppRaf
  : App;

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RootApp />
  </StrictMode>,
);
