// Catalog order is part of the gift format. Append new entries at the end.
export const flowers = [
 ['铃兰','bells','f5f1de'],['芍药','ruffle','f0c3ca'],['鸢尾','iris','454979'],
 ['洋桔梗','cup','ecdfef'],['满天星','mist','f6efe1'],['勿忘我','forget','97b4e1'],
 ['康乃馨','fringe','d593a7'],['小雏菊','daisy','fff8e3'],['山茶花','camellia','c5556a'],
 ['栀子花','pinwheel','fffae4'],['蝴蝶兰','orchid','e7c8df'],['马蹄莲','spathe','f4efda'],
 ['薰衣草','lavender','9c87ba'],['飞燕草','spire','7794cd'],['乒乓菊','pom','d3df9e'],
 ['小苍兰','freesia','efcf87'],['牡丹','peony','e5a7b8'],['木棉','kapok','d26a49'],
 ['腊梅','wax','e1bf66'],['玉兰','magnolia','ead7d5'],['桂花','osmanthus','eac381'],
 ['洋甘菊','chamomile','fff9e9']
];
export const foliage = ['蕨叶','橄榄枝','常春藤','雪柳','银叶菊','蒲苇','轻盈草穗'];
export const shades = {
 '奶白':'f6f1df','奶绿':'ccd9ab','薄荷绿':'dbe6d4','雾蓝':'9ebad4','灰紫':'afa2bd',
 '烟粉':'dcacb4','胭脂红':'ac485d','酒红':'793748','墨蓝':'454979','柠檬奶':'f5dfa0',
 '杏橙':'eaa371','深棕金':'ae8349','淡紫':'c8b7da','樱粉':'ecc2ce','银灰':'bfc7be','白底紫边':'f7f1e3'
};

