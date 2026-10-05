const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const { analyze } = require('./lib/analyzer');
const { pages, byPath, render } = require('./lib/pages');

const PORT = process.env.PORT || 3000;
const PUBLIC = path.join(__dirname, 'public');
const TEMPLATE_FILE = path.join(PUBLIC, 'index.html');
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/png', '.webmanifest': 'application/manifest+json', '.json': 'application/json', '.txt': 'text/plain; charset=utf-8' };
const COMPRESSIBLE = /^(text\/|application\/(xml|json|manifest\+json)|image\/svg)/;

function securityHeaders(req) {
  const h = {
    'x-content-type-options': 'nosniff',
    'x-frame-options': 'SAMEORIGIN',
    'referrer-policy': 'strict-origin-when-cross-origin',
    'permissions-policy': 'camera=(), microphone=(), geolocation=(), payment=()',
    'cross-origin-opener-policy': 'same-origin',
    'content-security-policy': process.env.GA_ID
      ? "default-src 'self'; script-src 'self' 'unsafe-inline' https://www.googletagmanager.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://www.google-analytics.com https://www.googletagmanager.com; connect-src 'self' https://formsubmit.co https://api.emailjs.com https://www.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com; font-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'self'"
      : "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' https://formsubmit.co https://api.emailjs.com; font-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'self'",
  };
  if ((req.headers['x-forwarded-proto'] || '') === 'https') h['strict-transport-security'] = 'max-age=31536000; includeSubDomains';
  return h;
}

function send(req, res, status, type, body, extra = {}) {
  const headers = { 'content-type': type, vary: 'Accept-Encoding', ...securityHeaders(req), ...extra };
  let out = body;
  if (COMPRESSIBLE.test(type) && /\bgzip\b/.test(req.headers['accept-encoding'] || '') && body.length > 600) {
    out = zlib.gzipSync(body); headers['content-encoding'] = 'gzip';
  }
  headers['content-length'] = Buffer.byteLength(out);
  res.writeHead(status, headers);
  res.end(req.method === 'HEAD' ? undefined : out);
}

const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://localhost');
  const origin = process.env.SITE_URL || `${req.headers['x-forwarded-proto'] || 'http'}://${req.headers['x-forwarded-host'] || req.headers.host}`;

  // Server-Sent Events: streams progress, then the final report
  if (u.pathname === '/api/analyze') {
    res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache', connection: 'keep-alive', 'x-accel-buffering': 'no', ...securityHeaders(req) });
    const sse = (event, data) => res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    try {
      const report = await analyze(u.searchParams.get('url'), { psi: u.searchParams.get('psi') !== '0', onProgress: (m) => sse('progress', m) });
      sse('result', report);
    } catch (e) { sse('failure', String(e.message || e)); }
    return res.end();
  }

  const NL = String.fromCharCode(10);
  const lastmod = new Date().toISOString().slice(0, 10);
  const url = (p) => origin + (p === '/' ? '/' : p);

  if (u.pathname === '/robots.txt') {
    return send(req, res, 200, 'text/plain; charset=utf-8', ['User-agent: *', 'Allow: /', 'Disallow: /api/', '', `Sitemap: ${origin}/sitemap.xml`, ''].join(NL), { 'cache-control': 'public, max-age=3600' });
  }
  if (u.pathname === '/sitemap.xml') {
    const items = pages.filter((p) => p.type !== 'thanks').map((p) => `  <url><loc>${url(p.path)}</loc><lastmod>${lastmod}</lastmod><changefreq>${p.type === 'tool' || p.path === '/' ? 'weekly' : 'monthly'}</changefreq><priority>${p.path === '/' ? '1.0' : p.type === 'tool' ? '0.9' : p.type === 'guide' ? '0.7' : '0.4'}</priority></url>`).join(NL);
    return send(req, res, 200, 'application/xml; charset=utf-8', `<?xml version="1.0" encoding="UTF-8"?>${NL}<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${NL}${items}${NL}</urlset>${NL}`, { 'cache-control': 'public, max-age=3600' });
  }
  if (u.pathname === '/sitemap.txt') {
    return send(req, res, 200, 'text/plain; charset=utf-8', pages.filter((p) => p.type !== 'thanks').map((p) => url(p.path)).join(NL) + NL, { 'cache-control': 'public, max-age=3600' });
  }
  if (u.pathname === '/favicon.ico') { u.pathname = '/favicon-32.png'; }

  if (u.pathname === '/contact' && req.method === 'POST') {
    req.resume();
    return send(req, res, 200, 'text/html; charset=utf-8', '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Enable JavaScript</title><meta name="robots" content="noindex"></head><body style="font:16px/1.6 system-ui,sans-serif;max-width:560px;margin:12vh auto;padding:0 20px"><h1>Please enable JavaScript</h1><p>The contact form needs JavaScript. You can also call or WhatsApp <a href="tel:+919821012189">+91 98210 12189</a>.</p><p><a href="/contact">Back to contact page</a></p></body></html>', { 'cache-control': 'no-store' });
  }

  // HTML pages (home, tool pages, guides)
  const clean = u.pathname.length > 1 ? u.pathname.replace(/\/+$/, '') : u.pathname;
  if (clean !== u.pathname && byPath[clean]) { res.writeHead(301, { location: url(clean) + u.search, ...securityHeaders(req) }); return res.end(); }
  const page = byPath[clean] || (clean === '/index.html' ? byPath['/'] : null);
  if (page) {
    const html = render(fs.readFileSync(TEMPLATE_FILE, 'utf8'), page, origin);
    return send(req, res, 200, 'text/html; charset=utf-8', html, { 'cache-control': 'public, max-age=300' });
  }

  // static files
  let file; try { file = path.join(PUBLIC, decodeURIComponent(u.pathname)); } catch { file = PUBLIC + '/__bad'; }
  if (file.startsWith(PUBLIC) && file !== TEMPLATE_FILE && fs.existsSync(file) && fs.statSync(file).isFile()) {
    const ext = path.extname(file);
    const cache = /\.(png|svg|ico|webmanifest)$/.test(ext) ? 'public, max-age=604800' : 'public, max-age=86400';
    return send(req, res, 200, MIME[ext] || 'application/octet-stream', fs.readFileSync(file), { 'cache-control': cache });
  }

  // real 404 (not a soft 404)
  const links = pages.slice(0, 7).map((p) => `<li><a href="${p.path}">${p.name}</a></li>`).join('');
  const body = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Page not found | Tarun Developer</title><meta name="robots" content="noindex"><link rel="icon" href="/favicon.svg" type="image/svg+xml"><style>body{font:16px/1.6 system-ui,sans-serif;max-width:560px;margin:12vh auto;padding:0 20px;color:#14161f}a{color:#4f46e5}h1{margin-bottom:4px}</style></head><body><h1>404 – Page not found</h1><p>This page does not exist. Try one of our free tools:</p><ul>${links}</ul></body></html>`;
  return send(req, res, 404, 'text/html; charset=utf-8', body, { 'cache-control': 'no-store' });
});

server.listen(PORT, '0.0.0.0', () => console.log(`Audit tool running on port ${PORT}`));
