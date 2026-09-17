/**
 * Realtime Data Generator
 * Provides simulated live metrics: stocks, crypto, sensors, etc.
 */

function randomBetween(min,max){ return Math.random()*(max-min)+min; }

function generateRealtimePayload(){
  const now = Date.now();
  return {
    timestamp: new Date().toISOString(),
    epoch: now,
    stocks: [
      { symbol:'AAPL', price: randomBetween(170,190).toFixed(2), change: randomBetween(-2,2).toFixed(2) },
      { symbol:'GOOGL', price: randomBetween(2700,2900).toFixed(2), change: randomBetween(-10,10).toFixed(2) },
      { symbol:'TSLA', price: randomBetween(200,260).toFixed(2), change: randomBetween(-5,5).toFixed(2) }
    ],
    crypto: [
      { symbol:'BTC', price: randomBetween(60000,70000).toFixed(2) },
      { symbol:'ETH', price: randomBetween(3000,4000).toFixed(2) }
    ],
    sensors: {
      temperature: randomBetween(20,30).toFixed(1),
      humidity: randomBetween(40,70).toFixed(1),
      cpu: randomBetween(10,95).toFixed(1),
      memory: randomBetween(30,90).toFixed(1)
    },
    metrics: {
      requestsPerSec: Math.floor(randomBetween(100,2000)),
      latencyMs: randomBetween(10,120).toFixed(1),
      activeConnections: Math.floor(randomBetween(5,500))
    },
    randomValue: Math.floor(Math.random()*10000)
  };
}

let interval = null;
const subscribers = new Set(); // functions to call on tick

function startRealtime(intervalMs=2000){
  if (interval) clearInterval(interval);
  interval = setInterval(()=>{
    const payload = generateRealtimePayload();
    subscribers.forEach(fn => {
      try{ fn(payload); }catch(e){ console.error('subscriber error', e); }
    });
  }, intervalMs);
  return interval;
}

function subscribe(fn){
  subscribers.add(fn);
  return ()=> subscribers.delete(fn);
}

function stopRealtime(){
  if (interval) clearInterval(interval);
  interval=null;
}

module.exports = { generateRealtimePayload, startRealtime, subscribe, stopRealtime, subscribers };
