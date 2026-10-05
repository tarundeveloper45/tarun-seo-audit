// UI for Domain Authority, Traffic Sources and Sitemap tabs.
// Uses helpers defined in index.html: esc, col, gauge, checkList, save, R.
const NL = String.fromCharCode(10);

function overviewAuthorityCard(d) {
  const a = d.authority;
  return `<div class="card"><div class="grid g2" style="align-items:center">
    <div style="display:flex;gap:18px;align-items:center">${gauge(a.score, 'Authority (est.)')}
      <div><h2>Domain Authority: ${a.score}/100</h2><div class="small mut">${esc(a.tier)} · ${esc(a.domain)}${a.moz ? ' · Moz DA ' + a.moz.da : ''}</div></div></div>
    <div><div class="small mut">Estimated traffic</div><b style="font-size:19px">${esc(d.traffic.estimate.label)}</b>
      <div class="small mut">See the Domain Authority and Traffic Sources tabs for details.</div></div></div></div>`;
}

function authorityPane(d) {
  const A = d.authority;
  const bars = A.breakdown.map((b) => `<div style="margin-bottom:12px">
      <div style="display:flex;justify-content:space-between"><b>${esc(b.label)}</b><span class="mut small">weight ${b.weight}% · ${b.value}/100</span></div>
      <div class="meter"><i style="width:${b.value}%;background:${col(b.value)}"></i></div>
      <div class="mut small" style="margin-top:3px">${esc(b.detail)}</div></div>`).join('');
  const notes = A.notes.map((n) => `<div class="chk warn"><div class="t"><span class="pill warn">Note</span><span>${esc(n)}</span></div></div>`).join('');
  const tips = A.tips.map((t) => `<div class="chk info"><div class="t"><span class="pill info">Tip</span><span>${esc(t)}</span></div></div>`).join('');
  const whois = A.whois ? `<h3 class="tech-only">Domain registration (RDAP)</h3><table class="tech-only"><tr><td>Registered</td><td>${esc(A.whois.registered)}</td></tr><tr><td>Expires</td><td>${esc(A.whois.expires || '—')}</td></tr><tr><td>Registrar</td><td>${esc(A.whois.registrar || '—')}</td></tr></table>` : '';
  return `<div class="card"><h2>Domain Authority (DA) estimate</h2>
    <p class="mut small">How trusted and popular is this domain? Higher authority makes it easier to rank on Google.</p>
    <div class="grid g2" style="align-items:center;margin-top:10px">
      <div style="display:flex;gap:18px;align-items:center;flex-wrap:wrap">${gauge(A.score, 'Authority score', true)}
        <div><div style="font-size:22px;font-weight:800">${esc(A.tier)}</div><div class="mut small">${esc(A.domain)}</div>
        ${A.moz ? `<div class="chip" style="margin-top:8px">Moz DA ${A.moz.da} · PA ${A.moz.pa} · spam ${A.moz.spam}%</div>` : ''}
        ${A.opr ? `<div class="chip" style="margin-top:8px">OpenPageRank ${A.opr.pageRank}/10</div>` : ''}</div></div>
      <div>${bars}</div></div>
    ${notes}<h3>How to increase your authority</h3>${tips}${whois}
    <p class="mut small" style="margin-top:14px">ℹ️ ${esc(A.disclaimer)}</p></div>`;
}

function trafficPane(d) {
  const T = d.traffic;
  const cards = T.channels.map((c) => `<div class="card" style="margin:0">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:8px"><h3 style="margin:0">${c.icon} ${esc(c.name)}</h3>
        <span class="pill ${c.score >= 70 ? 'pass' : c.score >= 40 ? 'warn' : 'fail'}">${c.score}% ${c.level}</span></div>
      <div class="meter"><i style="width:${c.score}%;background:${col(c.score)}"></i></div>
      <div style="margin-top:10px">${c.signals.map((x) => `<div class="small" style="margin:3px 0">${x.ok ? '✅' : '⚠️'} ${esc(x.text)}</div>`).join('')}</div>
      ${c.score < 70 ? `<div class="fix"><b>Improve:</b> ${c.tips.map((t) => '• ' + esc(t)).join(NL)}</div>` : ''}
      ${c.note ? `<p class="mut small">${esc(c.note)}</p>` : ''}</div>`).join('');
  return `<div class="card"><h2>SEO &amp; Traffic Sources</h2>
    <p class="mut small">Where can this site's visitors come from, and how well is it set up for each channel? Scores come from evidence found on the site.</p>
    <div class="grid g2" style="margin:12px 0">
      <div class="stat"><b>${esc(T.estimate.label)}</b><span>Rough monthly visits, estimated from Tranco popularity rank. Treat as a ballpark, not real analytics.</span></div>
      <div class="stat"><b>${T.tracking.ok ? '✅ ' + esc(T.tracking.tools.join(', ')) : '❌ No analytics found'}</b><span>Traffic tracking installed</span></div></div>
    <div class="grid g2">${cards}</div>
    <p class="mut small" style="margin-top:14px">ℹ️ Exact traffic by source (organic / social / direct / referral) is private data. Connect Google Analytics 4 and Google Search Console to see the real numbers for your own site.</p>
    <h3>Traffic-related checks</h3>${checkList('Traffic Sources')}</div>`;
}

