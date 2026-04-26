# ShareAZ 引き継ぎ書

**バージョン**: v8
**更新日**: 2026-04-26
**仕様書バージョン**: spec.md v1.5

---

## 1. アプリ概要

**アプリ名**: ShareAZ
**コンセプト**: 社員が得意スキルや趣味・関心をシェアし、共通の興味を持つ仲間とつながれる社内コミュニティSNS。AZコイン（ポイント）でノベルティと交換できる報酬システム付き。
**フォルダ**: `~/Documents/App/ShareAZ`
**仕様書**: `spec.md`（v1.5）
**デザイン**: `DESIGN.md`

### 🌐 公開情報

- **GitHub リポジトリ**: https://github.com/alterhabit999-web/shAreZ（Public）
- **本番URL**: https://alterhabit999-web.github.io/shAreZ/
- **Firebase 認証ドメイン**: `alterhabit999-web.github.io` 追加済み

### v7 → v8 の主要変化

- **GitHub 連携・本番デプロイが完了**：ローカル環境のみ → GitHub Pages 公開運用へ移行
  - リポジトリ `alterhabit999-web/shAreZ` を Public で作成、初期コミット push 済み（commit `948a9af`）
  - `npm run deploy` で gh-pages ブランチへ自動デプロイ可能
  - 本番URLでログイン・全機能の動作確認済み
- **Firebase Storage の実装中止（プラン制約）**：
  - 新規 Firebase プロジェクトでは Storage が Blaze（従量課金）プラン必須に変わったため、Spark（無料）プランでは利用不可
  - アバター画像 / 商品画像の **アップロード機能は実装せず**、当面は外部URL方式を継続
  - `storage.rules` ファイルは Blaze 移行時の利用に備えてリポジトリに保持

---

## 2. ⏯ 次回再開ポイント

GitHub 公開・本番デプロイが完了したので、次は **本番運用に向けたセキュリティ強化** に進みます。

**推奨次作業（優先度順）：**

1. **Firestore セキュリティルールの本格運用化**（次回最優先・ユーザー指定）
   - 現状：認証ユーザーは全コレクションに読み書き可能（暫定）
   - 目標：コレクションごとに適切な read/write 制御＋admin 判定
2. イベント作成の管理者承認制（フェーズ2 / `eventCreationRequests/`）
3. 管理画面：データ集計タブ（フェーズ2）
4. UI/UX 改善ポーリッシュ
5. （Blaze プラン移行時）Firebase Storage 機能の実装

---

## 3. 作業サマリー

### v7 までで完了済み（前回まで）

掲示板機能一式、ホーム・メンバー・マイページ、管理画面 7タブ、coinTransactions、メンバーランク、ポイント交換機能（shopItems / exchangeRequests コレクション稼働）、ブランドカラーのコーポレート化、管理画面タブUX改善。

### v8 セッションで完了

| # | 作業内容 | 状態 |
|---|----------|------|
| —  | git 環境準備（user.name / email 設定、gh auth login） | ✅ ユーザー作業完了 |
| —  | `package.json` の homepage を本番URLに更新 | ✅ 完了 |
| 47 | git init + 初期コミット作成（`948a9af`） | ✅ 完了 |
| 48 | GitHub リポジトリ `alterhabit999-web/shAreZ` を Public で作成・main push | ✅ 完了 |
| 49 | `npm run deploy` で gh-pages ブランチへデプロイ・GitHub Pages 自動有効化 | ✅ 完了 |
| 50 | Firebase Authorized domains に `alterhabit999-web.github.io` を追加 | ✅ ユーザー作業完了 |
| —  | 本番URLでログイン動作確認 | ✅ 完了 |
| 46 | Firebase Storage 機能 | ⏸ 中止（Blaze プラン必須のため） |

### 未着手（次回以降）

| # | 作業内容 | 状態 |
|---|----------|------|
| 51 | Firestore セキュリティルールを本格運用ルールに昇格 | ⏸ 次回最優先 |
| 52 | 将来仕様：イベント作成の管理者承認制 | ⏸ 将来 |
| 53 | 管理画面：データ集計タブ（フェーズ2） | ⏸ 将来 |
| 54 | UI/UX 改善ポーリッシュ | ⏸ 任意 |
| 55 | Firebase Storage 機能（Blaze 移行時に再開） | ⏸ プラン依存 |

