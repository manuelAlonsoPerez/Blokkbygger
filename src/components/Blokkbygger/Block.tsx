import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import clsx from "clsx";
import type { Party, BlockId } from "../../types/domain";
import { PartyCard } from "./PartyCard";
import { MandateCounter } from "./MandateCounter";
import styles from "./Block.module.css";

interface BlockProps {
  id: BlockId;
  label: string;
  partyIds: string[];
  parties: Party[];
  totalMandates?: number;
  totalMandatesInElection?: number;
  majorityThreshold?: number;
  hasMajority?: boolean;
}

export function Block({
  id,
  label,
  partyIds,
  parties,
  totalMandates,
  totalMandatesInElection = 0,
  majorityThreshold,
  hasMajority = false,
}: BlockProps) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <section
      ref={setNodeRef}
      className={clsx(
        styles.container,
        isOver && styles.dropTarget,
        hasMajority && styles.hasMajority,
      )}
      data-testid={`block-${id}`}
      aria-label={`${label}-blokken`}
    >
      <h2 className={styles.title}>{label}</h2>

      <div className={styles.cards}>
        <SortableContext items={partyIds} strategy={verticalListSortingStrategy}>
          {partyIds.map((partyId) => {
            const party = parties.find((p) => p.id === partyId);
            if (!party) return null;
            return <PartyCard key={partyId} party={party} />;
          })}
        </SortableContext>
      </div>

      {totalMandates !== undefined && (
        <MandateCounter
          total={totalMandates}
          outOf={totalMandatesInElection}
          threshold={majorityThreshold}
          hasMajority={hasMajority}
        />
      )}
    </section>
  );
}
