// All indexable pages of the site: one money page per search intent + guides.
// Each page gets its own title, description, canonical, schema, content, FAQ and internal links.

const SITE = 'https://tarundeveloper-9n6b.vercel.app/';
const BRAND = 'Tarun Developer';
const PHONE_DISPLAY = '+91 98210 12189';
const PHONE_TEL = '+919821012189';
const WHATSAPP = 'https://wa.me/919821012189';

const CONTACT_HTML = `<div class="card prose" id="contact-form-card"><h2>Send me a message</h2>
  <p>Fill in the form and I will reply by email or phone. Fields marked * are required.</p>
  <form id="contactForm" method="post" action="/contact" novalidate>
    <div class="fgrid2">
      <div><label for="cf-name">Your name *</label><input id="cf-name" name="name" type="text" autocomplete="name" required maxlength="80"></div>
      <div><label for="cf-email">Email *</label><input id="cf-email" name="email" type="email" autocomplete="email" required maxlength="120"></div>
      <div><label for="cf-phone">Phone / WhatsApp</label><input id="cf-phone" name="phone" type="tel" autocomplete="tel" maxlength="20"></div>
      <div><label for="cf-subject">Subject</label><select id="cf-subject" name="subject"><option>Website audit help</option><option>SEO / technical fixes</option><option>New website</option><option>Report a bug</option><option>Other</option></select></div>
    </div>
    <label for="cf-message">Message *</label><textarea id="cf-message" name="message" rows="5" required maxlength="2000"></textarea>
    <input type="text" name="_honey" tabindex="-1" autocomplete="off" style="position:absolute;left:-9999px" aria-hidden="true">
    <button type="submit" class="fbtn" id="cf-send">Send message</button>
    <p id="cf-status" role="status" aria-live="polite" class="small"></p>
  </form></div>`;
const FEATURES = [
  ['🧩', 'Tech-stack detection', 'WordPress, Shopify, React, Next.js, Cloudflare and 130+ more, with versions.'],
  ['⚙️', 'Technical SEO', 'HTTPS, speed, robots.txt, sitemap, security headers, broken links, schema.'],
  ['📝', 'On-page SEO', 'Title, description, headings, keywords, images, links and social tags.'],
  ['🎨', 'UI/UX & accessibility', 'Colours, fonts, responsiveness, contrast, CTAs, forms and WCAG checks.'],
  ['🏆', 'Domain authority', 'A 0-100 authority estimate from popularity, domain age and trust signals.'],
  ['🚦', 'Traffic sources', 'Channel readiness, audience countries and a rough traffic estimate.'],
];

