# ShareAZ 引き継ぎ書

**バージョン**: v6
**更新日**: 2026-04-26
**仕様書バージョン**: spec.md v1.3

---

## 1. アプリ概要

**アプリ名**: ShareAZ
**コンセプト**: 社員が得意スキルや趣味・関心をシェアし、共通の興味を持つ仲間とつながれる社内コミュニティSNS。AZコイン（ポイント）でノベルティと交換できる報酬システム付き。
**フォルダ**: `~/Documents/App/ShareAZ`
**仕様書**: `spec.md`（v1.3）
**デザイン**: `DESIGN.md`

### v5 → v6 の主要変化

- **管理画面が完全完成**：5タブすべて実装
  - ✅ イベント完了処理（参加者+10 / 主催者+30、writeBatch で原子的）
  - 🗑️ 削除申請の承認/却下（サブコレクション含む完全削除 + 理由付き却下）
  - 🪙 コイン手動付与（正負両対応 + 直近10件表示 + 全履歴モーダル）
  - 👥 ユーザー管理（名前/所属フィルタ + ロール変更 + 自己ロック防止）
- **coinTransactions コレクション稼働**：全コイン異動を記録
- **メンバーランクシステムが実際に動作**：イベント完了処理と連動
- **ブランドカラーをコーポレートカラーに変更**：オレンジ → ネイビー（`#495e9f`）/ レッド（`#bd3c40`）

---

## 2. ⏯ 次回再開ポイント

管理画面が完成したので、次フェーズに移ります。

**推奨次作業（優先度順）：**

1. **ショップ機能**（ノベルティ一覧 / コイン交換申請 / 申請履歴）
2. **Firebase Storage 有効化**（アバター画像アップロード）
3. **GitHub リポジトリ作成・連携**
4. **Firestore セキュリティルールの本格運用化**

---

## 3. 作業サマリー

### v5 までで完了済み（前回まで）

掲示板機能（一覧・作成・詳細・コメント・興味あり・参加申請・告知→イベント作成）、ホーム画面、マイページ、メンバー検索・ランクバッジ、管理画面入口・お知らせ投稿タブ、admin編集権限、プロフィールリアルタイム同期。

### v6 セッションで完了

| # | 作業内容 | 状態 |
|---|----------|------|
| 36 | 管理画面：イベント完了処理タブ（`AdminEventCompletionTab`） | ✅ 完了 |
| 37 | 管理画面：削除申請の承認/却下タブ（`AdminDeletionRequestsTab`） | ✅ 完了 |
| 38 | 管理画面：AZコイン手動付与タブ（`AdminCoinGrantTab` + `CoinHistoryModal`） | ✅ 完了 |
| 39 | 管理画面：ユーザー管理タブ（`AdminUsersTab`） | ✅ 完了 |
| —  | `coinTransactions/` コレクションが実際に稼働開始 | ✅ 完了 |
| —  | メンバーランクシステムがイベント完了処理と連動 | ✅ 完了 |
| 40 | ブランドカラー変更：オレンジ → コーポレートネイビー（`#495e9f`）＋レッド（`#bd3c40`）| ✅ 完了 |

### 未着手（次回以降）

| # | 作業内容 | 状態 |
|---|----------|------|
| 41 | ショップ機能（ノベルティ一覧・コイン交換申請・在庫管理・申請履歴） | ⏸ 次回最優先 |
| 42 | Firebase Storage 有効化（アバター画像） | ⏸ 未着手 |
| 43 | GitHub リポジトリ作成・連携 | ⏸ 未着手 |
| 44 | Firestore セキュリティルールを本格運用ルールに昇格 | ⏸ 未着手 |
| 45 | 将来仕様：イベント作成の管理者承認制 | ⏸ 将来 |
| 46 | 管理画面：ノベルティ管理・データ集計（フェーズ2） | ⏸ 将来 |

---

## 4. 確定済み事項（v5からの差分）

### ブランドカラー（確定）

| 役割 | カラー | 使用箇所 |
|------|--------|---------|
| Primary（ネイビー） | `#495e9f` | CTAボタン・選択中タブ・リンク・タグ文字 |
| Primary Light | `#eaedf5` | タグ背景・バッジ背景 |
| Secondary／Danger（レッド） | `#bd3c40` | 削除ボタン・危険操作・イベントカテゴリ色 |
| Secondary Light | `#fae8e9` | Dangerバッジ背景 |
| AZコイン（ゴールド） | `#f5c518` | コイン残高・コインアイコン（変更なし） |

