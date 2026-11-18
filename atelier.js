import {bouquet,options,initial,stemsFor} from './floristry.js?v=petal2';
import {prepare,makeView,lightPositions,lampColors} from './flower-view.js?v=zoom1';
const $=id=>document.getElementById(id), keys=Object.keys(initial);
function decode(hash){
 if(!hash.startsWith('#flower='))return null;
 const parts=hash.slice(8).split('-');
 // Older gifts used the original gray backdrop.
 if(parts.length===6)parts.push('2');
 if(parts.length===7)parts.push('0','0');
 if(parts.length!==keys.length)return null;
 const state={};
 for(const [i,key] of keys.entries()){
  const part=parts[i],multi=Array.isArray(initial[key]);
  if(!/^\d*$/.test(part)||part.length>(multi?options[key].length:1))return null;
  if(!part.length&&key!=='sprigs')return null;
  const values=[...part].map(Number);
  if(values.some(v=>v>=options[key].length)||new Set(values).size!==values.length)return null;
  state[key]=multi?values:values[0];
 }
 const raw=new URLSearchParams(location.hash.slice(1)).get('stems');
 if(raw!==null){
  const tokens=raw.split('.');
  if(tokens.length>128)return null;
  const seen=new Set(),counts=[0,0,0,0,0],stems=[];
  for(const token of tokens){
   if(!/^[0-4][0-9a-z]{1,2}$/.test(token))return null;
   const kind=Number(token[0]),slot=parseInt(token.slice(1),36),key=(kind<3?'flower':'sprig')+slot;
   if(slot>=128||seen.has(key)||++counts[kind]>99)return null;
   seen.add(key);stems.push([kind,slot]);
  }
  if(!stems.some(([kind])=>kind<3))return null;
  state.stems=stems;
 }
 return state;
}
const recipes=[
 {id:'lily',name:'苔绿白百合',state:initial},
 {id:'rose',name:'炭墨烟粉玫瑰',state:{...initial,blooms:[1],sprigs:[0],fold:1,paper:0,ribbon:1}},
 {id:'tulip',name:'亚麻紫郁金香',state:{...initial,blooms:[2],sprigs:[],fold:2,paper:2,ribbon:2}}
];
const chosen=recipes.find(r=>r.id===new URLSearchParams(location.search).get('bouquet'));
const giftParams=new URLSearchParams(location.hash.slice(1));
const gift=decode(location.hash.split('&')[0]),state=gift??structuredClone(chosen?.state??initial),canvas=$('flower'),view=makeView(canvas);
let yaw=0,pitch=.08,rotating=!matchMedia('(prefers-reduced-motion: reduce)').matches,last=0,hold=performance.now()+2800,tab=0,drag=null;
const backdrops=['#f5e9cd','#191a1d','#b8b8b3'];
const wall=document.createElement('canvas');
wall.className='lit-wall';wall.setAttribute('aria-hidden','true');canvas.before(wall);
function draw(){view.render(yaw,pitch);}
let cardStart;
function update(){
 const model=bouquet(state);cardStart=model.cardStart;
 view.setMesh(prepare(model,state.direction,state.lamp));draw();
}
function resize(){
 const dpr=view.accelerated?Math.min(devicePixelRatio,2):Math.min(devicePixelRatio,1.1);
 canvas.width=Math.max(1,Math.round(canvas.clientWidth*dpr));canvas.height=Math.max(1,Math.round(canvas.clientHeight*dpr));refreshBackdrop();draw();
}
update();new ResizeObserver(resize).observe(canvas);resize();
function rotation(){ $('turn').textContent=rotating?'暂停旋转':'开始旋转';$('turn').setAttribute('aria-pressed',String(rotating));}
rotation();$('turn').onclick=()=>{rotating=!rotating;rotation();};
function front(){yaw=0;pitch=.08;hold=performance.now()+2800;draw();} $('front').onclick=front;
let zoom=1;
function setZoom(value){
 zoom=Math.max(.75,Math.min(3,value));view.setZoom(zoom);draw();
 $('scale').textContent=Number(zoom.toFixed(2))+'×';
 $('smaller').disabled=zoom<=.75;$('larger').disabled=zoom>=3;
 hold=performance.now()+2500;
}
$('smaller').onclick=()=>setZoom(zoom/1.25);
$('larger').onclick=()=>setZoom(zoom*1.25);
$('scale').onclick=()=>setZoom(1);
const pointers=new Map();
let pinch=null;
function separation(){
 const [a,b]=pointers.values();
 return Math.hypot(a.x-b.x,a.y-b.y);
}
const photo=$('photo');
photo.src=snapshot().toDataURL('image/png');
photo.onpointerdown=e=>{
 if(e.button!==0||pointers.size>=2)return;
 pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});photo.setPointerCapture(e.pointerId);
 if(pointers.size===2){
  pinch={distance:Math.max(1,separation()),zoom};if(drag)drag.moved=true;return;
 }
 drag={id:e.pointerId,x:e.clientX,y:e.clientY,moved:false,started:e.timeStamp};
 // Keep the native image menu attached to the same image that received the touch.
 photo.src=snapshot().toDataURL('image/png');
};
photo.onpointermove=e=>{
 if(!pointers.has(e.pointerId))return;
 pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
 if(pinch){setZoom(pinch.zoom*separation()/pinch.distance);return;}
 if(!drag||drag.id!==e.pointerId)return;
 const dx=e.clientX-drag.x,dy=e.clientY-drag.y;
 if(!drag.moved&&Math.hypot(dx,dy)<6)return;
 drag.moved=true;yaw-=dx*.012;pitch=Math.max(-.6,Math.min(.65,pitch+dy*.009));
 drag.x=e.clientX;drag.y=e.clientY;draw();
};
function endDrag(e){
 if(!pointers.delete(e.pointerId))return;
 pinch=null;drag=null;hold=performance.now()+2500;
 if(pointers.size){const [id,pt]=pointers.entries().next().value;drag={id,...pt,moved:true,started:e.timeStamp};}
};
photo.onlostpointercapture=photo.onpointercancel=endDrag;
photo.onpointerup=e=>{
 if(drag?.id!==e.pointerId){endDrag(e);return;}
 const tapped=!drag.moved&&e.timeStamp-drag.started<450&&Math.hypot(e.clientX-drag.x,e.clientY-drag.y)<6;
 endDrag(e);
 if(!tapped||!state.card||!$('note').value.trim())return;
 const rect=photo.getBoundingClientRect();
 const x=(e.clientX-rect.left)*canvas.width/rect.width,y=(e.clientY-rect.top)*canvas.height/rect.height;
 if(view.hitsCard(x,y,yaw,pitch,cardStart))openNote();
};
canvas.tabIndex=0;canvas.onkeydown=e=>{if(!['ArrowLeft','ArrowRight'].includes(e.key))return;e.preventDefault();yaw+=e.key==='ArrowLeft'?-.15:.15;hold=performance.now()+2500;draw();};
function tick(t){const dt=t-last;if(dt>(view.accelerated?25:85)){last=t;if(rotating&&!drag&&t>hold&&!document.hidden){yaw+=Math.min(dt,100)*.00013;draw();}}requestAnimationFrame(tick);}requestAnimationFrame(tick);
const steps=[['花材',['blooms','sprigs']],['包装',['fold','paper']],['丝带',['ribbon']],['小卡',['card']],['背景与光',['background','direction','lamp']]];
const labels={direction:'光从哪里来',lamp:'灯光颜色',background:'送出时的背景',blooms:'主花 · 可混搭',sprigs:'配花与枝叶',fold:'折纸方式',paper:'纸色',ribbon:'缎带颜色',card:'卡片配色'};
const palette={background:backdrops,lamp:['#f7f5ed','#f2c493','#bacedf','#ecc5cc'],blooms:['#f3ebd6','#d1a3a5','#b1a0cb'],sprigs:['#9abdd4','#839582'],paper:['#41414a','#9a8da0','#c7ae8c','#414634'],ribbon:['#879fb8','#ab849c','#385650','#e6ded0'],card:[null,'#f2e5cb','#e6c4c2','#c3cfdc']};
$('note').value=gift&&state.card?(giftParams.get('note')??'').slice(0,400):'';
$('read-note').onclick=openNote;
function openNote(){
 $('letter-text').textContent=$('note').value.trim();
 $('letter').style.backgroundColor=palette.card[state.card];
 $('letter').showModal();
};
function quantityControl(kind,name){
 const group=document.createElement('div');group.className='quantity';
 const label=document.createElement('label'),input=document.createElement('input');
 label.htmlFor=input.id='count-'+kind;label.textContent=name;
 const minus=document.createElement('button'),plus=document.createElement('button');
 minus.textContent='−';plus.textContent='＋';
 minus.setAttribute('aria-label','减少'+name);plus.setAttribute('aria-label','增加'+name);
 input.type='number';input.inputMode='numeric';input.dataset.kind=kind;
 function change(value){
 const stems=stemsFor(state),count=stems.filter(([k])=>k===kind).length;
 const flowers=stems.filter(([k])=>k<3).length;
 const minimum=kind<3&&flowers===count?1:0,maximum=Math.min(99,128-stems.length+count);
  if(!Number.isInteger(value)||value<minimum||value>maximum){
   input.value=count;status('这项可选 '+minimum+' 至 '+maximum+' 枝');return;
  }
  if(value===count)return;
  const next=stems.slice();
  if(value<count){
   let remove=count-value;
   for(let j=next.length-1;j>=0&&remove;j--)if(next[j][0]===kind){next.splice(j,1);remove--;}
  }else{
   const occupied=new Set(next.filter(([k])=>(k<3)===(kind<3)).map(([,i])=>i));
   let slot=0;
   for(let j=count;j<value;j++){
    while(occupied.has(slot))slot++;
    next.push([kind,slot]);occupied.add(slot++);
   }
  }
  state.stems=next;update();refreshCounts();status('');
  for(const b of $('recipes').children)b.setAttribute('aria-pressed','false');
 }
 minus.className='minus';plus.className='plus';
 minus.onclick=()=>change(Number(input.value)-1);plus.onclick=()=>change(Number(input.value)+1);
 input.onchange=input.onblur=()=>change(input.valueAsNumber);
 input.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();change(input.valueAsNumber);input.blur();}};
 group.append(label,minus,input,plus);return group;
}
function refreshCounts(){
 const stems=stemsFor(state),flowers=stems.filter(([k])=>k<3).length;
 for(const chip of $('picker').querySelectorAll('[data-kind]'))chip.setAttribute('aria-pressed',String(stems.some(([k])=>k===Number(chip.dataset.kind))));
 for(const input of $('counters').querySelectorAll('input[data-kind]')){
  const kind=Number(input.dataset.kind),n=stems.filter(([k])=>k===kind).length;
  input.value=n;input.min=kind<3&&n===flowers?1:0;input.max=Math.min(99,128-stems.length+n);
  input.previousElementSibling.disabled=n===Number(input.min);
  input.nextElementSibling.disabled=n===Number(input.max);
 }
}
function panel(){
 $('note-field').hidden=tab!==3||!state.card;
 $('recipes').replaceChildren(...recipes.map(recipe=>{
  const button=document.createElement('button');button.textContent=recipe.name;
  button.setAttribute('aria-pressed',String(!state.stems&&Object.keys(recipe.state).filter(k=>!['background','direction','lamp'].includes(k)).every(k=>String(state[k])===String(recipe.state[k]))));
  button.onclick=()=>{$('quantities').open=false;delete state.stems;Object.assign(state,structuredClone(recipe.state),{background:state.background,direction:state.direction,lamp:state.lamp});front();update();panel();status('');};
  return button;
 }));
 document.querySelector('nav').replaceChildren(...steps.map(([name],i)=>{const b=document.createElement('button');b.textContent=name;b.setAttribute('aria-current',String(i===tab));b.onclick=()=>{tab=i;panel();};return b;}));
 $('picker').replaceChildren(...steps[tab][1].map(key=>{
  const field=document.createElement('fieldset'),legend=document.createElement('legend'),row=document.createElement('div');legend.textContent=labels[key];row.className='choices';
  options[key].forEach((name,i)=>{
   const b=document.createElement('button'),list=Array.isArray(state[key]),kind=key==='sprigs'?i+3:i,active=list?stemsFor(state).some(([k])=>k===kind):state[key]===i;
   if(list)b.dataset.kind=kind;
   if(palette[key]?.[i]){const swatch=document.createElement('i');swatch.className='sample';swatch.style.setProperty('--swatch',palette[key][i]);b.append(swatch);}
   b.append(name);b.setAttribute('aria-pressed',String(active));b.onclick=()=>{
    if(list&&state.stems){
     const input=$('count-'+kind),removing=b.getAttribute('aria-pressed')==='true';
     if(removing&&Number(input.min)>0){status('至少留一种主花');return;}
     input.value=removing?0:Math.min(kind===0?2:kind<3?5:4,Number(input.max));
     input.dispatchEvent(new Event('change'));return;
    }
    if(list){if(active&&key==='blooms'&&state[key].length===1){status('至少留一种主花');return;}state[key]=active?state[key].filter(v=>v!==i):[...state[key],i];}
    else state[key]=i;
    status('');if(key!=='background')update();
    if(['background','direction','lamp'].includes(key))refreshBackdrop();panel();$('picker').querySelectorAll('fieldset')[steps[tab][1].indexOf(key)].querySelectorAll('button')[i].focus({preventScroll:true});
   };row.append(b);
  });field.append(legend,row);return field;
 }));
 $('quantities').hidden=tab!==0;
 if(tab===0)$('counters').replaceChildren(...[...options.blooms,...options.sprigs].map((name,k)=>quantityControl(k,name)));
 refreshCounts();
}
function status(msg){document.querySelector('output').textContent=msg;}
function finish(done){
 document.querySelector('main').classList.toggle('present',done);
 $('read-note').hidden=!done||!state.card||!$('note').value.trim();
 $('editor').hidden=done;$('finished').hidden=!done;$('back').hidden=!!gift;
 $('over').textContent=gift?'收花手帖':done?'成束预览':'花艺工作台';$('title').textContent=gift?'送你一束花':done?'你的花束':'包一束花';
 $('receipt').textContent=[...options.blooms,...options.sprigs].map((name,i)=>{const n=stemsFor(state).filter(([k])=>k===i).length;return n?n+(i<3?' 朵':' 枝')+name:'';}).filter(Boolean).join('、')+'，配'+options.paper[state.paper]+'包装纸与'+options.ribbon[state.ribbon]+'丝带。';
 status('');$('url').hidden=true;if(done)front();
}
panel();finish(!!gift);$('finish').onclick=()=>finish(true);$('back').onclick=()=>finish(false);
$('share').onclick=async()=>{
 const url=new URL(location.href);url.hash='flower='+keys.map(k=>[].concat(state[k]).join('')).join('-');
 if(state.stems)url.hash+='&stems='+state.stems.map(([kind,slot])=>kind+slot.toString(36)).join('.');
 if(state.card&&$('note').value.trim())url.hash+='&'+new URLSearchParams({note:$('note').value.trim()});
 try{if(navigator.share){await navigator.share({title:'送你一束花',url:url.href});return;}await navigator.clipboard.writeText(url.href);status('花束链接已复制');}
 catch(e){if(e.name==='AbortError')return;$('url').value=url.href;$('url').hidden=false;$('url').select();status('复制这条链接即可分享花束');}
};
function snapshot(){
 draw();const out=document.createElement('canvas');out.width=canvas.width;out.height=canvas.height;const ctx=out.getContext('2d');
 // Use the same color for the preview and the image so the shutter matches the frame.
 ctx.drawImage(wall,0,0);ctx.drawImage(canvas,0,0);
 return out;
}
$('save').onclick=()=>{
 const filename='花间手帖-'+new Date().toISOString().replace(/[:.]/g,'-')+'.png';
 snapshot().toBlob(blob=>{if(!blob){status('图片生成失败，请再试一次');return;}const a=document.createElement('a'),u=URL.createObjectURL(blob);a.href=u;a.download=filename;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),60000);status('已生成当前角度的 PNG 图片');},'image/png');
};
function refreshBackdrop(){
 wall.width=canvas.width;wall.height=canvas.height;
 const ctx=wall.getContext('2d');
 const [x,y]=lightPositions[state.direction],tint=lampColors[state.lamp];
 const base=backdrops[state.background].slice(1).match(/../g).map(hex=>parseInt(hex,16));
 const cx=.5+.54*x,cy=.55-.54*y;
 ctx.scale(wall.width,wall.height);
 const glow=ctx.createRadialGradient(cx,cy,0,cx,cy,1.18);
 for(const [offset,power] of [[0,1],[.3,.83],[.65,.34],[1,0]]){
  const rgb=base.map((channel,i)=>Math.round(Math.min(255,channel*.83+power*(39+channel*.07)*tint[i]**2)));
  glow.addColorStop(offset,'rgb('+rgb.join(',')+')');
 }
 ctx.fillStyle=glow;ctx.fillRect(0,0,1,1);
}
