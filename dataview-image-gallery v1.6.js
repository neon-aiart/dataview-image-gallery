/**
 * ==============================================================================
 * 🏖️ DataView Image Gallery v1.6
 * ==============================================================================
 * Copyright (c) 2026 ねおん (Neon)
 * https://github.com/neon-aiart/dataview-image-gallery
 * Licensed under the PolyForm Noncommercial License 1.0.0.
 * ==============================================================================
 * 🫧 Icon Libraries & Licenses:
 * - Font Awesome Free v7.3.1 (CC BY 4.0): https://fontawesome.com/search?ic=free-collection
 *   - ©️ 2026 Fonticons, Inc.: https://fontawesome.com/license/free
 * - Google Material Symbols (Apache 2.0): https://fonts.google.com/icons
 *   - ©️ Google LLC: https://www.apache.org/licenses/LICENSE-2.0
 * - Lucide Icons (ISC): https://lucide.dev/icons/
 *   - ©️ Lucide Contributors: https://lucide.dev/license
 * ==============================================================================
 */

const SCRIPT_VERSION = '1.6';
const STORAGE_KEY = "dataview_image_gallery";
const CHECK_INTERVAL = 24 * 60 * 60 * 1000; // 24時間（ミリ秒）
const VERSION_CHECK = true;

const DEFAULT_DEBUG = false;

// --- 1. デフォルト値の定義 ---
const DEFAULT_SORT_BY = 'name';                  // ソート基準 [name]: 'name' (ファイル名) | 'ctime' (作成日時) | 'mtime' (更新日時)
const DEFAULT_IS_ASCENDING = false;              // ソート順 [false]: false = 降順 (Z-A / 新しい順) | true = 昇順 (A-Z / 古い順)
const DEFAULT_COLUMNS = 5;                       // カードの列の数 [5]
const DEFAULT_MIN_WIDTH = 100;                   // カードの最小幅 [100] (10～720)
const DEFAULT_MAX_WIDTH = 640;                   // カードの最大幅 [640] (100～2496)
const DEFAULT_FOLDER = dv.current().file.folder; // デフォルトはカレントフォルダ
const DEFAULT_HEADER_LEVELS = [3, 4, ];          // デフォルトの見出しは H3 と H4 ([3, 4, ])
const DEFAULT_FILTER_QUERY = "";                 // 絞り込み
const DEFAULT_FILTER_INCLUDE = true;             // デフォルトは「含む(緑)」
const DEFAULT_ALL_HR_MODE = false;               // すべての区切り線をブロック化

