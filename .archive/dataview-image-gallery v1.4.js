/**
 * ==============================================================================
 * 🖼️ DataView Image Gallery v1.4
 * ==============================================================================
 * Copyright (c) 2026 ねおん (Neon)
 * https://github.com/neon-aiart/dataview-image-gallery
 * Licensed under the PolyForm Noncommercial License 1.0.0.
 * ==============================================================================
 */

const SCRIPT_VERSION = '1.4';

const DEBUG = false;

// --- 1. デフォルト値の定義 ---
const DEFAULT_SORT_BY = 'name';                  // ソート基準 [name]: 'name' (ファイル名) | 'ctime' (作成日時) | 'mtime' (更新日時)
const DEFAULT_IS_ASCENDING = false;              // ソート順 [false]: false = 降順 (Z-A / 新しい順) | true = 昇順 (A-Z / 古い順)
const DEFAULT_COLUMNS = 5;                       // １列に並べるカードの数 [5]
const DEFAULT_MIN_WIDTH = 100;                   // カードの最小幅 [100] (10～720)
const DEFAULT_MAX_WIDTH = 640;                   // カードの最大幅 [640] (100～2496)
const DEFAULT_FOLDER = dv.current().file.folder; // デフォルトはカレントフォルダ
const DEFAULT_HEADER_LEVELS = [3, 4, ];          // デフォルトの見出しは H3 と H4 ([3, 4, ])
const DEFAULT_FILTER_QUERY = "";                 // 絞り込み
const DEFAULT_FILTER_INCLUDE = true;             // デフォルトは「含む(緑)」

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
let currentFilterQuery = currentNote.filter_query || DEFAULT_FILTER_QUERY;
let rawFilterMode = currentNote.filter_mode;
let currentFilterIncludeMode = DEFAULT_FILTER_INCLUDE;
if (typeof rawFilterMode === "boolean") {
    currentFilterIncludeMode = rawFilterMode; // true / false
} else if (typeof rawFilterMode === "string") {
    currentFilterIncludeMode = (rawFilterMode.toLowerCase() !== "exclude"); // "exclude" 以外はすべて true
}

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

// --- 見出し: YAMLからの読み込み & パース処理 ---
let rawHeader = currentNote.header_level || currentNote.headerlevel || currentNote.header || DEFAULT_HEADER_LEVELS;

// どんな形式の入力（文字列、数値、配列、ObsidianのProxyオブジェクト）でも数値配列に変換する関数
const parseHeaderLevels = (input) => {
    let rawItems = [];

    // Dataviewの特殊配列や通常の配列をフラットな配列に変換
    if (typeof input === 'object' && input !== null) {
        if (Array.isArray(input)) {
            rawItems = input;
        } else if (typeof input.values === 'function') {
            // Dataviewの DataArray 対策
            rawItems = input.values();
        } else {
            // その他のオブジェクト（Proxy等）を配列化
            rawItems = Object.values(input);
        }
    } else {
        rawItems = [input, ];
    }

    let levels = [];

    // 各要素を解析（カンマ区切りやハイフン範囲指定＆混在に対応）
    for (let item of rawItems) {
        let str = String(item).trim();

        // 1. まずカンマで分解する（例: "2, 4-6" ➔ ["2", "4-6"]）
        let parts = str.split(',');

        for (let part of parts) {
            let token = part.trim();
            if (token.includes('-')) {
                // 2. ハイフン指定 (例: "4-6" ➔ 4, 5, 6)
                let [start, end, ] = token.split('-').map(v => parseInt(v.trim(), 10));
                if (!isNaN(start) && !isNaN(end)) {
                    let min = Math.min(start, end);
                    let max = Math.max(start, end);
                    for (let i = min; i <= max; i++) {
                        levels.push(i);
                    }
                }
            } else {
                // 3. 単一数値 (例: "2" ➔ 2)
                levels.push(parseInt(token, 10));
            }
        }
    }

    // 2～6の範囲にある数値だけを抽出し、重複を除外
    const validLevels = [...new Set(levels.filter(n => !isNaN(n) && n >= 2 && n <= 6)), ];

    // 有効な見出しレベルが無ければデフォルト([4])を返す
    return validLevels.length > 0 ? validLevels : DEFAULT_HEADER_LEVELS;
};

