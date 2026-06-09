import { createRoot, Root } from "react-dom/client";
import { createElement } from "react";
import { Blokkbygger } from "./components/Blokkbygger";
import type { BlokkbyggerConfig, BlokkbyggerInstance } from "./types/domain";

const DEFAULTS: Required<Omit<BlokkbyggerConfig, "initialBlocks" | "onBlockChange">> = {
  apiUrl: "https://valg.nrk.no/api/2025/st",
  pollIntervalMs: 30_000,
  majorityThreshold: 85,
  locale: "nb",
};

export function mount(
  container: HTMLElement,
  config: BlokkbyggerConfig = {},
): BlokkbyggerInstance {
  let currentConfig = { ...DEFAULTS, ...config };
  const root: Root = createRoot(container);

  function render() {
    root.render(
      createElement(Blokkbygger, {
        apiUrl: currentConfig.apiUrl,
        pollIntervalMs: currentConfig.pollIntervalMs,
        majorityThreshold: currentConfig.majorityThreshold,
        initialBlocks: currentConfig.initialBlocks,
        onBlockChange: currentConfig.onBlockChange,
      }),
    );
  }

  render();

  return {
    update(newConfig: Partial<BlokkbyggerConfig>) {
      currentConfig = { ...currentConfig, ...newConfig };
      render();
    },
    getState() {
      return (
        currentConfig.initialBlocks ?? {
          left: [],
          neutral: [],
          right: [],
        }
      );
    },
    unmount() {
      root.unmount();
    },
  };
}
