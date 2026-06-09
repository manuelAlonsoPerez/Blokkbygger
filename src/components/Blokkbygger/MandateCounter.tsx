import clsx from "clsx";
import styles from "./MandateCounter.module.css";

interface MandateCounterProps {
  total: number;
  threshold: number;
  hasMajority: boolean;
}

export function MandateCounter({
  total,
  threshold,
  hasMajority,
}: MandateCounterProps) {
  return (
    <div
      className={clsx(
        styles.counter,
        hasMajority ? styles.majority : styles.noMajority,
      )}
    >
      {total} / {threshold} mandater
      {hasMajority && <span className={styles.check}>&#10003; Flertall</span>}
    </div>
  );
}
