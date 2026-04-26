# ShareAZ 引き継ぎ書

**バージョン**: v2  
**更新日**: 2026-04-24  
**仕様書バージョン**: spec.md v1.2

---

## 1. アプリ概要

**アプリ名**: ShareAZ  
**コンセプト**: 社員が得意スキルや趣味・関心をシェアし、共通の興味を持つ仲間とつながれる社内コミュニティSNS。AZコイン（ポイント）でノベルティと交換できる報酬システム付き。  
**フォルダ**: `~/Documents/App/ShareAZ`  
**仕様書**: `spec.md`  
**デザイン**: `DESIGN.md`

---

## 2. 作業サマリー

| # | 作業内容 | 状態 |
|---|----------|------|
| 1 | アプリ要件ヒアリング（規模・登録方式・Admin・アプリ名） | ✅ 完了 |
| 2 | 仕様書（spec.md）初版作成 | ✅ 完了 |
| 3 | バックエンドを Firebase に決定・Firestore形式でデータ設計 | ✅ 完了 |
| 4 | DESIGN.md をShareAZ向けにカスタマイズ | ✅ 完了 |
| 5 | Reactプロジェクトのファイル一式を作成 | ✅ 完了 |
| 6 | npm install 完了 | ✅ 完了 |
| 7 | Firebaseプロジェクト作成・APIキー設定（.env） | ✅ 完了 |
| 8 | Firebase Authentication・Firestore を有効化 | ✅ 完了 |
| 9 | Firebase Storage の有効化 | ⏸ 未着手 |
| 10 | Firestore セキュリティルールの本番設定 | ⏸ 未着手（現在テストモード） |
| 11 | GitHub リポジトリ作成・連携 | ⏸ 未着手 |
| 12 | 各画面の本実装（Firebase連携込み） | ⏸ 未着手 |

---

## 3. 確定済み事項

### アプリ基本情報

| 項目 | 内容 |
|------|------|
| アプリ名 | ShareAZ |
| フォルダ | `~/Documents/App/ShareAZ` |
| ホスティング | GitHub Pages |
| コード管理 | GitHub（リポジトリ名：ShareAZ） |

### 技術スタック

| 役割 | 技術 |
|------|------|
| フロントエンド | React（Create React App 構成） |
| データベース | Firebase Firestore |
| 認証 | Firebase Authentication（メール＋パスワード） |
| 画像保存 | Firebase Storage |
| セキュリティ | Firestore Security Rules |
| ホスティング | GitHub Pages |

### ユーザー・登録方針

| 項目 | 内容 |
|------|------|
| 登録方式 | 管理者が招待メールを送る招待制 |
| ロール | `admin`（管理者）/ `member`（一般社員）の2種 |
| 想定規模 | 初期：少人数〜、最終：1,000人以上 |

### デザイン方針

| 項目 | 内容 |
|------|------|
| ベース | クックパッドのデザインシステムをShareAZ向けにカスタマイズ |
| ブランドカラー | オレンジ `#f28c06` |
| 背景色 | オフホワイト `#f8f6f2` |
| AZコインカラー | ゴールド `#f5c518` |
| フォント | noto-sans, system-ui フォールバックチェーン |
| 詳細 | `DESIGN.md` 参照 |

### Firebase プロジェクト情報

| 項目 | 内容 |
|------|------|
| プロジェクトID | `shareaz-fbfea` |
| Auth Domain | `shareaz-fbfea.firebaseapp.com` |
| Storage Bucket | `shareaz-fbfea.firebasestorage.app` |
| Authentication | メール/パスワード 有効化済み |
| Firestore | 作成済み（現在テストモード） |
| Storage | 未設定 |
| APIキー | `.env` ファイルに設定済み |

---

## 4. Firestore コレクション構成（設計済み）

```
users/              ← プロフィール（name, department, bio, avatarUrl, role, azCoins, tags[]）
tags/               ← タグマスタ（name）
threads/            ← スレッド・イベント（title, body, category, eventDate, capacity, status）
  └ participations/ ← サブコレクション（参加申請）
coinTransactions/   ← AZコイン履歴（userId, amount, reason, relatedThreadId, grantedBy）
shopItems/          ← ショップアイテム（name, description, imageUrl, coinCost, stock, isActive）
exchangeRequests/   ← 交換申請（userId, itemId, status）
```

---

## 5. 開発環境

| 項目 | 内容 |
|------|------|
| 開発ツール | Claude Code（CLIツール）※次回から |
| アプリフォルダ | `~/Documents/App/ShareAZ` |
| npmパッケージ | `firebase`、`gh-pages` インストール済み |

