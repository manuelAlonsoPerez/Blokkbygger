import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Blokkbygger } from "../src/components/Blokkbygger";

const root = document.getElementById("root");
if (!root) throw new Error("Missing #root element");

createRoot(root).render(
  <StrictMode>
    <Blokkbygger
      apiUrl="https://valg.nrk.no/api/2025/st"
      pollIntervalMs={30_000}
      onBlockChange={(state) => {
        console.log("Block state changed:", state);
      }}
    />
  </StrictMode>,
);