---

## 4. 確定済み事項（v7からの差分）

### GitHub 連携・本番デプロイ環境（確定）

| 項目 | 値 |
|------|---|
| GitHub アカウント | `alterhabit999-web` |
| リポジトリ名 | `shAreZ`（アプリ名 `ShareAZ` と異なる表記。意図的） |
| リポジトリ可視性 | Public |
| ブランチ運用 | `main`（ソース）/ `gh-pages`（ビルド成果物・自動生成） |
| デフォルトデプロイコマンド | `npm run deploy`（= `npm run build` → `gh-pages -d build`） |
| 本番公開URL | https://alterhabit999-web.github.io/shAreZ/ |
| Firebase Authorized domain | `alterhabit999-web.github.io`（追加済み） |
| 初回コミット | `948a9af chore: initial commit` |

### Firebase Storage の実装方針（確定）

| 項目 | 内容 |
|------|------|
| 現状 | **当面は実装しない** |
| 理由 | 新規 Firebase プロジェクトでは Storage が Blaze（従量課金）プラン必須に変わったため、Spark（無料）プランでは利用不可 |
| `storage.rules` | リポジトリに保持（Blaze 移行時にコピペで使える状態） |
| `firebase.js` の `getStorage` import | そのまま残す（実際にアップロード操作しなければ課金・エラー発生なし） |
| アバター画像 / 商品画像 | 当面は外部URL運用（既に動作中） |
| 将来の有効化条件 | プロジェクト全体を Blaze に移行する判断が出たら再開 |

### .gitignore の確定状況

以下が GitHub に上がらないことを確認済み：

```
node_modules/
/build
.env
.env.local
.env.development.local
.env.test.local
.env.production.local
*.log
.DS_Store
```

特に **`.env`（Firebase APIキー含む）は確実に除外** されている。`git ls-files | grep .env` で確認済み（`.env.example` のみ含まれる）。

---

## 5. Firestore コレクション構成（v8 時点）

v7 から変化なし。

```
Firestore
├── users/                  ← ユーザープロフィール
├── threads/                ← 告知・イベント（comments / interested / participations サブコレクション）
├── deletionRequests/       ← スレッド削除申請
├── coinTransactions/       ← AZコイン異動履歴
├── shopItems/              ← ノベルティ商品
└── exchangeRequests/       ← 交換申請
```

詳細は v7 引き継ぎ書または spec.md v1.5 §4 参照。

**未作成のコレクション**：`eventCreationRequests/`（フェーズ2）

---

## 6. 画面構成（v8 時点）

v7 から変化なし。全画面実装済み。

- ログイン画面 / ホーム / 掲示板 / スレッド詳細 / 新規スレッド作成
- メンバー / マイページ
- ポイント交換（ShopScreen）
- 管理画面（admin専用、7タブ：お知らせ / イベント完了 / 削除申請 / コイン付与 / ユーザー / ノベルティ / 交換申請）

---

## 7. 重要な実装メモ（v8で追加）

### GitHub & GitHub Pages デプロイ運用フロー

#### 通常の変更反映

```bash
# 1. ソース修正後
git add <変更ファイル>          # 個別指定推奨（git add . は事故予防のため避ける）
git commit -m "わかりやすいメッセージ"
git push origin main           # ソースを GitHub に保存

# 2. 本番反映
npm run deploy                 # build → gh-pages へ自動 push
```

`git push origin main` と `npm run deploy` は別々の処理：

- `git push origin main` → **ソース保存**（GitHub の `main` ブランチに反映、コードレビューや履歴管理用）
- `npm run deploy` → **本番公開**（CRA build 結果を `gh-pages` ブランチに上げて GitHub Pages から配信）

両方やるのが基本フロー。`main` を push しただけでは本番URLには反映されない点に注意。

#### `npm run deploy` の中身

