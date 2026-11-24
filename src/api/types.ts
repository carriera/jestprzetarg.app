import type { components } from './schema';

type S = components['schemas'];
// Specyfikacja nie oznacza pól jako wymaganych, a serwer zawsze je zwraca — tu zdejmujemy opcjonalność.
type Req<T> = { [K in keyof T]-?: T[K] };

export type User = Req<S['User']>;
export type Match = Req<S['Match']>;
export type Counts = Req<S['Counts']>;
export type Tender = Omit<Req<S['TenderSummary']>, 'organization' | 'match'> & {
  organization: Req<NonNullable<S['TenderSummary']['organization']>>;
  match: Match | null;
};
export type TenderList = Omit<Req<S['TenderList']>, 'items' | 'counts'> & { items: Tender[]; counts: Counts };
export type Profile = Req<S['Profile']>;

export type TenderView = 'dopasowane' | 'wszystkie' | 'ulubione' | 'ulubione-zakonczone' | 'ukryte' | 'archiwum';