const pages = [
  {
    path: '/', type: 'home', name: 'Free Website Audit Tool',
    title: 'Free Website Audit Tool – SEO, Tech Stack & UI Checker',
    desc: 'Free website audit tool: paste any URL for a technical and on-page SEO audit, see what it is built with, check UI/UX and get a prioritised fix list.',
    h1: 'Free <span class="grad">Website Audit Tool</span> — SEO Checker, Tech Stack &amp; UI Analyzer',
    sub: 'Enter any website URL to see what it is built with, find SEO problems that hurt its Google ranking, check its UI/UX and accessibility, and get a clear list of what to fix.',
    sections: [
      { h: 'What does this website audit tool check?', p: ['This free <b>website audit tool</b> works as an <b>SEO checker</b>, a <b>website technology detector</b>, a <b>domain authority estimator</b> and a <b>UI analyzer</b> in one place. It analyses the page you enter and produces a score for Technical SEO, On-Page SEO, Performance, UI/UX, Accessibility and Traffic Sources, followed by a prioritised action plan you can hand straight to a developer.'],
        ul: ['<b>Find out what a website is built with</b> – CMS (WordPress, Shopify, Wix, Webflow), JavaScript frameworks (React, Next.js, Vue, Angular), CSS libraries, hosting/CDN and analytics tools.', '<b>Technical SEO audit</b> – HTTPS, server response time, compression, robots.txt, XML sitemap, canonical tags, noindex, security headers, broken links and schema markup.', '<b>On-page SEO audit</b> – title tag, meta description, H1–H6 structure, keyword usage, image alt text, internal and external links, Open Graph and Twitter cards.', '<b>UI &amp; UX check</b> – colour palette, typography, responsive layout, contrast, navigation, calls to action, forms and WCAG accessibility basics.', '<b>Authority, traffic and sitemap</b> – a domain authority estimate, traffic channel readiness, and a sitemap extractor with downloadable sitemap.txt.'] },
      { h: 'Who is this website analyzer for?', p: ['Business owners use it to see why their site is not getting visitors. Freelancers and agencies use it to produce a quick audit before a sales call. Developers use it to spot technical problems before launch. Marketers use it to study what a competitor\'s website is built with and how well it is optimised.'] },
      { h: 'How is the report different from other SEO checkers?', p: ['Every finding comes with a plain-English reason and an exact fix, and you can switch between a simple view for business owners and a technical view for developers. You can download the finished report as PDF, Markdown or JSON, so it is easy to share with your team or client.'] },
    ],
    faq: [
      ['What is a website audit tool?', 'A website audit tool scans a web page and reports problems that hurt its Google ranking, speed, usability and security, together with how to fix them. This free tool also detects which technology the website is built on.'],
      ['How do I check which technology a website is built on?', 'Paste the website URL into the box above and press Analyze. The tool reads the page, response headers and scripts to detect the CMS, framework, hosting and analytics tools, such as WordPress, Shopify, Wix, React, Next.js or Cloudflare, usually with the version.'],
      ['What does the SEO audit check?', 'Technical SEO (HTTPS, server speed, robots.txt, XML sitemap, canonical tags, security headers, broken links, structured data) and on-page SEO (title, meta description, headings, keywords, image alt text, internal links, Open Graph tags).'],
      ['Can this tool check a website UI and design?', 'Yes. The UI check reviews colour palette, fonts, responsive design, text contrast, navigation, call-to-action buttons, forms and accessibility issues such as missing labels or alt text, and gives suggestions to improve the user experience.'],
      ['Is this website audit tool free?', 'Yes, it is completely free with no signup. You can download the report as PDF, Markdown or JSON.'],
      ['Can I audit any website, including a competitor?', 'You can audit any public website. The tool analyses one page at a time, and it cannot access private, password-protected or local addresses.'],
    ],
    related: ['/seo-audit-tool', '/website-technology-checker', '/domain-authority-checker', '/website-ui-checker', '/sitemap-extractor', '/website-traffic-checker'],
  },

  {
    path: '/website-technology-checker', type: 'tool', name: 'Website Technology Checker',
    title: 'What Is This Website Built With? Free Technology Checker',
    desc: 'Find out what any website is built with: CMS (WordPress, Shopify, Wix), framework (React, Next.js), hosting, CDN and analytics. Free and instant.',
    h1: 'What Is This Website <span class="grad">Built With?</span> Free Technology Checker',
    sub: 'Enter a URL to detect the CMS, JavaScript framework, CSS library, web server, hosting/CDN and marketing tools behind any website.',
    sections: [
      { h: 'How does the website technology checker work?', p: ['Every website leaves fingerprints: the HTML it sends, the HTTP headers its server returns, the scripts and stylesheets it loads and the cookies it sets. This tool reads those signals and matches them against more than 130 known technologies, so you can see in seconds whether a site runs on WordPress, Shopify, Wix, Webflow, Next.js, React, Laravel and more.'] },
      { h: 'What technologies can it detect?', ul: ['<b>CMS and website builders</b> – WordPress, WooCommerce, Shopify, Wix, Squarespace, Webflow, Framer, Drupal, Joomla, Ghost, Magento.', '<b>JavaScript frameworks and libraries</b> – React, Next.js, Vue, Nuxt, Angular, Svelte, Gatsby, Astro, jQuery.', '<b>CSS frameworks and fonts</b> – Bootstrap, Tailwind CSS, Font Awesome, Google Fonts.', '<b>Servers, hosting and CDN</b> – Nginx, Apache, Cloudflare, Vercel, Netlify, AWS CloudFront, Fastly.', '<b>Analytics and marketing</b> – Google Analytics, Google Tag Manager, Meta Pixel, Hotjar, HubSpot, Mailchimp, chat widgets and payment gateways.'] },
      { h: 'Why check what a website is built with?', p: ['Knowing the technology helps you plan a rebuild or migration, estimate the cost of copying a feature, understand why a competitor\'s site is fast, and choose the right SEO fixes. A WordPress site, for example, is improved with plugins and caching, while a Next.js site needs server-side rendering and metadata fixes.'] },
      { h: 'Limits you should know', p: ['Detection is based on public signals. A site that hides its footprint, uses a heavy CDN or renders everything on the server may show fewer technologies. Back-end languages and databases are only detected when the server reveals them.'] },
    ],
    faq: [
      ['How can I tell if a website is built on WordPress?', 'Run the URL through this checker. Typical signs are /wp-content/ and /wp-includes/ paths in the page source, a meta generator tag mentioning WordPress, and the /wp-json/ API endpoint.'],
      ['Can I find out which hosting a website uses?', 'Often yes. Response headers such as Server, Via and cf-ray reveal CDNs and hosts like Cloudflare, Vercel, Netlify or AWS. The real origin server can be hidden behind a CDN.'],
      ['Is it legal to check what technology a website uses?', 'Yes. The tool only reads information that the website sends publicly to every visitor, the same data your browser receives.'],
      ['Why did the checker show very few technologies?', 'Some sites render content with JavaScript, block bots or hide their stack. Try a deeper inner page, or inspect the page source manually.'],
    ],
    related: ['/guides/how-to-check-what-a-website-is-built-with', '/seo-audit-tool', '/website-ui-checker'],
  },

  {
    path: '/seo-audit-tool', type: 'tool', name: 'SEO Audit Tool',
    title: 'Free SEO Audit Tool – Technical & On-Page SEO Checker',
    desc: 'Run a free technical and on-page SEO audit on any URL. Checks title, meta, headings, robots.txt, sitemap, HTTPS, speed, schema and broken links, with fixes.',
    h1: 'Free <span class="grad">SEO Audit Tool</span> — Technical &amp; On-Page SEO Checker',
    sub: 'Paste a URL and get a scored SEO report with every problem explained in plain English and an exact fix for each one.',
    sections: [
      { h: 'What does the SEO audit include?', p: ['The audit runs more than 60 checks across technical SEO, on-page SEO, performance, UI/UX and accessibility, then ranks every issue as High, Medium or Low priority so you know what to fix first.'] },
      { h: 'Technical SEO checks', ul: ['HTTPS, redirects and HTTP status code', 'Server response time (TTFB), compression and caching headers', 'robots.txt rules and XML sitemap availability', 'Canonical tag, noindex directives and mobile viewport', 'Security headers: HSTS, CSP, X-Frame-Options, X-Content-Type-Options', 'Broken internal and external links, soft-404 handling and mixed content', 'Structured data (JSON-LD schema), Open Graph and hreflang'] },
      { h: 'On-page SEO checks', ul: ['Title tag length and keyword usage', 'Meta description presence and length', 'One H1 and a logical H2–H6 hierarchy', 'Word count, readability and top keywords', 'Image alt text, lazy loading and modern formats', 'Internal link count, generic anchor text and URL structure'] },
      { h: 'How to use the report', p: ['Start with the Action Plan tab. Fix the High priority items first (usually indexing blocks, missing titles, slow server response or a missing sitemap), then the Medium ones. Re-run the audit after each round of fixes and watch the score rise. Download the report as PDF to share it with a client or developer.'] },
    ],
    faq: [
      ['What is an SEO audit?', 'An SEO audit is a check-up of a website that finds technical, content and usability problems preventing it from ranking well in search engines, and lists how to fix them.'],
      ['How often should I run an SEO audit?', 'Run one after any redesign or migration, then at least every quarter. Small sites can re-check monthly after publishing new pages.'],
      ['Does an SEO audit guarantee higher rankings?', 'No tool can guarantee rankings. An audit removes the obstacles; rankings also depend on content quality, backlinks, competition and time.'],
      ['Does the tool audit my whole website?', 'It audits the single page you enter in depth and samples links and the sitemap for site-wide problems. Run it on your key pages: home, a service/product page and a blog post.'],
    ],
    related: ['/guides/website-seo-checklist', '/sitemap-extractor', '/domain-authority-checker'],
  },

  {
    path: '/domain-authority-checker', type: 'tool', name: 'Domain Authority Checker',
    title: 'Free Domain Authority Checker – Check Your DA Score',
    desc: 'Check the domain authority of any website for free. Get a 0-100 authority score from popularity rank, domain age and trust signals, plus tips to raise it.',
    h1: 'Free <span class="grad">Domain Authority Checker</span> — Estimate Any Website\'s DA',
    sub: 'Enter a domain to see its authority score, rank, domain age and trust signals, with practical steps to improve it.',
    sections: [
      { h: 'What is Domain Authority (DA)?', p: ['Domain Authority is a 0-100 score that predicts how well a website can rank in search results. The original DA metric belongs to Moz and is calculated from its private backlink index. Higher scores mean a stronger, more trusted domain; brand new domains start near zero.'] },
      { h: 'How this domain authority checker calculates its score', p: ['Moz\'s exact DA needs a paid backlink database, so this tool shows an independent <b>authority estimate</b> built from free public data:'],
        ul: ['<b>Popularity (70%)</b> – the domain\'s position in the Tranco top-1-million ranking.', '<b>Domain age (15%)</b> – the registration date from public RDAP records. Older domains earn more trust.', '<b>On-site trust signals (15%)</b> – HTTPS, HSTS, About/Privacy pages, contact details, schema markup and a sitemap.'] },
      { h: 'Why sites on free subdomains score low', p: ['A site on yourname.onrender.com, vercel.app or github.io does not inherit the platform\'s authority, so it is scored on its own and usually starts very low. Moving to a custom domain is the single biggest authority upgrade.'] },
      { h: 'How to improve your domain authority', ul: ['Earn backlinks from relevant, trusted websites.', 'Publish useful content others want to reference.', 'Fix broken links and keep pages fast and mobile-friendly.', 'Strengthen trust pages and security settings.', 'Be patient: authority grows over months, not days.'] },
    ],
    faq: [
      ['Is this the same as Moz Domain Authority?', 'No. It is an independent estimate on the same 0-100 scale using free public data. Moz DA requires Moz\'s private backlink index. If the site owner adds Moz API keys, the real Moz DA is shown beside the estimate.'],
      ['What is a good domain authority score?', 'Scores of 40-60 are considered good, above 60 is strong, and above 80 is exceptional (mostly very large brands). New sites typically start below 20.'],
      ['How long does it take to increase domain authority?', 'Usually several months of consistent content publishing and link building. Authority is a long-term signal.'],
      ['Does domain authority affect Google rankings?', 'Google does not use Moz DA. But the signals behind it, such as quality backlinks, trust and age, correlate with rankings, so it is a useful comparison metric.'],
    ],
    related: ['/guides/how-to-increase-domain-authority', '/website-traffic-checker', '/seo-audit-tool'],
  },

  {
    path: '/website-ui-checker', type: 'tool', name: 'Website UI/UX Checker',
    title: 'Free Website UI & UX Checker – Design & Accessibility',
    desc: 'Free website UI checker: analyse any URL for colour palette, fonts, responsive design, contrast, navigation, CTAs, forms and accessibility, with fixes.',
    h1: 'Free <span class="grad">Website UI &amp; UX Checker</span> — Design, Layout &amp; Accessibility',
    sub: 'Paste a URL to review its design system, responsiveness, readability and accessibility, and get concrete suggestions to improve the user experience.',
    sections: [
      { h: 'What does the UI checker analyse?', p: ['The tool reads a page\'s HTML and CSS and turns them into design insights you can act on. It does not judge taste; it checks measurable usability rules.'],
        ul: ['<b>Colour palette</b> – how many colours and accent colours the CSS uses, and whether the palette is consistent.', '<b>Typography</b> – number of font families, tiny text sizes and font-loading behaviour.', '<b>Responsive design</b> – mobile viewport tag, media queries, flexible layout and fixed-width problems.', '<b>Contrast</b> – body text against background versus the WCAG 4.5:1 guideline.', '<b>Conversion elements</b> – navigation, call-to-action buttons, contact details, trust pages and forms.'] },
      { h: 'Accessibility checks (WCAG basics)', ul: ['Images without alt text and buttons or links with no accessible name', 'Form fields without labels', 'Missing main landmark, skip link and iframe titles', 'Removed focus outlines, positive tabindex values and duplicate IDs', 'Pinch-zoom disabled in the viewport tag'] },
      { h: 'Why UI and UX matter for SEO', p: ['Google measures page experience through Core Web Vitals and mobile usability. A confusing layout raises bounce rate, a slow page loses visitors, and inaccessible pages exclude users. Fixing UI issues improves rankings and conversions at the same time.'] },
    ],
    faq: [
      ['Can the tool see how my website looks?', 'It analyses the code (HTML and CSS), not a rendered screenshot, so it checks measurable design rules rather than visual taste. For a visual review combine it with a manual look on mobile.'],
      ['What is a good colour contrast ratio?', 'WCAG requires at least 4.5:1 for normal text and 3:1 for large text.'],
      ['How many fonts should a website use?', 'One font for headings and one for body text is enough. More than three families usually looks inconsistent and slows loading.'],
      ['Is my website mobile friendly?', 'The checker verifies the viewport tag, responsive CSS signals and zoom settings. Always test on a real phone as well.'],
    ],
    related: ['/seo-audit-tool', '/website-technology-checker', '/guides/website-seo-checklist'],
  },

  {
    path: '/sitemap-extractor', type: 'tool', name: 'Sitemap Extractor & Generator',
    title: 'Sitemap Extractor & sitemap.txt Generator – Free Tool',
    desc: 'Extract all URLs from any website sitemap, validate it and download sitemap.txt or sitemap.xml. No sitemap? We crawl the site and generate one. Free.',
    h1: 'Free <span class="grad">Sitemap Extractor</span> &amp; sitemap.txt Generator',
    sub: 'Enter a URL to find its sitemap, list every page, spot sitemap errors and download a clean sitemap.txt or sitemap.xml.',
    sections: [
      { h: 'What does the sitemap tool do?', ul: ['Finds sitemaps in robots.txt and common locations such as /sitemap.xml and /sitemap_index.xml.', 'Opens sitemap index files and reads every child sitemap.', 'Lists all page URLs (up to 10,000) and the latest lastmod date.', 'Validates the sitemap and samples URLs for redirects and errors.', 'Generates a starter sitemap by crawling internal links when none exists, and lets you download sitemap.txt or sitemap.xml.'] },
      { h: 'What is a sitemap.txt file?', p: ['A sitemap.txt is the simplest sitemap format: a plain text file with one full URL per line, encoded in UTF-8, and nothing else. Google accepts it just like an XML sitemap. It is a quick way to list URLs when you do not need lastmod dates or image data.'] },
      { h: 'Sitemap rules to follow', ul: ['Use absolute URLs on the same host and protocol as the sitemap.', 'Keep each sitemap under 50,000 URLs and 50 MB; split larger sites with a sitemap index.', 'List only canonical, indexable pages that return HTTP 200.', 'Reference the sitemap in robots.txt and submit it in Google Search Console.'] },
    ],
    faq: [
      ['How do I find a website\'s sitemap?', 'Check /sitemap.xml and /robots.txt on the domain. This tool looks in all the usual places automatically.'],
      ['What if the site has no sitemap?', 'The tool crawls internal links to build a starter list that you can download as sitemap.txt or sitemap.xml, upload to the site root and submit to Google.'],
      ['Should I use sitemap.xml or sitemap.txt?', 'XML supports lastmod dates and images; TXT is simpler. Both are valid. For most sites a sitemap.xml generated by your CMS is best.'],
      ['How do I submit a sitemap to Google?', 'Open Google Search Console, choose Sitemaps, enter the sitemap path (for example sitemap.xml) and press Submit.'],
    ],
    related: ['/seo-audit-tool', '/guides/website-seo-checklist', '/website-technology-checker'],
  },

  {
    path: '/website-traffic-checker', type: 'tool', name: 'Website Traffic Sources Checker',
    title: 'Website Traffic Checker – Sources, Channels & Estimate',
    desc: 'See how well a website is set up for organic, social, paid, email and direct traffic, its likely audience countries and a rough traffic estimate. Free.',
    h1: 'Free <span class="grad">Website Traffic Checker</span> — Traffic Sources &amp; Channels',
    sub: 'Enter a URL to see which traffic channels a website is built for, the countries it targets and an estimated traffic range.',
    sections: [
      { h: 'What the traffic checker shows', ul: ['<b>Channel readiness</b> – how well the site is set up for organic search, social media, paid ads, email, direct/brand and referral traffic, with fixes for the weak ones.', '<b>Audience countries</b> – likely target markets inferred from the domain, language, currency, phone codes and places mentioned.', '<b>Estimated traffic range</b> – a rough monthly visits estimate based on the domain\'s public popularity rank.', '<b>Analytics check</b> – whether Google Analytics, Tag Manager or similar tools are installed.'] },
      { h: 'Honest limits of any free traffic checker', p: ['Exact visitor numbers and the split by source are private data. They exist only inside the site owner\'s Google Analytics and Search Console, or in paid databases. This tool therefore shows estimates and on-site evidence, and labels them clearly, instead of inventing precise-looking numbers. For your own website, connect Google Analytics 4 and Search Console to see real traffic.'] },
      { h: 'How to increase website traffic', ul: ['Publish content that answers the questions your customers search for.', 'Fix technical SEO problems so Google can crawl and index your pages.', 'Share every page with complete Open Graph tags so links look good on social media.', 'Capture emails to bring visitors back.', 'Earn backlinks from relevant websites.'] },
    ],
    faq: [
      ['Can I see exact traffic of any website?', 'No free tool can. Real traffic is private to the site owner. Paid tools like Semrush, SE Ranking and Similarweb estimate it from their own data.'],
      ['How is the traffic estimate calculated?', 'From the domain\'s position in the Tranco top-1-million list, using a power-law model. It is a rough range and is least accurate for small sites.'],
      ['How can I see the traffic sources of my own site?', 'Open Google Analytics 4, Reports, Acquisition, Traffic acquisition. Use Google Search Console for search queries and clicks.'],
      ['Which traffic source is best for a new website?', 'Organic search and social media give the best long-term return for new sites, because they are free and compound over time.'],
    ],
    related: ['/domain-authority-checker', '/seo-audit-tool', '/guides/how-to-increase-domain-authority'],
  },

  {
    path: '/guides/how-to-check-what-a-website-is-built-with', type: 'guide', name: 'How to check what a website is built with',
    title: 'How to Check What a Website Is Built With (5 Easy Ways)',
    desc: 'Learn 5 easy ways to find the CMS, framework, theme and hosting behind any website: page source, browser DevTools, HTTP headers and free tools.',
    h1: 'How to Check What a Website Is <span class="grad">Built With</span> (5 Easy Ways)',
    sub: 'Find the CMS, framework, theme and hosting behind any website, with or without tools.',
    sections: [
      { h: '1. Use a website technology checker', p: ['The fastest method is a tool. Paste the URL into the <a href="/website-technology-checker">website technology checker</a> and it reads the HTML, headers and scripts to name the CMS, frameworks, CDN and analytics.'] },
      { h: '2. Look at the page source', p: ['Right-click the page and choose View Page Source, then search (Ctrl+F) for these clues:'],
        ul: ['<code>/wp-content/</code> or <code>/wp-includes/</code> → WordPress', '<code>cdn.shopify.com</code> → Shopify', '<code>static.parastorage.com</code> or <code>wixstatic.com</code> → Wix', '<code>/_next/</code> or <code>__NEXT_DATA__</code> → Next.js (React)', '<code>data-wf-page</code> → Webflow', '<code>&lt;meta name="generator"&gt;</code> → often names the CMS and version'] },
      { h: '3. Check the HTTP response headers', p: ['Open DevTools (F12), choose the Network tab, reload and click the first request. Headers such as <code>Server</code>, <code>X-Powered-By</code>, <code>cf-ray</code> (Cloudflare) and <code>x-vercel-id</code> (Vercel) reveal the server, language and host.'] },
      { h: '4. Inspect cookies and scripts', p: ['Cookie names expose back-end frameworks (PHPSESSID for PHP, laravel_session for Laravel, csrftoken for Django). Script URLs reveal libraries and tools like jQuery, Google Tag Manager and Meta Pixel.'] },
      { h: '5. Check the theme and plugins (WordPress)', p: ['For WordPress sites, theme names appear in stylesheet paths such as <code>/wp-content/themes/theme-name/</code>, and plugins in <code>/wp-content/plugins/plugin-name/</code>.'] },
      { h: 'What you cannot see', p: ['The database, private server code and anything rendered only on the server stay hidden. A site behind a CDN may also hide its real hosting provider.'] },
    ],
    faq: [
      ['What is the fastest way to find out what a website is built on?', 'Use a technology checker such as the free tool on this site: paste the URL and read the detected CMS and framework.'],
      ['How do I know if a website uses WordPress?', 'Look for /wp-content/ in the page source or run it through the technology checker.'],
    ],
    related: ['/website-technology-checker', '/seo-audit-tool', '/website-ui-checker'],
  },

  {
    path: '/guides/website-seo-checklist', type: 'guide', name: 'Website SEO checklist',
    title: 'Website SEO Checklist 2026: 25 Things to Fix to Rank',
    desc: 'A practical 25-point website SEO checklist covering technical SEO, on-page SEO, content and links. Use it with a free audit to find what blocks rankings.',
    h1: 'Website SEO Checklist 2026: <span class="grad">25 Things to Fix</span> to Rank',
    sub: 'A practical checklist you can run through today. Use the free audit tool to see which items your site fails.',
    sections: [
      { h: 'Technical SEO checklist', ul: ['Serve the whole site over HTTPS and redirect HTTP to HTTPS.', 'Make sure robots.txt does not block important pages.', 'Publish an XML sitemap and submit it in Google Search Console.', 'Add a self-referencing canonical tag to every page.', 'Remove accidental noindex tags.', 'Keep server response time under 600 ms.', 'Enable Gzip or Brotli compression and browser caching.', 'Fix broken links and redirect chains.', 'Return a real 404 status for missing pages.', 'Add security headers (HSTS, X-Content-Type-Options, X-Frame-Options).'] },
      { h: 'On-page SEO checklist', ul: ['Give every page a unique title of about 50-60 characters with the target keyword.', 'Write a meta description of 120-155 characters with a call to action.', 'Use exactly one H1 and a logical H2-H3 structure.', 'Put the main keyword in the first 100 words.', 'Write at least 500 words of helpful content on key pages.', 'Add descriptive alt text to every meaningful image.', 'Use short, lowercase, hyphenated URLs.', 'Link related pages together with descriptive anchor text.'] },
      { h: 'Speed and mobile checklist', ul: ['Add the mobile viewport meta tag and use responsive CSS.', 'Convert images to WebP or AVIF and set width and height.', 'Lazy-load images below the fold.', 'Defer or remove render-blocking JavaScript.', 'Limit third-party scripts.'] },
      { h: 'Authority and sharing checklist', ul: ['Add Open Graph and Twitter Card tags with a 1200×630 image.', 'Add schema markup (Organization, Article, FAQ, Product).', 'Create About, Contact and Privacy pages.', 'Earn backlinks from relevant sites.', 'Install Google Analytics and Search Console.'] },
      { h: 'How to use this checklist', p: ['Run the <a href="/seo-audit-tool">free SEO audit tool</a> on your home page and top service pages. It tests most of the items above automatically and sorts what is failing by priority.'] },
    ],
    faq: [
      ['What are the most important SEO factors?', 'Helpful content that matches search intent, crawlable and fast pages, quality backlinks and a good mobile experience.'],
      ['How long does SEO take to work?', 'New pages commonly take weeks to be indexed and several months to rank for competitive keywords.'],
    ],
    related: ['/seo-audit-tool', '/sitemap-extractor', '/domain-authority-checker'],
  },

  {
    path: '/guides/how-to-increase-domain-authority', type: 'guide', name: 'How to increase domain authority',
    title: 'How to Increase Domain Authority: 9 Proven Steps',
    desc: 'Learn how to increase domain authority with 9 proven steps: quality backlinks, content, technical SEO, trust signals and a custom domain. Realistic timelines.',
    h1: 'How to Increase <span class="grad">Domain Authority</span>: 9 Proven Steps',
    sub: 'Domain authority grows through trust and links. Here is what actually moves the needle, and how long it takes.',
    sections: [
      { h: '1. Use your own domain', p: ['Sites on free subdomains such as onrender.com or vercel.app do not build authority of their own. Buy a custom domain and connect it before investing in content and links.'] },
      { h: '2. Earn quality backlinks', p: ['Backlinks from relevant, trusted websites are the strongest authority signal. Aim for quality over quantity: guest posts, partner pages, local directories, industry listings and mentions in the press.'] },
      { h: '3. Publish link-worthy content', p: ['Create guides, free tools, original data and comparisons that others want to cite. This site\'s own free tools are an example of a linkable asset.'] },
      { h: '4. Fix technical SEO', p: ['A crawlable, fast, secure site makes your pages easier to index. Run the <a href="/seo-audit-tool">SEO audit</a> and clear the high priority items.'] },
      { h: '5. Build internal links', p: ['Link your important pages together so authority flows through the site. Use descriptive anchor text.'] },
      { h: '6. Strengthen trust signals', p: ['Add About, Contact, Privacy and Terms pages, real author details, reviews and secure HTTPS.'] },
      { h: '7. Remove toxic and broken links', p: ['Fix broken links and disavow clearly spammy backlinks if you have a history of low-quality link building.'] },
      { h: '8. Stay active on social and brand channels', p: ['Social profiles do not pass link value directly, but they increase brand searches and help your content get discovered and linked.'] },
      { h: '9. Be patient and consistent', p: ['Authority grows over months. Check progress with the <a href="/domain-authority-checker">domain authority checker</a> every month rather than every day.'] },
    ],
    faq: [
      ['How long does it take to increase domain authority?', 'Typically 3-12 months of consistent content and link building, depending on competition.'],
      ['Does domain authority directly affect Google rankings?', 'Google does not use Moz\'s DA score, but the underlying factors (quality links, trust, relevance) do influence rankings.'],
    ],
    related: ['/domain-authority-checker', '/website-traffic-checker', '/seo-audit-tool'],
  },
  {
    path: '/about', type: 'info', schema: 'AboutPage', name: 'About',
    title: 'About Tarun Developer – Free Website Audit Tools',
    desc: 'About Tarun Developer, the web developer behind this free website audit tool for SEO, technology detection, UI checks, domain authority and sitemaps.',
    h1: 'About <span class="grad">Tarun Developer</span> and this free audit tool',
    sub: 'Free, honest website tools built by a web developer who works on SEO and website performance every day.',
    sections: [
      { h: 'Who builds this tool?', p: ['I am Tarun Developer, a web developer who builds and optimises websites for businesses. I created this tool because checking SEO, technology, design and sitemap issues usually means switching between many paid products. Here they are in one free page. You can see my work and services on my <a href="' + SITE + '" target="_blank" rel="noopener">main website</a>.'] },
      { h: 'Our principles', ul: ['<b>Honest numbers.</b> Where data is private (exact traffic, Moz DA) the tool shows a labelled estimate instead of inventing precision.', '<b>Clear fixes.</b> Every finding says why it matters and how to fix it.', '<b>Privacy first.</b> We do not store the websites you audit or your reports. See the <a href="/privacy-policy">privacy policy</a>.', '<b>Free to use.</b> No signup, no limits on casual use.'] },
      { h: 'Need help fixing what the audit found?', p: ['If you would like a developer to fix the issues in your report, <a href="/contact">contact me</a>. I can handle technical SEO, speed optimisation, redesigns and new websites.'] },
    ], faq: [], related: ['/', '/seo-audit-tool', '/contact'],
  },
  {
    path: '/contact', type: 'info', schema: 'ContactPage', name: 'Contact',
    title: 'Contact Tarun Developer – Call, WhatsApp or Email',
    desc: 'Contact Tarun Developer for website development, technical SEO fixes and speed optimisation. Call or WhatsApp +91 98210 12189 or send a message.',
    h1: 'Contact <span class="grad">Tarun Developer</span>',
    sub: 'Questions about your audit report, a bug in the tool, or a website project? Call, WhatsApp or send a message.',
    html: CONTACT_HTML,
    sections: [
      { h: 'Call or WhatsApp', ul: ['<b>Phone:</b> <a href="tel:' + PHONE_TEL + '">' + PHONE_DISPLAY + '</a>', '<b>WhatsApp:</b> <a href="' + WHATSAPP + '" target="_blank" rel="noopener">Chat on WhatsApp</a>', '<b>Website:</b> <a href="' + SITE + '" target="_blank" rel="noopener">' + SITE.replace('https://', '').replace(/\/$/, '') + '</a>'] },
      { h: 'What I can help with', ul: ['Fixing the problems found in your SEO audit report', 'Website speed and Core Web Vitals optimisation', 'New website design and development', 'Technical SEO set-up: sitemap, schema, redirects and Search Console'] },
    ], faq: [], related: ['/about', '/', '/seo-audit-tool'],
  },
  {
    path: '/privacy-policy', type: 'info', schema: 'WebPage', name: 'Privacy Policy',
    title: 'Privacy Policy – Tarun Developer Free Audit Tools',
    desc: 'How the free website audit tool handles data: we do not store the URLs you audit or your reports, and we use no tracking cookies by default.',
    h1: 'Privacy <span class="grad">Policy</span>',
    sub: 'Last updated 5 October 2026. A plain-language summary of how this tool handles data.',
    sections: [
      { h: 'What happens when you audit a website', p: ['When you enter a URL, our server fetches that public page, its stylesheets, robots.txt and sitemap, analyses them and sends the report back to your browser. We do not save the URL or the report in a database. Reports you download are generated in your browser.'] },
      { h: 'Third-party services used during an audit', ul: ['<b>Tranco</b> (tranco-list.eu) receives the domain name to look up its popularity rank.', '<b>RDAP registries</b> receive the domain name to look up its registration date.', '<b>Google PageSpeed Insights</b> receives the URL only if you tick the PageSpeed option.'] },
      { h: 'Cookies and analytics', p: ['The tool does not set cookies. If the site owner enables Google Analytics, it will collect anonymous usage statistics such as pages viewed and country. You can block it with your browser settings or an extension.'] },
      { h: 'Contact form', p: ['If you send a message through the contact form, your name, email, phone number (optional) and message are emailed to the site owner through an email-delivery service (EmailJS, or FormSubmit as a fallback). We use them only to reply to you.'] },
      { h: 'Server logs', p: ['Like any website, our hosting provider may keep standard server logs (IP address, time, requested path) for security and troubleshooting.'] },
      { h: 'Contact', p: ['Questions about privacy? See the <a href="/contact">contact page</a>.'] },
    ], faq: [], related: ['/about', '/contact', '/'],
  },
];

