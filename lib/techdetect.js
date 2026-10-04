// Technology fingerprinting from HTML, headers, cookies, scripts and CSS.
// Each rule: [name, category, test(ctx) -> evidence string | falsy]

const has = (re) => (c) => { const m = c.html.match(re); return m ? m[0].slice(0, 80) : null; };
const hdr = (name, re) => (c) => { const v = c.headers[name]; return v && (!re || re.test(v)) ? `${name}: ${String(v).slice(0, 60)}` : null; };
const gen = (re) => (c) => { const v = c.generator; return v && re.test(v) ? `meta generator: ${v}` : null; };
const src = (re) => (c) => { const s = c.assets.find((a) => re.test(a)); return s ? `asset: ${s.slice(0, 80)}` : null; };
const cookie = (re) => (c) => { const v = c.headers['set-cookie']; return v && re.test(v) ? 'cookie: ' + (v.match(re) || [''])[0] : null; };
const any = (...fns) => (c) => { for (const f of fns) { const r = f(c); if (r) return r; } return null; };

const RULES = [
  // CMS / platforms
  ['WordPress', 'CMS', any(has(/\/wp-content\/|\/wp-includes\//i), gen(/wordpress/i), hdr('link', /wp-json/))],
  ['WooCommerce', 'E-commerce', any(has(/wp-content\/plugins\/woocommerce|class="[^"]*\bwoocommerce\b|wc-block|woocommerce_params/i), src(/plugins\/woocommerce/i))],
  ['Shopify', 'E-commerce', any(has(/cdn\.shopify\.com|Shopify\.theme|myshopify\.com/i), hdr('x-shopid'), hdr('x-shopify-stage'))],
  ['Wix', 'Website builder', any(has(/static\.parastorage\.com|wixstatic\.com|X-Wix-/i), hdr('x-wix-request-id'))],
  ['Squarespace', 'Website builder', any(has(/static1\.squarespace\.com|squarespace-cdn|Squarespace/i), gen(/squarespace/i))],
  ['Webflow', 'Website builder', any(has(/data-wf-page|webflow\.com|assets\.website-files\.com/i), gen(/webflow/i))],
  ['Framer', 'Website builder', any(has(/framerusercontent\.com|framer\.com\/m\//i), gen(/framer/i))],
  ['GoDaddy Website Builder', 'Website builder', has(/img1\.wsimg\.com|godaddy/i)],
  ['Blogger', 'CMS', any(has(/blogger\.com|blogspot\.com/i), gen(/blogger/i))],
  ['Ghost', 'CMS', gen(/ghost/i)],
  ['Drupal', 'CMS', any(gen(/drupal/i), has(/\/sites\/default\/files|Drupal\.settings/i), hdr('x-drupal-cache'))],
  ['Joomla', 'CMS', any(gen(/joomla/i), has(/\/media\/jui\/|\/components\/com_/i))],
  ['Magento', 'E-commerce', any(has(/Magento_|mage\/cookies|\/static\/version\d+/i), cookie(/mage-cache/i))],
  ['PrestaShop', 'E-commerce', any(gen(/prestashop/i), has(/prestashop/i))],
  ['BigCommerce', 'E-commerce', has(/cdn\d*\.bigcommerce\.com/i)],
  ['Elementor', 'Page builder', any(has(/elementor/i), gen(/elementor/i))],
  ['Divi', 'Page builder', has(/et-boc|et_pb_|\/Divi\//i)],
  ['WPBakery', 'Page builder', has(/wpb_wrapper|js_composer/i)],
  ['Yoast SEO', 'SEO plugin', any(has(/yoast seo/i), has(/yoast-schema-graph/i))],
  ['Rank Math', 'SEO plugin', has(/rank math|rank-math/i)],
  ['All in One SEO', 'SEO plugin', has(/all in one seo|aioseo/i)],
  ['WP Rocket', 'Performance plugin', any(has(/wp-rocket/i), hdr('x-powered-by', /wp rocket/i))],
  ['LiteSpeed Cache', 'Performance plugin', any(hdr('x-litespeed-cache'), has(/litespeed/i))],
  ['Contact Form 7', 'WordPress plugin', has(/wpcf7/i)],

  // JS frameworks / libraries
  ['Next.js', 'JS framework', any(has(/__NEXT_DATA__|\/_next\//i), hdr('x-powered-by', /next\.js/i))],
  ['Nuxt', 'JS framework', has(/__NUXT__|\/_nuxt\//i)],
  ['Gatsby', 'JS framework', any(has(/___gatsby|gatsby-/i), gen(/gatsby/i))],
  ['Astro', 'JS framework', any(gen(/astro/i), has(/astro-island|\/_astro\//i))],
  ['Remix', 'JS framework', has(/__remixContext/i)],
  ['SvelteKit / Svelte', 'JS framework', any(has(/svelte-[a-z0-9]{5,}|__sveltekit/i), src(/svelte/i))],
  ['React', 'JS library', any(has(/data-reactroot|__REACT_DEVTOOLS|react-dom|id="root"|id="__next"/i), src(/react(\.production|-dom)/i))],
  ['Vue.js', 'JS library', any(has(/data-v-[0-9a-f]{6,}|__vue__|vue(\.runtime)?(\.min)?\.js|data-server-rendered/i), src(/vue(\.runtime)?(\.min)?\.js/i))],
  ['Angular', 'JS framework', any(has(/ng-version=|<app-root|ng-app/i), src(/angular/i))],
  ['jQuery', 'JS library', any(src(/jquery[.-]?[\d.]*(min)?\.js/i), has(/jquery(\.min)?\.js/i))],
  ['Alpine.js', 'JS library', has(/x-data=|alpine(\.min)?\.js/i)],
  ['htmx', 'JS library', has(/hx-get=|hx-post=|htmx(\.min)?\.js/i)],
  ['Vite', 'Build tool', has(/\/@vite\/client|type="module"[^>]+\/assets\/index-[\w-]+\.js/i)],
  ['Webpack', 'Build tool', has(/webpackJsonp|webpackChunk/i)],
  ['Lodash', 'JS library', src(/lodash/i)],
  ['GSAP', 'JS library', src(/gsap|TweenMax/i)],
  ['Swiper', 'JS library', src(/swiper/i)],
  ['AOS (Animate on Scroll)', 'JS library', any(src(/aos(\.min)?\.(js|css)/i), has(/data-aos=/i))],

  // CSS
  ['Bootstrap', 'CSS framework', any(src(/bootstrap/i), has(/class="[^"]*\b(container-fluid|navbar-expand|btn btn-(primary|secondary)|col-(md|lg|sm)-\d+)\b/i))],
  ['Tailwind CSS', 'CSS framework', any(src(/tailwind/i), has(/class="[^"]*\b(flex items-center|px-4 py-2|text-(sm|lg|xl) |bg-(white|gray|slate|blue)-\d{2,3}|rounded-(lg|md|xl)|space-y-\d|grid-cols-\d)/i))],
  ['Bulma', 'CSS framework', src(/bulma/i)],
  ['Foundation', 'CSS framework', src(/foundation(\.min)?\.(css|js)/i)],
  ['Font Awesome', 'Icon font', any(src(/font-?awesome|fontawesome/i), has(/class="[^"]*\bfa[srb]? fa-/i))],
  ['Google Fonts', 'Font service', has(/fonts\.googleapis\.com|fonts\.gstatic\.com/i)],
  ['Adobe Fonts (Typekit)', 'Font service', has(/use\.typekit\.net/i)],
  ['Material UI', 'UI library', has(/\bMui[A-Z][a-zA-Z]+-root/)],

  // Servers / languages / hosting
  ['Nginx', 'Web server', hdr('server', /nginx/i)],
  ['Apache', 'Web server', hdr('server', /apache/i)],
  ['LiteSpeed', 'Web server', hdr('server', /litespeed/i)],
  ['Microsoft IIS', 'Web server', hdr('server', /iis/i)],
  ['PHP', 'Language', any(hdr('x-powered-by', /php/i), cookie(/PHPSESSID/))],
  ['ASP.NET', 'Language', any(hdr('x-powered-by', /asp\.net/i), hdr('x-aspnet-version'), has(/__VIEWSTATE/))],
  ['Node.js / Express', 'Language', hdr('x-powered-by', /express/i)],
  ['Laravel', 'Framework', any(cookie(/laravel_session|XSRF-TOKEN/), has(/csrf-token/i))],
  ['Django', 'Framework', any(cookie(/csrftoken/), has(/csrfmiddlewaretoken/))],
  ['Ruby on Rails', 'Framework', any(hdr('x-powered-by', /phusion|rails/i), has(/csrf-param.*authenticity_token/i))],
  ['Cloudflare', 'CDN / Hosting', any(hdr('server', /cloudflare/i), hdr('cf-ray'))],
  ['Vercel', 'CDN / Hosting', any(hdr('server', /vercel/i), hdr('x-vercel-id'))],
  ['Netlify', 'CDN / Hosting', any(hdr('server', /netlify/i), hdr('x-nf-request-id'))],
  ['GitHub Pages', 'CDN / Hosting', any(hdr('server', /github\.com/i), hdr('x-github-request-id'))],
  ['Amazon CloudFront / AWS', 'CDN / Hosting', any(hdr('via', /cloudfront/i), hdr('x-amz-cf-id'), hdr('x-amz-request-id'))],
  ['Fastly', 'CDN / Hosting', any(hdr('x-served-by', /cache-/i), hdr('x-fastly-request-id'))],
  ['Akamai', 'CDN / Hosting', any(hdr('server', /akamai/i), hdr('x-akamai-transformed'))],
  ['Firebase Hosting', 'CDN / Hosting', hdr('x-served-by', /firebase/i)],
  ['Hostinger', 'CDN / Hosting', any(hdr('platform', /hostinger/i), hdr('server', /hcdn/i))],
  ['SiteGround', 'CDN / Hosting', hdr('x-proxy-cache-info')],
  ['WP Engine', 'CDN / Hosting', any(hdr('x-powered-by', /wp engine/i), hdr('x-wpe-loopback-upstream-addr'))],
  ['Kinsta', 'CDN / Hosting', hdr('x-kinsta-cache')],
  ['Sucuri', 'Security / WAF', hdr('x-sucuri-id')],
  ['Imperva / Incapsula', 'Security / WAF', hdr('x-iinfo')],

  // Analytics / marketing
  ['Google Analytics (GA4/UA)', 'Analytics', has(/googletagmanager\.com\/gtag\/js|google-analytics\.com\/(analytics|ga)\.js|gtag\(\s*'config'/i)],
  ['Google Tag Manager', 'Tag manager', has(/googletagmanager\.com\/gtm\.js|GTM-[A-Z0-9]+/i)],
  ['Facebook Pixel', 'Marketing', has(/connect\.facebook\.net\/[^"']+\/fbevents\.js|fbq\(/i)],
  ['Google Ads / Conversion', 'Marketing', has(/googleadservices\.com|AW-\d{6,}/i)],
  ['Hotjar', 'Analytics', has(/static\.hotjar\.com|hj\(/i)],
  ['Microsoft Clarity', 'Analytics', has(/clarity\.ms/i)],
  ['Mixpanel', 'Analytics', has(/mixpanel/i)],
  ['Segment', 'Analytics', has(/cdn\.segment\.com/i)],
  ['HubSpot', 'Marketing', has(/js\.hs-scripts\.com|hubspot/i)],
  ['Mailchimp', 'Marketing', has(/mailchimp|chimpstatic/i)],
  ['Intercom', 'Chat widget', has(/widget\.intercom\.io/i)],
  ['Tawk.to', 'Chat widget', has(/embed\.tawk\.to/i)],
  ['Crisp', 'Chat widget', has(/client\.crisp\.chat/i)],
  ['Drift', 'Chat widget', has(/js\.driftt\.com/i)],
  ['WhatsApp chat link', 'Chat widget', has(/wa\.me\/|api\.whatsapp\.com/i)],
  ['Stripe', 'Payments', has(/js\.stripe\.com/i)],
  ['Razorpay', 'Payments', has(/checkout\.razorpay\.com/i)],
  ['PayPal', 'Payments', has(/paypal\.com\/sdk|paypalobjects/i)],
  ['reCAPTCHA', 'Security', has(/google\.com\/recaptcha|grecaptcha/i)],
  ['Cloudflare Turnstile', 'Security', has(/challenges\.cloudflare\.com\/turnstile/i)],
  ['Cookie consent (generic)', 'Compliance', has(/cookiebot|onetrust|cookie-?consent|cookieyes|iubenda/i)],
  ['Sentry', 'Monitoring', has(/browser\.sentry-cdn\.com|sentry\.io/i)],
  ['YouTube embed', 'Media', has(/youtube(-nocookie)?\.com\/embed/i)],
  ['Google Maps', 'Media', has(/maps\.googleapis\.com|google\.com\/maps\/embed/i)],
];

function detectTech(ctx) {
  const found = [];
  for (const [name, category, test] of RULES) {
    let ev = null;
    try { ev = test(ctx); } catch { /* ignore rule errors */ }
    if (ev) found.push({ name, category, evidence: ev });
  }
  // Version hints
  const gen = ctx.generator;
  if (gen) {
    const m = gen.match(/^(WordPress|Joomla!?|Drupal|Ghost|Hugo|Jekyll|Gatsby|Astro|Wix\.com|Elementor|Webflow)\s*([\d.]+)?/i);
    if (m && m[2]) {
      const t = found.find((f) => f.name.toLowerCase().startsWith(m[1].toLowerCase().replace('!', '').replace('.com', '')));
      if (t) t.version = m[2];
    }
  }
  const serverVer = (ctx.headers.server || '').match(/(nginx|apache)\/([\d.]+)/i);
  if (serverVer) { const t = found.find((f) => f.name.toLowerCase() === serverVer[1].toLowerCase()); if (t) t.version = serverVer[2]; }
  const php = (ctx.headers['x-powered-by'] || '').match(/PHP\/([\d.]+)/i);
  if (php) { const t = found.find((f) => f.name === 'PHP'); if (t) t.version = php[1]; }
  const jq = ctx.assets.map((a) => a.match(/jquery[.-]?(\d+\.\d+(\.\d+)?)/i)).find(Boolean);
  if (jq) { const t = found.find((f) => f.name === 'jQuery'); if (t) t.version = jq[1]; }
  const bs = ctx.assets.map((a) => a.match(/bootstrap[@/.-]v?(\d+\.\d+(\.\d+)?)/i)).find(Boolean);
  if (bs) { const t = found.find((f) => f.name === 'Bootstrap'); if (t) t.version = bs[1]; }

  // Headline: what is the site built on?
  const priority = ['Shopify', 'Wix', 'Squarespace', 'Webflow', 'Framer', 'WordPress', 'Magento', 'Drupal', 'Joomla', 'Ghost', 'Blogger', 'BigCommerce', 'PrestaShop', 'Next.js', 'Nuxt', 'Gatsby', 'Astro', 'Remix', 'SvelteKit / Svelte', 'Angular', 'Vue.js', 'React', 'Laravel', 'Django', 'Ruby on Rails', 'ASP.NET', 'PHP', 'Node.js / Express'];
  let builtOn = null;
  for (const p of priority) { const f = found.find((x) => x.name === p); if (f) { builtOn = f; break; } }
  let summary;
  if (!builtOn) {
    summary = found.some((f) => f.category === 'JS library' || f.category === 'JS framework')
      ? 'Custom-built site (no known CMS detected)'
      : 'Likely hand-coded HTML/CSS (static site) — no CMS or framework fingerprint found';
  } else {
    const kind = ['CMS', 'E-commerce', 'Website builder'].includes(builtOn.category) ? builtOn.category : builtOn.category.toLowerCase();
    summary = `${builtOn.name}${builtOn.version ? ' ' + builtOn.version : ''} (${kind})`;
  }
  return { summary, builtOn: builtOn ? builtOn.name : null, technologies: found };
}

module.exports = { detectTech };
