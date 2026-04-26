# ShareAZ 引き継ぎ書

**バージョン**: v5
**更新日**: 2026-04-25
**仕様書バージョン**: spec.md v1.3

---

## 1. アプリ概要

**アプリ名**: ShareAZ
**コンセプト**: 社員が得意スキルや趣味・関心をシェアし、共通の興味を持つ仲間とつながれる社内コミュニティSNS。AZコイン（ポイント）でノベルティと交換できる報酬システム付き。
**フォルダ**: `~/Documents/App/ShareAZ`
**仕様書**: `spec.md`（v1.3）
**デザイン**: `DESIGN.md`

### v4 → v5 の主要変化

- **メンバー機能**：検索画面・お気に入り・ランクバッジ表示が完成
- **管理画面（Admin）**：入口・タブ構造・お知らせ投稿タブが完成（残りのタブは段階実装中）
- **「昇華」→「作成」**にユーザー向け表現を変更（内部用語は `promotedFrom` のまま）
- **将来仕様メモ**：イベント作成は管理者承認制にする予定（`eventCreationRequests/` コレクションを新設予定）
- **profile のリアルタイム同期**：role 変更などが即座にUIに反映される
- **admin の編集権限**：他人のスレッドも編集可能に

---

## 2. ⏯ 次回再開ポイント

### 中断時に答える必要がある3つの質問

次回はここから再開してください：

> **B案 Step 3「イベント完了処理」の設計確認**

1. **コイン付与量**：spec.md 通り（参加+10 / 主催+30）でOK？
2. **イベント完了の判定対象**：開催日時が未設定のイベントはどうする？
   - A：未設定でも管理画面に表示（admin が判断）👈推奨
   - B：開催日時設定済みのみ表示
3. **完了処理の取り消し**：誤って完了処理した場合の取り消し機能は必要？
   - A：MVP では不要（誤りは Firestore コンソールで手動修正）👈推奨
   - B：実装する

→ 答えが出たら **管理画面の「✅ イベント完了」タブを実装** していきます。これが完成するとメンバーランクシステムが動き出します。

---

## 3. 作業サマリー

### v4 までで完了済み（前回まで）

掲示板機能（一覧・新規作成・詳細・コメント・興味あり・参加申請・告知→イベント作成）、ホーム画面、マイページ参加履歴、Firestore セキュリティルール暫定本番化、ヘッダー統一、タグフィルタ（ボトムシート）など。

### v5 セッションで完了

| # | 作業内容 | 状態 |
|---|----------|------|
| 27 | スレッド一覧カードに 💬 コメント数バッジ追加（両カテゴリ） | ✅ 完了 |
| 28 | 「昇華」→「作成」に用語統一（ボタン・モーダル・バッジ） | ✅ 完了 |
| 29 | spec.md に将来仕様メモ追記：イベント作成の管理者承認制 | ✅ 完了 |
| 30 | メンバー検索画面の完全実装（名前検索・タグフィルタ・お気に入り・タブ切替） | ✅ 完了 |
| 31 | メンバーランク表示機能（🥉🥈🥇👑、ProfileScreen + MemberCard にバッジ） | ✅ 完了 |
| 32 | プロフィールのリアルタイム同期（role変更などを即時反映） | ✅ 完了 |
| 33 | 管理画面（Admin専用）の入口・タブ構造（5タブ） | ✅ 完了 |
| 34 | お知らせ投稿タブ：新規投稿フォーム + 既存スレッドの公式化トグル | ✅ 完了 |
| 35 | admin の編集権限拡張（他人のスレッドも編集可能） | ✅ 完了 |

### 未着手（次回以降）

| # | 作業内容 | 状態 |
|---|----------|------|
| 36 | 管理画面：イベント完了処理タブ（参加者+10/主催者+30、ランク自動連動） | ⏸ **次回最優先** |
| 37 | 管理画面：削除申請の承認/却下タブ | ⏸ 未着手 |
| 38 | 管理画面：AZコイン手動付与タブ | ⏸ 未着手 |
| 39 | 管理画面：ユーザー管理タブ（ロール変更・アカウント停止） | ⏸ 未着手 |
| 40 | 管理画面：ノベルティ管理・データ集計（フェーズ2扱い） | ⏸ 未着手 |
| 41 | ショップ機能（AZコイン交換） | ⏸ 未着手 |
| 42 | Firebase Storage 有効化（アバター画像） | ⏸ 未着手 |
| 43 | GitHub リポジトリ作成・連携 | ⏸ 未着手 |
| 44 | Firestore セキュリティルールを本格運用ルールに昇格 | ⏸ 未着手 |
| 45 | 将来仕様：イベント作成の管理者承認制 | ⏸ 将来 |

