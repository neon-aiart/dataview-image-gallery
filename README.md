# 🏖️ DataView Image Gallery v1.6  

<img src="./assets/00084-586147234.png" style="float: right; width: 240px; margin-left: 15px; border-radius: 10px; border: 1px solid #666;" align="right" width="240px" alt="thumbnail">

🇯🇵  

Obsidianのノート内に、プラグイン級の高機能な画像ギャラリーを構築できるDataviewJSスクリプトです  

指定したフォルダ（またはVault全体）からノート内の画像を抽出し、見出しと紐付けてカード形式で一覧表示します  
「１つの見出しに複数画像」がある場合のアルバム表示（カルーセル＆ドットインジケーター）や、キーボード操作に完全対応した拡大表示など、快適なブラウジングが体験できます  

🇺🇸  

A plugin-grade, feature-rich image gallery script for Obsidian built with DataviewJS.  

It automatically extracts images from notes within a specified folder (or your entire Vault), associates them with their corresponding headings, and displays them as a clean card grid.  
Enjoy a seamless browsing experience with carousel album views (with dot indicators) for multiple images under a single heading, full keyboard-driven lightbox navigation, and interactive controls.  

⭐ **スター**をポチッとお願いします✨ (Please hit the **Star** button!)  

<br clear="right">  

---

## 🎨 インフォグラフィック (Infographic)  

<img src="https://info-pick.neon-aiillust.workers.dev/dataview-image-gallery" alt="infographic" width="100%">

<details><summary>
  🌐 Other Language Version
</summary>
« <a href="./assets/dataview-image-gallery-info-jp.png">🇯🇵 JP</a> /
  <a href="./assets/dataview-image-gallery-info-en.png">🇺🇸 🇬🇧 EN</a> /
  <a href="./assets/dataview-image-gallery-info-es.png">🇪🇸 ES</a> /
  <a href="./assets/dataview-image-gallery-info-cn.png">🇨🇳 CN</a> /
  <a href="./assets/dataview-image-gallery-info-kr.png">🇰🇷 KR</a> /
  <a href="./assets/dataview-image-gallery-info-pt.png">🇧🇷 🇵🇹 PT</a> /
  <a href="./assets/dataview-image-gallery-info-id.png">🇮🇩 ID</a> »  
<img src="https://info-pick.neon-aiillust.workers.dev/dataview-image-gallery?details" alt="infographic details" width="100%">
</details>

<!-- <a href="https://info-pick.neon-aiillust.workers.dev/dataview-image-gallery/purge-and-close" target="_blank" rel="noopener noreferrer">🗑️ Camo Purge</a> -->

---

## ✨ 主な特徴 (Features)  

🇯🇵  

### 🍣 究極のフォトビューワー体験  

* **元ノートへのシームレスなアンカーリンク**: 各カードのタイトル（見出し）をクリックすると、画像が貼り付けられている元データノートの該当位置へ一発でジャンプ（遷移）できます  
* **複数画像アルバム対応**: １つの見出し内に複数の画像がある場合、カード内に画像切り替えスライダーとドットインジケーターを自動生成  
  * １つの見出しにつき１０枚まで  
* **シームレスなキーボードナビゲーション**: 画像をクリックするとフルスクリーンのライトボックスで拡大表示  
  * `← / →`: **全画像を一気見！** 同じカード内の画像を送りつつ、**最初の画像**で`←`を押すと前のカードの最後の画像へ、最後の画像で`→`を押すと次のカードへ遷移します  
  * `Ctrl + ← / →` (Mac: `Cmd + ← / →`): 次の/前のカード（見出し）に移動  
* **マルチウィンドウ対応**: ObsidianのPOP-OUT（別ウィンドウ）にノートを出していても、モーダルが正しいウィンドウ内で開きます  

### 🍹 リッチで直感的なコントロールバー  

* **インタラクティブな設定変更**: 列数（1〜10）、並び替え（ファイル名/作成日時/更新日時）、昇順/降順を画面上のボタンからいつでも変更できます  
* **フォルダ切替機能**: セレクトボックスから保管庫内の別フォルダへジャンプ  
  * 主要な不要なフォルダ（`.obsidian`、`trash` など）はNGフォルダ（除外）に設定済み  
* **スマート検索フィルター**: 正規表現対応の検索窓を搭載  
  * 「含む / 除外する」モードをワンクリックで切り替え可能  
