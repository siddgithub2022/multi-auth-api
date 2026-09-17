/**
 * OAuth 2.0 - Full implementation with multiple grant types
 * Grants: authorization_code, client_credentials, password, refresh_token
 * Also Bearer token middleware
 */
const express = require('express');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const router = express.Router();
const { generateRealtimePayload } = require('../data/realtimeData');

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key_2024';
const JWT_EXPIRES = '1h';
const REFRESH_EXPIRES = '7d';

const CLIENTS = {
  'client_app_123': { secret:'client_secret_abc_123', redirectUris:['http://localhost:3000/callback','http://localhost:3000/client/callback'], grants:['authorization_code','client_credentials','password','refresh_token'] },
  'mobile_app': { secret:'mobile_secret_xyz', redirectUris:['http://localhost:3000/callback'], grants:['authorization_code','refresh_token'] }
};
const USERS = { 'john':'john123', 'alice':'alice123', 'bob':'bob123' };

const authCodes = new Map(); // code -> { clientId, user, redirectUri, expires }
const refreshTokens = new Map(); // token -> { clientId, user, scope }

function generateCode(){ return crypto.randomBytes(24).toString('hex'); }
function generateToken(){ return crypto.randomBytes(32).toString('hex'); }

function issueJwt(payload, expiresIn = JWT_EXPIRES){
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
}

// Authorization endpoint: GET /oauth2/authorize?response_type=code&client_id=...&redirect_uri=...&scope=...
router.get('/authorize', (req,res)=>{
  const { response_type, client_id, redirect_uri, scope, state } = req.query;
  if (response_type !== 'code') return res.status(400).json({ error:'unsupported_response_type', message:'Only code supported' });
  if (!CLIENTS[client_id]) return res.status(400).json({ error:'invalid_client' });
  if (redirect_uri && !CLIENTS[client_id].redirectUris.includes(redirect_uri)) return res.status(400).json({ error:'invalid_redirect_uri' });
  // For demo auto-approve if user query param, else show login page
  const user = req.query.user || 'john';
  if (!USERS[user]) return res.status(400).json({ error:'invalid_user', validUsers: Object.keys(USERS) });
  const code = generateCode();
  authCodes.set(code, { clientId: client_id, user, redirectUri: redirect_uri || CLIENTS[client_id].redirectUris[0], scope: scope||'read', expires: Date.now()+600*1000 });
  const redirect = `${redirect_uri || CLIENTS[client_id].redirectUris[0]}?code=${code}${state?`&state=${state}`:''}`;
  if (req.headers.accept && req.headers.accept.includes('text/html')) {
    return res.send(`<html><body style="font-family:sans-serif;padding:20px"><h2>OAuth2 Authorization</h2><p>User <b>${user}</b> authorized <b>${client_id}</b></p><p>Code: <code>${code}</code></p><p>Redirecting to <a href="${redirect}">${redirect}</a></p><script>setTimeout(()=>location.href="${redirect}",1500)</script></body></html>`);
  }
  res.json({ code, redirect_uri: redirect, expires_in:600, state });
});

