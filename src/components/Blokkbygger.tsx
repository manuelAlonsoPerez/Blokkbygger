import { useEffect, useCallback } from "react";
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { BlockId, BlockState } from "../types/domain";
import { useElectionData } from "../hooks/useElectionData";
import { useBlockState } from "../hooks/useBlockState";
import { sumMandates } from "../utils/sumMandates";
import { Header } from "./Header";
import { Block } from "./Block";
import { ErrorBanner } from "./ErrorBanner";
import styles from "./Blokkbygger.module.css";

interface BlokkbyggerProps {
  apiUrl: string;
  pollIntervalMs: number;
  initialBlocks?: BlockState;
  majorityThreshold: number;
  onBlockChange?: (state: BlockState) => void;
}

const BLOCK_IDS: BlockId[] = ["left", "neutral", "right"];

export function Blokkbygger({
  apiUrl,
  pollIntervalMs,
  initialBlocks,
  majorityThreshold,
  onBlockChange,
}: BlokkbyggerProps) {
  const { parties, lastUpdated, isLoading, error } = useElectionData(
    apiUrl,
    pollIntervalMs,
  );
  const { blocks, moveParty } = useBlockState(parties, initialBlocks);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor),
  );

  useEffect(() => {
    onBlockChange?.(blocks);
  }, [blocks, onBlockChange]);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over) return;

      const targetBlockId = findContainingBlock(over.id as string);
      if (targetBlockId) {
        moveParty(active.id as string, targetBlockId);
      }
    },
    [moveParty],
  );

  function findContainingBlock(overId: string): BlockId | null {
    if (BLOCK_IDS.includes(overId as BlockId)) {
      return overId as BlockId;
    }
    for (const blockId of BLOCK_IDS) {
      if (blocks[blockId].includes(overId)) {
        return blockId;
      }
    }
    return null;
  }

  const leftTotal = sumMandates(blocks.left, parties);
  const rightTotal = sumMandates(blocks.right, parties);

  if (isLoading && parties.length === 0) {
    return (
      <div className={styles.root}>
        <div className={styles.loading}>Laster valgdata...</div>
      </div>
    );
  }

  return (
    <div className={styles.root}>
      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <Header lastUpdated={lastUpdated} />
        <div className={styles.grid}>
          <Block
            id="left"
            label="Venstre"
            partyIds={blocks.left}
            parties={parties}
            totalMandates={leftTotal}
            majorityThreshold={majorityThreshold}
            hasMajority={leftTotal >= majorityThreshold}
          />
          <Block
            id="neutral"
            label="Nøytral"
            partyIds={blocks.neutral}
            parties={parties}
          />
          <Block
            id="right"
            label="Høyre"
            partyIds={blocks.right}
            parties={parties}
            totalMandates={rightTotal}
            majorityThreshold={majorityThreshold}
            hasMajority={rightTotal >= majorityThreshold}
          />
        </div>
        {error && <ErrorBanner message={error} />}
      </DndContext>
    </div>
  );
}
