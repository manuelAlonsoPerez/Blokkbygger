import type { ElectionResponse } from "../../src/types/api";

export const MOCK_ELECTION_RESPONSE: ElectionResponse = {
  resultatType: "st",
  tidspunkt: {
    rapportGenerert: "2025-09-10T08:56:00",
    sisteStemmer: "2025-09-10T08:55:00",
  },
  valg: { year: 2025, type: "st" },
  geografi: {
    key: "00",
    navn: { nb: "Hele landet", sme: "Norga" },
    type: "land",
    stemmeberettigede: 3_900_000,
  },
  mandater: { antall: 169, endring: 0 },
  antallStemmer: 2_800_000,
  frammote: { prosent: 78.2 },
  opptaltProsent: 95.4,
  partier: [
    {
      parti: {
        id: "A",
        navn: { nb: "Arbeiderpartiet", nn: "Arbeidarpartiet" },
        kortNavn: "AP",
        kategori: 1,
        isParti: true,
        farge: "#d40000",
      },
      stemmer: {
        prosent: 26.3,
        endring: { samme: 0.5 },
        antall: { total: 736400, fhs: 0 },
      },
      mandater: { antall: 48, endring: 0 },
    },
    {
      parti: {
        id: "H",
        navn: { nb: "Høyre", nn: "Høgre" },
        kortNavn: "H",
        kategori: 1,
        isParti: true,
        farge: "#0065f1",
      },
      stemmer: {
        prosent: 20.5,
        endring: { samme: -0.2 },
        antall: { total: 574000, fhs: 0 },
      },
      mandater: { antall: 36, endring: -1 },
    },
    {
      parti: {
        id: "FRP",
        navn: { nb: "Fremskrittspartiet", nn: "Framstegspartiet" },
        kortNavn: "FRP",
        kategori: 1,
        isParti: true,
        farge: "#024a8f",
      },
      stemmer: {
        prosent: 11.7,
        endring: { samme: 3.4 },
        antall: { total: 327600, fhs: 0 },
      },
      mandater: { antall: 21, endring: 6 },
    },
    {
      parti: {
        id: "SV",
        navn: { nb: "Sosialistisk Venstreparti", nn: "Sosialistisk Venstreparti" },
        kortNavn: "SV",
        kategori: 1,
        isParti: true,
        farge: "#eb2e7b",
      },
      stemmer: {
        prosent: 7.5,
        endring: { samme: 0.1 },
        antall: { total: 210000, fhs: 0 },
      },
      mandater: { antall: 13, endring: 0 },
    },
    {
      parti: {
        id: "SP",
        navn: { nb: "Senterpartiet", nn: "Senterpartiet" },
        kortNavn: "SP",
        kategori: 1,
        isParti: true,
        farge: "#00843d",
      },
      stemmer: {
        prosent: 12.4,
        endring: { samme: -1.7 },
        antall: { total: 347200, fhs: 0 },
      },
      mandater: { antall: 28, endring: -1 },
    },
    {
      parti: {
        id: "RØDT",
        navn: { nb: "Rødt", nn: "Raudt" },
        kortNavn: "R",
        kategori: 1,
        isParti: true,
        farge: "#800000",
      },
      stemmer: {
        prosent: 4.7,
        endring: { samme: 0.6 },
        antall: { total: 131600, fhs: 0 },
      },
      mandater: { antall: 8, endring: 0 },
    },
    {
      parti: {
        id: "V",
        navn: { nb: "Venstre", nn: "Venstre" },
        kortNavn: "V",
        kategori: 1,
        isParti: true,
        farge: "#006666",
      },
      stemmer: {
        prosent: 4.9,
        endring: { samme: 1.0 },
        antall: { total: 137200, fhs: 0 },
      },
      mandater: { antall: 8, endring: 0 },
    },
    {
      parti: {
        id: "MDG",
        navn: { nb: "Miljøpartiet De Grønne", nn: "Miljøpartiet Dei Grøne" },
        kortNavn: "MDG",
        kategori: 1,
        isParti: true,
        farge: "#45c232",
      },
      stemmer: {
        prosent: 3.2,
        endring: { samme: -0.7 },
        antall: { total: 89600, fhs: 0 },
      },
      mandater: { antall: 3, endring: -1 },
    },
    {
      parti: {
        id: "KRF",
        navn: { nb: "Kristelig Folkeparti", nn: "Kristeleg Folkeparti" },
        kortNavn: "KRF",
        kategori: 1,
        isParti: true,
        farge: "#ffcb05",
      },
      stemmer: {
        prosent: 3.8,
        endring: { samme: 0.1 },
        antall: { total: 106400, fhs: 0 },
      },
      mandater: { antall: 3, endring: -3 },
    },
    {
      parti: {
        id: "PASIENT",
        navn: { nb: "Pasientfokus", nn: "Pasientfokus" },
        kortNavn: "PF",
        kategori: 2,
        isParti: true,
        farge: "#aaaaaa",
      },
      stemmer: {
        prosent: 0.4,
        endring: { samme: 0.0 },
        antall: { total: 11200, fhs: 0 },
      },
      mandater: { antall: 1, endring: 1 },
    },
    {
      parti: {
        id: "DEMO",
        navn: { nb: "Demokratene", nn: "Demokratane" },
        kortNavn: "DEM",
        kategori: 3,
        isParti: true,
        farge: "#bbbbbb",
      },
      stemmer: {
        prosent: 0.2,
        endring: { samme: 0.0 },
        antall: { total: 5600, fhs: 0 },
      },
      mandater: { antall: 0, endring: 0 },
    },
  ],
};

export const MOCK_EMPTY_RESPONSE: ElectionResponse = {
  ...MOCK_ELECTION_RESPONSE,
  partier: [],
  mandater: { antall: 169, endring: 0 },
  opptaltProsent: 0,
  frammote: { prosent: 0 },
};

export function buildApiPartyWithNullPercent(): ElectionResponse {
  return {
    ...MOCK_ELECTION_RESPONSE,
    partier: [
      {
        parti: {
          id: "TEST",
          navn: { nb: "Testpartiet", nn: "Testpartiet" },
          kortNavn: "TST",
          kategori: 1,
          isParti: true,
          farge: "#ff0000",
        },
        stemmer: {
          prosent: null as unknown as number,
          endring: { samme: 0 },
          antall: { total: 0, fhs: 0 },
        },
        mandater: { antall: 0, endring: 0 },
      },
    ],
  };
}
