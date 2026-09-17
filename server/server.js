/**
 * Dedicated Server - Multi-Auth Realtime API
 * Serves: NoAuth, Basic, Digest, OAuth1.0, OAuth1.0a, OAuth2 + Realtime (WS/SSE/Socket.IO)
 * UI served from /client
 */
require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const path = require('path');
const morgan = require('morgan');
const helmet = require('helmet');
const { WebSocketServer } = require('ws');
const { Server: SocketIOServer } = require('socket.io');
const fs = require('fs');

const config = require('./config');
const requestLogger = require('./middleware/logger');
const { generateRealtimePayload, startRealtime } = require('./data/realtimeData');
const { setupWebSocket, setupSocketIO, setupSSE } = require('./realtime/websocket');
const { generateAll } = require('./utils/swaggerGenerator');
const { generatePostman } = require('./utils/postmanGenerator');

// Auth routers
const noAuthRouter = require('./auth/noAuth');
const { router: basicRouter, basicAuthMiddleware } = require('./auth/basicAuth');
const { router: digestRouter, digestAuthMiddleware } = require('./auth/digestAuth');
const { router: oauth1Router, oauth1Middleware } = require('./auth/oauth1');
const { router: oauth1aRouter, oauth1aMiddleware } = require('./auth/oauth1a');
const { router: oauth2Router, oauth2Middleware } = require('./auth/oauth2');
const oauthGenericRouter = require('./auth/oauth');

const app = express();
const PORT = config.port;

// Middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: '*', credentials: true }));
app.use(morgan('tiny'));
app.use(requestLogger);
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, '../client')));
app.use('/docs', express.static(path.join(__dirname, '../docs')));
app.use('/swagger', express.static(path.join(__dirname, '../swagger')));

// Health & Config - single BaseUrl for all auth types
app.get('/health', (req, res) => res.json({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString(), version: '1.0.0', baseUrl: config.baseUrl, wsBaseUrl: config.wsBaseUrl }));
app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString(), baseUrl: config.baseUrl }));
app.get('/api/config', (req, res) => res.json({ baseUrl: config.baseUrl, wsBaseUrl: config.wsBaseUrl, port: config.port, description: 'Single BaseUrl for all 7 auth types - Non-Auth, Basic, Digest, OAuth, OAuth1.0, OAuth1.0a, OAuth2.0 + Realtime' }));
app.get('/api/baseUrl', (req, res) => res.json({ baseUrl: config.baseUrl }));

// Mount auth routers
app.use('/api/public', noAuthRouter);
app.use('/api/basic', basicRouter);
app.use('/api/digest', digestRouter);
app.use('/api/oauth1', oauth1Router);
app.use('/api/oauth1a', oauth1aRouter);
app.use('/api/oauth2', oauth2Router);
app.use('/api/oauth', oauthGenericRouter);

// Unified endpoints for UI convenience (with appropriate middleware per query)
app.get('/api/data/public', (req, res) => res.json({ auth: 'none', realtime: generateRealtimePayload() }));
app.get('/api/data/basic-protected', basicAuthMiddleware, (req, res) => res.json({ auth: 'basic', user: req.user, realtime: generateRealtimePayload() }));
app.get('/api/data/digest-protected', digestAuthMiddleware, (req, res) => res.json({ auth: 'digest', user: req.user, realtime: generateRealtimePayload() }));
app.get('/api/data/oauth1-protected', oauth1Middleware, (req, res) => res.json({ auth: 'oauth1', user: req.user, realtime: generateRealtimePayload() }));
app.get('/api/data/oauth2-protected', oauth2Middleware, (req, res) => res.json({ auth: 'oauth2', user: req.user, realtime: generateRealtimePayload() }));

// Swagger JSON
const swaggerDir = path.join(__dirname, '../swagger');
const docsDir = path.join(__dirname, '../docs');
if (!fs.existsSync(swaggerDir)) fs.mkdirSync(swaggerDir, { recursive: true });
if (!fs.existsSync(docsDir)) fs.mkdirSync(docsDir, { recursive: true });

const swaggerSpec = generateAll(swaggerDir);
app.get('/swagger.json', (req, res) => res.json(swaggerSpec));
app.get('/api/swagger.json', (req, res) => res.json(swaggerSpec));
swaggerSpec.tags.forEach(t => {
  const key = t.name.toLowerCase().includes('no auth') ? 'noauth' : t.name.toLowerCase().includes('basic') ? 'basic' : t.name.toLowerCase().includes('digest') ? 'digest' : t.name.includes('1.0a') ? 'oauth1a' : t.name.includes('1.0') ? 'oauth1' : t.name.includes('2.0') ? 'oauth2' : t.name.toLowerCase().includes('realtime') ? 'realtime' : null;
  if (key) {
    try {
      const file = path.join(swaggerDir, `swagger.${key}.json`);
      if (fs.existsSync(file)) {
        app.get(`/swagger.${key}.json`, (req, res) => res.sendFile(file));
        app.get(`/api/swagger/${key}`, (req, res) => res.sendFile(file));
      }
    } catch {}
  }
});

// Swagger UI
app.get('/docs', (req, res) => {
  res.send(`<!DOCTYPE html><html><head><title>Swagger UI</title><link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css"></head><body><div id="swagger-ui"></div><script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script><script>window.onload=()=>{SwaggerUIBundle({url:'/swagger.json',dom_id:'#swagger-ui'})}</script></body></html>`);
});

