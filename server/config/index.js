require('dotenv').config();

const port = process.env.PORT || 3000;
const baseUrl = process.env.BASE_URL || `http://localhost:${port}`;

module.exports = {
  port,
  baseUrl,
  wsBaseUrl: baseUrl.replace('http', 'ws'),
  jwtSecret: process.env.JWT_SECRET || 'super_secret_jwt_key_2024',
  sessionSecret: process.env.SESSION_SECRET || 'session_secret_2024',
  // Basic Auth users
  basicUsers: {
    'admin': '$2a$10$8Y0r6IYz3F2r3KjQvH7x.eY9lR1k6m3q3x3x3x3x3x3x3x3x3x3x3', // placeholder, will be hashed 'admin123'
    'user1': 'password123',
    'demo': 'demo123'
  },
  // Digest Auth
  digestRealm: 'Secure Area',
  digestUsers: {
    'admin': 'admin123',
    'digestuser': 'digestpass'
  },
  // OAuth 1.0 / 1.0a
  oauth1: {
    consumerKey: 'xvz1evFS4wEEPTGEFPHBog',
    consumerSecret: 'kAcSOqF21Fu85e7zjz7ZN2U4ZRhfV3WpwPAoE3Z7kBw',
    requestTokenUrl: '/oauth1/request_token',
    authorizeUrl: '/oauth1/authorize',
    accessTokenUrl: '/oauth1/access_token'
  },
  oauth1a: {
    consumerKey: 'oauth1a_consumer_key_123',
    consumerSecret: 'oauth1a_consumer_secret_456',
    callbackUrl: 'http://localhost:3000/callback'
  },
  // OAuth 2.0
  oauth2: {
    clients: {
      'client_app_123': {
        clientSecret: 'client_secret_abc_123',
        redirectUris: ['http://localhost:3000/callback', 'http://localhost:3000/client/callback'],
        grants: ['authorization_code', 'client_credentials', 'password', 'refresh_token']
      },
      'mobile_app': {
        clientSecret: 'mobile_secret_xyz',
        redirectUris: ['http://localhost:3000/callback'],
        grants: ['authorization_code', 'refresh_token']
      }
    },
    users: {
      'john': 'john123',
      'alice': 'alice123',
      'bob': 'bob123'
    }
  }
};
