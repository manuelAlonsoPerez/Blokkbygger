import clsx from "clsx";
import styles from "./MandateCounter.module.css";

interface MandateCounterProps {
  total: number;
  outOf: number;
  threshold?: number;
  hasMajority?: boolean;
}

export function MandateCounter({
  total,
  outOf,
  threshold,
  hasMajority = false,
}: MandateCounterProps) {
  return (
    <div
      className={clsx(
        styles.counter,
        hasMajority ? styles.majority : styles.noMajority,
      )}
    >
      <span>
        <strong>{total}</strong> / {outOf} mandater
      </span>
      {threshold !== undefined && hasMajority && (
        <span className={styles.check}>&#10003; Flertall</span>
      )}
    </div>
  );
}