// 一覧から除外するNGフォルダリスト: 完全一致、または部分一致で弾くフォルダ名・パスを指定
const DEFAULT_NG_FOLDERS = [
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
const DEBUG = currentNote?.debug ?? DEFAULT_DEBUG;

// YAMLから配列またはカンマ区切り文字列を取得してキレイな配列に変換するヘルパー
const parseNgFolders = (rawVal) => {
    if (!rawVal) return [];
    if (Array.isArray(rawVal)) return rawVal.map(item => String(item).trim()).filter(Boolean);
    if (typeof rawVal === "string") return rawVal.split(",").map(item => item.trim()).filter(Boolean);
    return [String(rawVal).trim(),];
};

const yamlNg = parseNgFolders(currentNote.ng_folders);

// デフォルトとユーザー指定のYAMLを統合（重複を除去）
const NG_FOLDERS = Array.from(new Set([...DEFAULT_NG_FOLDERS, ...yamlNg,]));
if (DEBUG) console.log("[DEBUG] NGフォルダリスト:", NG_FOLDERS);

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

// --- Obsidianのメタデータキャッシュから「生のYAML文字列」を直接取得 ---
function getRawYamlString(fieldName, defaultValue = "") {
    const file = app.vault.getAbstractFileByPath(dv.current().file.path);
    const rawValue = app.metadataCache.getFileCache(file)?.frontmatter?.[fieldName];
    return (rawValue !== undefined && rawValue !== null) ? String(rawValue).trim() : defaultValue;
}

// ① クエリ文字列：Dataviewのお節介を回避して生のまま取得
let currentFilterQuery = getRawYamlString("filter_query", DEFAULT_FILTER_QUERY);
// ② モード判定：booleanの解釈は Dataview(dv.current) に任せる
const rawFilterMode = currentNote.filter_mode;
let currentFilterIncludeMode = DEFAULT_FILTER_INCLUDE;
if (typeof rawFilterMode === "boolean") {
    currentFilterIncludeMode = rawFilterMode; // true / false
} else if (typeof rawFilterMode === "string") {
    currentFilterIncludeMode = (rawFilterMode.toLowerCase() !== "exclude"); // "exclude" 以外はすべて true
}
if (DEBUG) console.log("YAML読み込み結果:", currentFilterQuery, currentFilterIncludeMode);

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
    console.warn(`[GALLERY] 指定されたフォルダ "${targetFolder}" が見つからないため、全体を表示します。`);
    targetFolder = DEFAULT_FOLDER;
} else if (DEBUG) {
    console.log(`[DEBUG] ターゲットフォルダ設定: "${targetFolder || '（Vault全体）'}"`);
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
                    for (let i = min; i <= max; i++) levels.push(i);
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

// すべての区切り線
let hrMode = currentNote.all_hr_mode || DEFAULT_ALL_HR_MODE;

let rawPages = [];

// UIとギャラリー領域を描画するルートコンテナ
const container = dv.el("div", "");
container.style.marginBottom = "20px";

// コントロールバー
const controlBar = document.createElement("div");
controlBar.style.display = "flex";
controlBar.style.flexShrink = "0";
controlBar.style.flexWrap = "wrap"; // 画面が狭い時に折り返せるように設定
controlBar.style.gap = "10px";
controlBar.style.alignItems = "center";
controlBar.style.minHeight = "40px"; // 高さを確保してレイアウトの揺れを防ぐ
controlBar.style.marginBottom = "15px";
controlBar.style.padding = "8px 12px";
controlBar.style.backgroundColor = "var(--background-secondary)";
controlBar.style.borderRadius = "6px";
controlBar.style.fontSize = "0.9em";

// 🔔 バージョンチェックを実行し、新バージョンがあれば右端にボタンを追加
checkForUpdates().then((newVersion) => {
    if (!newVersion) return;

    const updateBadge = document.createElement("a");
    updateBadge.href = "https://github.com/neon-aiart/dataview-image-gallery/releases/latest";
    updateBadge.target = "_blank";
    // updateBadge.title = `新しいバージョン (${newVersion}) が利用可能です！クリックしてGitHubを開く`;
    updateBadge.title = `New version (${newVersion}) available! Click to open GitHub`;
    updateBadge.innerText = `🔔`;

    // 右端に押し出すスタイル
    updateBadge.style.marginLeft = "auto";
    updateBadge.style.padding = "4px 8px";
    updateBadge.style.backgroundColor = "var(--interactive-accent)";
    updateBadge.style.color = "var(--text-on-accent)";
    updateBadge.style.borderRadius = "4px";
    updateBadge.style.fontWeight = "bold";
    updateBadge.style.fontSize = "0.85em";
    updateBadge.style.textDecoration = "none";
    updateBadge.style.cursor = "pointer";

    controlBar.appendChild(updateBadge);
});

// --- コントロールバーに「フォルダ選択」を追加 ---
const SVG_FOLDER = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="16" height="16" fill="currentColor">><path d="M128 96C92.7 96 64 124.7 64 160L64 480C64 515.3 92.7 544 128 544C128 561.7 142.3 576 160 576C177.7 576 192 561.7 192 544L448 544C448 561.7 462.3 576 480 576C497.7 576 512 561.7 512 544C547.3 544 576 515.3 576 480L576 160C576 124.7 547.3 96 512 96L128 96zM320 320C320 284.7 291.3 256 256 256C220.7 256 192 284.7 192 320C192 355.3 220.7 384 256 384C291.3 384 320 355.3 320 320zM128 320C128 249.3 185.3 192 256 192C326.7 192 384 249.3 384 320C384 390.7 326.7 448 256 448C185.3 448 128 390.7 128 320zM512 272C512 289.8 502.3 305.3 488 313.6L488 392C488 405.3 477.3 416 464 416C450.7 416 440 405.3 440 392L440 313.6C425.7 305.3 416 289.8 416 272C416 245.5 437.5 224 464 224C490.5 224 512 245.5 512 272z"/></svg>`;

const folderLabel = document.createElement("span");
folderLabel.style.display = "inline-flex";
folderLabel.style.alignItems = "center";
folderLabel.innerHTML = SVG_FOLDER + ":";

const folderSelect = document.createElement("select");
folderSelect.style.padding = "4px 8px";
folderSelect.style.borderRadius = "4px";
folderSelect.style.border = "1px solid var(--background-modifier-border)";

// 「すべて（ルート）」を選択肢に追加
const defaultOption = document.createElement("option");
defaultOption.value = "";
defaultOption.textContent = "（Vault全体）";
if (targetFolder === "") defaultOption.selected = true;
folderSelect.appendChild(defaultOption);

// Vault内の全フォルダを選択肢として追加（アルファベット順にソート）
allFolders.sort().forEach(folderPath => {
    let opt = document.createElement("option");
    opt.value = folderPath;
    opt.textContent = folderPath;
    if (folderPath === targetFolder) opt.selected = true;
    folderSelect.appendChild(opt);
});

// フォルダ変更時のイベント処理
folderSelect.addEventListener("change", (e) => {
    targetFolder = e.target.value;
    if (DEBUG) console.log(`[DEBUG] フォルダ変更: "${targetFolder}"`);
    // 選択されたフォルダを基準に pages を再取得
    updatePagesAndRender();
});

// --- 並び替え用の SVG アイコンを作成 ---
const SVG_SORT = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960" width="20px" height="20px" fill="currentColor"><path d="m80-280 150-400h86l150 400h-82l-34-96H196l-32 96H80Zm140-164h104l-48-150h-6l-50 150Zm328 164v-76l202-252H556v-72h282v76L638-352h202v72H548ZM360-760l120-120 120 120H360ZM480-80 360-200h240L480-80Z"/></svg>`;

const sortIcon = document.createElement("span");
sortIcon.style.display = "inline-flex";
sortIcon.style.alignItems = "center";
sortIcon.style.color = "var(--text-muted)"; // 少し落ち着いた文字色に
sortIcon.innerHTML = SVG_SORT + ":";

// --- ソート基準切替ボタン（ファイル名 → 作成日時 → 更新日時） ---
const btnSortBy = document.createElement("button");
btnSortBy.style.padding = "4px 8px";
btnSortBy.style.borderRadius = "4px";
btnSortBy.style.border = "1px solid var(--background-modifier-border)";
btnSortBy.style.backgroundColor = "var(--interactive-normal)";
btnSortBy.style.color = "var(--text-normal)";
btnSortBy.style.cursor = "pointer";
btnSortBy.style.display = "inline-flex";
btnSortBy.style.alignItems = "center";
btnSortBy.style.justifyContent = "center";

// ボタンの表示（アイコンとツールチップ）を更新する関数
const SVG_SORT_NAME = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960" width="18px" height="18px" fill="currentColor"><path d="M680-360q-17 0-28.5-11.5T640-400v-160q0-17 11.5-28.5T680-600h120q17 0 28.5 11.5T840-560v40h-60v-20h-80v120h80v-20h60v40q0 17-11.5 28.5T800-360H680Zm-300 0v-240h160q17 0 28.5 11.5T580-560v40q0 17-11.5 28.5T540-480q17 0 28.5 11.5T580-440v40q0 17-11.5 28.5T540-360H380Zm60-150h80v-30h-80v30Zm0 90h80v-30h-80v30Zm-320 60v-200q0-17 11.5-28.5T160-600h120q17 0 28.5 11.5T320-560v200h-60v-60h-80v60h-60Zm60-120h80v-60h-80v60Z"/></svg>`;
const SVG_SORT_CTIME = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960" width="18px" height="18px" fill="currentColor"><path d="m787-145 28-28-75-75v-112h-40v128l87 87Zm-587 25q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h560q33 0 56.5 23.5T840-760v268q-19-9-39-15.5t-41-9.5v-243H200v560h242q3 22 9.5 42t15.5 38H200Zm0-120v40-560 243-3 280Zm80-40h163q3-21 9.5-41t14.5-39H280v80Zm0-160h244q32-30 71.5-50t84.5-27v-3H280v80Zm0-160h400v-80H280v80ZM720-40q-83 0-141.5-58.5T520-240q0-83 58.5-141.5T720-440q83 0 141.5 58.5T920-240q0 83-58.5 141.5T720-440Z"/></svg>`;
const SVG_SORT_MTIME = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960" width="18px" height="18px" fill="currentColor"><path d="M200-80q-33 0-56.5-23.5T120-160v-560q0-33 23.5-56.5T200-800h40v-80h80v80h320v-80h80v80h40q33 0 56.5 23.5T840-720v200h-80v-40H200v400h280v80H200Zm0-560h560v-80H200v80Zm0 0v-80 80ZM560-80v-123l221-220q9-9 20-13t22-4q12 0 23 4.5t20 13.5l37 37q8 9 12.5 20t4.5 22q0 11-4 22.5T903-300L683-80H560Zm300-263-37-37 37 37ZM620-140h38l121-122-18-19-19-18-122 121v38Zm141-141-19-18 37 37-18-19Z"/></svg>`;

const updateSortByButton = () => {
    if (currentSortBy === 'name') {
        btnSortBy.innerHTML = SVG_SORT_NAME;
        btnSortBy.title = "ファイル名 (File Name)";
    } else if (currentSortBy === 'ctime') {
        btnSortBy.innerHTML = SVG_SORT_CTIME;
        btnSortBy.title = "作成日時 (Created Date)";
    } else {
        btnSortBy.innerHTML = SVG_SORT_MTIME;
        btnSortBy.title = "更新日時 (Modified Date)";
    }
};

updateSortByButton(); // 初回表示

// クリックイベント：名 → 作成 → 更新 → 名 ... とトグルする
btnSortBy.addEventListener("click", (e) => {
    e.stopPropagation();
    if (currentSortBy === 'name') {
        currentSortBy = 'ctime';
    } else if (currentSortBy === 'ctime') {
        currentSortBy = 'mtime';
    } else {
        currentSortBy = 'name';
    }

    updateSortByButton();
    if (DEBUG) console.log(`[DEBUG] ソート基準変更: ${currentSortBy}`);
    renderGallery();
});

// --- 昇順降順SVGアイコンの定義 ---
const SVG_ASC = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="16" height="16" fill="currentColor"><path d="M230.6 390.6l-80 80c-12.5 12.5-32.8 12.5-45.3 0l-80-80c-12.5-12.5-12.5-32.8 0-45.3s32.8-12.5 45.3 0L96 370.7 96 64c0-17.7 14.3-32 32-32s32 14.3 32 32l0 306.7 25.4-25.4c12.5-12.5 32.8-12.5 45.3 0s12.5 32.8 0 45.3zm182-340.9c50.7 101.3 77.3 154.7 80 160 7.9 15.8 1.5 35-14.3 42.9s-35 1.5-42.9-14.3l-7.2-14.3-88.4 0-7.2 14.3c-7.9 15.8-27.1 22.2-42.9 14.3s-22.2-27.1-14.3-42.9c2.7-5.3 29.3-58.7 80-160 5.4-10.8 16.5-17.7 28.6-17.7s23.2 6.8 28.6 17.7zM384 135.6l-20.2 40.4 40.4 0-20.2-40.4zM288 320c0-17.7 14.3-32 32-32l128 0c12.9 0 24.6 7.8 29.6 19.8s2.2 25.7-6.9 34.9L397.3 416 448 416c17.7 0 32 14.3 32 32s-14.3 32-32 32l-128 0c-12.9 0-24.6-7.8-29.6-19.8s-2.2-25.7 6.9-34.9l73.4-73.4-50.7 0c-17.7 0-32-14.3-32-32z"/></svg>`;
const SVG_DESC = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="16" height="16" fill="currentColor"><path d="M230.6 390.6l-80 80c-12.5 12.5-32.8 12.5-45.3 0l-80-80c-12.5-12.5-12.5-32.8 0-45.3s32.8-12.5 45.3 0L96 370.7 96 64c0-17.7 14.3-32 32-32s32 14.3 32 32l0 306.7 25.4-25.4c12.5-12.5 32.8-12.5 45.3 0s12.5 32.8 0 45.3zM288 64c0-17.7 14.3-32 32-32l128 0c12.9 0 24.6 7.8 29.6 19.8s2.2 25.7-6.9 34.9L397.3 160 448 160c17.7 0 32 14.3 32 32s-14.3 32-32 32l-128 0c-12.9 0-24.6-7.8-29.6-19.8s-2.2-25.7 6.9-34.9L370.8 96 320 96c-17.7 0-32-14.3-32-32zM412.6 273.7l80 160c7.9 15.8 1.5 35-14.3 42.9s-35 1.5-42.9-14.3l-7.2-14.3-88.4 0-7.2 14.3c-7.9 15.8-27.1 22.2-42.9 14.3s-22.2-27.1-14.3-42.9l80-160c5.4-10.8 16.5-17.7 28.6-17.7s23.2 6.8 28.6 17.7zM384 359.6l-20.2 40.4 40.4 0-20.2-40.4z"/></svg>`;

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

// --- 列数用の SVG アイコン ---
const SVG_COLUMNS = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960" width="20px" height="20px" fill="currentColor"><path d="M520-600v-240h320v240H520ZM120-440v-400h320v400H120Zm400 320v-400h320v400H520Zm-400 0v-240h320v240H120Zm80-400h160v-240H200v240Zm400 320h160v-240H600v240Zm0-480h160v-80H600v80ZM200-200h160v-80H200v80Zm160-320Zm240-160Zm0 240ZM360-280Z"/></svg>`;

const columnsIcon = document.createElement("span");
columnsIcon.style.display = "inline-flex";
columnsIcon.style.alignItems = "center";
columnsIcon.style.color = "var(--text-muted)";
columnsIcon.innerHTML = SVG_COLUMNS + ":";

// 列数 (1～10)
const selectColumns = document.createElement("select");
selectColumns.style.padding = "4px 8px";
selectColumns.style.borderRadius = "4px";
selectColumns.style.border = "1px solid var(--background-modifier-border)";
selectColumns.style.backgroundColor = "var(--background-primary)";
selectColumns.style.color = "var(--text-normal)";
selectColumns.style.textAlign = "center";
selectColumns.style.textAlignLast = "center";

let colOptions = "";
for (let c = 1; c <= 10; c++) {
    colOptions += `<option value="${c}" ${c === currentColumns ? 'selected' : ''}>${c}</option>`;
}
selectColumns.innerHTML = colOptions;
selectColumns.addEventListener("change", (e) => {
    currentColumns = parseInt(e.target.value, 10);
    if (DEBUG) console.log(`[DEBUG] 列ごとの枠数変更:`, currentColumns);
    renderGallery();
});

selectColumns.addEventListener("click", (e) => e.stopPropagation());

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
btnHeaderToggle.title = "見出しレベル (Header Level)";
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

// サブボタンを展開する２段目パネル
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
            // 選択解除（ただし最後１つは解除させない安全弁）
            if (currentHeaderLevels.length > 1) currentHeaderLevels = currentHeaderLevels.filter(h => h !== lvl);
        } else {
            // 選択追加
            currentHeaderLevels.push(lvl);
            currentHeaderLevels.sort();
        }

        // 全ボタンのスタイル更新と再描画
        Object.values(headerButtons).forEach(b => b.updateStyle());
        if (DEBUG) console.log(`[DEBUG] 抽出見出しレベル変更:`, currentHeaderLevels);
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
btnFilterToggle.title = "絞り込みフィルター (Regex Filter)";
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

