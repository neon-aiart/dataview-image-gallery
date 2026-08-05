/**
 * ==============================================================================
 * 🖼️ DataView Image Gallery v1.3
 * ==============================================================================
 * Copyright (c) 2026 ねおん (Neon)
 * Licensed under the PolyForm Noncommercial License 1.0.0.
 * ==============================================================================
 */

const DEBUG = false;

// --- 1. デフォルト値の定義 ---
const DEFAULT_SORT_BY = 'name';                  // ソート基準 [name]: 'name' (ファイル名) | 'ctime' (作成日時) | 'mtime' (更新日時)
const DEFAULT_IS_ASCENDING = false;              // ソート順 [false]: false = 降順 (Z-A / 新しい順) | true = 昇順 (A-Z / 古い順)
const DEFAULT_COLUMNS = 5;                       // １列に並べるカードの数 [5]
const DEFAULT_MIN_WIDTH = 100;                   // カードの最小幅 [100] (10～720)
const DEFAULT_MAX_WIDTH = 640;                   // カードの最大幅 [640] (100～2496)
const DEFAULT_FOLDER = dv.current().file.folder; // デフォルトはカレントフォルダ

// 一覧から除外するNGフォルダリスト: 完全一致、または部分一致で弾くフォルダ名・パスを指定
const NG_FOLDERS = [
    "/",                       // ルートの別表記
    ".obsidian",               // Obsidian設定
    "templates", ".templates", // テンプレート用
    "trash", ".trash",         // ゴミ箱
    "_dev-tools",              // 開発ツール
    "copilot",                 // AIプラグイン
    "gemini-scribe",           // AIプラグイン
    "Excalidraw",              // 描画プラグイン
];

// --- 2. 自分自身のYAMLプロパティを取得 ---
const currentNote = dv.current();

// ソート基準
let currentSortBy = currentNote.sortby || currentNote.sort_order_by || DEFAULT_SORT_BY;

// ソート順
let rawOrder = currentNote.sortorder || currentNote.sort_order;
let currentIsAscending = (rawOrder === 'asc' || rawOrder === true) ? true : DEFAULT_IS_ASCENDING;

// --- 3. バリデーション処理 ---

// A. 列数 (columns: 1～10)
let parsedCol = parseInt(currentNote.columns, 10);
let currentColumns = (!isNaN(parsedCol) && parsedCol >= 1 && parsedCol <= 10) ? parsedCol : DEFAULT_COLUMNS;

// B. 最小幅 (minwidth: 10～720)
let rawMinWidth = currentNote.minwidth || currentNote.min_width;
let parsedMin = parseInt(rawMinWidth, 10); // "100px" でも "100" でも 100 としてパースされる
let cardMinWidthNum = !isNaN(parsedMin) ? Math.min(Math.max(parsedMin, 10), 720) : DEFAULT_MIN_WIDTH;
let cardMinWidth = `${cardMinWidthNum}px`;

// C. 最大幅 (maxwidth: 100～2496)
let rawMaxWidth = currentNote.maxwidth || currentNote.max_width;
let parsedMax = parseInt(rawMaxWidth, 10);
let cardMaxWidthNum = !isNaN(parsedMax) ? Math.min(Math.max(parsedMax, 100), 2496) : DEFAULT_MAX_WIDTH;
let cardMaxWidth = `${cardMaxWidthNum}px`;

// YAMLプロパティからの読み込み
let rawFolder = currentNote.folder !== undefined ? String(currentNote.folder).trim() : DEFAULT_FOLDER;

// --- Vault内に存在する全フォルダのリストを取得＆フィルタリング ---
const allFolders = app.vault.getAllLoadedFiles()
    .filter(f => f.children) // フォルダ要素のみ抽出
    .map(f => f.path)
    .filter(folderPath => {
        // セクレタ配列（NGリスト）に含まれるかチェック: 完全一致、または NG ワードで始まるフォルダを除外
        return !NG_FOLDERS.some(ng =>
            folderPath === ng ||
            folderPath.startsWith(ng + "/") ||
            folderPath.endsWith("/" + ng)
        );
    });

// 指定されたフォルダが存在するかチェック
let targetFolder = rawFolder;

if (targetFolder !== "" && !allFolders.includes(targetFolder)) {
    console.warn(`指定されたフォルダ "${targetFolder}" が見つからないため、全体を表示します。`);
    targetFolder = DEFAULT_FOLDER;
}

let rawPages = [];

// UIとギャラリー領域を描画するルートコンテナ
const container = dv.el("div", "");
container.style.marginBottom = "20px";

