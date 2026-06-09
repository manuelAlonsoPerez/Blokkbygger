import { useState, useEffect } from "react";
import type { Party, BlockId, BlockState } from "../types/domain";

const EMPTY_BLOCKS: BlockState = { left: [], neutral: [], right: [] };

function allBlocksEmpty(blocks: BlockState): boolean {
  return (
    blocks.left.length === 0 &&
    blocks.neutral.length === 0 &&
    blocks.right.length === 0
  );
}

export function useBlockState(
  parties: Party[],
  initialBlocks?: BlockState,
) {
  const [blocks, setBlocks] = useState<BlockState>(
    initialBlocks ?? EMPTY_BLOCKS,
  );

  useEffect(() => {
    if (parties.length > 0 && !initialBlocks && allBlocksEmpty(blocks)) {
      setBlocks({
        left: [],
        neutral: parties.map((p) => p.id),
        right: [],
      });
    }
    // Only run when parties first load
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parties]);

  function moveParty(partyId: string, targetBlock: BlockId) {
    setBlocks((prev) => {
      const next: BlockState = {
        left: prev.left.filter((id) => id !== partyId),
        neutral: prev.neutral.filter((id) => id !== partyId),
        right: prev.right.filter((id) => id !== partyId),
      };
      next[targetBlock] = [...next[targetBlock], partyId];
      return next;
    });
  }

  return { blocks, moveParty };
}
