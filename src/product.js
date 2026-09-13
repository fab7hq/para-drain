// SPDX-License-Identifier: Apache-2.0
import * as THREE from 'three';
import { frameAt, sampleMotion, siteKeys } from './timeline.js';

function geometryFrom(record, cut=false) {
  const positions=[];
  for (const face of record.faces) {
    const component=record.components[Math.floor(face[0]/8)];
    if (cut && (component==='collection_wall_right' || component.endsWith('_right') && /wall|beam|liner|track|bearing/.test(component))) continue;
    for(let i=1; i<face.length-1; i++) {
      for(const index of [face[0],face[i],face[i+1]]) positions.push(...record.vertices[index]);
    }
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geometry.computeVertexNormals();
  return geometry;
}

function faceMarking(marking) {
  const canvas=document.createElement('canvas'); canvas.width=1024; canvas.height=80;
  const ctx=canvas.getContext('2d'); ctx.clearRect(0,0,1024,80);
  ctx.fillStyle='#edf3d9'; ctx.font='600 64px sans-serif'; ctx.textAlign='center';
  const metrics=ctx.measureText(marking.text);
  ctx.fillText(marking.text,512,40+(metrics.actualBoundingBoxAscent-metrics.actualBoundingBoxDescent)/2,1000);
  const texture=new THREE.CanvasTexture(canvas); texture.colorSpace=THREE.SRGBColorSpace;
  const mark=new THREE.Mesh(new THREE.PlaneGeometry(marking.width_m,marking.height_m),new THREE.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false}));
  mark.name=marking.text;
  mark.position.fromArray(marking.position); mark.rotation.x=Math.PI/2;
  return mark;
}

export function createProduct(data) {
  const root=new THREE.Group(); root.name=`${data.name} ${data.version}`;
  const actors=new Map(); const geometries=new Map();
  for(const [id,record] of Object.entries(data.meshes)) geometries.set(id,{full:geometryFrom(record),cut:geometryFrom(record,true)});
  for(const record of data.objects) {
    let color='#6b777b', metalness=.65, roughness=.32;
    if(record.id.startsWith('basket')) {color='#2c6756';metalness=.1;roughness=.4;}
    if(/polymer|flared|slider-guide/.test(record.id)) {color='#263b3a';metalness=0;roughness=.48;}
    if(record.id==='linked-pusher') color='#448996';
    if(record.id==='service-retainer' || record.id.includes('bolt')) {color='#cd8d3e';metalness=.45;roughness=.33;}
    const mesh=new THREE.Mesh(geometries.get(record.mesh).full,new THREE.MeshStandardMaterial({color,metalness,roughness}));
    mesh.name=record.id; mesh.castShadow=true; mesh.receiveShadow=true;
    mesh.position.fromArray(record.position); root.add(mesh);
    if(record.id.startsWith('basket')) mesh.add(faceMarking(data.marking));
    actors.set(record.id,{mesh,record,keys:siteKeys(record)});
  }
  return {
    root,
    update(time) {
      const frame=frameAt(time);
      for(const {mesh,record,keys} of actors.values()) {
        mesh.position.fromArray(sampleMotion(keys,frame,record.position));
        if(record.id==='service-retainer') mesh.visible=time>=8 && frame<350;
      }
    },
    position(id) { return actors.get(id).mesh.position.clone(); },
    setCutaway(value) {
      for(const {mesh,record} of actors.values()) mesh.geometry=geometries.get(record.mesh)[value?'cut':'full'];
    },
  };
}
