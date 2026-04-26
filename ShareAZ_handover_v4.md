# ShareAZ 引き継ぎ書

**バージョン**: v4
**更新日**: 2026-04-25
**仕様書バージョン**: spec.md v1.3

---

## 1. アプリ概要

**アプリ名**: ShareAZ
**コンセプト**: 社員が得意スキルや趣味・関心をシェアし、共通の興味を持つ仲間とつながれる社内コミュニティSNS。AZコイン（ポイント）でノベルティと交換できる報酬システム付き。
**フォルダ**: `~/Documents/App/ShareAZ`
**仕様書**: `spec.md`（v1.3）
**デザイン**: `DESIGN.md`

### v3 → v4 の主要変化

- **掲示板機能（B）が大幅に進展**：スレッド一覧・新規作成・詳細画面・コメント・興味あり・参加申請まで完成
- **大型仕様変更**：雑談カテゴリ廃止、告知→イベント昇華フロー追加、コメント機能追加、メンバーランク制度導入の方向性決定（spec.md v1.3 参照）
- **Firestore セキュリティルール**：B案（認証ユーザーのみ）で本番化済み
- **マイページ**：参加イベント履歴（開催前/開催済みでセクション分け）を実装

---

## 2. 作業サマリー

### v3 までで完了済み
| # | 作業内容 |
|---|----------|
| 1〜12 | アプリ要件・仕様書・ファイル構成・Firebase初期化・Auth・プロフィール（v3 までで完了） |

### v4 セッションで完了
| # | 作業内容 | 状態 |
|---|----------|------|
| 13 | Firestore セキュリティルール暫定本番化（B案：認証ユーザーのみ） | ✅ 完了 |
| 14 | スレッド一覧画面（`ThreadsScreen`）：Firestore実データ + 新規作成FAB | ✅ 完了 |
| 15 | 新規スレッド作成画面（`NewThreadScreen`）：タイトル・本文・カテゴリ・開催日時・定員・タグ | ✅ 完了 |
| 16 | スレッドにタグ機能 + 掲示板にタグフィルタ（**ボトムシート方式**、60vh固定） | ✅ 完了 |
| 17 | タグ入力バグ修正（IME対応：日本語変換中のEnterを無視） | ✅ 完了 |
| 18 | ボトムナビ順序変更（ホーム→掲示板→メンバー→ショップ→マイページ） | ✅ 完了 |
| 19 | ヘッダー長さ統一（固定高さ56px・タイトル中央寄せ・スクロールバー差吸収） | ✅ 完了 |
| 20 | spec.md v1.3 更新（雑談廃止・昇華・コメント・興味あり・ランク・管理画面） | ✅ 完了 |
| 21 | ホーム画面（`HomeScreen`）：Firestore実データ・公式お知らせ優先・新着セクション | ✅ 完了 |
| 22 | スレッド詳細画面（`ThreadDetailScreen`）：表示・編集（作成者）・削除申請（作成者→管理者） | ✅ 完了 |
| 23 | スレッド内コメント機能（古い順・リアルタイム・投稿のみMVP） | ✅ 完了 |
| 24 | 「興味あり」リアクション機能（告知のみ）+ カードに件数表示 | ✅ 完了 |
| 25 | 参加申請機能（イベントのみ）+ 参加者一覧表示 + 定員チェック | ✅ 完了 |
| 26 | マイページに参加イベント履歴（開催前/開催済みで分割） | ✅ 完了 |

### 未着手（次回以降）
| # | 作業内容 | 状態 |
|---|----------|------|
| 27 | 告知 → イベント昇華機能（作成者のみ） | ⏸ 次回最優先 |
| 28 | メンバー検索画面（タグ検索 / 名前検索 / お気に入り） | ⏸ 未着手 |
| 29 | メンバーランク機能（🥉🥈🥇👑） | ⏸ 未着手 |
| 30 | 管理画面（Admin専用）：お知らせ投稿・削除申請承認・コイン管理など | ⏸ 未着手 |
| 31 | Firebase Storage 有効化（アバター画像用） | ⏸ 未着手 |
| 32 | GitHub リポジトリ作成・連携 | ⏸ 未着手 |
| 33 | Firestore セキュリティルールを本格運用ルールに昇格 | ⏸ 未着手 |

