// Domain authority estimate built from free public data (no paid SEO API required):
//  - Tranco popularity rank (research-grade top-1M list combining several sources)
//  - Domain age via RDAP
//  - On-site trust signals (supplied by the analyzer)
// Optional real metrics when keys are set: Moz DA (MOZ_ACCESS_ID + MOZ_SECRET_KEY), OpenPageRank (OPR_API_KEY).

const MULTI_TLD = ['co.uk', 'org.uk', 'ac.uk', 'gov.uk', 'com.au', 'net.au', 'org.au', 'co.in', 'net.in', 'org.in', 'gov.in', 'ac.in', 'co.nz', 'co.jp', 'com.br', 'com.sg', 'com.pk', 'co.za', 'com.mx', 'com.tr', 'co.id', 'com.my', 'com.ph', 'com.ng', 'com.bd', 'com.hk', 'com.cn'];
// Free sub-domain hosts: the parent domain's authority does NOT belong to the user's site.
const SHARED_HOSTS = ['onrender.com', 'vercel.app', 'netlify.app', 'github.io', 'herokuapp.com', 'pages.dev', 'web.app', 'firebaseapp.com', 'blogspot.com', 'wordpress.com', 'wixsite.com', 'myshopify.com', 'azurewebsites.net', 'fly.dev', 'railway.app', 'glitch.me', 'repl.co', 'surge.sh', 'workers.dev', 'framer.website', 'webflow.io', 'carrd.co', 'weebly.com', 'tumblr.com', 'notion.site', 'streamlit.app', 'trycloudflare.com', 'ngrok.io', 'ngrok-free.app', 'koyeb.app', 'up.railway.app', 'onrailway.app', 'amplifyapp.com', 'cloudfront.net'];

function splitHost(hostname) {
  const host = hostname.toLowerCase().replace(/^www\./, '');
  const shared = SHARED_HOSTS.find((s) => host === s || host.endsWith('.' + s));
  if (shared && host !== shared) return { host, domain: host, shared };
  const parts = host.split('.');
  const last2 = parts.slice(-2).join('.');
  const domain = MULTI_TLD.includes(last2) ? parts.slice(-3).join('.') : last2;
  return { host, domain, shared: null };
}

async function getJson(url, opts = {}, timeout = 12000) {
  const r = await fetch(url, { ...opts, signal: AbortSignal.timeout(timeout), headers: { accept: 'application/json', 'user-agent': 'Mozilla/5.0 SEOAuditBot', ...(opts.headers || {}) } });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  return r.json();
}

async function tranco(domain) {
  try {
    const j = await getJson('https://tranco-list.eu/api/ranks/domain/' + encodeURIComponent(domain));
    const ranks = (j.ranks || []).map((x) => x.rank).filter(Boolean);
    if (!ranks.length) return { ranked: false };
    const latest = ranks[0], oldest = ranks[ranks.length - 1];
    return { ranked: true, rank: latest, best: Math.min(...ranks), avg: Math.round(ranks.reduce((a, b) => a + b, 0) / ranks.length), days: ranks.length, trend: latest < oldest * 0.9 ? 'up' : latest > oldest * 1.1 ? 'down' : 'stable' };
  } catch (e) { return { ranked: false, error: String(e.message || e) }; }
}

async function rdap(domain) {
  try {
    const j = await getJson('https://rdap.org/domain/' + encodeURIComponent(domain), {}, 12000);
    const ev = (a) => (j.events || []).find((e) => e.eventAction === a)?.eventDate;
    const reg = ev('registration'), exp = ev('expiration');
    const registrar = (j.entities || []).find((e) => (e.roles || []).includes('registrar'))?.vcardArray?.[1]?.find((x) => x[0] === 'fn')?.[3];
    if (!reg) return null;
    const ageYears = (Date.now() - new Date(reg).getTime()) / (365.25 * 864e5);
    return { registered: reg.slice(0, 10), expires: exp ? exp.slice(0, 10) : null, ageYears: +ageYears.toFixed(1), registrar: registrar || null };
  } catch { return null; }
}

async function openPageRank(domain) {
  const key = process.env.OPR_API_KEY; if (!key) return null;
  try {
    const j = await getJson('https://openpagerank.com/api/v1.0/getPageRank?domains[]=' + encodeURIComponent(domain), { headers: { 'API-OPR': key } });
    const r = j.response?.[0]; if (!r || r.status_code !== 200) return null;
    return { pageRank: r.page_rank_decimal, globalRank: r.rank ? +r.rank : null };
  } catch { return null; }
}

