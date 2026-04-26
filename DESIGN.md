# DESIGN.md — ShareAZ デザインシステム

> このファイルはAIエージェントが正確な日本語UIを生成するためのデザイン仕様書です。
> クックパッドのデザインシステムをベースに、ShareAZ向けにカスタマイズしています。

---

## 1. Visual Theme & Atmosphere

- **デザイン方針**: 温かみがあり、親しみやすい社内コミュニティSNS。社員同士のつながりを後押しする明るく活発な雰囲気
- **密度**: SNSメディア型。プロフィールカード・イベントカードの一覧と詳細を行き来する構成
- **キーワード**: 温かみ、つながり、親しみやすい、活発、コミュニティ
- **カテゴリ**: 社内SNS / コミュニティ / イベント

---

## 2. Color Palette & Roles

### Primary（ブランドカラー：コーポレートカラー）

- **Corporate Navy** (`#495e9f`): メインブランドカラー。CTAボタン・ロゴ・選択中タブ・リンクに使用
- **Corporate Navy Light** (`#eaedf5`): タグ背景・バッジ・選択中ハイライトなど薄いアクセント
- **Corporate Red** (`#bd3c40`): セカンダリブランドカラー。重要な強調・危険操作（Danger と兼用）
- **Corporate Red Light** (`#fae8e9`): レッド系バッジ背景

### Coin（AZコイン専用カラー）

- **Coin Gold** (`#f5c518`): AZコイン残高・コインアイコンの表示に使用
- **Coin Gold Light** (`#fffde7`): コイン関連の背景・カード

### Semantic（意味的な色）

- **Danger** (`#bd3c40`): エラー、削除、危険な操作（コーポレートレッドと統合）
- **Warning** (`#ff9800`): 警告、注意喚起
- **Success** (`#4caf50`): 成功、完了、参加済み

### Neutral（ニュートラル）

- **Text Primary** (`#0f0f0f`): 本文テキスト。ほぼ黒
- **Text Secondary** (`#757575`): 補足テキスト、ラベル、日時
- **Text Disabled** (`#bdbdbd`): 無効状態のテキスト
- **Border** (`#e0e0e0`): 区切り線、入力欄の枠
- **Background** (`#f8f6f2`): ページ背景。温かみのあるオフホワイト
- **Surface** (`#ffffff`): カード・モーダル等の面

### コード定数（React実装時に使用）

```javascript
const C = {
  // ブランドカラー（コーポレートカラー）
  accent:       '#495e9f',  // ネイビー
  accentLight:  '#eaedf5',  // 薄ネイビー

  // AZコイン
  coin:         '#f5c518',
  coinLight:    '#fffde7',

  // ステータス
  success:      '#4caf50',
  successLight: '#e8f5e9',
  warning:      '#ff9800',
  warningLight: '#fff3e0',
  danger:       '#bd3c40',  // コーポレートレッド
  dangerLight:  '#fae8e9',

  // テキスト
  text:         '#0f0f0f',
  textSub:      '#757575',
  textMuted:    '#bdbdbd',

  // 背景・ボーダー
  bg:           '#f8f6f2',
  card:         '#ffffff',
  border:       '#e0e0e0',

  // シャドウ
  shadow:       '0 1px 4px rgba(0,0,0,0.08)',
  shadowMd:     '0 4px 16px rgba(0,0,0,0.12)',
}
```

---

## 3. Typography Rules

### 3.1 和文フォント

- **ゴシック体**: noto-sans（Adobe Fonts 版 Noto Sans）
- **明朝体**: 使用なし

### 3.2 欧文フォント

- **サンセリフ**: system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial
- **セリフ**: 使用なし

### 3.3 font-family 指定

```css
font-family: noto-sans, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, arial, sans-serif;
```

### 3.4 文字サイズ・ウェイト階層

| Role | Size | Weight | Line Height | Letter Spacing | 使用箇所 |
|------|------|--------|-------------|----------------|---------|
| Heading 1 | 18px | 600 | 28px | -0.4px | 画面タイトル、セクション見出し |
| Heading 2 | 16px | 600 | 24px | -0.4px | カードタイトル、サブ見出し |
| Body | 16px | 400 | 24px | -0.4px | 本文、自己紹介文 |
| Label | 14px | 600 | 20px | -0.4px | ボタン、ナビゲーション、タグ |
| Caption | 12px | 400 | 16px | -0.4px | 日時、補足テキスト、コイン枚数 |

### 3.5 行間・字間

- **本文の行間**: 1.5（24px / 16px）
- **見出しの行間**: 1.5〜1.556
- **字間（全体）**: letter-spacing: -0.4px（詰める方向で統一）

---

## 4. Component Stylings

### Buttons

**Primary（メインアクション）**
- Background: `#495e9f`（コーポレートネイビー）
- Text: `#ffffff`
- Padding: 8px 24px
- Border Radius: 8px
- Font Size: 14px
- Font Weight: 600
- 使用例: 参加申請、スレッド投稿、交換申請

**Secondary（サブアクション）**
- Background: `transparent`
- Text: `#0f0f0f`
- Border: 1px solid `#e0e0e0`
- Padding: 8px 24px
- Border Radius: 8px
- 使用例: キャンセル、戻る

**Disabled（無効）**
- Background: `#e0e0e0`
- Text: `#bdbdbd`
- 使用例: コイン不足時の交換ボタン

**Danger（危険な操作）**
- Background: `#bd3c40`（コーポレートレッド）
- Text: `#ffffff`
- 使用例: 削除ボタン

### Inputs

