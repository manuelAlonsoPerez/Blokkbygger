import { createRoot, Root } from "react-dom/client";
import { createElement } from "react";
import { Blokkbygger } from "./components/Blokkbygger";
import type { BlokkbyggerConfig, BlokkbyggerInstance } from "./types/domain";
import { API_URL, POLL_INTERVAL_MS, DEFAULT_LOCALE } from "./config";

const DEFAULTS: Required<Omit<BlokkbyggerConfig, "initialBlocks" | "onBlockChange" | "majorityThreshold">> = {
  apiUrl: API_URL,
  pollIntervalMs: POLL_INTERVAL_MS,
  locale: DEFAULT_LOCALE,
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
