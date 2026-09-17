const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');

(async()=>{
  // Load dashboard html
  const htmlPath = path.join(__dirname, '../client/dashboard.html');
  const html = fs.readFileSync(htmlPath, 'utf8');
  // Create JSDOM with resources, but mock Chart and L
  const dom = new JSDOM(html, {
    url: 'http://localhost:3000/dashboard.html',
    runScripts: 'dangerously',
    resources: 'usable',
    beforeParse(window){
      // Mock Chart and L before scripts load
      window.Chart = class { constructor(){ } update(){} };
      window.L = { map: ()=>({ setView:()=>({}), addTo:()=>{} }), tileLayer:()=>({addTo:()=>{}}), marker:()=>({addTo:()=>({bindPopup:()=>({setPopupContent:()=>{}})})}) };
      window.fetch = fetch; // use Node fetch
    }
  });
  const { window } = dom;
  // Wait a bit for scripts to load and tick to run
  await new Promise(r=>setTimeout(r, 6000));
  const doc = window.document;
  console.log('=== DASHBOARD TEST ===');
  console.log('dashLog:', doc.getElementById('dashLog')?.textContent?.slice(0,500));
  console.log('kpiBTC:', doc.getElementById('kpiBTC')?.textContent);
  console.log('kpiAAPL:', doc.getElementById('kpiAAPL')?.textContent);
  console.log('tickCount:', doc.getElementById('tickCount')?.textContent);
  console.log('gridBody rows:', doc.getElementById('gridBody')?.children.length);
  console.log('lastTick:', doc.getElementById('lastTick')?.textContent);
  // Check for JS errors
  console.log('window errors captured via console?');
  dom.window.close();
})();