- Background: `#ffffff`
- Border: 1px solid `#e0e0e0`
- Border (focus): 1px solid `#495e9f`
- Border Radius: 8px
- Padding: 8px 12px
- Font Size: 16px
- Height: 40px

### Cards

**通常カード（プロフィール・イベント）**
- Background: `#ffffff`
- Border: 1px solid `#e0e0e0`
- Border Radius: 12px
- Padding: 16px
- Shadow: `0 1px 3px rgba(0,0,0,0.08)`

**コインカード（AZコイン残高表示）**
- Background: `#fffde7`
- Border: 1px solid `#f5c518`
- Border Radius: 12px
- Padding: 16px

### Tags（スキル・趣味タグ）

- Background: `#eaedf5`（薄ネイビー）
- Text: `#495e9f`（ネイビー）
- Font Size: 12px
- Font Weight: 600
- Padding: 4px 10px
- Border Radius: 99px（丸pill形状）
- 使用例: プロフィールのタグ、検索フィルター

### Badges（ステータス表示）

**参加済み**
- Background: `#e8f5e9`
- Text: `#4caf50`

**受付中**
- Background: `#eaedf5`
- Text: `#495e9f`

**完了**
- Background: `#f5f5f5`
- Text: `#757575`

### Avatars（プロフィールアイコン）

- Shape: 円形（border-radius: 50%）
- Sizes: 32px（コメント）/ 48px（カード）/ 80px（プロフィール画面）
- Fallback: 名前の頭文字をネイビー背景に白文字で表示

---

## 5. Layout Principles

### Spacing Scale

| Token | Value |
|-------|-------|
| XS | 4px |
| S | 8px |
| M | 16px |
| L | 24px |
| XL | 32px |
| XXL | 48px |

### Container（スマホ中心設計）

- Max Width: 430px（スマホ最大幅）
- Margin: 0 auto（中央寄せ）
- Padding (horizontal): 16px

### Bottom Navigation（下部タブバー）

- Height: 56px
- Background: `#ffffff`
- Border Top: 1px solid `#e0e0e0`
- アクティブアイコン色: `#495e9f`
- 非アクティブアイコン色: `#bdbdbd`
- タブ構成: ホーム / 掲示板 / 検索 / ショップ / プロフィール

---

## 6. Depth & Elevation

| Level | Shadow | 用途 |
|-------|--------|------|
| 0 | none | フラットな要素、背景 |
| 1 | `0 1px 3px rgba(0,0,0,0.08)` | カード（プロフィール・イベント） |
| 2 | `0 4px 8px rgba(0,0,0,0.10)` | ドロップダウン、ポップオーバー |
| 3 | `0 8px 24px rgba(0,0,0,0.15)` | モーダル、ダイアログ |

---

## 7. Do's and Don'ts

### Do（推奨）

- font-family は noto-sans を先頭に、system-ui フォールバックチェーンを指定する
- letter-spacing: -0.4px を全体に適用する
- 背景色は `#f8f6f2`（温かみのあるオフホワイト）を使用する
- 見出しの weight は 600（semibold）で統一する
- タグは pill 形状（border-radius: 99px）でネイビー系にする
- CTAボタン・選択中タブ・リンクには必ずネイビー（`#495e9f`）を使用する
- 削除・危険操作にはコーポレートレッド（`#bd3c40`）を使用する
- AZコインは必ずゴールド（`#f5c518`）で表示する

### Don't（禁止）

- 背景に純白 `#ffffff` を使わない（カード背景はOK、ページ背景はNG）
- テキスト色に純粋な `#000000` を使わない（`#0f0f0f` を使用）
- letter-spacing を 0 や正の値にしない
- 見出しに font-weight: 700 を使わない（600 semibold が正しい）
- ブランドカラー以外のCTAアクセントを混在させない（一貫性を保つ）
- コーポレートレッドをCTAなど通常操作に使わない（危険・強調役割を希釈しない）

---

## 8. Responsive Behavior

### Breakpoints

| Name | Width | 説明 |
|------|-------|------|
| Mobile | ≤ 430px | メインターゲット（スマホ） |
| Tablet | ≤ 768px | タブレット |
| Desktop | > 768px | デスクトップ（中央430px固定） |

### タッチターゲット

- 最小サイズ: 44px × 44px（WCAG基準）

---

## 9. Agent Prompt Guide

### クイックリファレンス

```
Primary Color:     #495e9f（コーポレートネイビー）
Primary Light:     #eaedf5
Secondary Color:   #bd3c40（コーポレートレッド／Danger 兼用）
Secondary Light:   #fae8e9
Coin Color:        #f5c518（ゴールド）
Text Color:        #0f0f0f
Text Sub:          #757575
Background:        #f8f6f2（温かみのあるオフホワイト）
Surface:           #ffffff
Border:            #e0e0e0
Font:              noto-sans, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, arial, sans-serif
Body Size:         16px
Line Height:       1.5
Letter Spacing:    -0.4px
Heading Weight:    600
Card Radius:       12px
Tag Radius:        99px（pill）
Max Width:         430px（スマホ中心）
```

### プロンプト例

```
ShareAZのデザインシステムに従って、イベントカードを作成してください。
- プライマリカラー: #495e9f（コーポレートネイビー）
- セカンダリ／Danger: #bd3c40（コーポレートレッド）
- 背景色: #f8f6f2（温かみのあるオフホワイト）
- カード背景: #ffffff、border-radius: 12px
- フォント: noto-sans, system-ui 系フォールバック
- 行間: line-height: 1.5
- 字間: letter-spacing: -0.4px
- 見出し: 600 (semibold)
- タグ: background #eaedf5、color #495e9f、border-radius 99px
- AZコイン: color #f5c518
```
