import type { Party } from "../types/domain";

export function sumMandates(partyIds: string[], parties: Party[]): number {
  return partyIds.reduce((sum, id) => {
    const party = parties.find((p) => p.id === id);
    return sum + (party?.mandates ?? 0);
  }, 0);
}
