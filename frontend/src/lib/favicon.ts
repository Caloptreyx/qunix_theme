import { isSafeUrl } from './validation.ts';

/**
 * Points the browser-tab icons (`link[rel~="icon"]`) at the theme favicon. The panel icon used for the
 * logo and apple-touch-icon is left alone. An empty or unsafe value restores what was there before,
 * preferring the panel's current app icon.
 */
export function applyFavicon(faviconUrl: unknown, appIcon: string | undefined) {
  const url = typeof faviconUrl === 'string' && faviconUrl && isSafeUrl(faviconUrl) ? faviconUrl : null;

  document.querySelectorAll<HTMLLinkElement>('link[rel~="icon"]').forEach((link) => {
    if (url) {
      link.dataset.qunixOriginalHref ??= link.getAttribute('href') ?? '';
      link.dataset.qunixOriginalType ??= link.getAttribute('type') ?? '';
      link.href = url;
      // The panel declares image/png; drop it so .ico/.svg favicons are not skipped.
      link.removeAttribute('type');
    } else if (link.dataset.qunixOriginalHref !== undefined) {
      link.href = appIcon || link.dataset.qunixOriginalHref;
      if (link.dataset.qunixOriginalType) link.type = link.dataset.qunixOriginalType;
      delete link.dataset.qunixOriginalHref;
      delete link.dataset.qunixOriginalType;
    }
  });
}