```json
{
  "scripts": {
    "predeploy": "npm run build",   // react-scripts build
    "deploy": "gh-pages -d build"   // build/ を gh-pages ブランチへ強制 push
  },
  "homepage": "https://alterhabit999-web.github.io/shAreZ"
}
```

- `homepage` フィールドが**必須**：CRA がアセットの相対パス（`/shAreZ/static/...`）を組み立てる基準
- もしリポジトリ名や URL を変えたら `homepage` も合わせて更新する

#### GitHub Pages の状態確認

```bash
gh api repos/alterhabit999-web/shAreZ/pages --jq '.status'
# → "built" なら公開完了、"building" なら準備中
```

#### gh-pages ブランチを覗く

GitHub のリポジトリページでブランチ切替メニューから `gh-pages` を選ぶと、build 後の HTML/JS が確認できる（手で編集しないこと、`npm run deploy` で上書きされる）。

### Firebase Authorized domains について

ログイン関連エラー `auth/unauthorized-domain` が出たら、Firebase Console → Authentication → Settings → Authorized domains を確認：

- ローカル開発：`localhost`（自動で含まれる）
- 本番：`alterhabit999-web.github.io`（v8 で追加済み）

カスタムドメインを追加する場合はここに足す。

### Firebase Storage を使わない場合の注意点

- `firebase.js` の `import { getStorage } from 'firebase/storage'` と `export const storage` は**そのまま残してOK**
- SDK を読み込むだけでは課金・エラーは発生しない
- 実際に `uploadBytes` などを呼ぶと「permission-denied」または「object-not-found」エラーになる
- 将来 Blaze に移行したら storage.rules を Firebase Console に貼り付ければ即利用可能

---

## 8. 開発環境

### 開発コマンド

```bash
# ローカル起動
cd ~/Documents/App/ShareAZ
npm start                              # http://localhost:3000/shAreZ

# プロセス確認・終了
lsof -i :3000
kill <PID>

# GitHub にコード反映
git add <files>
git commit -m "message"
git push origin main

# 本番反映（GitHub Pages へ）
npm run deploy

# GitHub Pages のビルド状態確認
gh api repos/alterhabit999-web/shAreZ/pages --jq '.status'
```

### ファイル構成（v8 時点）

```
ShareAZ/
├── public/
│   ├── index.html
│   └── manifest.json
├── src/
│   ├── App.jsx           ← 全画面・状態管理（約6,640行）
│   ├── firebase.js
│   ├── index.js
│   └── index.css
├── .env, .env.example, .gitignore
├── firestore.rules
├── storage.rules         ← 未使用（Blaze 移行時用）
├── package.json          ← homepage: https://alterhabit999-web.github.io/shAreZ
├── package-lock.json
├── DESIGN.md
├── spec.md（v1.5）
├── ShareAZ_handover_v1.md ～ v7.md
└── ShareAZ_handover_v8.md ← このファイル
```

### App.jsx 内のコンポーネント構造

v7 から変化なし。詳細は v7 引き継ぎ書 §8 参照。

---

## 9. 既知の制約・MVP範囲外（v8時点）

| 項目 | 状況 | 対応予定 |
|------|------|---------|
| Firebase Storage（アバター・商品画像） | **実装中止**（Blaze プラン必須のため） | プラン移行時に再開 |
| 本番セキュリティルール | 暫定（認証ユーザー全許可） | **次回最優先** |
| イベント完了取り消し機能 | MVP対象外（Firestoreコンソール手動） | 将来 |
| 初回プロフィール設定+5コイン | 自動付与未実装 | 将来 |
| 交換申請のユーザー側取り消し | 不可（仕様確定） | 仕様変更不要 |
| writeBatch race condition（在庫超過） | MVP規模では許容 | 必要なら runTransaction 化 |
| 将来：イベント作成の管理者承認制 | spec.md にメモ済み | フェーズ2 |
| 管理画面：データ集計タブ | 未着手 | フェーズ2 |

---

## 10. 次回やること（優先順位順）

### 1. 【最優先】Firestore セキュリティルールの本格運用化

**現状の `firestore.rules`（暫定）**：
```javascript
allow read, write: if request.auth != null;
```
→ 認証ユーザーなら誰でも全データ読み書き可能（開発用）