const targetHeaderLevels = parseHeaderLevels(rawHeader);

// 現在選択されているレベル配列（ステート変数）
let currentHeaderLevels = [...targetHeaderLevels, ];

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
const folderLabel = document.createElement("label");
folderLabel.textContent = " フォルダ: ";
folderLabel.style.fontWeight = "bold";

const folderSelect = document.createElement("select");
folderSelect.style.padding = "4px 8px";
folderSelect.style.borderRadius = "4px";
folderSelect.style.border = "1px solid var(--background-modifier-border)";

// 「すべて（ルート）」を選択肢に追加
const defaultOption = document.createElement("option");
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
selectSortBy.addEventListener("change", (e) => {
    currentSortBy = e.target.value;
    renderGallery();
});

// --- 昇順降順SVGアイコンの定義 ---
const SVG_ASC = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="16" height="16" fill="currentColor"><path d="M150.6 41.4c-12.5-12.5-32.8-12.5-45.3 0l-80 80c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L96 141.3 96 448c0 17.7 14.3 32 32 32s32-14.3 32-32l0-306.7 25.4 25.4c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3l-80-80zM288 64c0 17.7 14.3 32 32 32l50.7 0-73.4 73.4c-9.2 9.2-11.9 22.9-6.9 34.9S307.1 224 320 224l128 0c17.7 0 32-14.3 32-32s-14.3-32-32-32l-50.7 0 73.4-73.4c9.2-9.2 11.9-22.9 6.9-34.9S461 32 448 32L320 32c-17.7 0-32 14.3-32 32zM412.6 273.7C407.2 262.8 396.1 256 384 256s-23.2 6.8-28.6 17.7l-80 160c-7.9 15.8-1.5 35 14.3 42.9s35 1.5 42.9-14.3l7.2-14.3 88.4 0 7.2 14.3c7.9 15.8 27.1 22.2 42.9 14.3s22.2-27.1 14.3-42.9l-80-160zM384 359.6l20.2 40.4-40.4 0 20.2-40.4z"/></svg>`;
const SVG_DESC = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="16" height="16" fill="currentColor"><path d="M412.6 49.7C407.2 38.8 396.1 32 384 32s-23.2 6.8-28.6 17.7c-50.7 101.3-77.3 154.7-80 160-7.9 15.8-1.5 35 14.3 42.9s35 1.5 42.9-14.3l7.2-14.3 88.4 0 7.2 14.3c7.9 15.8 27.1 22.2 42.9 14.3s22.2-27.1 14.3-42.9c-2.7-5.3-29.3-58.7-80-160zM384 135.6l20.2 40.4-40.4 0 20.2-40.4zM288 320c0 17.7 14.3 32 32 32l50.7 0-73.4 73.4c-9.2 9.2-11.9 22.9-6.9 34.9S307.1 480 320 480l128 0c17.7 0 32-14.3 32-32s-14.3-32-32-32l-50.7 0 73.4-73.4c9.2-9.2 11.9-22.9 6.9-34.9S460.9 288 448 288l-128 0c-17.7 0-32 14.3-32 32zM150.6 41.4c-12.5-12.5-32.8-12.5-45.3 0l-80 80c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L96 141.3 96 448c0 17.7 14.3 32 32 32s32-14.3 32-32l0-306.7 25.4 25.4c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3l-80-80z"/></svg>`;

// --- ソート順切り替えボタンの作成 ---
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

// アイコンとツールチップ表示を更新する関数
const updateOrderButton = () => {
    btnOrder.innerHTML = currentIsAscending ? SVG_ASC : SVG_DESC;
    btnOrder.title = currentIsAscending ? "昇順 (古い順/A-Z)" : "降順 (新しい順/Z-A)";
};

updateOrderButton(); // 初回表示

// クリック時のトグル（ON/OFF）切り替え処理
btnOrder.addEventListener("click", () => {
    currentIsAscending = !currentIsAscending; // 真偽値を反転
    updateOrderButton();
    renderGallery(); // ギャラリーを再描画
});