// コントロールバー
const controlBar = document.createElement("div");
controlBar.style.display = "flex";
controlBar.style.flexWrap = "wrap"; // 画面が狭い時に折り返せるように設定
controlBar.style.gap = "10px";
controlBar.style.alignItems = "center";
controlBar.style.marginBottom = "15px";
controlBar.style.padding = "8px 12px";
controlBar.style.backgroundColor = "var(--background-secondary)";
controlBar.style.borderRadius = "6px";
controlBar.style.fontSize = "0.9em";

// --- コントロールバーに「フォルダ選択」を追加 ---
let folderLabel = document.createElement("label");
folderLabel.textContent = " フォルダ: ";
folderLabel.style.fontWeight = "bold";

let folderSelect = document.createElement("select");
folderSelect.style.padding = "4px 8px";
folderSelect.style.borderRadius = "4px";
folderSelect.style.border = "1px solid var(--background-modifier-border)";

// 「すべて（ルート）」を選択肢に追加
let defaultOption = document.createElement("option");
defaultOption.value = "";
defaultOption.textContent = "（Vault全体）";
if (targetFolder === "") {
    defaultOption.selected = true;
}
folderSelect.appendChild(defaultOption);

// Vault内の全フォルダを選択肢として追加（アルファベット順にソート）
allFolders.sort().forEach(folderPath => {
    let opt = document.createElement("option");
    opt.value = folderPath;
    opt.textContent = folderPath;
    if (folderPath === targetFolder) {
        opt.selected = true;
    }
    folderSelect.appendChild(opt);
});

// フォルダ変更時のイベント処理
folderSelect.addEventListener("change", (e) => {
    targetFolder = e.target.value;
    // 選択されたフォルダを基準に pages を再取得
    updatePagesAndRender();
});

// コントロールバーへ追加
controlBar.appendChild(folderLabel);
controlBar.appendChild(folderSelect);

// ソート基準
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

// --- SVGアイコンの定義 ---
const SVG_ASC = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="16" height="16" fill="currentColor"><path d="M150.6 41.4c-12.5-12.5-32.8-12.5-45.3 0l-80 80c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L96 141.3 96 448c0 17.7 14.3 32 32 32s32-14.3 32-32l0-306.7 25.4 25.4c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3l-80-80zM288 64c0 17.7 14.3 32 32 32l50.7 0-73.4 73.4c-9.2 9.2-11.9 22.9-6.9 34.9S307.1 224 320 224l128 0c17.7 0 32-14.3 32-32s-14.3-32-32-32l-50.7 0 73.4-73.4c9.2-9.2 11.9-22.9 6.9-34.9S461 32 448 32L320 32c-17.7 0-32 14.3-32 32zM412.6 273.7C407.2 262.8 396.1 256 384 256s-23.2 6.8-28.6 17.7l-80 160c-7.9 15.8-1.5 35 14.3 42.9s35 1.5 42.9-14.3l7.2-14.3 88.4 0 7.2 14.3c7.9 15.8 27.1 22.2 42.9 14.3s22.2-27.1 14.3-42.9l-80-160zM384 359.6l20.2 40.4-40.4 0 20.2-40.4z"/></svg>`;
const SVG_DESC = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="16" height="16" fill="currentColor"><path d="M412.6 49.7C407.2 38.8 396.1 32 384 32s-23.2 6.8-28.6 17.7c-50.7 101.3-77.3 154.7-80 160-7.9 15.8-1.5 35 14.3 42.9s35 1.5 42.9-14.3l7.2-14.3 88.4 0 7.2 14.3c7.9 15.8 27.1 22.2 42.9 14.3s22.2-27.1 14.3-42.9c-2.7-5.3-29.3-58.7-80-160zM384 135.6l20.2 40.4-40.4 0 20.2-40.4zM288 320c0 17.7 14.3 32 32 32l50.7 0-73.4 73.4c-9.2 9.2-11.9 22.9-6.9 34.9S307.1 480 320 480l128 0c17.7 0 32-14.3 32-32s-14.3-32-32-32l-50.7 0 73.4-73.4c9.2-9.2 11.9-22.9 6.9-34.9S460.9 288 448 288l-128 0c-17.7 0-32 14.3-32 32zM150.6 41.4c-12.5-12.5-32.8-12.5-45.3 0l-80 80c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L96 141.3 96 448c0 17.7 14.3 32 32 32s32-14.3 32-32l0-306.7 25.4 25.4c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3l-80-80z"/></svg>`;

