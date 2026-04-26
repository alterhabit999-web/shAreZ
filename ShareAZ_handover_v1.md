# ShareAZ 引き継ぎ書

**バージョン**: v1  
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
| 5 | 環境構築（Reactプロジェクト作成・Firebaseセットアップ） | ⏸ 未着手 |

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
| フロントエンド | React（Create React App） |
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
| 開発ツール | Cowork + Macターミナル |
| アプリフォルダ | `~/Documents/App/ShareAZ` |
| 必要npmパッケージ | `firebase`、`gh-pages`（環境構築時にインストール） |

### 環境変数（.env）に必要な項目（環境構築時に設定）

```
REACT_APP_FIREBASE_API_KEY=...
REACT_APP_FIREBASE_AUTH_DOMAIN=...
REACT_APP_FIREBASE_PROJECT_ID=...
REACT_APP_FIREBASE_STORAGE_BUCKET=...
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=...
REACT_APP_FIREBASE_APP_ID=...
```

---

## 6. 未決定事項

- [ ] GitHubアカウント名（リポジトリURLの確定に必要）
- [ ] FirebaseプロジェクトのAPIキー・設定（環境構築時に取得）
- [ ] コイン付与量の最終決定（管理者と要相談）
- [ ] スレッドカテゴリの種類・名称
- [ ] デプロイ後の公開URL確定

---

## 7. 今回のセッションで行った変更

### 仕様書（spec.md）の初版作成
**内容**: ShareAZの全機能（ユーザー管理・プロフィール・タグ検索・掲示板・AZコイン・交換ショップ・管理者機能）と画面構成・データ設計・技術方針をまとめた仕様書を新規作成。

### バックエンドを Firebase に変更
**内容**: Supabaseの無料枠が上限に達したため、Firebaseへ変更を決定。  
**詳細**: データ設計をPostgreSQLのテーブル形式からFirestoreのコレクション/ドキュメント形式に全面的に書き直した。NeonとFirebaseを比較検討し、認証・DB・ストレージが一体型のFirebaseを採用。

### DESIGN.md をShareAZ向けにカスタマイズ
**内容**: クックパッドのデザインシステムをベースに、ShareAZ専用のデザイン仕様書を作成。  
**詳細**: AZコイン専用カラー（ゴールド `#f5c518`）・タグコンポーネント・バッジ・ステータス表示・ボトムナビゲーションなど、SNSアプリに必要な要素を追加。

---

## 8. 次回やること（優先順位順）

1. **環境構築**
   - Reactプロジェクトの新規作成（`npx create-react-app ShareAZ`）
   - GitHubリポジトリの作成・連携
   - Firebaseプロジェクトの作成・APIキー取得
   - `.env` ファイルの作成
   - `firebase` パッケージのインストール
   - `firebase.js`（Firebaseクライアント初期化ファイル）の作成

---

## 変更履歴

| バージョン | 日付 | 内容 |
|-----------|------|------|
| v1 | 2026-04-24 | 初版作成（初回セッション終了） |
