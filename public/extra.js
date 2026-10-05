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
  const T = d.traffic, K = T.kpis;
  const dash = '<span class="mut">—</span>';
  const kpiStrip = `<div class="kpis">
    <div class="kpi"><div class="kl">Domain Trust <i title="Authority estimate: popularity + domain age + trust signals">ⓘ</i></div><div class="big">${K.domainTrust}<small>/100</small></div>
      <div class="ksep"></div><div class="kl">Page Trust <i title="Average of Technical and On-Page SEO scores">ⓘ</i></div><div class="big">${K.pageTrust}<small>/100</small></div></div>
    <div class="kpi"><div class="kl">Organic traffic <i title="Estimated from public popularity rank. Not measured.">ⓘ</i></div><div class="big sm">${esc(T.estimate.label.replace(' visits/month', ''))}</div><div class="ku">visits/mo (estimate)</div>
      <div class="krow"><span>Content keywords</span><b>${K.organic.keywords}</b></div><div class="krow"><span>Source</span><b class="mut">Tranco rank</b></div></div>
    <div class="kpi"><div class="kl">Paid traffic <i title="Detected from ad / conversion tags on the page">ⓘ</i></div><div class="big sm">${K.paid.detected ? 'Running ads' : 'No ads found'}</div><div class="ku">${K.paid.detected ? 'tags detected' : 'no ad tags on page'}</div>
      <div class="krow"><span>Tags</span><b>${K.paid.tags.length ? esc(K.paid.tags.join(', ')) : dash}</b></div><div class="krow"><span>Analytics</span><b>${T.tracking.ok ? '✅' : '❌'}</b></div></div>
    <div class="kpi"><div class="kl">Referring domains <i title="Needs a backlink database (Moz / Ahrefs / Search Console)">ⓘ</i></div><div class="big">${K.referringDomains != null ? K.referringDomains.toLocaleString('en-US') : dash}</div>
      <div class="ksep"></div><div class="kl">Backlinks</div><div class="big">${K.backlinks != null ? K.backlinks.toLocaleString('en-US') : dash}</div>
      ${K.referringDomains == null ? '<div class="ku">Needs Moz API or Search Console</div>' : '<div class="ku">via ' + esc(K.backlinksSource) + '</div>'}</div></div>`;

  const rows = T.markets.length ? T.markets.map((m) => `<tr><td><b>${esc(m.country)}</b></td>
      <td style="min-width:110px"><div style="display:flex;align-items:center;gap:8px"><div class="meter" style="flex:1;margin:0;min-width:56px"><i style="width:${m.share}%;background:var(--pri)"></i></div><span>${m.share}%</span></div></td>
      <td><span class="pill ${m.confidence === 'High' ? 'pass' : m.confidence === 'Medium' ? 'warn' : 'info'}">${m.confidence}</span></td>
      <td class="mut small">${esc(m.evidence.join(' · '))}</td></tr>`).join('')
    : '<tr><td colspan="4" class="mut">No country signals found (no country domain, currency, phone code or region language).</td></tr>';
  const countries = `<div class="card"><h2>Traffic distribution by country</h2>
    <p class="mut small">Likely audience countries, inferred from on-site signals (domain, language, currency, phone codes, places). This shows who the site <i>targets</i>, not measured visitors.</p>
    <table><tr><th>Country</th><th>Signal share</th><th>Confidence</th><th>Evidence</th></tr>${rows}</table></div>`;

  const cards = T.channels.map((c) => `<div class="card" style="margin:0">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:8px"><h3 style="margin:0">${c.icon} ${esc(c.name)}</h3>
        <span class="pill ${c.score >= 70 ? 'pass' : c.score >= 40 ? 'warn' : 'fail'}">${c.score}% ${c.level}</span></div>
      <div class="meter"><i style="width:${c.score}%;background:${col(c.score)}"></i></div>
      <div style="margin-top:10px">${c.signals.map((x) => `<div class="small" style="margin:3px 0">${x.ok ? '✅' : '⚠️'} ${esc(x.text)}</div>`).join('')}</div>
      ${c.score < 70 ? `<div class="fix"><b>Improve:</b> ${c.tips.map((t) => '• ' + esc(t)).join(NL)}</div>` : ''}
      ${c.note ? `<p class="mut small">${esc(c.note)}</p>` : ''}</div>`).join('');

  return `<div class="card" style="padding:0;overflow:hidden"><div style="padding:18px 20px 0"><h2>SEO &amp; Traffic overview</h2>
      <p class="mut small">Estimated from public data and on-site signals. Real visitor numbers come only from Google Analytics / Search Console (your own site) or a paid database such as SE Ranking, Semrush or Similarweb.</p></div>${kpiStrip}</div>
    ${countries}
    <div class="card"><h2>Traffic channels: how well is the site set up for each?</h2><p class="mut small">Scores come from evidence found on the site, with a to-do list for every weak channel.</p>
      <div class="grid g2" style="margin-top:12px">${cards}</div></div>
    <div class="card"><h3 style="margin-top:0">Traffic-related checks</h3>${checkList('Traffic Sources')}</div>`;
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
