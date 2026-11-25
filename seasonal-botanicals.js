// Local x spans the flower face, y follows the spray, z points towards its viewer.
const { sin, cos, PI } = Math;
const turn = 2 * PI;
const origin = [0, 0, 0];
const translate = (point, delta) => point.map((n, i) => n + delta[i]);
const shade = (color, value) => color.map(n => Math.min(1, n * value));

function doubleJasmine({ blade, leaf, bud, twig, phase, dense }) {
  function head(center, radius, spin) {
    for (let ring = 0; ring < 3; ring++) {
      const n = [8, 7, 5][ring], length = radius * [1, .72, .40][ring];
      for (let i = 0; i < n; i++) {
        blade(translate(center, [0, 0, ring * radius * .12]), spin + turn * i / n + .48 * ring,
          length*(1+.035*cos(i+spin)), length * .47, radius * (.28 + .13 * ring),
          { curl: .22, roll: .15, rounded:true, tilt:.11*sin(i+spin) });
      }
    }
    bud(translate(center, [0, 0, radius * .48]), [.047, .06, .043]);
  }
  const main = [.03, .14, .06], side = [-.31, .36, -.04], tip = [.34, .38, -.10];
  twig(origin, main); twig(origin, side); twig(origin, tip);
  head(main, .32, phase); head(side, .21, phase + .6);
  bud(tip, [.092, .14, .094]);
  if (!dense) {
    const secondBud = [.25,.31,-.01];
    twig(tip,secondBud,.009); bud(secondBud,[.06,.08,.064]);
  }
  leaf(origin, [-.46, -.08, -.18], .12);
  leaf(origin, [.38, .02, -.20], .12);
}

function ranunculus({ sheet, P, paint, bead, phase, dense }) {
  // Broad, imbricated petals rise from a common receptacle, then turn their rims out.
  const layers = dense ? 5 : 7, sectors = dense ? 7 : 9;
  for (let layer = 0; layer < layers; layer++) {
    const ring = layer / (layers - 1), radius = .49 * (1 - .84 * ring);
    for (let i = 0; i < sectors; i++) {
      const a = phase + i * turn / sectors + layer * .35;
      sheet(dense ? 4 : 7, dense ? 3 : 5, (u, v) => {
        const side = 2 * u - 1;
        const angle = a + side * (.35 + .20 * sin(PI * v * .65)) + ring * .17 * v;
        const edge = radius * (1 - .11 * side * side);
        const radial = .032 + (edge - .032) * sin(PI * .49 * v);
        const z = -.19 + v * (.32 + .18 * ring) - .073 * side * side * v
          + .02 * sin(3 * side + i) * v * v;
        return P(radial * cos(angle), radial * sin(angle), z);
      }, (u, v) => paint(u, v, .99 - .05 * ring));
    }
  }
  const heart = [.58,.61,.37];
  for (let j=0; j<(dense?5:11); j++) {
    const t=(j+.5)/(dense?5:11), a=j*2.39996;
    bead([.045*Math.sqrt(t)*cos(a),.045*Math.sqrt(t)*sin(a),.222-.013*t],
      [.014,.013,.014],shade(heart,.90+.13*cos(a)));
  }
}

function oncidium({ blade, twig, bud, bead, phase, dense }) {
  function flower(tip, size, side, twist) {
    // Three slender upper sepals, two side petals and a generous scalloped dancing lip.
    for (let n = 0; n < 5; n++) {
      const a = -.32 + n * (PI + .64) / 4 + .18 * sin(twist);
      blade(tip, a, size * .17, size * .042, .045, { curl: .27, yaw:.84*cos(twist), tilt:.12*sin(twist), marked:true });
    }
    blade(tip, -PI / 2 + .15 * side, size * .22, size * .135, .045,
      { ruffle: .039, roll: .29, flare: true, yaw:.84*cos(twist), tilt:.12*sin(twist), rounded:true });
    bead(translate(tip, [0, .012, .039]), [.031*size, .032*size, .022*size], [.57,.30,.10]);
  }
  // The longer lower laterals carry more flowers; the tip remains light and in bud.
  let previous = origin;
  const forks = dense ? 3 : 4;
  for(let j=0; j<forks; j++){
    const t=(j+1)/(forks+1), side=j%2 ? 1 : -1;
    const axis=[.28*t*t,1.04*t,-.12*t];
    twig(previous,axis); previous=axis;
    const count=j<2 && !dense ? 3 : 2;
    let node=axis;
    for(let k=0;k<count;k++){
      const v=(k+1)/count;
      const next=translate(axis,[side*(.52-.20*t)*v,.23*v-.09*v*v,
        (.19*cos(phase+j)+.045*sin(k))*v]);
      twig(node,next,.012-.004*v); node=next;
      const tip=translate(node,[side*.035,.055,.08*cos(j*2+k+phase)]);
      twig(node,tip,.007);
      flower(tip,.74-.18*t+.055*sin(phase+k),side,phase+2*j+1.7*k);
    }
  }
  const neck=[.27,1.0,-.11], end=[.39,1.12,-.07];
  twig(previous,neck,.013); twig(neck,end,.009);
  bud(end,[.028,.041,.027]);
}

