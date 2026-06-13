// Helpers for reading Expo Router URL search params, which arrive as
// `string | string[] | undefined`. The `/game`, `/home` and `/how-to-play`
// routes are public URLs, so a value may be missing (direct deep link / web
// refresh) or duplicated (`?k=a&k=b`); these helpers coerce defensively with
// explicit fallbacks instead of asserting the shape with a cast.

export type SearchParamValue = string | string[] | undefined;

export const firstParam = (value: SearchParamValue, fallback = ''): string => {
  if (Array.isArray(value)) {
    return value[0] ?? fallback;
  }
  return value ?? fallback;
};

export const numberParam = (value: SearchParamValue, fallback: number): number => {
  const raw = firstParam(value);
  if (raw === '') {
    return fallback;
  }
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const boolParam = (value: SearchParamValue, fallback = false): boolean => {
  const raw = firstParam(value);
  if (raw === '') {
    return fallback;
  }
  return raw === 'true';
};
