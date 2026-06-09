import { formatTime } from "../../utils/formatTime";
import styles from "./Header.module.css";

interface HeaderProps {
  lastUpdated: string | null;
}

export function Header({ lastUpdated }: HeaderProps) {
  return (
    <header className={styles.header}>
      <h1 className={styles.title}>Blokkbygger</h1>
      <p className={styles.timestamp}>
        Sist oppdatert {formatTime(lastUpdated)}
      </p>
    </header>
  );
}
