import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const source=readFileSync(new URL('../public/analysis-worker.js',import.meta.url),'utf8');
function analyze(bpm,{gain=.5,rightOnly=false,bed=0,sampleRate=44100}={}){
 const l=new Float32Array(sampleRate*20),r=new Float32Array(l.length);
 for(let i=0;i<l.length;i++){
  const t=i/sampleRate,phase=t%(60/bpm),pulse=phase<.04?gain*Math.exp(-phase*90)*Math.sin(2*Math.PI*90*t):0;
  r[i]=pulse+bed*Math.sin(2*Math.PI*220*t);l[i]=rightOnly?0:r[i];
 }
 let result;const self={postMessage:value=>result=value};runInNewContext(source,{self});self.onmessage({data:{l,r,sampleRate}});return result;
}
for(const [bpm,options] of [[120,{}],[128,{bed:.15}],[174,{}],[65,{}],[97,{gain:.001}],[123.4,{rightOnly:true,sampleRate:48000}]]){
 const result=analyze(bpm,options);assert(Math.abs(result.bpm-bpm)<1,`${bpm} BPM detected as ${result.bpm}`);assert(result.transients.length>10);console.log(`${bpm} BPM → ${result.bpm}`);
}
assert.equal(analyze(120,{gain:0}).bpm,undefined);
console.log('PASS: tempo detection, sustained backing, fast/slow beats, quiet audio, right channel, silence.');
