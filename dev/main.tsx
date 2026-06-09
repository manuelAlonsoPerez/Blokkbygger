import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Blokkbygger } from "../src/components/Blokkbygger";
import { API_URL, POLL_INTERVAL_MS } from "../src/config";

const root = document.getElementById("root");
if (!root) throw new Error("Missing #root element");

createRoot(root).render(
  <StrictMode>
    <Blokkbygger
      apiUrl={API_URL}
      pollIntervalMs={POLL_INTERVAL_MS}
      onBlockChange={(state) => {
        console.log("Block state changed:", state);
      }}
    />
  </StrictMode>,
);
