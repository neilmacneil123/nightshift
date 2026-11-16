// Focused browser smoke; run with Vite on localhost:5173.
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const n=48000*20,b=Buffer.alloc(44+n*2);
b.write('RIFF');b.writeUInt32LE(b.length-8,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(48000,24);b.writeUInt32LE(96000,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(n*2,40);
for(let i=0;i<n;i++){const phase=i%24000;b.writeInt16LE(Math.round(Math.sin(i*2*Math.PI*440/48000)*(phase<2400?20000:100)),44+i*2)}
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/opt/google/chrome/chrome',headless:true,args:['--no-sandbox','--autoplay-policy=no-user-gesture-required']});
try{
 const page=await browser.newPage({viewport:{width:1600,height:1200}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://localhost:5173');await page.locator('input[type=file]').setInputFiles({name:'Transient fixture.wav',mimeType:'audio/wav',buffer:b});await page.getByRole('status').filter({hasText:'loaded on deck A'}).waitFor();
 const deck=page.locator('.deck-0'),editor=deck.locator('.editor'),button=name=>editor.getByRole('button',{name,exact:true});
 const seek=async value=>{await page.evaluate(async value=>{const {engine}=await import('/src/audio.ts');engine.send({type:'seek',d:0,value});},value);await page.waitForTimeout(160)};
 const value=async which=>Number(await editor.getByLabel(`Cut ${which}`,{exact:true}).textContent());
 const position=()=>editor.locator('.editbar b').filter({hasText:/^Cut \d/}).textContent().then(s=>Number(s.split(' ')[1]));
 const visible=async()=>{const x=Number(await editor.getByTestId('editor-playhead').getAttribute('x1'));assert(x>=0&&x<=1000,`Playhead visible: ${x}`)};
 await seek(5);await button('Set end').click();await seek(2);await button('Set start').click();
 for(const which of ['start','end']){const before=await value(which);await editor.getByRole('button',{name:`Nudge ${which} forward`}).click();const next=await value(which);assert(next>before);await editor.getByRole('button',{name:`Nudge ${which} backward`}).click();assert(await value(which)<next);}
 // Confirm marker values come from the cached analysis, not a fixed nudge interval.
 const cached=await page.evaluate(()=>new Promise(resolve=>{const r=indexedDB.open('nightshift',1);r.onsuccess=()=>{const q=r.result.transaction('metadata').objectStore('metadata').get('library');q.onsuccess=()=>resolve(q.result[0].transients)}}));
 assert(cached.length>20);
 const a=await value('start'),z=await value('end');assert(cached.some(v=>Math.abs(v-a)<.001));assert(cached.some(v=>Math.abs(v-z)<.001));
 await editor.getByLabel('Zoom').fill('2');await button('Follow Off').click();await button('Trigger cut loop').click();await page.waitForTimeout(260);assert(await position()>=a&&await position()<z);await visible();
 await seek(12);await page.waitForTimeout(180);assert(await position()>=a&&await position()<z);await visible();
 await seek(z-.15);await page.waitForTimeout(400);assert(await position()<a+1);await visible();
 await editor.getByRole('button',{name:'Nudge start forward'}).click();await editor.getByRole('button',{name:'Nudge end backward'}).click();assert(await deck.locator('.play').textContent().then(s=>s.includes('PAUSE')));
 await button('Exit cut loop').click();const exit=await position();await page.waitForTimeout(450);assert(await position()>exit+.2);
 await seek(12);await visible();assert(Math.abs(Number(await editor.getByTestId('editor-playhead').getAttribute('x1'))-350)<100);
 await editor.getByLabel('Waveform scroll').fill('0');assert(await button('Follow Off').getAttribute('aria-pressed')==='false');await page.waitForTimeout(200);assert(Number(await editor.getByLabel('Waveform scroll').inputValue())===0);await button('Follow Off').click();await visible();assert(await editor.getByLabel('Zoom').inputValue()==='2');
 assert.deepEqual(errors,[]);console.log('PASS: analyzed/cached transients; both boundary nudges; cut activation and live edits; loop wraps; exit continues playback; Follow playback/seek/wrap, manual pan and zoom preservation.');
}finally{await browser.close()}
