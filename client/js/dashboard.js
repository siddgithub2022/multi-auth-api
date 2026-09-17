let base = location.origin;
// Unified BaseUrl - try local, fallback to http://localhost:3000 for standalone client (port 8080)
async function initBase(){
  const candidates = [location.origin, 'http://localhost:3000'];
  for(const c of candidates){
    try{
      const r = await fetch(c+'/api/config');
      if(r.ok){ const j=await r.json(); if(j.baseUrl){ base=j.baseUrl; const a=document.getElementById('dashBaseUrl'); if(a) a.textContent=base; const b=document.getElementById('dashUnified'); if(b) b.textContent=base; const run=document.getElementById('runnerUnifiedBaseUrl'); if(run) run.textContent=base; return; }}
    }catch{}
  }
}
initBase();
window.onerror = (msg, src, line, col, err)=>{ const l=document.getElementById('dashLog'); if(l) l.textContent='JS Error: '+msg+' @'+line+':'+col+'\n'+l.textContent; console.error(msg, err); };

let paused=false;
document.getElementById('pauseBtn').addEventListener('click', ()=>{
  paused=!paused;
  document.getElementById('pauseBtn').innerHTML = paused ? '<i class="fa-solid fa-play"></i> Resume' : '<i class="fa-solid fa-pause"></i> Pause';
  document.getElementById('dashStatusTxt').textContent = paused ? 'paused' : 'live • 2s tick';
});
document.getElementById('authSelect').addEventListener('change', e=>{
  const v=e.target.value;
  document.getElementById('bearerInput').classList.toggle('hidden', v!=='bearer');
});

