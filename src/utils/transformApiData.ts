import type { ElectionResponse } from "../types/api";
import type { Party } from "../types/domain";
import {
  NATIONWIDE_CATEGORY,
  ANDRE_PARTY_ID,
  ANDRE_PARTY_NAME,
  ANDRE_PARTY_COLOR,
} from "../config";

export function transformApiData(response: ElectionResponse): Party[] {
  const parties: Party[] = [];
  let andreMandater = 0;
  let andreProsent = 0;

  for (const apiParty of response.partier) {
    if (apiParty.parti.kategori === NATIONWIDE_CATEGORY) {
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
    id: ANDRE_PARTY_ID,
    name: ANDRE_PARTY_NAME,
    shortName: ANDRE_PARTY_NAME,
    mandates: andreMandater,
    percentage: andreProsent ? Math.round(andreProsent * 10) / 10 : 0,
    color: ANDRE_PARTY_COLOR,
  });

  return parties;
}
