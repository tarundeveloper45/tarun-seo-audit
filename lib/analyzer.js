const cheerio = require('cheerio');
const dns = require('node:dns').promises;
const net = require('node:net');
const { detectTech } = require('./techdetect');
const { fetchAuthorityData, scoreAuthority, estimateVisits } = require('./authority');
const { collectSitemap } = require('./sitemap');
const { buildTraffic } = require('./traffic');

const UA = 'Mozilla/5.0 (compatible; SEOAuditBot/1.0; +https://localhost) AppleWebKit/537.36 Chrome/124 Safari/537.36';
const MAX_BODY = 4 * 1024 * 1024;

// ---------------------------------------------------------------- networking
function normalizeUrl(input) {
  let u = String(input || '').trim();
  if (!u) throw new Error('Please enter a URL');
  if (!/^https?:\/\//i.test(u)) u = 'https://' + u;
  const url = new URL(u);
  if (!/^https?:$/.test(url.protocol)) throw new Error('Only http/https URLs are supported');
  if (!url.hostname.includes('.') && url.hostname !== 'localhost') throw new Error('Invalid hostname');
  return url;
}

function isPrivateIp(ip) {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split('.').map(Number);
    return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127);
  }
  const l = ip.toLowerCase();
  return l === '::1' || l === '::' || l.startsWith('fc') || l.startsWith('fd') || l.startsWith('fe80') || l.startsWith('::ffff:127.') || l.startsWith('::ffff:10.') || l.startsWith('::ffff:192.168.');
}

// SSRF guard: never let the tool be used to probe the local network.
async function assertPublicHost(hostname) {
  if (process.env.ALLOW_LOCAL_AUDIT === '1') return; // dev/testing only, never set in production
  if (net.isIP(hostname)) { if (isPrivateIp(hostname)) throw new Error('Private/internal addresses are not allowed'); return; }
  let addrs;
  try { addrs = await dns.lookup(hostname, { all: true }); }
  catch { throw new Error(`Could not resolve domain "${hostname}" — check the spelling`); }
  if (addrs.some((a) => isPrivateIp(a.address))) throw new Error('Private/internal addresses are not allowed');
}

async function request(url, { method = 'GET', timeout = 20000, maxRedirects = 10, readBody = true, headers = {} } = {}) {
  const chain = [];
  let current = url;
  const t0 = performance.now();
  for (let i = 0; i <= maxRedirects; i++) {
    await assertPublicHost(new URL(current).hostname);
    const tStart = performance.now();
    const res = await fetch(current, {
      method, redirect: 'manual', signal: AbortSignal.timeout(timeout),
      headers: { 'user-agent': UA, accept: 'text/html,application/xhtml+xml,*/*;q=0.8', 'accept-language': 'en-US,en;q=0.9', ...headers },
    });
    const ttfb = performance.now() - tStart;
    const status = res.status;
    if ([301, 302, 303, 307, 308].includes(status) && res.headers.get('location') && maxRedirects > 0) {
      chain.push({ url: current, status });
      current = new URL(res.headers.get('location'), current).href;
      try { await res.arrayBuffer(); } catch { /* ignore */ }
      continue;
    }
    let body = '', bytes = 0;
    if (readBody && method !== 'HEAD') {
      const buf = Buffer.from(await res.arrayBuffer());
      bytes = buf.length;
      body = buf.subarray(0, MAX_BODY).toString('utf8');
    } else { try { await res.arrayBuffer(); } catch { /* ignore */ } }
    const hdrs = {};
    res.headers.forEach((v, k) => { hdrs[k] = v; });
    const setCookie = typeof res.headers.getSetCookie === 'function' ? res.headers.getSetCookie().join('; ') : '';
    if (setCookie) hdrs['set-cookie'] = setCookie;
    return { url: current, status, headers: hdrs, body, bytes, ttfb, total: performance.now() - t0, chain };
  }
  throw new Error('Too many redirects (possible redirect loop)');
}

async function tryText(url, timeout = 10000) {
  try { const r = await request(url, { timeout }); return r; } catch { return null; }
}

async function mapLimit(items, limit, fn) {
  const out = new Array(items.length);
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) { const idx = i++; out[idx] = await fn(items[idx], idx); }
  }));
  return out;
}

// ---------------------------------------------------------------- helpers
const STOP = new Set(('a an and are as at be but by for from has have he her his i if in into is it its me my no not of on or our she so than that the their them then there these they this to too us was we were what when where which who why will with you your about all also any can do does just more most new one other out over some such up very via get got how may now only own same see use used using want well would').split(' '));

const abs = (href, base) => { try { return new URL(href, base).href; } catch { return null; } };
const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
const kb = (n) => Math.round(n / 1024);

function syllables(w) {
  w = w.toLowerCase().replace(/[^a-z]/g, '');
  if (w.length <= 3) return 1;
  w = w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '').replace(/^y/, '');
  const m = w.match(/[aeiouy]{1,2}/g);
  return m ? m.length : 1;
}

function fleschScore(text) {
  const sentences = Math.max(1, (text.match(/[.!?]+(\s|$)/g) || []).length);
  const words = text.split(/\s+/).filter((w) => /[A-Za-z]/.test(w));
  if (words.length < 30) return null;
  const syl = words.reduce((s, w) => s + syllables(w), 0);
  return Math.round(206.835 - 1.015 * (words.length / sentences) - 84.6 * (syl / words.length));
}