let tickCountVal=0;
let dashHistory=[]; // last 30
let btcSpark=[], aaplSpark=[];
let oauth1aCache = null; // cached access token for dashboard
async function md5Dashboard(str){
  // minimal MD5 (same as Tabs UI)
  function cmn(q,a,b,x,s,t){a=add32(add32(a,q),add32(x,t));return add32((a<<s)|(a>>>32-s),b)}
  function ff(a,b,c,d,x,s,t){return cmn((b&c)|(~b&d),a,b,x,s,t)}
  function gg(a,b,c,d,x,s,t){return cmn((b&d)|(c&~d),a,b,x,s,t)}
  function hh(a,b,c,d,x,s,t){return cmn(b^c^d,a,b,x,s,t)}
  function ii(a,b,c,d,x,s,t){return cmn(c^(b|~d),a,b,x,s,t)}
  function md5blk(s){var md5blks=[],i;for(i=0;i<64;i+=4){md5blks[i>>2]=s.charCodeAt(i)+(s.charCodeAt(i+1)<<8)+(s.charCodeAt(i+2)<<16)+(s.charCodeAt(i+3)<<24)}return md5blks}
  function rhex(n){var s='',j;for(j=0;j<4;j++)s+=('0'+((n>>j*8)&0xFF).toString(16)).slice(-2);return s}
  function add32(a,b){return (a+b)&0xFFFFFFFF}
  function md5(s){var n=s.length,a=1732584193,b=-271733879,c=-1732584194,d=271733878,i;for(i=64;i<=s.length;i+=64){var blk=md5blk(s.substring(i-64,i));var olda=a,oldb=b,oldc=c,oldd=d;a=ff(a,b,c,d,blk[0],7,-680876936);d=ff(d,a,b,c,blk[1],12,-389564586);c=ff(c,d,a,b,blk[2],17,606105819);b=ff(b,c,d,a,blk[3],22,-1044525330);a=ff(a,b,c,d,blk[4],7,-176418897);d=ff(d,a,b,c,blk[5],12,1200080426);c=ff(c,d,a,b,blk[6],17,-1473231341);b=ff(b,c,d,a,blk[7],22,-45705983);a=ff(a,b,c,d,blk[8],7,1770035416);d=ff(d,a,b,c,blk[9],12,-1958414417);c=ff(c,d,a,b,blk[10],17,-42063);b=ff(b,c,d,a,blk[11],22,-1990404162);a=ff(a,b,c,d,blk[12],7,1804603682);d=ff(d,a,b,c,blk[13],12,-40341101);c=ff(c,d,a,b,blk[14],17,-1502002290);b=ff(b,c,d,a,blk[15],22,1236535329);a=gg(a,b,c,d,blk[1],5,-165796510);d=gg(d,a,b,c,blk[6],9,-1069501632);c=gg(c,d,a,b,blk[11],14,643717713);b=gg(b,c,d,a,blk[0],20,-373897302);a=gg(a,b,c,d,blk[5],5,-701558691);d=gg(d,a,b,c,blk[10],9,38016083);c=gg(c,d,a,b,blk[15],14,-660478335);b=gg(b,c,d,a,blk[4],20,-405537848);a=gg(a,b,c,d,blk[9],5,568446438);d=gg(d,a,b,c,blk[14],9,-1019803690);c=gg(c,d,a,b,blk[3],14,-187363961);b=gg(b,c,d,a,blk[8],20,1163531501);a=gg(a,b,c,d,blk[13],5,-1444681467);d=gg(d,a,b,c,blk[2],9,-51403784);c=gg(c,d,a,b,blk[7],14,1735328473);b=gg(b,c,d,a,blk[12],20,-1926607734);a=hh(a,b,c,d,blk[5],4,-378558);d=hh(d,a,b,c,blk[8],11,-2022574463);c=hh(c,d,a,b,blk[11],16,1839030562);b=hh(b,c,d,a,blk[14],23,-35309556);a=hh(a,b,c,d,blk[1],4,-1530992060);d=hh(d,a,b,c,blk[4],11,1272893353);c=hh(c,d,a,b,blk[7],16,-155497632);b=hh(b,c,d,a,blk[10],23,-1094730640);a=hh(a,b,c,d,blk[13],4,681279174);d=hh(d,a,b,c,blk[0],11,-358537222);c=hh(c,d,a,b,blk[3],16,-722521979);b=hh(b,c,d,a,blk[6],23,76029189);a=hh(a,b,c,d,blk[9],4,-640364487);d=hh(d,a,b,c,blk[12],11,-421815835);c=hh(c,d,a,b,blk[15],16,530742520);b=hh(b,c,d,a,blk[2],23,-995338651);a=ii(a,b,c,d,blk[0],6,-198630844);d=ii(d,a,b,c,blk[7],10,1126891415);c=ii(c,d,a,b,blk[14],15,-1416354905);b=ii(b,c,d,a,blk[5],21,-57434055);a=ii(a,b,c,d,blk[12],6,1700485571);d=ii(d,a,b,c,blk[3],10,-1894986606);c=ii(c,d,a,b,blk[10],15,-1051523);b=ii(b,c,d,a,blk[1],21,-2054922799);a=ii(a,b,c,d,blk[8],6,1873313359);d=ii(d,a,b,c,blk[15],10,-30611744);c=ii(c,d,a,b,blk[6],15,-1560198380);b=ii(b,c,d,a,blk[13],21,1309151649);a=ii(a,b,c,d,blk[4],6,-145523070);d=ii(d,a,b,c,blk[11],10,-1120210379);c=ii(c,d,a,b,blk[2],15,718787259);b=ii(b,c,d,a,blk[9],21,-343485551);a=add32(a,olda);b=add32(b,oldb);c=add32(c,oldc);d=add32(d,oldd)}return rhex(a)+rhex(b)+rhex(c)+rhex(d)}
  return md5(str);
}
async function hmacSHA1Dashboard(key, data){
  const enc=new TextEncoder();
  const k=await crypto.subtle.importKey('raw', enc.encode(key), {name:'HMAC', hash:'SHA-1'}, false, ['sign']);
  const s=await crypto.subtle.sign('HMAC', k, enc.encode(data));
  return btoa(String.fromCharCode(...new Uint8Array(s)));
}
async function fetchOAuth1aToken(){
  if(oauth1aCache) return oauth1aCache;
  try{
    const r1=await fetch(base+'/api/oauth1a/request_token');
    const j1=await r1.json();
    const tok=j1.oauth_token;
    const r2=await fetch(base+'/api/oauth1a/authorize?oauth_token='+encodeURIComponent(tok));
    const j2=await r2.json();
    const ver=j2.oauth_verifier;
    const r3=await fetch(base+'/api/oauth1a/access_token?oauth_token='+encodeURIComponent(tok)+'&oauth_verifier='+encodeURIComponent(ver));
    const j3=await r3.json();
    oauth1aCache=j3.oauth_token;
    return oauth1aCache;
  }catch(e){ console.error('oauth1a token',e); return null; }
}