App.jsx の色定数 `C` に一元管理。全コンポーネントが `C.accent` / `C.danger` 等で参照しているため、定数変更のみで全画面に反映済み。

### コイン付与量（確定）

| 付与条件 | 付与量 | 方法 |
|----------|--------|------|
| イベントに参加（完了時） | +10 | 自動（管理画面のイベント完了処理） |
| イベントを主催（完了時） | +30 | 自動（管理画面のイベント完了処理） |
| スキル・知識で貢献 | 任意（正負両対応） | admin 手動付与 |
| 初回プロフィール設定（タグ3つ以上） | +5 | 自動（未実装） |

### イベント完了処理の挙動（確定）

- 開催日時未設定のイベントも管理画面に表示（admin が判断）
- 取り消し機能はMVP対象外（誤りは Firestore コンソールで手動修正）
- 3セクション表示：🔴 開催済み（完了処理待ち）/ 📅 未来または日時未設定 / ✅ 完了済み

### 削除申請処理の挙動（確定）

- 承認：スレッド本体 + サブコレクション3種（comments / interested / participations）を完全削除
- 却下：申請ステータスを `rejected` に更新 + 却下理由をオプション入力
- 処理済み申請も「処理済み」セクションで一覧表示（直近50件）

### コイン付与タブの挙動（確定）

- 対象ユーザーをスクロール一覧から選択（名前検索可）
- 付与量は正負両対応（マイナス値でコイン減算も可能）
- 理由は自由入力（必須）
- 付与後：直近10件をインラインで表示
- 「全履歴を見る」ボタン → `CoinHistoryModal`（全件サブスクリプション）

### ユーザー管理タブの挙動（確定）

- 名前テキスト検索 + 所属先ドロップダウンフィルタ（ユーザーデータから動的生成）
- ロール変更（member ↔ admin）に確認ダイアログあり
- 自分自身のアカウントはドロップダウンが disabled（ロックアウト防止）

---

## 5. Firestore コレクション構成（v6 時点）

```
Firestore
├── users/                  ← ユーザープロフィール
│   └── {uid}/
│       ├── name, department, bio, avatarUrl, role, azCoins
│       ├── tags: string[]
│       ├── eventCount: number   ← 完了したイベントへの参加回数（管理画面で increment）
│       ├── hostCount: number    ← 完了したイベントの主催回数（管理画面で increment）
│       ├── favoriteUserIds: string[]
│       ├── createdAt, updatedAt
│
├── threads/                ← 告知・イベント
│   └── {threadId}/
│       ├── authorId, authorName, title, body, category, tags
│       ├── eventDate, capacity（イベントのみ）
│       ├── status（'open' | 'completed'）
│       ├── participantCount, commentCount, interestedCount
│       ├── promotedFrom（"announcement" or null）
│       ├── isOfficial（公式お知らせフラグ）
│       ├── comments/        ← サブコレクション
│       ├── interested/      ← サブコレクション
│       └── participations/  ← サブコレクション（{uid} ドキュメントを持つ）
│
├── deletionRequests/       ← スレッド削除申請
│   └── {requestId}/
│       ├── threadId, threadTitle, requesterId, requesterName
│       ├── reason（申請理由）
│       ├── status（'pending' | 'approved' | 'rejected'）
│       ├── rejectionReason（却下時のみ）
│       ├── processedBy, processedAt
│       └── createdAt
│
└── coinTransactions/       ← AZコイン異動履歴（v6で稼働開始）
    └── {auto-id}/
        ├── userId, amount（正負両対応）
        ├── reason（'イベント参加' | 'イベント主催' | admin入力テキスト）
        ├── grantedBy（adminのuid、自動付与は 'system'）
        └── createdAt
```

**未作成のコレクション**：`shopItems/`、`exchangeRequests/`、`eventCreationRequests/`（将来）

---

## 6. 画面構成（v6 時点）

### 実装済み

