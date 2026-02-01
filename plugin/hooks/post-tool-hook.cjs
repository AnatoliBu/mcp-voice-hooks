#!/usr/bin/env node
const http = require('http');

const port = process.env.MCP_VOICE_HOOKS_PORT || '5111';

const options = {
  hostname: 'localhost',
  port: parseInt(port),
  path: '/api/hooks/post-tool',
  method: 'POST',
  headers: { 'Content-Type': 'application/json' }
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      console.log(data);
    } catch {
      console.log('{}');
    }
  });
});

req.on('error', () => {
  console.log('{}');
});

req.end();