function parseRobots(txt) {
  const groups = []; let cur = null; const sitemaps = [];
  for (const raw of txt.split(/\r?\n/)) {
    const line = raw.replace(/#.*/, '').trim();
    const m = line.match(/^([A-Za-z-]+)\s*:\s*(.*)$/);
    if (!m) continue;
    const k = m[1].toLowerCase(), v = m[2].trim();
    if (k === 'user-agent') { if (!cur || cur.rules.length) { cur = { agents: [], rules: [] }; groups.push(cur); } cur.agents.push(v.toLowerCase()); }
    else if (k === 'sitemap') sitemaps.push(v);
    else if ((k === 'disallow' || k === 'allow') && cur) cur.rules.push([k, v]);
  }
  const star = groups.find((g) => g.agents.includes('*'));
  const blocksAll = !!star && star.rules.some(([k, v]) => k === 'disallow' && v === '/') && !star.rules.some(([k, v]) => k === 'allow' && v === '/');
  const aiBots = ['gptbot', 'claudebot', 'ccbot', 'google-extended', 'perplexitybot'];
  const blockedAi = groups.filter((g) => g.agents.some((a) => aiBots.includes(a)) && g.rules.some(([k, v]) => k === 'disallow' && v === '/')).flatMap((g) => g.agents.filter((a) => aiBots.includes(a)));
  return { sitemaps, blocksAll, blockedAi, groups: groups.length };
}

function hexToRgb(h) {
  h = h.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  if (h.length !== 6) return null;
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
const lum = ([r, g, b]) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
const contrast = (a, b) => { const [l1, l2] = [lum(a), lum(b)].sort((x, y) => y - x); return (l1 + 0.05) / (l2 + 0.05); };

// ---------------------------------------------------------------- check collector
function makeCollector() {
  const checks = [];
  const W = { high: 3, med: 2, low: 1 };
  // status: pass | warn | fail | info
  const add = (category, id, status, title, { detail = '', why = '', fix = '', weight = 'med' } = {}) =>
    checks.push({ category, id, status, title, detail, why, fix, weight, w: W[weight] });
  return { checks, add };
}

// ---------------------------------------------------------------- main
async function analyze(rawUrl, { onProgress = () => {}, psi = true } = {}) {
  const startUrl = normalizeUrl(rawUrl);
  onProgress('Fetching page…');
  const page = await request(startUrl.href, { timeout: 25000 });
  const finalUrl = new URL(page.url);
  const origin = finalUrl.origin;
  const html = page.body;
  const $ = cheerio.load(html);
  const { checks, add } = makeCollector();

  // Kick off slow things in parallel
  const psiPromise = psi ? runPageSpeed(page.url) : Promise.resolve(null);
  const robotsP = tryText(origin + '/robots.txt', 8000);
  const notFoundP = request(origin + '/this-page-should-not-exist-' + Math.random().toString(36).slice(2, 8), { timeout: 10000 }).catch(() => null);

  // ------------ collect assets
  const stylesheets = $('link[rel~="stylesheet"][href]').map((_, e) => abs($(e).attr('href'), page.url)).get().filter(Boolean);
  const scriptEls = $('script[src]').toArray();
  const scripts = scriptEls.map((e) => ({ src: abs($(e).attr('src'), page.url), async: $(e).is('[async]'), defer: $(e).is('[defer]'), module: $(e).attr('type') === 'module', inHead: $(e).parents('head').length > 0 })).filter((s) => s.src);
  const assets = [...stylesheets, ...scripts.map((s) => s.src), ...$('img[src]').map((_, e) => $(e).attr('src')).get()];
  const generator = $('meta[name="generator"]').attr('content') || '';

  onProgress('Detecting technology…');
  const tech = detectTech({ html, headers: page.headers, generator, assets });

  onProgress('Reading stylesheets…');
  const cssFiles = await mapLimit(stylesheets.slice(0, 8), 4, async (u) => {
    try {
      await assertPublicHost(new URL(u).hostname);
      const r = await fetch(u, { headers: { 'user-agent': UA }, signal: AbortSignal.timeout(10000) });
      const t = await r.text();
      return { url: u, size: t.length, text: t.slice(0, 600000), ok: r.ok };
    } catch { return { url: u, size: 0, text: '', ok: false }; }
  });
  const inlineCss = $('style').map((_, e) => $(e).text()).get().join('\n');
  const allCss = cssFiles.map((c) => c.text).join('\n') + '\n' + inlineCss;

  // ------------ text & structure
  const $body = cheerio.load(html
    .replace(/([^.!?:;,\s])\s*<\/(li|h[1-6]|dt|dd|summary|button|figcaption)>/gi, '$1.</$2> ')
    .replace(/<\/(p|li|h[1-6]|div|section|article|summary|button|label|td|th|dd|dt|a|span|b|strong|em)>/gi, '</$1> '));
  $body('script,style,noscript,template,svg,iframe').remove();
  const bodyText = $body('body').text().replace(/\s+/g, ' ').trim();
  const words = bodyText.split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const mainText = ($body('main').text() || $body('article').text() || bodyText).replace(/\s+/g, ' ').trim();

  const title = $('head title').first().text().replace(/\s+/g, ' ').trim();
  const metaDesc = ($('meta[name="description" i]').attr('content') || '').trim();
  const canonical = $('link[rel="canonical"]').attr('href');
  const robotsMeta = ($('meta[name="robots" i]').attr('content') || '').toLowerCase();
  const xRobots = (page.headers['x-robots-tag'] || '').toLowerCase();
  const viewport = $('meta[name="viewport"]').attr('content') || '';
  const lang = $('html').attr('lang') || '';
  const charset = $('meta[charset]').attr('charset') || ($('meta[http-equiv="Content-Type" i]').attr('content') || '').match(/charset=([^;]+)/i)?.[1];
  const h = { h1: $('h1'), h2: $('h2'), h3: $('h3'), h4: $('h4') };
  const headings = $('h1,h2,h3,h4,h5,h6').map((_, e) => ({ level: +e.tagName[1], text: $(e).text().replace(/\s+/g, ' ').trim().slice(0, 120) })).get();
  const og = {}; $('meta[property^="og:"]').each((_, e) => { og[$(e).attr('property')] = $(e).attr('content'); });
  const tw = {}; $('meta[name^="twitter:"]').each((_, e) => { tw[$(e).attr('name')] = $(e).attr('content'); });
  const hreflang = $('link[rel="alternate"][hreflang]').map((_, e) => $(e).attr('hreflang')).get();
  const favicon = $('link[rel~="icon"], link[rel="apple-touch-icon"]').length > 0;

  // structured data
  const ldTypes = []; let ldErrors = 0;
  $('script[type="application/ld+json"]').each((_, e) => {
    try {
      const j = JSON.parse($(e).text());
      const walk = (n) => { if (!n || typeof n !== 'object') return; if (Array.isArray(n)) return n.forEach(walk); if (n['@type']) [].concat(n['@type']).forEach((t) => ldTypes.push(t)); if (n['@graph']) walk(n['@graph']); };
      walk(j);
    } catch { ldErrors++; }
  });
  const microdata = $('[itemtype]').length;

  // links
  const links = $('a[href]').map((_, e) => {
    const href = ($(e).attr('href') || '').trim();
    if (!href || /^(javascript:|#|mailto:|tel:|sms:|whatsapp:)/i.test(href)) return null;
    const u = abs(href, page.url); if (!u || !/^https?:/.test(u)) return null;
    const text = ($(e).text() || $(e).attr('aria-label') || $(e).find('img').attr('alt') || '').replace(/\s+/g, ' ').trim();
    return { url: u.split('#')[0], text, internal: new URL(u).hostname.replace(/^www\./, '') === finalUrl.hostname.replace(/^www\./, ''), nofollow: /nofollow/i.test($(e).attr('rel') || ''), blank: $(e).attr('target') === '_blank', rel: $(e).attr('rel') || '' };
  }).get().filter(Boolean);
  const internal = links.filter((l) => l.internal), external = links.filter((l) => !l.internal);
  const uniqInternal = [...new Set(internal.map((l) => l.url))];
  // slow network work runs in parallel with the rest of the audit
  const authNetP = fetchAuthorityData(finalUrl.hostname);
  const sitemapP = collectSitemap(origin, { robotsPromise: robotsP, seedLinks: uniqInternal, net: { request, mapLimit } }).catch((e) => ({ found: false, source: 'error', error: String(e.message || e), files: [], total: 0, urls: [], issues: [], sampled: [] }));
  const genericAnchors = links.filter((l) => /^(click here|here|read more|more|learn more|link|this)$/i.test(l.text)).length;
  const emptyAnchors = $('a[href]').filter((_, e) => { const el = $(e); return !el.text().trim() && !el.attr('aria-label') && !el.attr('title') && !el.find('img[alt]:not([alt=""]),svg title').length; }).length;
  const unsafeBlank = external.filter((l) => l.blank && !/noopener|noreferrer/i.test(l.rel)).length;

  // images
  const imgs = $('img').toArray().map((e) => { const el = $(e); return { src: el.attr('src') || el.attr('data-src') || '', alt: el.attr('alt'), w: el.attr('width'), h: el.attr('height'), lazy: el.attr('loading') === 'lazy' || !!el.attr('data-src') || /lazy/i.test(el.attr('class') || ''), srcset: !!el.attr('srcset') || el.parent('picture').length > 0 }; });
  const imgNoAlt = imgs.filter((i) => i.alt === undefined).length;
  const imgEmptyAlt = imgs.filter((i) => i.alt === '').length;
  const imgNoDim = imgs.filter((i) => !i.w || !i.h).length;
  const modernFmt = imgs.filter((i) => /\.(webp|avif|svg)(\?|$)/i.test(i.src) || i.src.startsWith('data:image/svg')).length;
  const legacyFmt = imgs.filter((i) => /\.(jpe?g|png|gif|bmp)(\?|$)/i.test(i.src)).length;
  const lazyCount = imgs.filter((i) => i.lazy).length;

  // ------------------------------------------------------------ TECHNICAL
  const T = 'Technical SEO';
  const isHttps = finalUrl.protocol === 'https:';
  add(T, 'https', isHttps ? 'pass' : 'fail', isHttps ? 'Site uses HTTPS' : 'Site is NOT served over HTTPS', { detail: `Final URL: ${page.url}`, why: 'HTTPS is a Google ranking signal, and browsers show a "Not secure" warning on HTTP sites, which scares visitors away.', fix: 'Install an SSL certificate (free via Let\'s Encrypt/Cloudflare) and 301-redirect every http:// URL to https://.', weight: 'high' });

  if (startUrl.protocol === 'https:' || isHttps) {
    // http -> https redirect check
    try {
      const httpUrl = 'http://' + finalUrl.host + '/';
      const r = await request(httpUrl, { timeout: 8000, readBody: false, maxRedirects: 3 });
      const ok = new URL(r.url).protocol === 'https:';
      add(T, 'http-redirect', ok ? 'pass' : 'warn', ok ? 'HTTP version redirects to HTTPS' : 'HTTP version does not redirect to HTTPS', { detail: `http:// resolved to ${r.url} (${r.status})`, why: 'If both http and https versions work, Google may see duplicate sites and split ranking power between them.', fix: 'Add a site-wide 301 redirect from http:// to https:// (in .htaccess, nginx config, or your host dashboard).', weight: 'med' });
    } catch { /* port 80 closed - skip */ }
  }

  const st = page.status;
  add(T, 'status', st === 200 ? 'pass' : st >= 400 ? 'fail' : 'warn', `HTTP status ${st}`, { detail: `Final status ${st} after ${page.chain.length} redirect(s)`, why: 'Search engines only index pages that return 200 OK.', fix: st >= 400 ? 'Fix the server error / missing page so it returns 200.' : 'Make sure the page returns 200 directly.', weight: 'high' });

  const nRedir = page.chain.length;
  add(T, 'redirects', nRedir === 0 ? 'pass' : nRedir === 1 ? 'info' : 'warn', nRedir === 0 ? 'No redirects on the entered URL' : `${nRedir} redirect hop(s) before the final page`, { detail: page.chain.map((c) => `${c.status} ${c.url}`).concat(page.url).join(' → '), why: 'Every redirect adds delay and leaks a bit of link value.', fix: nRedir > 1 ? 'Link directly to the final URL and collapse redirect chains into a single 301.' : '', weight: 'low' });

  const ttfb = Math.round(page.ttfb);
  add(T, 'ttfb', ttfb < 600 ? 'pass' : ttfb < 1200 ? 'warn' : 'fail', `Server response time ${ttfb} ms`, { detail: 'Time to first byte for the HTML document (measured from this machine).', why: 'A slow server delays everything else and hurts Core Web Vitals (LCP).', fix: 'Use caching (page/object cache, CDN), upgrade hosting, optimise slow database queries/plugins. Target < 600 ms.', weight: 'high' });

  const htmlKb = kb(page.bytes);
  add(T, 'html-size', htmlKb < 100 ? 'pass' : htmlKb < 300 ? 'warn' : 'fail', `HTML document size ${htmlKb} KB`, { detail: `${page.bytes} bytes (uncompressed)`, why: 'Huge HTML takes longer to download and parse, especially on mobile networks.', fix: 'Remove inline scripts/styles and unused markup, paginate long lists, lazy-load below-the-fold content.', weight: 'low' });

  const enc = (page.headers['content-encoding'] || '').toLowerCase();
  add(T, 'compression', /gzip|br|zstd|deflate/.test(enc) ? 'pass' : 'fail', /gzip|br|zstd|deflate/.test(enc) ? `Text compression enabled (${enc})` : 'No text compression (gzip/brotli)', { detail: `content-encoding: ${enc || '(none)'}`, why: 'Compression cuts HTML/CSS/JS transfer size by 70-80%, making pages load much faster.', fix: 'Enable Brotli or Gzip on your server/CDN (nginx: "gzip on;", Apache: mod_deflate, or turn on in Cloudflare/host panel).', weight: 'high' });

  const cc = page.headers['cache-control'] || '';
  add(T, 'cache', cc || page.headers.etag || page.headers.expires ? 'pass' : 'warn', cc ? `Cache-Control header set` : 'No caching headers on the HTML', { detail: `cache-control: ${cc || '(none)'}; etag: ${page.headers.etag || '(none)'}`, why: 'Caching lets repeat visitors and CDNs reuse files instead of downloading them again.', fix: 'Send Cache-Control headers (long max-age for static assets, short/revalidate for HTML).', weight: 'low' });

  // security headers
  const sh = {
    'strict-transport-security': !!page.headers['strict-transport-security'],
    'content-security-policy': !!page.headers['content-security-policy'],
    'x-content-type-options': /nosniff/i.test(page.headers['x-content-type-options'] || ''),
    'x-frame-options': !!page.headers['x-frame-options'] || /frame-ancestors/i.test(page.headers['content-security-policy'] || ''),
    'referrer-policy': !!page.headers['referrer-policy'],
    'permissions-policy': !!page.headers['permissions-policy'],
  };
  const shMissing = Object.entries(sh).filter(([, v]) => !v).map(([k]) => k);
  add(T, 'security-headers', shMissing.length === 0 ? 'pass' : shMissing.length <= 2 ? 'warn' : 'fail', shMissing.length === 0 ? 'All key security headers present' : `${shMissing.length} of 6 security headers missing`, { detail: 'Missing: ' + (shMissing.join(', ') || 'none'), why: 'Security headers protect visitors from clickjacking, XSS and downgrade attacks. Google favours safe sites and hacked sites lose rankings.', fix: 'Add the missing headers at server/CDN level, e.g. HSTS (max-age=31536000), X-Content-Type-Options: nosniff, X-Frame-Options: SAMEORIGIN, Referrer-Policy: strict-origin-when-cross-origin.', weight: 'med' });
  if (page.headers.server && /\d/.test(page.headers.server) || page.headers['x-powered-by']) {
    add(T, 'info-leak', 'info', 'Server reveals software/version', { detail: `server: ${page.headers.server || '-'}; x-powered-by: ${page.headers['x-powered-by'] || '-'}`, why: 'Exposing exact versions helps attackers target known vulnerabilities.', fix: 'Hide the Server / X-Powered-By version strings in your server config.', weight: 'low' });
  }

  // indexability
  const noindex = /noindex/.test(robotsMeta) || /noindex/.test(xRobots);
  add(T, 'noindex', noindex ? 'fail' : 'pass', noindex ? 'Page is blocked from indexing (noindex)' : 'Page is indexable (no noindex)', { detail: `meta robots: ${robotsMeta || '(none)'}; X-Robots-Tag: ${xRobots || '(none)'}`, why: 'A noindex tag tells Google NOT to show this page in search results at all.', fix: 'Remove noindex from the meta robots tag / X-Robots-Tag header (check WordPress → Settings → Reading → "Discourage search engines").', weight: 'high' });

  // canonical
  if (!canonical) add(T, 'canonical', 'warn', 'No canonical tag', { why: 'Without a canonical URL, duplicates (www/non-www, ?utm params) can compete with each other in search.', fix: `Add <link rel="canonical" href="${page.url}"> inside <head>.`, weight: 'med' });
  else {
    const cu = abs(canonical, page.url); const self = cu && cu.replace(/\/$/, '') === page.url.split('#')[0].replace(/\/$/, '');
    add(T, 'canonical', self ? 'pass' : 'info', self ? 'Canonical tag points to itself' : 'Canonical points to a different URL', { detail: `canonical: ${cu}`, why: 'Canonical tells Google which URL is the "master" copy.', fix: self ? '' : 'Verify this is intended; if this page should rank itself, make the canonical self-referencing.', weight: 'med' });
  }

  add(T, 'lang', lang ? 'pass' : 'warn', lang ? `Language declared (lang="${lang}")` : 'No lang attribute on <html>', { why: 'Helps search engines and screen readers know the page language.', fix: 'Add lang="en" (or your language code) to the <html> tag.', weight: 'low' });
  add(T, 'viewport', viewport.includes('width=device-width') ? 'pass' : 'fail', viewport ? (viewport.includes('width=device-width') ? 'Mobile viewport meta tag set' : 'Viewport tag is misconfigured') : 'Missing mobile viewport meta tag', { detail: `viewport: ${viewport || '(none)'}`, why: 'Google uses mobile-first indexing. Without it the site shows as a tiny desktop page on phones.', fix: 'Add <meta name="viewport" content="width=device-width, initial-scale=1"> in <head>.', weight: 'high' });
  add(T, 'charset', charset ? 'pass' : 'warn', charset ? `Character set declared (${charset})` : 'No character encoding declared', { why: 'Prevents garbled characters (especially Hindi/special symbols).', fix: 'Add <meta charset="utf-8"> as the first tag in <head>.', weight: 'low' });
  add(T, 'favicon', favicon ? 'pass' : 'warn', favicon ? 'Favicon defined' : 'No favicon link found', { why: 'A favicon appears in browser tabs and in Google mobile results; it builds trust.', fix: 'Add <link rel="icon" href="/favicon.ico"> (and an apple-touch-icon).', weight: 'low' });

  // structured data
  const hasSD = ldTypes.length > 0 || microdata > 0;
  add(T, 'structured-data', hasSD && !ldErrors ? 'pass' : hasSD ? 'warn' : 'warn', hasSD ? `Structured data found: ${[...new Set(ldTypes)].join(', ') || 'microdata'}` : 'No structured data (schema.org)', { detail: ldErrors ? `${ldErrors} JSON-LD block(s) failed to parse` : '', why: 'Schema markup can unlock rich results (stars, FAQs, prices, breadcrumbs) that boost click-through rate.', fix: 'Add JSON-LD schema: Organization/LocalBusiness on home, Article/BlogPosting for blogs, Product for e-commerce, FAQPage and BreadcrumbList where relevant. Validate at search.google.com/test/rich-results.', weight: 'med' });
  if (hreflang.length) add(T, 'hreflang', 'info', `Multilingual: hreflang for ${hreflang.slice(0, 6).join(', ')}`, { why: 'Hreflang tells Google which language/region version to show.', weight: 'low' });

  // render-blocking
  const blocking = scripts.filter((s) => s.inHead && !s.async && !s.defer && !s.module);
  add(T, 'blocking-js', blocking.length === 0 ? 'pass' : blocking.length <= 2 ? 'warn' : 'fail', blocking.length ? `${blocking.length} render-blocking script(s) in <head>` : 'No render-blocking scripts in <head>', { detail: blocking.slice(0, 6).map((s) => s.src).join('\n'), why: 'Scripts that load before the page content stop the page from appearing until they finish.', fix: 'Add defer (or async) to script tags, move non-critical scripts to the end of <body>.', weight: 'med' });

  // mixed content
  if (isHttps) {
    const mixed = $('[src^="http://"], link[href^="http://"]').filter((_, e) => !$(e).is('a')).length;
    add(T, 'mixed-content', mixed ? 'fail' : 'pass', mixed ? `${mixed} insecure (http://) resource(s) on HTTPS page` : 'No mixed content', { why: 'Insecure resources on a secure page get blocked by browsers and break padlock trust.', fix: 'Change all http:// asset URLs to https:// (or protocol-relative).', weight: 'med' });
  }

  const domNodes = $('*').length;
  add(T, 'dom-size', domNodes < 1500 ? 'pass' : domNodes < 3000 ? 'warn' : 'fail', `DOM size: ${domNodes} elements`, { why: 'A very large DOM slows rendering, layout and interactions.', fix: 'Simplify page-builder nesting, remove hidden/duplicate sections, paginate long lists. Aim for under 1,500 elements.', weight: 'low' });

  // robots.txt + sitemap
  onProgress('Checking robots.txt, sitemap & broken links…');
  const robotsRes = await robotsP;
  let robotsInfo = null;
  const robotsOk = robotsRes && robotsRes.status === 200 && !/<html/i.test(robotsRes.body.slice(0, 300));
  if (robotsOk) robotsInfo = parseRobots(robotsRes.body);
  add(T, 'robots-txt', !robotsOk ? 'warn' : robotsInfo.blocksAll ? 'fail' : 'pass', !robotsOk ? 'robots.txt not found' : robotsInfo.blocksAll ? 'robots.txt blocks the ENTIRE site' : 'robots.txt found', { detail: robotsOk ? robotsRes.body.split('\n').slice(0, 15).join('\n') : `GET ${origin}/robots.txt → ${robotsRes ? robotsRes.status : 'no response'}`, why: 'robots.txt guides crawlers. If it says "Disallow: /" for all bots, Google can\'t crawl anything.', fix: !robotsOk ? 'Create /robots.txt with at least:\nUser-agent: *\nAllow: /\nSitemap: ' + origin + '/sitemap.xml' : robotsInfo.blocksAll ? 'Remove "Disallow: /" under "User-agent: *" immediately.' : '', weight: robotsOk && robotsInfo.blocksAll ? 'high' : 'med' });
  if (robotsOk && robotsInfo.blockedAi.length) add(T, 'ai-bots', 'info', `AI crawlers blocked: ${[...new Set(robotsInfo.blockedAi)].join(', ')}`, { why: 'Blocking AI bots keeps your content out of AI answers/training — fine if intentional.', weight: 'low' });

  let sitemapUrl = (robotsOk && robotsInfo.sitemaps[0]) || origin + '/sitemap.xml';
  let sm = await tryText(sitemapUrl, 10000);
  if ((!sm || sm.status !== 200 || !/<(urlset|sitemapindex)/i.test(sm.body)) && sitemapUrl !== origin + '/sitemap_index.xml') {
    const alt = await tryText(origin + '/sitemap_index.xml', 8000);
    if (alt && alt.status === 200 && /<(urlset|sitemapindex)/i.test(alt.body)) { sm = alt; sitemapUrl = origin + '/sitemap_index.xml'; }
  }
  const smOk = sm && sm.status === 200 && /<(urlset|sitemapindex)/i.test(sm.body);
  const smCount = smOk ? (sm.body.match(/<loc>/gi) || []).length : 0;
  add(T, 'sitemap', smOk ? 'pass' : 'fail', smOk ? `XML sitemap found (${smCount} ${/<sitemapindex/i.test(sm.body) ? 'sitemaps' : 'URLs'})` : 'No XML sitemap found', { detail: smOk ? sitemapUrl : `Tried ${sitemapUrl}`, why: 'A sitemap helps Google discover and re-crawl all your pages quickly.', fix: 'Generate sitemap.xml (Yoast/RankMath for WordPress, plugins for others), reference it in robots.txt and submit it in Google Search Console.', weight: 'high' });
  if (smOk && robotsOk && !robotsInfo.sitemaps.length) add(T, 'sitemap-robots', 'warn', 'Sitemap not referenced in robots.txt', { fix: `Add "Sitemap: ${sitemapUrl}" to robots.txt.`, why: 'Makes the sitemap discoverable to every crawler.', weight: 'low' });

  // soft 404
  const nf = await notFoundP;
  if (nf) {
    const good = nf.status === 404 || nf.status === 410;
    add(T, '404', good ? 'pass' : nf.status === 200 ? 'fail' : 'warn', good ? 'Missing pages correctly return 404' : nf.status === 200 ? 'Soft 404: missing pages return 200 OK' : `Missing pages return ${nf.status}`, { detail: `Random URL returned ${nf.status}`, why: 'If non-existent URLs return 200, Google may index thousands of empty pages ("soft 404s").', fix: 'Configure your server/CMS to return a real 404 status with a helpful custom error page.', weight: 'med' });
  }

  // broken links sample
  const sample = [...uniqInternal.slice(0, 18), ...[...new Set(external.map((l) => l.url))].slice(0, 7)];
  const lc = await mapLimit(sample, 6, async (u) => {
    try {
      let r = await request(u, { method: 'HEAD', timeout: 8000, readBody: false, maxRedirects: 4 });
      if (r.status === 405 || r.status === 403 || r.status === 501) r = await request(u, { timeout: 8000, readBody: false, maxRedirects: 4 });
      return { url: u, status: r.status };
    } catch (e) { return { url: u, status: 0, error: String(e.message || e).slice(0, 60) }; }
  });
  const broken = lc.filter((l) => l.status === 404 || l.status === 410 || l.status >= 500 || (l.status === 0 && !/Private/.test(l.error || '')));
  add(T, 'broken-links', broken.length === 0 ? 'pass' : 'fail', broken.length ? `${broken.length} broken link(s) found (of ${lc.length} sampled)` : `No broken links in sample (${lc.length} checked)`, { detail: broken.map((b) => `${b.status || 'ERR'}  ${b.url}`).join('\n'), why: 'Broken links frustrate visitors and waste crawl budget; many of them signal a neglected site.', fix: 'Update or remove the broken links, or 301-redirect old URLs to the closest live page.', weight: 'high' });

  // ------------------------------------------------------------ ON-PAGE
  const O = 'On-Page SEO';
  const tl = title.length;
  add(O, 'title', !title ? 'fail' : tl >= 30 && tl <= 65 ? 'pass' : 'warn', !title ? 'Missing <title> tag' : `Title length ${tl} chars${tl < 30 ? ' (too short)' : tl > 65 ? ' (too long, will be cut in Google)' : ''}`, { detail: `"${title}"`, why: 'The title is the clickable headline in Google results and one of the strongest ranking signals.', fix: 'Write a unique 50-60 character title with your main keyword near the start and your brand at the end.', weight: 'high' });
  const dl = metaDesc.length;
  add(O, 'meta-desc', !metaDesc ? 'fail' : dl >= 70 && dl <= 165 ? 'pass' : 'warn', !metaDesc ? 'Missing meta description' : `Meta description length ${dl} chars${dl < 70 ? ' (too short)' : dl > 165 ? ' (too long)' : ''}`, { detail: metaDesc ? `"${metaDesc}"` : '', why: 'Not a direct ranking factor, but it is your ad copy in search results and drives clicks.', fix: 'Write a compelling 120-155 character summary with the main keyword and a call to action.', weight: 'high' });
  const h1n = h.h1.length;
  add(O, 'h1', h1n === 1 ? 'pass' : 'fail', h1n === 0 ? 'No H1 heading' : h1n === 1 ? 'Exactly one H1 heading' : `${h1n} H1 headings (should be 1)`, { detail: h.h1.map((_, e) => $(e).text().trim().slice(0, 100)).get().join(' | '), why: 'The H1 tells Google (and visitors) what the page is about.', fix: 'Use exactly one H1 containing your primary keyword; use H2/H3 for sub-sections.', weight: 'high' });
  let skips = 0; for (let i = 1; i < headings.length; i++) if (headings[i].level - headings[i - 1].level > 1) skips++;
  add(O, 'heading-order', skips === 0 && headings.length > 1 ? 'pass' : headings.length <= 1 ? 'warn' : 'warn', headings.length <= 1 ? 'Very few headings — weak content structure' : skips ? `Heading hierarchy skips levels ${skips}×` : 'Logical heading hierarchy', { detail: headings.slice(0, 25).map((x) => `${'  '.repeat(x.level - 1)}H${x.level} ${x.text}`).join('\n'), why: 'Headings give structure; skipping levels (H1→H4) confuses crawlers and screen readers.', fix: 'Nest headings in order (H1 → H2 → H3) and break content into scannable sections.', weight: 'low' });
  add(O, 'word-count', wordCount >= 300 ? 'pass' : wordCount >= 150 ? 'warn' : 'fail', `${wordCount} words of visible text`, { why: 'Thin pages rarely rank. Google needs enough content to understand intent.', fix: 'Add useful, original content — aim for 500+ words on key pages, answering what users are searching for.', weight: 'med' });
  const flesch = fleschScore(mainText);
  if (flesch !== null) add(O, 'readability', flesch >= 50 ? 'pass' : 'warn', `Readability (Flesch) ${flesch}/100 — ${flesch >= 70 ? 'easy' : flesch >= 50 ? 'fairly easy' : 'hard to read'}`, { why: 'Easy-to-read content keeps visitors on the page longer.', fix: 'Use shorter sentences and simpler words; add bullet lists and subheadings.', weight: 'low' });

  // keywords
  const freq = {};
  const toks = (mainText.toLowerCase().match(/[a-z0-9ऀ-ॿ']{3,}/g) || []).filter((w) => !STOP.has(w) && !/^\d+$/.test(w));
  toks.forEach((w) => { freq[w] = (freq[w] || 0) + 1; });
  const bi = {};
  for (let i = 0; i < toks.length - 1; i++) { const p = toks[i] + ' ' + toks[i + 1]; bi[p] = (bi[p] || 0) + 1; }
  const topKeywords = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([word, count]) => ({ word, count, density: +((count / Math.max(1, toks.length)) * 100).toFixed(2) }));
  const topPhrases = Object.entries(bi).filter(([, c]) => c > 1).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([word, count]) => ({ word, count }));
  const kw = topKeywords[0]?.word;
  if (kw && title) {
    const inT = title.toLowerCase().includes(kw), inH = h.h1.text().toLowerCase().includes(kw);
    add(O, 'keyword-use', inT && inH ? 'pass' : inT || inH ? 'warn' : 'warn', `Top keyword "${kw}" ${inT ? 'is' : 'is NOT'} in title and ${inH ? 'is' : 'is NOT'} in H1`, { why: 'Your most-used topic words should appear in your title and main heading so Google connects them.', fix: 'Make sure your target keyword appears in the title, H1, first paragraph and URL — naturally, without stuffing.', weight: 'low' });
  }

  // images alt
  const altIssues = imgNoAlt;
  add(O, 'img-alt', !imgs.length ? 'info' : altIssues === 0 ? 'pass' : pct(altIssues, imgs.length) > 30 ? 'fail' : 'warn', !imgs.length ? 'No <img> tags found' : altIssues === 0 ? `All ${imgs.length} images have alt attributes` : `${altIssues} of ${imgs.length} images missing alt text`, { detail: imgEmptyAlt ? `${imgEmptyAlt} images have empty alt (OK only for decorative images)` : '', why: 'Alt text helps Google Images ranking and lets blind users understand the image.', fix: 'Add short descriptive alt text to every meaningful image (e.g. alt="red running shoes on a track").', weight: 'med' });

  // social
  const ogOk = og['og:title'] && og['og:description'] && og['og:image'];
  add(O, 'open-graph', ogOk ? 'pass' : Object.keys(og).length ? 'warn' : 'warn', ogOk ? 'Open Graph tags complete' : Object.keys(og).length ? 'Open Graph tags incomplete' : 'No Open Graph tags', { detail: Object.keys(og).join(', '), why: 'Controls the title, description and image shown when your link is shared on WhatsApp, Facebook, LinkedIn.', fix: 'Add og:title, og:description, og:image (1200×630), og:url and og:type.', weight: 'med' });
  add(O, 'twitter-card', tw['twitter:card'] ? 'pass' : 'warn', tw['twitter:card'] ? 'Twitter/X card set' : 'No Twitter/X card tags', { why: 'Makes your links look rich on X (Twitter).', fix: 'Add <meta name="twitter:card" content="summary_large_image"> plus title/description/image.', weight: 'low' });

  // links
  add(O, 'internal-links', uniqInternal.length >= 5 ? 'pass' : uniqInternal.length >= 2 ? 'warn' : 'fail', `${uniqInternal.length} unique internal links, ${new Set(external.map((l) => l.url)).size} external`, { why: 'Internal links spread ranking power and help Google discover your pages.', fix: 'Link to related pages/products/posts with descriptive anchor text; every important page should be reachable within 3 clicks.', weight: 'med' });
  if (genericAnchors || emptyAnchors) add(O, 'anchor-text', 'warn', `${genericAnchors} generic anchors ("click here"), ${emptyAnchors} links with no text`, { why: 'Anchor text tells Google what the linked page is about; empty links are invisible to screen readers.', fix: 'Replace "click here" with descriptive text; give icon-only links an aria-label.', weight: 'low' });
  if (unsafeBlank) add(O, 'noopener', 'warn', `${unsafeBlank} external links open in new tab without rel="noopener"`, { why: 'Security + performance risk (reverse tabnabbing).', fix: 'Add rel="noopener noreferrer" to target="_blank" links.', weight: 'low' });

  // URL
  const p = finalUrl.pathname;
  const urlIssues = [];
  if (page.url.length > 100) urlIssues.push('longer than 100 chars');
  if (/[A-Z]/.test(p)) urlIssues.push('contains uppercase');
  if (/_/.test(p)) urlIssues.push('uses underscores (use hyphens)');
  if (finalUrl.search.length > 1) urlIssues.push('has query parameters');
  if (/%20|\s/.test(p)) urlIssues.push('contains spaces');
  add(O, 'url', urlIssues.length ? 'warn' : 'pass', urlIssues.length ? `URL structure: ${urlIssues.join(', ')}` : 'Clean, SEO-friendly URL', { detail: page.url, why: 'Short, readable, lowercase URLs with hyphens rank and get clicked better.', fix: 'Use short, lowercase, hyphen-separated URLs that include the target keyword.', weight: 'low' });

  // ------------------------------------------------------------ PERFORMANCE
  const P = 'Performance';
  const css = { total: cssFiles.reduce((s, c) => s + c.size, 0) + inlineCss.length };
  const thirdParty = [...new Set(scripts.map((s) => new URL(s.src).hostname).filter((hn) => hn.replace(/^www\./, '') !== finalUrl.hostname.replace(/^www\./, '')))];
  add(P, 'js-count', scripts.length <= 15 ? 'pass' : scripts.length <= 30 ? 'warn' : 'fail', `${scripts.length} external JavaScript files`, { why: 'Each script is another network request and extra work for the browser.', fix: 'Remove unused plugins/scripts, bundle & minify the rest, defer non-critical JS.', weight: 'med' });
  add(P, 'css-count', stylesheets.length <= 8 ? 'pass' : stylesheets.length <= 16 ? 'warn' : 'fail', `${stylesheets.length} stylesheet files (${kb(css.total)} KB CSS total)`, { why: 'Too many CSS files delay first paint.', fix: 'Combine and minify CSS, inline critical CSS, remove unused rules (e.g. with PurgeCSS).', weight: 'med' });
  add(P, 'third-party', thirdParty.length <= 5 ? 'pass' : thirdParty.length <= 10 ? 'warn' : 'fail', `${thirdParty.length} third-party script domains`, { detail: thirdParty.join(', '), why: 'Third-party scripts (ads, chat, trackers) are a top cause of slow pages.', fix: 'Audit each third-party script; remove unneeded ones, load the rest async or after user interaction.', weight: 'med' });
  const minified = cssFiles.filter((c) => c.size > 5000 && c.text.split('\n').length < c.size / 400).length;
  const unmin = cssFiles.filter((c) => c.size > 5000).length - minified;
  if (unmin > 0) add(P, 'css-minify', 'warn', `${unmin} CSS file(s) appear un-minified`, { why: 'Minification strips whitespace and comments, shrinking files.', fix: 'Enable CSS minification in your build tool or caching plugin.', weight: 'low' });
  if (imgs.length) {
    add(P, 'img-modern', legacyFmt > 0 && modernFmt / imgs.length < 0.3 ? 'warn' : 'pass', legacyFmt ? `${legacyFmt} images use older formats (JPG/PNG/GIF); ${modernFmt} use WebP/AVIF/SVG` : 'Images use modern formats', { why: 'WebP/AVIF files are 25-50% smaller than JPG/PNG at the same quality.', fix: 'Convert images to WebP or AVIF and serve them with <picture> or via a plugin/CDN.', weight: 'med' });
    add(P, 'img-lazy', imgs.length < 4 || lazyCount > 0 ? 'pass' : 'warn', lazyCount ? `Lazy loading on ${lazyCount}/${imgs.length} images` : 'No lazy loading on images', { why: 'Lazy loading skips off-screen images until needed, speeding the initial load.', fix: 'Add loading="lazy" to below-the-fold images (not the hero/LCP image).', weight: 'med' });
    add(P, 'img-dim', imgNoDim === 0 ? 'pass' : pct(imgNoDim, imgs.length) > 40 ? 'fail' : 'warn', imgNoDim ? `${imgNoDim} of ${imgs.length} images lack width/height attributes` : 'All images have width & height', { why: 'Without dimensions the page jumps around while loading (Cumulative Layout Shift), a Core Web Vitals metric.', fix: 'Set width and height attributes (or CSS aspect-ratio) on every <img>.', weight: 'med' });
    add(P, 'img-responsive', imgs.length < 3 || imgs.some((i) => i.srcset) ? 'pass' : 'warn', imgs.some((i) => i.srcset) ? 'Responsive images (srcset/picture) used' : 'No responsive images (srcset)', { why: 'Phones shouldn\'t download desktop-sized images.', fix: 'Use srcset/sizes or <picture> so smaller screens get smaller files.', weight: 'low' });
  }
  const fontFaces = (allCss.match(/@font-face/g) || []).length;
  const swap = (allCss.match(/font-display\s*:\s*(swap|optional|fallback)/g) || []).length;
  const googleFontsNoSwap = /fonts\.googleapis\.com/.test(html) && !/display=swap/.test(html);
  if (fontFaces || googleFontsNoSwap) add(P, 'font-display', (swap >= fontFaces && !googleFontsNoSwap) ? 'pass' : 'warn', (swap >= fontFaces && !googleFontsNoSwap) ? 'Web fonts use font-display: swap' : 'Web fonts may block text rendering', { why: 'Without font-display: swap, text stays invisible until the font downloads (FOIT).', fix: 'Add font-display: swap to @font-face or &display=swap to Google Fonts URLs; preload key fonts.', weight: 'low' });
  const preconnect = $('link[rel="preconnect"], link[rel="dns-prefetch"], link[rel="preload"]').length;
  add(P, 'resource-hints', preconnect || !thirdParty.length ? 'pass' : 'info', preconnect ? `${preconnect} preconnect/preload hints` : 'No preconnect/preload hints', { why: 'Hints let the browser start important connections early.', fix: 'Add <link rel="preconnect"> for key third-party origins (fonts, CDN) and preload the hero image/font.', weight: 'low' });
  const inlineScriptKb = kb($('script:not([src])').map((_, e) => $(e).text()).get().join('').length);
  if (inlineScriptKb > 100) add(P, 'inline-js', 'warn', `${inlineScriptKb} KB of inline JavaScript`, { why: 'Large inline scripts bloat the HTML and can\'t be cached.', fix: 'Move inline scripts to external, cacheable, deferred files.', weight: 'low' });

  // ------------------------------------------------------------ UI / UX
  const U = 'UI / UX';
  const mediaQ = (allCss.match(/@media[^{]*\(\s*(max|min)-width/g) || []).length;
  const hasResponsiveFw = tech.technologies.some((t) => ['Bootstrap', 'Tailwind CSS', 'Bulma', 'Foundation', 'Material UI'].includes(t.name));
  const responsive = viewport.includes('width=device-width') && (mediaQ > 0 || hasResponsiveFw || /clamp\(|minmax\(|auto-fit|auto-fill/.test(allCss));
  add(U, 'responsive', responsive ? 'pass' : viewport ? 'warn' : 'fail', responsive ? `Responsive design (${mediaQ} media queries${hasResponsiveFw ? ' + responsive framework' : ''})` : 'No clear responsive-design signals', { why: 'Over 60% of web traffic is mobile. A non-responsive layout drives those visitors away and hurts rankings.', fix: 'Use a mobile-first layout: flexible grids (Flexbox/Grid), relative units, and @media breakpoints (e.g. 640/768/1024px).', weight: 'high' });
  const fixedWidths = (allCss.match(/(?:^|[;{\s])width\s*:\s*(\d{4,})px/g) || []).length;
  if (fixedWidths) add(U, 'fixed-width', 'warn', `${fixedWidths} fixed pixel widths ≥ 1000px in CSS`, { why: 'Fixed wide elements cause horizontal scrolling on phones.', fix: 'Replace large fixed widths with max-width: 100% or percentage/viewport units.', weight: 'med' });
  if (/user-scalable\s*=\s*(no|0)|maximum-scale\s*=\s*1(\.0)?\b/.test(viewport)) add(U, 'zoom-disabled', 'fail', 'Pinch-zoom is disabled on mobile', { detail: viewport, why: 'Users with low vision need to zoom; this fails accessibility standards.', fix: 'Remove user-scalable=no and maximum-scale=1 from the viewport meta tag.', weight: 'med' });

  // fonts
  const fams = {};
  (allCss.match(/font-family\s*:\s*[^;}{]+/gi) || []).forEach((d) => {
    const first = d.replace(/font-family\s*:\s*/i, '').split(',')[0].replace(/!important/g, '').replace(/["']/g, '').trim();
    if (first && !/^(inherit|initial|var\(|-apple-system|system-ui|sans-serif|serif|monospace)/i.test(first)) fams[first] = (fams[first] || 0) + 1;
  });
  const gf = [...html.matchAll(/fonts\.googleapis\.com\/css2?\?[^"']+/g)].flatMap((m) => [...m[0].matchAll(/family=([^&:"'|]+)/g)].map((x) => decodeURIComponent(x[1]).replace(/\+/g, ' ')));
  gf.forEach((f) => { fams[f] = (fams[f] || 0) + 1; });
  const fonts = Object.entries(fams).sort((a, b) => b[1] - a[1]).map(([name, uses]) => ({ name, uses })).slice(0, 8);
  add(U, 'fonts', fonts.length <= 3 ? 'pass' : fonts.length <= 5 ? 'warn' : 'fail', fonts.length ? `${fonts.length} font famil${fonts.length === 1 ? 'y' : 'ies'}: ${fonts.slice(0, 4).map((f) => f.name).join(', ')}` : 'Using system/default fonts only', { why: 'More than 2-3 typefaces looks inconsistent and slows loading.', fix: 'Stick to 1 heading font + 1 body font; limit weights to what you use.', weight: 'low' });
  const tiny = (allCss.match(/font-size\s*:\s*(\d+(\.\d+)?)px/g) || []).map((m) => parseFloat(m.match(/(\d+(\.\d+)?)/)[1])).filter((n) => n > 0 && n < 12).length;
  const base = (allCss.match(/(?:html|body)\s*\{[^}]*font-size\s*:\s*(\d+)px/i) || [])[1];
  if (tiny > 3 || (base && +base < 14)) add(U, 'small-text', 'warn', `Small text: ${tiny} declarations under 12px${base ? `, base size ${base}px` : ''}`, { why: 'Tiny text is hard to read on phones and fails accessibility guidelines.', fix: 'Use at least 16px for body copy and never below 12px for any text.', weight: 'med' });

  // colors
  const colorCount = {};
  const addColor = (c) => { colorCount[c] = (colorCount[c] || 0) + 1; };
  (allCss.match(/#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b/g) || []).forEach((c) => { let x = c.toLowerCase(); if (x.length === 4) x = '#' + x[1] + x[1] + x[2] + x[2] + x[3] + x[3]; addColor(x); });
  (allCss.match(/rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+/g) || []).forEach((c) => { const n = c.match(/\d+/g).map(Number); addColor('#' + n.slice(0, 3).map((v) => Math.min(255, v).toString(16).padStart(2, '0')).join('')); });
  const palette = Object.entries(colorCount).sort((a, b) => b[1] - a[1]).map(([hex, uses]) => ({ hex, uses }));
  const sat = (hex) => { const [r, g, b] = hexToRgb(hex) || [0, 0, 0]; const mx = Math.max(r, g, b), mn = Math.min(r, g, b); return mx === 0 ? 0 : (mx - mn) / mx; };
  const accents = palette.filter((c) => sat(c.hex) > 0.35 && c.uses >= 3).length;
  add(U, 'palette', palette.length === 0 ? 'info' : accents <= 5 ? 'pass' : accents <= 9 ? 'warn' : 'fail', palette.length ? `${palette.length} distinct colours (${accents} strong accent colours)` : 'No colours found in CSS', { why: 'A focused palette (1 primary, 1-2 accents, neutrals) looks professional and builds brand recognition.', fix: 'Define a design-token palette (CSS variables) and remove one-off colour values.', weight: 'low' });

  // contrast heuristic: body text colour vs background
  let contrastInfo = null;
  const bodyRule = allCss.match(/(?:^|\})\s*(?:html\s*,\s*)?body\s*\{[^}]*\}/i)?.[0] || '';
  const fg = bodyRule.match(/[^-]color\s*:\s*(#[0-9a-f]{3,6})\b/i)?.[1];
  const bg = (bodyRule.match(/background(?:-color)?\s*:\s*(#[0-9a-f]{3,6})\b/i) || [])[1] || '#ffffff';
  if (fg && hexToRgb(fg) && hexToRgb(bg)) {
    const ratio = contrast(hexToRgb(fg), hexToRgb(bg));
    contrastInfo = { fg, bg, ratio: +ratio.toFixed(2) };
    add(U, 'contrast', ratio >= 4.5 ? 'pass' : ratio >= 3 ? 'warn' : 'fail', `Body text contrast ${ratio.toFixed(1)}:1 (${fg} on ${bg})`, { why: 'Low contrast text is hard to read, especially outdoors on phones. WCAG requires 4.5:1.', fix: 'Darken the text colour or lighten the background until contrast ≥ 4.5:1.', weight: 'med' });
  }

  // navigation / landmarks
  const hasNav = $('nav').length > 0 || $('header a, [role="navigation"]').length >= 3;
  add(U, 'navigation', hasNav ? 'pass' : 'warn', hasNav ? 'Navigation menu present' : 'No clear navigation menu detected', { why: 'Clear navigation helps visitors (and Google) find your key pages.', fix: 'Add a <nav> with 4-7 clear top-level links in the header.', weight: 'med' });
  const ctaRe = /(buy|shop|order|add to cart|get started|sign ?up|register|book|contact|call|get a quote|free|try|download|subscribe|enquire|apply|join|learn more|start|demo|schedule|request)/i;
  const ctas = $('a,button,input[type=submit]').filter((_, e) => { const t = ($(e).text() || $(e).attr('value') || '').trim(); return t.length > 1 && t.length < 40 && ctaRe.test(t) && ($(e).is('button,input') || /btn|button|cta/i.test($(e).attr('class') || '')); }).length;
  add(U, 'cta', ctas >= 1 ? 'pass' : 'warn', ctas ? `${ctas} call-to-action button(s) found` : 'No obvious call-to-action buttons', { why: 'Without a clear next step, visitors browse and leave without converting.', fix: 'Add one primary, high-contrast CTA above the fold ("Get a Free Quote", "Buy Now", "Book a Call") and repeat it lower on the page.', weight: 'med' });
  const hasFooter = $('footer').length > 0;
  add(U, 'footer', hasFooter ? 'pass' : 'warn', hasFooter ? 'Footer present' : 'No <footer> element', { why: 'Footers hold trust items: contact, policies, social links, sitemap links.', fix: 'Add a footer with contact info, key links, privacy policy and social profiles.', weight: 'low' });
  const hasContact = $('a[href^="tel:"], a[href^="mailto:"], address').length > 0 || /contact/i.test(links.map((l) => l.url + l.text).join(' '));
  add(U, 'contact', hasContact ? 'pass' : 'warn', hasContact ? 'Contact info/link available' : 'No visible contact details', { why: 'Visitors trust sites with phone/email/address — and local SEO needs consistent NAP info.', fix: 'Show phone, email and address (clickable tel:/mailto:) in header or footer, and link a Contact page.', weight: 'med' });
  const social = [...new Set(links.filter((l) => !l.internal).map((l) => (new URL(l.url).hostname.replace(/^www\./, '').match(/(facebook|instagram|twitter|x|linkedin|youtube|pinterest|tiktok|wa|github|threads)\./) || [])[1]).filter(Boolean))];
  add(U, 'social', social.length ? 'pass' : 'info', social.length ? `Social profiles linked: ${social.join(', ')}` : 'No social media links', { why: 'Social links add credibility and extra brand signals.', fix: 'Link your active social profiles in the footer.', weight: 'low' });
  const trust = /privacy|terms|refund|testimonial|review|about/i.test(links.map((l) => l.url).join(' '));
  add(U, 'trust', trust ? 'pass' : 'warn', trust ? 'Trust pages linked (about/privacy/terms…)' : 'No About / Privacy / Terms links found', { why: 'These pages are trust signals for visitors and for Google (E-E-A-T).', fix: 'Add About, Privacy Policy, Terms and (for shops) Refund/Shipping pages and link them in the footer.', weight: 'low' });

  // forms
  const forms = $('form').length;
  const inputs = $('input:not([type=hidden]):not([type=submit]):not([type=button]), textarea, select');
  const unlabeled = inputs.filter((_, e) => { const el = $(e); const id = el.attr('id'); return !(el.attr('aria-label') || el.attr('aria-labelledby') || el.attr('title') || (id && $(`label[for="${id}"]`).length) || el.closest('label').length); }).length;
  if (forms) add(U, 'forms', unlabeled === 0 ? 'pass' : 'warn', unlabeled ? `${unlabeled} of ${inputs.length} form fields have no label` : `${forms} form(s), all fields labelled`, { why: 'Placeholders disappear when typing; labels keep forms usable and accessible.', fix: 'Give every field a visible <label for="id"> (or at least aria-label).', weight: 'med' });
  const inlineStyles = $('[style]').length;
  add(U, 'inline-styles', inlineStyles < 30 ? 'pass' : inlineStyles < 100 ? 'warn' : 'fail', `${inlineStyles} elements use inline style=""`, { why: 'Heavy inline styling points to messy, hard-to-maintain design and bloats HTML.', fix: 'Move styling into CSS classes / a design system.', weight: 'low' });
  const layoutTables = $('table').filter((_, e) => !$(e).find('th').length).length;
  if (layoutTables > 1) add(U, 'layout-tables', 'warn', `${layoutTables} tables used (likely for layout)`, { why: 'Table-based layouts are not responsive and are bad for accessibility.', fix: 'Use CSS Flexbox/Grid for layout; keep <table> for tabular data only.', weight: 'low' });
  const modernLayout = /display\s*:\s*(flex|grid)/.test(allCss) || tech.technologies.some((t) => ['Bootstrap', 'Tailwind CSS'].includes(t.name));
  add(U, 'modern-css', modernLayout ? 'pass' : 'info', modernLayout ? 'Modern layout system (Flexbox/Grid/framework)' : 'No Flexbox/Grid detected', { why: 'Modern CSS layout makes responsive, consistent designs far easier.', fix: 'Adopt CSS Grid/Flexbox for page layout.', weight: 'low' });
  const darkMode = /prefers-color-scheme\s*:\s*dark/.test(allCss);
  add(U, 'dark-mode', 'info', darkMode ? 'Supports dark mode' : 'No dark mode support', { why: 'Optional polish: many users prefer dark UI at night.', fix: darkMode ? '' : 'Optionally add a prefers-color-scheme: dark theme.', weight: 'low' });
  const anim = (allCss.match(/@keyframes|transition\s*:/g) || []).length;
  const reduced = /prefers-reduced-motion/.test(allCss);
  if (anim > 10 && !reduced) add(U, 'reduced-motion', 'warn', 'Animations without prefers-reduced-motion support', { why: 'Motion can cause discomfort for some users.', fix: 'Wrap animations in @media (prefers-reduced-motion: no-preference) or disable them under reduce.', weight: 'low' });

  // ------------------------------------------------------------ ACCESSIBILITY
  const A = 'Accessibility';
  add(A, 'a11y-main', $('main, [role="main"]').length ? 'pass' : 'warn', $('main, [role="main"]').length ? '<main> landmark present' : 'No <main> landmark', { why: 'Screen-reader users jump straight to the main content via landmarks.', fix: 'Wrap the primary content in <main>.', weight: 'low' });
  const skipLink = $('a[href^="#"]').filter((_, e) => /skip/i.test($(e).text())).length > 0;
  add(A, 'a11y-skip', skipLink ? 'pass' : 'info', skipLink ? 'Skip-to-content link present' : 'No "skip to content" link', { why: 'Lets keyboard users bypass the menu on every page.', fix: 'Add a visually-hidden "Skip to content" link as the first focusable element.', weight: 'low' });
  const emptyBtns = $('button').filter((_, e) => { const el = $(e); return !el.text().trim() && !el.attr('aria-label') && !el.attr('title') && !el.find('img[alt]:not([alt=""])').length; }).length;
  add(A, 'a11y-buttons', emptyBtns === 0 ? 'pass' : 'fail', emptyBtns ? `${emptyBtns} button(s) with no accessible name` : 'All buttons have accessible names', { why: 'Icon-only buttons without labels are announced as just "button" to screen readers.', fix: 'Add aria-label="Open menu" (etc.) to icon-only buttons.', weight: 'med' });
  add(A, 'a11y-links', emptyAnchors === 0 ? 'pass' : 'warn', emptyAnchors ? `${emptyAnchors} link(s) with no accessible name` : 'All links have accessible names', { why: 'Links with no text are unusable for screen-reader users.', fix: 'Give icon/image links descriptive aria-label or alt text.', weight: 'med' });
  const focusStyle = /:focus(-visible)?\s*[{,]/.test(allCss);
  const outlineNone = (allCss.match(/outline\s*:\s*(none|0)\b/g) || []).length;
  add(A, 'a11y-focus', focusStyle || !outlineNone ? 'pass' : 'warn', focusStyle ? 'Custom focus styles defined' : outlineNone ? `outline removed ${outlineNone}× without :focus styles` : 'Default focus outlines retained', { why: 'Keyboard users need a visible focus indicator to know where they are.', fix: 'Never remove outlines without providing a clear :focus-visible style.', weight: 'med' });
  const posTab = $('[tabindex]').filter((_, e) => +$(e).attr('tabindex') > 0).length;
  if (posTab) add(A, 'a11y-tabindex', 'warn', `${posTab} element(s) use positive tabindex`, { why: 'Positive tabindex scrambles natural keyboard order.', fix: 'Use tabindex="0" or "-1" only; reorder DOM instead.', weight: 'low' });
  const ids = {}; $('[id]').each((_, e) => { const i = $(e).attr('id'); ids[i] = (ids[i] || 0) + 1; });
  const dupIds = Object.values(ids).filter((n) => n > 1).length;
  add(A, 'a11y-dup-id', dupIds === 0 ? 'pass' : 'warn', dupIds ? `${dupIds} duplicate id value(s)` : 'No duplicate IDs', { why: 'Duplicate IDs break labels, anchors and ARIA references.', fix: 'Make every id unique on the page.', weight: 'low' });
  const iframesNoTitle = $('iframe').filter((_, e) => !$(e).attr('title')).length;
  if (iframesNoTitle) add(A, 'a11y-iframe', 'warn', `${iframesNoTitle} iframe(s) without title`, { why: 'Screen readers announce iframes by title.', fix: 'Add a descriptive title attribute to each iframe.', weight: 'low' });
  add(A, 'a11y-alt', !imgs.length ? 'info' : imgNoAlt === 0 ? 'pass' : 'fail', !imgs.length ? 'No images to check' : imgNoAlt ? `${imgNoAlt} image(s) missing alt (accessibility)` : 'All images have alt attributes', { why: 'Blind users rely on alt text to understand images.', fix: 'Add alt text (or alt="" for purely decorative images).', weight: 'med' });

  // ------------------------------------------------------------ AUTHORITY + TRAFFIC SOURCES
  onProgress('Estimating domain authority & traffic sources…');
  const authNet = await authNetP;
  const trustSignals = [
    { label: 'HTTPS', ok: isHttps }, { label: 'HSTS', ok: sh['strict-transport-security'] },
    { label: 'About/Privacy/Terms pages', ok: trust }, { label: 'Contact details', ok: hasContact },
    { label: 'Schema markup', ok: hasSD }, { label: 'Sitemap', ok: smOk },
  ];
  const authority = scoreAuthority(authNet, trustSignals);
  const estimate = estimateVisits(authNet.tranco, authNet.shared);
  const interimScore = (cat) => { let g = 0, m = 0; checks.filter((c) => c.category === cat && c.status !== 'info').forEach((c) => { g += (c.status === 'pass' ? 1 : c.status === 'warn' ? 0.5 : 0) * c.w; m += c.w; }); return m ? Math.round((g / m) * 100) : 0; };
  const traffic = buildTraffic({
    tech, links, social, og, tw, $, html, host: finalUrl.hostname, schema: [...new Set(ldTypes)], sitemapFound: !!smOk, wordCount, headings,
    lang, hreflang, text: bodyText, telHrefs: $('a[href^="tel:"]').map((_, e) => $(e).attr('href').slice(4)).get(), topKeywordCount: topKeywords.length,
    estimate, authority, hasFavicon: favicon, scores: { 'Technical SEO': interimScore('Technical SEO'), 'On-Page SEO': interimScore('On-Page SEO') },
  });
  const TS = 'Traffic Sources';
  traffic.specs.forEach((sp) => add(TS, sp.id, sp.ok ? 'pass' : sp.failStatus, sp.title, { why: sp.why, fix: sp.fix, weight: sp.weight }));

  // ------------------------------------------------------------ PageSpeed
  onProgress('Waiting for Google PageSpeed (real Lighthouse data)…');
  const psiData = await psiPromise;
  onProgress('Collecting sitemap URLs…');
  const sitemap = await sitemapP;
  if (psiData && psiData.ok) {
    const m = psiData.metrics;
    const grade = (name, v, good, poor) => (v == null ? null : v <= good ? 'pass' : v <= poor ? 'warn' : 'fail');
    const R = (id, name, val, good, poor, fmt, why, fix) => { const s = grade(name, val, good, poor); if (s) add(P, id, s, `${name}: ${fmt}`, { detail: 'Source: Google Lighthouse (mobile)', why, fix, weight: 'high' }); };
    R('lcp', 'Largest Contentful Paint', m.lcp, 2500, 4000, (m.lcp / 1000).toFixed(1) + ' s', 'LCP measures how fast the main content appears. Google uses it for ranking (Core Web Vital).', 'Optimise/preload the hero image, speed up the server, remove render-blocking CSS/JS.');
    R('cls', 'Cumulative Layout Shift', m.cls, 0.1, 0.25, m.cls?.toFixed(3), 'CLS measures annoying layout jumps while loading (Core Web Vital).', 'Set width/height on images & embeds, reserve space for ads/banners, avoid inserting content above existing content.');
    R('tbt', 'Total Blocking Time', m.tbt, 200, 600, Math.round(m.tbt) + ' ms', 'TBT shows how long JavaScript freezes the page (proxy for INP, a Core Web Vital).', 'Split/defer long JS tasks, remove unused JS, reduce third-party scripts.');
    R('fcp', 'First Contentful Paint', m.fcp, 1800, 3000, (m.fcp / 1000).toFixed(1) + ' s', 'FCP is when the first text/image shows.', 'Reduce server response time and render-blocking resources.');
    R('si', 'Speed Index', m.si, 3400, 5800, (m.si / 1000).toFixed(1) + ' s', 'How quickly the page visually fills in.', 'Optimise critical rendering path, compress images, enable caching.');
  }

  // ------------------------------------------------------------ SCORING
  const cats = {};
  for (const c of checks) {
    if (c.status === 'info') continue;
    const v = c.status === 'pass' ? 1 : c.status === 'warn' ? 0.5 : 0;
    (cats[c.category] ||= { got: 0, max: 0 });
    cats[c.category].got += v * c.w; cats[c.category].max += c.w;
  }
  const scores = {};
  Object.entries(cats).forEach(([k, v]) => { scores[k] = Math.round((v.got / v.max) * 100); });
  if (psiData?.ok) { scores['Lighthouse Performance'] = psiData.scores.performance; }
  const catKeys = Object.keys(cats);
  const overall = Math.round(catKeys.reduce((s, k) => s + scores[k], 0) / catKeys.length);

  const issues = checks.filter((c) => c.status === 'fail' || c.status === 'warn')
    .map((c) => ({ ...c, priority: c.w * (c.status === 'fail' ? 2 : 1) }))
    .sort((a, b) => b.priority - a.priority)
    .map((c) => ({ ...c, level: c.priority >= 5 ? 'High' : c.priority >= 3 ? 'Medium' : 'Low' }));

  const counts = { pass: 0, warn: 0, fail: 0, info: 0 };
  checks.forEach((c) => counts[c.status]++);

  return {
    url: startUrl.href, finalUrl: page.url, analyzedAt: new Date().toISOString(),
    overall, scores, counts,
    tech,
    summary: {
      title, metaDesc, status: page.status, ttfb, htmlKb, wordCount, lang, canonical: canonical || null,
      headers: { server: page.headers.server || null, poweredBy: page.headers['x-powered-by'] || null, encoding: enc || null },
      counts: { images: imgs.length, scripts: scripts.length, stylesheets: stylesheets.length, internalLinks: uniqInternal.length, externalLinks: external.length, forms, dom: domNodes },
      redirectChain: page.chain,
    },
    checks, issues,
    content: { headings: headings.slice(0, 60), topKeywords, topPhrases, og, twitter: tw, schema: [...new Set(ldTypes)] },
    ui: { palette: palette.slice(0, 16), fonts, mediaQueries: mediaQ, contrast: contrastInfo, cssKb: kb(css.total), darkMode, frameworks: tech.technologies.filter((t) => /CSS framework|UI library|Icon font/.test(t.category)).map((t) => t.name) },
    security: sh,
    robots: robotsOk ? { found: true, sitemaps: robotsInfo.sitemaps, blocksAll: robotsInfo.blocksAll } : { found: false },
    linkCheck: lc,
    psi: psiData,
    authority, traffic: { channels: traffic.channels, tracking: traffic.tracking, estimate, kpis: traffic.kpis, markets: traffic.markets }, sitemap: { ...sitemap, legacy: smOk ? { url: sitemapUrl, urls: smCount } : null },
  };
}

// ---------------------------------------------------------------- PageSpeed Insights (free, optional)
async function runPageSpeed(url) {
  try {
    const api = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed?strategy=mobile&category=performance&category=accessibility&category=best-practices&category=seo&url=' + encodeURIComponent(url) + (process.env.PSI_API_KEY ? '&key=' + process.env.PSI_API_KEY : '');
    const r = await fetch(api, { signal: AbortSignal.timeout(70000) });
    if (!r.ok) return { ok: false, error: r.status === 429 ? 'PageSpeed API rate limit reached (set PSI_API_KEY env var for higher quota)' : `PageSpeed API returned ${r.status}` };
    const j = await r.json();
    const lh = j.lighthouseResult; if (!lh) return { ok: false, error: 'No Lighthouse data' };
    const a = lh.audits;
    const sc = (k) => (lh.categories[k] ? Math.round(lh.categories[k].score * 100) : null);
    const topOpps = Object.values(a).filter((x) => x.details?.type === 'opportunity' && x.details.overallSavingsMs > 100).sort((x, y) => y.details.overallSavingsMs - x.details.overallSavingsMs).slice(0, 6).map((x) => ({ title: x.title, savingsMs: Math.round(x.details.overallSavingsMs), description: (x.description || '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').slice(0, 200) }));
    const field = j.loadingExperience?.metrics ? Object.fromEntries(Object.entries(j.loadingExperience.metrics).map(([k, v]) => [k, { p75: v.percentile, category: v.category }])) : null;
    return {
      ok: true,
      scores: { performance: sc('performance'), accessibility: sc('accessibility'), bestPractices: sc('best-practices'), seo: sc('seo') },
      metrics: { lcp: a['largest-contentful-paint']?.numericValue, cls: a['cumulative-layout-shift']?.numericValue, tbt: a['total-blocking-time']?.numericValue, fcp: a['first-contentful-paint']?.numericValue, si: a['speed-index']?.numericValue },
      opportunities: topOpps, field,
      screenshot: a['final-screenshot']?.details?.data || null,
    };
  } catch (e) { return { ok: false, error: 'PageSpeed unavailable: ' + (e.message || e) }; }
}

module.exports = { analyze, normalizeUrl };
