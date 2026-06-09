import type { ElectionResponse } from "../types/api";
import type { Party } from "../types/domain";

const ANDRE_COLOR = "#999999";

export function transformApiData(response: ElectionResponse): Party[] {
  const parties: Party[] = [];
  let andreMandater = 0;
  let andreProsent = 0;

  for (const apiParty of response.partier) {
    if (apiParty.parti.kategori === 1) {
      parties.push({
        id: apiParty.parti.id,
        name: apiParty.parti.navn.nb,
        shortName: apiParty.parti.kortNavn,
        mandates: apiParty.mandater.antall,
        percentage: apiParty.stemmer.prosent ?? 0,
        color: apiParty.parti.farge,
      });
    } else {
      andreMandater += apiParty.mandater.antall;
      andreProsent += apiParty.stemmer.prosent ?? 0;
    }
  }

  parties.push({
    id: "andre",
    name: "An.",
    shortName: "An.",
    mandates: andreMandater,
    percentage: andreProsent ? Math.round(andreProsent * 10) / 10 : 0,
    color: ANDRE_COLOR,
  });

  return parties;
}