// --- 昇順/降順切り替えボタンの作成 ---
const btnOrder = document.createElement("button");
btnOrder.style.padding = "4px 10px";
btnOrder.style.borderRadius = "4px";
btnOrder.style.border = "1px solid var(--background-modifier-border)";
btnOrder.style.backgroundColor = "var(--interactive-normal)";
btnOrder.style.color = "var(--text-normal)";
btnOrder.style.cursor = "pointer";
btnOrder.style.display = "inline-flex";
btnOrder.style.alignItems = "center";
btnOrder.style.justifyContent = "center";
btnOrder.style.gap = "6px";

// アイコンとツールチップ表示を更新する関数
const updateOrderButton = () => {
    if (currentIsAscending) {
        btnOrder.innerHTML = `${SVG_ASC} <span>昇順</span>`;
        btnOrder.title = "昇順 (古い順/A-Z)";
    } else {
        btnOrder.innerHTML = `${SVG_DESC} <span>降順</span>`;
        btnOrder.title = "降順 (新しい順/Z-A)";
    }
};

updateOrderButton(); // 初回表示

// クリック時のトグル（ON/OFF）切り替え処理
btnOrder.addEventListener("click", () => {
    currentIsAscending = !currentIsAscending; // 真偽値を反転
    updateOrderButton();
    renderGallery(); // ギャラリーを再描画
});

// 表示列数 (1～10)
const selectColumns = document.createElement("select");
selectColumns.style.padding = "4px 8px";
selectColumns.style.borderRadius = "4px";
selectColumns.style.border = "1px solid var(--background-modifier-border)";
selectColumns.style.backgroundColor = "var(--background-primary)";
selectColumns.style.color = "var(--text-normal)";

let colOptions = "";
for (let c = 1; c <= 10; c++) {
    colOptions += `<option value="${c}" ${c === currentColumns ? 'selected' : ''}>${c}列</option>`;
}
selectColumns.innerHTML = colOptions;

// コントロールバーに要素を追加
controlBar.appendChild(document.createTextNode("並び替え: "));
controlBar.appendChild(selectSortBy);
controlBar.appendChild(btnOrder);

const spacer = document.createElement("span");
spacer.style.margin = "0 5px";
controlBar.appendChild(spacer);

controlBar.appendChild(document.createTextNode("列数: "));
controlBar.appendChild(selectColumns);

container.appendChild(controlBar);

// 画像拡大用のライトボックス（モーダル）を作成
const modal = document.createElement("div");
modal.style.position = "fixed";
modal.style.top = "0";
modal.style.left = "0";
modal.style.width = "100vw";
modal.style.height = "100vh";
modal.style.backgroundColor = "rgba(0, 0, 0, 0.85)";
modal.style.zIndex = "10000";
modal.style.display = "none";
modal.style.justifyContent = "center";
modal.style.alignItems = "center";
modal.style.cursor = "zoom-out";

const modalImg = document.createElement("img");
modalImg.style.maxWidth = "90vw";
modalImg.style.maxHeight = "90vh";
modalImg.style.objectFit = "contain";
modalImg.style.borderRadius = "8px";
modalImg.style.boxShadow = "0 8px 25px rgba(0,0,0,0.5)";

modal.appendChild(modalImg);

// モーダルをクリックしたら閉じる
modal.addEventListener("click", () => {
    modal.style.display = "none";
});

// --- カルーセルラッパー ---
const carouselWrapper = document.createElement("div");
carouselWrapper.style.position = "relative";
carouselWrapper.style.width = "100%";

// キーボード入力を確実に受け取るため tabindex を設定
const galleryContainer = document.createElement("div");
galleryContainer.setAttribute("tabindex", "0");
galleryContainer.style.outline = "none"; // フォーカス時の青枠を消す
galleryContainer.style.overflowX = "auto"; // はみ出したら横スクロールバーを出す
galleryContainer.style.scrollBehavior = "smooth";
galleryContainer.style.scrollbarWidth = "none"; // Firefoxのスクロールバー非表示
galleryContainer.style.paddingBottom = "10px";

// ボタン共通スタイル（position: sticky で画面表示領域の中央に固定追従）
const applyButtonStyle = (btn, isLeft) => {
    btn.innerHTML = isLeft ? "❮" : "❯";
    btn.style.position = "fixed"; // 画面（ウィンドウ）基準で完全に固定
    btn.style.top = "50%"; // 画面の高さ（ViewHeight）の50%の位置に常に浮遊
    if (isLeft) {
        btn.style.left = "20px";
    } else {
        btn.style.right = "20px";
    }
    btn.style.zIndex = "999";
    btn.style.backgroundColor = "rgba(0, 0, 0, 0.75)";
    btn.style.color = "#ffffff";
    btn.style.border = "none";
    btn.style.borderRadius = "50%";
    btn.style.width = "44px";
    btn.style.height = "44px";
    btn.style.fontSize = "1.3em";
    btn.style.cursor = "pointer";
    btn.style.display = "none"; // 初期状態は非表示
    btn.style.opacity = "0"; // 初期は透明
    btn.style.transition = "opacity 0.2s ease";
    btn.style.boxShadow = "0 4px 10px rgba(0,0,0,0.4)";
    btn.style.pointerEvents = "auto";
};

