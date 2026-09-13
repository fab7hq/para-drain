// SPDX-License-Identifier: Apache-2.0
export const DURATION = 34;
export const INTRO = 8;
export const phases = [
  {at:0, title:'Rain meets street litter', short:'Collect', detail:'Runoff carries leaves and packaging into the outer basket. The second basket waits behind it.'},
  {at:8, title:'Close before lifting', short:'Secure', detail:'Slide in the service retainer and engage both keeper pins. Captured litter is enclosed before the frame bolts release.'},
  {at:11.5, title:'Lift the load together', short:'Lift', detail:'The floor supports the litter. The side walls, slotted top and secured retainer travel with the basket.'},
  {at:16, title:'Bring the backup forward', short:'Transfer', detail:'Release the rear bolts, push both sides forward together, dock the basket, then reset the pusher.'},
  {at:19.5, title:'Empty over the collection bin', short:'Empty', detail:'Withdraw the keeper pins and remove the retainer over the bin. Empty the basket manually.'},
  {at:24, title:'Return it as the backup', short:'Return', detail:'Lower the empty basket into the rear guides with its upstream mouth open. Dock it; the two baskets have exchanged roles.'},
];

export function phaseAt(time) { return phases.findLast(p => p.at <= time) ?? phases[0]; }
export function frameAt(time) { return Math.max(1, Math.min(504, 1 + (time - INTRO) * 24)); }

export function sampleMotion(keys, frame, fallback = [0,0,0]) {
  if (!keys.length) return [...fallback];
  if (frame <= keys[0].frame) return [...keys[0].position];
  for (let i=1; i<keys.length; i++) {
    if (frame <= keys[i].frame) {
      const a=keys[i-1], b=keys[i], t=(frame-a.frame)/(b.frame-a.frame);
      return a.position.map((x,axis)=>x+(b.position[axis]-x)*t);
    }
  }
  return [...keys.at(-1).position];
}

// The roadside bin sits on the pavement. Only free-space carry heights and
// lateral holding positions are adapted; dock, guide, keeper and pusher strokes
// remain the exported product motions. This is an illustration, not a load test.
export function siteKeys(object) {
  if (!object.id.startsWith('basket-') && !object.id.startsWith('keeper-') && object.id !== 'service-retainer') return object.motion;
  return object.motion.map(key => {
    let [x,y,z]=key.position;
    if (x < -.5) x -= Math.abs(x + .65) < .03 ? .25 : .4;
    if (Math.abs(z-.5)<1e-6) z=1.10;
    else if (Math.abs(z-.15)<1e-6) z=1.00;
    else if (Math.abs(z-.65)<1e-6) z=1.60;
    return {frame:key.frame, position:[x,y,z]};
  });
}