function sitemapPane(d) {
  const S = d.sitemap;
  const issues = S.issues.map((i) => `<div class="chk ${i.level}"><div class="t"><span class="pill ${i.level}">${i.level === 'fail' ? '✗ Fix' : i.level === 'warn' ? 'Improve' : 'Info'}</span><span>${esc(i.text)}</span></div><div class="fix"><b>Fix:</b> ${esc(i.fix)}</div></div>`).join('')
    || '<div class="chk pass"><div class="t"><span class="pill pass">✓ Good</span><span>No sitemap problems found</span></div></div>';
  const files = S.files.length ? `<h3>Sitemap files checked</h3><table>${S.files.map((f) => `<tr><td>${f.ok ? '✅' : '❌'}</td><td style="word-break:break-all">${esc(f.url)}</td><td class="mut">${f.ok ? esc(f.type) + ' · ' + f.count + ' URLs' : esc(f.error || 'HTTP ' + (f.status || '?'))}</td></tr>`).join('')}</table>` : '';
  return `<div class="card"><h2>Sitemap ${S.source === 'crawl' ? 'generator' : 'extractor'}</h2>
    <p class="mut small">${S.source === 'sitemap' ? "All URLs found in this site's sitemap." : "No sitemap was found, so we crawled the site's internal links to build a starter list."}</p>
    <div class="grid g4" style="margin:12px 0">
      <div class="stat"><b>${S.total}</b><span>URLs ${S.truncated ? '(first 10,000)' : ''}</span></div>
      <div class="stat"><b>${S.source === 'sitemap' ? 'Found' : 'Missing'}</b><span>Sitemap status</span></div>
      <div class="stat"><b>${S.files.filter((f) => f.ok).length}</b><span>Sitemap files</span></div>
      <div class="stat"><b>${S.lastmod ? esc(S.lastmod.newest) : '—'}</b><span>Latest lastmod</span></div></div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px"><button class="btn" id="dlTxt">⬇ Download sitemap.txt</button><button class="btn" id="dlXml">⬇ Download sitemap.xml</button><button class="btn" id="cpUrls">📋 Copy URLs</button></div>
    ${issues}${files}
    <h3>URL list ${S.total > 300 ? '(first 300 shown, download for all)' : ''}</h3>
    <pre class="detail" style="max-height:340px">${esc(S.urls.slice(0, 300).join(NL) || 'No URLs')}</pre></div>`;
}

document.addEventListener('click', (e) => {
  if (typeof R === 'undefined' || !R) return;
  const urls = R.sitemap.urls;
  if (e.target.id === 'dlTxt') save('sitemap.txt', 'text/plain', urls.join(NL) + NL);
  if (e.target.id === 'dlXml') {
    const day = new Date().toISOString().slice(0, 10);
    const x = (u) => u.replace(/&/g, '&amp;').replace(/</g, '&lt;');
    save('sitemap.xml', 'application/xml', '<?xml version="1.0" encoding="UTF-8"?>' + NL + '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' + NL + urls.map((u) => '  <url><loc>' + x(u) + '</loc><lastmod>' + day + '</lastmod></url>').join(NL) + NL + '</urlset>' + NL);
  }
  if (e.target.id === 'cpUrls') navigator.clipboard.writeText(urls.join(NL)).then(() => { e.target.textContent = '✅ Copied'; });
});

function extraMarkdown(R) {
  return ['', '## Domain authority (estimate)', `- Score: ${R.authority.score}/100 (${R.authority.tier})`, ...R.authority.breakdown.map((b) => `- ${b.label}: ${b.detail}`),
    '', '## Traffic sources', `- Estimated volume: ${R.traffic.estimate.label}`, ...R.traffic.channels.map((c) => `- ${c.name}: ${c.score}% (${c.level})`),
    '', '## Sitemap', `- ${R.sitemap.total} URLs (${R.sitemap.source})`, ...R.sitemap.issues.map((i) => `- ${i.text}`)];
}