---

## 3. 確定済み事項

### アプリ基本情報

| 項目 | 内容 |
|------|------|
| アプリ名 | ShareAZ |
| フォルダ | `~/Documents/App/ShareAZ` |
| ホスティング | GitHub Pages（未連携） |
| ローカル開発URL | `http://localhost:3000/ShareAZ` |

### 技術スタック

| 役割 | 技術 |
|------|------|
| フロントエンド | React 18（Create React App） |
| データベース | Firebase Firestore（asia-northeast1） |
| 認証 | Firebase Authentication（メール+パスワード） |
| 画像保存 | Firebase Storage（未設定） |
| セキュリティ | Firestore Security Rules（暫定本番化済み） |

### Firebase プロジェクト情報

| 項目 | 内容 |
|------|------|
| プロジェクトID | `shareaz-fbfea` |
| Auth Domain | `shareaz-fbfea.firebaseapp.com` |
| Storage Bucket | `shareaz-fbfea.firebasestorage.app` |
| Firestore | データベース作成済み（asia-northeast1） |
| Firestore ルール | `firestore.rules` を反映済み（認証ユーザーのみ） |
| Authentication | メール/パスワード 有効化済み |

---

## 4. Firestore コレクション構成（v4 時点で実装済みの範囲）

```
Firestore
├── users/                  ← ユーザープロフィール（Auth初回ログインで自動作成）
│   └── {uid}/
│       ├── name, department, bio, avatarUrl, role, azCoins
│       ├── tags: string[]
│       ├── createdAt, updatedAt
│       └── （未実装：eventCount, hostCount, favoriteUserIds）
│
├── threads/                ← 告知・イベント
│   └── {threadId}/
│       ├── authorId, authorName
│       ├── title, body, category, tags
│       ├── eventDate, capacity（イベントのみ）
│       ├── status, participantCount, commentCount, interestedCount
│       ├── promotedFrom（昇華記録：未実装）
│       ├── isOfficial（公式お知らせフラグ：管理画面未実装のため現状すべてfalse）
│       ├── comments/        ← サブコレクション：コメント
│       │   └── {commentId}/ {authorId, authorName, body, createdAt}
│       ├── interested/      ← サブコレクション：興味あり（告知）
│       │   └── {uid}/ {createdAt}
│       └── participations/  ← サブコレクション：参加申請（イベント）
│           └── {uid}/ {userId, userName, status, createdAt}
│
└── deletionRequests/       ← スレッド削除申請（作成者→管理者）
    └── {requestId}/ {threadId, threadTitle, requestedBy, requestedByName, reason, status, createdAt}
```

**未作成のコレクション**：`tags/`、`coinTransactions/`、`shopItems/`、`exchangeRequests/`

---

## 5. 画面構成（v4 時点）

### 実装済み

- **ログイン画面**：メール+パスワード認証
- **ホーム画面**：公式お知らせ + 新着スレッドの2セクション
- **掲示板画面**：スレッド一覧 + タグフィルタ（ボトムシート） + FAB（新規作成）
- **新規スレッド作成画面**：カテゴリ・タイトル・本文・タグ・（イベント時のみ）開催日時・定員
- **スレッド詳細画面**：
  - 表示：カテゴリバッジ・公式バッジ・タグ・主催者・本文
  - 作成者本人：編集ボタン / 削除申請ボタン
  - イベント：参加申請ボタン + 参加者一覧 + 定員チェック
  - 告知：興味あり ボタン
  - コメント：古い順・リアルタイム・投稿のみ（編集削除は未実装）
- **マイページ**：プロフィール表示・編集・タグ・参加イベント履歴・ログアウト

### スケルトンのみ（未実装）

- メンバー画面
- ショップ画面
- スレッド詳細の「イベントに昇華する」ボタン（disabled状態で配置のみ）
- 管理画面

---

## 6. 重要な実装メモ

### Firestore セキュリティルール（暫定 / B案）

