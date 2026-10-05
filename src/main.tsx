import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.tsx";
import "./index.css";
import { initClientMonitoring } from "@/lib/monitoring";
import { installContactClickTracking } from "@/lib/analytics";

initClientMonitoring();
installContactClickTracking();

createRoot(document.getElementById("root")!).render(
  <HelmetProvider>
    <App />
  </HelmetProvider>,
);
