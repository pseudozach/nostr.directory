"""Install only Nostr Directory's immutable runtime files and certificate timer."""
import hashlib
import os
import pathlib
import shutil
import subprocess

repo=pathlib.Path(__file__).resolve().parents[2]
target=pathlib.Path('/opt/nostr-directory')
target.mkdir(mode=0o755,exist_ok=True)
for source,name,digest in [(repo/'.hermes/implementation/ditto-package/usr/bin/ditto-relay','ditto-relay','230193687fce6fd786ffc57f55c70b6d854df3e8eb3cdadf6f4eff4ab0cce773'),(pathlib.Path('/root/.nvm/versions/node/v22.22.0/bin/node'),'node22.22.0',None)]:
    data=source.read_bytes()
    if digest:assert hashlib.sha256(data).hexdigest()==digest
    destination=target/name
    if destination.exists():assert destination.read_bytes()==data
    else:
        with destination.open('xb') as output:output.write(data)
    destination.chmod(0o755)
(repo/'ops/directory/ditto.toml').chmod(0o644)
state=pathlib.Path('/var/lib/nostr-directory/relay')
if not state.exists():
    state.mkdir(mode=0o700,parents=True)
    os.chown(str(state),65534,65534)
assert not state.is_symlink() and state.stat().st_uid==65534

def install(source,destination,mode):
    data=source.read_bytes()
    if destination.exists():assert destination.read_bytes()==data
    else:
        with destination.open('xb') as output:output.write(data)
    destination.chmod(mode)

hook=repo/'ops/directory/cert-renew-hook.sh'
subprocess.run(['sh','-n',str(hook)],check=True)
install(hook,pathlib.Path('/etc/letsencrypt/renewal-hooks/deploy/50-nostr-directory-api-reload'),0o755)
for suffix in ('service','timer'):
    name='nostr-directory-cert-renew.'+suffix
    install(repo/'ops/directory'/name,pathlib.Path('/etc/systemd/system')/name,0o644)
subprocess.run(['systemd-analyze','verify','/etc/systemd/system/nostr-directory-cert-renew.service','/etc/systemd/system/nostr-directory-cert-renew.timer'],check=True,timeout=15)
subprocess.run(['systemctl','daemon-reload'],check=True,timeout=15)
subprocess.run(['systemctl','enable','--now','nostr-directory-cert-renew.timer'],check=True,timeout=15)
subprocess.run(['systemctl','start','nostr-directory-cert-renew.service'],check=True,timeout=30)
print('SCOPED_RUNTIME_AND_CERT_RENEWAL_PREPARED')