---

## 4. 確定済み事項（v4からの差分）

### Firebase プロジェクト情報

| 項目 | 内容 |
|------|------|
| プロジェクトID | `shareaz-fbfea` |
| 自分の admin 権限 | 設定済み（Firestoreコンソールで `users/{自分のuid}.role` を `admin` に変更） |

### コイン付与の仮の方針（要再確認）

spec.md の表記：

| 付与条件 | 付与量 |
|----------|--------|
| イベントに参加（完了時） | +10 |
| イベントを主催（完了時） | +30 |
| スキル・知識で貢献 | +20（admin手動） |
| 初回プロフィール設定（タグ3つ以上） | +5（自動 / 未実装） |

→ 次回の質問1で再確認予定。

---

## 5. Firestore コレクション構成（v5 時点）

```
Firestore
├── users/                  ← ユーザープロフィール
│   └── {uid}/
│       ├── name, department, bio, avatarUrl, role, azCoins
│       ├── tags: string[]
│       ├── eventCount: number   ← 完了したイベントへの参加回数（管理画面で増分予定）
│       ├── hostCount: number    ← 完了したイベントの主催回数（管理画面で増分予定）
│       ├── favoriteUserIds: string[]   ← お気に入りメンバーのuid配列
│       ├── createdAt, updatedAt
│
├── threads/                ← 告知・イベント
│   └── {threadId}/
│       ├── authorId, authorName, title, body, category, tags
│       ├── eventDate, capacity（イベントのみ）
│       ├── status, participantCount, commentCount, interestedCount
│       ├── promotedFrom（"announcement" or null）
│       ├── isOfficial（公式お知らせフラグ）
│       ├── comments/        ← サブコレクション
│       ├── interested/      ← サブコレクション
│       └── participations/  ← サブコレクション
│
└── deletionRequests/       ← スレッド削除申請（管理画面で承認予定）
```

**未作成のコレクション**：`tags/`、`coinTransactions/`、`shopItems/`、`exchangeRequests/`、`eventCreationRequests/`（将来）

---

## 6. 画面構成（v5 時点）

### 実装済み

- ログイン画面
- ホーム画面（公式お知らせ + 新着の2セクション）
- 掲示板画面（タグフィルタ・FAB）
- 新規スレッド作成画面
- スレッド詳細画面（編集・削除申請・コメント・興味あり・参加申請・イベント作成・admin編集）
- メンバー画面（検索・タグフィルタ・お気に入りタブ・ランクバッジ）
- マイページ（プロフィール編集・ランクバッジ・参加履歴・管理画面入口・ログアウト）
- 管理画面入口（admin のみ）
- 管理画面：📢 お知らせタブ（新規投稿・公式化トグル）

### 部分実装

- 管理画面：他4タブはプレースホルダー（イベント完了 / 削除申請 / コイン付与 / ユーザー管理）

### スケルトン

- ショップ画面

---

## 7. 重要な実装メモ（v4からの追加分）

### メンバーランク判定（実装済み・カウンタは未連動）

```js
// getMemberRank(profile) 関数で判定
// マスター : eventCount >= 15 かつ hostCount >= 3
// ゴールド : eventCount >= 15
// シルバー : eventCount >= 5
// ブロンズ : それ以下（デフォルト）
```

**現状**：`eventCount`/`hostCount` が増える機能（管理画面のイベント完了処理）が未実装のため、全ユーザーがブロンズ表示。
**テスト方法**：Firestore コンソールで該当 user の `eventCount` を直接編集すると、UIに即時反映される（profile が onSnapshot で同期されているため）。

### admin 権限判定の場所

- **マイページ**：`profile.role === 'admin'` で「⚙️ 管理画面を開く」ボタン表示
- **AdminScreen**：二重ガードあり。`profile?.role !== 'admin'` で「🔒 このページは管理者専用です」表示
- **ThreadDetailScreen**：`canEdit = isAuthor || isAdmin`（admin は他人のスレッドを編集可能）

### お知らせ投稿の実装

- 管理画面のお知らせタブで投稿 → 通常の `threads/` に保存（`category: 'announcement'`、`isOfficial: true`）
- 既存スレッドの「公式化」トグル → `isOfficial` フィールドの true/false 切替
- ホーム画面では `isOfficial: true` のスレッドが「📢 公式お知らせ」セクションに上に表示される

### profile のリアルタイム同期

