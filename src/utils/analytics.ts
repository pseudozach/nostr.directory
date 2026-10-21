import type {
  PlausibleConfig,
  PlausibleRequestPayload,
  track,
} from '@plausible-analytics/tracker';
import type { NextRouter } from 'next/router';

const PUBLIC_HOSTS = ['nostr.directory', 'www.nostr.directory'];

/** Only bounded public routes; never record identifiers, query strings or fragments. */
function publicPage(raw: string): string | null {
  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:' || !PUBLIC_HOSTS.includes(url.hostname))
      return null;
    let path = url.pathname;
    if (/^\/p\/[^/]+\/?$/.test(path)) path = '/p/[id]';
    else if (!['/', '/twitter', '/stats'].includes(path)) path = '/[redacted]';
    return `https://${url.hostname}${path}`;
  } catch {
    return null;
  }
}

// Origin-only attribution intentionally sacrifices destination paths for privacy.
function publicOrigin(raw: string): string | null {
  try {
    const url = new URL(raw);
    return ['https:', 'http:'].includes(url.protocol) ? `${url.origin}/` : null;
  } catch {
    return null;
  }
}

export function sanitizeRequest(
  payload: PlausibleRequestPayload,
  domain: string
): PlausibleRequestPayload | null {
  const url = publicPage(payload.u);
  if (
    !url ||
    !['pageview', 'Outbound Link: Click', 'File Download'].includes(payload.n)
  )
    return null;
  const clean: PlausibleRequestPayload = {
    n: payload.n,
    d: domain,
    u: url,
    r: payload.r ? publicOrigin(payload.r) : null,
  };
  if (payload.n !== 'pageview') {
    const destination = payload.p?.url && publicOrigin(payload.p.url);
    if (!destination) return null;
    clean.p = { url: destination };
  }
  return clean;
}

type PrivacyNavigator = Navigator & {
  globalPrivacyControl?: boolean;
  msDoNotTrack?: string;
};
type PrivacyWindow = Window & { doNotTrack?: string };

// All browser access is deferred until the root application's client effect.
export function mayTrack(
  browser: Window | undefined,
  environment: string
): boolean {
  if (
    environment !== 'production' ||
    !browser ||
    !PUBLIC_HOSTS.includes(browser.location.hostname)
  )
    return false;
  try {
    const nav = browser.navigator as PrivacyNavigator;
    const dnt = [
      nav.doNotTrack,
      nav.msDoNotTrack,
      (browser as PrivacyWindow).doNotTrack,
    ];
    return (
      !nav.webdriver &&
      !nav.globalPrivacyControl &&
      !dnt.some((value) => value === '1' || value === 'yes') &&
      browser.localStorage.getItem('plausible_ignore') !== 'true'
    );
  } catch {
    // If opt-out storage is inaccessible, prefer no measurement.
    return false;
  }
}

type Tracker = { init: (config: PlausibleConfig) => void; track: typeof track };
type AnalyticsWindow = Window & {
  nostrDirectoryAnalytics?: { lastPath?: string };
};

/** Called only after the client effect has loaded the official tracker. */
export function startAnalytics(
  browser: Window | undefined,
  router: Pick<NextRouter, 'asPath' | 'events'>,
  tracker: Tracker,
  environment: string,
  config = {
    domain: process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN || 'nostr.directory',
    endpoint:
      process.env.NEXT_PUBLIC_PLAUSIBLE_ENDPOINT ||
      'https://plausible.physicalaiguide.com/api/event',
  }
): () => void {
  if (!mayTrack(browser, environment) || !browser) return () => {};
  const owner = browser as AnalyticsWindow;
  if (!owner.nostrDirectoryAnalytics) {
    tracker.init({
      ...config,
      autoCapturePageviews: false,
      hashBasedRouting: false,
      outboundLinks: true,
      fileDownloads: true,
      formSubmissions: false,
      bindToWindow: false,
      logging: false,
      // Reject native DOM pageviews, which can enable ungated engagement sends.
      transformRequest: (payload) =>
        mayTrack(browser, environment) && payload.n !== 'pageview'
          ? sanitizeRequest(
              {
                ...payload,
                n: payload.n === 'pageview:manual' ? 'pageview' : payload.n,
              },
              config.domain
            )
          : null,
    });
    owner.nostrDirectoryAnalytics = {};
  }
  const state = owner.nostrDirectoryAnalytics;
  const pageview = (path: string) => {
    const withoutHash = path.split('#')[0];
    if (state.lastPath === withoutHash || !mayTrack(browser, environment))
      return;
    const url = new URL(path, browser.location.href).href;
    // v0.4.6's native pageview starts engagement requests that bypass transformRequest.
    // Translate this private dispatch name to a normal pageview only at the safe boundary.
    tracker.track('pageview:manual', { url });
    state.lastPath = withoutHash;
  };
  pageview(router.asPath);
  router.events.on('routeChangeComplete', pageview);
  return () => router.events.off('routeChangeComplete', pageview);
}

/** Lazy import avoids executing the browser-only package during SSR or preview visits. */
export function attachAnalytics(
  browser: Window | undefined,
  router: Pick<NextRouter, 'asPath' | 'events'>,
  environment: string,
  loadTracker: () => Promise<Tracker> = () =>
    import('@plausible-analytics/tracker')
): () => void {
  let cancelled = false;
  let cleanup = () => {};
  if (mayTrack(browser, environment)) {
    loadTracker()
      .then((tracker) => {
        if (!cancelled)
          cleanup = startAnalytics(browser, router, tracker, environment);
      })
      .catch(() => {
        // Measurement must never interrupt the application (blocked chunk, unsupported browser).
      });
  }
  return () => {
    cancelled = true;
    cleanup();
  };
}
