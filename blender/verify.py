"""Verify the saved Blender product against the authoritative shared geometry.
SPDX-License-Identifier: Apache-2.0
"""
from pathlib import Path
from mathutils import Vector
import json, bpy

ROOT=Path(__file__).resolve().parents[1]


def verify():
    product=json.loads((ROOT/'public/model/paradrain.json').read_text())
    scene=bpy.context.scene
    actors={o['product_id']:o for o in scene.objects if 'product_id' in o}
    assert set(actors)=={o['id'] for o in product['objects']}
    assert len(bpy.data.scenes)==1, 'Unexpected scenes remain in the public model'
    assert len(bpy.data.workspaces)==1, 'Unused workspaces remain in the public model'
    max_error=0
    for record in product['objects']:
        ob=actors[record['id']]; mesh=product['meshes'][record['mesh']]
        assert [list(p.vertices) for p in ob.data.polygons]==mesh['faces']
        assert json.loads(ob.data['components'])==mesh['components']
        for actual,expected in zip(ob.data.vertices,mesh['vertices'],strict=True):
            max_error=max(max_error,max(abs(a-b) for a,b in zip(actual.co,expected)))
        for key in record['motion']:
            scene.frame_set(key['frame'])
            assert max(abs(a-b) for a,b in zip(ob.location,key['position']))<1e-7
    assert max_error<1e-7
    assert actors['basket-a'].data is actors['basket-b'].data
    scene.frame_set(1)
    assert scene['version']==product['version']
    markings=[o for o in scene.objects if o.type=='FONT']
    assert len(markings)==2
    assert {o.parent for o in markings}=={actors['basket-a'],actors['basket-b']}
    for ob in markings:
        assert ob.data.body==product['marking']['text']
        assert ob.data.align_x=='CENTER' and ob.data.align_y=='CENTER'
        corners=[ob.matrix_local @ Vector(v) for v in ob.bound_box]
        lo=[min(v[i] for v in corners) for i in range(3)]
        hi=[max(v[i] for v in corners) for i in range(3)]
        assert abs((lo[0]+hi[0])/2)<1e-7
        assert abs((lo[2]+hi[2])/2-product['marking']['position'][2])<1e-7
        assert lo[0]>=-.05 and hi[0]<=.05 and lo[2]>=-.0075 and hi[2]<=0
    return {'status':'PASS','product_objects':len(actors),'scenes':len(bpy.data.scenes),
            'max_vertex_error_m':max_error,'motion_keyframes':'match shared source',
            'shared_basket_mesh':True,'version':product['version'],
            'markings':{'count':len(markings),'text':product['marking']['text'],'centered_on_solid_handle':True}}


if __name__=='__main__': result=verify()
