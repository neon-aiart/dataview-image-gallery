/**
 * ==============================================================================
 * 🖼️ DataView Image Gallery v1.2
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
// １列に並べるカードの数（初期値: 5）
let currentColumns = 5;
// カードの最小幅 / 最大幅（初期値: 100px / 640px）
let cardMinWidth = "100px";
let cardMaxWidth = "640px";

// 検索対象のフォルダを取得
const currentFolder = dv.current().file.folder;
const rawPages = dv.pages(`"${currentFolder}"`).where(p => p.file.path !== dv.current().file.path);

if (DEBUG) {
    console.log("見つかったページ数:", rawPages.length);
}

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

// セレクトボックス3: 表示列数 (1～10)
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
controlBar.appendChild(selectOrder);

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

        // グローバル検索（/g）を使ってすべてのimgタグを抽出
        let imgMatches = [...fileContent.matchAll(/<img[^>]+>/gi),];
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
            let imgTag = imgMatches[i] ? imgMatches[i][0] : "";

            // <img> タグ内に有効な src 属性（画像のパス/URL）があるかチェック
            const hasValidSrc = /src=["'](?!\s*["'])([^"']+)["']/i.test(imgTag);

            if (!imgTag || !hasValidSrc) {
                continue; // 有効な画像がないのでカード作成をスキップ
            }

            // styleを調整してカード内に収まるようにする
            imgTag = imgTag.replace(/width="[^"]*"/gi, '').replace(/style="[^"]*"/gi, 'style="width: 100%; height: auto; border-radius: 8px;"');

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
            imgWrapper.innerHTML = imgTag; // 画像タグを挿入
            // 画像（またはラッパー）クリックで拡大表示
            imgWrapper.addEventListener("click", (e) => {
                e.stopPropagation();
                const imgEl = imgWrapper.querySelector("img");
                if (imgEl) {
                    modalImg.src = imgEl.src;
                    modal.style.display = "flex";

                    // クリックされた「その瞬間」に、画像が存在するウィンドウの body を取得して移設する！
                    const targetDoc = imgWrapper.ownerDocument || document;
                    if (modal.parentElement !== targetDoc.body) {
                        targetDoc.body.appendChild(modal);
                    }
                }
            });
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

selectOrder.addEventListener("change", (e) => {
    currentIsAscending = (e.target.value === 'asc');
    renderGallery();
});

selectColumns.addEventListener("change", (e) => {
    currentColumns = parseInt(e.target.value, 10);
    renderGallery();
});

// 初回レンダリングを実行
renderGallery();