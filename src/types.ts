export type YesNo = 'yes' | 'no';

export type WebPlatformType = 'mobile' | 'desktop' | 'tablet';

export interface WatchConfig {
  url: string;
  searchText: string;
  taskSet: YesNo;
  webPlatformType: WebPlatformType;
  lastChecked: string;
  caseSensitiveSearch: YesNo;
  searchAbsence: YesNo;
}

export const DEFAULT_CONFIG: WatchConfig = {
  url: '',
  searchText: '',
  taskSet: 'no',
  webPlatformType: 'mobile',
  lastChecked: '0',
  caseSensitiveSearch: 'yes',
  searchAbsence: 'no',
};

export type CheckOutcome = {
  textFound: boolean;
  notified: boolean;
};

export interface WatchTarget {
  id: string;
  title: string;
  url: string;
  searchText: string;
  caseSensitiveSearch: boolean;
  searchAbsence: boolean;
  webPlatformType: WebPlatformType;
  enabled: boolean;
  lastChecked?: string;
  createdAt: number;
}

