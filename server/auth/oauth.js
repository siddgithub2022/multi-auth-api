/**
 * Generic OAuth (covers OAuth 2.0 Bearer + legacy) - unified entry
 */
const express = require('express');
const router = express.Router();
const { oauth2Middleware } = require('./oauth2');
const { generateRealtimePayload } = require('../data/realtimeData');

router.get('/info', (req, res) => {
  res.json({
    auth: 'oauth',
    description: 'Generic OAuth endpoint - supports OAuth 1.0a and OAuth 2.0',
    supported: ['oauth1.0', 'oauth1.0a', 'oauth2.0'],
    choose: {
      'oauth1.0': '/api/oauth1/*',
      'oauth1.0a': '/api/oauth1a/*',
      'oauth2.0': '/api/oauth2/*'
    },
    timestamp: new Date().toISOString()
  });
});

router.get('/data', oauth2Middleware, (req, res) => {
  res.json({ auth: 'oauth', user: req.user, realtime: generateRealtimePayload() });
});

module.exports = router;
