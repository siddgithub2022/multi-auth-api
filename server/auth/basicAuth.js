/**
 * Basic Authentication
 * RFC 7617 - Authorization: Basic base64(username:password)
 */
const express = require('express');
const router = express.Router();
const { generateRealtimePayload } = require('../data/realtimeData');

// In-memory users (in production use DB + bcrypt)
const USERS = {
  'admin': 'admin123',
  'user1': 'password123',
  'demo': 'demo123'
};

function basicAuthMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Basic ')) {
    res.set('WWW-Authenticate', 'Basic realm="Secure Area"');
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Basic authentication required. Provide Authorization: Basic <base64(username:password)>',
      example: 'Authorization: Basic ' + Buffer.from('admin:admin123').toString('base64'),
      users: Object.keys(USERS).map(u => ({ username: u, password: USERS[u] }))
    });
  }
  try {
    const base64 = authHeader.split(' ')[1];
    const decoded = Buffer.from(base64, 'base64').toString('utf8');
    const [username, password] = decoded.split(':');
    if (USERS[username] && USERS[username] === password) {
      req.user = { username, auth: 'basic' };
      return next();
    }
    res.set('WWW-Authenticate', 'Basic realm="Secure Area"');
    return res.status(401).json({ error: 'Invalid credentials', provided: username });
  } catch (e) {
    return res.status(400).json({ error: 'Invalid Authorization header', details: e.message });
  }
}

// Public helper to show credentials
router.get('/credentials', (req, res) => {
  res.json({
    message: 'Use these for Basic Auth',
    users: USERS,
    headerExample: 'Basic ' + Buffer.from('admin:admin123').toString('base64'),
    curl: `curl -u admin:admin123 http://localhost:3000/api/basic/data`
  });
});

router.get('/data', basicAuthMiddleware, (req, res) => {
  res.json({
    auth: 'basic',
    user: req.user,
    message: 'Authenticated via Basic Auth',
    data: { secret: 'BasicAuthSecretData', items: [1,2,3].map(i => ({ id:i, value: Math.random().toFixed(4)})) },
    realtime: generateRealtimePayload(),
    timestamp: new Date().toISOString()
  });
});

router.get('/profile', basicAuthMiddleware, (req, res) => {
  res.json({ auth: 'basic', profile: { username: req.user.username, role: req.user.username==='admin'?'admin':'user' }, timestamp: new Date().toISOString() });
});

router.get('/realtime', basicAuthMiddleware, (req, res) => {
  res.json({ auth: 'basic', user: req.user, realtime: generateRealtimePayload() });
});

module.exports = { router, basicAuthMiddleware, USERS };