const btnLeft = document.createElement("button");
const btnRight = document.createElement("button");
applyButtonStyle(btnLeft, true);
applyButtonStyle(btnRight, false);

// ボタンの表示/非表示判定
const updateButtonVisibility = () => {
    const hasScrollableContent = galleryContainer.scrollWidth > galleryContainer.clientWidth + 5;
    if (!hasScrollableContent) {
        btnLeft.style.display = "none";
        btnRight.style.display = "none";
    } else {
        btnLeft.style.display = "block";
        btnRight.style.display = "block";
    }
};

// ホバーイベント（横スクロールが必要な時だけ表示）
carouselWrapper.addEventListener("mouseenter", () => {
    const hasScrollableContent = galleryContainer.scrollWidth > galleryContainer.clientWidth + 5;
    if (hasScrollableContent) {
        btnLeft.style.opacity = "1";
        btnRight.style.opacity = "1";
    }
});

carouselWrapper.addEventListener("mouseleave", () => {
    btnLeft.style.opacity = "0";
    btnRight.style.opacity = "0";
});

window.addEventListener("resize", updateButtonVisibility);

// ボタンのクリック処理
btnLeft.addEventListener("click", (e) => {
    e.stopPropagation();
    galleryContainer.scrollBy({ left: -350, behavior: 'smooth', });
});
btnRight.addEventListener("click", (e) => {
    e.stopPropagation();
    galleryContainer.scrollBy({ left: 350, behavior: 'smooth', });
});

// キーボード左右キー（← / →）でのスライド
galleryContainer.addEventListener("keydown", (e) => {
    // 検索窓や入力欄にカーソルがある場合は処理しない
    if (document.activeElement && ['INPUT', 'TEXTAREA', 'SELECT',].includes(document.activeElement.tagName)) {
        return;
    }

    if (e.key === "ArrowLeft") {
        e.preventDefault();
        galleryContainer.scrollBy({ left: -300, behavior: 'smooth', });
    } else if (e.key === "ArrowRight") {
        e.preventDefault();
        galleryContainer.scrollBy({ left: 300, behavior: 'smooth', });
    }
});

carouselWrapper.appendChild(btnLeft);
carouselWrapper.appendChild(btnRight);
carouselWrapper.appendChild(galleryContainer);
container.appendChild(carouselWrapper);

