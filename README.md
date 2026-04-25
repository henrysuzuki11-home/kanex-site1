# KANEX Corporation — 公式サイト

株式会社カネックス（KANEX Corporation）の公式ウェブサイトです。  
GitHub Pages で静的ファイルとして公開できます。

---

## ファイル構成

```
kanex-site/
├─ index.html          # トップページ
├─ construction.html   # 塗装・解体・リフォーム事業
├─ electronics.html    # 電子基板・実装・ハーネス事業
├─ why-kanex.html      # KANEXが選ばれる理由
├─ company.html        # 会社概要
├─ contact.html        # お問い合わせ
├─ privacy.html        # プライバシーポリシー
├─ Photos/             # 画像フォルダ（input_file_0〜15.png, kanex-logo.png）
├─ assets/
│  ├─ css/style.css    # 全ページ共通CSS
│  └─ js/main.js       # ハンバーガーメニュー・スクロールエフェクト
└─ README.md
```

---

## GitHub Pages 公開手順

### Step 1：GitHubリポジトリの作成

1. https://github.com にアクセスしてログイン
2. 右上「＋」→「New repository」をクリック
3. Repository name に `kanex-site`（または任意の名前）を入力
4. Visibility を **Public** に設定（GitHub Pages 無料プランは Public 必須）
5. 「Create repository」をクリック

---

### Step 2：ファイルをアップロード

**方法A：ブラウザからアップロード（推奨・簡単）**

1. 作成したリポジトリのページを開く
2. 「uploading an existing file」をクリック
3. `kanex-site/` フォルダの中身をすべて選択してドラッグ＆ドロップ
4. ⚠️ フォルダごとアップロードできない場合は、以下の順で繰り返す：
   - ルートの `.html` ファイル（7ファイル）
   - `assets/css/style.css`（フォルダ構造ごと）
   - `assets/js/main.js`
   - `Photos/` フォルダ内の画像すべて
5. 「Commit changes」をクリック

**方法B：Git コマンドライン**

```bash
git init
git add .
git commit -m "Initial commit: KANEX Corporation website"
git remote add origin https://github.com/YOUR_USERNAME/kanex-site.git
git push -u origin main
```

---

### Step 3：GitHub Pages を有効化

1. リポジトリの「Settings」タブをクリック
2. 左メニューの「Pages」をクリック
3. 「Source」→「Deploy from a branch」を選択
4. Branch に **main**（または master）、フォルダに **/ (root)** を選択
5. 「Save」をクリック
6. 数分後に `https://YOUR_USERNAME.github.io/kanex-site/` で公開される

---

## 独自ドメイン接続時の注意点

1. DNS設定でCNAMEレコードに `YOUR_USERNAME.github.io` を指定
2. リポジトリの Settings → Pages → Custom domain にドメインを入力
3. `kanex-site/` ルートに `CNAME` ファイルを作成し、ドメイン名を1行記入
4. 「Enforce HTTPS」にチェックを入れる（証明書発行まで数分かかる場合あります）

---

## カスタマイズ

| 変更内容 | 対象ファイル |
|---------|-------------|
| 色・フォント | assets/css/style.css の `:root` 変数 |
| Google Map | company.html の `<iframe src="...">` を実際の埋め込みコードに差し替え |
| Google フォーム URL | contact.html・privacy.html のリンクURLを確認 |
| ロゴ画像 | Photos/kanex-logo.png を差し替え |
| OGP 画像 | 各 .html の `<meta property="og:image">` に画像URLを追加 |

---

## お問い合わせフォーム

Googleフォーム URL:  
https://docs.google.com/forms/d/e/1FAIpQLScsQVau4MhDx8aRU4BgI4pmqSIFqitVKRauBHumlL_JH9M0Mg/viewform?usp=header

---

© 2025 KANEX Corporation. All Rights Reserved.
