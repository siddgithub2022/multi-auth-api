#!/usr/bin/env node
// Check deployment health for free domain - no bills
const base = process.argv[2] || process.env.BASE_URL || 'http://localhost:3000';
const endpoints = [
  ['health', '/health'],
  ['config', '/api/config'],
  ['public', '/api/public/info'],
  ['public data', '/api/public/data'],
  ['check html', '/check.html'],
  ['check json', '/check.json'],
  ['swagger', '/swagger.json'],
  ['postman', '/postman.json']
];
(async()=>{
  console.log(`Checking ${base} ...`);
  let ok=0, fail=0;
  for(const [name, path] of endpoints){
    try{
      const r=await fetch(base+path);
      const t=await r.text();
      const status = r.status;
      const isOk = status>=200 && status<300;
      console.log(`${isOk?'✓':'✗'} ${name} ${path} → ${status} ${t.slice(0,120).replace(/\n/g,' ')}`);
      if(isOk) ok++; else fail++;
    }catch(e){ console.log(`✗ ${name} ${path} → error ${e.message}`); fail++; }
  }
  console.log(`\nResult: ${ok} ok, ${fail} fail of ${endpoints.length}`);
  if(fail===0) console.log('All checks passed - deployment ready for C2M');
  else console.log('Some checks failed - check server logs');
  process.exit(fail===0?0:1);
})();