// 表示枠数 (1～10)
const selectColumns = document.createElement("select");
selectColumns.style.padding = "4px 8px";
selectColumns.style.borderRadius = "4px";
selectColumns.style.border = "1px solid var(--background-modifier-border)";
selectColumns.style.backgroundColor = "var(--background-primary)";
selectColumns.style.color = "var(--text-normal)";

let colOptions = "";
for (let c = 1; c <= 10; c++) {
    colOptions += `<option value="${c}" ${c === currentColumns ? 'selected' : ''}>${c}</option>`;
}
selectColumns.innerHTML = colOptions;
selectColumns.addEventListener("change", (e) => {
    currentColumns = parseInt(e.target.value, 10);
    renderGallery();
});

// --- 1. 見出し用SVG定義 ---
const SVG_HEADER_MAIN = `<svg xmlns="http://www.w3.org/2000/svg" height="18px" viewBox="0 -960 960 960" width="18px" fill="currentColor"><path d="M320-240q-33 0-56.5-23.5T240-320v-480q0-33 23.5-56.5T320-880h480q33 0 56.5 23.5T880-800v480q0 33-23.5 56.5T800-240H320Zm0-80h480v-480H320v480ZM160-80q-33 0-56.5-23.5T80-160v-560h80v560h560v80H160Zm160-720v480-480Z"/><text x="430" y="-600" font-size="580" transform="scale(1.3, 1)" font-family="sans-serif" font-weight="bold" fill="currentColor" text-anchor="middle" dominant-baseline="central">#</text></svg>`;

const SVG_HEADERS = {
    2: `<svg xmlns="http://www.w3.org/2000/svg" height="16px" viewBox="0 -960 960 960" width="16px" fill="currentColor"><path d="M440-360h240v-80H520v-80h80q33 0 56.5-23.5T680-600v-80q0-33-23.5-56.5T600-760H440v80h160v80h-80q-33 0-56.5 23.5T440-520v160ZM320-240q-33 0-56.5-23.5T240-320v-480q0-33 23.5-56.5T320-880h480q33 0 56.5 23.5T880-800v480q0 33-23.5 56.5T800-240H320Zm0-80h480v-480H320v480ZM160-80q-33 0-56.5-23.5T80-160v-560h80v560h560v80H160Zm160-720v480-480Z"/></svg>`,
    3: `<svg xmlns="http://www.w3.org/2000/svg" height="16px" viewBox="0 -960 960 960" width="16px" fill="currentColor"><path d="M440-360h160q33 0 56.5-23.5T680-440v-60q0-26-17-43t-43-17q26 0 43-17t17-43v-60q0-33-23.5-56.5T600-760H440v80h160v80h-80v80h80v80H440v80ZM320-240q-33 0-56.5-23.5T240-320v-480q0-33 23.5-56.5T320-880h480q33 0 56.5 23.5T880-800v480q0 33-23.5 56.5T800-240H320Zm0-80h480v-480H320v480ZM160-80q-33 0-56.5-23.5T80-160v-560h80v560h560v80H160Zm160-720v480-480Z"/></svg>`,
    4: `<svg xmlns="http://www.w3.org/2000/svg" height="16px" viewBox="0 -960 960 960" width="16px" fill="currentColor"><path d="M600-360h80v-400h-80v160h-80v-160h-80v240h160v160ZM320-240q-33 0-56.5-23.5T240-320v-480q0-33 23.5-56.5T320-880h480q33 0 56.5 23.5T880-800v480q0 33-23.5 56.5T800-240H320Zm0-80h480v-480H320v480ZM160-80q-33 0-56.5-23.5T80-160v-560h80v560h560v80H160Zm160-720v480-480Z"/></svg>`,
    5: `<svg xmlns="http://www.w3.org/2000/svg" height="16px" viewBox="0 -960 960 960" width="16px" fill="currentColor"><path d="M440-360h160q33 0 56.5-23.5T680-440v-80q0-33-23.5-56.5T600-600h-80v-80h160v-80H440v240h160v80H440v80ZM320-240q-33 0-56.5-23.5T240-320v-480q0-33 23.5-56.5T320-880h480q33 0 56.5 23.5T880-800v480q0 33-23.5 56.5T800-240H320Zm0-80h480v-480H320v480ZM160-80q-33 0-56.5-23.5T80-160v-560h80v560h560v80H160Zm160-720v480-480Z"/></svg>`,
    6: `<svg xmlns="http://www.w3.org/2000/svg" height="16px" viewBox="0 -960 960 960" width="16px" fill="currentColor"><path d="M520-360h80q33 0 56.5-23.5T680-440v-80q0-33-23.5-56.5T600-600h-80v-80h120v-80H520q-33 0-56.5 23.5T440-680v240q0 33 23.5 56.5T520-360Zm0-160h80v80h-80v-80ZM320-240q-33 0-56.5-23.5T240-320v-480q0-33 23.5-56.5T320-880h480q33 0 56.5 23.5T880-800v480q0 33-23.5 56.5T800-240H320Zm0-80h480v-480H320v480ZM160-80q-33 0-56.5-23.5T80-160v-560h80v560h560v80H160Zm160-720v480-480Z"/></svg>`,
};