const byPath = Object.fromEntries(pages.map((p) => [p.path, p]));
const TOOLS = pages.filter((p) => p.type === 'tool');
const INFO = pages.filter((p) => p.type === 'info');
const GUIDES = pages.filter((p) => p.type === 'guide');

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
const stripTags = (s) => s.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&');

function sectionHtml(sec) {
  return `<div class="card prose"><h2>${sec.h}</h2>${(sec.p || []).map((x) => `<p>${x}</p>`).join('')}${sec.ul ? `<ul>${sec.ul.map((x) => `<li>${x}</li>`).join('')}</ul>` : ''}</div>`;
}

function faqHtml(faq) {
  return `<div class="card prose" id="faq"><h2>Frequently asked questions</h2>${faq.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('')}</div>`;
}

function linkCards(paths, heading) {
  const items = paths.map((p) => byPath[p]).filter(Boolean);
  return `<div class="card prose"><h2>${heading}</h2><div class="rel">${items.map((x) => `<a href="${x.path}"><b>${esc(x.name)}</b><span>${esc(x.desc.slice(0, 95))}…</span></a>`).join('')}</div></div>`;
}

function landingHtml(page) {
  const feat = page.type === 'home' ? `<div class="feat">${FEATURES.map(([i, t, d]) => `<div class="card"><div class="ic">${i}</div><h2 class="ft">${t}</h2><p>${d}</p></div>`).join('')}</div>
    <div class="card steps"><h2>How it works</h2><div class="st"><div><b>1</b><span>Paste any public website URL</span></div><div><b>2</b><span>We scan the page, files &amp; headers</span></div><div><b>3</b><span>Get scores + a prioritised fix list, download as PDF</span></div></div></div>` : '';
  const crumbs = page.type === 'home' ? '' : `<nav class="crumbs" aria-label="Breadcrumb"><a href="/">Home</a> › ${page.type === 'guide' ? 'Guides › ' : ''}<span>${esc(page.name)}</span></nav>`;
  const sections = page.sections.map(sectionHtml).join('');
  const related = page.type === 'home'
    ? linkCards(page.related, 'More free website tools')
    : linkCards([...(page.related || []), ...(page.type === 'tool' ? ['/'] : [])].filter((p, i, a) => a.indexOf(p) === i && p !== page.path).slice(0, 4), 'Related tools and guides');
  const toolNav = `<nav class="toolnav" aria-label="Free tools">${TOOLS.map((t) => `<a href="${t.path}"${t.path === page.path ? ' aria-current="page"' : ''}>${esc(t.name)}</a>`).join('')}</nav>`;
  return `${toolNav}${crumbs}${feat}${sections}${page.html || ''}${page.faq.length ? faqHtml(page.faq) : ''}${related}`;
}

