"""Read-only source inventory; write publication selection reports only.

No staging, deletion, copying, client analysis, subprocess workers or tests.
Files are read serially. Git's file inventory avoids traversing node_modules
junctions or private caches. The web list is a dependency allowlist, not a copy
instruction; review flags still require resolution before publication.
"""
import csv
import hashlib
import html
import json
import posixpath
import re
import subprocess
from collections import Counter, deque
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "docs/publication-selection-20261018"


def git(*args):
    return subprocess.check_output(["git", *args], cwd=ROOT).decode("utf-8")


tracked = set(filter(None, git("ls-files", "-z").split("\0")))
untracked = set(filter(None, git("ls-files", "--others", "--exclude-standard", "-z").split("\0")))
paths = tracked | untracked
status = {}
for row in git("status", "--porcelain=v1", "-z", "--untracked-files=all").split("\0"):
    if row and len(row) > 3:
        status[row[3:]] = row[:2]
staged_before = git("diff", "--cached", "--name-only", "-z")
edges, missing, dynamic, external = [], [], [], []
web, support = set(), set()
reasons = {}
queue = deque()
literal = re.compile(r'''(['"`])((?:\.{1,2}/|src/|styles/|worker/|data/)[^'"`\r\n]*?\.(?:js|css|json|svg|png|jpg|woff2?|ico)(?:\?[^'"`\r\n]*)?)\1''')


def resolve(source, url):
    clean = url.split("?", 1)[0].split("#", 1)[0]
    if clean.startswith(("src/", "styles/", "worker/", "data/", "./src/", "./styles/", "./worker/")):
        return posixpath.normpath(clean)
    return posixpath.normpath(posixpath.join(posixpath.dirname(source), clean))


def add(source, target, kind):
    edges.append({"source": source, "target": target, "kind": kind})
    if target not in paths or not (ROOT / target).is_file():
        missing.append(edges[-1])
        return
    if not (target == "index.html" or target == ".nojekyll" or target.startswith(("src/", "styles/"))):
        dynamic.append({"source": source, "detail": "Outside the web roots; confirm meaning before inclusion", "target": target})
        return
    if target not in web:
        web.add(target)
        reasons[target] = kind + ": " + source
        queue.append(target)


for seed in ["index.html", ".nojekyll"]:
    add("entry", seed, "entry point")
while queue:
    source = queue.popleft()
    if Path(source).suffix not in (".html", ".css", ".js"):
        continue
    text = (ROOT / source).read_text(encoding="utf-8-sig")
    if source.endswith(".html"):
        for url in re.findall(r'''<(?:script|link|img)\b[^>]*?(?:src|href)=["']([^"']+)["']''', text, re.I):
            if not url.startswith(("http:", "https:", "data:", "#")):
                add(source, resolve(source, url), "HTML asset")
    if source.endswith(".css"):
        for url in re.findall(r'''url\(\s*["']?([^)'"\s]+)''', text):
            if not url.startswith(("data:", "http:", "https:", "#")):
                add(source, resolve(source, url), "CSS asset")
    if source.endswith(".js"):
        for match in literal.finditer(text):
            if "${" not in match[2].split("?", 1)[0]:
                add(source, resolve(source, match[2]), "literal module/resource (conservative)")
        if source == "src/domain/catalogData.js":
            for url in re.findall(r'''["'](src/[^"']+\.js(?:\?[^"']*)?)["']''', text):
                add(source, resolve(source, url), "lazy catalogue script")
        if source in ("src/ui/combatCatalogTrial.js", "src/calc/buffNumericRegistration.js"):
            index = (ROOT / "src/data/generated/combatCatalogIndex.generated.js").read_text(encoding="utf-8")
            data, _ = json.JSONDecoder().raw_decode(index.split("const data=", 1)[1])
            pages = sorted({entry["page"] for entry in data["entries"]})
            for page in pages:
                add(source, f"src/data/generated/combatNumericPages/{page:03}.json", "dynamic page, enumerated from catalogue index")
            dynamic.append({"source": source, "detail": "Indexed page lookup enumerated", "pageCount": len(pages), "entryCount": len(data["entries"])})
        if source == "src/ui/catalogSpecialization.js":
            block = text.split("function loadFacetOptimizerScripts()", 1)[1].split("function waitForFacetOptimizerScripts", 1)[0]
            names = re.search(r"for\(const name of \[([^]]+)\]", block)[1]
            for name in re.findall(r"'([^']+)'", names):
                add(source, "src/optimizer-v2/" + name + ".js", "dynamic optimizer script, enumerated from source")
        if source == "src/main.js":
            endpoint = re.search(r'const IDB_WORKER_ENDPOINT = "([^"]+)"', text)
            if endpoint:
                external.append({"source": source, "endpoint": endpoint[1], "purpose": "Official item DB proxy; separate Cloudflare service, not the browser optimizer Worker", "liveVerified": False})