// --- 2. 親ボタン & パネルの作成 ---
const btnHeaderToggle = document.createElement("button");
btnHeaderToggle.style.padding = "4px 8px";
btnHeaderToggle.style.borderRadius = "4px";
btnHeaderToggle.style.border = "1px solid var(--background-modifier-border)";
btnHeaderToggle.style.backgroundColor = "var(--interactive-normal)";
btnHeaderToggle.style.color = "var(--text-normal)";
btnHeaderToggle.style.cursor = "pointer";
btnHeaderToggle.style.display = "inline-flex";
btnHeaderToggle.style.alignItems = "center";
btnHeaderToggle.title = "対象見出しレベルの切替";
btnHeaderToggle.insertAdjacentHTML("afterbegin", SVG_HEADER_MAIN);

// ボタンの凹み（アクティブ）見た目を更新する関数
const updateHeaderToggleStyle = () => {
    const isOpen = headerPanel.style.display === "flex";
    if (isOpen) {
        btnHeaderToggle.style.backgroundColor = "var(--interactive-accent)";
        btnHeaderToggle.style.color = "var(--text-on-accent)";
    } else {
        btnHeaderToggle.style.backgroundColor = "var(--interactive-normal)";
        btnHeaderToggle.style.color = "var(--text-normal)";
    }
};

btnHeaderToggle.addEventListener("click", () => {
    const isHidden = headerPanel.style.display === "none";
    headerPanel.style.display = isHidden ? "flex" : "none";
    updateHeaderToggleStyle();
});

// サブボタンを展開する2段目パネル
const headerPanel = document.createElement("div");
headerPanel.style.display = "none"; // 最初は非表示
headerPanel.style.gap = "6px";
headerPanel.style.marginTop = "8px";
headerPanel.style.padding = "6px 10px";
headerPanel.style.backgroundColor = "var(--background-primary)";
headerPanel.style.borderRadius = "6px";
headerPanel.style.border = "1px solid var(--background-modifier-border)";
headerPanel.style.width = "100%";

// サブボタン（2～6）の動的生成＆イベント
const headerButtons = {};

[2, 3, 4, 5, 6, ].forEach(lvl => {
    const btn = document.createElement("button");
    btn.style.padding = "4px 8px";
    btn.style.borderRadius = "4px";
    btn.style.border = "1px solid var(--background-modifier-border)";
    btn.style.cursor = "pointer";
    btn.style.display = "inline-flex";
    btn.style.alignItems = "center";
    btn.style.justifyContent = "center";

    btn.insertAdjacentHTML("afterbegin", SVG_HEADERS[lvl]);

    // ボタンのハイライト見た目を更新する関数
    const updateStyle = () => {
        if (currentHeaderLevels.includes(lvl)) {
            btn.style.backgroundColor = "var(--interactive-accent)";
            btn.style.color = "var(--text-on-accent)";
        } else {
            btn.style.backgroundColor = "var(--interactive-normal)";
            btn.style.color = "var(--text-muted)";
        }
    };

    btn.addEventListener("click", () => {
        if (currentHeaderLevels.includes(lvl)) {
            // 選択解除（ただし最後1つは解除させない安全弁）
            if (currentHeaderLevels.length > 1) {
                currentHeaderLevels = currentHeaderLevels.filter(h => h !== lvl);
            }
        } else {
            // 選択追加
            currentHeaderLevels.push(lvl);
            currentHeaderLevels.sort();
        }

        // 全ボタンのスタイル更新と再描画
        Object.values(headerButtons).forEach(b => b.updateStyle());
        renderGallery();
    });

    btn.updateStyle = updateStyle;
    btn.updateStyle();
    headerButtons[lvl] = btn;
    headerPanel.appendChild(btn);
});

