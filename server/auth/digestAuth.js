/**
 * Digest Authentication - RFC 7616
 * Server issues nonce, client responds with hash:
 * HA1 = MD5(username:realm:password)
 * HA2 = MD5(method:uri)
 * response = MD5(HA1:nonce:nc:cnonce:qop:HA2)
 */
const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const { generateRealtimePayload } = require('../data/realtimeData');

const REALM = 'Secure Digest Area';
const USERS = { 'admin': 'admin123', 'digestuser': 'digestpass' };
const nonces = new Map(); // nonce -> { timestamp, count }

function md5(str) { return crypto.createHash('md5').update(str).digest('hex'); }
function generateNonce() { return crypto.randomBytes(16).toString('hex'); }
function generateOpaque() { return crypto.randomBytes(8).toString('hex'); }

function digestAuthMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Digest ')) {
    const nonce = generateNonce();
    const opaque = generateOpaque();
    nonces.set(nonce, { created: Date.now(), count: 0 });
    res.set('WWW-Authenticate', `Digest realm="${REALM}", qop="auth", nonce="${nonce}", opaque="${opaque}", algorithm=MD5`);
    return res.status(401).json({
      error: 'Digest authentication required',
      realm: REALM,
      nonce, opaque,
      users: USERS,
      note: 'Client must compute response = MD5(HA1:nonce:nc:cnonce:qop:HA2)',
      exampleSteps: {
        HA1: 'MD5(username:realm:password)',
        HA2: 'MD5(method:uri)',
        response: 'MD5(HA1:nonce:nc:cnonce:qop:HA2)'
      }
    });
  }

  // Parse Digest header
  const params = {};
  authHeader.substring(7).split(',').forEach(pair => {
    const m = pair.trim().match(/^(\w+)="?(.*?)"?$/);
    if (m) params[m[1]] = m[2];
  });

  const { username, realm, nonce, uri, response, qop, nc, cnonce } = params;
  if (!username || !USERS[username]) {
    return res.status(401).json({ error: 'Unknown user', username });
  }
  if (!nonces.has(nonce)) {
    return res.status(401).json({ error: 'Invalid or expired nonce', nonce });
  }
  const password = USERS[username];
  const HA1 = md5(`${username}:${realm}:${password}`);
  const HA2 = md5(`${req.method}:${uri}`);
  let expected;
  if (qop) {
    expected = md5(`${HA1}:${nonce}:${nc}:${cnonce}:${qop}:${HA2}`);
  } else {
    expected = md5(`${HA1}:${nonce}:${HA2}`);
  }
  if (expected === response) {
    req.user = { username, auth: 'digest' };
    nonces.get(nonce).count++;
    return next();
  }
  return res.status(401).json({ error: 'Invalid digest response', expected, received: response, debug: { HA1, HA2 } });
}

router.get('/credentials', (req, res) => {
  res.json({ realm: REALM, users: USERS, algorithm: 'MD5', qop: 'auth', curl: `curl --digest -u admin:admin123 http://localhost:3000/api/digest/data` });
});

router.get('/data', digestAuthMiddleware, (req, res) => {
  res.json({ auth: 'digest', user: req.user, message: 'Authenticated via Digest Auth', realtime: generateRealtimePayload(), timestamp: new Date().toISOString() });
});

router.get('/realtime', digestAuthMiddleware, (req, res) => {
  res.json({ auth: 'digest', realtime: generateRealtimePayload() });
});

router.get('/profile', digestAuthMiddleware, (req, res) => {
  res.json({ auth: 'digest', user: req.user });
});

// Cleanup old nonces every 5 min
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of nonces.entries()) if (now - v.created > 5*60*1000) nonces.delete(k);
}, 60*1000);

module.exports = { router, digestAuthMiddleware, USERS, REALM };