function peaceLily({ sheet, P, tint, bead, twig, dense }) {
  const ivory = [.91, .85, .59], cream = [.98, .92, .69];
  // A single swept, pointed spathe. Its basal edges curl toward the spadix.
  sheet(dense ? 9 : 19, dense ? 10 : 20, (u,v) => {
    const t = u * 2 - 1, arch = sin(PI * v);
    const width = .38 * arch ** .76 * (1 - .32 * v);
    return P(t * width + .15 * v * v, -.22 + 1.15 * v - .045 * t * t * arch,
      -.20 * arch + .27 * t * t * arch + .14 * v ** 4 + .021 * sin(5 * PI * v + t) * arch);
  }, (u,v) => {
    const ridge = Math.abs(2*u - 1);
    const vein = Math.max(0,cos(39*v - 4*ridge)) ** 5;
    return shade(tint, .90 + .07 * v - .045 * vein * sin(PI*v) - .065 * Math.exp(-15*ridge));
  });
  const root = [0,-.16,.025], end = [.027,.49,.27];
  twig(origin, root, .033);
  sheet(12,12,(u,v)=>{
    const radius = (.048 + .006 * sin(PI*v)) * (1 - .40 * v);
    return P(end[0]*v + radius*cos(turn*u),root[1]+(end[1]-root[1])*v,
      root[2]+(end[2]-root[2])*v+radius*sin(turn*u));
  }, (u,v)=>shade(ivory,.85+.13*v+.05*cos(3*turn*u)));
  for(let j=0; j<(dense?18:36); j++){
    const t=(j+.5)/(dense?18:36), a=j*2.399963, r=.043*(1-.35*t);
    bead([.027*t+r*cos(a),root[1]+.65*t,root[2]+.245*t+r*sin(a)], [.009,.010,.008],cream);
  }
  bead(end,[.029,.029,.029],cream);
}

function amaranth({ P, sheet, twig, leaf, paint, phase, dense }) {
  const stride = dense ? 13 : 23;
  for (let j=0; j<4; j++) {
    const a = phase + j*2.39996, length = [1.11,.83,.62,.49][j];
    const hook = [.24*cos(a),.27+.035*j,.21*sin(a)];
    twig(origin,hook,.022);
    const at = t => [hook[0]+(.16+.09*j)*cos(a)*sin(t*PI*.64)+.05*sin(5*t+j),
      hook[1]-t*length,hook[2]+(.15+.04*j)*sin(a)*sin(t*PI*.72)+.05*t];
    // Joined, tapering tassels with densely scalloped grain whorls along each axis.
    sheet(dense?8:13,stride*2,(u,t)=>{
      const p=at(t),angle=turn*u,whorl=.5+.5*cos(t*turn*stride+2*angle);
      const r=(.042+.041*sin(PI*t)**.48)*(1-.63*t)*(.77+.23*whorl+.055*sin(5*angle+19*t))*(1-.70*t**9);
      return P(p[0]+r*cos(angle),p[1]+.010*whorl*(1-t),p[2]+r*sin(angle));
    },(u,t)=>paint(u,.34+.53*(.5+.5*cos(t*stride*turn+2*turn*u))* (.84+.16*cos(turn*u*3+t*43))));
  }
  leaf(origin,[-.36,.20,-.16],.11);
  leaf(origin,[.32,.13,-.16],.10);
}