// --- 絞り込み用SVG ---
const SVG_FILTER_TUNER = `<svg xmlns="http://www.w3.org/2000/svg" height="18px" viewBox="0 -960 960 960" width="18px" fill="currentColor"><path d="M440-120v-240h80v80h320v80H520v80h-80Zm-320-80v-80h240v80H120Zm160-160v-80H120v-80h160v-80h80v240h-80Zm160-80v-80h400v80H440Zm160-160v-240h80v80h160v80H680v80h-80Zm-480-80v-80h400v80H120Z"/></svg>`;
const SVG_WAND = `<svg xmlns="http://www.w3.org/2000/svg" height="18px" viewBox="0 -960 960 960" width="18px" fill="currentColor"><path d="m176-120-56-56 301-302-181-45 198-123-17-234 179 151 216-88-87 217 151 178-234-16-124 198-45-181-301 301Zm24-520-80-80 80-80 80 80-80 80Zm355 197 48-79 93 7-60-71 35-86-86 35-71-59 7 92-79 49 90 22 23 90Zm165 323-80-80 80-80 80 80-80 80ZM569-570Z"/></svg>`;

// --- コントロールバー側の「調整親ボタン」 ---
const btnFilterToggle = document.createElement("button");
btnFilterToggle.style.padding = "4px 8px";
btnFilterToggle.style.borderRadius = "4px";
btnFilterToggle.style.border = "1px solid var(--background-modifier-border)";
btnFilterToggle.style.backgroundColor = "var(--interactive-normal)";
btnFilterToggle.style.color = "var(--text-normal)";
btnFilterToggle.style.cursor = "pointer";
btnFilterToggle.style.display = "inline-flex";
btnFilterToggle.style.alignItems = "center";
btnFilterToggle.title = "絞り込みフィルターの開閉";
btnFilterToggle.insertAdjacentHTML("afterbegin", SVG_FILTER_TUNER);

// ボタンの凹み（アクティブ）見た目を更新する関数
const updateFilterToggleStyle = () => {
    const isOpen = filterPanel.style.display === "flex";
    if (isOpen) {
        btnFilterToggle.style.backgroundColor = "var(--interactive-accent)";
        btnFilterToggle.style.color = "var(--text-on-accent)";
    } else {
        btnFilterToggle.style.backgroundColor = "var(--interactive-normal)";
        btnFilterToggle.style.color = "var(--text-normal)";
    }
};

btnFilterToggle.addEventListener("click", () => {
    const isHidden = filterPanel.style.display === "none";
    filterPanel.style.display = isHidden ? "flex" : "none";
    updateFilterToggleStyle();
});

// --- 2段目の絞り込みパネル ---
const filterPanel = document.createElement("div");
filterPanel.style.display = "none"; // 初期状態は非表示
filterPanel.style.gap = "6px";
filterPanel.style.marginTop = "8px";
filterPanel.style.padding = "6px 10px";
filterPanel.style.backgroundColor = "var(--background-primary)";
filterPanel.style.borderRadius = "6px";
filterPanel.style.border = "1px solid var(--background-modifier-border)";
filterPanel.style.width = "100%";
filterPanel.style.alignItems = "center";

// --- パネルの中身（入力欄 ＋ 魔法の杖ボタン） ---
const filterInput = document.createElement("input");
filterInput.type = "text";
filterInput.placeholder = "絞り込み (正規表現可)...";
filterInput.value = currentFilterQuery;
filterInput.style.padding = "4px 8px";
filterInput.style.borderRadius = "4px";
filterInput.style.border = "1px solid var(--background-modifier-border)";
filterInput.style.backgroundColor = "var(--background-secondary)";
filterInput.style.color = "var(--text-normal)";
filterInput.style.fontSize = "0.85em";
filterInput.style.flexGrow = "1";

