"""Activate an immutable bundled API release; rollback only this service on failed readiness."""
import hashlib
import json
import os
import pathlib
import subprocess
import time
import urllib.request

repo=pathlib.Path(__file__).resolve().parents[2]
stage=repo/'.hermes/implementation/launch-20261101/service-stage'
base=pathlib.Path('/opt/nostr-directory')
parts={name:(stage/name).read_bytes() for name in ('src/main.cjs','schema.sql')}
tag=hashlib.sha256(parts['src/main.cjs']+parts['schema.sql']).hexdigest()[:20]
release=base/'releases'/tag
release.mkdir(parents=True,exist_ok=True)
(base/'releases').chmod(0o755);release.chmod(0o755)
for name,data in parts.items():
    dest=release/name;dest.parent.mkdir(mode=0o755,exist_ok=True)
    if dest.exists():assert dest.read_bytes()==data
    else:
        with dest.open('xb') as output:output.write(data)
    dest.chmod(0o644)
unit=pathlib.Path('/etc/systemd/system/nostr-directory-api.service')
source=(repo/'ops/directory/nostr-directory-api.service').read_bytes()
if unit.exists():assert unit.read_bytes()==source
else:
    with unit.open('xb') as output:output.write(source)
unit.chmod(0o644)
current=base/'current'
assert not current.exists() or current.is_symlink()
previous=os.readlink(str(current)) if current.is_symlink() else None
link=base/'current.next'
if link.is_symlink():link.unlink()
link.symlink_to(release)
os.replace(str(link),str(current))
subprocess.run(['systemctl','daemon-reload'],check=True,timeout=15)
try:
    subprocess.run(['systemctl','enable','nostr-directory-api'],check=True,timeout=20)
    subprocess.run(['systemctl','restart','nostr-directory-api'],check=True,timeout=30)
    end=time.monotonic()+20
    opener=urllib.request.build_opener(urllib.request.ProxyHandler({}))
    while True:
        try:
            response=opener.open('http://127.0.0.1:18140/health',timeout=2)
            assert response.status==200 and json.load(response).get('ok') is True
            break
        except Exception:
            if time.monotonic()>=end:raise RuntimeError('API readiness failed')
            time.sleep(0.25)
except Exception:
    if previous:
        link.symlink_to(previous);os.replace(str(link),str(current))
        subprocess.run(['systemctl','restart','nostr-directory-api'],check=True,timeout=30)
    else:
        subprocess.run(['systemctl','stop','nostr-directory-api'],check=True,timeout=30)
        current.unlink()
    raise
receipt={'success':True,'release':tag,'previousRelease':previous,'immutable':True,'readiness':'HTTP 200 ok=true'}
(repo/'.hermes/implementation/launch-20261101/api-deploy-result.json').write_text(json.dumps(receipt,indent=2)+'\n')
print(json.dumps(receipt))
