self.onmessage=({data:{l,r,sampleRate}})=>{
 const peaks=[],step=Math.max(1,Math.ceil(l.length/12000));
 for(let i=0;i<l.length;i+=step){let p=0;for(let j=i;j<Math.min(i+step,l.length);j++)p=Math.max(p,Math.abs(l[j]),Math.abs(r[j]));peaks.push(p);}
 // Positive energy changes expose beats even with a sustained musical backing.
 const hop=Math.max(1,Math.round(sampleRate*.01)),frameSeconds=hop/sampleRate,energy=[],onsets=[];
 for(let i=0;i<l.length;i+=hop){let v=0;const end=Math.min(i+hop,l.length);for(let j=i;j<end;j++)v+=(l[j]*l[j]+r[j]*r[j])*.5;energy.push(Math.sqrt(v/(end-i)));}
 let maximum=0;
 for(let i=0;i<energy.length;i++){const rise=Math.max(0,energy[i]-(energy[i-1]??energy[i]));onsets.push(rise);maximum=Math.max(maximum,rise);}
 const transients=[];let last=-Infinity;
 for(let i=1;i<onsets.length-1;i++){
  let mean=0;const start=Math.max(0,i-20);for(let j=start;j<i;j++)mean+=onsets[j];mean/=i-start;
  if(onsets[i]>Math.max(maximum*.05,mean*1.5,1e-8)&&onsets[i]>=onsets[i-1]&&onsets[i]>=onsets[i+1]&&i*frameSeconds-last>.08){last=i*frameSeconds;transients.push(last);}
 }
 // Vote with several neighbouring beat intervals, retaining fractional BPM.
 // Prefer direct intervals over their octave alternatives to avoid halving fast tracks.
 const bins=new Map();
 for(let i=0;i<transients.length;i++)for(let j=i+1;j<Math.min(i+9,transients.length);j++){
  const interval=transients[j]-transients[i];
  for(let beats=1;beats<=j-i;beats++){
   const bpm=60*beats/interval;if(bpm<60||bpm>200)continue;
   const weight=1/(j-i)/beats,radius=bpm*.04;
   for(let key=Math.ceil(bpm-radius);key<=Math.floor(bpm+radius);key++){
    const vote=weight*(1-Math.abs(key-bpm)/radius);
    bins.set(key,(bins.get(key)||0)+vote);
   }
  }
 }
 const ranked=[...bins].sort((a,b)=>b[1]-a[1]);let bpm,confidence=0;
 if(transients.length>=4&&ranked.length){
  const candidate=ranked[0][0];let total=0,weight=0,matches=0;
  for(let i=1;i<transients.length;i++){
   const interval=transients[i]-transients[i-1],beats=Math.max(1,Math.round(interval*candidate/60)),estimate=60*beats/interval;
   if(Math.abs(estimate-candidate)<=candidate*.06){total+=interval;weight+=beats;matches++;}
  }
  confidence=matches/(transients.length-1);
  if(weight&&confidence>=.35)bpm=Math.round(60*weight/total*10)/10;
 }
 self.postMessage({peaks,transients,bpm,confidence});
};
