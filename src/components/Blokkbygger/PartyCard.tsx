import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import clsx from "clsx";
import type { Party } from "../../types/domain";
import styles from "./PartyCard.module.css";

interface PartyCardProps {
  party: Party;
}

export function PartyCard({ party }: PartyCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useSortable({ id: party.id });

  const style = {
    transform: CSS.Transform.toString(transform),
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={clsx(styles.card, isDragging && styles.dragging)}
      data-testid={`party-card-${party.id}`}
      role="button"
      aria-roledescription="draggable party"
      aria-label={`${party.name}, ${party.mandates} mandater`}
    >
      <span className={styles.dot} style={{ backgroundColor: party.color }} />
      <span className={styles.name}>{party.shortName}</span>
      <span className={styles.mandates}>{party.mandates} mandater</span>
      <span className={styles.percent}>{party.percentage || 0}%</span>
    </div>
  );
}