// Charts - wrapped to survive CDN failure
let barChart, lineChart, sensorChart, doughnutChart, areaChart;
function initCharts(){
  try{
    if(typeof Chart==='undefined'){ throw new Error('Chart.js not loaded'); }
    const barCtx = document.getElementById('barChart');
    barChart = new Chart(barCtx, {
      type:'bar',
      data:{ labels:['AAPL','GOOGL','TSLA'], datasets:[{ label:'Price $', data:[0,0,0], backgroundColor:['#6366f1','#10b981','#f59e0b'] }] },
      options:{ responsive:true, plugins:{legend:{display:false}}, scales:{y:{beginAtZero:false}} }
    });
    const lineCtx = document.getElementById('lineChart');
    lineChart = new Chart(lineCtx, {
      type:'line',
      data:{ labels:[], datasets:[
        {label:'BTC', data:[], borderColor:'#10b981', backgroundColor:'rgba(16,185,129,0.1)', tension:0.4, fill:true},
        {label:'ETH', data:[], borderColor:'#6366f1', backgroundColor:'rgba(99,102,241,0.1)', tension:0.4, fill:true}
      ]},
      options:{ responsive:true, plugins:{legend:{position:'bottom'}}, scales:{y:{beginAtZero:false}} }
    });
    const sensorCtx = document.getElementById('sensorChart');
    sensorChart = new Chart(sensorCtx, {
      type:'bar',
      data:{ labels:['Temp °C','Humidity %','CPU %','Mem %'], datasets:[{label:'Sensors', data:[0,0,0,0], backgroundColor:['#f59e0b','#06b6d4','#ef4444','#8b5cf6']}]},
      options:{ responsive:true, plugins:{legend:{display:false}}, scales:{y:{max:100}} }
    });
    const doughnutCtx = document.getElementById('doughnutChart');
    doughnutChart = new Chart(doughnutCtx, {
      type:'doughnut',
      data:{ labels:['CPU','Memory','Idle'], datasets:[{ data:[0,0,100], backgroundColor:['#ef4444','#8b5cf6','#e5e7eb'] }]},
      options:{ responsive:true, plugins:{legend:{position:'bottom'}} }
    });
    const areaCtx = document.getElementById('areaChart');
    areaChart = new Chart(areaCtx, {
      type:'line',
      data:{ labels:[], datasets:[
        {label:'RPS', data:[], borderColor:'#8b5cf6', backgroundColor:'rgba(139,92,246,0.15)', tension:0.4, fill:true, yAxisID:'y'},
        {label:'Latency ms', data:[], borderColor:'#f59e0b', backgroundColor:'rgba(245,158,11,0.15)', tension:0.4, fill:true, yAxisID:'y1'}
      ]},
      options:{ responsive:true, interaction:{mode:'index', intersect:false},
        scales:{ y:{position:'left', beginAtZero:true}, y1:{position:'right', beginAtZero:true, grid:{drawOnChartArea:false}} }
      }
    });
  }catch(e){
    console.error('Chart init failed', e);
    const log=document.getElementById('dashLog');
    if(log) log.textContent = 'Chart.js load failed: '+e.message+' - KPIs/Grid/Map will still update.\n' + log.textContent;
  }
}
initCharts();
// spark tiny
function spark(id, data, color){
  const el=document.getElementById(id);
  if(!el) return;
  // we reuse Chart for spark if needed, but simple: use barChart trick? Just keep as tiny line via same canvas reused? For now leave as placeholder and draw via Chart on same canvas lazily
}

