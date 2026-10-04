const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { analyze } = require('./lib/analyzer');

const PORT = process.env.PORT || 3000;
const PUBLIC = path.join(__dirname, 'public');
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon' };

const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://localhost');

  // Server-Sent Events: streams progress, then the final report
  if (u.pathname === '/api/analyze') {
    res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache', connection: 'keep-alive' });
    const send = (event, data) => res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    try {
      const report = await analyze(u.searchParams.get('url'), { psi: u.searchParams.get('psi') !== '0', onProgress: (m) => send('progress', m) });
      send('result', report);
    } catch (e) {
      send('failure', String(e.message || e));
    }
    return res.end();
  }

  const origin = process.env.SITE_URL || `${req.headers['x-forwarded-proto'] || 'http'}://${req.headers['x-forwarded-host'] || req.headers.host}`;

  if (u.pathname === '/robots.txt') {
    res.writeHead(200, { 'content-type': 'text/plain' });
    return res.end(`User-agent: *
Allow: /
Disallow: /api/

Sitemap: ${origin}/sitemap.xml
`);
  }
  if (u.pathname === '/sitemap.xml') {
    res.writeHead(200, { 'content-type': 'application/xml' });
    return res.end(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${origin}/</loc><lastmod>${new Date().toISOString().slice(0, 10)}</lastmod><changefreq>monthly</changefreq><priority>1.0</priority></url></urlset>`);
  }
  if (u.pathname === '/' || u.pathname === '/index.html') {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=300' });
    return res.end(fs.readFileSync(path.join(PUBLIC, 'index.html'), 'utf8').replaceAll('{{ORIGIN}}', origin));
  }

  // static files
  let file = path.join(PUBLIC, u.pathname === '/' ? 'index.html' : u.pathname);
  if (!file.startsWith(PUBLIC) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end('Not found'); }
  res.writeHead(200, { 'content-type': MIME[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});

server.listen(PORT, '0.0.0.0', () => console.log(`SEO Audit Tool running on port ${PORT}`));