# Maintenance scope is deliberately bounded to recent release regressions.
test_names = ["tsvNestedSeparators", "tsvEscapesPersistence", "storageFixedExcludedPersistence",
    "combatTrialSettingsPersistence", "attackDpsRestoreControls", "finalStorageAudit",
    "currentBuffRegistrationPersistence", "equipmentPostStorage", "buffStorageCommonFields",
    "publicReleaseUx", "publicUiPresentation", "publicCalculationWorkflow", "buffTrialStartup",
    "combatConditionInputs", "combatBuffCatalogBridge", "combatLogDisplayPrecision",
    "combatLogTab", "combatLogParser"]
maintenance = {"README.md", ".gitignore", "worker/README.md", "worker/moe-idb-proxy-worker.js",
    "tools/benchmark-optimizer.cjs", "tools/prepare-publication-manifest.py"}
maintenance.update("tests/" + name + ".test.cjs" for name in test_names)
maintenance.update({".gitattributes", ".github/workflows/pages.yml", "tools/build-pages.py", "tests/pagesPublicationBuild.test.py", "release/README.md", "release/web-files.txt", "release/web-hashes.json", "release/github-files.txt"})
test_queue = deque(sorted(maintenance))
seen = set()
while test_queue:
    source = test_queue.popleft()
    if source in seen or source not in paths:
        continue
    seen.add(source)
    if source in web:
        continue
    support.add(source)
    if not source.endswith((".js", ".cjs")) or source.startswith("tools/"):
        continue
    text = (ROOT / source).read_text(encoding="utf-8-sig")
    for raw in re.findall(r'''require\(\s*['"](\.[^'"]+)['"]\s*\)''', text):
        target = resolve(source, raw)
        if target not in paths:
            target += ".js"
        if target not in paths:
            missing.append({"source": source, "target": target, "kind": "selected test dependency"})
        elif target not in web:
            test_queue.append(target)

# Inventory only: never read client binaries, memory dumps, raw wiki or logs.
rows = []
for name in sorted(paths):
    file = ROOT / name
    if not file.is_file():
        bucket, reason = "HOLD", "Tracked path missing or not a regular file"
        size = 0
    else:
        size = file.stat().st_size
        if name in web:
            bucket, reason = "WEB_AND_GITHUB", reasons[name]
        elif name in support:
            bucket, reason = "GITHUB_ONLY", "Selected maintenance code/test; not a Pages asset"
        elif name.startswith(("dist/", "outputs/", "docs/", "data/", "legacy/", ".local-preview/", "patches/")) or name.endswith((".zip", ".dmp", ".exe", ".dll", ".rel", ".png", ".xlsx", ".patch")) or ".bak" in name:
            bucket, reason = "LOCAL_ONLY", "Analysis/report/source material; retain locally, do not upload by default"
        elif name.startswith("tools/research/"):
            bucket, reason = "LOCAL_ONLY", "Client/offline/runtime analysis utility; not calculator runtime"
        elif name in ("test用tsv.tsv", "test#U7528tsv.tsv"):
            bucket, reason = "LOCAL_ONLY", "Historical registered-build fixtures; no approval to publish personal build data"
        else:
            bucket, reason = "HOLD", "Not runtime-reachable or selected maintenance; review before adding"
    rows.append({"path": name, "selection": bucket, "gitStatus": status.get(name, "  "),
        "tracked": name in tracked, "bytes": size, "reason": reason})

