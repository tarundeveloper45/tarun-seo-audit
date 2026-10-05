// Guess which countries a site targets from on-site signals (NOT measured visitor data).
const TLD = { in: 'India', uk: 'United Kingdom', au: 'Australia', ca: 'Canada', de: 'Germany', fr: 'France', nz: 'New Zealand', sg: 'Singapore', ae: 'UAE', pk: 'Pakistan', bd: 'Bangladesh', np: 'Nepal', lk: 'Sri Lanka', za: 'South Africa', ng: 'Nigeria', br: 'Brazil', mx: 'Mexico', es: 'Spain', it: 'Italy', nl: 'Netherlands', jp: 'Japan', id: 'Indonesia', my: 'Malaysia', ph: 'Philippines', tr: 'Turkey', sa: 'Saudi Arabia', us: 'USA' };
const REGION = { IN: 'India', GB: 'United Kingdom', US: 'USA', AU: 'Australia', CA: 'Canada', DE: 'Germany', FR: 'France', NZ: 'New Zealand', SG: 'Singapore', AE: 'UAE', PK: 'Pakistan', BD: 'Bangladesh', NP: 'Nepal', ZA: 'South Africa', NG: 'Nigeria', BR: 'Brazil', MX: 'Mexico', ES: 'Spain', IT: 'Italy', NL: 'Netherlands', JP: 'Japan', ID: 'Indonesia', MY: 'Malaysia', PH: 'Philippines' };
const PHONE = [['+91', 'India'], ['+44', 'United Kingdom'], ['+61', 'Australia'], ['+971', 'UAE'], ['+92', 'Pakistan'], ['+880', 'Bangladesh'], ['+977', 'Nepal'], ['+65', 'Singapore'], ['+27', 'South Africa'], ['+234', 'Nigeria'], ['+49', 'Germany'], ['+33', 'France'], ['+64', 'New Zealand'], ['+1', 'USA']];
const LANG = { hi: 'India', ne: 'Nepal', bn: 'Bangladesh', ur: 'Pakistan', ta: 'India', te: 'India', mr: 'India', gu: 'India', pa: 'India', de: 'Germany', fr: 'France', es: 'Spain', pt: 'Brazil', ja: 'Japan', id: 'Indonesia' };

function detectMarkets({ host, lang, hreflang, text, telHrefs }) {
  const pts = {}, why = {};
  const add = (country, n, reason) => { pts[country] = (pts[country] || 0) + n; (why[country] ||= new Set()).add(reason); };

  const tld = host.split('.').pop();
  if (TLD[tld]) add(TLD[tld], 4, `.${tld} domain`);
  const l = (lang || '').replace('_', '-');
  const reg = l.split('-')[1]; if (reg && REGION[reg.toUpperCase()]) add(REGION[reg.toUpperCase()], 3, `lang="${l}"`);
  const base = l.split('-')[0].toLowerCase(); if (LANG[base]) add(LANG[base], 2, `${base} language`);
  (hreflang || []).forEach((h) => { const r = h.split('-')[1]; if (r && REGION[r.toUpperCase()]) add(REGION[r.toUpperCase()], 3, `hreflang ${h}`); });
  telHrefs.forEach((t) => { const n = decodeURIComponent(t).replace(/[^\d+]/g, ''); const m = PHONE.find(([p]) => n.startsWith(p)); if (m) add(m[1], 3, `phone ${m[0]}`); });
  const sample = (text || '').slice(0, 30000);
  if (/₹|\bINR\b|\bRs\.?\s?\d|\brupees?\b/i.test(sample)) add('India', 2, 'prices in ₹ / INR');
  if (/£|\bGBP\b/.test(sample)) add('United Kingdom', 2, 'prices in £');
  if (/\bAED\b|\bdirhams?\b/i.test(sample)) add('UAE', 2, 'prices in AED');
  if (/\bAUD\b|A\$/.test(sample)) add('Australia', 2, 'prices in AUD');
  if (/\bCAD\b|C\$/.test(sample)) add('Canada', 2, 'prices in CAD');
  if (/\$\s?\d/.test(sample) && !Object.keys(pts).length) add('USA', 1, 'prices in $');
  if (/\b(India|Delhi|Mumbai|Bengaluru|Bangalore|Noida|Gurgaon|Gurugram|Pune|Hyderabad|Chennai|Kolkata|Jaipur|Uttar Pradesh|Maharashtra)\b/.test(sample)) add('India', 2, 'Indian cities/states mentioned');
  if (/\b(London|Manchester|England|Scotland)\b/.test(sample)) add('United Kingdom', 2, 'UK places mentioned');
  if (/\b(New York|California|Texas|Florida)\b/.test(sample)) add('USA', 2, 'US places mentioned');
  if (/\b(Dubai|Abu Dhabi|Sharjah)\b/.test(sample)) add('UAE', 2, 'UAE places mentioned');

  const total = Object.values(pts).reduce((a, b) => a + b, 0);
  return Object.entries(pts).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([country, p]) => ({
    country, share: Math.round((p / total) * 100), confidence: p >= 6 ? 'High' : p >= 3 ? 'Medium' : 'Low', evidence: [...why[country]],
  }));
}

module.exports = { detectMarkets };
