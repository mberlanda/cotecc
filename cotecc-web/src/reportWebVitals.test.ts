const mockGetCLS = jest.fn();
const mockGetFID = jest.fn();
const mockGetFCP = jest.fn();
const mockGetLCP = jest.fn();
const mockGetTTFB = jest.fn();

jest.mock('web-vitals', () => ({
  __esModule: true,
  getCLS: mockGetCLS,
  getFID: mockGetFID,
  getFCP: mockGetFCP,
  getLCP: mockGetLCP,
  getTTFB: mockGetTTFB,
}));

import reportWebVitals from './reportWebVitals';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('reportWebVitals', () => {
  test('accepts a valid function callback without throwing', () => {
    const onPerfEntry = jest.fn();
    expect(() => reportWebVitals(onPerfEntry)).not.toThrow();
  });

  test('invokes web-vitals metric functions when given a callback', async () => {
    const onPerfEntry = jest.fn();

    const { getCLS, getFID, getFCP, getLCP, getTTFB } = await import('web-vitals');
    getCLS(onPerfEntry);
    getFID(onPerfEntry);
    getFCP(onPerfEntry);
    getLCP(onPerfEntry);
    getTTFB(onPerfEntry);

    expect(mockGetCLS).toHaveBeenCalledWith(onPerfEntry);
    expect(mockGetFID).toHaveBeenCalledWith(onPerfEntry);
    expect(mockGetFCP).toHaveBeenCalledWith(onPerfEntry);
    expect(mockGetLCP).toHaveBeenCalledWith(onPerfEntry);
    expect(mockGetTTFB).toHaveBeenCalledWith(onPerfEntry);
  });

  test('does nothing when called without a callback', () => {
    expect(() => reportWebVitals()).not.toThrow();
  });

  test('does nothing when called with undefined', () => {
    expect(() => reportWebVitals(undefined)).not.toThrow();
  });

  test('does nothing when called with a non-function value', () => {
    expect(() => reportWebVitals(null as any)).not.toThrow();
    expect(() => reportWebVitals('string' as any)).not.toThrow();
    expect(() => reportWebVitals(42 as any)).not.toThrow();
  });

  test('is exported as default', () => {
    expect(typeof reportWebVitals).toBe('function');
  });
});
