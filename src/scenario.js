// Original procedural scenery and litter. No external textures or stock assets.
// SPDX-License-Identifier: Apache-2.0
import * as THREE from 'three';
import { frameAt } from './timeline.js';

function randomGenerator(seed=31) {
  return ()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};
}

function surfaceTexture(base,spread,seed) {
  const rand=randomGenerator(seed),canvas=document.createElement('canvas');canvas.width=canvas.height=256;
  const ctx=canvas.getContext('2d'),image=ctx.createImageData(256,256);
  for(let i=0;i<image.data.length;i+=4){const noise=(rand()-.5)*spread;for(let c=0;c<3;c++)image.data[i+c]=base[c]+noise;image.data[i+3]=255;}
  ctx.putImageData(image,0,0);
  const texture=new THREE.CanvasTexture(canvas);texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.repeat.set(7,7);texture.colorSpace=THREE.SRGBColorSpace;
  return texture;
}

function box(group,name,dimensions,location,material) {
  const mesh=new THREE.Mesh(new THREE.BoxGeometry(...dimensions),material);mesh.name=name;
  mesh.position.fromArray(location);mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);return mesh;
}

function leaf(color,scale=1) {
  const shape=new THREE.Shape();shape.moveTo(-.024,0);shape.quadraticCurveTo(0,-.019,.026,0);shape.quadraticCurveTo(0,.019,-.024,0);
  const geometry=new THREE.ShapeGeometry(shape,5),positions=geometry.attributes.position;
  for(let i=0;i<positions.count;i++) positions.setZ(i,Math.abs(positions.getX(i))*.11);
  geometry.computeVertexNormals();
  const mesh=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({color,roughness:.7,side:THREE.DoubleSide}));mesh.scale.setScalar(scale);mesh.castShadow=true;
  return mesh;
}

function wrapper(color) {
  const geo=new THREE.PlaneGeometry(.035,.048,4,4),p=geo.attributes.position;
  for(let i=0;i<p.count;i++)p.setZ(i,Math.sin(i*3)*.003);
  geo.computeVertexNormals();
  const mesh=new THREE.Mesh(geo,new THREE.MeshStandardMaterial({color,roughness:.42,metalness:.15,side:THREE.DoubleSide}));mesh.castShadow=true;return mesh;
}

function bottle() {
  const group=new THREE.Group();
  const plastic=new THREE.MeshPhysicalMaterial({color:'#b9d0c2',roughness:.23,metalness:.08,transparent:true,opacity:.8});
  const body=new THREE.Mesh(new THREE.CylinderGeometry(.019,.021,.065,12),plastic);body.rotation.x=Math.PI/2;body.position.z=.034;group.add(body);
  const shoulder=new THREE.Mesh(new THREE.CylinderGeometry(.008,.019,.012,12),plastic);shoulder.rotation.x=Math.PI/2;shoulder.position.z=.072;group.add(shoulder);
  const cap=new THREE.Mesh(new THREE.CylinderGeometry(.009,.009,.009,12),new THREE.MeshStandardMaterial({color:'#416c54',roughness:.7}));cap.rotation.x=Math.PI/2;cap.position.z=.082;group.add(cap);
  const label=new THREE.Mesh(new THREE.CylinderGeometry(.021,.021,.021,12,1,true),new THREE.MeshStandardMaterial({color:'#e3d8b6',side:THREE.DoubleSide}));label.rotation.x=Math.PI/2;label.position.z=.034;group.add(label);
  group.traverse(o=>{if(o.isMesh)o.castShadow=true;});return group;
}