// Map - robust with local fallback, tile fallback, and invalidateSize
let map, markers={};
function initMap(attempt=0){
  try{
    if(typeof L==='undefined'){
      if(attempt<10){ setTimeout(()=>initMap(attempt+1), 300); return; }
      throw new Error('Leaflet not loaded after retry');
    }
    const el=document.getElementById('map');
    if(!el){ setTimeout(()=>initMap(attempt+1), 300); return; }
    if(el._leaflet_id){ try{ el._leaflet_id=null; el.innerHTML=''; }catch{} }
    map = L.map('map', { zoomControl:true }).setView([20,0], 2);
    // Primary OSM, fallback to Carto on error
    const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution:'© OpenStreetMap', maxZoom:19 });
    const carto = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', { attribution:'© OSM © CARTO', maxZoom:19 });
    osm.on('tileerror', ()=>{ try{ map.removeLayer(osm); carto.addTo(map); }catch{} });
    osm.addTo(map);
    markers = {
      aapl: L.marker([40.7128,-74.0060]).addTo(map).bindPopup('NYSE - AAPL'),
      googl: L.marker([37.4220,-122.0841]).addTo(map).bindPopup('NASDAQ - GOOGL'),
      tsla: L.marker([33.7436,-118.0956]).addTo(map).bindPopup('Tesla - TSLA'),
      btc: L.marker([51.5074,-0.1278]).addTo(map).bindPopup('London - BTC'),
      sensor: L.marker([28.6139,77.2090]).addTo(map).bindPopup('Delhi - Sensors')
    };
    // Ensure map renders correctly after container becomes visible
    setTimeout(()=>{ try{ map.invalidateSize(); }catch{} }, 400);
    setTimeout(()=>{ try{ map.invalidateSize(); }catch{} }, 1200);
    window.addEventListener('resize', ()=>{ try{ map.invalidateSize(); }catch{} });
  }catch(e){
    console.error('Map init failed', e);
    const el=document.getElementById('map');
    if(el) el.innerHTML='<div class="p-6 text-center text-sm text-red-600">Map failed to load. Markers still update below.<br>'+e.message+'<br><button onclick="initMap(0)" class="mt-2 bg-indigo-600 text-white px-3 py-1 rounded text-xs">Retry</button></div>';
  }
}
window.initMap = initMap;
if(document.readyState==='loading'){ document.addEventListener('DOMContentLoaded', ()=>initMap()); } else { initMap(); }

function updateMap(payload){
  try{
    if(markers.aapl) markers.aapl.setPopupContent(`AAPL: $${payload.stocks.find(s=>s.symbol==='AAPL')?.price}`);
    if(markers.googl) markers.googl.setPopupContent(`GOOGL: $${payload.stocks.find(s=>s.symbol==='GOOGL')?.price}`);
    if(markers.tsla) markers.tsla.setPopupContent(`TSLA: $${payload.stocks.find(s=>s.symbol==='TSLA')?.price}`);
    if(markers.btc) markers.btc.setPopupContent(`BTC: $${payload.crypto.find(c=>c.symbol==='BTC')?.price}`);
    if(markers.sensor) markers.sensor.setPopupContent(`Temp: ${payload.sensors.temperature}°C<br>CPU: ${payload.sensors.cpu}%`);
  }catch(e){ console.error('map update', e); }
  const a=document.getElementById('mapAAPL'); if(a) a.textContent = '$'+payload.stocks.find(s=>s.symbol==='AAPL')?.price;
  const g=document.getElementById('mapGOOGL'); if(g) g.textContent = '$'+payload.stocks.find(s=>s.symbol==='GOOGL')?.price;
  const t=document.getElementById('mapTemp'); if(t) t.textContent = payload.sensors.temperature+'°C';
}

function addGridRow(payload){
  const t = new Date(payload.timestamp).toLocaleTimeString();
  const r = payload;
  const row = `<tr class="border-t hover:bg-gray-50">
    <td class="p-2">${t}</td>
    <td class="p-2 font-mono">$${r.stocks.find(s=>s.symbol==='AAPL')?.price}</td>
    <td class="p-2 font-mono">$${r.stocks.find(s=>s.symbol==='GOOGL')?.price}</td>
    <td class="p-2 font-mono">$${r.stocks.find(s=>s.symbol==='TSLA')?.price}</td>
    <td class="p-2 font-mono">$${r.crypto.find(c=>c.symbol==='BTC')?.price}</td>
    <td class="p-2 font-mono">$${r.crypto.find(c=>c.symbol==='ETH')?.price}</td>
    <td class="p-2">${r.sensors.cpu}%</td>
    <td class="p-2">${r.metrics.requestsPerSec}</td>
  </tr>`;
  const body=document.getElementById('gridBody');
  body.insertAdjacentHTML('afterbegin', row);
  // keep 20 rows
  while(body.children.length>20) body.removeChild(body.lastChild);
  // filter
  filterGrid();
}
function filterGrid(){
  const q=document.getElementById('gridFilter').value.toLowerCase();
  document.querySelectorAll('#gridBody tr').forEach(tr=>{
    tr.style.display = tr.textContent.toLowerCase().includes(q) ? '' : 'none';
  });
}
document.getElementById('gridFilter').addEventListener('input', filterGrid);

