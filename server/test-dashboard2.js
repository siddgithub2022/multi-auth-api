const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');

(async()=>{
  const htmlPath = path.join(__dirname, '../client/dashboard.html');
  const html = fs.readFileSync(htmlPath, 'utf8');
  const dom = new JSDOM(html, {
    url: 'http://localhost:3000/dashboard.html',
    runScripts: 'dangerously',
    resources: 'usable',
    beforeParse(window){
      window.fetch = fetch;
    }
  });
  const { window } = dom;
  // Wait for scripts to load and tick
  await new Promise(r=>setTimeout(r, 8000));
  const doc = window.document;
  console.log('=== DASHBOARD MAP TEST ===');
  console.log('L defined:', typeof window.L !== 'undefined');
  console.log('map element:', !!doc.getElementById('map'));
  console.log('map innerHTML snippet:', doc.getElementById('map')?.innerHTML?.slice(0,300));
  console.log('dashLog:', doc.getElementById('dashLog')?.textContent?.slice(0,400));
  console.log('kpiBTC:', doc.getElementById('kpiBTC')?.textContent);
  console.log('tickCount:', doc.getElementById('tickCount')?.textContent);
  console.log('gridBody rows:', doc.getElementById('gridBody')?.children.length);
  // Check if map has leaflet container
  const mapEl = doc.getElementById('map');
  console.log('map has leaflet container?', mapEl?.innerHTML?.includes('leaflet'));
  console.log('L errors:', window._leafletError || 'none');
  dom.window.close();
})();
