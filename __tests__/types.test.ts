import { DEFAULT_CONFIG } from '../src/types';

describe('types', () => {
  it('DEFAULT_CONFIG matches legacy defaults', () => {
    expect(DEFAULT_CONFIG).toEqual({
      url: '',
      searchText: '',
      taskSet: 'no',
      webPlatformType: 'mobile',
      lastChecked: '0',
      caseSensitiveSearch: 'yes',
      searchAbsence: 'no',
    });
  });
});