const btnFilterMode = document.createElement("button");
btnFilterMode.style.padding = "4px 8px";
btnFilterMode.style.borderRadius = "4px";
btnFilterMode.style.border = "1px solid var(--background-modifier-border)";
btnFilterMode.style.cursor = "pointer";
btnFilterMode.style.display = "inline-flex";
btnFilterMode.style.alignItems = "center";
btnFilterMode.style.justifyContent = "center";
btnFilterMode.insertAdjacentHTML("afterbegin", SVG_WAND);

// ボタンの状態（色とツールチップ）を更新する関数
const updateFilterButtonStyle = () => {
    if (currentFilterIncludeMode) {
        btnFilterMode.style.backgroundColor = "#2e7d32"; // 緑
        btnFilterMode.style.color = "#ffffff";
        btnFilterMode.title = "モード: 一致するものを表示 (含む)";
    } else {
        btnFilterMode.style.backgroundColor = "#c62828"; // 赤
        btnFilterMode.style.color = "#ffffff";
        btnFilterMode.title = "モード: 一致するものを除外 (消す)";
    }
};

updateFilterButtonStyle();

// リアルタイム検索とモード切替
filterInput.addEventListener("input", (e) => {
    currentFilterQuery = e.target.value;
    renderGallery();
});

btnFilterMode.addEventListener("click", () => {
    currentFilterIncludeMode = !currentFilterIncludeMode;
    updateFilterButtonStyle();
    renderGallery();
});

// --- トップへ戻るフローティングボタン（左下固定） ---
const SVG_TOP = `<svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="currentColor"><path d="M440-160v-487L216-423l-56-57 320-320 320 320-56 57-224-224v487h-80Z"/></svg>`;

const btnScrollTop = document.createElement("button");
btnScrollTop.style.position = "fixed";
btnScrollTop.style.bottom = "30px";  // 画面下から30px
btnScrollTop.style.left = "30px";    // 画面左から30px
btnScrollTop.style.zIndex = "999";
btnScrollTop.style.backgroundColor = "rgba(0, 0, 0, 0.75)";
btnScrollTop.style.color = "#ffffff";
btnScrollTop.style.border = "1px solid var(--background-modifier-border)";
btnScrollTop.style.borderRadius = "50%";
btnScrollTop.style.width = "44px";
btnScrollTop.style.height = "44px";
btnScrollTop.style.cursor = "pointer";
btnScrollTop.style.display = "inline-flex";
btnScrollTop.style.alignItems = "center";
btnScrollTop.style.justifyContent = "center";
btnScrollTop.style.boxShadow = "0 4px 10px rgba(0,0,0,0.4)";
btnScrollTop.style.opacity = "0"; // 初期状態は非表示
btnScrollTop.style.pointerEvents = "none"; // 非表示時はクリック判定を無効化
btnScrollTop.style.transition = "opacity 0.25s ease, transform 0.2s ease, background-color 0.2s ease";
btnScrollTop.title = "一番上に戻る";
btnScrollTop.insertAdjacentHTML("afterbegin", SVG_TOP);

// ホバーアニメーション
btnScrollTop.addEventListener("mouseenter", () => {
    btnScrollTop.style.backgroundColor = "var(--interactive-accent)";
    btnScrollTop.style.transform = "scale(1.1)";
});
btnScrollTop.addEventListener("mouseleave", () => {
    btnScrollTop.style.backgroundColor = "rgba(0, 0, 0, 0.75)";
    btnScrollTop.style.transform = "scale(1.0)";
});

// クリックイベント
btnScrollTop.addEventListener("click", (e) => {
    e.stopPropagation();
    container.scrollIntoView({ behavior: "smooth", block: "start", });
});

// IntersectionObserver でコントロールバーの見え隠れを監視
const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        // コントロールバーが画面から見えなくなったら（isIntersecting === false）ボタンを表示
        if (!entry.isIntersecting) {
            btnScrollTop.style.opacity = "1";
            btnScrollTop.style.pointerEvents = "auto";
        } else {
            btnScrollTop.style.opacity = "0";
            btnScrollTop.style.pointerEvents = "none";
        }
    });
}, {
    threshold: 0, // 1ピクセルでも画面外に出たら発火
});

