/**
 * ==============================================================================
 * 🖼️ DataView Image Gallery v1.1
 * ==============================================================================
 * Copyright (c) 2026 ねおん (Neon)
 * Licensed under the PolyForm Noncommercial License 1.0.0.
 * ==============================================================================
 */

const DEBUG = false;

// --- デフォルトの設定 ---
// ソート基準: 'name' (ファイル名) | 'ctime' (作成日時) | 'mtime' (更新日時)
let currentSortBy = 'name';
// ソート順: false = 降順 (Z-A / 新しい順) | true = 昇順 (A-Z / 古い順)
let currentIsAscending = false;

// 1列に並べるカードの数
const columns = 5;

// 検索対象のフォルダを取得
const currentFolder = dv.current().file.folder;
const rawPages = dv.pages(`"${currentFolder}"`).where(p => p.file.path !== dv.current().file.path);

if (DEBUG) {
    console.log("見つかったページ数:", rawPages.length);
}

// UI（操作用セレクトボックス）とギャラリー領域を描画するルートコンテナを作成
const container = dv.el("div", "");
container.style.marginBottom = "20px";

// コントロールバー（セレクトボックス設置エリア）のスタイル調整
const controlBar = document.createElement("div");
controlBar.style.display = "flex";
controlBar.style.gap = "10px";
controlBar.style.alignItems = "center";
controlBar.style.marginBottom = "15px";
controlBar.style.padding = "8px 12px";
controlBar.style.backgroundColor = "var(--background-secondary)";
controlBar.style.borderRadius = "6px";
controlBar.style.fontSize = "0.9em";

// セレクトボックス1: ソート基準
const selectSortBy = document.createElement("select");
selectSortBy.style.padding = "4px 8px";
selectSortBy.style.borderRadius = "4px";
selectSortBy.style.border = "1px solid var(--background-modifier-border)";
selectSortBy.style.backgroundColor = "var(--background-primary)";
selectSortBy.style.color = "var(--text-normal)";

selectSortBy.innerHTML = `
    <option value="name" ${currentSortBy === 'name' ? 'selected' : ''}>ファイル名</option>
    <option value="ctime" ${currentSortBy === 'ctime' ? 'selected' : ''}>作成日時</option>
    <option value="mtime" ${currentSortBy === 'mtime' ? 'selected' : ''}>更新日時</option>
`;

// セレクトボックス2: 昇順/降順
const selectOrder = document.createElement("select");
selectOrder.style.padding = "4px 8px";
selectOrder.style.borderRadius = "4px";
selectOrder.style.border = "1px solid var(--background-modifier-border)";
selectOrder.style.backgroundColor = "var(--background-primary)";
selectOrder.style.color = "var(--text-normal)";

selectOrder.innerHTML = `
    <option value="desc" ${!currentIsAscending ? 'selected' : ''}>降順 (新しい順/Z-A)</option>
    <option value="asc" ${currentIsAscending ? 'selected' : ''}>昇順 (古い順/A-Z)</option>
`;

controlBar.appendChild(document.createTextNode("並び替え: "));
controlBar.appendChild(selectSortBy);
controlBar.appendChild(selectOrder);
container.appendChild(controlBar);

// ギャラリーカード群を表示するメインエリア
const galleryContainer = document.createElement("div");
container.appendChild(galleryContainer);

