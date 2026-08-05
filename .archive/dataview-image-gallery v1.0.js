const DEBUG = false;

// 検索するフォルダを指定
const currentFolder = dv.current().file.folder;
const pages = dv.pages(`"${currentFolder}"`).where(p => p.file.path !== dv.current().file.path);
if (DEBUG) {
    console.log("見つかったページ数:", pages.length);
}

// １列に並べる数
const columns = 5;

// 非同期で各ファイルのテキストを読み込んで処理する
const renderGallery = async () => {
    // ファイルごとにループを回す
    for (let p of pages) {
        if (DEBUG) {
            console.log("処理中のファイル:", p.file.path);
        }

        // ファイルごとのHTMLコンテナを開始
        let html = `<div style="display: grid; grid-template-columns: repeat(${columns}, 1fr); gap: 15px; text-align: center; align-items: start;">`;

        // 各ノートから必要な情報を取得
        let path = p.file.path;
        let fileContent = await app.vault.adapter.read(path);

        // グローバル検索（/g）を使ってすべてのimgタグを抽出
        let imgMatches = [...fileContent.matchAll(/<img[^>]+>/gi),];
        // グローバル検索を使ってすべての #### タイトル行を抽出
        let titleMatches = [...fileContent.matchAll(/####\s+(.*)/g),];
        if (DEBUG) {
            console.log("imgMatches:", imgMatches);
            console.log("titleMatches:", titleMatches);
        }

        // 見つかった画像の数だけループしてカードを作る
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
            // ウィキリンク形式を作る
            let wikiLink = `[[${p.file.path}#${rawTitle}|${titleLine}]]`;
            if (DEBUG) {
                console.log("未加工:", rawTitle);
                console.log("タイトル:", titleLine);
                console.log("リンク:", wikiLink);
            }

            // HTMLの中に組み込む
            html += `
<div style="background-color: var(--background-secondary); padding: 10px; border-radius: 8px; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
    <div style="margin-bottom: 8px; overflow: hidden;">
        ${imgTag}
    </div>
    <div style="font-size: 0.85em; font-weight: bold;">

${wikiLink}
    </div>
</div>
            `;
        }

        html += `</div>`;

        // ファイルごとの処理が終わった時点で、そのファイルのタイトルとグリッドを出力する
        let headerTitle = p.file.name;
        if (headerTitle.length > 30) {
            headerTitle = headerTitle.substring(0, 30) + '...';
        }

        // ファイルごとの見出しを表示
        dv.header(2, headerTitle);
        // ファイルごとのグリッドを表示
        dv.paragraph(html);
    }

    if (DEBUG) {
        console.log("すべてのHTML生成・出力完了");
    }
};

renderGallery();
