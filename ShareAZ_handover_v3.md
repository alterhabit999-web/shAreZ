# ShareAZ 引き継ぎ書

**バージョン**: v3
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
| 9 | **Firestore データベース実体を作成（asia-northeast1、テストモード）** | ✅ 完了（v3で対応） |
| 10 | **Firebase Authentication のログイン機能を実装** | ✅ 完了（v3） |
| 11 | **ユーザープロフィール機能を実装（`users/{uid}` 自動作成・編集UI）** | ✅ 完了（v3） |
| 12 | **manifest.json / index.html の存在しないアイコン参照を削除** | ✅ 完了（v3） |
| 13 | スレッド投稿・表示機能の実装（掲示板・ホーム一覧） | ⏸ 未着手（次回最優先） |
| 14 | Firebase Storage の有効化 | ⏸ 未着手 |
| 15 | GitHub リポジトリ作成・連携 | ⏸ 未着手 |
| 16 | Firestore セキュリティルールの本番設定 | ⏸ 未着手（現在テストモード） |

---

## 3. 確定済み事項

### アプリ基本情報

| 項目 | 内容 |
|------|------|
| アプリ名 | ShareAZ |
| フォルダ | `~/Documents/App/ShareAZ` |
| ホスティング | GitHub Pages |
| コード管理 | GitHub（リポジトリ名：ShareAZ） |
| ローカル開発URL | `http://localhost:3000/ShareAZ`（`homepage` 設定のためサブパス） |

### 技術スタック

| 役割 | 技術 |
|------|------|
| フロントエンド | React（Create React App 構成） |
| データベース | Firebase Firestore |
| 認証 | Firebase Authentication（メール＋パスワード） |
| 画像保存 | Firebase Storage（未設定） |
| セキュリティ | Firestore Security Rules（現在テストモード） |
| ホスティング | GitHub Pages（未連携） |

### ユーザー・登録方針

| 項目 | 内容 |
|------|------|
| 登録方式 | 管理者が招待メールを送る招待制（現状はFirebaseコンソールで手動作成） |
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
| Authentication | メール/パスワード 有効化済み＋テストユーザー作成済み |
| Firestore | **データベース作成済み（asia-northeast1、テストモード）** |
| Storage | 未設定 |
| APIキー | `.env` ファイルに設定済み |

---

## 4. Firestore コレクション構成（設計済み）

```
users/              ← プロフィール（name, department, bio, avatarUrl, role, azCoins, tags[]）【v3で実装】
tags/               ← タグマスタ（name）
threads/            ← スレッド・イベント（title, body, category, eventDate, capacity, status）
  └ participations/ ← サブコレクション（参加申請）
coinTransactions/   ← AZコイン履歴（userId, amount, reason, relatedThreadId, grantedBy）
shopItems/          ← ショップアイテム（name, description, imageUrl, coinCost, stock, isActive）
exchangeRequests/   ← 交換申請（userId, itemId, status）
```

**v3 時点の実データ状況**:
- `users/` — 初回ログイン時に自動作成（デフォルト値で）
- その他のコレクション — 未着手

---

## 5. 開発環境

| 項目 | 内容 |
|------|------|
| 開発ツール | Claude Code（CLIツール） |
| アプリフォルダ | `~/Documents/App/ShareAZ` |
| npmパッケージ | `firebase`、`gh-pages` インストール済み |

### ファイル構成（現状）

```
ShareAZ/
├── public/
│   ├── index.html         ✅ 作成済み（アイコン参照削除済み）
│   └── manifest.json      ✅ 作成済み（アイコン配列を空に）
├── src/
│   ├── App.jsx            ✅ Auth連携・プロフィール機能実装済み
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
# ローカル起動（http://localhost:3000/ShareAZ で確認）
cd ~/Documents/App/ShareAZ
npm start

# 本番デプロイ（GitHub Pages）※リポジトリ連携後
git add .
git commit -m "変更内容のメモ"
git push origin main
npm run deploy
```

### 注意点（トラブルシューティング）

- **`.env` の変更は dev server 再起動が必要**: CRA は起動時にしか `.env` を読まないため、`.env` を編集した後は `npm start` を必ず停止→再起動する
- **ポート3000が使用中エラー**: 前回のdev serverが残っている場合 `lsof -i :3000` でPIDを確認し `kill <PID>` で終了してから `npm start`
- **Firestore「client is offline」エラー**: プロジェクト作成 ≠ Firestore DB作成。Firebaseコンソール → Firestore Database で「データベースを作成」ボタンが残っていたら未作成

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

### Firebase Authentication ログイン機能の実装
**内容**: `App.jsx` の仮ログイン処理を Firebase Auth に差し替えた。
**詳細**:
- `onAuthStateChanged` でログイン状態を監視し、`user` state で保持
- `signInWithEmailAndPassword` でログイン、`signOut` でログアウト
- Firebase Auth のエラーコードを日本語メッセージに変換する `getAuthErrorMessage` 関数を追加（`auth/invalid-email`、`auth/wrong-password` など対応）
- 初期認証チェック中は「読み込み中...」を表示
- ログインボタンに「ログイン中...」のローディング状態を追加
- `ProfileScreen` にログアウトボタンを追加