`App` コンポーネントに2つの useEffect：
1. `onAuthStateChanged` でログイン/ログアウト検知 + 初回 `loadProfile()`
2. `user` が確定したら `onSnapshot(doc(db, 'users', user.uid))` で以後ずっと同期

これにより role 変更や eventCount 変更が即座にUIに反映される。

---

## 8. 開発環境

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
├── src/
│   ├── App.jsx           ← 全画面・状態管理（約2,900行）
│   ├── firebase.js
│   ├── index.js
│   └── index.css
├── .env, .env.example, .gitignore
├── firestore.rules
├── package.json
├── DESIGN.md
├── spec.md（v1.3）
├── ShareAZ_handover_v1.md
├── ShareAZ_handover_v2.md
├── ShareAZ_handover_v3.md
├── ShareAZ_handover_v4.md
└── ShareAZ_handover_v5.md ← このファイル
```

### App.jsx 内のコンポーネント構造（参考）

```
App
├── BottomNav, Header
├── RankBadge（共通）
├── LoginScreen
├── HomeScreen ── SectionTitle, ThreadCard
├── MembersScreen ── MemberCard, TagFilterSheet
├── ThreadsScreen ── ThreadCard, FAB, TagFilterSheet
├── NewThreadScreen ── TagInput
├── ThreadDetailScreen ── TagInput（編集モード）
├── ShopScreen（スケルトン）
├── AdminScreen ── AdminAnnouncementTab（実装済）+ 4タブ（placeholder）
├── MyEventsSection
└── ProfileScreen ── TagInput, MyEventsSection, RankBadge
```

---

## 9. 既知の制約・MVP範囲外（v5時点）

| 項目 | 状況 | 対応予定 |
|------|------|---------|
| イベント完了処理 | 未実装 | **次回 Step 3** |
| メンバーランク（カウント連動） | 表示のみ動く / カウントは管理画面のイベント完了処理待ち | Step 3完了で動く |
| 削除申請の承認/却下 | 申請まで実装、承認画面は未実装 | Step 4 |
| AZコイン手動付与 | 未実装 | Step 5 |
| ユーザー管理（ロール変更等） | Firestoreコンソールで手動 | Step 6 |
| ショップ・コイン交換 | スケルトン | フェーズ2 |
| 将来：イベント作成の管理者承認制 | spec.md 9 にメモ済み | フェーズ2 |
| Firebase Storage（アバター） | 未有効化 | 未着手 |
| GitHub連携 | 未着手 | 未着手 |
| 本番セキュリティルール | 暫定（認証ユーザーのみ） | 全機能完成後 |

---

## 10. 次回やること（優先順位順）

### 1. 【最優先】管理画面：イベント完了処理タブ

- まず冒頭の3つの質問に回答
- 開催済みイベント一覧 + 完了ボタン
- 完了処理時：`status: 'completed'`、参加者+10コイン+eventCount、主催者+30コイン+hostCount
- `coinTransactions/` に履歴記録

### 2. 管理画面：削除申請の承認/却下タブ

- `deletionRequests/` を一覧表示
- 承認 → スレッド削除 + サブコレクション削除 + 申請ステータス更新
- 却下 → 申請ステータスのみ更新

### 3. 管理画面：AZコイン手動付与タブ

- ユーザー選択 + コイン量 + 理由入力
- `users.azCoins` 増分 + `coinTransactions/` に記録

### 4. 管理画面：ユーザー管理タブ

- ロール変更（member ↔ admin）
- アカウント停止（必要なら）

### 5. ショップ機能の実装

### 6. Firebase Storage、GitHub連携、本番セキュリティルール

---

## 11. 未決定事項

- [ ] GitHubアカウント名
- [ ] ショップのノベルティ商品ラインアップ
- [ ] イベント完了時のコイン付与量の最終確認（次回質問）

---

## 変更履歴

| バージョン | 日付 | 内容 |
|-----------|------|------|
| v1 | 2026-04-24 | 初版作成 |
| v2 | 2026-04-24 | 環境構築完了 |
| v3 | 2026-04-24 | Firebase Auth・プロフィール |
| v4 | 2026-04-25 | 掲示板機能（一覧/作成/詳細/編集/削除申請）、コメント、興味あり、参加申請、マイページ参加履歴、タグ機能、ボトムシート、ヘッダー統一 |
| v5 | 2026-04-25 | メンバー検索拡張、メンバーランク表示、管理画面入口・お知らせ投稿タブ、admin編集権限、profileリアルタイム同期、「昇華」→「作成」用語変更、将来仕様メモ追加 |