// --- ギャラリーを再描画する関数 ---
const renderGallery = async () => {
    // ギャラリー表示エリアを一度クリア
    galleryContainer.innerHTML = "";

    // ページのソート処理（Dataviewの配列からJavaScript配列に変換して並び替え）
    let pages = [...rawPages].sort((a, b) => {
        let valA = a.file[currentSortBy];
        let valB = b.file[currentSortBy];

        // 日時オブジェクト (DateTime) の場合はミリ秒数値に変換して比較
        if (valA && typeof valA === 'object' && 'ts' in valA) valA = valA.ts;
        if (valB && typeof valB === 'object' && 'ts' in valB) valB = valB.ts;

        // 文字列比較または数値比較
        if (valA < valB) return currentIsAscending ? -1 : 1;
        if (valA > valB) return currentIsAscending ? 1 : -1;
        return 0;
    });

    // 各ファイルをループ処理して表示
    for (let p of pages) {
        // 各ノートから必要な情報を取得
        let path = p.file.path;
        let fileContent = await app.vault.adapter.read(path);

        // グローバル検索（/g）を使ってすべてのimgタグを抽出
        let imgMatches = [...fileContent.matchAll(/<img[^>]+>/gi)];
        // グローバル検索を使ってすべての #### タイトル行を抽出
        let titleMatches = [...fileContent.matchAll(/####\s+(.*)/g)];

        // 画像がない場合は何もしない
        if (imgMatches.length === 0) continue;

        let fileSection = document.createElement("div");
        fileSection.style.marginBottom = "25px";

        // ファイル名の見出しを追加
        let headerTitle = p.file.name;
        if (headerTitle.length > 30) {
            headerTitle = headerTitle.substring(0, 30) + '...';
        }
        let h2 = document.createElement("h2");
        h2.textContent = headerTitle;
        fileSection.appendChild(h2);

        // カードグリッドの作成
        let gridDiv = document.createElement("div");
        gridDiv.style.display = "grid";
        gridDiv.style.gridTemplateColumns = `repeat(${columns}, 1fr)`;
        gridDiv.style.gap = "15px";
        gridDiv.style.textAlign = "center";
        gridDiv.style.alignItems = "start";

        for (let i = 0; i < imgMatches.length; i++) {
            let imgTag = imgMatches[i] ? imgMatches[i][0] : "";
            // グリッド内で崩れないよう、画像の幅を強制的に100%などに調整するスタイルを挟むか、元のstyleを活かす
            if (imgTag) {
                // style属性を調整してカード内に収まるようにする
                imgTag = imgTag.replace(/width="[^"]*"/gi, '').replace(/style="[^"]*"/gi, 'style="width: 100%; height: auto; border-radius: 8px;"');
            }

            // 対応するタイトルがあればそれを使い、なければファイル名等で代用
            let rawTitle = (titleMatches[i] && titleMatches[i][1]) ? titleMatches[i][1] : p.file.name;
            // [タイトル](URL) のURL部分を削除し、タイトル文字だけにする
            let titleLine = rawTitle.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
            if (DEBUG) {
                console.log("未加工:", rawTitle);
                console.log("タイトル:", titleLine);
                console.log("リンク:", `${p.file.path}#${rawTitle}`);
            }

            // 1. カード外枠
            let card = document.createElement("div");
            card.style.backgroundColor = "var(--background-secondary)";
            card.style.padding = "10px";
            card.style.borderRadius = "8px";
            card.style.boxShadow = "0 2px 5px rgba(0,0,0,0.1)";

            // 2. 画像エリア
            let imgWrapper = document.createElement("div");
            imgWrapper.style.marginBottom = "8px";
            imgWrapper.style.overflow = "hidden";
            imgWrapper.innerHTML = imgTag; // 画像タグを挿入
            card.appendChild(imgWrapper);

            // 3. タイトル（リンク）エリア
            let titleWrapper = document.createElement("div");
            titleWrapper.style.fontSize = "0.85em";
            titleWrapper.style.fontWeight = "bold";

            // Obsidianが内部リンクとして認識する <a> タグをDOMで直接生成
            let a = document.createElement("a");
            a.className = "internal-link"; // Obsidian内部リンク用の標準クラス
            a.target = "_blank";
            a.rel = "noopener";
            // Obsidian内部のファイルパス＋アンカーヘッダーを指定
            a.setAttribute("href", `${p.file.path}#${rawTitle}`);
            a.setAttribute("data-href", `${p.file.path}#${rawTitle}`);
            a.textContent = titleLine;

            titleWrapper.appendChild(a);
            card.appendChild(titleWrapper);

            // グリッドに追加
            gridDiv.appendChild(card);
        }

        fileSection.appendChild(gridDiv);
        galleryContainer.appendChild(fileSection);
    }

    // Obsidianに埋め込まれたWikiLink（[[...]]）をHTMLとして正しくプレビュー変換させる
    dv.paragraph("");
    if (DEBUG) {
        console.log("すべてのHTML生成・出力完了");
    }
};

// --- イベントハンドラの追加 ---
selectSortBy.addEventListener("change", (e) => {
    currentSortBy = e.target.value;
    renderGallery();
});

selectOrder.addEventListener("change", (e) => {
    currentIsAscending = (e.target.value === 'asc');
    renderGallery();
});

// 初回レンダリングを実行
renderGallery();