function exportCSV(){
  let csv='Time,AAPL,GOOGL,TSLA,BTC,ETH,CPU,RPS\n';
  dashHistory.forEach(h=>{
    const r=h;
    csv += `${r.timestamp},${r.stocks.find(s=>s.symbol==='AAPL')?.price},${r.stocks.find(s=>s.symbol==='GOOGL')?.price},${r.stocks.find(s=>s.symbol==='TSLA')?.price},${r.crypto.find(c=>c.symbol==='BTC')?.price},${r.crypto.find(c=>c.symbol==='ETH')?.price},${r.sensors.cpu},${r.metrics.requestsPerSec}\n`;
  });
  const blob=new Blob([csv],{type:'text/csv'});
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='dashboard_'+Date.now()+'.csv'; a.click();
}
window.exportCSV=exportCSV;
window.clearHistory=()=>{ dashHistory=[]; if(lineChart){ lineChart.data.labels=[]; lineChart.data.datasets[0].data=[]; lineChart.data.datasets[1].data=[]; lineChart.update(); } if(areaChart){ areaChart.data.labels=[]; areaChart.data.datasets[0].data=[]; areaChart.data.datasets[1].data=[]; areaChart.update(); } };

function updateKPIs(p){
  document.getElementById('kpiBTC').textContent='$'+p.crypto.find(c=>c.symbol==='BTC')?.price;
  document.getElementById('kpiAAPL').textContent='$'+p.stocks.find(s=>s.symbol==='AAPL')?.price;
  document.getElementById('kpiCPU').textContent=p.sensors.cpu+'%';
  document.getElementById('kpiMem').textContent=p.sensors.memory+'%';
  document.getElementById('kpiRPS').textContent=p.metrics.requestsPerSec;
  document.getElementById('kpiTemp').textContent=`Temp ${p.sensors.temperature}°C • Hum ${p.sensors.humidity}%`;
  document.getElementById('kpiLatency').textContent=`Latency ${p.metrics.latencyMs} ms • Conn ${p.metrics.activeConnections}`;
  const btcChange = p.stocks.find(s=>s.symbol==='AAPL')?.change; // reuse
  document.getElementById('kpiBTCChange').textContent='ETH $'+p.crypto.find(c=>c.symbol==='ETH')?.price;
  document.getElementById('kpiAAPLChange').textContent='Change '+(p.stocks.find(s=>s.symbol==='AAPL')?.change||'-');
  // spark arrays
  btcSpark.push(parseFloat(p.crypto.find(c=>c.symbol==='BTC')?.price)); if(btcSpark.length>12) btcSpark.shift();
  aaplSpark.push(parseFloat(p.stocks.find(s=>s.symbol==='AAPL')?.price)); if(aaplSpark.length>12) aaplSpark.shift();
}

