// Finds and parses a site's sitemap(s) (XML index, URL set, or plain sitemap.txt) and builds a URL list.
// If the site has no sitemap, falls back to a small crawl of internal links.

const MAX_URLS = 10000;
const MAX_FILES = 25;

const decode = (s) => s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/<!\[CDATA\[|\]\]>/g, '').trim();

function parseXml(text) {
  const isIndex = /<sitemapindex/i.test(text);
  const entries = [];
  const re = isIndex ? /<sitemap>([\s\S]*?)<\/sitemap>/gi : /<url>([\s\S]*?)<\/url>/gi;
  let m;
  while ((m = re.exec(text))) {
    const loc = m[1].match(/<loc>([\s\S]*?)<\/loc>/i);
    if (!loc) continue;
    const lm = m[1].match(/<lastmod>([\s\S]*?)<\/lastmod>/i);
    entries.push({ loc: decode(loc[1]), lastmod: lm ? decode(lm[1]) : null });
  }
  return { isIndex, entries };
}

async function collectSitemap(origin, { robotsPromise, seedLinks, net, onProgress = () => {} }) {
  const { request, mapLimit } = net;
  const originUrl = new URL(origin);
  const robots = await robotsPromise;
  const fromRobots = robots && robots.status === 200 ? [...robots.body.matchAll(/^\s*sitemap\s*:\s*(\S+)/gim)].map((m) => m[1]) : [];
  const candidates = [...new Set([...fromRobots, origin + '/sitemap.xml', origin + '/sitemap_index.xml', origin + '/sitemap.txt', origin + '/wp-sitemap.xml', origin + '/sitemap/sitemap.xml'])];

  const files = []; const urls = []; const lastmods = [];
  const seen = new Set();
  let truncated = false;

  async function load(u, depth) {
    if (seen.has(u) || files.length >= MAX_FILES || depth > 3) return;
    seen.add(u);
    let r;
    let lastErr;
    for (let attempt = 0; attempt < 2 && !(r && r.status < 500); attempt++) { // retry once: free hosts may be waking from sleep
      try { r = await request(u, { timeout: attempt ? 25000 : 12000 }); } catch (e) { lastErr = e; r = null; }
    }
    if (!r) { files.push({ url: u, ok: false, error: String((lastErr && lastErr.message) || lastErr).slice(0, 80) }); return; }
    const body = r.body || '';
    if (r.status !== 200 || /^\s*<(!doctype|html)/i.test(body)) { files.push({ url: u, ok: false, status: r.status }); return; }
    if (/<(urlset|sitemapindex)/i.test(body)) {
      const { isIndex, entries } = parseXml(body);
      files.push({ url: u, ok: true, type: isIndex ? 'index' : 'urlset', count: entries.length, kb: Math.round(r.bytes / 1024) });
      if (isIndex) { for (const e of entries) await load(e.loc, depth + 1); }
      else for (const e of entries) { if (urls.length >= MAX_URLS) { truncated = true; break; } urls.push(e.loc); if (e.lastmod) lastmods.push(e.lastmod); }
    } else if (/^https?:\/\//im.test(body) && !/</.test(body.slice(0, 200))) {
      const lines = body.split(/\r?\n/).map((l) => l.trim()).filter((l) => /^https?:\/\//i.test(l));
      files.push({ url: u, ok: true, type: 'text', count: lines.length, kb: Math.round(r.bytes / 1024) });
      for (const l of lines) { if (urls.length >= MAX_URLS) { truncated = true; break; } urls.push(l); }
    } else files.push({ url: u, ok: false, status: r.status, error: 'not a sitemap' });
  }

  onProgress('Reading sitemap…');
  for (const c of candidates) { await load(c, 0); if (urls.length) break; }

  let source = 'sitemap';
  if (!urls.length) {
    source = 'crawl';
    onProgress('No sitemap found — crawling site links…');
    const found = new Set([origin + '/']);
    const queue = [...seedLinks.filter((l) => { try { return new URL(l).origin === originUrl.origin; } catch { return false; } })];
    queue.forEach((l) => found.add(l.split('#')[0]));
    let round = 0;
    while (round < 2 && found.size < 60) {
      round++;
      const batch = [...found].slice(0, 25 * round);
      const pages = await mapLimit(batch, 6, async (u) => {
        try { const r = await request(u, { timeout: 7000, maxRedirects: 3 }); if (r.status !== 200 || !/html/i.test(r.headers['content-type'] || '')) return []; return [...r.body.matchAll(/<a\s[^>]*href=["']([^"'#]+)["']/gi)].map((m) => { try { return new URL(m[1], u).href; } catch { return null; } }).filter(Boolean); } catch { return []; }
      });
      for (const list of pages) for (const l of list) {
        try { const x = new URL(l); if (x.origin === originUrl.origin && !/\.(jpe?g|png|gif|webp|svg|pdf|zip|css|js|ico|mp4|xml|json)(\?|$)/i.test(x.pathname) && found.size < 60) found.add(x.origin + x.pathname + x.search); } catch { /* skip */ }
      }
    }
    urls.push(...found);
  }

  // quality checks
  const issues = [];
  const uniq = [...new Set(urls)];
  if (uniq.length !== urls.length) {
    const multi = files.filter((f) => f.ok && f.type === 'urlset').length > 1;
    issues.push(multi
      ? { level: 'info', text: `${urls.length - uniq.length} URL(s) appear in more than one sitemap file`, fix: 'Normal for separate image/video/news sitemaps. Make sure the main page sitemap lists each URL only once.' }
      : { level: 'warn', text: `${urls.length - uniq.length} duplicate URL(s) listed`, fix: 'List each URL only once.' });
  }
  if (source === 'sitemap') {
    const foreign = uniq.filter((u) => { try { return new URL(u).host.replace(/^www\./, '') !== originUrl.host.replace(/^www\./, ''); } catch { return true; } });
    if (foreign.length) issues.push({ level: 'fail', text: `${foreign.length} URL(s) belong to a different domain`, fix: 'A sitemap may only contain URLs from its own host. Remove them.' });
    const proto = uniq.filter((u) => u.startsWith('http://')).length;
    if (originUrl.protocol === 'https:' && proto) issues.push({ level: 'warn', text: `${proto} URL(s) use http:// although the site is https`, fix: 'List only the https:// version of every URL.' });
    if (uniq.length > 50000) issues.push({ level: 'fail', text: 'More than 50,000 URLs in one sitemap', fix: 'Split into multiple sitemaps and reference them from a sitemap index.' });
    if (!lastmods.length && files.some((f) => f.type === 'urlset')) issues.push({ level: 'info', text: 'No <lastmod> dates', fix: 'Add accurate <lastmod> so Google knows when pages changed.' });
    if (files.some((f) => f.kb > 49000)) issues.push({ level: 'fail', text: 'A sitemap file exceeds 50 MB', fix: 'Split it into smaller files.' });
    if (!robots || !fromRobots.length) issues.push({ level: 'warn', text: 'Sitemap is not referenced in robots.txt', fix: `Add "Sitemap: ${files.find((f) => f.ok)?.url || origin + '/sitemap.xml'}" to robots.txt.` });
  } else {
    issues.push({ level: 'fail', text: 'No sitemap found on this site', fix: 'Create a sitemap.xml (download the generated one below as a starting point), upload it to the site root, reference it in robots.txt and submit it in Google Search Console.' });
  }

  // sample status check
  const step = Math.max(1, Math.floor(uniq.length / 12));
  const sample = uniq.filter((_, i) => i % step === 0).slice(0, 12);
  const statuses = await mapLimit(sample, 6, async (u) => {
    try { let r = await request(u, { method: 'HEAD', timeout: 7000, readBody: false, maxRedirects: 0 }); if ([403, 405, 501].includes(r.status)) r = await request(u, { timeout: 7000, readBody: false, maxRedirects: 0 }); return { url: u, status: r.status }; }
    catch (e) { return { url: u, status: 0 }; }
  });
  if (source === 'sitemap') {
    const bad = statuses.filter((s) => s.status >= 300 || s.status === 0);
    if (bad.length) issues.push({ level: bad.some((b) => b.status >= 400 || b.status === 0) ? 'fail' : 'warn', text: `${bad.length} of ${statuses.length} sampled URLs don't return 200 (${bad.slice(0, 3).map((b) => b.status || 'ERR').join(', ')})`, fix: 'Sitemaps should contain only live, indexable 200-status URLs. Remove redirected/broken URLs.' });
  }

  const dates = lastmods.map((d) => new Date(d)).filter((d) => !isNaN(d));
  return {
    found: source === 'sitemap' && uniq.length > 0, source,
    files, total: uniq.length, truncated, urls: uniq,
    lastmod: dates.length ? { newest: new Date(Math.max(...dates)).toISOString().slice(0, 10), oldest: new Date(Math.min(...dates)).toISOString().slice(0, 10) } : null,
    issues, sampled: statuses,
  };
}

module.exports = { collectSitemap };
