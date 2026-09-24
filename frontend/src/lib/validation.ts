// Mirrors backend/src/validation.rs. Values accepted here are inert inside CSS `url()`,
// CSS custom properties and `<a href>`.

const MAX_COLOR_LEN = 100;
const MAX_URL_LEN = 2048;

const HEX_COLOR = /^#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const KEYWORD_COLOR = /^[a-z]+$/i;
const FUNCTION_COLOR = /^(?:rgba?|hsla?)\((?=[^)]*[^\s)])[a-z0-9.,%/ +-]+\)$/i;
const UNSAFE_URL_CHARS = /[\s\p{Cc}"'`\\<>()]/u;
export const EGG_BANNER_KEY = /^[a-z0-9-]{1,64}$/i;

export const CSS_COLOR_MESSAGE = 'Must be a hex, rgb(a), hsl(a) or named CSS colour';
export const SAFE_URL_MESSAGE =
  'Must be empty, an http(s):// URL or a path starting with / (no spaces, quotes or parentheses)';

export function isCssColor(value: string): boolean {
  if (!value || value.length > MAX_COLOR_LEN) return false;
  return HEX_COLOR.test(value) || KEYWORD_COLOR.test(value) || FUNCTION_COLOR.test(value);
}

export function isSafeUrl(value: string): boolean {
  if (value === '') return true;
  if (value.length > MAX_URL_LEN || UNSAFE_URL_CHARS.test(value)) return false;

  const lower = value.toLowerCase();
  const scheme = lower.startsWith('https://') ? 8 : lower.startsWith('http://') ? 7 : 0;
  if (scheme) {
    const host = value.slice(scheme).split(/[/?#]/, 1)[0];
    return host.length > 0;
  }
  return value.startsWith('/') && !value.startsWith('//');
}

/** CSS `url("...")` for a validated URL, or `null` when the value is empty or unsafe. */
export function cssUrl(value: unknown): string | null {
  if (typeof value !== 'string' || value === '' || !isSafeUrl(value)) return null;
  return `url("${value}")`;
}
