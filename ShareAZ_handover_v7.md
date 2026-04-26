# ShareAZ 引き継ぎ書

**バージョン**: v7
**更新日**: 2026-04-26
**仕様書バージョン**: spec.md v1.4

---

## 1. アプリ概要

**アプリ名**: ShareAZ
**コンセプト**: 社員が得意スキルや趣味・関心をシェアし、共通の興味を持つ仲間とつながれる社内コミュニティSNS。AZコイン（ポイント）でノベルティと交換できる報酬システム付き。
**フォルダ**: `~/Documents/App/ShareAZ`
**仕様書**: `spec.md`（v1.4）
**デザイン**: `DESIGN.md`

### v6 → v7 の主要変化

- **ポイント交換機能（旧称：ショップ）が完全動作**：商品登録 → 交換申請 → 承認/却下まで E2E で動作確認済み
  - 🛍️ 管理画面：ノベルティ管理タブ（商品の追加・編集・公開トグル・削除）
  - 🎁 管理画面：交換申請タブ（承認 / 却下＋自動返金＋在庫戻し）
  - ShopScreen 再実装（商品カード一覧 + 確認モーダル + 申請処理）
  - マイページ：交換申請履歴セクション（`MyExchangeSection`）
- **新規コレクション稼働**：`shopItems/` `exchangeRequests/`
- **タブ名変更**：ボトムナビ「ショップ」→「ポイント交換」（画面ヘッダーも統一）
- **管理画面タブUX改善**：横スクロール 5タブ → 4列×2行グリッド（7タブ全て一望）
- **インデックスエラー対策**：`where + orderBy` の代わりにクライアント側ソートで複合インデックスを回避

---

## 2. ⏯ 次回再開ポイント

ポイント交換機能が完成したので、次は画像対応に進みます。

**推奨次作業（優先度順）：**

1. **Firebase Storage 有効化**（次回最優先・ユーザー指定）
   - プロフィールアバターのアップロード
   - 同時にショップ商品画像もアップロード対応に切替（現在は外部URL手入力）
2. GitHub リポジトリ作成・連携
3. Firestore セキュリティルールの本格運用化

---

## 3. 作業サマリー

### v6 までで完了済み（前回まで）

掲示板機能（一覧・作成・詳細・コメント・興味あり・参加申請・告知→イベント作成）、ホーム画面、マイページ、メンバー検索・ランクバッジ、管理画面 5タブ完全実装、coinTransactions 稼働、ブランドカラー変更（コーポレートネイビー）。

### v7 セッションで完了

| # | 作業内容 | 状態 |
|---|----------|------|
| —  | ボトムナビ「ショップ」→「ポイント交換」リネーム（画面ヘッダーも） | ✅ 完了 |
| 41 | 管理画面：ノベルティ管理タブ（`AdminShopItemsTab`） | ✅ 完了 |
| 42 | 管理画面：交換申請タブ（`AdminExchangeRequestsTab`） | ✅ 完了 |
| 43 | ShopScreen 再実装（一覧 + 確認モーダル + 申請処理） | ✅ 完了 |
| 44 | `ExchangeConfirmModal`（申請前の注意モーダル） | ✅ 完了 |
| 45 | マイページ申請履歴セクション（`MyExchangeSection`） | ✅ 完了 |
| —  | `shopItems/` `exchangeRequests/` コレクション稼働開始 | ✅ 完了 |
| —  | インデックスエラー修正（クライアント側ソートに変更） | ✅ 完了 |
| —  | 管理画面タブのUX改善（横スクロール → 4列×2行グリッド） | ✅ 完了 |

### 未着手（次回以降）

| # | 作業内容 | 状態 |
|---|----------|------|
| 46 | Firebase Storage 有効化（アバター画像 + 商品画像） | ⏸ 次回最優先 |
| 47 | GitHub リポジトリ作成・連携 | ⏸ 未着手 |
| 48 | Firestore セキュリティルールを本格運用ルールに昇格 | ⏸ 未着手 |
| 49 | 将来仕様：イベント作成の管理者承認制 | ⏸ 将来 |
| 50 | 管理画面：データ集計タブ（フェーズ2） | ⏸ 将来 |

---

## 4. 確定済み事項（v6からの差分）

### ポイント交換機能の挙動（確定）