### ファイル構成（現状）

```
ShareAZ/
├── public/
│   ├── index.html         ✅ 作成済み
│   └── manifest.json      ✅ 作成済み（PWA設定）
├── src/
│   ├── App.jsx            ✅ スケルトンUI実装済み（デザインシステム反映・ダミーデータ）
│   ├── firebase.js        ✅ Firebase初期化済み
│   ├── index.js           ✅ 作成済み
│   └── index.css          ✅ 作成済み
├── .env                   ✅ APIキー設定済み（Gitには上げない）
├── .env.example           ✅ テンプレート作成済み
├── .gitignore             ✅ .env を除外設定済み
└── package.json           ✅ Firebase・gh-pages設定済み
```

### 開発コマンド

```bash
# ローカル起動（http://localhost:3000 で確認）
cd ~/Documents/App/ShareAZ
npm start

# 本番デプロイ（GitHub Pages）
git add .
git commit -m "変更内容のメモ"
git push origin main
npm run deploy
```

### 環境変数（.env）— 設定済み

```
REACT_APP_FIREBASE_API_KEY=（設定済み）
REACT_APP_FIREBASE_AUTH_DOMAIN=shareaz-fbfea.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=shareaz-fbfea
REACT_APP_FIREBASE_STORAGE_BUCKET=shareaz-fbfea.firebasestorage.app
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=343793789784
REACT_APP_FIREBASE_APP_ID=（設定済み）
```

---

## 6. 未決定事項

- [ ] GitHubアカウント名（package.json の homepage URL に必要）
- [ ] コイン付与量の最終決定（管理者と要相談）
- [ ] スレッドカテゴリの種類・名称
- [ ] デプロイ後の公開URL確定

---

## 7. 今回のセッションで行った変更

### React プロジェクトのファイル一式を手動作成
**内容**: `npx create-react-app` がサンドボックス制限で使えなかったため、必要なファイルをすべて手動で作成した。  
**作成ファイル**: `package.json`, `public/index.html`, `public/manifest.json`, `src/index.js`, `src/index.css`, `src/App.jsx`, `src/firebase.js`, `.gitignore`, `.env.example`

### App.jsx にスケルトンUIを実装
**内容**: DESIGN.md のカラーシステムを `C` 定数として `App.jsx` に定義し、以下の画面スケルトンを実装した。
- ログイン画面（メール・パスワードフォーム、仮ログイン）
- ホーム画面（スレッドカード一覧、ダミーデータ表示）
- ボトムナビゲーション（ホーム・メンバー・掲示板・ショップ・マイページ）
- その他画面（メンバー・掲示板・ショップ・マイページ）はプレースホルダー

**注意点**: Firebase Authentication との連携はまだ未実装。`isLoggedIn` は仮のstate管理。

### Firebase プロジェクトのセットアップ
**内容**: Firebaseプロジェクト `shareaz-fbfea` を作成し、Authentication（メール/パスワード）と Firestore Database（テストモード）を有効化した。APIキーを `.env` ファイルに保存済み。

### ⏸ 中断中：Firebase Storage・Firestoreルール・GitHub連携
**内容**: Firebase Storage の有効化、Firestore セキュリティルールの本番設定、GitHubリポジトリの作成・連携は未着手のまま中断。

---

## 8. 次回やること（優先順位順）

1. **npm start を再起動してFirebase接続を確認する**
   ```bash
   cd ~/Documents/App/ShareAZ
   npm start
   ```
   ブラウザでログイン画面が表示されること・コンソールエラーがないことを確認する

2. **Firebase Storage を有効化する**
   - Firebase コンソール → Storage → 「始める」
   - ロケーション：asia-northeast1（東京）
   - セキュリティルール：テストモードで開始

3. **GitHub リポジトリを作成して連携する**
   - github.com で `ShareAZ` リポジトリを Public で作成
   - `package.json` の `homepage` にGitHubユーザー名を入力
   - git init → git remote add → git push

4. **Firebase Authentication のログイン機能を実装する**
   - `App.jsx` の仮ログイン処理を Firebase Auth に差し替える
   - `signInWithEmailAndPassword` を使ったログイン
   - `onAuthStateChanged` でログイン状態を監視

5. **Firestore セキュリティルールを本番用に設定する**
   - `spec.md` の「4. データ設計 → セキュリティルール方針」を参照

---

## 変更履歴

| バージョン | 日付 | 内容 |
|-----------|------|------|
| v1 | 2026-04-24 | 初版作成（初回セッション終了） |
| v2 | 2026-04-24 | 環境構築完了（Reactファイル一式・Firebase設定）。次回からClaude Codeで作業再開 |
