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