| 項目 | 仕様 |
|------|------|
| コイン・在庫の減算タイミング | 申請時に即減算（writeBatch でアトミック） |
| 申請取り消し | ユーザー側からは不可（申請前に確認モーダルで注意喚起） |
| 却下処理 | 管理者却下のみで返金 + 在庫戻し（無制限商品 stock=-1 は戻し不要） |
| 商品画像 | 当面は外部URL手入力（Firebase Storage 有効化後に切替予定） |
| 在庫無制限 | `stock = -1` で表現、UI上は「在庫: ∞」表示 |
| 商品の非公開 | `isActive: false` でユーザー一覧から除外（管理画面では引き続き編集可能） |
| 商品削除時の挙動 | 既存の交換申請レコードは残る（`itemName/itemImageUrl/coinCost` を非正規化保持しているため表示は崩れない） |

### 申請時のアトミック処理（writeBatch）

1. `exchangeRequests/{auto-id}` 新規作成（`status: 'pending'`）
2. `users/{uid}.azCoins` を `increment(-coinCost)`
3. `shopItems/{itemId}.stock` を `increment(-1)`（無制限商品はスキップ）
4. `coinTransactions/{auto-id}` に `amount: -coinCost, reason: '🛍️「商品名」を交換申請'` を記録

### 却下時のアトミック処理（writeBatch）

1. `exchangeRequests/{id}` を `status: 'rejected', rejectionReason, processedBy, processedAt` に更新
2. `users/{uid}.azCoins` を `increment(+coinCost)`
3. `shopItems/{itemId}.stock` を `increment(+1)`（無制限商品はスキップ）
4. `coinTransactions/{auto-id}` に `amount: +coinCost, reason: '🛍️「商品名」交換却下による返金'` を記録

### 管理画面タブのUI（確定）

- 4列×自動折り返しグリッド（現在 7タブ → 上段4 / 下段3）
- 各タブはアイコン上＋ラベル下の縦組み（コンパクト表示・`minHeight: 52`）
- 横スクロール廃止 → モバイル幅（max 430px）で一望できる

---

## 5. Firestore コレクション構成（v7 時点）

```
Firestore
├── users/                  ← ユーザープロフィール
│   └── {uid}/
│       ├── name, department, bio, avatarUrl, role, azCoins
│       ├── tags: string[]
│       ├── eventCount, hostCount
│       ├── favoriteUserIds: string[]
│       └── createdAt, updatedAt
│
├── threads/                ← 告知・イベント
│   └── {threadId}/
│       ├── authorId, authorName, title, body, category, tags
│       ├── eventDate, capacity（イベントのみ）
│       ├── status（'open' | 'completed'）
│       ├── participantCount, commentCount, interestedCount
│       ├── promotedFrom, isOfficial
│       └── comments/、interested/、participations/  ← サブコレクション
│
├── deletionRequests/       ← スレッド削除申請
│   └── {requestId}/
│       ├── threadId, threadTitle, requesterId, requesterName
│       ├── reason, status('pending'|'approved'|'rejected')
│       ├── rejectionReason, processedBy, processedAt
│       └── createdAt
│
├── coinTransactions/       ← AZコイン異動履歴
│   └── {auto-id}/
│       ├── userId, userName, amount（正負両対応）
│       ├── reason（'イベント参加' | 'イベント主催' | '🛍️「…」を交換申請' | '🛍️「…」交換却下による返金' | admin入力）
│       ├── grantedBy（adminのuid / 'system'）
│       ├── relatedRequestId（交換申請関連のときのみ）
│       └── createdAt
│
├── shopItems/              ← ノベルティ商品（v7 で稼働開始）
│   └── {auto-id}/
│       ├── name: string
│       ├── description: string
│       ├── imageUrl: string  ← 当面は外部URL（Storage 有効化後に切替予定）
│       ├── coinCost: number  ← 必要コイン数（1以上の整数）
│       ├── stock: number     ← -1 = 無制限 / 0 以上 = 残数
│       ├── isActive: boolean ← false にするとユーザー側非表示
│       └── createdAt, updatedAt
│
└── exchangeRequests/       ← 交換申請（v7 で稼働開始）
    └── {auto-id}/
        ├── userId, userName       ← 申請者（非正規化）
        ├── itemId, itemName, itemImageUrl  ← 商品スナップショット
        ├── coinCost: number       ← 申請時の価格スナップショット
        ├── status: 'pending' | 'approved' | 'rejected'
        ├── rejectionReason: string ← 却下時のみ
        ├── processedBy, processedAt
        └── createdAt
```

**未作成のコレクション**：`eventCreationRequests/`（フェーズ2）

---

## 6. 画面構成（v7 時点）

### 実装済み