export function botanical(form,{P,sheet,stem,bead,tint,phase,dense,purpleEdge}){
 const {sin,cos,PI}=Math,T=2*PI;
 const color=(u,v)=>purpleEdge && v>.86?[.52,.36,.67]:tint.map(channel=>channel*(.61+.30*v+.09*Math.abs(2*u-1)));
 function petals(center,n,length,width,lift,{offset=phase,ruffle=0,drop=0,twist=0,paint=color}={}){
  for(let j=0;j<n;j++){
   const a=offset+j*T/n;
   sheet(dense?4:7,dense?4:7,(u,v)=>{
    const t=2*u-1,angle=a+twist*v,r=length*v,w=width*t*sin(PI*v*.93);
    const h=lift*sin(PI*v*.58)-drop*v*v+.08*width*t*t+ruffle*sin(t*10+j)*v*v;
    return P(center[0]+r*cos(angle)-w*sin(angle),center[1]+r*sin(angle)+w*cos(angle),center[2]+h);
   },paint);
  }
 }
 const origin=[0,0,0];
 const coord=v=>P(...v);
 function twig(a,b,r=.011,bark){stem(coord(a),coord(b),r,bark);}
 const core=(c,r,hex)=>bead(coord(c),[r,r,r],hex);
 if(form==='spathe'){
  sheet(18,12,(u,v)=>{const a=(u-.5)*T*1.13,r=.07+.32*v;
   return P(r*cos(a),v*(.59+.46*cos(a))-.2,r*sin(a)+.14*v*v);},color);
  twig([0,-.05,0],[0,.48,.1],.045,0xe3be60);return;
 }
 if(form==='bells'){
  let prev=origin;
  for(let j=1;j<=7;j++){
   const t=j/7,a=[.58*t,.91*sin(t*2),.04*cos(j)],b=[a[0]+.12,a[1]-.12,a[2]+.05];
   twig(prev,a);twig(a,b,.007);prev=a;
   sheet(12,6,(u,v)=>{const ang=T*u,r=(.035+.08*sin(PI*v*.82))*(1-.25*t);
    return P(b[0]+r*cos(ang),b[1]-.17*v+.027*v*v*cos(6*ang),b[2]+r*sin(ang));},color);
  }return;
 }
 if(form==='iris'){
  petals(origin,3,.32,.20,.64);
  petals(origin,3,.77,.24,.30,{offset:phase+PI/3,drop:.65,paint:(u,v)=>v<.55&&Math.abs(u-.5)<.16?[.88,.68,.30]:color(u,v)});return;
 }
 if(form==='orchid'){
  petals(origin,3,.47,.17,.09);
  petals([0,.04,.05],2,.63,.35,.14,{offset:0});
  petals([0,-.04,.14],1,.32,.19,.22,{offset:-PI/2,paint:()=>[.74,.33,.52]});return;
 }
 if(form==='pom'){
  const count=dense?28:56;
  for(let j=0;j<count;j++){
   const a=j*2.39996,h=1-2*(j+.5)/count,r=Math.sqrt(1-h*h);
   sheet(3,3,(u,v)=>{const d=.43+.15*v,w=(u-.5)*.17*sin(PI*v*.87);
    return P(d*r*cos(a)-w*sin(a),d*h,d*r*sin(a)+w*cos(a));},color);
  }return;
 }
 const sprays=['mist','forget','lavender','spire','freesia','wax','osmanthus','chamomile'];
 if(sprays.includes(form)){
  const tall=['spire','lavender'].includes(form),woody=['wax','osmanthus'].includes(form);
  const count=form==='lavender'?18:tall?12:form==='freesia'?6:9;
  let prev=origin;
  for(let j=0;j<count;j++){
   const t=(j+1)/count,a=j*2.4+phase,r=tall?.09*(1-.7*t):.17+.18*sin(PI*t);
   const bend=form==='freesia'?.58*t*t:woody?.22*t:.09*sin(t*3);
   const axis=[bend,t*(tall?1.22:.80),0],tip=[bend+r*cos(a),axis[1]+.07,r*sin(a)+.03];
   twig(prev,axis,.012,woody?0x77634d:undefined);twig(axis,tip,.008);prev=axis;
   if(form==='mist'||form==='osmanthus'){
    for(let k=0;k<3;k++){const b=k*2.1+a,c=[tip[0]+.08*cos(b),tip[1]+.08,tip[2]+.08*sin(b)];
     twig(tip,c,.004);petals(c,form==='mist'?5:4,.052,.028,.03);}
   }else{
    const size={forget:.12,lavender:.065,spire:.19,freesia:.23,wax:.15,chamomile:.17}[form]*(1-.30*t);
    petals(tip,form==='chamomile'?12:form==='wax'?9:5,size,size*(form==='chamomile'?.22:.51),size*(form==='freesia'?1.12:.45));
    if(['forget','chamomile','wax'].includes(form))core(tip,size*.24,0xd6ac50);
   }
  }return;
 }
 // Layered heads share a petal surface, with species-specific whorls and rims.
 const profiles={
  ruffle:[4,8,.74,.28,.29,.08],fringe:[4,10,.57,.23,.35,.13],peony:[5,10,.84,.31,.24,.085],
  cup:[2,6,.54,.31,.50,.035],camellia:[4,7,.60,.27,.19,0],pinwheel:[2,6,.66,.25,.18,0],
  daisy:[2,16,.60,.084,.06,0],kapok:[1,5,.75,.29,.25,0],magnolia:[2,5,.48,.24,.64,0]
 };
 const [layers,n,l,w,h,rim]=profiles[form];
 for(let k=0;k<layers;k++){
  const scale=1-.65*k/layers;
  petals([0,0,k*.07],n,l*scale,w*scale,h,{offset:phase+.48*k,ruffle:rim,twist:form==='pinwheel'?.85:.09});
 }
 if(['daisy','kapok','camellia','peony'].includes(form))core([0,0,h*.6+.06*layers],form==='kapok'?.14:.095,form==='kapok'?0x823e39:0xe0ba64);
}