OUT.mkdir(parents=True, exist_ok=True)
for bucket, filename in [("WEB_AND_GITHUB", "web-public-files.txt"), ("GITHUB_ONLY", "github-maintenance-files.txt"), ("LOCAL_ONLY", "local-only-files.txt"), ("HOLD", "hold-files.txt")]:
    (OUT / filename).write_text("\n".join(r["path"] for r in rows if r["selection"] == bucket) + "\n", encoding="utf-8")
github = [r["path"] for r in rows if r["selection"] in ("WEB_AND_GITHUB", "GITHUB_ONLY")]
(OUT / "github-candidate-files.txt").write_text("\n".join(github) + "\n", encoding="utf-8")
(OUT / "tracked-not-selected.txt").write_text("\n".join(r["path"] for r in rows if r["tracked"] and r["selection"] in ("LOCAL_ONLY", "HOLD")) + "\n", encoding="utf-8")
with (OUT / "file-selection.tsv").open("w", encoding="utf-8-sig", newline="") as f:
    writer = csv.DictWriter(f, fieldnames=list(rows[0]), delimiter="\t")
    writer.writeheader()
    writer.writerows(rows)
with (OUT / "github-selected-changes.tsv").open("w", encoding="utf-8-sig", newline="") as f:
    writer = csv.DictWriter(f, fieldnames=list(rows[0]), delimiter="\t")
    writer.writeheader()
    writer.writerows(r for r in rows if r["path"] in github and r["gitStatus"].strip())
hashes = []
for name in sorted(web):
    sha = hashlib.sha256()
    with (ROOT / name).open("rb") as f:
        for chunk in iter(lambda: f.read(262144), b""):
            sha.update(chunk)
    hashes.append({"path": name, "sha256": sha.hexdigest()})
counts = dict(Counter(r["selection"] for r in rows))
byte_counts = {k: sum(r["bytes"] for r in rows if r["selection"] == k) for k in counts}
report = {"inventoryMethod": "git tracked + non-ignored untracked, serial reads; ignored caches/junctions not traversed",
    "counts": counts, "bytes": byte_counts, "indexedFiles": len(rows),
    "selectedChanges": dict(Counter(r["gitStatus"].strip() or "unchanged" for r in rows if r["path"] in github)),
    "trackedNotSelected": sum(r["tracked"] and r["selection"] in ("LOCAL_ONLY", "HOLD") for r in rows),
    "missingDependencies": missing, "dynamicLoads": dynamic, "externalServices": external,
    "reviewBeforeCommit": ["This is a dependency/selection audit, not legal clearance for derived game data.",
        "Runtime generated data may embed evidence paths/hashes; inspect before public commit. Metadata references are not fetch dependencies.",
        "README version and historical documentation links require an update.",
        "productTsvRoundtrip.test.cjs depends on two historical build TSVs: hold until sanitized fixtures are approved; originals stay local.",
        "No GitHub Pages settings or external proxy health were changed or verified live.",
        "Tracked exclusions remain in Git until a separately approved index change; .gitignore alone is insufficient.",
        "No git add/commit/push, no file moves/deletes, no browser storage access."],
    "ignoredPolicies": ["data/cache/", ".local-preview/", "*.patch", "node_modules junctions"],
    "gitIndexUnchanged": staged_before == git("diff", "--cached", "--name-only", "-z")}