export function createScenario() {
  const root=new THREE.Group();root.name='Illustrative roadside channel';
  const random=randomGenerator();
  const concrete=new THREE.MeshStandardMaterial({color:'#999d92',map:surfaceTexture([160,160,147],38,3),roughness:.86});
  const curb=new THREE.MeshStandardMaterial({color:'#b9bbaa',map:surfaceTexture([189,187,171],30,8),roughness:.8});
  const asphalt=new THREE.MeshStandardMaterial({color:'#494e49',map:surfaceTexture([91,95,91],100,7),roughness:.37,metalness:.12});
  const silt=new THREE.MeshStandardMaterial({color:'#5f6754',roughness:.95});
  // Split the asphalt around the concrete apron: coplanar overlapping slabs
  // otherwise produce flickering depth patterns beneath the collection bin.
  box(root,'Wet asphalt',[3.2,7,.14],[-2.95,-1.2,-.07],asphalt);
  box(root,'Upstream road edge',[.8,4.22,.14],[-.95,-2.59,-.07],asphalt);
  box(root,'Downstream road edge',[.8,1.78,.14],[-.95,1.41,-.07],asphalt);
  box(root,'Channel floor',[.412,5,.10],[0,-1.4,-.51],concrete);
  box(root,'Channel left retaining wall',[.344,4.4,.36],[-.378,-1.6,-.28],concrete);
  const nearWall=box(root,'Channel right retaining wall',[.344,4.4,.36],[.378,-1.6,-.28],concrete);
  box(root,'Left upstream coping',[.344,3.7,.1],[-.378,-2,-.05],curb);
  const nearCoping=box(root,'Right upstream coping',[.344,3.7,.1],[.378,-2,-.05],curb);
  // Service pockets leave the docking controls accessible above the guide mouths.
  box(root,'Left maintenance apron',[.8,1,.1],[-.95,.02,-.05],concrete);
  box(root,'Right service edge',[.32,.8,.1],[.47,.15,-.05],curb);
  box(root,'Downstream inlet cover',[.75,.85,.10],[0,.83,-.05],concrete);
  box(root,'Dark drain outlet',[.4,.015,.4],[0,1.26,-.27],new THREE.MeshStandardMaterial({color:'#121c18',roughness:1}));
  for(let row=0;row<8;row++)for(let col=0;col<3;col++)
    box(root,'Sidewalk paver',[.47,.59,.12],[.79+col*.482,-3.65+row*.602,-.06],curb);
  box(root,'Verge soil',[1.2,6,.12],[2.60,-1,-.075],silt);
  const stripe=new THREE.MeshStandardMaterial({color:'#d5cdac',roughness:.58});
  for(let i=0;i<5;i++)if(i!==3)box(root,'Road edge paint',[.035,.68,.0015],[-.69,-3.5+i*1.12,.001],stripe);
  for(let i=0;i<55;i++) {
    const mesh=leaf(['#665a30','#7d6936','#4e633f'][i%3],.7+random()*.6);
    mesh.position.set(-2.7+random()*2,-3+random()*5,.006);mesh.rotation.z=random()*6.28;root.add(mesh);
  }
  // Sparse verge blades; instancing keeps the scene inexpensive to draw.
  const grass=new THREE.InstancedMesh(new THREE.ConeGeometry(.01,.14,3),new THREE.MeshStandardMaterial({color:'#62794b',roughness:1}),180);
  const dummy=new THREE.Object3D();
  for(let i=0;i<180;i++) {
    dummy.position.set(2.03+random()*.7,-3.6+random()*5.9,.02+random()*.025);
    dummy.rotation.set(Math.PI/2,0,random()*6);dummy.scale.setScalar(.4+random());dummy.updateMatrix();grass.setMatrixAt(i,dummy.matrix);
  }
  grass.castShadow=true;root.add(grass);
  // A portable collection bin on the maintenance apron, clear of the gutter.
  const bin=new THREE.Group();bin.position.set(-.90,0,0);root.add(bin);
  const binMat=new THREE.MeshStandardMaterial({color:'#5e6e58',roughness:.68});
  box(bin,'Bin base',[.48,.40,.025],[0,-.055,.0125],binMat);
  for(const x of [-.234,.234])box(bin,'Bin side',[.012,.40,.42],[x,-.055,.235],binMat);
  for(const y of [-.249,.139])box(bin,'Bin end',[.456,.012,.42],[0,y,.235],binMat);
  const rim=new THREE.MeshStandardMaterial({color:'#7b8c71',roughness:.62});
  for(const x of [-.24,.24])box(bin,'Bin rim',[.024,.42,.016],[x,-.055,.453],rim);
  for(const y of [-.255,.145])box(bin,'Bin rim',[.48,.02,.016],[0,y,.453],rim);
  // Water surface: procedural ripples, not a hydraulic solver.
  const waterGeo=new THREE.PlaneGeometry(.400,4.9,12,85);
  const water=new THREE.Mesh(waterGeo,new THREE.MeshPhysicalMaterial({color:'#829990',metalness:.12,roughness:.18,transparent:true,opacity:.76,depthWrite:false,clearcoat:1,clearcoatRoughness:.12}));
  water.position.set(0,-1.4,-.405);root.add(water);
  const waveBase=Float32Array.from(waterGeo.attributes.position.array);
  const streams=new THREE.Group();root.add(streams);
  for(let i=0;i<24;i++) {
    const streak=new THREE.Mesh(new THREE.PlaneGeometry(.002,.045+random()*.09),new THREE.MeshBasicMaterial({color:'#d3ddd0',transparent:true,opacity:.3,depthWrite:false}));
    streak.userData.seed=random();streak.position.x=(random()-.5)*.36;streak.position.z=-.400;streams.add(streak);
  }
  const dropsCount=280,rainGeo=new THREE.BufferGeometry(),rainPositions=new Float32Array(dropsCount*6),seeds=[];
  for(let i=0;i<dropsCount;i++)seeds.push([random()*4-2.3,random()*4-2.5,random()*2]);
  rainGeo.setAttribute('position',new THREE.BufferAttribute(rainPositions,3));
  const rain=new THREE.LineSegments(rainGeo,new THREE.LineBasicMaterial({color:'#b2c5bc',transparent:true,opacity:.30,depthWrite:false}));root.add(rain);
  const litter=[];
  for(let i=0;i<16;i++) {
    const mesh=i===0?bottle():i%4===0?wrapper(i%8===0?'#e6dbc4':'#af7548'):leaf(['#866a2f','#655839','#977948'][i%3],.7+random()*.3);
    const x=i===0?-.08:(random()-.5)*.28;
    const targetY=-.061+(random()-.5)*.015;
    const targetZ=-.440+(i===0?0:random()*.010);
    mesh.rotation.z=random()*6.28;
    root.add(mesh);litter.push({mesh,x,targetY,targetZ,startY:-.6-random()*2.3,arrival:3.3+random()*3.8});
  }
  let rainOn=true;
  return {
    root,
    setRain(value){rainOn=value;rain.visible=value;},
    setCutaway(value){nearWall.visible=!value;nearCoping.visible=!value;},
    update(time,product) {
      const frame=frameAt(time),flowTime=time;
      const p=waterGeo.attributes.position;
      for(let i=0;i<p.count;i++)p.setZ(i,Math.sin(waveBase[i*3+1]*42-flowTime*5+waveBase[i*3]*6)*.0013+Math.cos(waveBase[i*3]*65+flowTime*3)*.0006);
      p.needsUpdate=true;waterGeo.computeVertexNormals();
      streams.children.forEach(s=>{s.position.y=-3.7+((flowTime*.23+s.userData.seed*4.4)%4.4);});
      if(rainOn){for(let i=0;i<dropsCount;i++) {
        const [x,y,seed]=seeds[i],z=2-((seed+flowTime*1.2)%2),offset=i*6;
        rainPositions.set([x,y,z,x+.006,y-.006,z-.045],offset);
      }rainGeo.attributes.position.needsUpdate=true;}
      const basket=product.position('basket-a');
      litter.forEach((item,i)=>{
        const progress=Math.min(1,time/item.arrival);
        if(time<8) {
          const easing=1-(1-progress)**2;
          item.mesh.position.set(item.x,item.startY+(item.targetY-item.startY)*easing,-.400+(item.targetZ+.400)*easing);
        } else if(frame<=325) item.mesh.position.set(basket.x+item.x,basket.y+item.targetY,basket.z+item.targetZ);
        else {
          const t=Math.min(1,(frame-325)/60),forward=Math.min(1,t*2),fall=Math.max(0,(t-.4)/.6);
          item.mesh.position.set(-.9+item.x,item.targetY-.12*forward,1+item.targetZ+( .031+ i*.001-(1+item.targetZ))*fall);
        }
      });
      bin.visible=time>=7.5;
    },
  };
}
