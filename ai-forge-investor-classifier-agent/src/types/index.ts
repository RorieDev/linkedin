export interface InvestorRow {
  rowIndex: number;
  name: string;
  websiteUrl: string;
  classification?: string;
  foundUrl?: string;
}

export type InvestorCategory =
  | 'SEIS'
  | 'EIS'
  | 'Angel syndicates'
  | 'Early Stage VCs'
  | 'HNW';

export const INVESTOR_CATEGORIES: InvestorCategory[] = [
  'SEIS',
  'EIS',
  'Angel syndicates',
  'Early Stage VCs',
  'HNW'
];
