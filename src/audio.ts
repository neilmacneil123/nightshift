export type Dynamics={enabled:boolean;threshold:number;ratio:number;ceiling:number};
export class Engine {
 compressor?:DynamicsCompressorNode; limiter?:DynamicsCompressorNode; guard?:WaveShaperNode; output?:AnalyserNode; dynamics:Dynamics={enabled:true,threshold:-18,ratio:3,ceiling:-1};
 setDynamics(settings:Dynamics){
  this.dynamics={...settings};const c=this.context;if(!c||!this.compressor||!this.limiter||!this.guard)return;
  this.compressor.threshold.setTargetAtTime(settings.threshold,c.currentTime,.02);
  this.compressor.ratio.setTargetAtTime(settings.enabled?settings.ratio:1,c.currentTime,.02);
  this.limiter.threshold.setTargetAtTime(settings.ceiling,c.currentTime,.02);
  const ceiling=Math.pow(10,settings.ceiling/20),curve=new Float32Array(65537);
  for(let i=0;i<curve.length;i++)curve[i]=Math.max(-ceiling,Math.min(ceiling,i/(curve.length-1)*2-1));
  this.guard.curve=curve;
 }
 context?:AudioContext; node?:AudioWorkletNode; buffers:AudioBuffer[]=[]; filter?:BiquadFilterNode; delay?:DelayNode; wet?:GainNode; reverb?:GainNode; pending?:Promise<void>; onstats=(s:Float64Array)=>{};
 async activate(){if(!this.pending)this.pending=this.init().catch(e=>{this.pending=undefined;throw e});await this.pending;await this.context!.resume();}
 async init(){this.context??=new AudioContext();const [module]=await Promise.all([fetch('/dsp.wasm').then(r=>{if(!r.ok)throw Error('DSP unavailable');return r.arrayBuffer()}).then(b=>WebAssembly.compile(b)),this.context.audioWorklet.addModule('/processor.js')]);this.node=new AudioWorkletNode(this.context,'nightshift-mixer',{numberOfInputs:0,numberOfOutputs:1,outputChannelCount:[2],processorOptions:{module}});this.node.port.onmessage=e=>this.onstats(e.data);const c=this.context;this.filter=c.createBiquadFilter();this.filter.frequency.value=20000;this.delay=c.createDelay(4);this.wet=c.createGain();this.wet.gain.value=0;const feedback=c.createGain();feedback.gain.value=.3;this.reverb=c.createGain();this.reverb.gain.value=0;const conv=c.createConvolver(),ir=c.createBuffer(2,c.sampleRate*2,c.sampleRate);for(let ch=0;ch<2;ch++){const a=ir.getChannelData(ch);for(let i=0;i<a.length;i++)a[i]=(Math.random()*2-1)*Math.pow(1-i/a.length,3);}conv.buffer=ir;const compressor=this.compressor=c.createDynamicsCompressor();compressor.knee.value=12;compressor.attack.value=.01;compressor.release.value=.2;const limit=this.limiter=c.createDynamicsCompressor();limit.knee.value=0;limit.ratio.value=20;limit.attack.value=0;limit.release.value=.08;const guard=this.guard=c.createWaveShaper();this.output=c.createAnalyser();this.output.fftSize=256;this.setDynamics(this.dynamics);this.node.connect(this.filter);this.filter.connect(compressor);this.filter.connect(this.delay);this.delay.connect(feedback).connect(this.delay);this.delay.connect(this.wet).connect(compressor);this.filter.connect(conv).connect(this.reverb).connect(compressor);compressor.connect(limit).connect(guard).connect(this.output).connect(c.destination);}
 send(message:object,transfer:Transferable[]=[]){this.node?.port.postMessage(message,transfer);}
 async decode(file:File){await this.activate();if(file.size>150*1024*1024)throw Error('Use files smaller than 150 MB.');return this.context!.decodeAudioData(await file.arrayBuffer());}
}
export const engine=new Engine();
