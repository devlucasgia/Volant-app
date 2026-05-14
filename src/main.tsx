import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./lib/fontScale"; // Apply persisted font scale before first paint

createRoot(document.getElementById("root")!).render(<App />);
