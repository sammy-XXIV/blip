import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import "./ui.css";
import { PrivyRoot } from "./lib/privy";
import { App } from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <PrivyRoot>
      <App />
    </PrivyRoot>
  </StrictMode>,
);
