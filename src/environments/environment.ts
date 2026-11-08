/** Production build: talks to the PHP API on the same domain. */
export const environment = {
  /** 'api' = real PHP + MySQL backend; 'mock' = sample data kept in the browser. */
  dataSource: 'api' as 'api' | 'mock',
  apiBase: '/api'
};