- ログイン画面
- ホーム画面（公式お知らせ + 新着の2セクション）
- 掲示板画面（タグフィルタ・FAB）
- 新規スレッド作成画面
- スレッド詳細画面（編集・削除申請・コメント・興味あり・参加申請・イベント作成・admin編集）
- メンバー画面（検索・タグフィルタ・お気に入りタブ・ランクバッジ）
- マイページ（プロフィール編集・ランクバッジ・参加履歴・管理画面入口・ログアウト）
- 管理画面（admin のみ、5タブすべて実装済み）

### スケルトン

- ショップ画面

---

## 7. 重要な実装メモ（v6で追加）

### イベント完了処理（AdminEventCompletionTab）

```js
// participations サブコレクションから参加者UID一覧を取得
const participationsSnap = await getDocs(
  collection(db, 'threads', thread.id, 'participations')
);
const participantIds = participationsSnap.docs.map(d => d.id);

const batch = writeBatch(db);

// スレッドを completed に更新
batch.update(doc(db, 'threads', thread.id), {
  status: 'completed',
  updatedAt: serverTimestamp()
});

// 参加者全員：+10コイン、eventCount+1
for (const pid of participantIds) {
  batch.update(doc(db, 'users', pid), {
    eventCount: increment(1),
    azCoins: increment(10)
  });
  batch.set(doc(collection(db, 'coinTransactions')), {
    userId: pid, amount: 10, reason: 'イベント参加',
    grantedBy: 'system', createdAt: serverTimestamp()
  });
}

// 主催者：+30コイン、hostCount+1（参加者と重複の場合は合算）
if (thread.authorId) {
  batch.update(doc(db, 'users', thread.authorId), {
    hostCount: increment(1),
    azCoins: increment(30)
  });
  batch.set(doc(collection(db, 'coinTransactions')), {
    userId: thread.authorId, amount: 30, reason: 'イベント主催',
    grantedBy: 'system', createdAt: serverTimestamp()
  });
}

await batch.commit();
```

**注意**：Firestore writeBatch は最大500オペレーション。参加者数が多い場合は将来的にバッチ分割が必要（現時点では実用範囲内と判断）。

### 削除申請の承認（AdminDeletionRequestsTab）

サブコレクション（comments / interested / participations）を先に全削除してからスレッド本体を削除。Firestore の500オペレーション制限に対応するため、500件ごとにバッチをコミットしてループ。

```js
const deleteSubcollection = async (threadId, subName) => {
  const snap = await getDocs(collection(db, 'threads', threadId, subName));
  let batch = writeBatch(db);
  let count = 0;
  for (const d of snap.docs) {
    batch.delete(d.ref);
    count++;
    if (count === 500) {
      await batch.commit();
      batch = writeBatch(db);
      count = 0;
    }
  }
  if (count > 0) await batch.commit();
};
```

### CoinHistoryModal（コイン全履歴モーダル）

ボトムシート形式で、指定ユーザーの `coinTransactions/` 全件を `orderBy('createdAt', 'desc')` で取得・表示。`limit()` なしの全件サブスクリプション。`CoinTransactionRow` コンポーネントで各行を描画。

### AdminUsersTab のフィルタ実装

所属先フィルタは独立したコレクションを持たず、購読済みのユーザーリストから動的に抽出：

```js
const departments = [...new Set(
  users.map(u => u.department).filter(Boolean)
)].sort();
```

### メンバーランクの判定ロジック（再掲）

```js
// getMemberRank(profile) 関数
// 👑 マスター : eventCount >= 15 かつ hostCount >= 3
// 🥇 ゴールド : eventCount >= 15
// 🥈 シルバー : eventCount >= 5
// 🥉 ブロンズ : それ以下（デフォルト）
```

