/**
 * No Auth (Public) - No authentication required
 * Demonstrates open endpoints accessible to anyone
 */
const express = require('express');
const router = express.Router();
const { generateRealtimePayload } = require('../data/realtimeData');

// Public info endpoint
router.get('/info', (req, res) => {
  res.json({
    auth: 'none',
    message: 'This is a public endpoint - no authentication required',
    timestamp: new Date().toISOString(),
    endpoints: [
      'GET /api/public/info',
      'GET /api/public/data',
      'GET /api/public/realtime',
      'GET /api/public/health'
    ],
    realtime: generateRealtimePayload()
  });
});

router.get('/data', (req, res) => {
  res.json({
    auth: 'none',
    data: [
      { id: 1, name: 'Public Item 1', value: Math.floor(Math.random()*1000) },
      { id: 2, name: 'Public Item 2', value: Math.floor(Math.random()*1000) },
      { id: 3, name: 'Public Item 3', value: Math.floor(Math.random()*1000) }
    ],
    realtime: generateRealtimePayload(),
    timestamp: new Date().toISOString()
  });
});

router.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime(), auth: 'none', realtime: new Date().toISOString() });
});

// POST also allowed without auth (e.g. feedback)
router.post('/echo', (req, res) => {
  res.json({
    auth: 'none',
    message: 'Echo from public endpoint',
    received: req.body,
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