// --- ２段目の絞り込みパネル ---
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
    if (DEBUG) console.log(`[DEBUG] フィルタークエリ変更: "${currentFilterQuery}"`);
    renderGallery();
});

btnFilterMode.addEventListener("click", () => {
    currentFilterIncludeMode = !currentFilterIncludeMode;
    updateFilterButtonStyle();
    renderGallery();
});

// --- 画面右上に追従する「目次 (TOC) フローティングボタン」 ---
const SVG_TOC = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960" width="28px" height="28px" fill="currentColor"><path d="M480-344 240-584l56-56 184 184 184-184 56 56-240 240Z"/></svg>`;

// 1. フローティングボタン本体
const btnToc = document.createElement("button");
btnToc.style.position = "fixed";
btnToc.style.top = "48px";          // 画面上から48px
btnToc.style.right = "36px";        // 画面右から36px
btnToc.style.padding = "4px 2px 2px 4px";
btnToc.style.zIndex = "998";        // モーダル等よりは下に配置
btnToc.style.backgroundColor = "rgba(0, 0, 0, 0.75)";
btnToc.style.color = "#ffffff";
btnToc.style.border = "1px solid var(--background-modifier-border)";
btnToc.style.borderRadius = "50%";
btnToc.style.width = "44px";
btnToc.style.height = "44px";
btnToc.style.cursor = "pointer";
btnToc.style.display = "none";      // 初期状態は非表示（2個以上の時に表示）
btnToc.style.alignItems = "center";
btnToc.style.justifyContent = "center";
btnToc.style.boxShadow = "0 4px 10px rgba(0,0,0,0.4)";
btnToc.style.transition = "transform 0.2s ease, background-color 0.2s ease";
// btnToc.title = "目次 / Table of Contents";
btnToc.innerHTML = SVG_TOC;

// ホバーエフェクト
btnToc.addEventListener("mouseenter", () => {
    btnToc.style.backgroundColor = "var(--interactive-accent)";
    btnToc.style.transform = "scale(1.1)";
});
btnToc.addEventListener("mouseleave", () => {
    btnToc.style.backgroundColor = "rgba(0, 0, 0, 0.75)";
    btnToc.style.transform = "scale(1.0)";
});