- ログイン画面
- ホーム画面（公式お知らせ + 新着の2セクション）
- 掲示板画面（タグフィルタ・FAB）
- 新規スレッド作成画面
- スレッド詳細画面（編集・削除申請・コメント・興味あり・参加申請・イベント作成・admin編集）
- メンバー画面（検索・タグフィルタ・お気に入りタブ・ランクバッジ）
- マイページ（プロフィール編集・ランクバッジ・参加履歴・**交換申請履歴** ← v7 追加・管理画面入口・ログアウト）
- **ポイント交換画面（ShopScreen）** ← v7 で本実装（旧スケルトン）
- 管理画面（admin のみ、**7タブすべて実装済み** ← v7 で2タブ追加）

### スケルトン

なし（v7 で全画面実装完了）

---

## 7. 重要な実装メモ（v7で追加）

### ポイント交換の申請処理（ShopScreen）

```js
// 1. 最新状態を再取得して二重チェック
const itemSnap = await getDoc(itemRef);
if (!itemSnap.exists() || itemSnap.data().isActive === false) throw new Error('交換不可');
const latest = itemSnap.data();
if ((latest.stock ?? 0) === 0) throw new Error('在庫切れ');
const userSnap = await getDoc(userRef);
if ((userSnap.data()?.azCoins || 0) < latest.coinCost) throw new Error('コイン不足');

// 2. writeBatch でアトミックに反映
const batch = writeBatch(db);
const reqRef = doc(collection(db, 'exchangeRequests'));
batch.set(reqRef, {
  userId, userName, itemId, itemName, itemImageUrl,
  coinCost: latest.coinCost, status: 'pending', createdAt: serverTimestamp()
});
batch.update(userRef, { azCoins: increment(-latest.coinCost) });
if ((latest.stock ?? 0) > 0) {
  batch.update(itemRef, { stock: increment(-1) });
}
batch.set(doc(collection(db, 'coinTransactions')), {
  userId, userName, amount: -latest.coinCost,
  reason: `🛍️「${latest.name}」を交換申請`,
  grantedBy: 'system', relatedRequestId: reqRef.id, createdAt: serverTimestamp()
});
await batch.commit();
```

**race condition について**：getDoc + writeBatch は厳密なトランザクションではないため、ごく稀に在庫やコインのオーバーランが起こり得る。MVP規模（〜50名）では実用範囲として許容、必要なら `runTransaction` への移行で対応。

### 却下時の返金（AdminExchangeRequestsTab）

```js
// 在庫戻しの判定：商品が現存し、stock != -1 のとき +1
let restoreStock = false;
const itemSnap = await getDoc(doc(db, 'shopItems', req.itemId));
if (itemSnap.exists() && (itemSnap.data().stock ?? -1) >= 0) restoreStock = true;

const batch = writeBatch(db);
batch.update(doc(db, 'exchangeRequests', req.id), {
  status: 'rejected', rejectionReason, processedBy: user.uid, processedAt: serverTimestamp(),
});
batch.update(doc(db, 'users', req.userId), { azCoins: increment(req.coinCost) });
if (restoreStock) batch.update(doc(db, 'shopItems', req.itemId), { stock: increment(1) });
batch.set(doc(collection(db, 'coinTransactions')), {
  userId: req.userId, userName: req.userName, amount: req.coinCost,
  reason: `🛍️「${req.itemName}」交換却下による返金`,
  grantedBy: user.uid, relatedRequestId: req.id, createdAt: serverTimestamp(),
});
await batch.commit();
```

### Firestore 複合インデックス回避（v7で確立したパターン）

`where + orderBy` の組み合わせは複合インデックスが必要。MVP規模では where のみで取得し、クライアント側で sort するパターンを採用：

```js
const q = query(collection(db, 'exchangeRequests'), where('userId', '==', user.uid));
return onSnapshot(q, snap => {
  const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  list.sort((a, b) => {
    const ta = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
    const tb = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
    return tb - ta;
  });
  setRequests(list);
});
```

`MyExchangeSection` で採用。`AdminExchangeRequestsTab` も where なし全件購読 + クライアント側 filter + sort なので同方針。

### 管理画面タブのレイアウト

```jsx
// 4列固定グリッド・自動折り返し（タブが7つでも8つでも対応）
<div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, ... }}>
  {ADMIN_TABS.map(tab => (
    <button style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
      minHeight: 52,
      ...
    }}>
      <span style={{ fontSize: 18, lineHeight: 1 }}>{tab.icon}</span>
      <span>{tab.label}</span>
    </button>
  ))}
</div>
```

### 画像表示のフォールバック（ShopScreen / AdminShopItemsTab）

外部URL読み込み失敗時のフォールバック：

```jsx
<div style={{ position: 'relative' }}>
  <span style={{ position: 'absolute', zIndex: 0 }}>🛍️</span>
  {item.imageUrl && (
    <img src={item.imageUrl} alt={item.name}
      style={{ ..., position: 'relative', zIndex: 1 }}
      onError={e => { e.target.style.display = 'none'; }}
    />
  )}
</div>
```