function footerHtml() {
  const col = (title, list) => `<div><h3>${title}</h3>${list.map((p) => `<a href="${p.path}">${esc(p.name)}</a>`).join('')}</div>`;
  return `<footer class="foot"><div class="wrap"><div class="fgrid">
    <div><h3>${BRAND}</h3><p>Free website audit tools: SEO, technology, UI/UX, authority and sitemap.</p><a class="fbtn" href="${SITE}" target="_blank" rel="noopener">Visit my website ↗</a><p style="margin:12px 0 0"><a href="tel:${PHONE_TEL}">${PHONE_DISPLAY}</a> · <a href="https://github.com/tarundeveloper45" target="_blank" rel="noopener me">GitHub</a></p></div>
    ${col('Free tools', [byPath['/'], ...TOOLS])}${col('Guides', GUIDES)}${col('Company', INFO)}</div>
    <div class="mut small" style="margin-top:20px">© <span id="yr"></span> ${BRAND} · <a href="${SITE}" target="_blank" rel="noopener">${SITE.replace('https://', '').replace(/\/$/, '')}</a></div></div></footer>`;
}

function headHtml(page, origin) {
  const url = origin + (page.path === '/' ? '/' : page.path);
  const img = origin + '/og-image.jpg';
  const today = new Date().toISOString().slice(0, 10);
  const person = { '@type': 'Person', name: BRAND, url: SITE, telephone: PHONE_TEL, sameAs: [SITE, 'https://github.com/tarundeveloper45'] };
  const crumbList = page.type === 'home' ? null : { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Home', item: origin + '/' }].concat(page.type === 'guide' ? [] : []).concat([{ '@type': 'ListItem', position: 2, name: page.name, item: url }]) };
  const main = page.type === 'info'
    ? { '@context': 'https://schema.org', '@type': page.schema || 'WebPage', name: stripTags(page.h1), url, description: page.desc, publisher: person, ...(page.schema === 'ContactPage' ? { mainEntity: { '@type': 'Person', name: BRAND, telephone: PHONE_TEL, contactPoint: { '@type': 'ContactPoint', telephone: PHONE_TEL, contactType: 'customer support', availableLanguage: ['English', 'Hindi'] } } } : {}) }
    : page.type === 'guide'
    ? { '@context': 'https://schema.org', '@type': 'Article', headline: stripTags(page.h1), description: page.desc, image: img, author: person, publisher: { '@type': 'Person', name: BRAND, url: SITE }, mainEntityOfPage: url, datePublished: '2026-10-05', dateModified: today }
    : { '@context': 'https://schema.org', '@type': 'WebApplication', name: page.name, url, description: page.desc, applicationCategory: 'BusinessApplication', operatingSystem: 'Any (web browser)', browserRequirements: 'Requires JavaScript', image: img, offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' }, creator: person };
  const faq = { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: page.faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) };
  const site = page.type === 'home' ? { '@context': 'https://schema.org', '@type': 'WebSite', name: 'Free Website Audit Tool', url: origin + '/', publisher: person } : null;
  const ld = [main, page.faq.length ? faq : null, crumbList, site].filter(Boolean);
  const ga = process.env.GA_ID ? `<script async src="https://www.googletagmanager.com/gtag/js?id=${process.env.GA_ID}"></script>\n<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${process.env.GA_ID}');</script>` : '';
  const gsc = process.env.GSC_TOKEN ? `<meta name="google-site-verification" content="${process.env.GSC_TOKEN}">` : '';
  return `<title>${esc(page.title)}</title>
<meta name="description" content="${esc(page.desc)}">
<meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1">
<meta name="author" content="${BRAND}">
<link rel="canonical" href="${url}">
<meta property="og:type" content="${page.type === 'guide' ? 'article' : 'website'}">
<meta property="og:site_name" content="${BRAND} · Free Website Audit Tool">
<meta property="og:title" content="${esc(page.title)}">
<meta property="og:description" content="${esc(page.desc)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${img}">
<meta property="og:image:type" content="image/jpeg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${esc(page.name)} by ${BRAND}">
<meta property="og:locale" content="en_US">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(page.title)}">
<meta name="twitter:description" content="${esc(page.desc)}">
<meta name="twitter:image" content="${img}">
<meta name="theme-color" content="#4f46e5">
<link rel="manifest" href="/site.webmanifest">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="icon" href="/favicon-32.png" sizes="32x32" type="image/png">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
${ld.map((o) => `<script type="application/ld+json">${JSON.stringify(o).replace(/</g, '\\u003c')}</script>`).join('\n')}
${gsc}
${ga}`;
}

const fsx = require('node:fs');
const EJS = (() => {
  let f = {}; try { f = JSON.parse(fsx.readFileSync(require('node:path').join(__dirname, 'emailjs.config.json'), 'utf8')); } catch { /* no file */ }
  return { service: process.env.EMAILJS_SERVICE_ID || f.serviceId || '', template: process.env.EMAILJS_TEMPLATE_ID || f.templateId || '', key: process.env.EMAILJS_PUBLIC_KEY || f.publicKey || '' };
})();
const pathx = require('node:path');
const ver = (f) => { try { return Math.floor(fsx.statSync(pathx.join(__dirname, '..', 'public', f)).mtimeMs / 1000); } catch { return 1; } };

function render(tpl, page, origin) {
  return tpl
    .replace('/extra.js', () => '/extra.js?v=' + ver('extra.js'))
    .replace('id="contactForm"', () => (EJS.service && EJS.template && EJS.key ? `id="contactForm" data-ejs-service="${EJS.service}" data-ejs-template="${EJS.template}" data-ejs-key="${EJS.key}"` : 'id="contactForm"'))
    .replace('{{HEAD}}', () => headHtml(page, origin))
    .replace('</head>', () => (page.type === 'info' ? '<style>form.search,.opts,.samples{display:none!important}header.hero{padding-bottom:46px}.badge{margin-top:30px}</style>' : '') + '</head>')
    .replace('{{H1}}', () => page.h1)
    .replace('{{SUB}}', () => page.sub)
    .replace('{{LANDING}}', () => landingHtml(page))
    .replace('{{FOOTER}}', () => footerHtml())
    .replaceAll('{{ORIGIN}}', origin);
}

module.exports = { pages, byPath, render, SITE };