worker_source = "src/optimizer/optimizer.worker.js"
worker_text = (ROOT / worker_source).read_text(encoding="utf-8")
worker_imports = sorted({resolve(worker_source, m[2]) for block in re.findall(r"importScripts\((.*?)\);", worker_text, re.S) for m in literal.finditer(block)})
facet_sources = sorted(e["target"] for e in edges if e["kind"] == "dynamic optimizer script, enumerated from source")
report["dependencyChecks"] = {
    "browserWorkerIncluded": worker_source in web,
    "browserWorkerImportCount": len(worker_imports),
    "browserWorkerImportsIncluded": all(name in web for name in worker_imports),
    "facetOptimizerScriptsIncluded": len(set(facet_sources)) == 8 and all(name in web for name in facet_sources),
    "numericPageCount": sum(name.startswith("src/data/generated/combatNumericPages/") for name in web),
    "cloudflareWorkerNotInPages": "worker/moe-idb-proxy-worker.js" in support and "worker/moe-idb-proxy-worker.js" not in web,
    "noBinaryArchivesOrReportsInGithubCandidate": not any(Path(name).suffix.lower() in (".exe", ".dll", ".rel", ".dmp", ".zip", ".png", ".xlsx") or name.startswith(("dist/", "outputs/", "docs/")) for name in github),
    "noSelectedFileOver100MiB": all(r["bytes"] < 100 * 1048576 for r in rows if r["path"] in github),
}
report["browserWorkerImports"] = worker_imports
report["facetOptimizerScripts"] = sorted(set(facet_sources))
(OUT / "summary.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
(OUT / "dependency-graph.json").write_text(json.dumps({"edges": edges, "webHashes": hashes}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
summary_rows = "".join(f"<tr><td>{html.escape(k)}</td><td>{v:,}</td><td>{byte_counts[k]/1048576:.2f} MiB</td></tr>" for k, v in counts.items())
(OUT / "index.html").write_text('''<!doctype html><html lang="ja"><meta charset="utf-8"><title>公開ファイル選別</title><style>body{font:16px/1.7 sans-serif;max-width:1000px;margin:32px auto;padding:0 20px}table{border-collapse:collapse}td,th{padding:8px 18px;border:1px solid #ccd}code{background:#eef}a{color:#145ab0}</style><h1>公開ファイル選別（ローカル確認用）</h1><p>移動・削除・ステージング・commit・pushは行っていません。解析資料は元の場所で保持しています。この報告フォルダ自体も公開対象外です。</p><table><tr><th>分類</th><th>件数</th><th>容量</th></tr>''' + summary_rows + '''</table><p>WEB_AND_GITHUB＝Web公開・GitHub候補、GITHUB_ONLY＝保守用のGitHub候補、LOCAL_ONLY＝ローカル保持、HOLD＝掲載判断保留。</p><ul>''' + "".join(f'<li><a href="{name}">{label}</a></li>' for name, label in [("web-public-files.txt","Web公開対象"),("github-candidate-files.txt","GitHub候補全一覧"),("github-selected-changes.tsv","GitHubに載せる変更・追加の候補差分"),("github-maintenance-files.txt","GitHubのみ掲載する保守ファイル"),("local-only-files.txt","ローカル保持"),("hold-files.txt","判断保留"),("tracked-not-selected.txt","既存追跡済みだが今回掲載しないもの"),("file-selection.tsv","全ファイルの判定・差分・理由"),("summary.json","集計・不足・注意点"),("dependency-graph.json","依存関係と公開候補のハッシュ")]) + '''</ul><p>一覧は依存関係を基にした候補です。生成データ内の根拠メタデータ、READMEの古い版表記とリンク、既存追跡済み資料の扱いは公開前に確認が必要です。外部Cloudflare Workerの稼働状態は未確認です。</p></html>''', encoding="utf-8")
print(json.dumps({"counts": counts, "bytes": byte_counts, "missing": missing, "dynamicLoads": dynamic, "indexUnchanged": report["gitIndexUnchanged"]}, ensure_ascii=False, indent=2))