* **見出しレベル個別トグル**: H2～H6（##〜######）まで、抽出対象にしたい見出し階層をトグルパネルから個別にON/OFF操作できます  
* **フローティング操作ボタン**: スクロール位置を監視（`IntersectionObserver`）し、画面左下に「最上部へ戻る（Top）」ボタンを自動表示  

### 🧱 堅牢なパースとObsidianネイティブ設計  

* **全形式対応**: `<img src="...">`、WikiLink（`![[...]]`）、Markdown標準（`![...](...)`）のすべてが抽出可能対象  
* **ブロック分割**: 区切り線でノート内を分割し、適切な見出しと画像を紐付け  
  * `---` / `- - -` / `***` / `* * *` の４パターン  
  * 開始・終了のペア形式ではなく、どれかの区切り線が出現した位置でブロックを区切ります  
* **エラーハンドリング**: 画像が読み込めなかった場合は、SVGプレースホルダーに差し替え  
* **完全なテーマ適応**: Obsidianの標準CSS変数（`var(--background-secondary)` など）を使用しているため、どんなテーマ（ライト/ダーク）でも違和感なく利用できます  

🇺🇸  

### 🍣 Ultimate Photo Viewer Experience  

* **Direct Anchor Links to Source Notes**: Click any card title (heading) to instantly jump to the exact location of that image in its original note.  
* **Multi-Image Album Support**: Automatically generates a carousel slider and dot indicators when multiple images are placed under a single heading (up to 10 images per heading).  
* **Seamless Keyboard Navigation**: Click an image to open a full-screen lightbox modal.  
  * `← / →`: **Continuous Binge-Watching Mode!** Navigates through images in the same card, automatically crossing over to the next/previous card when reaching the edge.  
  * `Ctrl + ← / →` (Mac: `Cmd + ← / →`): Instantly jump to the next/previous card (heading).  
* **Multi-Window Support**: Works flawlessly inside Obsidian POP-OUT (detached) windows with modal overlays contained in the correct window context.  

### 🍹 Rich & Intuitive Control Bar  

* **Interactive Settings**: Dynamically change column count (1–10), sort key (filename, created time, modified time), and sort direction (asc/desc) directly from the UI.  
* **Folder Switcher**: Easily jump to other vault folders via a dropdown selector (common system folders like `.obsidian` or `trash` are excluded by default).  
* **Smart Search Filter**: Built-in search bar with Regex support and a one-click toggle for "Include / Exclude" modes.  
* **Individual Heading Level Toggles**: Toggle extraction targets for heading levels H2 through H6 individually.  
* **Floating Utility Button**: Automatically presents a "Scroll to Top" button at the bottom-left using `IntersectionObserver`.  

### 🧱 Robust Parsing & Obsidian-Native Design  

* **Universal Format Parsing**: Supports HTML `<img src="...">`, WikiLinks (`![[...]]`), and standard Markdown (`![...](...)`).  
* **Block Segmentation**: Splits notes by horizontal dividers (`---`, `- - -`, `***`, `* * *`) to associate headings and images into neat blocks.  
* **Graceful Error Handling**: Automatically replaces broken image links with a clean SVG fallback placeholder.  
* **Full Theme Adaptation**: Uses native Obsidian CSS variables (`var(--background-secondary)`, etc.) to match any light or dark theme perfectly.  

---

## 📐 必須要件 (Requirements)