// コントロールバー（画面の一番上にある要素）の監視を開始
observer.observe(controlBar);

// container の配下に appendChild する
container.appendChild(btnScrollTop);

// パネルに要素をセット
filterPanel.append(filterInput, btnFilterMode);

// コントロールバーに追加
controlBar.appendChild(folderLabel);
controlBar.appendChild(folderSelect);
controlBar.appendChild(document.createTextNode("並び替え: "));
controlBar.appendChild(selectSortBy);
controlBar.appendChild(btnOrder);

const spacer = document.createElement("span");
spacer.style.margin = "0 3px";
controlBar.appendChild(spacer);

controlBar.appendChild(document.createTextNode("列ごとの枠: "));
controlBar.appendChild(selectColumns);
controlBar.appendChild(btnHeaderToggle);
controlBar.appendChild(btnFilterToggle);

// メインコンテナへ順に配置
container.appendChild(controlBar);
container.appendChild(headerPanel); // 見出しパネル
container.appendChild(filterPanel); // フィルターパネル

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
    if (document.activeElement && ['INPUT', 'TEXTAREA', 'SELECT', ].includes(document.activeElement.tagName)) {
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
    let pages = [...rawPages, ].sort((a, b) => {
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
        let imgMatches = [...fileContent.matchAll(imgRegex), ];

        // 見出しレベルに応じた正規表現パターンを動的生成（例: [2, 3, 4] ➔ /^(?:#{2}|#{3}|#{4})\s+(.*)$/gm）
        const headerPattern = currentHeaderLevels.map(lvl => `#{${lvl}}`).join('|');
        const titleRegex = new RegExp(`^(?:${headerPattern})\\s+(.*)$`, 'gm');
        if (DEBUG){
            console.log("現在の見出しレベル:", currentHeaderLevels);
        }

        // ファイル本文から見出しタイトルを抽出
        let titleMatches = [...fileContent.matchAll(titleRegex), ];

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

        // カード生成ループ
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

            // 絞り込みロジック
            if (currentFilterQuery.trim() !== "") {
                let isMatch = false;
                try {
                    // 大文字小文字を区別しない(i)正規表現オブジェクトを作成
                    const regex = new RegExp(currentFilterQuery, "i");
                    // パスまたは見出しタイトルのどちらかにヒットするか
                    isMatch = regex.test(p.file.path) || regex.test(titleLine);
                } catch (e) {
                    // 正規表現として不完全な入力（打ちかけ等）の場合は単純な部分一致でフォールバック
                    isMatch = p.file.path.includes(currentFilterQuery) || titleLine.includes(currentFilterQuery);
                }

                // 「含むモード」で不一致、または「除外モード」で一致した場合はカードを作らずスキップ
                if (currentFilterIncludeMode && !isMatch) {
                    continue;
                }
                if (!currentFilterIncludeMode && isMatch) {
                    continue;
                }
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

    // (c)
    const footer = document.createElement("div");
    footer.style.marginTop = "40px";
    footer.style.paddingTop = "15px";
    footer.style.borderTop = "1px solid var(--background-modifier-border)";
    footer.style.textAlign = "center";
    footer.style.fontSize = "0.75em";
    footer.style.color = "var(--text-muted)";
    footer.style.lineHeight = "1.5";

    const line1 = document.createElement("div");

    const link = document.createElement("a");
    link.href = "https://github.com/neon-aiart/dataview-image-gallery";
    link.target = "_blank";
    link.rel = "noopener";
    link.textContent = "DataView Image Gallery";
    link.style.color = "var(--text-muted)";
    link.style.textDecoration = "underline";

    line1.append("🖼️ ", link, ` v${SCRIPT_VERSION}`);

    const line2 = document.createElement("div");
    line2.textContent = "Copyright (c) 2026 ねおん (Neon)";

    footer.append(line1, line2);

    galleryContainer.appendChild(footer);

    // Obsidianに埋め込まれたWikiLink（[[...]]）をHTMLとして正しくプレビュー変換させる
    dv.paragraph("");
    if (DEBUG) {
        console.log("すべてのHTML生成・出力完了");
    }
};

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