### ユーザープロフィール機能の実装
**内容**: Firestore `users/{uid}` コレクションと連携したプロフィールの作成・閲覧・編集機能を追加。
**詳細**:
- `ensureUserProfile(user)` 関数：初回ログイン時に `users/{uid}` ドキュメントを自動作成
  - デフォルト値：`name` はメールアドレスの @前部分、`role: "member"`、`azCoins: 0`、`tags: []`、`department`/`bio`/`avatarUrl` は空文字
- `ProfileScreen` を書き換え：閲覧モード／編集モードの切り替え
  - 編集可能項目：氏名（必須）・所属部署・自己紹介（複数行）・タグ
  - 保存時に Firestore `updateDoc` でバックエンド更新
- `TagInput` コンポーネント（チップ形式）：Enter/カンマで追加、×ボタンで削除、Backspaceで末尾削除
- `HomeScreen` / `ShopScreen` のヘッダーの AZコイン残高をダミー値 45 から `profile.azCoins` に差し替え

### プロフィール取得の耐障害性改善
**内容**: Firestoreからのプロフィール取得が失敗しても永久ローディングにならないよう改善。
**詳細**:
- `profileError` state を追加し、エラーメッセージを画面表示
- プロフィール取得失敗時に「再試行」「ログアウト」ボタンを表示
- `setAuthLoading(false)` を `onAuthStateChanged` コールバックの早い段階で呼ぶようリファクタリング

### 【バグ修正】`.env` が読み込まれず `auth/invalid-api-key` エラー
**問題**: ブラウザで `Firebase: Error (auth/invalid-api-key)` が発生。
**原因**: `.env` が作成される前に起動していた dev server（前回セッションのPID）がそのまま動いており、新しい環境変数が読み込まれていなかった。CRA は起動時にしか `.env` を読まない。
**修正内容**: 古いdev serverプロセスを `kill` してから `npm start` を再実行。

### 【バグ修正】Firestore「client is offline」エラー
**問題**: プロフィール取得時に `FirebaseError: Failed to get document because the client is offline.` が発生。
**原因**: 引き継ぎ書 v2 には「Firestore 作成済み」と記載されていたが、実際には Firebase プロジェクトは作成されていても Firestore データベース本体が未作成だった。
**修正内容**: Firebase コンソール → Firestore Database → 「データベースを作成」で `asia-northeast1`（東京）・テストモードで作成。

### 【バグ修正】manifest.json のアイコン読み込みエラー
**問題**: ブラウザコンソールに `Error while trying to use the following icon from the Manifest: .../logo192.png (Download error or resource isn't a valid image)` の警告が表示される。
**原因**: `public/manifest.json` と `public/index.html` が存在しないアイコン画像（`favicon.ico`、`logo192.png`、`logo512.png`）を参照していた。
**修正内容**: `manifest.json` の `icons` 配列を空に、`index.html` の `<link rel="icon">` と `<link rel="apple-touch-icon">` を削除。

### ⏸ 中断中：スレッド機能・Storage・GitHub連携・本番ルール
**内容**: 次回は「スレッド投稿・表示機能（B）」から開始予定。Firebase Storage、GitHub連携、本番セキュリティルールはその後の順。

---

## 8. 次回やること（優先順位順）

1. **【最優先】スレッド投稿・表示機能の実装（B）**
   - ホーム画面のダミーデータを Firestore `threads` コレクションの実データに差し替え
   - 掲示板画面（`ThreadsScreen`）にスレッド一覧表示を実装
   - 新規スレッド作成画面（タイトル・本文・カテゴリ・開催日時・定員）
   - スレッド詳細画面（本文・参加申請ボタン・参加者一覧）
   - カテゴリ：`event`（イベント）/ `announcement`（告知）/ `chat`（雑談）
   - スレッド作成時は `authorId`、`createdAt` を自動セット

2. **Firebase Storage を有効化する（C）**
   - Firebase コンソール → Storage → 「始める」
   - ロケーション：asia-northeast1（東京）
   - セキュリティルール：テストモードで開始
   - アバター画像アップロード機能の実装時に必要

3. **GitHub リポジトリを作成して連携する（D）**
   - github.com で `ShareAZ` リポジトリを Public で作成
   - `package.json` の `homepage` にGitHubユーザー名を入力
   - `git init` → `git remote add` → `git push`
   - `npm run deploy` で GitHub Pages デプロイ確認

4. **Firestore セキュリティルールを本番用に設定する（E）**
   - `spec.md` の「4. データ設計 → セキュリティルール方針」を参照
   - 主なルール：
     - `users`: 認証ユーザー全員が読み取り、本人のみ書き込み（role変更はAdmin経由）
     - `threads`: 認証ユーザー全員が読み取り、作成者本人＋Adminが更新・削除
     - `coinTransactions`: 本人＋Admin 読み取り、Admin のみ書き込み

---

## 変更履歴

| バージョン | 日付 | 内容 |
|-----------|------|------|
| v1 | 2026-04-24 | 初版作成（初回セッション終了） |
| v2 | 2026-04-24 | 環境構築完了（Reactファイル一式・Firebase設定）。次回からClaude Codeで作業再開 |
| v3 | 2026-04-24 | Firebase Auth ログイン機能・ユーザープロフィール機能を実装。Firestoreデータベース実体を作成（asia-northeast1、テストモード）。manifest.jsonのアイコン参照を削除。次回は「スレッド機能（B）」から開始。 |