function updateCharts(p){
  try{
    const label = new Date(p.timestamp).toLocaleTimeString();
    if(barChart){
      barChart.data.datasets[0].data = [
        parseFloat(p.stocks.find(s=>s.symbol==='AAPL')?.price),
        parseFloat(p.stocks.find(s=>s.symbol==='GOOGL')?.price),
        parseFloat(p.stocks.find(s=>s.symbol==='TSLA')?.price)
      ];
      barChart.update();
    }
    if(lineChart){
      lineChart.data.labels.push(label); if(lineChart.data.labels.length>30) lineChart.data.labels.shift();
      lineChart.data.datasets[0].data.push(parseFloat(p.crypto.find(c=>c.symbol==='BTC')?.price)); if(lineChart.data.datasets[0].data.length>30) lineChart.data.datasets[0].data.shift();
      lineChart.data.datasets[1].data.push(parseFloat(p.crypto.find(c=>c.symbol==='ETH')?.price)); if(lineChart.data.datasets[1].data.length>30) lineChart.data.datasets[1].data.shift();
      lineChart.update();
    }
    if(sensorChart){
      sensorChart.data.datasets[0].data = [parseFloat(p.sensors.temperature), parseFloat(p.sensors.humidity), parseFloat(p.sensors.cpu), parseFloat(p.sensors.memory)];
      sensorChart.update();
    }
    if(doughnutChart){
      const cpu=parseFloat(p.sensors.cpu), mem=parseFloat(p.sensors.memory), idle=Math.max(0,100 - (cpu+mem)/2);
      doughnutChart.data.datasets[0].data=[cpu, mem, idle]; doughnutChart.update();
    }
    if(areaChart){
      areaChart.data.labels.push(label); if(areaChart.data.labels.length>30) areaChart.data.labels.shift();
      areaChart.data.datasets[0].data.push(p.metrics.requestsPerSec); if(areaChart.data.datasets[0].data.length>30) areaChart.data.datasets[0].data.shift();
      areaChart.data.datasets[1].data.push(parseFloat(p.metrics.latencyMs)); if(areaChart.data.datasets[1].data.length>30) areaChart.data.datasets[1].data.shift();
      areaChart.update();
    }
    const el=document.getElementById('barTime'); if(el) el.textContent=label;
  }catch(e){ console.error('chart update', e); }
}

