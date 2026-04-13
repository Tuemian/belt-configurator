import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initClientMonitoring } from "@/lib/monitoring";

initClientMonitoring();

createRoot(document.getElementById("root")!).render(<App />);