```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

- 外部からの匿名アクセスは完全に遮断される ✅
- **ログイン中ユーザーは role や azCoins も書き換え可能なので、本格運用前には本番用ルールに昇格が必要**
- ファイル：`firestore.rules`（リポジトリ管理用 / Firebaseコンソールにも反映済み）

### コメント・興味あり・参加申請の保存場所

すべてサブコレクションに保存：
- `threads/{threadId}/comments/{commentId}`
- `threads/{threadId}/interested/{uid}`
- `threads/{threadId}/participations/{uid}`

**カウンタ更新**：`participantCount`/`commentCount`/`interestedCount` は親スレッドドキュメントに `increment(±1)` で更新。

### マイページ「参加イベント」のクエリ

```js
const q = query(
  collectionGroup(db, 'participations'),
  where('userId', '==', user.uid)
);
```

**初回実行時に Firestore のインデックス作成が必要**な場合あり。エラーが出たらブラウザコンソールに表示されるリンクをクリックすればワンクリックで作成可能（1〜2分で完了）。

### 名前変更時の注意（非正規化問題）

`threads.authorName`、`comments.authorName`、`participations.userName` は投稿時点のスナップショット。プロフィールで名前を変更しても、過去の投稿/コメント/参加レコードの表示名は更新されない（MVP仕様として許容）。

---

## 7. 開発環境

### 開発コマンド

```bash
# 起動
cd ~/Documents/App/ShareAZ
npm start                  # http://localhost:3000/ShareAZ

