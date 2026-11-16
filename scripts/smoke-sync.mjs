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
 const page=await browser.newPage(),errors=[];page.setDefaultTimeout(10000);page.on('pageerror',e=>errors.push(e.message));
 await page.goto(process.env.SMOKE_URL||'http://localhost:5173');
 const a=page.locator('.deck-0'),c=page.locator('.deck-1'),sync=i=>page.getByRole('button',{name:`Deck ${i} Sync`,exact:true}),master=i=>page.getByRole('button',{name:`Deck ${i} tempo master`,exact:true});
 const check=async(fn)=>{await page.waitForFunction(fn,null,{timeout:5000})};
 const speed=async(i,v)=>page.getByLabel(`Deck ${i} speed`,{exact:true}).fill(String(v));
 const bpm=async(deck,v)=>deck.getByLabel('BPM',{exact:true}).fill(String(v));
 assert(await sync('B').isDisabled());
 await page.locator('input[type=file]').setInputFiles([{name:'A.wav',mimeType:'audio/wav',buffer:b},{name:'B.wav',mimeType:'audio/wav',buffer:b}]);
 await page.getByRole('status').filter({hasText:'loaded on deck B'}).waitFor();
 await bpm(a,120);await bpm(c,100);await c.getByRole('button',{name:'Trigger cut loop',exact:true}).click();await sync('B').click();
 await check(()=>Math.abs(+document.querySelector('[aria-label="Deck B speed"]').value-1.2)<1e-8);
 await speed('A',.9);await check(()=>Math.abs(+document.querySelector('[aria-label="Deck B speed"]').value-1.08)<1e-8);
 await bpm(a,110);await check(()=>Math.abs(+document.querySelector('[aria-label="Deck B speed"]').value-.99)<1e-8);
 await c.getByRole('button',{name:'×2',exact:true}).click();await page.getByRole('status').filter({hasText:'outside 75–125%'}).waitFor();assert.equal(await sync('B').getAttribute('aria-pressed'),'false');assert(Math.abs(+await page.getByLabel('Deck B speed',{exact:true}).inputValue()-.99)<1e-8);
 await c.getByRole('button',{name:'½',exact:true}).click();await sync('B').click();await master('B').click();assert.equal(await sync('B').getAttribute('aria-pressed'),'false');assert.equal(await sync('A').getAttribute('aria-pressed'),'false');
 assert(Math.abs(+await page.getByLabel('Deck B speed',{exact:true}).inputValue()-.99)<1e-8);
 await sync('A').click();await speed('A',1);assert.equal(await sync('A').getAttribute('aria-pressed'),'false');
 await bpm(c,'');assert(await sync('A').isDisabled());assert.match(await sync('A').locator('..').getAttribute('title'),/valid BPM/);
 await bpm(c,100);await sync('A').click();await a.locator('button[title="Load audio"]').click();
 await page.locator('input[type=file]').setInputFiles({name:'Replacement.wav',mimeType:'audio/wav',buffer:b});await page.getByRole('status').filter({hasText:'loaded on deck A'}).waitFor();assert.equal(await sync('A').getAttribute('aria-pressed'),'false');assert.equal(await sync('B').getAttribute('aria-pressed'),'false');
 assert(await c.locator('.play').innerText().then(t=>t.includes('PAUSE')));assert.deepEqual(errors,[]);
 // Observe the existing worklet message path while changing speed during playback.
 await page.evaluate(async()=>{const {engine}=await import('/src/audio.ts');window.syncMessages=[];const send=engine.send.bind(engine);engine.send=(m,t)=>{window.syncMessages.push(m);send(m,t)}});
 await speed('B',1.1);assert(await page.evaluate(()=>window.syncMessages.some(m=>m.type==='speed'&&m.d===1&&m.value===1.1)));assert(await c.locator('.play').innerText().then(t=>t.includes('PAUSE')));
 console.log('PASS: tempo match, master speed/BPM changes, half/double, limit rejection, master switching, manual override, missing BPM, track replacement, live worklet speed messages.');
}finally{await browser.close()}