// --- ギャラリーを再描画する関数 ---
const renderGallery = async () => {
    // ギャラリー表示エリアを一度クリア
    galleryContainer.innerHTML = "";

    // ページのソート処理
    let pages = [...rawPages,].sort((a, b) => {
        let valA = a.file[currentSortBy];
        let valB = b.file[currentSortBy];

        // 日時オブジェクト (DateTime) の場合はミリ秒数値に変換して比較
        if (valA && typeof valA === 'object' && 'ts' in valA) {
            valA = valA.ts;
        }
        if (valB && typeof valB === 'object' && 'ts' in valB) {
            valB = valB.ts;
        }

        // 文字列比較または数値比較
        if (valA < valB) {
            return currentIsAscending ? -1 : 1;
        }
        if (valA > valB) {
            return currentIsAscending ? 1 : -1;
        }
        return 0;
    });

    // 各ファイルをループ処理して表示
    for (let p of pages) {
        // 各ノートから必要な情報を取得
        let path = p.file.path;
        let fileContent = await app.vault.adapter.read(path);

        // HTMLタグ / WikiLink形式(![[...]]) / 標準Markdown形式(![...](...)) をすべて抽出する正規表現
        const imgRegex = /<img[^>]+>|!\[\[([^\]]+)\]\]|!\[([^\]]*)\]\(([^)]+)\)/gi;

        // グローバル検索（/g）を使ってすべてのimgタグを抽出
        let imgMatches = [...fileContent.matchAll(imgRegex),];
        // グローバル検索を使ってすべての #### タイトル行を抽出
        let titleMatches = [...fileContent.matchAll(/####\s+(.*)/g),];

        // 画像がない場合は何もしない
        if (imgMatches.length === 0) {
            continue;
        }

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
        gridDiv.style.gridTemplateColumns = `repeat(${currentColumns}, 1fr)`;
        gridDiv.style.gap = "15px";
        gridDiv.style.textAlign = "center";
        gridDiv.style.alignItems = "start";

        for (let i = 0; i < imgMatches.length; i++) {
            let match = imgMatches[i];
            let imgSrc = "";

            // A/B/C の分岐で「src の URL（文字列）」だけを抽出する
            if (match[0].startsWith("<img")) {
                // A. HTML <img src="..."> タグの場合
                const srcMatch = match[0].match(/src=["'](?!\s*["'])([^"']+)["']/i);
                if (srcMatch) {
                    imgSrc = srcMatch[1];
                }
            } else if (match[1]) {
                // B. Obsidian WikiLink形式 (![[画像名.png]]) の場合
                // '|' 以降のサイズ指定（例: |300）を削る
                let cleanLink = match[1].split("|")[0].trim();
                let file = app.metadataCache.getFirstLinkpathDest(cleanLink, path);

                // 見つからない場合、完全パスや相対パスでの検索を試みる
                if (!file) {

                    file = app.vault.getAbstractFileByPath(cleanLink);
                }

                if (file) {
                    imgSrc = app.vault.getResourcePath(file);
                }
            } else if (match[3]) {
                // C. 標準Markdown形式 (![alt](URL/パス)) の場合
                let src = match[3];
                // 外部URL(http)ではないローカルファイルの場合はリソースパスに変換
                if (!src.startsWith("http://") && !src.startsWith("https://")) {
                    let file = app.metadataCache.getFirstLinkpathDest(src, path);
                    if (file) {
                        src = app.vault.getResourcePath(file);
                    }
                }
                imgSrc = src;
            }

            // 有効な src があるかチェック（空欄や破損リンクの除外）
            if (!imgSrc || imgSrc.trim() === "") {
                continue;
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
            card.className = "gallery-card";
            card.style.backgroundColor = "var(--background-secondary)";
            card.style.padding = "10px";
            card.style.borderRadius = "8px";
            card.style.boxShadow = "0 2px 5px rgba(0,0,0,0.1)";
            card.style.minWidth = cardMinWidth; // 最小横幅を確保！
            card.style.maxWidth = cardMaxWidth;

            // 2. 画像エリア
            let imgWrapper = document.createElement("div");
            imgWrapper.style.marginBottom = "8px";
            imgWrapper.style.overflow = "hidden";
            imgWrapper.style.cursor = "zoom-in"; // 虫眼鏡カーソル

            // <img> 要素を直接作成
            const imgEl = document.createElement("img");
            imgEl.src = imgSrc;
            imgEl.style.width = "100%";
            imgEl.style.height = "auto";
            imgEl.style.borderRadius = "8px";

            // 読み込みエラー時はカードごと削除
            imgEl.addEventListener("error", () => {
                card.remove();
            });

            // クリックで拡大表示
            imgWrapper.addEventListener("click", (e) => {
                e.stopPropagation();
                modalImg.src = imgEl.src;
                modal.style.display = "flex";

                // クリックされた瞬間に、画像が存在するウィンドウの body を取得して移設する！
                const targetDoc = imgWrapper.ownerDocument || document;
                if (modal.parentElement !== targetDoc.body) {
                    targetDoc.body.appendChild(modal);
                }
            });

            imgWrapper.appendChild(imgEl);
            card.appendChild(imgWrapper);

            // 3. タイトル（リンク）エリア
            let titleWrapper = document.createElement("div");
            titleWrapper.style.fontSize = "0.85em";
            titleWrapper.style.fontWeight = "bold";
            titleWrapper.style.wordBreak = "break-word"; // 長い単語でも枠外へはみ出さないように折り返す

            // Obsidian標準の内部リンク<a>をDOM構築
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

    // ボタンの表示チェックを実行
    updateButtonVisibility();

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

selectColumns.addEventListener("change", (e) => {
    currentColumns = parseInt(e.target.value, 10);
    renderGallery();
});

// --- ページ取得と描画を実行する関数 ---
const updatePagesAndRender = () => {
    // 選択されている folder パスに基づいて Dataview でページを取得
    if (targetFolder === "") {
        rawPages = dv.pages(); // Vault全体
    } else {
        rawPages = dv.pages(`"${targetFolder}"`); // 指定フォルダ内
    }
    if (DEBUG) {
        console.log("見つかったページ数:", rawPages.length);
    }

    renderGallery();
};

// 初回レンダリングを実行
updatePagesAndRender();