# プロセス確認・終了
lsof -i :3000
kill <PID>
```

### ファイル構成

```
ShareAZ/
├── public/
│   ├── index.html
│   └── manifest.json
├── src/
│   ├── App.jsx           ← 全画面・状態管理（約2,500行）
│   ├── firebase.js       ← Firebase初期化
│   ├── index.js
│   └── index.css
├── .env                  ← Firebase APIキー（Git管理外）
├── .env.example
├── .gitignore
├── firestore.rules       ← Firestoreセキュリティルール（v4で追加）
├── package.json
├── DESIGN.md             ← デザインシステム
├── spec.md               ← 仕様書（v1.3）
├── ShareAZ_handover_v1.md
├── ShareAZ_handover_v2.md
├── ShareAZ_handover_v3.md
└── ShareAZ_handover_v4.md ← このファイル
```

### App.jsx 内のコンポーネント構造（参考）

```
App
├── BottomNav
├── Header（共通：戻るボタン・タイトル中央寄せ・コイン残高）
├── LoginScreen
├── HomeScreen ── SectionTitle, ThreadCard
├── MembersScreen（スケルトン）
├── ThreadsScreen ── ThreadCard, FAB, TagFilterSheet
├── NewThreadScreen ── TagInput
├── ThreadDetailScreen ── TagInput（編集モード）
├── ShopScreen（スケルトン）
├── MyEventsSection（マイページ内のサブセクション）
└── ProfileScreen ── TagInput, MyEventsSection
```

---

## 8. 既知の制約・MVP範囲外

| 項目 | 状況 | 対応予定 |
|------|------|---------|
| 公式お知らせ | データ構造あり / Admin画面未実装のため空 | Step：管理画面実装時 |
| 告知→イベント作成（旧「昇華」） | ✅ 実装済み（作成者がワンタップで作成可能） | （下の将来仕様参照） |
| **イベント作成の管理者承認制** | **未実装。現状は誰でも即作成可能** | **将来：管理画面実装と合わせて承認フロー化** |
| コメント編集・削除 | 投稿のみ（仕様確定：MVPでは不可、将来B案） | フェーズ2 |
| スレッド削除 | 作成者は不可（削除申請のみ） | 管理画面で承認フロー実装時 |
| メンバー検索 | スケルトン | 未着手 |
| メンバーランク | データ構造設計済み（spec.md 2-8） | 未着手 |
| お気に入りメンバー | spec化済み | 未着手 |
| 共参加回数 / チーム | フェーズ2に確定 | 未着手 |
| Firebase Storage | 未有効化（アバター画像保存用） | 未着手 |
| GitHub連携 | 未着手 | 未着手 |

### 🔮 将来仕様メモ：イベント作成の管理者承認制

**現状の挙動**：告知の作成者が「🚀 イベントを作成する」ボタンをタップすると、即座にイベントスレッドに変換される（誰でも自由にイベント作成可能）。

**将来の理想形**：
1. 作成者が「イベントを作成する」ボタンをタップ → **イベント作成申請** が管理者に送られる
2. 管理者が管理画面で内容を確認 → 承認 / 却下を判断
3. 承認された場合のみ、告知がイベントに変換される

**理由**：
- 社内SNSとしての品質管理（不適切なイベントの抑止）
- 開催情報の整合性担保（複数イベントの調整など）

**実装方針**：
- 新コレクション `eventCreationRequests/` を作る（`deletionRequests/` と同じパターン）
- 申請時にこちらに記録 → 管理者画面で承認 → 承認時に thread 本体を更新
- 新規スレッド作成時の「イベント」カテゴリ選択も同じフローに統合

**実装タイミング**：管理画面（Admin専用）の実装と同時期がベスト。

---

## 9. 次回やること（優先順位順）

### 1. 【最優先】告知 → イベント昇華機能（Step 4d）

- 詳細画面の disabled ボタン「🚀 イベントに昇華する」を実機能化
- 作成者のみがタップ可能
- タップ → モーダルで「開催日時」「定員」を入力
- 確定 → `category: 'announcement' → 'event'`、`promotedFrom: 'announcement'`、`eventDate`/`capacity` を設定
- 確認ダイアログで「一度昇華したら戻せない」旨を表示

### 2. メンバー検索画面の実装

- タグ検索 / 名前検索 / お気に入り（MVP）
- `users/` コレクションをリスト表示
- 共参加・チーム機能はフェーズ2

### 3. メンバーランク機能

- `users/{uid}.eventCount` `hostCount` を導入
- 「イベント完了」処理時に増分
- ランクは表示時に動的判定（🥉0-4 / 🥈5-14 / 🥇15+ / 👑ゴールド+主催3+）

### 4. 管理画面（Admin専用）

- マイページから `role: 'admin'` ユーザーのみ「管理画面へ」ボタン表示
- 機能：公式お知らせ投稿（`isOfficial: true` 付与）、削除申請の承認/却下、コイン手動付与、ノベルティ管理

### 5. Firebase Storage 有効化

- Firebase コンソール → Storage → 「始める」（asia-northeast1）
- アバター画像アップロード機能を実装

### 6. GitHub リポジトリ作成・連携

- GitHubアカウント名を確定
- `package.json` の `homepage` を更新
- `git init` → push → `npm run deploy`

### 7. Firestore セキュリティルールを本番ルールに昇格

- `users` の `role`/`azCoins`/`createdAt` 改ざん防止
- `coinTransactions` は Admin のみ書き込み
- `threads` は作成者+Admin のみ更新可能 など

---

## 10. 未決定事項

- [ ] GitHubアカウント名（`package.json` の `homepage` URL に必要）
- [ ] コイン付与量の最終決定（管理者と要相談）
- [ ] スレッドカテゴリの日本語ラベル微調整（運用しながら判断）

---

## 変更履歴

| バージョン | 日付 | 内容 |
|-----------|------|------|
| v1 | 2026-04-24 | 初版作成（初回セッション終了） |
| v2 | 2026-04-24 | 環境構築完了。次回からClaude Codeで作業再開 |
| v3 | 2026-04-24 | Firebase Auth・プロフィール機能。Firestoreデータベース作成 |
| v4 | 2026-04-25 | 大型更新：①Firestoreセキュリティルール暫定本番化、②掲示板機能（一覧/作成/詳細/編集/削除申請）、③コメント・興味あり・参加申請、④マイページ参加履歴、⑤タグ機能（フィルタはボトムシート方式60vh固定）、⑥ヘッダー固定化、⑦メニュー順序変更、⑧spec.md v1.3 更新（雑談廃止・昇華フロー・ランク・管理画面の設計） |
