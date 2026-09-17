#!/usr/bin/env node
// Cross-platform launcher with separate Server/Client buttons (Node + open)
const { spawn } = require('child_process');
const path = require('path');
const http = require('http');
const fs = require('fs');

const ROOT = __dirname;
const SERVER_DIR = path.join(ROOT, 'server');
const CLIENT_DIR = path.join(ROOT, 'client');

function checkPort(port){
  return new Promise(res=>{
    const req = http.get(`http://localhost:${port}/health`, r=>{ res(r.statusCode===200); r.resume(); });
    req.on('error', ()=> res(false));
    req.setTimeout(1200, ()=>{ req.destroy(); res(false); });
  });
}
function spawnDetached(cmd, args, cwd){
  const isWin = process.platform==='win32';
  const p = spawn(cmd, args, { cwd, detached: true, stdio: 'ignore', shell: isWin });
  p.unref();
  return p;
}
async function startServer(){
  if(await checkPort(3000)){ console.log('✔ Server already on http://localhost:3000'); return; }
  console.log('▶ Starting SERVER on 0.0.0.0:3000 ...');
  // ensure deps
  if(!fs.existsSync(path.join(SERVER_DIR, 'node_modules'))){
    console.log('  Installing server deps...');
    require('child_process').execSync('npm install', { cwd: SERVER_DIR, stdio: 'inherit' });
  }
  spawnDetached('node', ['server.js'], SERVER_DIR);
  for(let i=0;i<10;i++){ await new Promise(r=>setTimeout(r,600)); if(await checkPort(3000)){ console.log('✔ SERVER http://localhost:3000'); return; }}
  console.log('  Server started (check http://localhost:3000)');
}
async function startClient(){
  if(await checkPort(8080)){ console.log('✔ Client already on http://localhost:8080'); return; }
  console.log('▶ Starting CLIENT on http://localhost:8080 ...');
  if(!fs.existsSync(path.join(CLIENT_DIR, 'node_modules'))){
    console.log('  Installing client deps...');
    require('child_process').execSync('npm install', { cwd: CLIENT_DIR, stdio: 'inherit' });
  }
  const npxCmd = process.platform==='win32' ? 'npx.cmd' : 'npx';
  spawnDetached(npxCmd, ['http-server', '.', '-p', '8080', '--cors', '-c-1'], CLIENT_DIR);
  await new Promise(r=>setTimeout(r,3000));
  if(await checkPort(8080)) console.log('✔ CLIENT http://localhost:8080 (proxies API to http://localhost:3000)');
  else console.log('  CLIENT may still be starting... try http://localhost:8080 in 3s');
}
function open(url){
  const cmd = process.platform==='win32' ? 'start' : process.platform==='darwin' ? 'open' : 'xdg-open';
  try{ require('child_process').exec(`${cmd} ${url}`); }catch{}
}

(async()=>{
  const arg = process.argv[2];
  if(arg==='server'){ await startServer(); }
  else if(arg==='client'){ await startClient(); }
  else if(arg==='both' || !arg){
    await startServer();
    await new Promise(r=>setTimeout(r,1200));
    await startClient();
    await new Promise(r=>setTimeout(r,800));
    console.log('\nOpen:');
    console.log('  Tabs      http://localhost:3000');
    console.log('  Dashboard http://localhost:3000/dashboard.html');
    console.log('  Runner    http://localhost:3000/runner.html');
    console.log('  Client    http://localhost:8080 (standalone)');
    open('http://localhost:3000/dashboard.html');
  } else {
    console.log('Usage: node launcher.js [server|client|both]');
  }
})();
