"""Build an explicit, checked source + static-site archive for public sharing.
SPDX-License-Identifier: Apache-2.0
"""
from pathlib import Path
import hashlib, json, re, zipfile

ROOT=Path(__file__).resolve().parents[1]
FILES=['README.md','CONTRIBUTING.md','LICENSE','NOTICE','THIRD_PARTY_NOTICES.txt','.gitignore',
       'package.json','package-lock.json','vite.config.js','playwright.config.js','index.html','technical.html','wrangler.jsonc','.node-version','progress.md']
DIRECTORIES=['src','public','blender','docs','evidence','tests','tools']
DENIED={'.codex','.fab7','.local-archive','.cache','node_modules','__pycache__','test-results','playwright-report','.DS_Store'}
PRIVATE_PATTERNS=[re.compile(rb'/Users/[A-Za-z0-9._-]+(?:/|\x00)'),
                  re.compile(rb'-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----'),
                  re.compile(rb'(?:ghp_|github_pat_|sk-)[A-Za-z0-9_]{24,}')]


def excluded(path):
    parts=path.relative_to(ROOT).parts
    return any(part in DENIED or (part.startswith('.') and part not in {'.gitignore','.node-version'}) for part in parts) or path.suffix in ['.blend1','.blend2','.pyc']


def validate_file(path):
    relative=path.relative_to(ROOT)
    assert not excluded(path), f'Private/generated path: {relative}'
    assert not path.is_symlink(), f'Symlink is not a public artifact: {relative}'
    data=path.read_bytes()
    if path.suffix=='.blend':
        assert data.startswith(b'BLENDER'), 'Rebuild the canonical model as an uncompressed project for metadata inspection'
    assert not any(pattern.search(data) for pattern in PRIVATE_PATTERNS), f'Potential private content in {relative}'
    return data


def package():
    version=json.loads((ROOT/'package.json').read_text())['version']
    assert (ROOT/'dist/index.html').exists(), 'Build the site first'
    promotion=json.loads((ROOT/'evidence/promotion.json').read_text())
    geometry=json.loads((ROOT/'evidence/geometry-validation.json').read_text())
    readiness=json.loads((ROOT/'evidence/public-package.json').read_text())
    for report in [promotion,geometry,readiness]:
        assert report['status']=='PASS' and report['version']==version, 'Release evidence is missing or stale'
    digest=lambda path:hashlib.sha256((ROOT/path).read_bytes()).hexdigest()
    assert promotion['canonical_model_sha256']==digest('public/model/paradrain.blend')
    assert promotion['geometry_source_sha256']==geometry['data_sha256']==digest('public/model/paradrain.json')
    assert promotion['builder_sha256']==digest('blender/build.py')
    assert promotion['verifier_sha256']==digest('blender/verify.py')
    browser=readiness['browser_tests']
    assert browser['status']=='PASS'
    assert browser['production_bundle_sha256']==digest('dist/assets/'+browser['production_bundle'])
    paths=[ROOT/name for name in FILES]
    for directory in DIRECTORIES:
        paths.extend(p for p in sorted((ROOT/directory).rglob('*')) if p.is_file() and not excluded(p))
    files={str(p.relative_to(ROOT)):validate_file(p) for p in paths}
    for p in sorted((ROOT/'dist').rglob('*')):
        if p.is_file() and not excluded(p):files['site/'+str(p.relative_to(ROOT/'dist'))]=validate_file(p)
    for name in ['LICENSE','NOTICE','THIRD_PARTY_NOTICES.txt']:
        assert files[name]==files['site/'+name],f'Site notice out of date: {name}'
    for prefix in ['public/','site/']:
        assert files[prefix+'model/paradrain.json']==files['public/model/paradrain.json']
        assert files[prefix+'model/paradrain.blend']==files['public/model/paradrain.blend']
    manifest={name:hashlib.sha256(data).hexdigest() for name,data in sorted(files.items())}
    files['MANIFEST.json']=(json.dumps({'version':version,'sha256':manifest},indent=2)+'\n').encode()
    out=ROOT/'release';out.mkdir(exist_ok=True)
    destination=out/f'paradrain-{version}.zip'
    folder=f'paradrain-{version}'
    with zipfile.ZipFile(destination,'w',zipfile.ZIP_DEFLATED) as archive:
        for name,data in sorted(files.items()):
            info=zipfile.ZipInfo(folder+'/'+name,date_time=(2026,9,13,0,0,0));info.compress_type=zipfile.ZIP_DEFLATED
            info.external_attr=0o644<<16;archive.writestr(info,data)
    with zipfile.ZipFile(destination) as archive:
        assert archive.testzip() is None
        assert all(hashlib.sha256(archive.read(folder+'/'+name)).hexdigest()==digest for name,digest in manifest.items())
    report={'status':'PASS','archive':str(destination.relative_to(ROOT)),'files':len(files),
            'bytes':destination.stat().st_size,'sha256':hashlib.sha256(destination.read_bytes()).hexdigest(),
            'checks':['Explicit source allowlist','Private paths and token patterns absent','No symlinks',
                      'Site licenses and model match source','ZIP CRC and every manifest digest verified']}
    (out/'package-report.json').write_text(json.dumps(report,indent=2)+'\n')
    print(json.dumps(report,indent=2))


if __name__=='__main__': package()