// Token endpoint
router.post('/token', (req,res)=>{
  const { grant_type, code, redirect_uri, client_id, client_secret, username, password, refresh_token, scope } = req.body;
  // Authenticate client
  const cid = client_id || req.headers['x-client-id'];
  const csecret = client_secret || req.headers['x-client-secret'];
  // Basic auth for client
  let basicClient = null;
  if (req.headers.authorization && req.headers.authorization.startsWith('Basic ')) {
    try {
      const decoded = Buffer.from(req.headers.authorization.split(' ')[1],'base64').toString();
      const [id, sec] = decoded.split(':');
      basicClient = { id, sec };
    } catch {}
  }
  const id = cid || (basicClient && basicClient.id);
  const sec = csecret || (basicClient && basicClient.sec);

  if (!grant_type) return res.status(400).json({ error:'invalid_request', message:'grant_type required' });

  if (grant_type === 'authorization_code') {
    if (!code || !id || !sec) return res.status(400).json({ error:'invalid_request', message:'code, client_id, client_secret required' });
    if (!CLIENTS[id] || CLIENTS[id].secret !== sec) return res.status(401).json({ error:'invalid_client' });
    if (!CLIENTS[id].grants.includes('authorization_code')) return res.status(400).json({ error:'unauthorized_client' });
    const entry = authCodes.get(code);
    if (!entry) return res.status(400).json({ error:'invalid_grant', message:'Code not found or expired' });
    if (Date.now() > entry.expires) { authCodes.delete(code); return res.status(400).json({ error:'invalid_grant', message:'Code expired'}); }
    if (entry.clientId !== id) return res.status(400).json({ error:'invalid_grant', message:'Code issued to different client' });
    if (redirect_uri && entry.redirectUri !== redirect_uri) return res.status(400).json({ error:'invalid_grant', message:'redirect_uri mismatch' });
    authCodes.delete(code);
    const access_token = issueJwt({ sub: entry.user, clientId:id, scope: entry.scope, auth:'oauth2' });
    const refresh_token = generateToken();
    refreshTokens.set(refresh_token, { clientId:id, user: entry.user, scope: entry.scope });
    return res.json({ access_token, token_type:'Bearer', expires_in:3600, refresh_token, scope: entry.scope });
  }

  if (grant_type === 'client_credentials') {
    if (!id || !sec) return res.status(401).json({ error:'invalid_client' });
    if (!CLIENTS[id] || CLIENTS[id].secret !== sec) return res.status(401).json({ error:'invalid_client' });
    if (!CLIENTS[id].grants.includes('client_credentials')) return res.status(400).json({ error:'unauthorized_client' });
    const access_token = issueJwt({ sub: id, clientId:id, scope: scope||'read', auth:'oauth2', grant:'client_credentials' });
    return res.json({ access_token, token_type:'Bearer', expires_in:3600, scope: scope||'read' });
  }

  if (grant_type === 'password') {
    if (!username || !password) return res.status(400).json({ error:'invalid_request', message:'username & password required' });
    if (!USERS[username] || USERS[username] !== password) return res.status(401).json({ error:'invalid_grant', message:'Invalid user credentials' });
    // client auth optional for password grant in this demo
    const access_token = issueJwt({ sub: username, clientId: id||'password_client', scope: scope||'read write', auth:'oauth2', grant:'password' });
    const refresh_token = generateToken();
    refreshTokens.set(refresh_token, { clientId: id||'password_client', user: username, scope: scope||'read write' });
    return res.json({ access_token, token_type:'Bearer', expires_in:3600, refresh_token, scope: scope||'read write' });
  }

  if (grant_type === 'refresh_token') {
    if (!refresh_token) return res.status(400).json({ error:'invalid_request', message:'refresh_token required' });
    const entry = refreshTokens.get(refresh_token);
    if (!entry) return res.status(400).json({ error:'invalid_grant', message:'Invalid refresh token' });
    if (id && CLIENTS[id] && CLIENTS[id].secret !== sec) return res.status(401).json({ error:'invalid_client' });
    const newAccess = issueJwt({ sub: entry.user, clientId: entry.clientId, scope: entry.scope, auth:'oauth2' });
    const newRefresh = generateToken();
    refreshTokens.delete(refresh_token);
    refreshTokens.set(newRefresh, entry);
    return res.json({ access_token: newAccess, token_type:'Bearer', expires_in:3600, refresh_token:newRefresh, scope: entry.scope });
  }

  return res.status(400).json({ error:'unsupported_grant_type', supported:['authorization_code','client_credentials','password','refresh_token'] });
});

// Bearer middleware
function oauth2Middleware(req,res,next){
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return res.status(401).json({ error:'invalid_token', message:'Bearer token required', header:'Authorization: Bearer <token>' });
  const token = auth.substring(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = { username: decoded.sub, clientId: decoded.clientId, scope: decoded.scope, auth:'oauth2', decoded };
    next();
  } catch (e) {
    return res.status(401).json({ error:'invalid_token', message:e.message, expiredAt: e.expiredAt });
  }
}

// Introspection
router.post('/introspect', (req,res)=>{
  const { token } = req.body;
  if (!token) return res.status(400).json({ error:'token required' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    res.json({ active:true, ...decoded, exp: decoded.exp, iat: decoded.iat });
  } catch (e) {
    res.json({ active:false, error:e.message });
  }
});

router.get('/credentials', (req,res)=>{
  res.json({
    clients: CLIENTS,
    users: USERS,
    endpoints: {
      authorize: 'GET /api/oauth2/authorize?response_type=code&client_id=client_app_123&redirect_uri=http://localhost:3000/callback&user=john',
      token: 'POST /api/oauth2/token with grant_type',
      introspect: 'POST /api/oauth2/introspect'
    },
    grants_examples:{
      client_credentials: { grant_type:'client_credentials', client_id:'client_app_123', client_secret:'client_secret_abc_123' },
      password: { grant_type:'password', username:'john', password:'john123', client_id:'client_app_123', client_secret:'client_secret_abc_123' },
      authorization_code: 'First GET /authorize to get code, then POST /token with code'
    }
  });
});

router.get('/data', oauth2Middleware, (req,res)=>{
  res.json({ auth:'oauth2', user:req.user, message:'OAuth2 Bearer authenticated', realtime: generateRealtimePayload(), timestamp: new Date().toISOString()});
});
router.get('/profile', oauth2Middleware, (req,res)=> res.json({ auth:'oauth2', user:req.user }));
router.get('/realtime', oauth2Middleware, (req,res)=> res.json({ auth:'oauth2', realtime: generateRealtimePayload() }));

module.exports = { router, oauth2Middleware, CLIENTS, USERS, JWT_SECRET };
