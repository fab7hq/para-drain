"""Build the final product from the shared geometry dataset in any Blender session.

Run in a background Blender process, directly or through Blender MCP CLI.
The interactive session and input file are preserved; the process-local scene
is replaced before the canonical product project is saved.
SPDX-License-Identifier: Apache-2.0
"""
from pathlib import Path
import json
import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[1]


def build():
    if not bpy.app.background:
        raise RuntimeError('Use a background Blender process or Blender MCP CLI to preserve your interactive session.')
    product = json.loads((ROOT / 'public/model/paradrain.json').read_text())
    scene = bpy.data.scenes.new('ParaDrain | 0.1')
    scene.unit_settings.system = 'METRIC'
    scene.unit_settings.length_unit = 'MILLIMETERS'
    scene.frame_end = product['timeline']['frames']
    scene.render.fps = product['timeline']['fps']
    scene.render.engine = 'BLENDER_EEVEE'
    scene.render.resolution_x, scene.render.resolution_y = 1600, 1200
    scene.world = bpy.data.worlds.new('Drain Filter | World')
    scene.world.use_nodes = True
    scene.world.node_tree.nodes['Background'].inputs[0].default_value = (.055,.075,.105,1)
    scene.world.node_tree.nodes['Background'].inputs[1].default_value = .5
    scene['version'] = product['version']
    scene['status'] = 'Final design selection; physical qualification open'
    solids = bpy.data.collections.new('Drain Filter | Product')
    scene.collection.children.link(solids)
    meshes = {}
    for key, record in product['meshes'].items():
        mesh = bpy.data.meshes.new(key)
        mesh.from_pydata(record['vertices'], [], record['faces'])
        mesh['components'] = json.dumps(record['components'])
        assert not mesh.validate()
        mesh.update()
        meshes[key] = mesh
    actors = {}
    for record in product['objects']:
        obj = bpy.data.objects.new(record['name'], meshes[record['mesh']])
        solids.objects.link(obj)
        obj['product_id'] = record['id']
        obj.location = record['position']
        if not obj.data.materials:
            mat = bpy.data.materials.new(record['name'] + ' material')
            mat.use_nodes = True
            bsdf = mat.node_tree.nodes.get('Principled BSDF')
            m = record['material']
            bsdf.inputs['Base Color'].default_value = (*m['color'],1)
            bsdf.inputs['Metallic'].default_value = m['metalness']
            bsdf.inputs['Roughness'].default_value = m['roughness']
            obj.data.materials.append(mat)
        for key in record['motion']:
            obj.location = key['position']
            obj.keyframe_insert(data_path='location', frame=key['frame'])
        if obj.animation_data:
            ad = obj.animation_data
            for layer in ad.action.layers:
                for strip in layer.strips:
                    for fc in strip.channelbag(ad.action_slot).fcurves:
                        for key in fc.keyframe_points:
                            key.interpolation = 'LINEAR'
        actors[record['id']] = obj
    marking = product['marking']
    ink = bpy.data.materials.new('ParaDrain | Marking ink')
    ink.diffuse_color = (.93,.95,.85,1)
    for identifier in ['basket-a','basket-b']:
        data = bpy.data.curves.new('Upstream marking', 'FONT')
        data.body, data.size = marking['text'], .01
        data.align_x = 'CENTER'
        data.align_y = 'CENTER'
        data.materials.append(ink)
        obj = bpy.data.objects.new('Upstream marking', data)
        scene.collection.objects.link(obj)
        obj.parent = actors[identifier]
        obj.location = marking['position']
        obj.rotation_euler = (1.57079632679,0,0)
        bpy.context.view_layer.update()
        # Fit actual glyph bounds inside the solid grip, centered on both axes.
        corners = [Vector(v) for v in obj.bound_box]
        lo = Vector(tuple(min(v[i] for v in corners) for i in range(3)))
        hi = Vector(tuple(max(v[i] for v in corners) for i in range(3)))
        scale = min(marking['width_m']/(hi.x-lo.x), marking['height_m']/(hi.y-lo.y))
        obj.scale = (scale,scale,scale)
        obj.location -= obj.rotation_euler.to_matrix() @ ((lo+hi)*(.5*scale))
    for name, location, power in [('Key',(.4,-.7,1),75),('Fill',(-.7,-.1,.2),40),('Rim',(.2,.9,.8),90)]:
        data = bpy.data.lights.new(name, 'AREA'); data.energy=power; data.shape='DISK'; data.size=1
        ob = bpy.data.objects.new(name,data); scene.collection.objects.link(ob); ob.location=location
        ob.rotation_euler=(Vector((0,.12,-.2))-ob.location).to_track_quat('-Z','Y').to_euler()
    camdata = bpy.data.cameras.new('Product camera'); camdata.type='ORTHO'; camdata.ortho_scale=2.45
    cam = bpy.data.objects.new('Product camera',camdata); scene.collection.objects.link(cam)
    cam.location=(1.3,-2.4,1.35)
    cam.rotation_euler=(Vector((-.35,.03,-.08))-cam.location).to_track_quat('-Z','Y').to_euler()
    scene.camera=cam
    for offset in [0,504]:
        for frame,name in [(1,'Fit retainer'),(61,'Secure keepers'),(73,'Release front'),(85,'Lift loaded basket'),
                           (193,'Transfer backup'),(253,'Reset pusher'),(277,'Release retainer over bin'),
                           (325,'Empty manually'),(409,'Return basket'),(469,'Dock rear')]:
            scene.timeline_markers.new(name,frame=frame+offset)
    bpy.context.window.scene=scene; scene.frame_set(1)
    out=ROOT/'public/model/paradrain.blend'; out.parent.mkdir(exist_ok=True)
    # Save a normal project, not a library-only .blend that triggers an empty
    # scene warning in the interactive application. Only this background copy
    # of the input scene is removed; no source file is deleted or overwritten.
    for old in list(bpy.data.scenes):
        if old != scene:
            bpy.data.scenes.remove(old)
    bpy.data.orphans_purge(do_recursive=True)
    scene.name='ParaDrain | 0.1';solids.name='ParaDrain | Product'
    for record in product['objects']:
        actors[record['id']].name=record['name']
    for key,mesh in meshes.items():mesh.name=key
    layout=bpy.data.workspaces.get('Layout') or bpy.context.window.workspace
    for window in bpy.context.window_manager.windows:window.workspace=layout
    bpy.data.batch_remove(ids=[workspace for workspace in bpy.data.workspaces if workspace != layout])
    bpy.data.orphans_purge(do_recursive=True)
    # Blender's standard Shading workspace can retain the operator's home
    # directory in its file browser. Public project files use relative UI paths.
    for screen in bpy.data.screens:
        for area in screen.areas:
            for space in area.spaces:
                if space.type=='FILE_BROWSER' and space.params:
                    # Overwrite the complete fixed-length path buffer first;
                    # short assignments can leave stale bytes after the NUL.
                    space.params.directory=b'/'*1023
                    space.params.directory=b'//';space.params.filename=''
                if space.type=='VIEW_3D':
                    space.region_3d.view_perspective='CAMERA'
    bpy.context.preferences.filepaths.save_version=0
    bpy.ops.wm.save_as_mainfile(filepath=str(out),check_existing=False,compress=False)
    return {'file':str(out),'scene':scene.name,'objects':len(actors)}


if __name__=='__main__': result=build()