function rowan(ctx, fruit) {
  const {twig,leaf,phase,dense}=ctx, bark=0x766144;
  // The same woody spray carries both seasons, from the cut end to three terminal shoots.
  const low=[.02,.08,.02], bend=[.10,.27,-.12], shoulder=[.49,.66,-.17];
  const leader=[1.02,.94,-.02], left=[-.28,.18,.26], right=[.48,.37,-.41];
  const leftTip=[-.43,.23,.42], rightTip=[.64,.48,-.64];
  for(const [a,b,r] of [[origin,low,.029],[low,bend,.026],[bend,shoulder,.021],
    [shoulder,leader,.015],[low,left,.020],[left,leftTip,.014],
    [bend,right,.018],[right,rightTip,.012]]) twig(a,b,r,bark);

  function compound(start,delta,span,spin) {
    const rachis=t=>translate(start,[delta[0]*t,delta[1]*t+.09*sin(PI*t),delta[2]*t]);
    const pairs=dense?4:6;
    let prev=start;
    for(let j=1;j<=pairs;j++){
      const t=j/(pairs+1), base=rachis(t);
      twig(prev,base,.007,bark); prev=base;
      for (const sign of [-1,1]) {
        const w=span*(.68+.32*sin(PI*t))*sign;
        const tip=translate(base,[delta[0]*.20+w*cos(spin),
          delta[1]*.21+w*sin(spin)-.03*t,delta[2]*.26+w*.54]);
        leaf(base,tip,.042+.010*sin(PI*t),[.28+.03*t,.41+.04*t,.25],true);
      }
    }
    leaf(prev,rachis(1.14),.035,[.29,.43,.26],true);
  }
  compound(low,[-.68,-.17,.22],.18,1.07);
  compound(left,[-.40,.34,-.26],.16,.76);
  compound(bend,[.62,-.23,.42],.19,1.54);
  compound(shoulder,[-.33,.49,-.38],.17,.70);
  compound(right,[.54,.03,-.17],.14,1.91);
  compound(leader,[.46,.25,-.20],.13,1.27);
  compound(shoulder,[.55,.09,.35],.16,1.76);
  const heads=[[leader,fruit?.90:1.36],[leftTip,.79],[rightTip,.54]];
  for(const [j,[tip,scale]] of heads.entries()){
    const at=(x,y,z)=>translate(tip,[x*scale,y*scale,z*scale]);
    rowanCluster({
      P:(x,y,z)=>ctx.P(...at(x,y,z)), sheet:ctx.sheet, tint:ctx.tint,
      bead:(p,axes,color)=>ctx.bead(at(...p),axes.map(n=>n*scale),color),
      twig:(a,b,r,col)=>twig(at(...a),at(...b),r*scale,col),
      phase:phase+j*2.4,dense
    },fruit);
  }
}

function rowanCluster({twig,bead,sheet,P,tint,phase,dense},fruit){
  const crown=origin, bark=0x827354;
  if (!fruit) {
    // A shallow corymb, with longer outer stalks and small, outward-facing flowers.
    const tilt=.71+.21*sin(phase);
    const tipPoint=(x,y,z)=>translate(crown,[x,y*cos(tilt)-z*sin(tilt),y*sin(tilt)+z*cos(tilt)]);
    const groups=dense ? 5 : 8, florets=dense ? 4 : 6;
    for(let j=0;j<groups;j++){
      const angle=phase+j*2.399963, radius=.245*Math.sqrt((j+.36)/groups);
      const x=radius*cos(angle), z=radius*sin(angle);
      const forkTip=tipPoint(x*.80,.12,z*.80);
      twig(crown,forkTip,.010,bark);
      for(let k=0;k<florets;k++){
        const spread=.103*Math.sqrt(k/(florets-1)), phi=angle+k*2.399963;
        const cx=x+spread*cos(phi), cz=z+spread*sin(phi);
        const cy=.265-.76*(cx*cx+cz*cz)+.009*sin(j+2*k);
        const center=tipPoint(cx,cy,cz);
        twig(forkTip,center,.0045,bark);
        const yaw=Math.atan2(cz,cx), slope=.28+1.6*Math.hypot(cx,cz);
        const length=.062+.005*cos(j+phi);
        // Two curved strips per petal keep fine flowers inexpensive in full bouquets.
        for(let petal=0;petal<5;petal++){
          const spin=phi+petal*turn/5;
          sheet(2,4,(u,v)=>{
            const w=(2*u-1)*length*.56*sin(PI*v*.91)**.7;
            const along=length*v*cos(spin)-w*sin(spin);
            const across=length*v*sin(spin)+w*cos(spin);
            const rise=.012*v+.005*(2*u-1)**2*sin(PI*v);
            const radial=along*cos(slope)+rise*sin(slope);
            return P(...tipPoint(cx+radial*cos(yaw)-across*sin(yaw),
              cy-along*sin(slope)+rise*cos(slope),
              cz+radial*sin(yaw)+across*cos(yaw)));
          },(u,v)=>shade(tint,.86+.13*v));
        }
        bead(tipPoint(cx+.004*cos(yaw),cy+.006,cz+.004*sin(yaw)),[.010,.009,.010],[.84,.72,.47]);
      }
    }
    return;
  }
  const count=dense?6:9,subs=dense?4:6;
  for(let j=0;j<count;j++){
    const a=phase+j*2.39996, reach=.17+.12*Math.sqrt((j+.5)/count);
    const height=-.14-.12*sin(a+phase)-.06*cos(2*a);
    const branch=translate(crown,[reach*cos(a),height,reach*sin(a)]);
    twig(crown,branch,.013,bark);
    for(let k=0;k<subs;k++){
      const b=a+k*2.39996, r=.115+.035*cos(j+k);
      const tip=translate(branch,[r*cos(b), -.15+.07*cos(b),r*sin(b)+.035]);
      twig(branch,tip,.008,bark);
      const size=.054+.012*cos(b+j);
      const ripeness=.5+.5*cos(b*3+j);
      const color=[tint[0]*(.84+.16*ripeness),tint[1]*(.66+.73*ripeness),tint[2]*(.61+.29*ripeness)];
      bead(tip,[size,size*.95,size],color);
      bead(translate(tip,[0,-.018,size*.90]),[.014,.012,.008],[.29,.21,.14]);

    }
  }
}

