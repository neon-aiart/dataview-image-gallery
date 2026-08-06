<!---
# sortby: "name" # name| ctime | mtime
# sortorder: "desc" # false / desc | asc / true
# columns: 5 # 1-10
# minwidth: 100 # 10-720
# maxwidth: 640 # 100-2496
# folder: "gallery/2026-07" # dv.current().file.folder
# header_level: "3, 4", # カンマ区切り | 範囲指定 | リスト型
# filter_query: "" # 絞り込み
# filter_mode: "include" # 含む: true / include | 含まない: false / exclude
# ng_folders: "dataview-image-gallery" # 対象外フォルダ: カンマ区切り | リスト型
--->

```dataviewjs
// 自分自身のファイル名（拡張子なし）
const currentName = dv.current().file.name;
// 取得した名前のJSファイルを呼び出す
await dv.view(currentName);
```
