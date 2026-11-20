import {colors as paletteColors} from './colors.js';
import {flowers as flowerCatalog,foliage,botanical,shades} from './botanicals.js?v=garden2';
// Bouquet coordinates are in florist's view: x right, y up, z toward the viewer.
const {sin,cos,PI,pow}=Math, TAU=PI*2;
const add=(a,b)=>a.map((v,i)=>v+b[i]);
const mul=(a,s)=>a.map(v=>v*s);
const sub=(a,b)=>add(a,mul(b,-1));
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const unit=a=>mul(a,1/(Math.hypot(...a)||1));
const mix=(a,b,t)=>add(mul(a,1-t),mul(b,t));
const rgb=h=>[16,8,0].map(k=>((h>>k)&255)/255);
export const options={
 direction:["左上","正上","右上","左侧","右侧","右前"],
 blooms:['白百合','烟粉玫瑰','紫郁金香','向日葵','浅蓝绣球'], sprigs:['雾蓝星花','银绿叶枝','红果枝','圆叶尤加利'],
 fold:['斜襟高背','双翼','环抱','扇形褶纸','低口花边','立体圆抱','半裸腰封'], ...Object.fromEntries(Object.entries(paletteColors).map(([key, rows]) => [key, rows.map(row => row[0])]))
};
// Stem ids 0–4 are used by previously shared gifts.
options.blooms.push(...flowerCatalog.map(f=>f[0]));
options.sprigs.push(...foliage);
export const bloomIds=[0,1,2,5,6,...flowerCatalog.map((_,i)=>9+i)],sprigIds=[3,4,7,8,...foliage.map((_,i)=>40+i)];
export const isBloom=id=>bloomIds.includes(id);
export const stemNames=Object.fromEntries([...bloomIds.map((id,i)=>[id,options.blooms[i]]),...sprigIds.map((id,i)=>[id,options.sprigs[i]])]);
export const initial={blooms:[0],sprigs:[0,1],fold:0,paper:3,ribbon:3,card:0,background:0,direction:0,lamp:0};
// Slot numbers stay with their stems when a different stem is removed.
export function stemsFor(s){
 if(s.stems)return s.stems;
 const stems=[];
 const n=s.blooms.length>1?Math.max(6,s.blooms.length):s.blooms[0]===0?2:5;
 for(let i=0;i<n;i++)stems.push([bloomIds[s.blooms[i%s.blooms.length]],i]);
 for(let i=0;i<8;i++){
  if(i%2===0&&s.sprigs.includes(0))stems.push([3,i]);
  else if(s.sprigs.includes(1))stems.push([4,i]);
 }
 if(s.sprigs.includes(1))for(let i=8;i<12;i++)stems.push([4,i]);
 for(const idx of s.sprigs.filter(i=>i>=2)){
  for(let j=0;j<3;j++)stems.push([sprigIds[idx],12+3*(idx-2)+j]);
 }
 return stems;
}
export function bouquet(s,framing){
 const stems=stemsFor(s),flowers=stems.filter(([k])=>isBloom(k)),fillers=stems.filter(([k])=>!isBloom(k));
 const roundRoses=flowers.length>=24&&flowers.every(([kind])=>kind===1);
 const dense=stems.length>27;

 const points=[],colors=[],indices=[],anchors=[];
 const ranges=[];let owner=null;
 const original=new Set(stemsFor({...s,stems:null}).map(([k,i])=>k+'-'+i));
 function place(kind,slot,base,radius){
  const key=kind+'-'+slot;owner=key;
  const clearance=p=>anchors.reduce((gap,a)=>Math.min(gap,Math.hypot(...sub(a.base,p))/(a.radius+radius)),Infinity);
  let best=base;
  if(!roundRoses&&!original.has(key)&&clearance(base)<1){
   for(let n=1;n<=96;n++){
    const angle=n*2.39996,spread=.15*Math.sqrt(n);
    const trial=add(base,[spread*cos(angle),.45*spread*sin(angle*1.7),spread*sin(angle)]);
    if(clearance(trial)>clearance(best))best=trial;
    if(clearance(best)>=1)break;
   }
  }
  const p=add(best,s.moves?.[key]||[0,0,0]);
  anchors.push({key,p,base:best,radius});
  return p;
 }
 function sheet(m,n,point,color){
  if(!ranges.length||ranges[ranges.length-1].key!==owner)ranges.push({start:indices.length,key:owner});
  let start=points.length/3;
  for(let j=0;j<=n;j++)for(let i=0;i<=m;i++){
   let u=i/m,v=j/n; points.push(...point(u,v));colors.push(...color(u,v));
   if(i&&j){let d=start+j*(m+1)+i,a=d-m-2;indices.push(a,a+1,d,a,d,d-1);}
  }
 }
 function stem(a,b,r,color=0x54694c){
  const ax=unit(sub(b,a)),w=unit(cross(ax,Math.abs(ax[1])>.9?[1,0,0]:[0,1,0])),h=cross(ax,w);
  sheet(5,1,(u,v)=>add(mix(a,b,v),add(mul(w,r*cos(TAU*u)),mul(h,r*sin(TAU*u)))),()=>rgb(color));
 }
 function bead(p,size,color){
  sheet(dense?5:8,dense?3:5,(u,v)=>add(p,[size[0]*cos(TAU*u)*sin(PI*v),size[1]*cos(PI*v),size[2]*sin(TAU*u)*sin(PI*v)]),()=>rgb(color));
 }
 function bloom(p,size,direction,kind,phase,openness=1){
  const z=unit(direction),x=unit(cross([0,1,0],z)),y=cross(z,x);
  const P=(a,b,c)=>add(p,mul(add(add(mul(x,a),mul(y,b)),mul(z,c)),size));
  const variant=shades[s.tones?.[kind]];
  const selected=variant?rgb(parseInt(variant,16)):null;
  const petalColor=(base,v)=>selected?mul(selected,.57+.43*v):base;
  if(kind>=9){
   const [,form,hex]=flowerCatalog[kind-9];
   botanical(form,{P,sheet,stem,bead,tint:selected||rgb(parseInt(hex,16)),phase,dense,purpleEdge:s.tones?.[kind]==='白底紫边'});
   return;
  }
  const lily=kind===0,rose=kind===1,star=kind===3;
  if(kind===5){
   const petals=dense?13:22;
   for(let k=0;k<petals;k++){
    const a=phase+k*TAU/petals+(k%2)*.055,reach=.78+.12*cos(k*2.4);
    sheet(4,6,(u,v)=>{
     const w=(2*u-1)*.14*pow(sin(PI*v),.7),r=.22+reach*v;
     return P(r*cos(a)-w*sin(a),r*sin(a)+w*cos(a),.06+.18*sin(PI*v)-.12*v*v+.07*(k%2)*v);
    },(u,v)=>petalColor(mix(rgb(0xbc701f),rgb(0xffdb68),.25+.72*v),v));
   }
   sheet(18,5,(u,v)=>P(.32*v*cos(TAU*u),.32*v*sin(TAU*u),.09+.13*(1-v*v)),
    (u,v)=>mix(rgb(0x4f3123),rgb(0x986134),.2+.5*v+.18*cos(TAU*u*13)));
   return;
  }
  if(kind===6){
   const n=dense?12:19;
   for(let j=0;j<n;j++){
    const a=phase+j*2.39996,r=.67*Math.sqrt((j+.4)/n),h=.48*(1-r*r/.50);
    for(let k=0;k<4;k++){
     const dir=a+k*PI/2;
     sheet(3,4,(u,v)=>{
      const w=(2*u-1)*.135*sin(PI*v*.86),l=.22*v;
      return P(r*cos(a)+l*cos(dir)-w*sin(dir),r*sin(a)+l*sin(dir)+w*cos(dir),h+.10*v+.05*sin(PI*v));
     },(u,v)=>petalColor(mix(rgb(j%3?0x858ebc:0x9185ad),rgb(0xd6e4f6),.19+.72*v),v));
    }
   }
   return;
  }
  let count=lily?6:rose?(roundRoses?19:dense?13:21):star?5:6;
  for(let k=0;k<count;k++){
   const layer=rose?1-k/count:1;
   const angle=phase+(rose?k*2.39996:k*TAU/count)+(lily?.075*sin(k*2.4+phase):0);
   const fill=lily?0xfff5e9:rose?0xe5b5ad:star?0x9abdd4:0xcab4ce;
   sheet(roundRoses&&rose?8:dense?5:lily?18:rose?12:7,dense?4:lily?24:12,(u,v)=>{
    const t=u*2-1;
    let rad,width,depth;
    if(rose){
     if(roundRoses){
      // Petals start together at the calyx and wrap up around the spiral heart.
      const reach=.085+.65*layer, shoulder=sin(v*PI*.57);
      const az=angle+t*(.94+.17*(1-layer))+.63*v*(1-layer);
      const radius=.035+reach*(.72*shoulder+.28*v*v*v)*(1-.19*t*t)+.038*t*v+.024*v*v*cos(2.8*t+.65*k);
      const height=-.51+.17*(1-layer)+v*(.64+.25*(1-layer))
       -.28*t*t*v+.032*sin(3*t+phase+k)*v*v+.09*sin(PI*v);
      return P(radius*cos(az),radius*sin(az),height);
     }
     const rim=.09+.56*layer,flare=v*v*(.12+.15*layer);
     const radius=(roundRoses?.045*v*v*cos(5*t+phase+k):0)+rim*(.46+.54*v)+flare*(1-t*t)+.038*t*v;
     const azimuth=angle+t*(1.03+.19*(1-layer))+.40*v*(1-layer);
     const lip=(roundRoses?.045*v*v*sin(4*t+k):0)+v*(.33+.18*(1-layer)-.14*t*t+.045*t);
     return P(radius*cos(azimuth),radius*sin(azimuth),-.15+.20*(1-layer)+lip);
    } else if(kind===2){
     const radius=(.075+.36*sin(PI*v*.83))*(1+.085*cos(phase))+(k%2)*.029;
     const azimuth=angle+t*(.68+.08*sin(PI*v))+.075*v;
     depth=-.21+v*(.91+.055*cos(k+phase))-.17*t*t*pow(v,2);
     return P(radius*cos(azimuth),radius*sin(azimuth),depth);
    }else if(lily){
     const arc=sin(PI*v),opening=.56+.08*cos(k*1.83+phase);
     rad=.025+openness*(.87+.08*cos(k+phase))*pow(v,1.22);
     width=(k%2?.18:.245)*pow(arc,.83)*(1+.20*v);
     depth=opening/openness*(1-pow(1-v,1.85))-.045*v*v+arc*(.073*t*t+.024*t*sin(k+phase));
     width*=1+.015*sin(v*11+k)*v;
    }else{
     rad=.035+v*(star?.8:1)*(1+.05*cos(k*3));width=(star?.32:.295)*pow(sin(PI*v),.69);
     depth=.02+.33*sin(PI*v*.85)-.17*pow(v,3)+.15*t*t*sin(PI*v)+.044*sin(t*5+k)*v*v;
    }
    return P(rad*cos(angle)-width*t*sin(angle),rad*sin(angle)+width*t*cos(angle),depth);
   },(u,v)=>{
    if(selected)return petalColor(null,v);
    if(roundRoses&&rose)return mix(rgb(0xb47780),rgb(0xffdbd0),.22+.73*v+.045*cos(phase+k));
    if(lily){
     const t=Math.abs(u*2-1),rib=pow(Math.max(0,cos(t*PI*5+.7*v)),5);
     return mul(mix(rgb(0xafbd88),rgb(0xfffef5),1-pow(1-v,3)*(.80-.42*t)),1-.037*rib*sin(PI*v));
    }
    return mix(rgb(rose?0x865e66:star?0x557e9a:0x756480),rgb(fill),Math.min(1,.23+.71*v+.08*Math.abs(2*u-1)+.025*cos(k*3)));
   });
  }
  if(roundRoses&&rose){
   // The receptacle belongs to each individual head and joins its petals to its stem.
   sheet(10,4,(u,v)=>{
    const a=TAU*u, radius=.045+.32*sin(v*PI*.55);
    return P(radius*cos(a),radius*sin(a),-.53+.37*v+.09*v*v*cos(5*a+phase));
   },(u,v)=>mix(rgb(0x465740),rgb(0x948575),.52*v));
  }
  if(lily||star){
   bead(P(0,0,.17),mul([.09,.09,.08],size),star?0xe7c998:0xb9b481);
   if(lily)for(let k=0;k<6;k++){
    const a=k*TAU/6+phase,b=P(.19*cos(a),.19*sin(a),.46+.04*sin(k));
    stem(P(0,0,.08),b,.012*size,0xbcb889);bead(b,mul([.052,.028,.034],size),0xb18c55);
   }
  }
 }
 const extent=s.stems?Math.max(0,(Math.sqrt(Math.max(0,flowers.length-1))-2)*.55):0;
 const tie=[0,roundRoses?1-.63*.49*Math.sqrt(flowers.length):-1.30-extent*.94,0];
 const bareBand=s.fold===6;
 const stemCount=stems.length;
 const bandRadius=.047*Math.sqrt(stemCount)+.036;
 const bandHeight=.14+.005*Math.min(stemCount,20);
 const bindingPoint=index=>{
  const angle=index*2.399963, radius=(bandRadius-.03)*Math.sqrt((index+.5)/stemCount);
  return [radius*cos(angle),tie[1],radius*sin(angle)];
 };
 const lilyStudy=s.blooms.length===1&&s.blooms[0]===0;
 const single=s.blooms.length===1?s.blooms[0]:-1;
 const roseHeads=[[-.42,.57,.47,.77],[.42,.87,.33,.81],[-.27,1.39,.04,.65],[.54,1.67,-.12,.52],[.12,.13,.67,.70]];
 const tulipHeads=[[-.66,.92,.30,.77],[.46,1.15,.31,.82],[-.23,1.65,-.03,.76],[.20,.58,.52,.73],[.73,1.66,-.28,.63]];
 const heads=single===1?roseHeads:single===2?tulipHeads:lilyStudy?[[-.28,.44,.47,.97],[.40,1.17,.29,.88]]:[[-.35,.36,.83,.94],[.52,1.02,.30,.82],[-.54,1.48,-.12,.73],[.78,.53,-.49,.60],[-.88,.68,-.38,.60],[.12,1.43,-.60,.60]];
 // Place equal-sized heads across the area of a shallow spherical cap.
 const crownRadius=.49*Math.sqrt(flowers.length);
 const crownPoint=(x,y,depth)=>[x,1+depth,-y];
 const crownHeight=f=>crownRadius*(.28-.38*f)-.10;
 const crownNormal=[];
 const layout=flowers.map(([kind,i],index)=>{
  if(roundRoses){
   // Compress the outer spiral to keep neighbouring petals in contact on the slope.
   const fraction=(index+.5)/flowers.length;
   const angle=index*2.399963+.18;
   const radius=crownRadius*Math.sqrt(fraction)*(1.08-.08*fraction);
   const x=radius*cos(angle),y=radius*sin(angle);
   const height=crownHeight((radius/crownRadius)**2);
   crownNormal.push(unit([.76*x/crownRadius,1,-.76*y/crownRadius]));
   return [...crownPoint(x,y,height+.045*sin(i*2.1)),1.02+.052*cos(i*3),kind,i];
  }
  if(index<heads.length)return [...heads[index],kind,i];
  const j=index-heads.length,angle=j*2.39996+.72,radius=Math.sqrt(j+2)*.42;
  return [radius*cos(angle),1.15-.48*radius*sin(angle),.78*radius*sin(angle),kind===0?.79:.83,kind,i];
 });
 const flowerHeads=[];
 layout.forEach(([x,y,z,r,kind,i],index)=>{
  // Gardenias open into broad heads even in the smaller rear slots.
  if(kind===18){r=.94+.035*cos(i*2.4);layout[index][3]=r;}
  const p=place(kind,i,[x,y,z],r*(kind===2?.42:kind===18?.64:kind===14?.42:.76));
  [x,y,z]=p;layout[index].splice(0,3,...p);
  const facing=roundRoses?crownNormal[index]:index>=heads.length?[x*.16+.08,.58-.07*z,.96+.06*z]:kind===2?[x*1.12+.15*sin(i),.85,.46+.30*cos(i)]:lilyStudy?(i===0?[-.29,.31,1]:[.45,.62,.84]):[x*.48,.26+i%3*.24,i<3?1:z+.30];
  const start=bareBand?bindingPoint(index):tie;
  if(bareBand)stem([start[0]*1.9,tie[1]-.85-.07*cos(i),start[2]*1.9],start,.026);
  if(kind===2){
   let previous=start;
   for(let j=1;j<=8;j++){
    const t=j/8,next=mix(start,p,t);
    next[0]-=.28*x*sin(PI*t);next[2]-=.11*sin(PI*t);
    stem(previous,next,.026,0x687e53);previous=next;
   }
  }else if(roundRoses&&!bareBand){
   const anchor=[x*.29,tie[1],z*.29];
   stem(anchor,p,.042);
  }else stem(start,p,.025);
  const petalStart=points.length;
  bloom(p,r,facing,kind,.75+i*1.92,lilyStudy&&i===1?.76:1);
  const center=add(p,mul(unit(facing),r*(kind===2?.24:roundRoses?-.08:.18)));
  let radius=0;
  for(let v=petalStart;v<points.length;v+=3){
   radius=Math.max(radius,Math.hypot(points[v]-center[0],points[v+1]-center[1],points[v+2]-center[2]));
  }
  flowerHeads.push({center,radius});

 });
 function leaf(a,b,w,shade){
  const side=unit(cross(sub(b,a),[.16,.2,1]));
  sheet(4,6,(u,v)=>add(mix(a,b,v),add(mul(side,(2*u-1)*w*sin(PI*v)),[0,0,.07*sin(PI*v)*(1-Math.abs(2*u-1))])),(u,v)=>mix(rgb(shade),rgb(0xa5b49a),.13*v+.13*u));
 }
 {
  for(const [x,y,z,,kind,slot] of layout.filter(h=>h[4]===1&&!roundRoses)){
   owner=kind+'-'+slot;
   const base=[x*.72,y-.42,z-.06];
   for(const sign of [-1,1])leaf(base,add(base,[sign*.36,.23,.08]),.105,0x475943);
  }
 }
 {
  for(const [x,y,z,,kind,slot] of layout.filter(h=>h[4]===2)){
   owner=kind+'-'+slot;
   const base=[x*.25,-.59,z*.28],tip=[x*1.32,y+.17,z-.13];
   const sign=x>0?1:-1;
   sheet(8,18,(u,v)=>{
    const t=2*u-1,arc=sin(PI*v),p=mix(base,tip,v);
    return add(p,[t*.19*pow(arc,.78)+sign*.29*v*v,.24*arc-.24*v*v,.17*arc*(1-t*t)+.20*v*v]);
   },(u,v)=>mix(rgb(0x455d46),rgb(0x95a489),.22+.30*v+.12*cos(PI*u)));

  }
 }
 // Test the entire spray, including space for each small blossom at its tip.
 function clearSegment(a,b,padding){
  const dx=b[0]-a[0],dy=b[1]-a[1],dz=b[2]-a[2],length=dx*dx+dy*dy+dz*dz;
  for(const {center,radius} of flowerHeads){
   const x=center[0]-a[0],y=center[1]-a[1],z=center[2]-a[2];
   const t=length?Math.max(0,Math.min(1,(dx*x+dy*y+dz*z)/length)):0;
   if((x-t*dx)**2+(y-t*dy)**2+(z-t*dz)**2<(radius+padding)**2)return false;
  }
  return true;
 }
 function routeSpray(end,k,kind){
  let base=tie;
  while(!clearSegment(base,base,.028))base=add(base,[0,-.2,0]);
  const twigs=Array.from({length:5},(_,j)=>[(j%2?1:-1)*(.18+.08*sin(k)),.20+.06*cos(j),.11*cos(k+j)]);
  const angle=Math.atan2(end[2],end[0]),sweep=[-PI/2-angle,0,.55,-.55,1.2,-1.2,2.2,-2.2,PI];
  for(let ring=0;ring<65;ring++)for(const turn of ring?sweep:[0]){
   const step=ring*.15,tip=add(end,[cos(angle+turn)*step,0,sin(angle+turn)*step]);
   for(const bend of [0,.12,.24]){
    const elbow=mix(base,tip,.64);
    elbow[0]+=-.08+bend*cos(angle+turn);elbow[2]+=bend*sin(angle+turn);
    if(!clearSegment(base,elbow,.027)||!clearSegment(elbow,tip,.024))continue;
    const branches=twigs.map((delta,j)=>{
     const anchor=mix(elbow,tip,.15+j*.19);
     return [anchor,add(anchor,delta)];
    });
    if(branches.every(([a,b])=>clearSegment(a,b,kind===3?.02:.11)&&clearSegment(b,b,kind===3?.16:.1)))return {base,elbow,tip,branches};
   }
  }
  // A crowded or manually lowered flower can block the normal fan at the binding.
  // Leave the binding below the lowest head and turn upward outside the crown.
  const outside=Math.max(...flowerHeads.map(h=>Math.hypot(h.center[0],h.center[2])+h.radius))+.65;
  const floor=Math.min(base[1],...flowerHeads.map(h=>h.center[1]-h.radius-.35));
  const elbow=[outside*cos(angle),floor,outside*sin(angle)];
  const tip=[elbow[0],Math.max(end[1],floor+1),elbow[2]];
  return {base:[0,floor,0],elbow,tip,branches:twigs.map((d,j)=>{
   const anchor=mix(elbow,tip,.15+j*.19);return [anchor,add(anchor,d)];
  })};
 }
 for(const [kind,k] of fillers){
  if(kind===4&&k>=8&&k<12)continue;
  const a=k*2.39996+.45,x=cos(a),z=sin(a);
  const radius=k<8||kind>=40?1:1+.16*Math.sqrt(k-7);
  const baseEnd=roundRoses?crownPoint(x*crownRadius*.92,z*crownRadius*.92,crownHeight(.85)-.13):[x*(.82+.18*(k%3))*radius,1.58+.63*(k%3)/2,z*(k<8?.38:radius)+.08];

  const end=place(kind,k,baseEnd,.23);
  const route=routeSpray(end,k,kind);
  if(kind>=40){
   const {base,elbow,tip}=route;
   stem(base,elbow,.016);stem(elbow,tip,.011);
   let previous=tip;
   for(let j=0;j<12;j++){
    const t=(j+1)/12,a=k*1.7+j*2.4,side=j%2?1:-1;
    const point=kind===42?add(tip,[.35*t,-.90*t,.18*t]):mix(elbow,tip,t);
    if(kind===42){stem(previous,point,.009);previous=point;}
    const spread=sin(PI*t)*.22+.05;
    if(kind===40||kind===44){
     for(const sign of [-1,1]){
      const end=add(point,[sign*spread,.11,.04]);
      leaf(point,end,kind===40?.033:.069,kind===40?0x476943:0xb6bcb0);
      if(kind===44)leaf(point,add(end,[-sign*.05,.07,.04]),.04,0xabb2a9);
     }
    }else if(kind===41||kind===42){
     const end=add(point,[side*(kind===42?.17:.25),kind===42?-.09:.12,.06]);
     leaf(point,end,kind===42?.105:.048,kind===42?0x476b4b:0x77856a);
     if(kind===42)leaf(point,add(end,[-side*.14,.05,0]),.07,0x476b4b);
    }else if(kind===43){
     const b=add(point,[side*.13,.11,.05]);stem(point,b,.006,0x89785e);
     for(let n=0;n<4;n++)bead(add(b,[.035*cos(n*1.57),.035*sin(n*1.57),0]),[.033,.032,.024],0xf6f1de);
    }else{
     const count=kind===45?7:2;
     for(let n=0;n<count;n++){const az=a+n*2.4;
      const end=add(point,[spread*cos(az),.17+.06*cos(j),spread*sin(az)]);
      if(kind===45)leaf(point,end,.023,0xd8c4a0);
      else{stem(point,end,.004,0xb8ab79);bead(end,[.024,.068,.025],0xc7b98e);}
     }
    }
   }
   continue;
  }
  stem(route.base,route.elbow,.021);stem(route.elbow,route.tip,.014);
  for(const [j,[anchor,tip]] of route.branches.entries()){
   if(kind===3){
    stem(anchor,tip,.009);bloom(tip,.12+.025*sin(k+j),[.45*cos(k),.4,.7*sin(k)+.3],3,j);
   }else if(kind===7){
    stem(anchor,tip,.008);bead(tip,[.067,.075,.067],j%2?0x9b3544:0xb24a50);
   }else if(kind===8){
    leaf(anchor,tip,.115,0x759389);
   }else leaf(anchor,tip,.063+(j%2)*.018,k%2?0x637b6e:0x425e53);
  }
 }
 if(lilyStudy&&flowers.some(([k])=>k===0)){
  // Lance-shaped leaves grow directly from the lily stems.
  for(const [a,b,w] of [
   [[-.12,-.36,.19],[-.83,.39,.51],.10],
   [[.13,-.43,.10],[.61,.38,.49],.09],
   [[.24,.23,.18],[.86,.83,.34],.08]
  ]){
   const lily=anchors.filter(a=>a.key.startsWith('0-')).sort((x,y)=>Math.abs(x.base[0]-b[0])-Math.abs(y.base[0]-b[0]))[0];
   owner=lily.key;const delta=sub(lily.p,lily.base);leaf(add(a,mul(delta,.42)),add(b,delta),w,0x475d40);
  }
  // Flowers lower on a stock spike have opened; small buds gather at its tip.
  for(const [index,raw] of [[-.58,2.02,-.08],[.13,1.73,-.50]].entries()){
   owner='stock-'+index;
   const [x,y,z]=add(raw,s.moves?.[owner]||[0,0,0]);
   const tip=[x,y,z],base=[x*.62,.78,z];stem(tie,base,.022);stem(base,tip,.019);
   for(let j=0;j<14;j++){
    const t=(j+.5)/14,a=j*2.4,xz=.14*(1-.6*t);
    const anchor=mix(base,tip,t),p=add(anchor,[cos(a)*xz,.04,sin(a)*xz]);
    stem(anchor,p,.011);
    if(j>10)bead(p,[.042,.065,.04],0xb4bea1);
    else{
     const size=.118*(1-.34*t);
     for(let n=0;n<4;n++){
      const ang=a+n*PI/2;
      sheet(5,6,(u,v)=>{const w=(u-.5)*size*1.42*sin(PI*v*.93),r=size*v;
       return add(p,[r*cos(ang)-w*sin(ang),r*sin(ang)+w*cos(ang),size*(.62*sin(PI*v)+.35*v)]);},(u,v)=>mix(rgb(0xc5c8ac),rgb(0xf8f6e8),.21+.76*v));
     }
    }
   }
  }
 }
 {
  const fernTips=[[-1.04,1.29,.38],[.96,.81,.41],[-.85,.34,.83],[.67,1.50,-.34]];
  for(const [kind,slot] of fillers){
   if(kind!==4||slot<8||slot>=12)continue;
   const rawTip=roundRoses?crownPoint(crownRadius*cos(slot*2.4),crownRadius*sin(slot*2.4),crownHeight(1)-.24):fernTips[slot-8];
   const [x,y,z]=place(kind,slot,rawTip,.22);
   const b=mix(tie,[x,y,z],.55),top=[x,y,z];stem(b,top,.012);stem(tie,b,.018);
   for(let j=1;j<=9;j++)for(const sign of [-1,1]){
    const v=j/11,anchor=mix(b,top,v),l=.26*sin(PI*v)+.06;
    leaf(anchor,add(anchor,[sign*l,.16,.055*cos(j)]),.038,0x425a3d);
   }
  }
 }
 owner=null;
 // At the lip the stems have already converged. Follow the bulk of the
 // unmoved stems so one leaning flower cannot open the whole wrapper.
 const reaches=anchors.slice(0,flowers.length).map(a=>Math.hypot(a.base[0],a.base[2])).sort((a,b)=>a-b);
 const cutoff=reaches[Math.floor((reaches.length-1)*.8)];
 const shoulder=reaches.reduce((sum,r)=>sum+Math.min(r,cutoff),0)/reaches.length;
 const bundle=Math.sqrt(flowers.length+.35*fillers.length);
 const waist=.55+.215*bundle;
 const spreadScale=.37+.40*shoulder+.055*bundle;
 const wrapStart=indices.length;
 const papers=paletteColors.paper[s.paper][2];
 // Each sheet opens from the binding, with creases fanning out from the waist.
 const standRadius=crownRadius*.32;
 const wings=[[-1.97,1.49,1.27],[2.04,1.54,1.07],[PI,2.70,1.55],[.10,1.68,-.23]];
 let tagSurface;
 if(bareBand){
  const band=(u,v)=>{
   const a=u*TAU;
   return [bandRadius*sin(a),tie[1]+(v-.5)*bandHeight,bandRadius*cos(a)];
  };
  sheet(48,2,band,()=>rgb(papers[0]));
  tagSurface=(u,v)=>[(u-.5)*2,tie[1]+(v-.85)*1.7,bandRadius+.035];
  fillers.forEach((_,i)=>{
   const p=bindingPoint(flowers.length+i);
   stem([p[0]*1.8,p[1]-.80,p[2]*1.8],p,.017);
   stem(p,tie,.017);
  });
 }else if(s.fold===5){
  const baseRadius=roundRoses?standRadius:.21*waist;
  const lipRadius=roundRoses?crownRadius+.27:1.41*spreadScale;
  const lipY=roundRoses?1+crownHeight(1)-.16:.11;
  for(let k=0;k<4;k++){
   const surface=(u,v)=>{
    const angle=k*PI/2+u*1.86+.58*v;
    const crease=sin(PI*u)**2;
    const radius=baseRadius+(lipRadius-baseRadius)*v+
     lipRadius*(.035*u-.095*crease*sin(PI*v));
    return [radius*sin(angle),tie[1]+(lipY-tie[1])*v+.055*v*sin(PI*u),radius*cos(angle)];
   };
   sheet(32,18,surface,(u,v)=>mul(rgb(papers[0]),.88+.13*u+.08*v));
   if(k===0)tagSurface=surface;
  }
 }else if(roundRoses){
  // Low overlapping paper sheets follow the level underside of the flower dome.
  const panels=[9,11,8,15,12][s.fold];
  for(let k=0;k<panels;k++){
   const surface=(u,v)=>{
    const t=2*u-1,a=TAU*k/panels+t*PI/panels*1.24;
    const fold=.5+.5*cos(PI*(t+.16*sin(k)));
    const edge=crownRadius*(1.08+.105*fold)+.32;
    const r=standRadius+(edge-standRadius)*sin(v*PI*.47);
    const top=(s.fold===4?-.18:0)+1+crownHeight(1)-.23+.26*cos(PI*t+.65*k);
    return [r*cos(a),tie[1]+(top-tie[1])*v,-r*sin(a)];
   };
   sheet(16,10,surface,(u,v)=>mul(rgb(papers[k%4===2?1:0]),.83+.10*u+.05*v));
   // A short underfold follows each sheet, low enough to frame the outer roses.
   sheet(14,6,(u,v)=>{
    const a=TAU*(k+.22)/panels+(2*u-1)*PI/panels*1.42;
    const wave=sin(PI*u),corner=Math.abs(2*u-1),r=crownRadius+.05+v*(.38+crownRadius*(.08+.15*corner+.035*sin(k)));
    return [r*cos(a),1+crownHeight(1)-.31+.27*wave+.26*sin(PI*v)-.30*v*v+.28*(u-.5)*v,-r*sin(a)];
   },(u,v)=>mul(rgb(papers[k%3===0?1:0]),.70+.22*u+.13*v));
   if(k===Math.floor(panels*.38))tagSurface=surface;
  }
 }else wings.forEach(([center,span,height],k)=>{
  if(s.fold===1)height+=k<2?.37:-.22;
  if(s.fold===2){span*=1.19;height=k===2?.99:k===3?-.22:.88;}
  if(s.fold===3){span*=1.12;height+=k<2?.23:-.11;}
  if(s.fold===4){span*=1.20;height=k===3?-.32:.49;}
  const base=rgb(papers[k===2?2:k===1?1:0]);
  const surface=(u,v)=>{
   const a=center+(u-.5)*span*1.72;
   const pleat=Math.abs(((u*(s.fold===3?9:3.7)+.16*k)%1)-.5)*2;
   const front=Math.max(0,cos(a));
   const clearance=s.fold!==0&&k<3?.78*Math.max(0,(cos(a)+.65)/1.65):0;
   const edge=(s.fold===4?.17*cos(TAU*u*3):0)+height-clearance-.99*front+.39*(u-.5)*(k%2?1:-1)+.12*pleat+(k===3?.78*front:0);
   const spread=k===3?.77:s.fold===3?1.54:1.38;
   const radius=.21*waist+((spread+.12*pleat)*spreadScale-.21*waist)*pow(v,1.05);
   const drop=extent*(.08+1.16*front);
   return [sin(a)*radius,tie[1]-.04+(edge-tie[1]+.04-drop)*v,cos(a)*radius*.84];
  };
  if(k===0)tagSurface=surface;
  sheet(50,24,surface,(u,v)=>mul(base,.90+.09*Math.abs(((u*(s.fold===3?9:3.7)+.16*k)%1)-.5)*2+.028*sin(153*u+37*v)*cos(49*v-11*u)));
 });
 const handleStart=points.length;
 const silkColor=parseInt(paletteColors.ribbon[s.ribbon][1].slice(1),16),silk=rgb(silkColor);
 if(bareBand){
  sheet(48,2,(u,v)=>[(bandRadius+.005)*sin(TAU*u),tie[1]+(v-.5)*.03,(bandRadius+.005)*cos(TAU*u)],()=>silk);
  for(const sign of [-1,1]){
   sheet(4,14,(u,v)=>[sign*.11*sin(PI*v),tie[1]+.04*sin(TAU*v)+.022*(u-.5),bandRadius+.015+.02*sin(PI*v)],()=>silk);
   sheet(3,8,(u,v)=>[sign*(.095*v+.018*u),tie[1]-.16*v,bandRadius+.02+.018*v],()=>silk);
  }
 }else if(roundRoses){
  const height=crownRadius*.23+.16;
  const foot=(u,v)=>{
   const a=u*TAU,r=standRadius*(1+(.08+.024*cos(13*a))*v);
   return [r*cos(a),tie[1]-height*v,tie[2]-r*sin(a)];
  };
  sheet(64,6,foot,(u,v)=>mul(rgb(papers[0]),.85+.08*cos(13*TAU*u)+.06*v));
  sheet(64,1,(u,v)=>mix([0,tie[1]-height,tie[2]],foot(u,1),v),()=>rgb(papers[0]));
  sheet(64,1,(u,v)=>{
   const p=foot(u,.04+.09*v);return [p[0]*1.008,p[1],tie[2]+(p[2]-tie[2])*1.008];
  },()=>silk);
 }else{
 sheet(40,5,(u,v)=>{let a=u*TAU,r=.21+(.12+.018*Math.min(bundle,7)+.028*cos(7*a))*v;return [sin(a)*r,-1.32-.76*v+.055*cos(a*3)*v,cos(a)*r];},(u)=>mul(rgb(papers[1]),.90+.09*sin(u*TAU*7)));
 sheet(32,1,(u,v)=>[.224*sin(TAU*u),-1.39+.15*v,.225*cos(TAU*u)],()=>silk);
 for(const sign of [-1,1]){
  sheet(5,24,(u,v)=>[sign*(.05+.48*sin(PI*v)), -1.33+.18*sin(TAU*v)+.12*sin(PI*v)+(u-.5)*.10,.24+.08*cos(TAU*v)+(u-.5)*.05],u=>mul(silk,.82+.23*u));
  sheet(4,18,(u,v)=>[sign*(.05+.31*v+.13*sin(v*PI*1.4))+(u-.5)*.105,-1.36-v*(sign===1?.92:.75)+.06*u*v,.24+.16*sin(PI*v)+.055*u],u=>mul(silk,.8+.24*u));
 }
 bead([0,-1.32,.25],[.115,.09,.076],silkColor);
 for(let i=handleStart;i<points.length;i+=3){points[i]*=waist;points[i+1]=tie[1]+(points[i+1]+1.30)*(1+.30*extent);points[i+2]=points[i+2]*waist+tie[2];}
 }
 if(roundRoses&&!bareBand&&s.fold!==5){
  // Lay a slender satin bow over the upper-left flowers, following the dome.
  const onRose=(x,y,lift)=>crownPoint(x*crownRadius,y*crownRadius,
   crownHeight(x*x+y*y)+.51+lift);
  const knot=[-.32,.27];
  for(const sign of [-1,1]){
   sheet(5,24,(u,v)=>{
    const arch=sin(PI*v),t=2*u-1;
    return onRose(knot[0]+sign*(.30*arch+.025*t),knot[1]+.12*sin(TAU*v)+.044*t,.32*arch);
   },(u,v)=>mul(silk,.74+.30*u+.16*sin(PI*v)));
   sheet(4,32,(u,v)=>{
    const x=knot[0]+(sign>0?1.12*v:-.28*v)+.044*(2*u-1);
    const y=knot[1]-(sign>0?.28:1.13)*v+.055*sin(TAU*v);
    return onRose(x,y,.12*sin(PI*v));
   },u=>mul(silk,.85+.21*u));
  }
  bead(onRose(...knot,.12),[.16,.12,.12],silkColor);
 }
 const cardStart=indices.length;
 if(s.card){
  // Clip the tag to the outer left shoulder, just beneath its paper lip.
  const tint=rgb(parseInt(paletteColors.card[s.card][1].slice(1),16));
  const tag=(u,v)=>{const p=tagSurface(.70+.098*u,.84+.169*v);return [p[0]-.023,p[1],p[2]+.032];};
  sheet(5,3,tag,()=>tint); bead(tag(.46,.92),[.028,.028,.027],0xaa956c);
 }
 let fit=1,middle=.04;
 if(s.stems||flowers.length>6||fillers.length>12){
  let radius=0;
  for(let i=0;i<points.length;i+=3)radius=Math.max(radius,Math.hypot(points[i],points[i+2]));
  let top=-Infinity,bottom=Infinity;
  for(let i=1;i<points.length;i+=3){top=Math.max(top,points[i]);bottom=Math.min(bottom,points[i]);}
  fit=Math.min(1,1.68/radius,4.48/(top-bottom));
  middle=(top+bottom)/2;
  if(framing){fit=framing.fit;middle=framing.middle;}
  for(let i=0;i<points.length;i+=3){
   points[i]*=fit;
   points[i+1]=(points[i+1]-middle)*fit+.04;
   points[i+2]*=fit;
  }
 }
 return {ranges,anchors,fit,middle,points,colors,indices,wrapStart,cardStart,frontPitch:roundRoses?.55:.08};
}