// 2. ドロップダウンメニューのコンテナ
const tocMenu = document.createElement("div");
tocMenu.style.position = "fixed";
tocMenu.style.top = "98px";         // ボタンの少し下に配置
tocMenu.style.right = "30px";
tocMenu.style.zIndex = "999";
tocMenu.style.backgroundColor = "var(--background-secondary)";
tocMenu.style.border = "1px solid var(--background-modifier-border)";
tocMenu.style.borderRadius = "8px";
tocMenu.style.padding = "8px 0";
tocMenu.style.boxShadow = "0 6px 16px rgba(0,0,0,0.3)";
tocMenu.style.display = "none";     // 初期状態は非表示
tocMenu.style.maxHeight = "300px";  // 長くなりすぎないようスクロール化
tocMenu.style.overflowY = "auto";
tocMenu.style.minWidth = "180px";

// ボタンクリックでメニューの開閉
btnToc.addEventListener("click", (e) => {
    e.stopPropagation();
    const isVisible = tocMenu.style.display === "block";
    tocMenu.style.display = isVisible ? "none" : "block";
});

// メニューの外側や画面のどこかをクリックしたらメニューを閉じる
document.addEventListener("click", () => {
    tocMenu.style.display = "none";
});

container.appendChild(btnToc);
container.appendChild(tocMenu);

// --- トップへ戻るフローティングボタン ---
const SVG_TOP = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960" width="20px" height="20px" fill="currentColor"><path d="M440-160v-487L216-423l-56-57 320-320 320 320-56 57-224-224v487h-80Z"/></svg>`;

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

// 要素の配置
container.appendChild(btnScrollTop);

// パネルに要素をセット
filterPanel.append(filterInput, btnFilterMode);

// コントロールバーに追加
controlBar.appendChild(folderLabel);
controlBar.appendChild(folderSelect);
controlBar.appendChild(sortIcon);
controlBar.appendChild(btnSortBy);
controlBar.appendChild(btnOrder);

const spacer = document.createElement("span");
spacer.style.margin = "0 3px";
controlBar.appendChild(spacer);

controlBar.appendChild(columnsIcon);
controlBar.appendChild(selectColumns);
controlBar.appendChild(btnHeaderToggle);
controlBar.appendChild(btnFilterToggle);

// メインコンテナへ順に配置
container.appendChild(controlBar);
container.appendChild(headerPanel); // 見出しパネル
container.appendChild(filterPanel); // フィルターパネル

// --- 1. モーダル用状態管理 ---
let allCardsData = [];   // 全カードリスト
let currentCardIndex = 0;// 現在のカードインデックス
let modalImages = [];     // 現在のカードの画像リスト
let modalIndex = 0;      // 現在の画像インデックス
let activeGalleryContainer = null;

// --- 2. 拡大表示モーダル（UI構築） ---
const modal = document.createElement("div");
modal.tabIndex = -1; // フォーカスを受け取れるように設定
modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background-color: rgba(0, 0, 0, 0.88);
    z-index: 10000;
    display: none;
    justify-content: center;
    align-items: center;
    cursor: zoom-out;
    user-select: none;
    outline: none; /* フォーカス枠線を消す */
`;

// 画像と「カード内切り替えボタン」を包むラッパー
const modalImgWrapper = document.createElement("div");
modalImgWrapper.style.cssText = `
    position: relative;
    max-width: 80vw;
    max-height: 80vh;
    display: flex;
    justify-content: center;
    align-items: center;
    cursor: default;
`;

const modalImg = document.createElement("img");
modalImg.style.cssText = `
    max-width: 80vw;
    max-height: 80vh;
    object-fit: contain;
    border-radius: 8px;
    box-shadow: 0 10px 30px rgba(0,0,0,0.8);
    cursor: zoom-out;
`;

// --- [A] カード（枠）切り替えボタン (画面最左右) ---
const modalBtnPrevCard = document.createElement("button");
modalBtnPrevCard.innerHTML = "❮";
modalBtnPrevCard.title = "前のカードへ (Ctrl + ←)";
modalBtnPrevCard.style.cssText = `
    position: fixed;
    left: 20px;
    top: 50%;
    transform: translateY(-50%);
    background: rgba(0,0,0,0.6);
    color: #fff;
    border: 1px solid rgba(255,255,255,0.4);
    border-radius: 50%;
    width: 48px;
    height: 48px;
    font-size: 22px;
    cursor: pointer;
    z-index: 10002;
    transition: all 0.2s ease;
`;

const modalBtnNextCard = document.createElement("button");
modalBtnNextCard.innerHTML = "❯";
modalBtnNextCard.title = "次のカードへ (Ctrl + →)";
modalBtnNextCard.style.cssText = modalBtnPrevCard.style.cssText;
modalBtnNextCard.style.left = "auto";
modalBtnNextCard.style.right = "20px";

// --- [B] カード内（複数画像）切り替えボタン (画像枠左右) ---
const modalBtnPrevImg = document.createElement("button");
modalBtnPrevImg.innerHTML = "❮";
modalBtnPrevImg.title = "前の画像へ (←)";
modalBtnPrevImg.style.cssText = `
    position: absolute;
    left: -20px;
    top: 50%;
    transform: translateY(-50%);
    background: rgba(30, 30, 30, 0.75); /* 背景を少し濃くして引き締める */
    color: #ffffff;
    border: 1px solid rgba(255, 255, 255, 0.5); /* 枠線をつけて輪郭をはっきりさせる */
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
    border-radius: 50%;
    width: 36px;
    height: 36px;
    font-size: 16px;
    cursor: pointer;
    z-index: 10001;
    backdrop-filter: blur(4px);
    transition: all 0.2s ease;
`;

const modalBtnNextImg = document.createElement("button");
modalBtnNextImg.innerHTML = "❯";
modalBtnNextImg.title = "次の画像へ (→)";
modalBtnNextImg.style.cssText = modalBtnPrevImg.style.cssText;
modalBtnNextImg.style.left = "auto";
modalBtnNextImg.style.right = "-20px";

// ホバーエフェクト
[modalBtnPrevCard, modalBtnNextCard,].forEach(btn => {
    btn.addEventListener("mouseenter", () => {
        btn.style.background = "rgba(255,255,255,0.3)";
        btn.style.transform = "translateY(-50%) scale(1.1)";
    });
    btn.addEventListener("mouseleave", () => {
        btn.style.background = "rgba(0,0,0,0.6)";
        btn.style.transform = "translateY(-50%) scale(1.0)";
    });
});

[modalBtnPrevImg, modalBtnNextImg,].forEach(btn => {
    btn.addEventListener("mouseenter", () => {
        btn.style.background = "rgba(255,255,255,0.9)";
        btn.style.color = "#000000"; // ホバー時は反転させて分かりやすく
        btn.style.transform = "translateY(-50%) scale(1.15)";
    });
    btn.addEventListener("mouseleave", () => {
        btn.style.background = "rgba(30, 30, 30, 0.75)";
        btn.style.color = "#ffffff";
        btn.style.transform = "translateY(-50%) scale(1.0)";
    });
});

// --- [C] 下部ドットエリア ---
const modalFooter = document.createElement("div");
modalFooter.style.cssText = `
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    gap: 8px;
    padding: 6px 12px;
    background: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(4px);
    border-radius: 20px;
    border: 1px solid rgba(255, 255, 255, 0.2);
    z-index: 10002;
