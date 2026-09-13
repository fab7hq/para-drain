"""Remove export metadata from original project renders without changing pixels.

PNG image/color chunks are retained byte for byte; only text metadata is removed.
Project attribution remains in NOTICE. No third-party images are used here.
SPDX-License-Identifier: Apache-2.0
"""
from pathlib import Path
import hashlib, struct, zlib

ROOT=Path(__file__).resolve().parents[1]


def clean(path):
    original=path.read_bytes();assert original[:8]==b'\x89PNG\r\n\x1a\n'
    output=bytearray(original[:8]);offset=8;removed=0;before=bytearray();after=bytearray()
    while offset<len(original):
        size=struct.unpack('>I',original[offset:offset+4])[0]
        kind=original[offset+4:offset+8];data=original[offset+8:offset+8+size]
        end=offset+12+size
        crc=struct.unpack('>I',original[end-4:end])[0]
        assert zlib.crc32(kind+data)&0xffffffff==crc, path.name
        if kind==b'IDAT':before.extend(data)
        if kind in [b'tEXt',b'zTXt',b'iTXt']:removed+=1
        else:
            output.extend(original[offset:end])
            if kind==b'IDAT':after.extend(data)
        offset=end
    assert offset==len(original) and hashlib.sha256(before).digest()==hashlib.sha256(after).digest()
    if removed:path.write_bytes(output)
    return removed


if __name__=='__main__':
    results={p.name:clean(p) for p in sorted((ROOT/'public/media').glob('*.png'))}
    print({'removed_text_chunks':sum(results.values()),'pixel_data':'unchanged','files':len(results)})