絵文字を背面に固定で配置し、読み込み失敗時は img を非表示にして絵文字を見えるようにしている。

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
│   ├── App.jsx           ← 全画面・状態管理（約6,640行）
│   ├── firebase.js
│   ├── index.js
│   └── index.css
├── .env, .env.example, .gitignore
├── firestore.rules
├── package.json
├── DESIGN.md
├── spec.md（v1.4）
├── ShareAZ_handover_v1.md ～ v6.md
└── ShareAZ_handover_v7.md ← このファイル
```

### App.jsx 内のコンポーネント構造（v7 時点）

```
App
├── BottomNav, Header
├── RankBadge（共通）
├── CoinTransactionRow, CoinHistoryModal
├── ExchangeConfirmModal              ← v7 追加
├── LoginScreen
├── HomeScreen ── SectionTitle, ThreadCard
├── MembersScreen ── MemberCard, TagFilterSheet
├── ThreadsScreen ── ThreadCard, FAB, TagFilterSheet
├── NewThreadScreen ── TagInput
├── ThreadDetailScreen ── TagInput
├── ShopScreen ── ExchangeConfirmModal ← v7 で本実装
├── AdminScreen
│   ├── AdminAnnouncementTab
│   ├── AdminEventCompletionTab
│   ├── AdminDeletionRequestsTab
│   ├── AdminCoinGrantTab
│   ├── AdminUsersTab
│   ├── AdminShopItemsTab          ← v7 追加
│   └── AdminExchangeRequestsTab   ← v7 追加
├── MyEventsSection
├── MyExchangeSection              ← v7 追加
└── ProfileScreen ── TagInput, MyEventsSection, MyExchangeSection, RankBadge
```

---

## 9. 既知の制約・MVP範囲外（v7時点）

| 項目 | 状況 | 対応予定 |
|------|------|---------|
| Firebase Storage（アバター・商品画像） | 未有効化（外部URL手入力） | **次回最優先** |
| GitHub連携 | 未着手 | 次フェーズ |
| 本番セキュリティルール | 暫定（認証ユーザーのみ） | 全機能完成後 |
| イベント完了取り消し機能 | MVP対象外（Firestoreコンソール手動） | 将来 |
| 初回プロフィール設定+5コイン | 自動付与未実装 | 将来 |
| 交換申請のユーザー側取り消し | 不可（仕様確定） | 仕様変更不要 |
| writeBatch race condition（在庫超過） | MVP規模では許容 | 必要なら runTransaction 化 |
| 将来：イベント作成の管理者承認制 | spec.md 9 にメモ済み | フェーズ2 |
| 管理画面：データ集計タブ | 未着手 | フェーズ2 |

---

## 10. 次回やること（優先順位順）

### 1. 【最優先】Firebase Storage 有効化

- Firebase コンソールで Storage を有効化
- ProfileScreen のアバター画像アップロード機能を実装
- 同時に AdminShopItemsTab / ShopScreen の商品画像も Storage アップロードに切替（現在は外部URL手入力フィールド）
- Storage Security Rules の設定

### 2. GitHub リポジトリ作成・連携

- `git init` → GitHub にプッシュ
- `.env` を gitignore していることを再確認（済み）
- GitHub Pages デプロイ設定（`npm run deploy`）

### 3. Firestore セキュリティルールの本格運用化

- 現状：認証ユーザーは全コレクションに読み書き可能（暫定）
- 目標：コレクションごとに適切な read/write 制限（spec.md セキュリティルール方針）
- 特に `coinTransactions/`, `exchangeRequests/`, `shopItems/`, `users/` は要厳格化
- Admin判定は `request.auth.token.role == 'admin'`（カスタムクレーム）か `users/{uid}.role` 参照のいずれか

---

## 11. 未決定事項

- [ ] GitHubアカウント名
- [ ] ショップのノベルティ商品ラインアップ（品目・価格・在庫数）
- [ ] アバター・商品画像のサイズ制限・許可拡張子（Storage 設計時に決定）

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
| v7 | 2026-04-26 | ポイント交換機能完全実装（`shopItems/` `exchangeRequests/` 稼働、ShopScreen本実装、`AdminShopItemsTab` `AdminExchangeRequestsTab` 追加、`MyExchangeSection` 追加、`ExchangeConfirmModal` 追加）、ボトムナビ「ショップ」→「ポイント交換」リネーム、管理画面タブUX改善（横スクロール → 4列×2行グリッド）、Firestore複合インデックス回避パターン確立 |