`;

modalImgWrapper.appendChild(modalImg);
modalImgWrapper.appendChild(modalBtnPrevImg);
modalImgWrapper.appendChild(modalBtnNextImg);

modal.appendChild(modalBtnPrevCard);
modal.appendChild(modalBtnNextCard);
modal.appendChild(modalImgWrapper);
modal.appendChild(modalFooter);

// --- 3. ナビゲーション処理関数 ---
const goToPrevCard = () => {
    currentCardIndex = (currentCardIndex - 1 + allCardsData.length) % allCardsData.length;
    modalIndex = 0;
    updateModalImage();
};

const goToNextCard = () => {
    currentCardIndex = (currentCardIndex + 1) % allCardsData.length;
    modalIndex = 0;
    updateModalImage();
};

const goToPrevImg = () => {
    modalIndex = (modalIndex - 1 + modalImages.length) % modalImages.length;
    updateModalImage();
};

const goToNextImg = () => {
    modalIndex = (modalIndex + 1) % modalImages.length;
    updateModalImage();
};

// --- 4. モーダル表示更新関数 ---
const updateModalImage = () => {
    if (allCardsData.length === 0) return;

    const currentCard = allCardsData[currentCardIndex];
    modalImages = currentCard.images;

    // 現在のインデックス範囲をガード
    if (modalIndex >= modalImages.length) modalIndex = 0;
    if (modalIndex < 0) modalIndex = modalImages.length - 1;

    if (DEBUG) console.log(`[DEBUG] モーダル表示更新: Card [${currentCardIndex + 1}/${allCardsData.length}] ("${currentCard.title}"), Image [${modalIndex + 1}/${modalImages.length}]`);

    modalImg.src = modalImages[modalIndex];

    // カード内複数画像のボタン・ドットの表示コントロール
    if (modalImages.length > 1) {
        modalBtnPrevImg.style.display = "block";
        modalBtnNextImg.style.display = "block";
        modalFooter.style.display = "flex";

        // ドットの再描画
        modalFooter.innerHTML = "";
        modalImages.forEach((_, idx) => {
            const dot = document.createElement("span");
            const isActive = idx === modalIndex;
            dot.style.cssText = `
                width: ${isActive ? "10px" : "6px"};
                height: ${isActive ? "10px" : "6px"};
                border-radius: 50%;
                background-color: ${isActive ? "#ffffff" : "rgba(255,255,255,0.4)"};
                box-shadow: ${isActive ? "0 0 6px rgba(255,255,255,0.9)" : "none"};
                cursor: pointer;
                transition: all 0.2s ease;
            `;
            dot.addEventListener("click", (e) => {
                e.stopPropagation();
                modalIndex = idx;
                updateModalImage();
            });
            modalFooter.appendChild(dot);
        });
    } else {
        modalBtnPrevImg.style.display = "none";
        modalBtnNextImg.style.display = "none";
        modalFooter.style.display = "none";
    }

    // 全体カード（枠）が１つしかなければ画面端ボタンを隠す
    const showCardBtns = allCardsData.length > 1 ? "block" : "none";
    modalBtnPrevCard.style.display = showCardBtns;
    modalBtnNextCard.style.display = showCardBtns;
};

// --- 5. モーダルを閉じる関数 ---
const closeModal = () => {
    modal.style.display = "none";
    modalImages = [];
    modalIndex = 0;

    if (activeGalleryContainer) {
        activeGalleryContainer.focus(); // 記憶しておいたギャラリー容器へフォーカスを戻す
    }
};

// --- 6. 各ボタンのクリックイベント ---

// [A] カード（枠）切り替え (画面端ボタン)
modalBtnPrevCard.addEventListener("click", (e) => {
    e.stopPropagation();
    goToPrevCard();
});
modalBtnNextCard.addEventListener("click", (e) => {
    e.stopPropagation();
    goToNextCard();
});
// [B] カード内画像切り替え (画像横の小ボタン)
modalBtnPrevImg.addEventListener("click", (e) => {
    e.stopPropagation();
    goToPrevImg();
});
modalBtnNextImg.addEventListener("click", (e) => {
    e.stopPropagation();
    goToNextImg();
});
// [C] モーダル背景または画像のクリックで閉じる
modal.addEventListener("click", closeModal);

// --- 7. スコープ限定キーボードイベント ---
modal.addEventListener("keydown", (e) => {
    // 背後のギャラリー等のスクロールや操作を完全にシャットアウト
    e.stopPropagation();

    const isCtrlPressed = e.ctrlKey || e.metaKey; // Windows(Ctrl) / Mac(Cmd)
    if (e.key === "ArrowLeft") {
        e.preventDefault();
        // Ctrl押下、または画像1枚のみ、または1枚目の画像位置の場合 ➔ 前のカードへ
        if (isCtrlPressed || modalImages.length <= 1 || modalIndex === 0) {
            if (DEBUG) console.log("[DEBUG] [Key] ArrowLeft -> 前のカードへ");
            goToPrevCard();
        } else {
            if (DEBUG) console.log("[DEBUG] [Key] ArrowLeft -> 前の画像へ");
            goToPrevImg();
        }
    } else if (e.key === "ArrowRight") {
        e.preventDefault();
        // Ctrl押下、または画像1枚のみ、または最後の画像位置の場合 ➔ 次のカードへ
        if (isCtrlPressed || modalImages.length <= 1 || modalIndex === modalImages.length - 1) {
            if (DEBUG) console.log("[DEBUG] [Key] ArrowRight -> 次のカードへ");
            goToNextCard();
        } else {
            if (DEBUG) console.log("[DEBUG] [Key] ArrowRight -> 次の画像へ");
            goToNextImg();
        }
    } else if (e.key === "Escape") {
        e.preventDefault();
        closeModal();
    }
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

// ボタン共通スタイル（画面固定追従）
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
    btn.style.border = "1px solid rgba(255, 255, 255, 0.3)";
    btn.style.borderRadius = "50%";
    btn.style.width = "44px";
    btn.style.height = "44px";
    btn.style.padding = "1px 1px 3px 1px";
    btn.style.fontSize = "1.3em";
    btn.style.cursor = "pointer";
    btn.style.display = "none"; // 初期状態は非表示
    btn.style.opacity = "1";   // スクロール可能時は常時表示
    btn.style.pointerEvents = "auto";
    btn.style.textShadow = "none";
    btn.style.boxShadow = "0 4px 10px rgba(0,0,0,0.4)";
    btn.style.transition = "all 0.2s ease";
};

const btnLeft = document.createElement("button");
const btnRight = document.createElement("button");
applyButtonStyle(btnLeft, true);
applyButtonStyle(btnRight, false);

// ホバーエフェクト
[btnLeft, btnRight,].forEach(btn => {
    btn.addEventListener("mouseenter", () => {
        btn.style.transform = "scale(1.08)";
        btn.style.backgroundColor = "rgba(15, 15, 20, 0.85)";
        btn.style.borderColor = "rgba(255, 255, 255, 0.6)";
        btn.style.textShadow = "0 0 8px rgba(255, 255, 255, 0.9)";
        btn.style.boxShadow = "0 0 12px rgba(255, 255, 255, 0.3), inset 0 0 6px rgba(255, 255, 255, 0.2)";
    });
    btn.addEventListener("mouseleave", () => {
        btn.style.transform = "scale(1.0)";
        btn.style.backgroundColor = "rgba(0, 0, 0, 0.75)";
        btn.style.borderColor = "rgba(255, 255, 255, 0.3)";
        btn.style.textShadow = "none";
        btn.style.boxShadow = "0 4px 10px rgba(0,0,0,0.4)";
    });
});

// ボタンの表示/非表示判定
const updateButtonVisibility = () => {
    const hasScrollableContent = galleryContainer.scrollWidth > galleryContainer.clientWidth + 5;
    if (DEBUG) console.log(`[DEBUG] スクロール判定: scrollWidth(${galleryContainer.scrollWidth}) > clientWidth(${galleryContainer.clientWidth}) -> ボタン表示: ${hasScrollableContent}`);
    if (!hasScrollableContent) {
        btnLeft.style.display = "none";
        btnRight.style.display = "none";
    } else {
        btnLeft.style.display = "block";
        btnRight.style.display = "block";
    }
};

// 初回判定とリサイズ時に可視性を判定
setTimeout(updateButtonVisibility, 100); // 描画直後のサイズを確定させて判定
window.addEventListener("resize", updateButtonVisibility);

// ボタンのクリック処理
btnLeft.addEventListener("click", (e) => {
    e.stopPropagation();
    galleryContainer.focus();
    galleryContainer.scrollBy({ left: -350, behavior: 'smooth', });
});
btnRight.addEventListener("click", (e) => {
    e.stopPropagation();
    galleryContainer.focus();
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

// --- ギャラリーを再描画する関数 (複数画像・カルーセル対応版) ---
const renderGallery = async () => {
    if (DEBUG) console.time("[DEBUG] レンダリングにかかった時間だよ♪");

    // ギャラリー表示エリアを一度クリア
    galleryContainer.innerHTML = "";

    // ページのソート処理
    let pages = [...rawPages,].sort((a, b) => {
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

    // 画像URL抽出用ヘルパー関数（HTML / WikiLink / Markdown すべてに対応）
    const parseImgSrc = (match0, match1, match3, notePath) => {
        if (match0.startsWith("<img")) {
            const srcMatch = match0.match(/src=["'](?!\s*["'])([^"']+)["']/i);
            return srcMatch ? srcMatch[1] : "";
        } else if (match1) {
            let cleanLink = match1.split("|")[0].trim();
            let file = app.metadataCache.getFirstLinkpathDest(cleanLink, notePath);
            if (!file) file = app.vault.getAbstractFileByPath(cleanLink);
            return file ? app.vault.getResourcePath(file) : "";
        } else if (match3) {
            let src = match3;
            if (!src.startsWith("http://") && !src.startsWith("https://")) {
                let file = app.metadataCache.getFirstLinkpathDest(src, notePath);
                if (file) src = app.vault.getResourcePath(file);
            }
            return src;
        }
        return "";
    };

    let totalCardCount = 0;

    // 各ファイルをループ処理して表示
    for (let p of pages) {
        // 各ノートから必要な情報を取得
        let path = p.file.path;
        let fileContent = await app.vault.adapter.read(path);

        // --- 1. 区切り線 (--- / *** / - - - / * * *) でブロック分割 ---
        let hrRegex = /^(?:---|\*\*\*|- - -|\* \* \*)\s*$/gm;
        // すべての応用バリエーション
        if (hrMode) hrRegex = /^(?:(?:\s*-\s*){3,}|(?:\s*\*\s*){3,}|(?:\s*_\s*){3,})$/gm;

        let blocks = [];
        let lastIndex = 0;
        let hrMatch;

        while ((hrMatch = hrRegex.exec(fileContent)) !== null) {
            blocks.push(fileContent.slice(lastIndex, hrMatch.index));
            lastIndex = hrRegex.lastIndex;
        }
        blocks.push(fileContent.slice(lastIndex));

        if (DEBUG) console.log(`[DEBUG] Parse Note: "${p.file.name}" -> ${blocks.length} ブロックに分割`);

        // HTMLタグ / WikiLink形式(![[...]]) / 標準Markdown形式(![...](...)) をすべて抽出する正規表現
        const imgRegex = /<img[^>]+>|!\[\[([^\]]+)\]\]|!\[([^\]]*)\]\(([^)]+)\)/gi;

        // 見出しレベルに応じた正規表現パターンを動的生成（例: [2, 3, 4] ➔ /^(?:#{2}|#{3}|#{4})\s+(.*)$/gm）
        const headerPattern = currentHeaderLevels.map(lvl => `#{${lvl}}`).join('|');
        const titleRegex = new RegExp(`^(?:${headerPattern})\\s+(.*)$`, 'm');
        if (DEBUG) console.log("現在の見出しレベル:", currentHeaderLevels);

        // ブロックごとのカードデータリスト構築
        let cardDataList = [];

        for (let blockText of blocks) {
            // 画像抽出
            let imgMatches = [...blockText.matchAll(imgRegex),];
            if (imgMatches.length === 0) continue; // 画像がないブロックは無視

            let validImages = [];
            for (let m of imgMatches) {
                let src = parseImgSrc(m[0], m[1], m[3], path);
                if (src && src.trim() !== "") {
                    validImages.push(src);
                }
            }
            if (validImages.length === 0) continue;

            // 見出しタイトル抽出（ブロック内から最初にマッチした見出し）
            let titleMatch = blockText.match(titleRegex);
            if (DEBUG) console.log(`[DEBUG] スキップ: 画像はあるが見出しが見つかりません (${path})`);

            // 見出しがないブロックはギャラリー表示対象外としてスキップ
            if (!titleMatch) continue;

            let rawTitle = titleMatch[1];
            let titleLine = rawTitle.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

            // 絞り込みフィルター判定
            const filterQueryStr = String(currentFilterQuery || "").trim();
            if (filterQueryStr !== "") {
                let isMatch = false;
                try {
                    const regex = new RegExp(filterQueryStr, "i");
                    isMatch = regex.test(p.file.path) || regex.test(titleLine);
                } catch (e) {
                    isMatch = p.file.path.includes(filterQueryStr) || titleLine.includes(filterQueryStr);
                    console.warn("[GALLERY] フィルター正規表現のエラー。簡易文字列検索にフォールバックします:", e);
                }
                if (currentFilterIncludeMode && !isMatch) continue;
                if (!currentFilterIncludeMode && isMatch) continue;
            }

            cardDataList.push({
                rawTitle: rawTitle,
                titleLine: titleLine,
                images: validImages, // １枚以上の画像URL配列
            });
            // if (DEBUG && cardDataList.length > 0) console.log(`[DEBUG] "${p.file.name}": ${cardDataList.length} 件のカードデータを生成`);
        }

        // 表示できるカードが無ければセクションを作らない
        if (cardDataList.length === 0) continue;

        totalCardCount += cardDataList.length;

        let fileSection = document.createElement("div");
        fileSection.style.marginBottom = "25px";

        const sectionId = `gallery-section-${p.file.name.replace(/\s+/g, '-')}`;
        fileSection.id = sectionId; // 各セクションに一意のIDをセット（ジャンプ用）

        // ノート名のヘッダー
        let headerTitle = p.file.name.length > 30 ? p.file.name.substring(0, 30) + '...' : p.file.name;
        let h2 = document.createElement("h2");
        h2.textContent = headerTitle;
        fileSection.appendChild(h2);

        // カードグリッド
        let gridDiv = document.createElement("div");
        gridDiv.style.display = "grid";
        gridDiv.style.gridTemplateColumns = `repeat(${currentColumns}, 1fr)`;
        gridDiv.style.gap = "15px";
        gridDiv.style.textAlign = "center";
        gridDiv.style.alignItems = "start";

        // --- 2. カード単位（複数画像スライダー含む）の生成 ---
        for (let cardData of cardDataList) {
            let card = document.createElement("div");
            card.className = "gallery-card";
            card.style.backgroundColor = "var(--background-secondary)";
            card.style.padding = "10px";
            card.style.borderRadius = "8px";
            card.style.boxShadow = "0 2px 5px rgba(0,0,0,0.1)";
            card.style.minWidth = cardMinWidth; // 最小横幅を確保！
            card.style.maxWidth = cardMaxWidth;

            // 画像表示ラッパー（相対配置でボタンやドットを重ねる）
            let imgWrapper = document.createElement("div");
            imgWrapper.style.position = "relative";
            imgWrapper.style.marginBottom = "8px";
            imgWrapper.style.overflow = "hidden";
            imgWrapper.style.borderRadius = "8px";

            // <img> 要素を作成
            const imgEl = document.createElement("img");
            let currentIndex = 0;
            imgEl.src = cardData.images[currentIndex];
            imgEl.style.width = "100%";
            imgEl.style.height = "auto";
            imgEl.style.display = "block";

            // 正常に読み込めたら zoom-in カーソルにする
            imgEl.addEventListener("load", () => {
                if (!imgEl.src.startsWith("data:image/svg+xml")) {
                    imgEl.style.cursor = "zoom-in"; // SVGプレースホルダーでない場合のみ zoom-in にする
                }
            });
            // エラー時は SVG に差し替えて default カーソルにする
            imgEl.addEventListener("error", () => {
                imgEl.src = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="-250 -1300 1460 1560" width="100%" height="100%" style="background-color: var(--background-secondary-alt, #1a1a1a); border-radius: 6px;">
                        <path fill="#777777" d="M200-120q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h560q33 0 56.5 23.5T840-760v560q0 33-23.5 56.5T760-120H200Zm40-337 160-160 160 160 160-160 40 40v-183H200v263l40 40Zm-40 257h560v-264l-40-40-160 160-160-160-160 160-40-40v184Zm0 0v-264 80-376 560Z"/>
                    </svg>
                `)}`;
                imgEl.style.cursor = "default";
                console.warn(`[GALLERY] 画像読み込み失敗。SVGに差し替えます:`, imgEl.src);
            });

            // 拡大表示モーダル
            imgEl.addEventListener("click", (e) => {
                e.stopPropagation();

                // エラープレースホルダー表示時はモーダルを開かない
                if (imgEl.src.startsWith("data:image/svg+xml")) return;

                // 全カードリストを同期し、クリックされたカードのインデックスをセット
                allCardsData = cardDataList;
                currentCardIndex = cardDataList.findIndex(c => c === cardData);
                modalIndex = currentIndex;

                // 開く 直前に、いまのギャラリー容器（galleryContainer）を記録
                activeGalleryContainer = galleryContainer;

                updateModalImage();

                modal.style.display = "flex";

                // クリックされた瞬間に、画像が存在するウィンドウの body を取得して移設する！
                const targetDoc = imgWrapper.ownerDocument || document;
                if (modal.parentElement !== targetDoc.body) {
                    targetDoc.body.appendChild(modal);
                }

                // モーダルにフォーカスを当ててキーイベントを受け取る
                modal.focus();
            });

            imgWrapper.appendChild(imgEl);

            // 画像が複数枚（２枚以上）ある場合のみ切り替えUIを追加
            if (cardData.images.length > 1) {
                // サムネイル表示枚数は最大10枚までに制限
                const displayImages = cardData.images.slice(0, 10);

                // 表示更新用関数
                const updateSlide = () => {
                    imgEl.src = displayImages[currentIndex];
                    updateDots();
                };

                // 前へボタン (❮)
                const btnPrev = document.createElement("button");
                btnPrev.innerHTML = "❮";
                btnPrev.style.position = "absolute";
                btnPrev.style.left = "2px";
                btnPrev.style.top = "50%";
                btnPrev.style.transform = "translateY(-50%)";
                btnPrev.style.backgroundColor = "rgba(0,0,0,0.5)";
                btnPrev.style.color = "#fff";
                btnPrev.style.border = "1px solid rgba(255,255,255,0.2)";
                btnPrev.style.borderRadius = "50%";
                btnPrev.style.width = "24px";
                btnPrev.style.height = "24px";
                btnPrev.style.cursor = "pointer";
                btnPrev.style.fontSize = "12px";
                btnPrev.style.zIndex = "2";
                btnPrev.style.transition = "all 0.2s ease";

                btnPrev.addEventListener("mouseenter", () => {
                    btnPrev.style.backgroundColor = "rgba(0,0,0,0.8)";
                    btnPrev.style.boxShadow = "0 0 8px rgba(255, 255, 255, 0.6)";
                    btnPrev.style.transform = "translateY(-50%) scale(1.1)";
                });
                btnPrev.addEventListener("mouseleave", () => {
                    btnPrev.style.backgroundColor = "rgba(0,0,0,0.5)";
                    btnPrev.style.boxShadow = "none";
                    btnPrev.style.transform = "translateY(-50%) scale(1.0)";
                });

                btnPrev.addEventListener("click", (e) => {
                    e.stopPropagation();
                    currentIndex = (currentIndex - 1 + displayImages.length) % displayImages.length;
                    updateSlide();
                });

                // 次へボタン (❯)
                const btnNext = document.createElement("button");
                btnNext.innerHTML = "❯";
                btnNext.style.position = "absolute";
                btnNext.style.right = "2px";
                btnNext.style.top = "50%";
                btnNext.style.transform = "translateY(-50%)";
                btnNext.style.backgroundColor = "rgba(0,0,0,0.5)";
                btnNext.style.color = "#fff";
                btnNext.style.border = "1px solid rgba(255,255,255,0.2)";
                btnNext.style.borderRadius = "50%";
                btnNext.style.width = "24px";
                btnNext.style.height = "24px";
                btnNext.style.cursor = "pointer";
                btnNext.style.fontSize = "12px";
                btnNext.style.zIndex = "2";
                btnNext.style.transition = "all 0.2s ease";

                btnNext.addEventListener("mouseenter", () => {
                    btnNext.style.backgroundColor = "rgba(0,0,0,0.8)";
                    btnNext.style.boxShadow = "0 0 8px rgba(255, 255, 255, 0.6)";
                    btnNext.style.transform = "translateY(-50%) scale(1.1)";
                });
                btnNext.addEventListener("mouseleave", () => {
                    btnNext.style.backgroundColor = "rgba(0,0,0,0.5)";
                    btnNext.style.boxShadow = "none";
                    btnNext.style.transform = "translateY(-50%) scale(1.0)";
                });

                btnNext.addEventListener("click", (e) => {
                    e.stopPropagation();
                    currentIndex = (currentIndex + 1) % displayImages.length;
                    updateSlide();
                });

                // ドットインジケーター容器
                const dotsWrapper = document.createElement("div");
                dotsWrapper.style.position = "absolute";
                dotsWrapper.style.bottom = "8px";
                dotsWrapper.style.left = "50%";
                dotsWrapper.style.transform = "translateX(-50%)";
                dotsWrapper.style.display = "flex";
                dotsWrapper.style.gap = "4px";
                dotsWrapper.style.alignItems = "center";
                dotsWrapper.style.padding = "3px 8px";
                dotsWrapper.style.borderRadius = "10px";
                dotsWrapper.style.backgroundColor = "rgba(0,0,0,0.3)";
                dotsWrapper.style.backdropFilter = "blur(2px)";
                dotsWrapper.style.zIndex = "2";

                // ドット描画（ダイレクトクリック、指カーソル、Glowエフェクト）
                const updateDots = () => {
                    dotsWrapper.innerHTML = "";
                    displayImages.forEach((_, idx) => {
                        const dot = document.createElement("span");
                        const isActive = idx === currentIndex;

                        dot.style.width = isActive ? "8px" : "6px";
                        dot.style.height = isActive ? "8px" : "6px";
                        dot.style.borderRadius = "50%";
                        dot.style.cursor = "pointer"; // 指カーソル
                        dot.style.backgroundColor = isActive ? "#ffffff" : "rgba(255,255,255,0.4)";
                        dot.style.boxShadow = isActive ? "0 0 6px rgba(255, 255, 255, 0.9)" : "none"; // アクティブ時Glow
                        dot.style.transition = "all 0.2s ease";

                        // マウスオーバー演出（ホバー時Glow＆拡大）
                        dot.addEventListener("mouseenter", () => {
                            if (!isActive) {
                                dot.style.backgroundColor = "rgba(255,255,255,0.8)";
                                dot.style.boxShadow = "0 0 5px rgba(255, 255, 255, 0.7)";
                                dot.style.transform = "scale(1.2)";
                            }
                        });
                        dot.addEventListener("mouseleave", () => {
                            if (!isActive) {
                                dot.style.backgroundColor = "rgba(255,255,255,0.4)";
                                dot.style.boxShadow = "none";
                                dot.style.transform = "scale(1.0)";
                            }
                        });

                        // ドット直接クリックで画像切り替え
                        dot.addEventListener("click", (e) => {
                            e.stopPropagation();
                            currentIndex = idx;
                            updateSlide();
                        });

                        dotsWrapper.appendChild(dot);
                    });
                };

                updateDots(); // 初期表示

                imgWrapper.appendChild(btnPrev);
                imgWrapper.appendChild(btnNext);
                imgWrapper.appendChild(dotsWrapper);
            }

            card.appendChild(imgWrapper);

            // タイトル（リンク）エリア
            let titleWrapper = document.createElement("div");
            titleWrapper.style.fontSize = "0.85em";
            titleWrapper.style.fontWeight = "bold";
            titleWrapper.style.wordBreak = "break-word"; // 長い単語でも枠外へはみ出さないように折り返す

            // 枚数カウントを表示 「(10+枚)」 表記にする
            let countText = "";
            if (cardData.images.length > 10) {
                countText = " (10+枚)";
            } else if (cardData.images.length > 1) {
                countText = ` (${cardData.images.length}枚)`;
            }

            // Obsidian標準の内部リンク<a>をDOM構築
            let a = document.createElement("a");
            a.className = "internal-link"; // Obsidian内部リンク用の標準クラス
            a.target = "_blank";
            a.rel = "noopener";
            // Obsidian内部のファイルパス＋アンカーヘッダーを指定
            a.setAttribute("href", `${p.file.path}#${cardData.rawTitle}`);
            a.setAttribute("data-href", `${p.file.path}#${cardData.rawTitle}`);
            a.textContent = cardData.titleLine + countText;

            titleWrapper.appendChild(a);
            card.appendChild(titleWrapper);

            // グリッドに追加
            gridDiv.appendChild(card);
        }

        fileSection.appendChild(gridDiv);
        galleryContainer.appendChild(fileSection);
        if (DEBUG) console.log(`[DEBUG] 処理完了: 合計 ${pages.length} つのノートから ${totalCardCount} 件のカードを生成しました`);
    }

    // --- 3. 目次（TOC）メニューの更新処理 ---
    // 生成された fileSection の数をカウント
    const sections = galleryContainer.querySelectorAll("[id^='gallery-section-']");

    if (sections.length >= 2) {
        // 2個以上あればボタンを表示
        btnToc.style.display = "inline-flex";
        tocMenu.innerHTML = ""; // メニューをリセット

        sections.forEach((sec) => {
            const h2 = sec.querySelector("h2");
            if (!h2) return;

            const item = document.createElement("div");
            item.textContent = h2.textContent;
            item.style.padding = "8px 16px";
            item.style.fontSize = "1.0em";
            item.style.cursor = "pointer";
            item.style.color = "var(--text-normal)";
            item.style.whiteSpace = "nowrap";
            item.style.overflow = "hidden";
            item.style.textOverflow = "ellipsis";

            // ホバー時の見た目
            item.addEventListener("mouseenter", () => {
                item.style.backgroundColor = "var(--background-modifier-hover)";
            });
            item.addEventListener("mouseleave", () => {
                item.style.backgroundColor = "transparent";
            });

            // クリックしたらそのセクションへスッとジャンプ！
            item.addEventListener("click", (e) => {
                e.stopPropagation();
                sec.scrollIntoView({ behavior: "smooth", block: "start", });
                tocMenu.style.display = "none"; // ジャンプしたらメニューを閉じる
            });

            tocMenu.appendChild(item);
        });
    } else {
        // 1個以下の場合は非表示にしておく
        btnToc.style.display = "none";
        tocMenu.style.display = "none";
    }

    // ボタン表示状態更新
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

    line1.append("🏖️ ", link, ` v${SCRIPT_VERSION}`);

    const line2 = document.createElement("div");
    line2.textContent = "Copyright (c) 2026 ねおん (Neon)";

    footer.append(line1, line2);

    galleryContainer.appendChild(footer);

    // Obsidianに埋め込まれたWikiLink（[[...]]）をHTMLとして正しくプレビュー変換させる
    dv.paragraph("");
    if (DEBUG) console.timeEnd("[DEBUG] レンダリングにかかった時間だよ♪");
};

