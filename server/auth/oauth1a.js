/**
 * OAuth 1.0a - 3-legged flow
 * Steps:
 * 1) POST /oauth1a/request_token -> returns oauth_token & oauth_token_secret (unauthorized)
 * 2) GET /oauth1a/authorize?oauth_token=... -> user approves, returns oauth_verifier
 * 3) POST /oauth1a/access_token (with verifier) -> returns access token & secret
 * 4) Use access token to call /api/oauth1a/data
 */
const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const { generateRealtimePayload } = require('../data/realtimeData');

const CONSUMER = { key: 'oauth1a_consumer_key_123', secret: 'oauth1a_consumer_secret_456' };
const requestTokens = new Map(); // token -> { secret, verifier, authorized, user }
const accessTokens = new Map();  // token -> { secret, user }

function generateToken() { return crypto.randomBytes(16).toString('hex'); }
function generateSecret() { return crypto.randomBytes(32).toString('hex'); }
function generateVerifier() { return crypto.randomBytes(8).toString('hex'); }

// Step 1: Request token
router.post('/request_token', (req, res) => {
  const auth = req.headers.authorization || '';
  // Simplified check: require consumer key
  if (!auth.includes(CONSUMER.key) && req.body.oauth_consumer_key !== CONSUMER.key && req.query.oauth_consumer_key !== CONSUMER.key) {
    // For demo allow without strict signature
    // but log warning
  }
  const token = generateToken();
  const secret = generateSecret();
  requestTokens.set(token, { secret, authorized: false, verifier: null, created: Date.now() });
  res.type('application/x-www-form-urlencoded').send(`oauth_token=${token}&oauth_token_secret=${secret}&oauth_callback_confirmed=true`);
});

router.get('/request_token', (req,res)=>{
  const token = generateToken();
  const secret = generateSecret();
  requestTokens.set(token, { secret, authorized:false, verifier:null, created: Date.now() });
  res.json({ oauth_token: token, oauth_token_secret: secret, oauth_callback_confirmed: true });
});

// Step 2: Authorization
router.get('/authorize', (req,res)=>{
  const { oauth_token } = req.query;
  if (!oauth_token || !requestTokens.has(oauth_token)) return res.status(404).json({ error:'Invalid request token' });
  // In real UI user would login & approve. Here auto-approve for demo and show verifier.
  const entry = requestTokens.get(oauth_token);
  if (!entry.verifier) {
    entry.verifier = generateVerifier();
    entry.authorized = true;
    entry.user = 'oauth1a_user';
  }
  // If Accept html, show page, otherwise JSON
  if (req.headers.accept && req.headers.accept.includes('text/html')) {
    return res.send(`
      <html><body style="font-family:sans-serif;padding:20px">
        <h2>OAuth 1.0a Authorization</h2>
        <p>Token <b>${oauth_token}</b> authorized.</p>
        <p>Verifier: <code style="background:#eee;padding:4px 8px">${entry.verifier}</code></p>
        <p>Callback URL would receive oauth_token=${oauth_token}&oauth_verifier=${entry.verifier}</p>
        <a href="/api/oauth1a/access_token?oauth_token=${oauth_token}&oauth_verifier=${entry.verifier}">Continue to get access token (demo)</a>
      </body></html>
    `);
  }
  res.json({ oauth_token, oauth_verifier: entry.verifier, authorized:true, message:'User authorized. Use verifier to get access token.' });
});

router.post('/authorize', (req,res)=>{
  const { oauth_token, username } = req.body;
  if (!requestTokens.has(oauth_token)) return res.status(404).json({ error:'Invalid token' });
  const entry = requestTokens.get(oauth_token);
  entry.authorized = true;
  entry.verifier = generateVerifier();
  entry.user = username || 'oauth1a_user';
  res.json({ oauth_token, oauth_verifier: entry.verifier });
});

// Step 3: Access token
router.post('/access_token', (req,res)=>{
  const { oauth_token, oauth_verifier } = req.body;
  // Also check header/query
  const token = oauth_token || req.query.oauth_token;
  const verifier = oauth_verifier || req.query.oauth_verifier;
  if (!token || !requestTokens.has(token)) return res.status(404).type('text/plain').send('Invalid oauth_token');
  const entry = requestTokens.get(token);
  if (!entry.authorized) return res.status(401).type('text/plain').send('Not authorized');
  if (entry.verifier !== verifier) return res.status(401).type('text/plain').send('Invalid verifier');
  const accessToken = generateToken();
  const accessSecret = generateSecret();
  accessTokens.set(accessToken, { secret: accessSecret, user: entry.user });
  requestTokens.delete(token);
  if (req.headers.accept && req.headers.accept.includes('application/json')) {
    return res.json({ oauth_token: accessToken, oauth_token_secret: accessSecret });
  }
  res.type('application/x-www-form-urlencoded').send(`oauth_token=${accessToken}&oauth_token_secret=${accessSecret}`);
});

router.get('/access_token', (req,res)=>{
  const token = req.query.oauth_token;
  const verifier = req.query.oauth_verifier;
  if (!token || !requestTokens.has(token)) return res.status(404).json({ error:'Invalid token' });
  const entry = requestTokens.get(token);
  if (entry.verifier !== verifier) return res.status(401).json({ error:'Invalid verifier' });
  const accessToken = generateToken();
  const accessSecret = generateSecret();
  accessTokens.set(accessToken, { secret: accessSecret, user: entry.user });
  requestTokens.delete(token);
  res.json({ oauth_token: accessToken, oauth_token_secret: accessSecret });
});

// Middleware to verify access token (simplified: check token exists, signature optional for demo)
function oauth1aMiddleware(req,res,next){
  const auth = req.headers.authorization || '';
  let token = null;
  if (auth.startsWith('OAuth ')) {
    const m = auth.match(/oauth_token="([^"]+)"/);
    if (m) token = m[1];
  }
  token = token || req.query.oauth_token || req.headers['x-oauth-token'];
  if (!token || !accessTokens.has(token)) {
    return res.status(401).json({
      error:'Invalid or missing OAuth 1.0a access token',
      howTo:'1) POST /api/oauth1a/request_token 2) GET /api/oauth1a/authorize?oauth_token=... 3) POST /api/oauth1a/access_token',
      demoTokens: Array.from(accessTokens.keys()).slice(0,2)
    });
  }
  const entry = accessTokens.get(token);
  req.user = { username: entry.user, auth:'oauth1.0a', token };
  next();
}

router.get('/credentials', (req,res)=>{
  res.json({
    consumer: CONSUMER,
    requestTokens: Array.from(requestTokens.entries()).map(([k,v])=>({token:k, ...v})),
    accessTokens: Array.from(accessTokens.entries()).map(([k,v])=>({token:k, user:v.user})),
    flow: ['POST /api/oauth1a/request_token','GET /api/oauth1a/authorize?oauth_token=...','POST /api/oauth1a/access_token']
  });
});

router.get('/data', oauth1aMiddleware, (req,res)=>{
  res.json({ auth:'oauth1.0a', user:req.user, message:'OAuth 1.0a 3-legged authenticated', realtime: generateRealtimePayload(), timestamp: new Date().toISOString()});
});
router.get('/realtime', oauth1aMiddleware, (req,res)=> res.json({ auth:'oauth1.0a', realtime: generateRealtimePayload()}));
router.get('/profile', oauth1aMiddleware, (req,res)=> res.json({ auth:'oauth1.0a', user:req.user }));

module.exports = { router, oauth1aMiddleware, CONSUMER, requestTokens, accessTokens };
