// SPDX-License-Identifier: Apache-2.0
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { createProduct } from './product.js';
import { createScenario } from './scenario.js';
import { DURATION, phaseAt, phases } from './timeline.js';

const $=id=>document.getElementById(id);
let time=0, playing=false, product, scenario, renderer, camera, controls;
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
const phaseButtons=phases.map((phase,index)=>{
  const button=document.createElement('button');
  button.innerHTML=`<span>${String(index+1).padStart(2,'0')}</span>${phase.short}`;
  button.addEventListener('click',()=>seek(phase.at)); $('chapters').append(button); return button;
});

function syncUI() {
  const phase=phaseAt(time), index=phases.indexOf(phase);
  $('phase-title').textContent=phase.title; $('phase-detail').textContent=phase.detail;
  $('chapter-number').textContent=String(index+1).padStart(2,'0');
  phaseButtons.forEach((b,i)=>i===index?b.setAttribute('aria-current','step'):b.removeAttribute('aria-current'));
  $('timeline').value=time; $('time').textContent=`00:${String(Math.floor(time)).padStart(2,'0')} / 00:34`;
  $('play').textContent=playing?'Ⅱ':'▶'; $('play').setAttribute('aria-label',playing?'Pause demonstration':'Play demonstration');
}
function seek(next) { time=Math.max(0,Math.min(DURATION,next)); syncUI(); }
function togglePlay() { if(time===DURATION) time=0; playing=!playing; syncUI(); }
$('play').addEventListener('click',togglePlay);
$('start').addEventListener('click',()=>{time=0;playing=true;syncUI();if(innerWidth<720)$('viewport').scrollIntoView({behavior:reducedMotion?'instant':'smooth',block:'center'});});
$('restart').addEventListener('click',()=>{playing=false;seek(0);});
$('timeline').addEventListener('input',event=>{playing=false;seek(Number(event.target.value));});
document.addEventListener('keydown',event=>{if(event.code==='Space' && event.target===document.body){event.preventDefault();togglePlay();}});
let cutaway=false, rain=true, view='site';
$('cutaway').addEventListener('click',()=>{cutaway=!cutaway;product?.setCutaway(cutaway);scenario?.setCutaway(cutaway);$('cutaway').setAttribute('aria-pressed',cutaway);});
$('rain').addEventListener('click',()=>{rain=!rain;scenario?.setRain(rain);$('rain').textContent=rain?'Rain on':'Rain off';$('rain').setAttribute('aria-pressed',rain);});
function setView(next) {
  view=next;
  $('site').setAttribute('aria-pressed',view==='site');$('closeup').setAttribute('aria-pressed',view==='product');
  $('view-label').textContent=view==='site'?'ROADSIDE CHANNEL':'PRODUCT DETAIL';
  if(!camera)return;
  if(view==='site'){camera.position.set(.90,-1.65,1.1);controls.target.set(-.06,-.1,-.17);}
  else{camera.position.set(.70,-1.0,.46);controls.target.set(0,.04,-.23);}
  controls.update();
}
$('site').addEventListener('click',()=>setView('site'));$('closeup').addEventListener('click',()=>setView('product'));
syncUI();

async function start() {
  const data=await fetch('./model/paradrain.json').then(r=>{if(!r.ok)throw Error('Model unavailable');return r.json();});
  const host=$('viewport');
  renderer=new THREE.WebGLRenderer({antialias:true,alpha:false});
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;
  renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.94;
  host.append(renderer.domElement);
  const scene=new THREE.Scene();scene.background=new THREE.Color('#dce2d5');
  const pmrem=new THREE.PMREMGenerator(renderer);const room=new RoomEnvironment();
  scene.environment=pmrem.fromScene(room,.04).texture;scene.environmentIntensity=.55;room.dispose();pmrem.dispose();
  camera=new THREE.PerspectiveCamera(38,1,.01,60);camera.up.set(0,0,1);
  controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.07;
  controls.minDistance=.45;controls.maxDistance=8;controls.maxPolarAngle=Math.PI*.49;
  const ambient=new THREE.HemisphereLight('#f3f5e8','#5c7168',1.3);ambient.up.set(0,0,1);ambient.position.set(0,0,5);scene.add(ambient);
  const sun=new THREE.DirectionalLight('#fff0d4',2.8);sun.position.set(-2,-3,5);sun.castShadow=true;
  sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-3,right:3,top:3,bottom:-3,near:.1,far:15});sun.shadow.normalBias=.003;scene.add(sun);
  product=createProduct(data);scene.add(product.root);
  scenario=createScenario();scene.add(scenario.root);
  setView('site');
  const resize=()=>{const w=host.clientWidth,h=host.clientHeight;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();};
  new ResizeObserver(resize).observe(host);resize();
  $('loading').hidden=true;document.body.dataset.ready='true';
  let previous=performance.now(),manualCamera=false;
  controls.addEventListener('start',()=>{manualCamera=true;});
  for(const id of ['start','restart','site']) $(id).addEventListener('click',()=>{manualCamera=false;});
  renderer.setAnimationLoop(now=>{
    const delta=Math.min((now-previous)/1000,.05);previous=now;
    if(playing){time=Math.min(DURATION,time+delta);if(time===DURATION)playing=false;syncUI();}
    product.update(time);scenario?.update(time,product);
    if(view==='site' && !manualCamera){
      const t=Math.max(0,Math.min(1,(time-7)/2));
      camera.position.lerpVectors(new THREE.Vector3(.90,-1.65,1.1),new THREE.Vector3(2,-3.1,2.5),t);
      controls.target.lerpVectors(new THREE.Vector3(-.06,-.1,-.17),new THREE.Vector3(-.45,-.03,.45),t);
    }
    controls.update();renderer.render(scene,camera);
  });
  // Expose a read-only diagnostic surface for repeatable browser verification.
  window.demoState=()=>({time,playing,phase:phaseAt(time).short,version:data.version,actors:data.objects.length,markings:product.root.children.flatMap(o=>o.children.map(c=>c.name)),cutaway,rain,view,webgl:renderer.capabilities.isWebGL2});
}
start().catch(error=>{
  console.error(error);$('loading').hidden=true;$('fallback').hidden=false;document.body.dataset.ready='failed';
  for(const id of ['play','start','restart','site','closeup','cutaway','rain','timeline'])$(id).disabled=true;
});