// --- ページ取得と描画を実行する関数 ---
const updatePagesAndRender = () => {
    // 選択されている folder パスに基づいて Dataview でページを取得
    if (targetFolder === "") {
        rawPages = dv.pages(); // Vault全体
    } else {
        rawPages = dv.pages(`"${targetFolder}"`); // 指定フォルダ内
    }

    const initialCount = rawPages.length;
    // 自分自身のノートとNGフォルダに属するノートを除外する
    rawPages = rawPages
        .where(p => p.file.path !== dv.current().file.path)
        .where(p => {
            return !NG_FOLDERS.some(ng =>
                p.file.folder === ng ||
                p.file.folder.startsWith(ng + "/") ||
                p.file.folder.endsWith("/" + ng)
            );
        });

    if (DEBUG) console.log(`[DEBUG] 取得ノート数: 該当 ${initialCount} 件 -> 除外後 ${rawPages.length} 件 (Target: "${targetFolder || 'Vault全体'}")`);

    renderGallery();
};

// 🔔 バージョンチェック
async function checkForUpdates() {
    if (!VERSION_CHECK || SCRIPT_VERSION.includes("-dev")) return;

    // Obsidian環境（requestUrlが存在する）場合のみ実行
    if (typeof requestUrl === "undefined") return;

    const currentData = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    const lastCheck = currentData.last_check;
    const now = Date.now();

    // 24時間経っていないなら終了
    if (lastCheck && (now - lastCheck) <= CHECK_INTERVAL) return;

    try {
        const res = await requestUrl({
            url: "https://api.github.com/repos/neon-aiart/dataview-image-gallery/releases/latest",
        });

        // チェックした時間を保存
        currentData.last_check = now;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(currentData));

        const latestVersion = res.json.tag_name;

        if (`v${SCRIPT_VERSION}` !== latestVersion) {
            console.log(`Update available: ${latestVersion}`);
            return latestVersion; // 最新バージョン名を返す
        }
    } catch (e) {
        // オフライン時などはエラーを出さずに静かにスルー
    }
}

// 初回レンダリングを実行
updatePagesAndRender();
