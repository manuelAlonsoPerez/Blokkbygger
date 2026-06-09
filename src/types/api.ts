export interface ElectionResponse {
  resultatType: string;
  tidspunkt: {
    rapportGenerert: string;
    sisteStemmer: string;
  };
  valg: { year: number; type: string };
  geografi: {
    key: string;
    navn: { nb: string; sme: string };
    type: string;
    stemmeberettigede: number;
  };
  mandater: { antall: number; endring: number };
  antallStemmer: number;
  frammote: { prosent: number };
  opptaltProsent: number;
  partier: ApiParty[];
}

export interface ApiParty {
  parti: {
    id: string;
    navn: { nb: string; nn: string };
    kortNavn: string;
    kategori: number;
    isParti: boolean;
    farge: string;
  };
  stemmer: {
    prosent: number;
    endring: { samme: number };
    antall: { total: number; fhs: number };
  };
  mandater: {
    antall: number;
    endring: number;
  };
}
