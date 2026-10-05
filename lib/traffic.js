// "SEO & traffic sources" analysis.
// Real visitor numbers by channel are private (Google Analytics / Search Console / SimilarWeb), so this does NOT
// invent a traffic split. It reports, per channel, what the site is doing to attract that traffic (evidence found
// on the page) plus a rough popularity-based volume estimate, and tells you what to improve.

function buildTraffic(c) {
  const { tech, links, social, og, tw, $, html, scores, schema, sitemapFound, wordCount, headings, estimate, authority } = c;
  const names = new Set(tech.technologies.map((t) => t.name));
  const hasAny = (...n) => n.filter((x) => names.has(x));

  // ---- tracking: can the owner even measure traffic?
  const analytics = hasAny('Google Analytics (GA4/UA)', 'Google Tag Manager', 'Microsoft Clarity', 'Hotjar', 'Mixpanel', 'Segment');
  const hasPlausible = /plausible\.io|umami|matomo|fathom|simpleanalytics/i.test(html);
  const tracking = { tools: analytics.concat(hasPlausible ? ['Privacy analytics'] : []), ok: analytics.length > 0 || hasPlausible };

  // ---- signals
  const shareLinks = links.filter((l) => /facebook\.com\/sharer|twitter\.com\/intent|x\.com\/intent|linkedin\.com\/(sharing|shareArticle)|wa\.me\/\?text|api\.whatsapp\.com\/send\?text|pinterest\.com\/pin\/create|t\.me\/share/i.test(l.url)).length;
  const utmLinks = links.filter((l) => /utm_(source|medium|campaign)=/i.test(l.url)).length;
  const emailForm = $('input[type="email"]').length + $('input[name*="email" i], input[placeholder*="email" i]').not('[type="email"]').length;
  const newsletter = emailForm > 0 || /subscribe|newsletter/i.test($('form').text() + ' ' + $('button').text());
  const emailTools = hasAny('Mailchimp', 'HubSpot');
  const blogLinks = links.filter((l) => l.internal && /\/(blog|news|articles?|insights|resources|guides?|learn)(\/|$)/i.test(l.url)).length;
  const video = names.has('YouTube embed') || /youtube\.com\/(@|channel|c\/)/i.test(links.map((l) => l.url).join(' '));
  const local = names.has('Google Maps') || $('a[href^="tel:"]').length > 0 || $('address').length > 0 || /LocalBusiness|Store|Restaurant/i.test(schema.join(' '));
  const wa = names.has('WhatsApp chat link');
  const paidTags = hasAny('Google Ads / Conversion', 'Facebook Pixel');
  const otherAds = /adsbygoogle|doubleclick\.net|ads\.linkedin|snap\.licdn|analytics\.tiktok|static\.ads-twitter|bat\.bing\.com|pinterest\.com\/ct/i.test(html);
  const ogOk = og['og:title'] && og['og:description'] && og['og:image'];
  const twOk = !!tw['twitter:card'];
  const brandInTitle = (() => { const t = ($('title').first().text() || '').toLowerCase(); const host = c.host.split('.')[0].replace(/-/g, ' '); return host.length > 2 && t.replace(/-/g, ' ').includes(host); })();

  const sig = (ok, text) => ({ ok: !!ok, text });
  const pct = (arr) => Math.round((arr.filter((s) => s.ok).length / arr.length) * 100);
  const lvl = (n) => (n >= 70 ? 'strong' : n >= 40 ? 'moderate' : 'weak');

  const organicSignals = [
    sig(scores['Technical SEO'] >= 70, `Technical SEO score ${scores['Technical SEO']}/100`),
    sig(scores['On-Page SEO'] >= 70, `On-page SEO score ${scores['On-Page SEO']}/100`),
    sig(sitemapFound, 'XML sitemap available for Google'),
    sig(schema.length > 0, schema.length ? `Schema markup (${schema.slice(0, 3).join(', ')})` : 'No schema markup for rich results'),
    sig(wordCount >= 500, `${wordCount} words of content`),
    sig(blogLinks > 0, blogLinks ? 'Blog / content hub linked' : 'No blog or resource section found'),
    sig(headings.filter((h) => h.level === 2).length >= 3, 'Content split into sections (H2s) for featured snippets'),
  ];
  const socialSignals = [
    sig(social.length >= 2, social.length ? `Social profiles linked: ${social.join(', ')}` : 'No social profiles linked'),
    sig(ogOk, ogOk ? 'Open Graph preview tags complete' : 'Open Graph tags incomplete (bad link previews)'),
    sig(twOk, twOk ? 'Twitter/X card set' : 'No Twitter/X card'),
    sig(shareLinks > 0, shareLinks ? 'Share buttons present' : 'No share buttons'),
    sig(video, video ? 'Video (YouTube) presence' : 'No YouTube/video presence'),
    sig(wa, 'WhatsApp contact/share link'),
  ];
  const paidSignals = [
    sig(paidTags.length > 0 || otherAds, paidTags.length || otherAds ? `Ad tags detected: ${paidTags.concat(otherAds ? ['other ad network'] : []).join(', ')}` : 'No ad/conversion tags found (no paid campaigns detected)'),
    sig(utmLinks > 0, utmLinks ? `${utmLinks} UTM-tagged links` : 'No UTM-tagged links'),
    sig(tracking.ok, 'Analytics present to measure ad results'),
  ];
  const emailSignals = [
    sig(newsletter, newsletter ? 'Email/newsletter signup found' : 'No email signup form'),
    sig(emailTools.length > 0, emailTools.length ? `Email/CRM tool: ${emailTools.join(', ')}` : 'No email marketing tool detected'),
  ];
  const directSignals = [
    sig(authority.tranco.ranked, authority.tranco.ranked ? `Top-1M site (Tranco rank #${authority.tranco.rank.toLocaleString('en-US')})` : 'Not in the top 1M sites — low brand search/direct traffic'),
    sig(brandInTitle, 'Brand name present in title tag'),
    sig(c.hasFavicon, 'Favicon / recognisable brand identity'),
    sig(authority.score >= 40, `Authority estimate ${authority.score}/100`),
  ];
  const referralSignals = [
    sig(authority.tranco.ranked, 'Domain is popular enough to attract natural referrals'),
    sig(authority.whois && authority.whois.ageYears >= 2, authority.whois ? `Domain age ${authority.whois.ageYears} yrs` : 'Domain age unknown'),
    sig(utmLinks > 0 || shareLinks > 0, 'Content is set up to be shared/tracked'),
  ];
  const localSignals = [sig(local, local ? 'Local signals: phone / address / map / LocalBusiness schema' : 'No local signals (phone, address, map, LocalBusiness schema)')];

  const mk = (id, name, icon, signals, tips, extra = {}) => { const score = pct(signals); return { id, name, icon, score, level: lvl(score), signals, tips, ...extra }; };

  const channels = [
    mk('organic', 'Organic Search (Google/Bing)', '🔎', organicSignals, [
      'Target 1 clear keyword per page and match search intent in the title, H1 and first paragraph.',
      'Publish helpful articles/FAQs; add FAQ and Article schema for rich results.',
      'Fix the red items in the Technical and On-Page SEO tabs first — they directly limit Google traffic.',
    ]),
    mk('social', 'Social Media', '📣', socialSignals, [
      'Complete og:title, og:description and a 1200×630 og:image so shared links look professional.',
      'Link your active profiles in the header/footer and add share buttons on content pages.',
      'Repurpose content as short videos / carousels and always link back to the site.',
    ]),
    mk('paid', 'Paid Ads', '💰', paidSignals, [
      'If you run Google/Meta ads, install the conversion tags and use UTM links so you can see ROI.',
      'Start small with branded + high-intent keyword campaigns to a dedicated landing page.',
    ]),
    mk('email', 'Email & Newsletter', '✉️', emailSignals, [
      'Add a signup form with a clear incentive (checklist, discount, free report).',
      'Connect it to Mailchimp/Brevo/HubSpot and send a regular value-first email.',
    ]),
    mk('direct', 'Direct & Brand', '🏷️', directSignals, [
      'Use your brand name consistently (title, logo, social handles) so people can search for you directly.',
      'Register Google Business Profile and claim brand handles — brand searches convert best.',
    ]),
    mk('referral', 'Referral & Backlinks', '🔗', referralSignals, [
      'Earn links from relevant sites: guest posts, partner pages, directories, GitHub/Product Hunt, press.',
      'Create linkable assets (free tools, original data, guides). Check your real backlinks in Google Search Console → Links.',
    ], { note: 'Real backlink and referral numbers need Google Search Console or a backlink database (Ahrefs/Moz/Semrush).' }),
  ];
  if (local) channels.push(mk('local', 'Local / Maps', '📍', localSignals, ['Keep name, address and phone identical everywhere (NAP) and collect Google reviews.']));

  const specs = [
    { id: 'tr-analytics', ok: tracking.ok, title: tracking.ok ? `Traffic tracking installed (${tracking.tools.join(', ')})` : 'No analytics/traffic tracking detected', why: 'Without analytics you cannot see where visitors come from or which channel works.', fix: 'Install Google Analytics 4 (via Google Tag Manager) and connect Google Search Console.', weight: 'high', failStatus: 'fail' },
    { id: 'tr-social', ok: social.length >= 2, title: social.length ? `${social.length} social profile(s) linked` : 'No social profile links', why: 'Social profiles drive referral traffic and brand-search demand.', fix: 'Link your active social profiles in the header or footer.', weight: 'low', failStatus: 'warn' },
    { id: 'tr-newsletter', ok: newsletter, title: newsletter ? 'Email capture available' : 'No email/newsletter signup', why: 'Email turns one-time visitors into repeat traffic you own.', fix: 'Add a newsletter or lead-magnet signup form.', weight: 'med', failStatus: 'warn' },
    { id: 'tr-content', ok: blogLinks > 0, title: blogLinks ? 'Blog / content section linked' : 'No blog or content hub found', why: 'Organic search traffic mostly comes from content that answers questions.', fix: 'Start a /blog with helpful posts targeting long-tail keywords your customers search.', weight: 'med', failStatus: 'warn' },
    { id: 'tr-share', ok: shareLinks > 0 || ogOk, title: ogOk ? 'Link previews configured for sharing' : 'Poor sharing setup (no complete Open Graph tags / share buttons)', why: 'Good previews increase clicks when your link is shared on WhatsApp, LinkedIn and Facebook.', fix: 'Add complete Open Graph tags and share buttons.', weight: 'low', failStatus: 'warn' },
  ];

  return { channels, tracking, estimate, specs };
}

module.exports = { buildTraffic };
