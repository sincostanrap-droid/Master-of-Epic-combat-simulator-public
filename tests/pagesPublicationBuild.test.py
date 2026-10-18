# Scoped publication checks only. Creates fixtures in .local-preview and retains them.
import importlib.util,json,subprocess,sys,hashlib
from pathlib import Path
root=Path(__file__).resolve().parent.parent
spec=importlib.util.spec_from_file_location('pages',root/'tools/build-pages.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
fixture=root/'.local-preview/pages-builder-negative-fixture-20261018';fixture.mkdir()
(fixture/'release').mkdir();(fixture/'index.html').write_text('test',encoding='utf-8')
(fixture/'release/web-files.txt').write_text('index.html\n',encoding='utf-8')
(fixture/'release/web-hashes.json').write_text(json.dumps({'index.html':'0'*64}),encoding='utf-8')
m.ROOT=fixture
try: m.build(fixture/'bad-hash-output');raise RuntimeError('Expected hash rejection')
except AssertionError as e: assert 'Hash mismatch' in str(e)
assert not (fixture/'bad-hash-output').exists()
(fixture/'release/web-hashes.json').write_text(json.dumps({'index.html':hashlib.sha256(b'test').hexdigest()}),encoding='utf-8')
result=m.build(fixture/'valid-output');assert result['files']==1
try: m.build(fixture/'valid-output');raise RuntimeError('Expected existing-folder rejection')
except AssertionError as e: assert 'new output folder' in str(e)
(fixture/'release/web-files.txt').write_text('../index.html\n',encoding='utf-8')
(fixture/'release/web-hashes.json').write_text(json.dumps({'../index.html':'0'*64}),encoding='utf-8')
try: m.build(fixture/'unsafe-output');raise RuntimeError('Expected path rejection')
except AssertionError as e: assert 'Unsafe path' in str(e)
assert not (fixture/'unsafe-output').exists()
m.ROOT=root
try: m.build(root/'.local-preview/pages-strict-check-20261018',True);raise RuntimeError('Expected current exclusions to stop CI')
except AssertionError as e: assert 'Non-selected tracked files remain: 271' in str(e)
print(json.dumps({'passed':True,'checks':['hash mismatch rejected before copy','existing output preserved','traversal rejected','271 tracked exclusions correctly block CI'],'fixturesRetained':str(fixture)}))