// Layman Guide & README
app.get('/layman', (req, res) => {
  const p = path.join(__dirname, '../LAYMAN_GUIDE.md');
  if (fs.existsSync(p)) {
    const md = fs.readFileSync(p, 'utf8');
    const html = md
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/^### (.*$)/gim,'<h3>$1</h3>')
      .replace(/^## (.*$)/gim,'<h2>$1</h2>')
      .replace(/^# (.*$)/gim,'<h1>$1</h1>')
      .replace(/\*\*(.*?)\*\*/g,'<b>$1</b>')
      .replace(/\n/g,'<br>')
      .replace(/<br><br>/g,'<p>');
    res.send(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Layman Guide</title><style>body{font-family:system-ui,sans-serif;max-width:900px;margin:40px auto;padding:0 20px;line-height:1.6;color:#111}h1{border-bottom:3px solid #111;padding-bottom:10px}h2{color:#4F46E5;margin-top:30px;border-left:4px solid #4F46E5;padding-left:12px}h3{color:#111}table{border-collapse:collapse;width:100%;margin:12px 0}th,td{border:1px solid #ddd;padding:8px;text-align:left}th{background:#f3f4f6}code{background:#f3f4f6;padding:2px 6px;border-radius:4px;font-size:13px}pre{background:#111;color:#0f0;padding:16px;overflow:auto;border-radius:8px}a{color:#4F46E5}</style></head><body><a href="/" style="text-decoration:none">← Back to App</a> | <a href="/README.md">README</a> | <a href="/LAYMAN_GUIDE.md">Raw Markdown</a><hr>${html}<hr><a href="/">← Back to App</a></body></html>`);
  } else res.status(404).send('Layman guide not found');
});
app.get('/README.md', (req,res)=> res.sendFile(path.join(__dirname,'../README.md')));
app.get('/LAYMAN_GUIDE.md', (req,res)=> res.sendFile(path.join(__dirname,'../LAYMAN_GUIDE.md')));
app.get('/runner', (req,res)=> res.sendFile(path.join(__dirname,'../client/runner.html')));
app.get('/runner.html', (req,res)=> res.sendFile(path.join(__dirname,'../client/runner.html')));
app.get('/dashboard', (req,res)=> res.sendFile(path.join(__dirname,'../client/dashboard.html')));
app.get('/dashboard.html', (req,res)=> res.sendFile(path.join(__dirname,'../client/dashboard.html')));

// Postman collection generation
const postmanPath = path.join(docsDir, 'postman_collection.json');
generatePostman(postmanPath);
app.get('/postman.json', (req, res) => res.sendFile(postmanPath));
app.get('/api/postman.json', (req, res) => res.sendFile(postmanPath));
app.get('/postman_collection.json', (req, res) => res.sendFile(postmanPath));

// Callback dummy for OAuth
app.get('/callback', (req, res) => {
  res.send(`<html><body style="font-family:sans-serif;padding:20px"><h2>OAuth Callback</h2><pre>${JSON.stringify(req.query, null, 2)}</pre><p>Copy code/token and use in client.</p><a href="/">Back to UI</a></body></html>`);
});
app.get('/client/callback', (req, res) => res.redirect(`/callback?${new URLSearchParams(req.query).toString()}`));

// Realtime setup (called after server creation)
let wss, io;
function setupRealtime(server) {
  wss = new WebSocketServer({ server, path: '/ws' });
  setupWebSocket(wss);
  // Separate WS for /realtime
  const wss2 = new WebSocketServer({ server, path: '/realtime' });
  setupWebSocket(wss2);

  io = new SocketIOServer(server, { cors: { origin: '*', methods: ['GET','POST'] } });
  setupSocketIO(io);

  // SSE needs app + middlewares
  setupSSE(app, oauth2Middleware, basicAuthMiddleware, digestAuthMiddleware);
}

// Fallback to UI
app.get('*', (req, res) => {
  const index = path.join(__dirname, '../client/index.html');
  if (fs.existsSync(index)) return res.sendFile(index);
  res.json({ message: 'Multi-Auth Realtime API', docs: '/docs', swagger: '/swagger.json', postman: '/postman.json', health: '/health' });
});

// Create HTTP server
const server = http.createServer(app);
setupRealtime(server);
startRealtime(2000);

const HOST = process.env.HOST || '0.0.0.0';
server.listen(PORT, HOST, () => {
  console.log(`
  ==========================================
   Multi-Auth Realtime Dedicated Server
  ==========================================
   Host: ${HOST} (run anywhere - 0.0.0.0)
   Port: ${PORT}
   BaseUrl: ${config.baseUrl}
   URL: http://localhost:${PORT}
   LAN: http://${require('os').networkInterfaces()['Ethernet']?.[0]?.address || require('os').networkInterfaces()['Wi-Fi']?.[0]?.address || 'YOUR_IP'}:${PORT}
   Docs: http://localhost:${PORT}/docs
   Swagger: http://localhost:${PORT}/swagger.json
   Postman: http://localhost:${PORT}/postman.json
   Health: http://localhost:${PORT}/health
   Dashboard: http://localhost:${PORT}/dashboard.html
   Runner: http://localhost:${PORT}/runner.html
   ------------------------------------------
   Tabs / Endpoints (single BaseUrl):
    • Public  -> /api/public/*          (No Auth)
    • Basic   -> /api/basic/*           (Basic)
    • Digest  -> /api/digest/*          (Digest)
    • OAuth1  -> /api/oauth1/*          (HMAC-SHA1)
    • OAuth1a -> /api/oauth1a/*         (3-legged)
    • OAuth2  -> /api/oauth2/*          (Bearer JWT)
   Realtime:
    • WS      -> ws://localhost:${PORT}/ws
    • SSE     -> /api/realtime/sse
    • Socket.IO -> /socket.io/
   One-click: double-click start-all.bat / start-all.sh / launcher.ps1
  ==========================================
  `);
});

module.exports = { app, server };
