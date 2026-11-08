/**
 * `npm start` talks to the local PHP API (`npm run start:php`, port 8090,
 * see README → "Running the API locally"). Set dataSource to 'mock' to use
 * sample data in the browser with no backend at all.
 */
export const environment = {
  dataSource: 'api' as 'api' | 'mock',
  apiBase: '/api'
};
