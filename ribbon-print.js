// Cache the glyph strokes rather than rebuilding them on each drag or camera turn.
let lastText, lastMask;
function glyphMask(text) {
 if(text===lastText) return lastMask;
 const canvas=document.createElement('canvas');
 const ctx=canvas.getContext('2d',{willReadFrequently:true});
 ctx.font='16px sans-serif';
 canvas.width=Math.ceil(ctx.measureText(text).width)+2;
 canvas.height=20;
 ctx.font='16px sans-serif';
 ctx.fillText(text,1,16);
 const {data}=ctx.getImageData(0,0,canvas.width,canvas.height);
 const strokes=[];
 for(let y=0;y<canvas.height;y++){
  let x=0;
  while(x<canvas.width){
   if(data[4*(y*canvas.width+x)+3]<105){x++;continue;}
   const left=x++;
   while(x<canvas.width && data[4*(y*canvas.width+x)+3]>=105)x++;
   strokes.push([left,x,y]);
  }
 }
 lastText=text;
 return lastMask={strokes,width:canvas.width,height:canvas.height};
}

// Points are sampled from the same ribbon surface and undergo its same model transforms.
export function printRibbon(text,surface,sheet,silk,across=false){
 if(!text)return;
 const {strokes,width,height}=glyphMask(text);
 const ink=silk[0]*.2126+silk[1]*.7152+silk[2]*.0722>.54?[.21,.18,.16]:[.91,.86,.76];
 for(const [left,right,row] of strokes){
  sheet(1,1,(u,v)=>{
   const x=(left+(right-left)*u)/width,y=(row+v)/height;
   const p=across?surface(.5+(x-.5)*.38,.18+(1-y)*.60):surface(.2+.55*y,.14+.72*x);
   if(across){const len=Math.hypot(p[0],p[2])||1;p[0]+=.002*p[0]/len;p[2]+=.002*p[2]/len;}
   else p[2]+=.002;
   return p;
  },()=>ink);
 }
}
