import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { frameAt, sampleMotion, siteKeys, phaseAt } from '../src/timeline.js';
const data=JSON.parse(readFileSync(new URL('../public/model/paradrain.json',import.meta.url)));
const objects=Object.fromEntries(data.objects.map(o=>[o.id,o]));
const pose=(id,frame)=>sampleMotion(siteKeys(objects[id]),frame,objects[id].position);
const near=(a,b)=>a.forEach((v,i)=>assert.ok(Math.abs(v-b[i])<1e-7,`${a} != ${b}`));

test('timeline handles intro, scrubbing and its final hold',()=>{
  assert.equal(frameAt(0),1);assert.equal(frameAt(8),1);assert.equal(frameAt(34),504);
  assert.equal(phaseAt(20).short,'Empty');
  near(sampleMotion([{frame:1,position:[0,0,0]},{frame:3,position:[2,4,6]}],2),[1,2,3]);
});
test('roadside carry poses keep the retainer and both keepers attached during the loaded lift',()=>{
  for(let frame=73;frame<=277;frame++) {
    const basket=pose('basket-a',frame);
    near(pose('service-retainer',frame),basket);
    near(pose('keeper-a-left',frame),basket);near(pose('keeper-a-right',frame),basket);
  }
});
test('public demonstration preserves transfer, docking and reset order',()=>{
  near(pose('basket-b',193),[0,.12,0]);near(pose('basket-b',241),[0,0,0]);
  near(pose('linked-pusher',253),[0,-.12,0]);near(pose('front-bolt-right',253),[0,0,0]);
  near(pose('linked-pusher',277),[0,0,0]);near(pose('basket-a',469),[0,.12,0]);
  near(pose('rear-bolt-right',481),[0,0,0]);
});
test('each identical basket takes both roles in the canonical motion',()=>{
  near(sampleMotion(objects['basket-a'].motion,504),[0,.12,0]);
  near(sampleMotion(objects['basket-b'].motion,504),[0,0,0]);
  near(sampleMotion(objects['basket-a'].motion,1008),[0,0,0]);
  near(sampleMotion(objects['basket-b'].motion,1008),[0,.12,0]);
});
