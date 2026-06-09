export interface Party {
  id: string;
  name: string;
  shortName: string;
  mandates: number;
  percentage: number;
  color: string;
}

export type BlockId = "left" | "neutral" | "right";

export interface BlockState {
  left: string[];
  neutral: string[];
  right: string[];
}

export interface BlokkbyggerConfig {
  apiUrl?: string;
  pollIntervalMs?: number;
  initialBlocks?: BlockState;
  majorityThreshold?: number;
  locale?: "nb" | "nn";
  onBlockChange?: (state: BlockState) => void;
}

export interface BlokkbyggerInstance {
  update(config: Partial<BlokkbyggerConfig>): void;
  getState(): BlockState;
  unmount(): void;
}
