import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/opt/google/chrome/chrome',headless:true,args:['--no-sandbox','--autoplay-policy=no-user-gesture-required']});
try{
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 // Serve the production build through interception, without binding a local port.
 await page.route('http://localhost/**',async route=>{
  const path=new URL(route.request().url()).pathname;
  if(path==='/src/audio.ts')return route.fulfill({contentType:'text/javascript',body:ts.transpileModule(readFileSync('src/audio.ts','utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText});
  const file=path==='/'?'/index.html':path;
  await route.fulfill({body:readFileSync(`dist${file}`),contentType:file.endsWith('.html')?'text/html':file.endsWith('.wasm')?'application/wasm':file.endsWith('.css')?'text/css':'text/javascript'});
 });
 await page.goto('http://localhost/');
 await page.getByLabel('Compressor threshold',{exact:true}).fill('-24');
 await page.getByLabel('Compressor ratio',{exact:true}).fill('6');
 await page.getByLabel('Limiter ceiling',{exact:true}).fill('-6');
 assert.equal(await page.getByRole('button',{name:'Master compressor',exact:true}).getAttribute('aria-pressed'),'true');
 await page.getByRole('button',{name:'Master compressor',exact:true}).click();
 assert.equal(await page.getByRole('button',{name:'Master compressor',exact:true}).getAttribute('aria-pressed'),'false');
 const result=await page.evaluate(async()=>{
  const {Engine}=await import('/src/audio.ts'),engine=new Engine();engine.setDynamics({enabled:true,threshold:-24,ratio:6,ceiling:-6});await engine.activate();
  const c=engine.context,osc=c.createOscillator(),gain=c.createGain();gain.gain.value=4;osc.connect(gain).connect(engine.compressor);osc.start();
  await new Promise(r=>setTimeout(r,700));const data=new Float32Array(256);engine.output.getFloatTimeDomainData(data);const compressed=Math.max(...data.map(Math.abs)),reduction=engine.compressor.reduction;
  engine.setDynamics({...engine.dynamics,enabled:false});await new Promise(r=>setTimeout(r,700));engine.output.getFloatTimeDomainData(data);const limited=Math.max(...data.map(Math.abs));
  osc.stop();await c.close();return {compressed,limited,reduction,ratio:engine.compressor.ratio.value};
 });
 assert(result.reduction<-3,JSON.stringify(result));assert(result.compressed>0);assert(result.limited>.1&&result.limited<=Math.pow(10,-6/20)+.001,JSON.stringify(result));assert.equal(result.ratio,1);assert.deepEqual(errors,[]);
 console.log('PASS: production UI controls, compressor gain reduction, bypass, and limiter ceiling under overload.',result);
}finally{await browser.close()}