async function moz(domain) {
  const id = process.env.MOZ_ACCESS_ID, secret = process.env.MOZ_SECRET_KEY; if (!id || !secret) return null;
  try {
    const j = await getJson('https://lsapi.seomoz.com/v2/url_metrics', { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Basic ' + Buffer.from(id + ':' + secret).toString('base64') }, body: JSON.stringify({ targets: [domain] }) });
    const r = j.results?.[0]; if (!r) return null;
    return { da: r.domain_authority, pa: r.page_authority, spam: r.spam_score, linkingDomains: r.root_domains_to_root_domain, backlinks: r.external_pages_to_root_domain };
  } catch { return null; }
}

// Network part: starts early, runs in parallel with the rest of the audit.
async function fetchAuthorityData(hostname) {
  const s = splitHost(hostname);
  if (s.shared) return { ...s, tranco: { ranked: false }, whois: null, opr: null, moz: null };
  const [t, w, o, m] = await Promise.all([tranco(s.domain), rdap(s.domain), openPageRank(s.domain), moz(s.domain)]);
  return { ...s, tranco: t, whois: w, opr: o, moz: m };
}

const tier = (n) => (n >= 80 ? 'Excellent' : n >= 60 ? 'High' : n >= 40 ? 'Medium' : n >= 20 ? 'Low' : 'Very low / new');

// Scoring part: needs on-site trust signals from the analyzer.
function scoreAuthority(data, trustSignals) {
  const { tranco: t, whois: w } = data;
  const trustPts = trustSignals.filter((x) => x.ok).length;
  const trust = Math.round((trustPts / Math.max(1, trustSignals.length)) * 100);
  const pop = t.ranked ? Math.max(5, 100 - 9.5 * Math.log10(t.rank)) : 0;
  const age = w ? Math.min(w.ageYears, 15) / 15 * 100 : 0;
  let score = Math.round(0.7 * pop + 0.15 * age + 0.15 * trust);
  if (data.shared) score = Math.min(score, Math.round(trust * 0.15));
  score = Math.max(1, Math.min(100, score));

  const notes = [];
  if (data.shared) notes.push(`This site runs on a free sub-domain of ${data.shared}. The authority of ${data.shared} itself does not pass to your site — you start from zero. A custom domain is the single biggest authority upgrade.`);
  else if (!t.ranked) notes.push('Not in the Tranco top-1 million sites, so it has little measurable traffic/popularity yet. Authority grows mainly through quality backlinks and consistent content.');
  if (w && w.ageYears < 1) notes.push(`Domain is only ${w.ageYears} years old — age builds trust slowly and cannot be rushed.`);

  const tips = [];
  if (data.shared) tips.push('Buy a custom domain (e.g. yourname.com) and connect it — free sub-domains (onrender.com, vercel.app…) rarely rank.');
  if (!t.ranked) tips.push('Get backlinks from relevant, trusted sites: guest posts, directories (Product Hunt, GitHub README, LinkedIn, relevant forums), partner sites and press mentions.');
  tips.push('Publish helpful content regularly (guides, comparisons, case studies) that others want to link to.');
  if (trust < 70) tips.push('Strengthen trust pages: About, Contact, Privacy Policy, HTTPS + security headers, and schema markup.');
  tips.push('Fix toxic/broken links and keep every page fast and mobile-friendly — good UX earns natural links and shares.');

  return {
    score, tier: tier(score), isEstimate: true,
    domain: data.domain, shared: data.shared,
    breakdown: [
      { label: 'Popularity (Tranco rank)', weight: 70, value: Math.round(pop), detail: t.ranked ? `Rank #${t.rank.toLocaleString('en-US')} of 1,000,000 (30-day avg #${t.avg.toLocaleString('en-US')}, trend ${t.trend})` : (t.error ? 'Rank service unavailable' : 'Not in top 1 million') },
      { label: 'Domain age', weight: 15, value: Math.round(age), detail: w ? `Registered ${w.registered} (${w.ageYears} years)${w.registrar ? ' via ' + w.registrar : ''}` : 'Age not available (RDAP)' },
      { label: 'On-site trust signals', weight: 15, value: trust, detail: trustSignals.map((x) => (x.ok ? '✔ ' : '✘ ') + x.label).join('  ') },
    ],
    tranco: t, whois: w, opr: data.opr, moz: data.moz, notes, tips,
    disclaimer: 'This is an independent estimate on a 0-100 scale built from free public data. It is not Moz\'s Domain Authority (DA) — Moz DA needs Moz\'s private backlink index. Add MOZ_ACCESS_ID / MOZ_SECRET_KEY on the server to also show real Moz DA.',
  };
}

// Very rough monthly-visit estimate from Tranco rank (power law). Always presented as a range.
function estimateVisits(t, shared) {
  if (shared) return { range: null, label: 'Too small to estimate (free sub-domain)', tier: 'Micro' };
  if (!t.ranked) return { range: [0, 10000], label: 'Under ~10,000 visits/month (outside the top 1M)', tier: 'Small' };
  const mid = 3e9 / Math.pow(t.avg || t.rank, 0.9);
  const low = Math.round(mid * 0.4), high = Math.round(mid * 2.5);
  const tierName = t.rank <= 1000 ? 'Giant' : t.rank <= 10000 ? 'Very large' : t.rank <= 100000 ? 'Large' : 'Medium';
  const f = (n) => (n >= 1e9 ? (n / 1e9).toFixed(1) + 'B' : n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e3 ? Math.round(n / 1e3) + 'K' : String(n));
  return { range: [low, high], label: `~${f(low)} – ${f(high)} visits/month`, tier: tierName };
}

module.exports = { fetchAuthorityData, scoreAuthority, estimateVisits, splitHost };
