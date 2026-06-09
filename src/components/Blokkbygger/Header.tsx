import { formatTime } from "../../utils/formatTime";
import styles from "./Header.module.css";

interface HeaderProps {
  lastUpdated: string | null;
  turnoutPercent: number;
  countedPercent: number;
}

export function Header({
  lastUpdated,
  turnoutPercent,
  countedPercent,
}: HeaderProps) {
  return (
    <header className={styles.header}>
      <div className={styles.row}>
        <h1 className={styles.title}>Blokkbygger</h1>
        <div className={styles.stats}>
          <span className={styles.stat}>
            Frammøte <strong>{turnoutPercent}%</strong>
          </span>
          <span className={styles.divider} />
          <span className={styles.stat}>
            Opptalt <strong>{countedPercent}%</strong>
          </span>
        </div>
      </div>
      <p className={styles.timestamp}>
        Sist oppdatert {formatTime(lastUpdated)}
      </p>
    </header>
  );
}
