"""Build Pages assets from the reviewed allowlist; never moves/removes source files."""
import argparse, hashlib, json, shutil, subprocess
from pathlib import Path, PurePosixPath
ROOT=Path(__file__).resolve().parent.parent

def build(destination, check_git=False):
    entries=json.loads((ROOT/'release/web-hashes.json').read_text(encoding='utf-8'))
    names=(ROOT/'release/web-files.txt').read_text(encoding='utf-8').splitlines()
    assert names and len(names)==len(set(names)), 'Duplicate/empty allowlist'
    assert set(names)==set(entries), 'Hash manifest and allowlist differ'
    for name in names:
        p=PurePosixPath(name)
        assert not p.is_absolute() and '..' not in p.parts and '\\' not in name, 'Unsafe path'
        assert name in ('index.html','.nojekyll') or name.startswith(('src/','styles/')), 'Non-product path'
        src=ROOT/name
        assert src.resolve()==ROOT.resolve()/name and src.is_file(), 'Link or missing file: '+name
        assert hashlib.file_digest(src.open('rb'),'sha256').hexdigest()==entries[name], 'Hash mismatch: '+name
    if check_git:
        allowed=set((ROOT/'release/github-files.txt').read_text(encoding='utf-8').splitlines())
        tracked=set(subprocess.check_output(['git','ls-files','-z'],cwd=ROOT).decode().strip('\0').split('\0'))
        unexpected=tracked-allowed
        assert not unexpected, 'Non-selected tracked files remain: '+str(len(unexpected))
    out=Path(destination).resolve()
    assert out!=ROOT.resolve() and not out.exists(), 'Use a new output folder; existing files are never cleared'
    for name in names:
        assert not (ROOT/name).resolve().is_relative_to(out), 'Output contains source files'
    out.mkdir(parents=True)
    for name in names:
        target=out/name;target.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(ROOT/name,target)
        assert hashlib.file_digest(target.open('rb'),'sha256').hexdigest()==entries[name]
    assert {p.relative_to(out).as_posix() for p in out.rglob('*') if p.is_file()}==set(names)
    return {'files':len(names),'bytes':sum((out/n).stat().st_size for n in names),'output':str(out)}
if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--output',required=True);parser.add_argument('--check-git',action='store_true')
    args=parser.parse_args();print(json.dumps(build(args.output,args.check_git)))
