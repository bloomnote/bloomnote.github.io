import {colors} from './colors.js?v=studio2';
// Bake broad window shadows once per arrangement, shared by GPU and CPU previews.
function windowShadow(points,indices,[lx,ly,lz]){
 const horizontal=Math.hypot(lx,lz),rightX=lz/horizontal,rightZ=-lx/horizontal;
 const side=224,map=new Float32Array(side*side).fill(-Infinity);
 const lightSpace=new Float32Array(points.length);
 for(let i=0;i<points.length;i+=3){
  const [x,y,z]=[points[i],points[i+1],points[i+2]];
  lightSpace[i]=112+36*(rightX*x+rightZ*z);
  lightSpace[i+1]=112+36*(ly*rightZ*x+horizontal*y-ly*rightX*z);
  lightSpace[i+2]=lx*x+ly*y+lz*z;
 }
 for(let t=0;t<indices.length;t+=3){
  const a=indices[t]*3,b=indices[t+1]*3,c=indices[t+2]*3;
  const ax=lightSpace[a],ay=lightSpace[a+1],bx=lightSpace[b],by=lightSpace[b+1],cx=lightSpace[c],cy=lightSpace[c+1];
  const area=(by-cy)*(ax-cx)+(cx-bx)*(ay-cy);if(Math.abs(area)<.01)continue;
  for(let y=Math.max(0,Math.floor(Math.min(ay,by,cy)));y<=Math.min(side-1,Math.ceil(Math.max(ay,by,cy)));y++)
   for(let x=Math.max(0,Math.floor(Math.min(ax,bx,cx)));x<=Math.min(side-1,Math.ceil(Math.max(ax,bx,cx)));x++){
    const u=((by-cy)*(x-cx)+(cx-bx)*(y-cy))/area,v=((cy-ay)*(x-cx)+(ax-cx)*(y-cy))/area;
    if(u>=0&&v>=0&&u+v<=1){const pixel=y*side+x;map[pixel]=Math.max(map[pixel],u*lightSpace[a+2]+v*lightSpace[b+2]+(1-u-v)*lightSpace[c+2]);}
   }
 }
 const exposure=new Float32Array(points.length/3);
 for(let v=0;v<exposure.length;v++){
  const i=v*3,x=Math.round(lightSpace[i]),y=Math.round(lightSpace[i+1]),z=lightSpace[i+2];
  let shadow=0;
  for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++)if(map[(y+dy)*side+x+dx]>z+.095)shadow++;
  exposure[v]=1-shadow/25;
 }
 return exposure;
}
export const lightPositions=[[-.65,.72,.75],[0,1,.52],[.65,.72,.75],[-1,.17,.52],[1,.17,.52],[.45,.24,1]];
export const lampColors=colors.lamp.map(row => row[2]);
export function prepare({points,colors,indices,wrapStart,cardStart},direction=0,lamp=0){
 const position=direction===0?[-.42,.86,.65]:lightPositions[direction],length=Math.hypot(...position);
 const axis=position.map(component=>component/length);
 const tint=lampColors[lamp];
 const source=direction===0?[-1.65,4,3.15]:position.map(v=>v*4);
 const [sx,sy,sz]=source,aimLength=Math.hypot(sx,sy-1,sz-.2);
 const exposure=windowShadow(points,indices,axis);
 const vertices=new Float32Array(indices.length*6),normals=new Float32Array(points.length);
 for(let t=0;t<indices.length;t+=3){
  const [a,b,c]=indices.slice(t,t+3).map(i=>i*3);
  const ux=points[b]-points[a],uy=points[b+1]-points[a+1],uz=points[b+2]-points[a+2];
  const vx=points[c]-points[a],vy=points[c+1]-points[a+1],vz=points[c+2]-points[a+2];
  let nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx;
  for(const i of [a,b,c]){normals[i]+=nx;normals[i+1]+=ny;normals[i+2]+=nz;}
 }
 for(let j=0;j<indices.length;j++){
  const i=indices[j]*3,o=j*6,nx=normals[i],ny=normals[i+1],nz=normals[i+2],len=Math.hypot(nx,ny,nz)||1;
  const visible=exposure[indices[j]];
   const dx=sx-points[i],dy=sy-points[i+1],dz=sz-points[i+2],distance=Math.hypot(dx,dy,dz)||1;
   const cosine=(dx*sx+dy*(sy-1)+dz*(sz-.2))/(distance*aimLength);
   const u=Math.min(1,Math.max(0,(cosine-.90)/.074)),cone=u*u*(3-2*u);
   const lambert=Math.max(0,(dx*nx+dy*ny+dz*nz)*(nz<0?-1:1)/(len*distance));
   // Bound the incident light before applying it to each petal's own color.
   const attenuation=1/(1+.025*distance*distance);
   const key=cone*attenuation*(.18+.82*lambert)*(.24+.76*visible);
   // A wider beam reaches the lower wrapping. Reduce fill so overlapping folds cast shadows.
   const wrap=j>=wrapStart && j<cardStart;
   let diffuse=key;
   if(wrap){
    const radius=Math.hypot(points[i],points[i+2]) || 1;
    const facing=(points[i]*axis[0]+points[i+2]*axis[2])/radius;
    const broad=.5+.5*facing;
    diffuse=(.40+.60*cone)*(.58*broad+.42*lambert)*(.44+.56*visible);
   }
   // Lift botanical midtones while leaving headroom for white petals.
   const botanical=j<wrapStart;
   const fill=wrap ? .31 : botanical ? .67 : .54;
   const strength=wrap ? .94 : botanical ? .57 : .49;
   for(let d=0;d<3;d++){
    vertices[o+d]=points[i+d];
    const lit=colors[i+d]*(fill+strength*diffuse*(1+.22*(tint[d]-1)));
    vertices[o+3+d]=(wrap || botanical) && lit>.82 ? .82+.16*(1-Math.exp(- (lit-.82)/.16)) : lit;
   }

 }
 return vertices;
}
export function makeView(canvas){
 let zoom=1;
 let mesh,gl=canvas.getContext('webgl',{alpha:true,antialias:true,preserveDrawingBuffer:true});
 let program,buffer,cam,scale,flat;
 if(gl){
  program=gl.createProgram();
  for(const [type,src] of [[gl.VERTEX_SHADER,`attribute vec3 p;attribute vec3 color;uniform vec4 camera;uniform vec2 scale;varying vec3 tint;
  void main(){float x=p.x*camera.x-p.z*camera.y;float z=p.x*camera.y+p.z*camera.x;
  float y=(p.y-.04)*camera.z-z*camera.w;gl_Position=vec4(x*scale.x,y*scale.y,-(z*camera.z+(p.y-.04)*camera.w)*.18,1.);tint=color;}`],[gl.FRAGMENT_SHADER,'precision mediump float;varying vec3 tint;void main(){gl_FragColor=vec4(tint,1.);}']]){
   const sh=gl.createShader(type);gl.shaderSource(sh,src);gl.compileShader(sh);gl.attachShader(program,sh);
  }
  gl.linkProgram(program);gl.useProgram(program);gl.enable(gl.DEPTH_TEST);buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
  ['p','color'].forEach((name,i)=>{const loc=gl.getAttribLocation(program,name);gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,3,gl.FLOAT,false,24,i*12);});
  cam=gl.getUniformLocation(program,'camera');scale=gl.getUniformLocation(program,'scale');
 }else flat=canvas.getContext('2d');
 function projectMesh(yaw,pitch){
  const w=canvas.width,h=canvas.height,unit=zoom*Math.min(w/3.98,h/5.13);
  const cs=Math.cos(yaw),sn=Math.sin(yaw),ct=Math.cos(pitch),st=Math.sin(pitch);
  const projected=new Float32Array(mesh.length/2);
  for(let i=0,j=0;i<mesh.length;i+=6,j+=3){
   const z=mesh[i]*sn+mesh[i+2]*cs,y=mesh[i+1]-.04;
   projected[j]=w*.5+(mesh[i]*cs-mesh[i+2]*sn)*unit;
   projected[j+1]=h*.5-(y*ct-z*st)*unit;projected[j+2]=z*ct+y*st;
  }
  return projected;
 }
 function hitVertex(x,y,yaw,pitch){
  const projected=projectMesh(yaw,pitch);
  let nearest=-Infinity,hit=-1;
  for(let i=0;i<projected.length;i+=9){
   const ax=projected[i],ay=projected[i+1],bx=projected[i+3],by=projected[i+4],cx=projected[i+6],cy=projected[i+7];
   if(x<Math.min(ax,bx,cx)||x>Math.max(ax,bx,cx)||y<Math.min(ay,by,cy)||y>Math.max(ay,by,cy))continue;
   const area=(by-cy)*(ax-cx)+(cx-bx)*(ay-cy);
   if(Math.abs(area)<.001)continue;
   const u=((by-cy)*(x-cx)+(cx-bx)*(y-cy))/area,v=((cy-ay)*(x-cx)+(ax-cx)*(y-cy))/area;
   if(u<0||v<0||u+v>1)continue;
   const z=u*projected[i+2]+v*projected[i+5]+(1-u-v)*projected[i+8];
   if(z>nearest){nearest=z;hit=i/3;}
  }
  return hit;
 }
 function render(yaw,pitch){
  const w=canvas.width,h=canvas.height,unit=zoom*Math.min(w/3.98,h/5.13);
  const cs=Math.cos(yaw),sn=Math.sin(yaw),ct=Math.cos(pitch),st=Math.sin(pitch);
  if(gl){
   gl.viewport(0,0,w,h);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.uniform4f(cam,cs,sn,ct,st);gl.uniform2f(scale,unit*2/w,unit*2/h);gl.drawArrays(gl.TRIANGLES,0,mesh.length/6);return;
  }
  const img=flat.createImageData(w,h),depth=new Float32Array(w*h).fill(-Infinity);
  const projected=projectMesh(yaw,pitch);
  for(let j=0;j<projected.length;j+=9){
   const [ax,ay,az,bx,by,bz,cx,cy,cz]=projected.subarray(j,j+9);
   const area=(by-cy)*(ax-cx)+(cx-bx)*(ay-cy);if(Math.abs(area)<.01)continue;
   const xmax=Math.min(w-1,Math.ceil(Math.max(ax,bx,cx))),ymax=Math.min(h-1,Math.ceil(Math.max(ay,by,cy)));
   const xmin=Math.max(0,Math.floor(Math.min(ax,bx,cx))),ymin=Math.max(0,Math.floor(Math.min(ay,by,cy)));
   for(let y=ymin;y<=ymax;y++)for(let x=xmin;x<=xmax;x++){
    const u=((by-cy)*(x+.5-cx)+(cx-bx)*(y+.5-cy))/area,v=((cy-ay)*(x+.5-cx)+(ax-cx)*(y+.5-cy))/area,k=1-u-v;
    if(u<0||v<0||k<0)continue;
    const z=u*az+v*bz+k*cz,p=y*w+x;if(z<depth[p])continue;depth[p]=z;
    for(let d=0;d<3;d++)img.data[p*4+d]=255*(u*mesh[2*j+3+d]+v*mesh[2*j+9+d]+k*mesh[2*j+15+d]);
    img.data[p*4+3]=255;
   }
  }
  flat.putImageData(img,0,0);
 }
 return {accelerated:!!gl,hitVertex,hitsCard:(x,y,yaw,pitch,start)=>hitVertex(x,y,yaw,pitch)>=start,setZoom(value){zoom=value;},setMesh(data){mesh=data;if(gl)gl.bufferData(gl.ARRAY_BUFFER,data,gl.STATIC_DRAW);},render};
}
