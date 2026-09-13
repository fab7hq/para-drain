"""Deterministic validation of the final shared product solids and translated motion.
SPDX-License-Identifier: Apache-2.0
"""
from pathlib import Path
import hashlib, itertools, json, math

ROOT=Path(__file__).resolve().parents[1]
TOL=1e-7


def components(mesh):
    assert len(mesh['vertices'])==8*len(mesh['components'])
    return {name:tuple((min(v[axis] for v in mesh['vertices'][i*8:i*8+8]),
                       max(v[axis] for v in mesh['vertices'][i*8:i*8+8])) for axis in range(3))
            for i,name in enumerate(mesh['components'])}


def overlap(a,b):
    return all(min(x[1],y[1])-max(x[0],y[0])>TOL for x,y in zip(a,b))


def swept_hit(a,b,pa,pb,qa,qb):
    enter,leave=0.,1.
    for axis in range(3):
        lower=b[axis][0]-a[axis][1]+TOL; upper=b[axis][1]-a[axis][0]-TOL
        start=pa[axis]-pb[axis]; speed=(qa[axis]-qb[axis])-start
        if abs(speed)<1e-12:
            if not lower<start<upper:return False
        else:
            lo,hi=sorted(((lower-start)/speed,(upper-start)/speed))
            enter,leave=max(enter,lo),min(leave,hi)
            if enter>=leave:return False
    return enter<leave


def position(obj,frame):
    keys=obj['motion']
    if not keys:return obj['position']
    if frame<=keys[0]['frame']:return keys[0]['position']
    for a,b in zip(keys,keys[1:]):
        if frame<=b['frame']:
            t=(frame-a['frame'])/(b['frame']-a['frame'])
            return tuple(x+(y-x)*t for x,y in zip(a['position'],b['position']))
    return keys[-1]['position']


def validate():
    path=ROOT/'public/model/paradrain.json'; data=json.loads(path.read_text())
    objects={o['id']:o for o in data['objects']}
    geometry={id:components(data['meshes'][o['mesh']]) for id,o in objects.items()}
    assert objects['basket-a']['mesh']==objects['basket-b']['mesh']
    for name in ['basket-a','service-retainer','keeper-a-left','keeper-a-right']:
        for (na,ba),(nb,bb) in itertools.combinations(geometry[name].items(),2):
            assert not overlap(ba,bb),(name,na,nb)
    body=geometry['basket-a']; gate=geometry['service-retainer']
    def bounds(parts):return tuple((min(b[i][0] for b in parts.values()),max(b[i][1] for b in parts.values())) for i in range(3))
    size=[hi-lo for lo,hi in bounds(body)]
    assert all(abs(a-b)<TOL for a,b in zip(size,[.404,.112,.45]))
    assert abs(.12-size[1]-.008)<TOL
    for prefix,source in [('bar_',body),('floor_bar_',body),('roof_bar_',body),('retainer_bar_',gate)]:
        bars=sorted(b for n,b in source.items() if n.startswith(prefix)); assert len(bars)==14
        assert all(abs(b[0][0]-a[0][1]-.018)<TOL for a,b in zip(bars,bars[1:]))
    for name in ['keeper-a-left','keeper-a-right']:
        assert any(swept_hit(g,p,[0,0,0],[0,0,0],[0,0,.004],[0,0,0]) for g in gate.values() for p in geometry[name].values())
    knots=sorted({1,1008}|{k['frame'] for o in objects.values() for k in o['motion']})
    poses={f:{n:position(o,f) for n,o in objects.items()} for f in knots}
    pairs=[(a,b) for a,b in itertools.combinations(objects,2) if objects[a]['motion'] or objects[b]['motion']]
    checks=0
    for f,g in zip(knots,knots[1:]):
        boxes={n:tuple((lo+min(poses[f][n][i],poses[g][n][i]),hi+max(poses[f][n][i],poses[g][n][i])) for i,(lo,hi) in enumerate(bounds(parts))) for n,parts in geometry.items()}
        for a,b in pairs:
            if not overlap(boxes[a],boxes[b]):continue
            for na,ba in geometry[a].items():
                for nb,bb in geometry[b].items():
                    checks+=1
                    assert not swept_hit(ba,bb,poses[f][a],poses[f][b],poses[g][a],poses[g][b]),(f,g,a,na,b,nb)
    masses={}
    for name,density in [('basket-a',1900),('service-retainer',1900),('keeper-a-left',7850),('keeper-a-right',7850)]:
        masses[name]=density*sum(math.prod(hi-lo for lo,hi in b) for b in geometry[name].values())
    assert abs(sum(masses.values())-data['mass']['modeled_lift_assembly_kg'])<1e-6
    return {'status':'PASS','version':data['version'],'data_sha256':hashlib.sha256(path.read_bytes()).hexdigest(),
            'objects':len(objects),'motion_intervals':len(knots)-1,'continuous_component_pairs':checks,
            'checks':['Shared baskets and final 0.1 envelope','18 mm screen, floor, roof and retainer gaps',
                      'Positive keeper obstruction','Non-overlapping component shells','Continuous product-motion clearance',
                      'Modeled mass matches product dataset'],
            'mass_kg':sum(masses.values()),
            'scope':'Product geometry only; tapered guides use conservative bounding solids. Site, fluids, litter dynamics and loads are not qualified.'}


if __name__=='__main__':
    report=validate(); out=ROOT/'evidence/geometry-validation.json';out.parent.mkdir(exist_ok=True)
    out.write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2))