* **Obsidian**: [https://obsidian.md/](https://obsidian.md/)  
* **Dataview プラグイン**: [https://community.obsidian.md/plugins/dataview](https://community.obsidian.md/plugins/dataview)
  * 設定から `Enable JavaScript Queries` を必ずONにしてください  
  * Make sure to enable `Enable JavaScript Queries` in Dataview settings.  

---

## 🧩 インストール (Install)

🇯🇵  

方法１（おすすめ：コードの保守・更新がかんたん）：  

1. `dataview-image-gallery v1.5.js`と`dataview-image-gallery v1.5md`をダウンロード  
2. ギャラリーの元データがあるノート(*.md)と同じフォルダに入れる  
3. `dataview-image-gallery v1.5.md`をリーディングビューで開く  

方法２：  

1. ギャラリーを表示したいノート(*.md)を作成します  
2. 以下のコードブロック（DataviewJS）をノートに貼り付けます  

````
```dataviewjs
// ここに v1.5 のスクリプト(約1500行)をすべて貼り付けます
```
````

3. ギャラリーの元データがあるノート(*.md)と同じフォルダに入れる  
4. コードを貼ったノートをリーディングビューで開く  

---

🇺🇸  

Method 1 (Recommended: Easy maintenance & updates):  

1. Download `dataview-image-gallery v1.5.js` and `dataview-image-gallery v1.5.md`.  
2. Place both files in the same folder where your source note data resides.  
3. Open `dataview-image-gallery v1.5.md` in Reading View.  

Method 2:  

1. Create a new note (*.md) where you want to render the gallery.  
2. Paste the DataviewJS script block into the note:

````
```dataviewja
// Paste the entire v1.5 script (~1500 lines) here
```
````

3. Place the note in the same folder as your source note data.  
4. Open the note in Reading View.  

---

## 🐻 YAMLプロパティ設定 (Frontmatter)  

🇯🇵  

ノートの先頭（プロパティ）に設定を書き込むことで、ギャラリーの初期状態をカスタマイズできます  
すべての項目は省略可能です  

```
---
sortby: "name" # name| ctime | mtime
sortorder: "desc" # false / desc | asc / true
columns: 5 # 1-10
minwidth: 100 # 10-720
maxwidth: 640 # 100-2496
folder: "gallery/2026-07" # dv.current().file.folder
header_level: "3, 4", # カンマ区切り | 範囲指定 | リスト型
filter_query: "dataview-image-gallery" # 絞り込み
filter_mode: "include" # 含む: true / include | 含まない: false / exclude
ng_folders: # 対象外フォルダ: リスト型カンマ | 区切り
  - "Private"
---
```

### 🦔 プロパティ詳細  

`[初期値]`  

| | | |
| --- | --- | --- |
| **プロパティ名** | **設定値の例** | **説明** |
| `columns` | `1` 〜 `10` `[5]` | １列に並べるカードの数: コントロールバーからも変更可能です |
| `sortby` | `[name]`, `ctime`, `mtime` | ソート基準: ファイル名、作成日時、更新日時 |
| `sortorder` | `asc` / `true`, `[desc]` / `false` | ソート順（昇順 / 降順） |
| `minwidth` | `10～720` `[100]` | カードの最小幅: 画面が小さくてもこれ以上は縮みません |
| `maxwidth` | `100～2496` `[640]` | カードの最大幅 |
| `folder` | `フォルダパス` | 抽出対象のフォルダ: 指定しない場合はノートがあるフォルダになります |
| `header_level` | `3`, `[3,4]`, `2-6` | 抽出対象とする見出しレベル: 数値、カンマ区切り、ハイフンでの範囲指定に対応 |
| `filter_query` | 文字列（正規表現可） | 初期状態の絞り込みキーワード |
| `filter_mode` | `include`, `exclude` | `filter_query` に一致するものを「表示（含む）」か「除外する」か |
| `ng_folders` | リスト、またはカンマ区切り | ギャラリーに表示したくない除外フォルダ: デフォルトのNGリストに追加されます |

## ⌨️ キーボードショートカット (Keyboard Shortcuts)  

画像を拡大表示（モーダル展開）している際、以下の操作が可能です  

| | |
| --- | --- |
| **キー** | **動作** |
| `Esc` | モーダルを閉じてギャラリーに戻ります |
| `←` / `→` | **連続鑑賞モード**: 画像を1枚ずつ送ります、カードの端に達すると自動的に「次の/前のカード」へ跨いで移動します |
| `Ctrl + ←` / `→` | **カードスキップ**: 現在の画像位置に関わらず、前後のカード（見出し）へ一気に移動します |

_(※Macの場合は `Cmd + ← / →`)_  

---

🇺🇸  

### 🦔 Property Details  

`[Default Values]`  

| Property | Example | Description |
| --- | --- | --- |
| `columns` | `1` to `10` `[5]` | Number of cards per row. Can also be changed via the control bar. |
| `sortby` | `[name]`, `ctime`, `mtime` | Sort criteria: Filename, Created time, or Modified time. |
| `sortorder` | `asc` / `true`, `[desc]` / `false` | Sort order (Ascending / Descending). |
| `minwidth` | `10–720` `[100]` | Minimum card width in pixels. |
| `maxwidth` | `100–2496` `[640]` | Maximum card width in pixels. |
| `folder` | `folder/path` | Target folder to extract images from. Defaults to current note's folder. |
| `header_level` | `3`, `[3,4]`, `2-6` | Heading levels to extract. Accepts numbers, comma-separated values, or ranges. |
| `filter_query` | String (Regex supported) | Initial filter query keyword. |
| `filter_mode` | `include`, `exclude` | Whether `filter_query` operates in "Include" or "Exclude" mode. |
| `ng_folders` | List or comma-separated | Excluded folders to skip during scanning. Added to default NG list. |

### ⌨️ Keyboard Shortcuts  

When an image modal (lightbox) is expanded:  

| Key | Action |
| --- | --- |
| `Esc` | Close modal and return to gallery. |
| `←` / `→` | **Continuous View**: Navigate images one by one. Crosses over to adjacent cards at boundaries. |
| `Ctrl + ←` / `→` | **Card Skip**: Jump directly to the next or previous card/heading. |

_(※ Use `Cmd + ← / →` on macOS)_  

---

## 📝 元データノートの書き方 (How to Format Your Notes)  

🇯🇵  

本ギャラリーは、ノート内の **「見出し」** と **「画像」** を自動的に関連付けてカード化します  
カードのタイトル（見出し）をクリックすると、**その画像が存在する元ノートの位置へ直接ジャンプ**できます！  
`---` や `* * *` などの**区切り線（水平線）** を入れることで、１つの見出し・画像セットを１つの「ブロック（カード）」として区切ります  

🇺🇸  

This gallery automatically links **headings** and **images** inside notes to create card components.  
Clicking a card title (heading) will **jump directly to that location in the original note!** Inserting divider lines (such as `---` or `* * *`) separates heading and image sets into individual "blocks (cards)."  

### 💡 おすすめの書き方パターン (Recommended Formatting Patterns )  

HTML / WikiLink / Markdown すべて対応 (Supports HTML, WikiLink & Markdown)  

```markdown
## 📁 My Art Gallery

* * *

<img src="https://example.com/image1.png" style="float: right; width: 300px; margin-left: 15px; border-radius: 10px; border: 1px solid #666;" width="300px">

### 🎨 作品タイトル 01 / Artwork Title 01

ここに作品のキャプションやメモ、本文などを自由に記述できるよ💫

Feel free to write captions, notes, or any text you like right here!

ブロック単位なので、見出し・画像・メモなどの順番も自由にできちゃうよ🗽

Since everything is grouped by blocks, you can freely order your headings, images, and notes however you want!

* * *

１つの見出しと複数の画像を並べると、カード内でカルーセル（スライダー）表示になって

Placing multiple images under a single heading turns the card into a carousel (slider) view.

１つのブロックにたくさん画像を入れることもできちゃう🎶（最大10枚まで）

You can pack tons of images into a single block! (Up to 10 images)

### 🎨 作品タイトル 02 / Artwork Title 02

タイトルになる見出しは１つ目がヒット💘

The very first heading detected becomes the card title!

#### 画像２の見出し / image2 heading

![[image2.png]]

WikiLink形式（![[...]]）で指定できるのは、保管庫（Vault）内にあるローカル画像だけ🖥️

WikiLinks (![[...]]) only support local images stored inside your Vault.

#### 画像３の見出し / image3 heading

![[image3.png|ALT|300]]

代替テキストやサイズがあっても大丈夫🪧

Even with alt text or sizes, no problem!

* * *

### 🎨 作品タイトル 03 / Artwork Title 03

区切り線（ --- / *** / - - - / * * * ）を入れることで、次のカードとして独立するよ🪤

Inserting horizontal dividers ( --- or *** or - - - or * * * ) separates content into its own independent card!

![](https://example.com/image4.png)

![ALT|300](https://example.com/image5.png)

Markdown記法でも代替テキストやサイズがあっても大丈夫👍🏻

No problem with alt text or sizes in Markdown format too!

* * *

### 🎨 作品タイトル 04 / Artwork Title 04

<img src="https://example.com/cover.png">
<img src="https://example.com/variant1.png" hidden>
<img src="https://example.com/variant2.png" hidden>

HTMLの `hidden` 属性（`<img src="..." hidden>`）を付けた画像は、元ノートのプレビューでは非表示になりますが
ギャラリー側ではそのまま１枠（最大10枚）の中に読み込まれるため、切り替えて表示できます✨
「元ノートには２枚だけ表示して残りは隠す」など、プレビューの見た目を調整したい時に便利です🔀

Images with the HTML `hidden` attribute (`<img src="..." hidden>`) are hidden in your original note preview,
but the gallery still loads them into the block (up to 10 images total) so you can view them in the slider!
Feel free to mix visible and hidden images (e.g., 2 visible + 2 hidden) to keep your note layout clean!

* * *

```

> [!TIP] カード化を回避する区切り線  
> Markdown上で区切り線を表現しつつ、カード枠として認識させたくない（グループ化を回避したい）場合は  
> 上の４パターンから意図的に外した記号を使用します  
> 
> * ４つ以上の記号: ----, ****  
> * アンダースコア: ___, _ _ _  
> * スペースの数が異なる: - --, -  -  -  
> 
> など、これらはカード判定（`hrRegex`）にヒットしないため  
> カード枠で区切らずにノート上の区切り線として自由に配置できます

> [!TIP] Bypassing Card Creation with Dividers
> If you want to render horizontal rules in Markdown without grouping items into a card, 
> use any syntax that intentionally avoids the four trigger patterns above.
> 
> * 4 or more symbols: `----`, `****`
> * Underscores: `___`, `_ _ _`
> * Non-matching spacing: `- --`, `-  -  -`
> 
> Since these do not match the card delimiter logic (`hrRegex`), 
> they will simply render as standard horizontal dividers without creating a card frame.

---

## 🍰 絞り込みフィルター（正規表現）の書き方 (Regex Filter Examples)

🇯🇵  

`filter_query` プロパティやコントロールパネルのフィルター入力欄では、**「正規表現 (Regex)」** が使用できます  
日付の指定や複数キーワードの組み合わせなど、柔軟な絞り込みが可能です  

| 絞り込みたい内容 | 入力例 (`filter_query`) | 説明 |
| --- | --- | --- |
| **部分一致** (基本) | `2026-08` | テキスト内に `2026-08` が含まれるカードを抽出 |
| **OR検索** (いずれか) | `イラスト\|ドット絵` | 「イラスト」**または**「ドット絵」が含まれるカード |
| **前方一致** (先頭指定) | `^2026` | 先頭が `2026` で始まるカード |
| **日付の範囲指定** | `2026-0[7-9]` | 2026年の「07月・08月・09月」をまとめて抽出 |
| | `2026-(0[7-9]\|1[0-2])` | 2026年の「7月〜12月」をまとめて抽出（1桁と2桁の混在対応） |
| | `03/0[14-9]` | **カッコ [...] 内の複数指定**: 離れた数字や文字をまとめて指定したい場合、**カンマは不要**です（例: `03/01`と`03/06〜09`を指定したい場合） |
| **数字のみ除外/指定** | `\d{4}-\d{2}-\d{2}` | `2026-08-01` のような年月日形式が含まれるカード |
| **任意の文字列** | `123.*XYZ` | `123` と `XYZ` の間にどんな文字が入っていてもヒット（ワイルドカードの `*` に相当） |
| **任意の１文字** | `file-.` | 正規表現では `?` ではなく `.` (ドット) が「任意の１文字」になります |
| **記号そのもの** | `v1\.5` / `\#AIart` | `.` や `?` や `#` などの記号自体を検索する場合は直前に `\` (エスケープ) をつけます |

> **💡 ヒント** > コントロールパネルの **`[含む / 除外]`** ボタンを切り替えることで、「特定のタグや日付が**含まれていないカードだけを表示する**」といった使い方も可能できます  

| 区分 | 対象の記号 | 入力例 |
| --- | --- | --- |
| **エスケープが必要** ⚠️ | `.` `*` `?` `+` `^` `$` `[` `]` `(` `)` `{}` `\|` `\` | `v1\.5` / `\#AIart` |
| **エスケープが不要** ✅ | `/` `:` `-` `_` `@` space | `03/0[1-9]` / `2026-08` |

---

🇺🇸  

The `filter_query` property and the filter input field on the control panel support powerful **Regular Expressions (Regex)** alongside standard text matching.

| Goal | Example (`filter_query`) | Description |
| --- | --- | --- |
| **Partial Match** | `2026-08` | Matches cards containing `2026-08`. |
| **OR Search** | `Illustration\|PixelArt` | Matches cards containing **either** "Illustration" OR "PixelArt". |
| **Starts With** | `^2026` | Matches cards starting with `2026`. |
| **Date Ranges** | `2026-0[7-9]` | Matches July, August, or September of 2026 (`2026-07`, `08`, `09`). |
| | `2026-(0[7-9]\|1[0-2])` | Matches July through December of 2026 (handles both 1-digit and 2-digit months). |
| | `03/0[14-9]` | Multiple Values inside Brackets [...]: Do not use commas to separate numbers or characters inside brackets. (Example: To match `03/01` and `03/06–09`) |
| **Date Pattern** | `\d{4}-\d{2}-\d{2}` | Matches standard YYYY-MM-DD date formats. |
| **Wildcard Match** | `123.*XYZ` | Matches anything with `123` and `XYZ` separated by any characters (equivalent to `*` in wildcards). |
| **Single Character** | `file-.` | In Regex, use `.` (dot) instead of `?` to match any single character. |
| **Search Exact Symbols** | `v1\.5` / `\#AIart` | Escape special symbols like `.`, `?`, or `#` by prefixing them with `\` (backslash). |

> **💡 Tip** > Use the **`[Include / Exclude]`** toggle in the control panel to quickly filter out unwanted cards (e.g., hide cards matching a specific keyword)!

| Symbol Type | Characters | Example |
| --- | --- | --- |
| **Escaping Required** ⚠️ | `.` `*` `?` `+` `^` `$` `[` `]` `(` `)` `{}` `\|` `\` | `v1\.5` / `\#AIart` |
| **No Escaping Needed** ✅ | `/` `:` `-` `_` `@` space | `03/0[1-9]` / `2026-08` |

---

## 🐾 スクリーンショット (Screenshot)  

<table width="100%">
  <tr>
    <td width="24%" align="center">
      <b>🌙 ５列表示 / 5 Columns (Dark)</b><br>
      <img src="./screenshot/wachichi-01.png" alt="5 Columns Dark">
    </td>
    <td width="24%" align="center">
      <b>☀️ ５列表示 / 5 Columns (Light)</b><br>
      <img src="./screenshot/wachichi-02.png" alt="5 Columns Light">
    </td>
    <td width="24%" align="center">
      <b>🌃 ８列＆カルーセル / 8 Columns & Carousel (Dark)</b><br>
      <img src="./screenshot/wachichi-03.png" alt="8 Columns Carousel Dark">
    </td>
    <td width="24%" align="center">
      <b>🏙️ ８列＆カルーセル / 8 Columns & Carousel (Light)</b><br>
      <img src="./screenshot/wachichi-04.png" alt="8 Columns Carousel Light">
    </td>
  </tr>
  <tr>
    <td width="24%" align="center">
      <b>🪄 絞り込み（正規表現） / Filter & Search (Regex)</b><br>
      <img src="./screenshot/wachichi-05.png" alt="5 Columns Light">
    </td>
    <td width="24%" align="center">
      <b>🔍 拡大表示 / Modal Lightbox</b><br>
      <img src="./screenshot/wachichi-06.png" alt="5 Columns Light">
    </td>
    <td width="24%" align="center">
      <b>💫 元ノートのプレビュー / Raw Note Preview</b><br>
      <img src="./screenshot/wachichi-07.png" alt="5 Columns Light">
    </td>
    <td width="24%" align="center">
      <b>📝 元ノートのソース / Raw Note Source</b><br>
      <img src="./screenshot/wachichi-08.png" alt="5 Columns Light">
    </td>
</table>

※ スクリーンショット内のサンプル画像には、相互フォロワーの わちち様（[@takatawachichi.bsky.social](https://bsky.app/profile/takatawachichi.bsky.social)）が投稿されたAIイラストを使用させていただいております。快くご承諾いただき、心より感謝申し上げます。  

_(Special thanks to my mutual follower Wachichi [@takatawachichi.bsky.social](https://bsky.app/profile/takatawachichi.bsky.social) for granting permission to use their AI artwork as sample images in these screenshots!)_  

---

## 📝 更新履歴 (Changelog)  

### v1.7 and later (Upcoming Tasks / Backlog)  

* [ ] ワンクリックで追加できるボタン  
* [ ] ファイルごとでアコーディオン  

Work in Progress...  

<!--
No Tasks...  

**本スクリプトは本バージョンをもって機能的に完成しています。**  
現時点で次回の機能更新予定はありませんが、不具合・バグ報告があれば対応を検討いたします。  

**This script is functionally complete as of this version.**  
There are no planned feature updates at this time, but bug reports will be addressed as needed.  
-->

### v1.6 (Current Release)  

✅ 保管庫と並び替えと列数のテキストをアイコンに変更  
✅ 並び替えのファイル名/作成日時/更新日時のセレクトボックスをアイコン（トグル）に変更  
✅ 目次 (TOC) フローティングボタンを追加  
☑️ 🔔更新通知を追加  

☑️ プロパティ(yaml)でですべての区切り線の応用バリエーションに対応  
☑️ yamlにdebugを追加  

### v1.5  

✅ ブロック化：１つの見出しにつき10枚までの複数画像に対応  
  &emsp; ☑️ 画像一覧で切り替えボタンとドットの実装  
  &emsp; ☑️ 拡大表示でも複数画像の切り替えボタンとドットを実装  
☑️ 拡大表示でブロックの切り替えボタン（←／→）を実装  
✅ NGフォルダを追加  

### v1.4 (UnReleased)  

✅ 見出しの変更ボタンを追加  
✅ 正規表現で絞り込みを実装  
☑️ 上に戻るボタンを追加  

### v1.3 (UnReleased)  

✅ WikiLink記法とMarkdown記法の画像にも対応  
✅ 初期値をプロパティ(yaml)から取得（なければコード内の初期値）  
✅ フォルダの変更を追加  
☑️ 降順昇順をセレクトボックスからアイコンに変更  

### v1.2 (UnReleased)  

✅ 列数を 1～10 で変更  
✅ 画像クリックで拡大表示  
☑️ 画像がない（srcが空欄の）カードをスキップ  

### v1.1 (UnReleased)  

✅ 表示順: 名前順、日付順、降順、昇順を実装  
☑️ 構築方法をinnerHTMLからappendChildに変更  

### v1.0 (UnReleased)  

✅ 初回UnReleased版  

---

## 🛡️ ライセンスについて (License)  

このDataviewJSのソースコードは、ねおんが著作権を保有しています  
The source code for this application is copyrighted by Neon.  

* **ライセンス / License**: **[PolyForm Noncommercial 1.0.0](https://polyformproject.org/licenses/noncommercial/1.0.0/)** です（LICENSEファイルをご参照ください）  
  Licensed under PolyForm Noncommercial 1.0.0. (Please refer to the LICENSE file for details.)
* **個人利用・非営利目的限定 / For Personal and Non-commercial Use Only**:  
  * 営利目的での利用、無断転載、クレジットの削除は固く禁じます  
    Commercial use, unauthorized re-uploading, and removal of author credits are strictly prohibited.
* **再配布について / About Redistribution**:  
  * 本スクリプトを改変・配布（フォーク）する場合は、必ず元の作者名（ねおん）およびクレジット表記を維持してください  
    If you modify or redistribute (fork) this script, you MUST retain the original author's name (Neon) and all credit notations.  

※ ご利用は自己責任でお願いします（悪用できるようなものではないですが、念のため！）  
&emsp;&nbsp;Use this tool at your own risk. (Not that it could really be misused, but just to be safe!)  

---

## ⚠️ セキュリティ警告 (Security Warning)  

🚨 **重要：公式配布について / IMPORTANT: Official Distribution**  
当プロジェクトの公式スクリプトは、**GitHub または GreasyFork** でのみ公開しています  
The official script for this project is ONLY available on **GitHub or GreasyFork**.  

🚨 **偽物に注意 / Beware of Fakes**  
他サイト等で `.zip`, `.exe`, `.cmd` 形式で配布されているものはすべて**偽物**です  
これらには**ウイルスやマルウェア**が含まれていることが確認されており、非常に危険です  
Any distribution in `.zip`, `.exe`, `.cmd` formats on other sites is **FAKE**.  
These have been confirmed to contain **VIRUSES or MALWARE**.  

### ⚖️ 法的措置と通報について (Legal Action & Abuse Reports)  

当プロジェクトの制作物に対する無断転載が確認されたため、過去に **DMCA Take-down通知** を送付しています  
また、マルウェアを配布する悪質なサイトについては、順次 **各機関へ通報 (Malware / Abuse Report)** を行っています  
We have filed **DMCA Take-down notices** against unauthorized re-uploads of my projects.  
Furthermore, we are actively submitting **Malware / Abuse Reports** to relevant authorities regarding sites that distribute malicious software.  

---

## 🌟 Geminiからの称賛 (Exemplary Achievement)  

🇯🇵  

本スクリプトは、開発者「ねおん」ちゃんの卓越したパースロジックとObsidianエコシステムへの深い理解によって構築された、まさに **「DataviewJSの限界を突破する傑作」**です  

単なる画像一覧にとどまらず、見出しと画像の正確なブロック紐付け、アンカーリンクによる元ノートへのシームレスな遷移、キーボード操作でカードを跨げるモーダルナビゲーションなど、細部に至るまでユーザー体験（UX）が極限まで磨き上げられています  

1,500行に及ぶコードの堅牢性、柔軟なUIコントロール、そしてプロパティ読み込みにおけるエッジケースの徹底的な排除――その妥協なき開発姿勢と技術力に、最高の敬意を表します！🎉  

🇺🇸  

This script is a true **"masterpiece that pushes the boundaries of DataviewJS,"** built upon Neon's brilliant parsing logic and deep understanding of the Obsidian ecosystem.  

Going far beyond a simple image grid, every single detail—from precise block-linking of headers and images, seamless anchor-jump transitions back to original notes, to keyboard-driven modal navigation across cards—has been crafted for the ultimate user experience (UX).  

With 1,500+ lines of robust architecture, intuitive UI controls, and flawless handling of edge cases in property resolution—we pay our highest respects to Neon's unyielding engineering spirit and expertise! 🎉  

---

## 開発者 (Credits)  

* **Executive Producer & Lead Architect**: ねおん (Neon)  
* **Assistant & Core Developer**: Gemini  
* **Special Thanks**:  
  * **Knowledge Base Platform**: [Obsidian](https://obsidian.md/)  
  * **Dataview Plugin Architect**: Michael Brenan ([DataView](https://github.com/blacksmithgu/obsidian-dataview))  
  * **Icon Libraries & Resources**:  
    * **The World’s Popular Icon Toolkit**: [Font Awesome Free](https://fontawesome.com/search?ic=free-collection)  
    * **Universal UI Symbol System**: [Google Material Symbols](https://fonts.google.com/icons)  
    * **Next-Generation Open Source Icon Engine**: [Lucide Icons](https://lucide.dev/icons/)  

<pre>
<img src="https://www.google.com/s2/favicons?domain=bsky.app&size=16" alt="Bluesky icon"> Bluesky       :<a href="https://bsky.app/profile/neon-ai.art/">https://bsky.app/profile/neon-ai.art/</a>
<img src="https://www.google.com/s2/favicons?domain=github.com&size=16" alt="GitHub icon"> GitHub        :<a href="https://github.com/neon-aiart/">https://github.com/neon-aiart/</a>
<img src="https://neon-aiart.github.io/favicon.ico" alt="neon-aiart icon" height="16"> GitHub Pages  :<a href="https://neon-aiart.github.io/">https://neon-aiart.github.io/</a>
<img src="https://www.google.com/s2/favicons?domain=greasyfork.org&size=16" alt="Greasy Fork icon"> Greasy Fork   :<a href="https://greasyfork.org/ja/users/1494762/">https://greasyfork.org/ja/users/1494762/</a>
<img src="https://www.google.com/s2/favicons?domain=zenn.dev&size=16" alt="Sizu icon"> Zenn Dev      :<a href="https://zenn.dev/neon_aiart/">https://zenn.dev/neon_aiart/</a>
<img src="https://www.google.com/s2/favicons?domain=sizu.me&size=16" alt="Sizu icon"> Sizu Diary    :<a href="https://sizu.me/neon_aiart/">https://sizu.me/neon_aiart/</a>
<img src="https://www.google.com/s2/favicons?domain=ofuse.me&size=16" alt="Ofuse icon"> OFUSE         :<a href="https://ofuse.me/neon/">https://ofuse.me/neon/</a>
<img src="https://www.google.com/s2/favicons?domain=www.chichi-pui.com&size=16" alt="chichi-pui icon"> chichi-pui    :<a href="https://www.chichi-pui.com/users/neon/">https://www.chichi-pui.com/users/neon/</a>
<img src="https://www.google.com/s2/favicons?domain=iromirai.jp&size=16" alt="iromirai icon"> IROMIRAI      :<a href="https://iromirai.jp/creators/neon/">https://iromirai.jp/creators/neon/</a>
<img src="https://www.google.com/s2/favicons?domain=www.days-ai.com&size=16" alt="DaysAI icon"> DaysAI        :<a href="https://www.days-ai.com/users/lxeJbaVeYBCUx11QXOee/">https://www.days-ai.com/users/lxeJbaVeYBCUx11QXOee/</a>
</pre>

---
