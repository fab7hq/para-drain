// Generate the specification table, dimension drawing and browser guide.
// SPDX-License-Identifier: Apache-2.0
import { readFileSync, writeFileSync, mkdirSync, readdirSync, copyFileSync } from 'node:fs';
import { marked } from 'marked';
const product=JSON.parse(readFileSync('public/model/paradrain.json','utf8'));
const d=product.dimensions;
const rows=[['Rear-screen width',d.rear_screen_width_mm],['Basket height',d.height_mm],['Rear-screen depth',d.rear_screen_depth_mm],
  ['Body width including keeper sleeves',d.body_width_mm],['Full basket depth',d.body_depth_mm],['Withdrawn keeper envelope width',d.keeper_open_width_mm],
  ['Station centre spacing',d.station_pitch_mm],['Clearance between basket bodies',d.inter_basket_clearance_mm],
  ['Internal clear slot',d.internal_slot_mm],['Running guide opening',d.guide_running_width_mm],['Flared mouth opening',d.guide_mouth_width_mm],
  ['Main handle clear width',d.handle_clear_width_mm],['Main handle clear height',d.handle_clear_height_mm]];
const table='| Parameter | Nominal value |\n|---|---:|\n'+rows.map(([n,v])=>`| ${n} | ${v} mm |`).join('\n');
const specPath='docs/specification.md';
let specification=readFileSync(specPath,'utf8').replace(/<!-- DIMENSIONS:START -->[\s\S]*?<!-- DIMENSIONS:END -->/,`<!-- DIMENSIONS:START -->\n${table}\n<!-- DIMENSIONS:END -->`);
writeFileSync(specPath,specification);
const body=product.meshes[product.objects.find(o=>o.id==='basket-a').mesh];
const retainer=product.meshes[product.objects.find(o=>o.id==='service-retainer').mesh];
function projection(mesh,axis,xOrigin,scale,color,offset=0){
  return mesh.components.map((name,i)=>{
    const vs=mesh.vertices.slice(i*8,i*8+8),xs=vs.map(v=>(v[axis]+offset)*scale),zs=vs.map(v=>120-v[2]*720);
    const x=xOrigin+Math.min(...xs),y=Math.min(...zs),w=Math.max(...xs)-Math.min(...xs),h=Math.max(...zs)-y;
    return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${color}" fill-opacity=".35" stroke="${color}" stroke-width=".6"><title>${name}</title></rect>`;
  }).join('');
}
const line=(x1,y1,x2,y2,label,tx,ty)=>`<path d="M${x1} ${y1}L${x2} ${y2}" stroke="#526356" marker-start="url(#arrow)" marker-end="url(#arrow)"/><text x="${tx}" y="${ty}" text-anchor="middle" class="dimension">${label}</text>`;
const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1100 600" role="img" aria-label="Front and side views of the final drain-filter basket with nominal dimensions in millimetres">
<defs><marker id="arrow" orient="auto-start-reverse" markerWidth="6" markerHeight="6" refX="3" refY="3"><path d="M6 0L0 3L6 6" fill="none" stroke="#526356"/></marker></defs>
<style>text{font-family:Arial,sans-serif;fill:#294a38}.dimension{font-size:14px}.small{font-size:12px;fill:#66775e}.heading{font-size:18px;font-weight:600}</style>
<rect width="1100" height="600" fill="#f4f5ee"/><text x="42" y="40" class="heading">PARADRAIN / FINAL 0.1</text><text x="42" y="64" class="small">Nominal geometry · Dimensions in mm · Fabrication and site qualification pending</text>
${projection(body,0,225,720,'#3d7457')}${projection(body,1,650,1500,'#3d7457')}${projection(body,1,650,1500,'#3d7457',.12)}${projection(retainer,1,650,1500,'#bd813b')}
${line(79.56,473,370.44,473,'404 incl. sleeves',225,495)}${line(55,120,55,444,'450',36,290)}
${line(500.75,473,668.75,473,'112',584,495)}${line(650,97,830,97,'120 station pitch',740,87)}
<path d="M650 104V115M830 104V115" stroke="#526356"/><text x="225" y="532" text-anchor="middle" class="heading">FRONT</text><text x="740" y="532" text-anchor="middle" class="heading">SIDE / TWO STATIONS</text>
<path d="M905 270h90m-12-7l12 7-12 7" fill="none" stroke="#bd813b" stroke-width="2"/><text x="950" y="296" text-anchor="middle" class="small">FLOW</text>
<text x="42" y="574" class="small">Green: identical basket bodies · Gold: service retainer · Rear screen 400 wide · Internal slots 18 · Body gap 8</text></svg>`;
mkdirSync('public/media',{recursive:true});writeFileSync('public/media/dimensions.svg',svg);
let html=marked.parse(specification);
html=html.replaceAll('../public/','./').replace(/href="(?:\.\.\/)?(?!https?:)([^"#]+\.md)"/g,'href="./docs/$1"');
// Relative document links inside the source spec target its sibling documents.
html=html.replaceAll('./docs/docs/','./docs/');
writeFileSync('technical.html',`<!doctype html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="ParaDrain 0.1 drain-filter technical specification, dimensions, service procedure and qualification targets."><title>Technical guide — ParaDrain 0.1</title><link rel="canonical" href="https://paradrain.getfab7.com/technical.html"><link rel="icon" href="./favicon.svg" type="image/svg+xml"><link rel="stylesheet" href="/src/style.css"></head><body><header class="masthead"><a class="brand" href="./"><span class="brand-mark">Ⅱ</span>PARADRAIN</a><nav aria-label="Resources"><a href="./">Back to demonstration</a><a href="./model/paradrain.blend" download>Blender model ↓</a></nav></header><main class="technical"><p class="eyebrow">TECHNICAL GUIDE / FINAL 0.1</p><p><a href="./docs/specification.md" download>Download Markdown specification</a> · <a href="./model/paradrain.json" download>Download geometry data</a></p>${html}</main><footer><span>PARADRAIN / FINAL 0.1</span><span>Made with <a href="https://getfab7.com">Fab7 / RingFrame</a></span><a href="./LICENSE">Apache 2.0</a></footer></body></html>`);
mkdirSync('public/docs',{recursive:true});
for(const name of readdirSync('docs')) if(name.endsWith('.md')) writeFileSync(`public/docs/${name}`,readFileSync(`docs/${name}`,'utf8').replaceAll('../public/','../'));
mkdirSync('public/evidence',{recursive:true});
for(const name of readdirSync('evidence')) if(name.endsWith('.json')) copyFileSync(`evidence/${name}`,`public/evidence/${name}`);
for(const name of ['LICENSE','NOTICE','THIRD_PARTY_NOTICES.txt'])copyFileSync(name,`public/${name}`);
console.log('Generated specification table, dimension drawing and technical HTML.');
