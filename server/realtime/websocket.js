/**
 * Realtime via WebSocket (ws) and Socket.IO + SSE
 */
const { generateRealtimePayload, subscribe } = require('../data/realtimeData');
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key_2024';

function setupWebSocket(wss) {
  wss.on('connection', (ws, req) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const token = url.searchParams.get('token') || url.searchParams.get('access_token');
    const auth = url.searchParams.get('auth') || 'none';
    // Optional token verification for secure channels
    let user = { auth, authenticated: false };
    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        user = { ...decoded, authenticated: true };
      } catch (e) {
        ws.send(JSON.stringify({ error: 'Invalid token', details: e.message }));
        ws.close(1008, 'Invalid token');
        return;
      }
    }
    ws.user = user;
    ws.send(JSON.stringify({ type: 'connected', message: `WebSocket connected via ${auth}`, user, timestamp: new Date().toISOString() }));

    const unsub = subscribe((payload) => {
      if (ws.readyState === 1) ws.send(JSON.stringify({ type: 'realtime', payload, auth }));
    });

    // Also send every 2s direct if subscribe not triggered
    const interval = setInterval(() => {
      if (ws.readyState === 1) ws.send(JSON.stringify({ type: 'heartbeat', timestamp: new Date().toISOString(), data: generateRealtimePayload() }));
    }, 5000);

    ws.on('message', (msg) => {
      try {
        const data = JSON.parse(msg.toString());
        if (data.action === 'ping') ws.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }));
        if (data.action === 'subscribe') ws.send(JSON.stringify({ type: 'subscribed', channel: data.channel, payload: generateRealtimePayload() }));
      } catch {}
    });

    ws.on('close', () => {
      clearInterval(interval);
      unsub();
    });
  });
  console.log('[WS] WebSocket handler attached');
}

function setupSocketIO(io) {
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        socket.user = decoded;
      } catch (e) {
        return next(new Error('Invalid token'));
      }
    }
    next();
  });

  io.on('connection', (socket) => {
    console.log('[Socket.IO] client connected', socket.id, socket.user || 'anonymous');
    socket.emit('connected', { message: 'Socket.IO connected', id: socket.id, user: socket.user || null, payload: generateRealtimePayload() });

    const unsub = subscribe((payload) => {
      socket.emit('realtime', payload);
    });

    socket.on('ping', (cb) => cb && cb({ pong: true, timestamp: new Date().toISOString() }));
    socket.on('requestData', () => socket.emit('realtime', generateRealtimePayload()));

    socket.on('disconnect', () => {
      unsub();
      console.log('[Socket.IO] disconnected', socket.id);
    });
  });
}

function setupSSE(app, oauth2Middleware, basicMiddleware, digestMiddleware) {
  // Public SSE
  app.get('/api/realtime/sse', (req, res) => {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    });
    res.write(`event: connected\ndata: ${JSON.stringify({ message: 'SSE connected (public)', timestamp: new Date().toISOString() })}\n\n`);
    const unsub = subscribe((payload) => {
      res.write(`event: realtime\ndata: ${JSON.stringify(payload)}\n\n`);
    });
    const keepAlive = setInterval(() => res.write(`: keepalive\n\n`), 15000);
    req.on('close', () => { clearInterval(keepAlive); unsub(); });
  });

  // Authenticated SSE - OAuth2 Bearer
  app.get('/api/realtime/sse/oauth2', oauth2Middleware, (req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' });
    res.write(`event: connected\ndata: ${JSON.stringify({ message: 'SSE OAuth2 connected', user: req.user })}\n\n`);
    const unsub = subscribe((payload) => res.write(`event: realtime\ndata: ${JSON.stringify(payload)}\n\n`));
    req.on('close', () => unsub());
  });

  // Basic SSE demo (uses same middleware)
  app.get('/api/realtime/sse/basic', basicMiddleware, (req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' });
    res.write(`event: connected\ndata: ${JSON.stringify({ message: 'SSE Basic connected', user: req.user })}\n\n`);
    const unsub = subscribe((payload) => res.write(`event: realtime\ndata: ${JSON.stringify(payload)}\n\n`));
    req.on('close', () => unsub());
  });

  console.log('[SSE] SSE endpoints registered');
}

module.exports = { setupWebSocket, setupSocketIO, setupSSE };