**目標：コレクション別の適切な制御**

| コレクション | 読み取り | 書き込み |
|-------------|----------|----------|
| `users` | 認証ユーザー | 本人のみ（roleは admin のみ変更可） |
| `threads` | 認証ユーザー | 認証ユーザー作成 / 本人＋admin で更新 |
| `threads/{id}/participations` | 認証ユーザー | 本人のみ（自分の申請） |
| `threads/{id}/comments` | 認証ユーザー | 認証ユーザー作成、編集削除なし（MVP） |
| `threads/{id}/interested` | 認証ユーザー | 本人のみ |
| `coinTransactions` | 本人＋admin | admin のみ + writeBatch経由のシステム |
| `shopItems` | 認証ユーザー | admin のみ |
| `exchangeRequests` | 本人＋admin | 本人のみ作成 / admin のみ status更新 |
| `deletionRequests` | 本人＋admin | 本人のみ作成 / admin のみ status更新 |

**admin 判定の方針**：
- A) `users/{uid}.role == 'admin'` を Firestore Rules から `get()` で参照
- B) Firebase Auth カスタムクレーム（`request.auth.token.admin == true`）

実装が単純なのは A、運用がスケールするのは B。MVP では A で進めて、将来 B 移行を視野に入れる。

**反映方法**：
1. `firestore.rules` をローカルで編集
2. Firebase Console → Firestore → Rules タブにコピペ → 「公開」
3. または `firebase deploy --only firestore:rules`（Firebase CLI 連携が必要）

**注意**：書き直すと writeBatch やバッチ処理が動かなくなる可能性があるので、**全管理機能・ユーザー操作を再テスト** すること。

### 2. 将来仕様：イベント作成の管理者承認制

`eventCreationRequests/` コレクションを新設して `deletionRequests/` と同じパターンで実装。spec.md §2-4 にメモ済み。

### 3. 管理画面：データ集計タブ（フェーズ2）

コイン履歴の月次集計、参加率、人気タグ、CSV出力など。

### 4. UI/UX 改善ポーリッシュ

実運用後にフィードバック対応。

---

## 11. 未決定事項

- [ ] ノベルティ商品ラインアップ（品目・価格・在庫数）
- [ ] Firestore セキュリティルールでの admin 判定方式（A: get() 参照 / B: カスタムクレーム）
- [ ] Blaze プラン移行のタイミング（Storage 利用するなら必要）

---

## 変更履歴

| バージョン | 日付 | 内容 |
|-----------|------|------|
| v1 | 2026-04-24 | 初版作成 |
| v2 | 2026-04-24 | 環境構築完了 |
| v3 | 2026-04-24 | Firebase Auth・プロフィール |
| v4 | 2026-04-25 | 掲示板機能、コメント、興味あり、参加申請、マイページ参加履歴、タグ機能、ボトムシート、ヘッダー統一 |
| v5 | 2026-04-25 | メンバー検索拡張、メンバーランク表示、管理画面入口・お知らせ投稿タブ、admin編集権限、profileリアルタイム同期、「昇華」→「作成」用語変更 |
| v6 | 2026-04-25 | 管理画面5タブ完全実装、coinTransactions稼働、メンバーランク実稼働 |
| v6.1 | 2026-04-26 | ブランドカラー変更（オレンジ → コーポレートネイビー＋レッド） |
| v7 | 2026-04-26 | ポイント交換機能完全実装（shopItems / exchangeRequests 稼働、ShopScreen本実装、管理画面に2タブ追加・タブUX改善、マイページ申請履歴）、ボトムナビ「ショップ」→「ポイント交換」リネーム、Firestore複合インデックス回避パターン確立 |
| v8 | 2026-04-26 | GitHub 連携・本番デプロイ完了（リポジトリ `alterhabit999-web/shAreZ` Public、`npm run deploy` で GitHub Pages 反映、Firebase Authorized domains 追加、本番ログイン動作確認）、Firebase Storage 実装は Blaze プラン必須のため中止（storage.rules はリポジトリに保持） |
