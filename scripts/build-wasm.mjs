import {spawnSync} from 'node:child_process';
const exports=['buffer','reset','configure','channel','mixer','process'];
const em=spawnSync('emcc',['--version']);
const cmd=em.status===0?'emcc':'clang++';
const args=cmd==='emcc'?['dsp/mixer.cpp','-O3','--no-entry','-sSTANDALONE_WASM=1','-sALLOW_MEMORY_GROWTH=0',`-sEXPORTED_FUNCTIONS=${JSON.stringify(exports.map(x=>'_'+x))}`,'-o','public/dsp.wasm']:['--target=wasm32','-O3','-nostdlib','-Wl,--no-entry','-Wl,--export-all',...exports.map(x=>'-Wl,--export='+x),'dsp/mixer.cpp','-o','public/dsp.wasm'];
console.log('Building DSP with '+cmd);const r=spawnSync(cmd,args,{stdio:'inherit'});process.exit(r.status??1);
