import type { components, paths } from './schema';

type S = components['schemas'];
// Specyfikacja nie oznacza pól jako wymaganych, a serwer zawsze je zwraca — tu zdejmujemy opcjonalność (także w głąb).
type Req<T> = T extends (infer U)[] ? Req<U>[] : T extends object ? { [K in keyof T]-?: Req<T[K]> } : T;

export type User = Req<S['User']>;
export type Match = Req<S['Match']>;
export type Counts = Req<S['Counts']>;
export type Tender = Req<S['TenderSummary']>;
export type TenderList = Req<S['TenderList']>;
export type Profile = Req<S['Profile']>;
export type AnalysisView = Req<S['AnalysisView']>;
export type GeneralAnalysis = Req<S['GeneralAnalysis']>;
export type CompanyAssessment = Req<S['CompanyAssessment']>;
export type TenderResult = Req<S['TenderResult']>;
export type TenderDocument = Req<S['Document']>;
/** `noticeHtml` przychodzi tylko z `?html=1`. */
export type TenderDetail = Omit<Req<S['TenderDetail']>, 'noticeHtml'> & { noticeHtml?: string };

export type Decision = CompanyAssessment['rekomendacja']['decyzja'];
export type ConditionRating = CompanyAssessment['warunki'][number]['ocena'];
export type DocumentStatus = CompanyAssessment['dokumenty'][number]['status'];

export type TenderView = 'dopasowane' | 'wszystkie' | 'ulubione' | 'ulubione-zakonczone' | 'ukryte' | 'archiwum';
export type PushPreferences = Req<S['PushPreferences']>;

type Ok<P extends keyof paths, M extends keyof paths[P], C extends number = 200> = paths[P][M] extends {
  responses: { [K in C]: { content: { 'application/json': infer J } } };
}
  ? Req<J>
  : never;

export type Meta = Ok<'/meta', 'get'>;
export type Team = Ok<'/team', 'get'>;
export type Member = Req<S['Member']>;
export type Invitation = Req<S['Invitation']>;
export type InvitePreview = Ok<'/invitations/{token}', 'get'>;
export type InviteCreated = Ok<'/team/invitations', 'post', 201>;
export type Role = User['role'];

// Odpowiedź /tenders/{id}/similar jest w specyfikacji opisana tylko słownie, więc typy podajemy ręcznie
// (zgodnie z SimilarSearch w repozytorium strony).
export type SimilarResult = {
  noticeNumber: string;
  tenderId: string | null;
  date: string;
  organization: string;
  city: string;
  title: string;
  outcome: 'umowa' | 'uniewaznienie' | 'inne';
  multiPart: boolean;
  offers: number | null;
  low: number | null;
  high: number | null;
  chosen: number | null;
  winner: string | null;
  winnerSize: string | null;
  gov: boolean;
  edu: boolean;
};
export type SimilarStats = {
  count: number;
  offersMedian: number | null;
  offersMin: number | null;
  offersMax: number | null;
  spreadMedian: number | null;
  winners: { name: string; wins: number }[];
};
export type SimilarSearch = {
  phrase: string;
  results: SimilarResult[];
  stats: SimilarStats;
  truncated: boolean;
  fetchedAt: number;
};
