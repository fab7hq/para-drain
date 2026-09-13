import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const product = JSON.parse(readFileSync(new URL('../public/model/paradrain.json', import.meta.url)));
const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-7, `${a} != ${b}`);

test('final 0.1 model has two identical baskets', () => {
  assert.equal(product.version, '0.1.0');
  assert.equal(product.name, 'ParaDrain');
  assert.equal(product.marking.text, 'PARADRAIN UPSTREAM');
  assert.equal(product.marking.align, 'center');
  assert.equal(product.marking.position[0], 0);
  assert.ok(product.marking.width_m <= .1);
  assert.ok(product.marking.height_m <= .0075);
  assert.equal(product.status, 'final-design');
  const a = product.objects.find(o => o.id === 'basket-a');
  const b = product.objects.find(o => o.id === 'basket-b');
  assert.equal(a.mesh, b.mesh);
  near(b.position[1] - a.position[1], .12);
  const mesh = product.meshes[a.mesh];
  for (const [axis, expected] of [[0,.404],[1,.112],[2,.450]]) {
    const values = mesh.vertices.map(v => v[axis]);
    near(Math.max(...values) - Math.min(...values), expected);
  }
  assert.equal(mesh.components.filter(n => n.startsWith('roof_bar_')).length, 14);
  assert.equal(mesh.components.filter(n => n.startsWith('floor_bar_')).length, 14);
});

test('public geometry preserves collection and mechanism components', () => {
  assert.equal(product.objects.length, 17);
  for (const id of ['service-retainer','keeper-a-left','keeper-a-right','keeper-b-left','keeper-b-right','linked-pusher','front-bolt-right']) {
    assert.ok(product.objects.some(o => o.id === id), id);
  }
  near(product.dimensions.station_pitch_mm, 120);
  near(product.dimensions.inter_basket_clearance_mm, 8);
  near(product.mass.modeled_lift_assembly_kg, 4.638590234049624);
});