v6 でイベント完了処理が実装されたため、`eventCount` / `hostCount` が実際に増加しランクが動くようになった。

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
│   ├── App.jsx           ← 全画面・状態管理（約4,700行）
│   ├── firebase.js
│   ├── index.js
│   └── index.css
├── .env, .env.example, .gitignore
├── firestore.rules
├── package.json
├── DESIGN.md
├── spec.md（v1.3）
├── ShareAZ_handover_v1.md ～ v5.md
└── ShareAZ_handover_v6.md ← このファイル
```

### App.jsx 内のコンポーネント構造（v6 時点）

```
App
├── BottomNav, Header
├── RankBadge（共通）
├── CoinTransactionRow（共通）
├── CoinHistoryModal
├── LoginScreen
├── HomeScreen ── SectionTitle, ThreadCard
├── MembersScreen ── MemberCard, TagFilterSheet
├── ThreadsScreen ── ThreadCard, FAB, TagFilterSheet
├── NewThreadScreen ── TagInput
├── ThreadDetailScreen ── TagInput（編集モード）
├── ShopScreen（スケルトン）
├── AdminScreen
│   ├── AdminAnnouncementTab
│   ├── AdminEventCompletionTab   ← v6 追加
│   ├── AdminDeletionRequestsTab  ← v6 追加
│   ├── AdminCoinGrantTab         ← v6 追加
│   └── AdminUsersTab             ← v6 追加
├── MyEventsSection
└── ProfileScreen ── TagInput, MyEventsSection, RankBadge
```

---

## 9. 既知の制約・MVP範囲外（v6時点）

| 項目 | 状況 | 対応予定 |
|------|------|---------|
| ショップ・コイン交換 | スケルトンのみ | **次回最優先** |
| Firebase Storage（アバター） | 未有効化 | 次フェーズ |
| GitHub連携 | 未着手 | 次フェーズ |
| 本番セキュリティルール | 暫定（認証ユーザーのみ） | 全機能完成後 |
| イベント完了取り消し機能 | MVP対象外（Firestoreコンソールで手動） | 将来 |
| 初回プロフィール設定+5コイン | 自動付与未実装 | 将来 |
| 将来：イベント作成の管理者承認制 | spec.md 9 にメモ済み | フェーズ2 |
| 管理画面：ノベルティ管理・集計 | 未着手 | フェーズ2 |
| writeBatch 500件超え対応（イベント完了） | 現実用範囲内なのでMVP対象外 | 将来 |

---

## 10. 次回やること（優先順位順）

### 1. 【最優先】ショップ機能の実装

**対象コレクション（新規作成）**：
- `shopItems/`：ノベルティ商品（name, description, price, stock, imageUrl）
- `exchangeRequests/`：交換申請（userId, itemId, status: pending/approved/rejected）

**画面・機能**：
- ショップ画面（ShopScreen）：商品一覧・在庫あり/なし表示・交換申請ボタン
- マイページ：申請履歴タブ
- 管理画面：ノベルティ管理タブ（在庫編集）+ 申請承認/却下タブ

### 2. Firebase Storage 有効化

- Firebase コンソールで Storage 有効化
- ProfileScreen のアバター画像アップロード機能実装

### 3. GitHub リポジトリ作成・連携

- `git init` → GitHub にプッシュ
- `.env` を gitignore していることを確認（済み）

### 4. Firestore セキュリティルールの本格運用化

- 現状：認証ユーザーは全コレクションに読み書き可能
- 目標：コレクションごとに適切な read/write 制限

---

## 11. 未決定事項

- [ ] GitHubアカウント名
- [ ] ショップのノベルティ商品ラインアップ（品目・価格・在庫数）

---

## 変更履歴

| バージョン | 日付 | 内容 |
|-----------|------|------|
| v1 | 2026-04-24 | 初版作成 |
| v2 | 2026-04-24 | 環境構築完了 |
| v3 | 2026-04-24 | Firebase Auth・プロフィール |
| v4 | 2026-04-25 | 掲示板機能（一覧/作成/詳細/編集/削除申請）、コメント、興味あり、参加申請、マイページ参加履歴、タグ機能、ボトムシート、ヘッダー統一 |
| v5 | 2026-04-25 | メンバー検索拡張、メンバーランク表示、管理画面入口・お知らせ投稿タブ、admin編集権限、profileリアルタイム同期、「昇華」→「作成」用語変更 |
| v6 | 2026-04-25 | 管理画面5タブ完全実装（イベント完了 / 削除申請 / コイン付与 / ユーザー管理）、coinTransactions稼働、メンバーランク実稼働 |
| v6.1 | 2026-04-26 | ブランドカラー変更（オレンジ → コーポレートネイビー `#495e9f` ＋ レッド `#bd3c40`）、DESIGN.md・spec.md 反映 |