const builders = {jasmine:doubleJasmine,ranunculus,oncidium,spathiphyllum:peaceLily,amaranth,
  rowanSpring:ctx=>rowan(ctx,false),rowanAutumn:ctx=>rowan(ctx,true)};

export function seasonalBotanical(form, {P,sheet,stem,tint,phase,dense,size=1}) {
  if (!Object.hasOwn(builders,form)) return false;
  const paint = (u,v,gain=1)=>shade(tint,(.76+.21*v+.035*Math.abs(2*u-1))*gain);
  const twig = (a,b,r=.017,hex=0x66835c)=>stem(P(...a),P(...b),r*size,hex);
  const bead = (point,axes,color=tint) => sheet(dense?5:8,dense?3:5,(u,v)=>{
    const a=turn*u, h=PI*v, r=sin(h);
    return P(point[0]+axes[0]*cos(a)*r,point[1]+axes[1]*cos(h),point[2]+axes[2]*sin(a)*r);
  }, (u,v)=>shade(color,.87+.10*(1-v)+.035*cos(turn*u)));
  const bud = (point,axes)=>bead(point,axes,shade(tint,.96));
  const leaf = (base,tip,width,color=[.31,.45,.31],toothed=false)=>{
    const dx=tip[0]-base[0],dy=tip[1]-base[1],len=Math.hypot(dx,dy)||1;
    sheet(4,toothed&&!dense?18:6,(u,v)=>{
      const serration=toothed && v>.22 && !dense ? .90+.10*cos(18*PI*v) : 1;
      const t=2*u-1,w=t*width*sin(PI*v)**.82*serration;
      return P(base[0]+dx*v-dy/len*w,base[1]+dy*v+dx/len*w,
        base[2]+(tip[2]-base[2])*v+.045*(1-t*t)*sin(PI*v));
    },(u,v)=>shade(color,.83+.19*v+.13*Math.abs(2*u-1)));
  };
  const blade=(point,a,length,width,lift,{curl=0,roll=0,ruffle=0,flare=false,small=false,rounded=false,tilt=0,yaw=0,marked=false}={})=>{
    sheet(small||dense?3:6,small||dense?4:7,(u,v)=>{
      const t=2*u-1, mid=sin(PI*v);
      const opening = rounded ? sin(PI*v*.79)**.70 : mid**.70;
      const w=width*t*(flare ? sin(PI*v*.79)**.63*(.35+1.1*v) : opening);
      const ang=a+curl*v, radial=length*v*(1-(rounded?.18:0)*v*t*t);
      const x = radial*cos(ang)-w*sin(ang);
      const depth=lift*(v+.54*mid)+roll*length*t*t*mid+ruffle*cos(6*t)*v*v+tilt*x;
      return P(point[0]+x*cos(yaw)+depth*sin(yaw),point[1]+radial*sin(ang)+w*cos(ang),
        point[2]+depth*cos(yaw)-x*sin(yaw));
    },(u,v)=>marked && v<.46 ? shade(paint(u,v),.54+.39*v) : paint(u,v));
  };
  builders[form]({P,sheet,twig,bead,bud,leaf,blade,paint,tint,phase,dense});
  return true;
}
