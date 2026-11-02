# 公開ファイルの管理

`web-files.txt` の237ファイルだけをGitHub Pagesへ配信します。`web-hashes.json` のSHA-256と照合し、解析資料や登録構成は成果物に含めません。

ソースの掲載範囲は `github-files.txt` に限定します。既存ファイルとテストを保持し、元の解析用リポジトリの履歴は取り込みません。

公開は既定ブランチで「Reviewed GitHub Pages」を手動実行します。`publish=false` で組立確認、`publish=true` で公開します。pushのみでは公開しません。

ローカル確認: `python tools/build-pages.py --output <new-directory> --check-git`
