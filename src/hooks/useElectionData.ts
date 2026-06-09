import { useState, useEffect, useCallback } from "react";
import type { ElectionResponse } from "../types/api";
import type { Party } from "../types/domain";
import { transformApiData } from "../utils/transformApiData";

interface UseElectionDataResult {
  parties: Party[];
  lastUpdated: string | null;
  isLoading: boolean;
  error: string | null;
}

export function useElectionData(
  apiUrl: string,
  pollIntervalMs: number,
): UseElectionDataResult {
  const [parties, setParties] = useState<Party[]>([]);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const response = await fetch(apiUrl);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data: ElectionResponse = await response.json();

      const transformed = transformApiData(data);
      setParties(transformed);
      setLastUpdated(data.tidspunkt.rapportGenerert);
      setError(null);
    } catch {
      setError("Kunne ikke hente valgdata. Prøver igjen...");
    } finally {
      setIsLoading(false);
    }
  }, [apiUrl]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, pollIntervalMs);
    return () => clearInterval(interval);
  }, [fetchData, pollIntervalMs]);

  return { parties, lastUpdated, isLoading, error };
}