async function tick(){
  if(paused) return;
  const auth = document.getElementById('authSelect').value;
  let url = base + '/api/public/data';
  let headers={};
  let payload=null;
  let res=null;
  try{
    if(auth==='public'){
      res=await fetch(base+'/api/public/data');
    } else if(auth==='basic'){
      headers['Authorization']='Basic '+btoa('admin:admin123');
      res=await fetch(base+'/api/basic/data', {headers});
    } else if(auth==='digest'){
      // Two-step digest
      const user='admin', pass='admin123';
      const first=await fetch(base+'/api/digest/data');
      const www=first.headers.get('WWW-Authenticate');
      if(!www) throw new Error('Digest 401 missing WWW-Authenticate');
      const p={}; www.replace(/(\w+)="([^"]+)"/g, (_,k,v)=>p[k]=v);
      const realm=p.realm, nonce=p.nonce, opaque=p.opaque, qop=p.qop||'auth', uri='/api/digest/data', nc='00000001', cnonce=Math.random().toString(36).slice(2,10);
      const HA1=await md5Dashboard(`${user}:${realm}:${pass}`), HA2=await md5Dashboard(`GET:${uri}`), resp=await md5Dashboard(`${HA1}:${nonce}:${nc}:${cnonce}:${qop}:${HA2}`);
      const hdr=`Digest username="${user}", realm="${realm}", nonce="${nonce}", uri="${uri}", qop=${qop}, nc=${nc}, cnonce="${cnonce}", response="${resp}", opaque="${opaque}"`;
      res=await fetch(base+'/api/digest/data', {headers:{Authorization:hdr}});
    } else if(auth==='oauth'){
      res=await fetch(base+'/api/oauth/info');
      const j=await res.json(); payload={...j, stocks:[{symbol:'AAPL',price:'0',change:'0'}], crypto:[{symbol:'BTC',price:'0'}], sensors:{temperature:'0',humidity:'0',cpu:'0',memory:'0'}, metrics:{requestsPerSec:0,latencyMs:'0',activeConnections:0}, timestamp:new Date().toISOString() };
      // override to show generic, then fallback to public payload for widgets
      const r2=await fetch(base+'/api/public/data'); const j2=await r2.json(); payload=j2.realtime||j2;
      res=r2;
    } else if(auth==='oauth1'){
      const ck='oauth1_consumer_key', cs='oauth1_consumer_secret_123', tk='oauth1_token_abc', ts='oauth1_token_secret_xyz';
      const nonce=Math.random().toString(36).slice(2,10), tsNow=Math.floor(Date.now()/1000).toString();
      const params={oauth_consumer_key:ck, oauth_token:tk, oauth_signature_method:'HMAC-SHA1', oauth_timestamp:tsNow, oauth_nonce:nonce, oauth_version:'1.0'};
      const url2=base+'/api/oauth1/data';
      const all=Object.keys(params).sort().map(k=>`${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`).join('&');
      const baseStr=`GET&${encodeURIComponent(url2)}&${encodeURIComponent(all)}`;
      const key=encodeURIComponent(cs)+'&'+encodeURIComponent(ts);
      const sig=await hmacSHA1Dashboard(key, baseStr);
      const hdr=`OAuth oauth_consumer_key="${ck}", oauth_token="${tk}", oauth_signature_method="HMAC-SHA1", oauth_timestamp="${tsNow}", oauth_nonce="${nonce}", oauth_version="1.0", oauth_signature="${encodeURIComponent(sig)}"`;
      res=await fetch(url2, {headers:{Authorization:hdr}});
    } else if(auth==='oauth1a'){
      const tok=await fetchOAuth1aToken();
      if(!tok) throw new Error('Failed to get OAuth1a token');
      res=await fetch(base+'/api/oauth1a/data', {headers:{Authorization:`OAuth oauth_token="${tok}"`}});
    } else if(auth==='bearer'){
      const tok=document.getElementById('bearerInput').value.trim();
      if(!tok){ // auto-fetch if empty
        try{ const r=await fetch(base+'/api/oauth2/token',{method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({grant_type:'password', username:'john', password:'john123', client_id:'client_app_123', client_secret:'client_secret_abc_123'})}); const j=await r.json(); if(j.access_token){ document.getElementById('bearerInput').value=j.access_token; headers['Authorization']='Bearer '+j.access_token; } }catch{}
        if(!headers['Authorization']) throw new Error('No Bearer token - double-click input to fetch');
      } else { headers['Authorization']='Bearer '+tok; }
      res=await fetch(base+'/api/oauth2/data', {headers});
    } else {
      res=await fetch(base+'/api/public/data');
    }
    if(!res) throw new Error('No response');
    if(!res.ok){ throw new Error('HTTP '+res.status+' '+await res.text().then(t=>t.slice(0,300))); }
    const j = await res.json();
    payload = j.realtime || j;
    // For oauth generic, ensure payload has required fields for widgets
    if(!payload.stocks && j.realtime) payload=j.realtime;
    if(!payload.stocks) throw new Error('No stocks in payload '+JSON.stringify(j).slice(0,300));
    tickCountVal++;
    dashHistory.push(payload); if(dashHistory.length>30) dashHistory.shift();
    const el=document.getElementById('tickCount'); if(el) el.textContent=tickCountVal;
    document.getElementById('lastTick').textContent=new Date(payload.timestamp).toLocaleTimeString();
    document.getElementById('logInfo').textContent=`polling ${url.replace(base,'')} via ${auth} • ${res.status}`;
    updateKPIs(payload);
    updateCharts(payload);
    addGridRow(payload);
    updateMap(payload);
    const log=document.getElementById('dashLog');
    if(log) log.textContent=`[${new Date().toLocaleTimeString()}] ${auth} ${res.status} → BTC $${payload.crypto[0].price} AAPL $${payload.stocks[0].price}\n` + log.textContent.slice(0,3000);
  }catch(e){
    const log2=document.getElementById('dashLog');
    if(log2) log2.textContent='Error ('+auth+'): '+e.message+'\n'+log2.textContent.slice(0,4000);
    console.error('tick error', e);
  }
}

// Init
tick();
setInterval(tick, 2000);

// Fetch token helper for bearer dashboard
document.getElementById('bearerInput').addEventListener('dblclick', async ()=>{
  try{
    const r=await fetch(base+'/api/oauth2/token',{method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({grant_type:'password', username:'john', password:'john123', client_id:'client_app_123', client_secret:'client_secret_abc_123'})});
    const j=await r.json();
    if(j.access_token){ document.getElementById('bearerInput').value=j.access_token; document.getElementById('dashLog').textContent='Bearer token fetched\n'+document.getElementById('dashLog').textContent; }
  }catch{}
});
