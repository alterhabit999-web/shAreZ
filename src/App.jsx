import React, { useState, useEffect } from 'react';
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  addDoc,
  deleteDoc,
  collection,
  collectionGroup,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  increment,
  arrayUnion,
  arrayRemove,
  writeBatch,
} from 'firebase/firestore';
import { auth, db } from './firebase';

// ============================================================
// デザインシステム（カラー定数）
// ※ DESIGN.md に基づく ShareAZ 専用カラーパレット
// ============================================================
const C = {
  // 背景
  bg:           '#f8f6f2',  // ページ全体の背景（温かみのあるオフホワイト）
  card:         '#ffffff',  // カード・入力欄の背景

  // ブランドカラー（コーポレートカラー）
  accent:       '#495e9f',  // ネイビー（ボタン・選択中タブ・リンク）
  accentLight:  '#eaedf5',  // 薄いネイビー（バッジ背景・ホバー）

  // AZコイン
  coin:         '#f5c518',  // ゴールド
  coinLight:    '#fffde7',  // 薄いゴールド

  // ステータス
  success:      '#4caf50',
  successLight: '#e8f5e9',
  warning:      '#ff9800',
  warningLight: '#fff3e0',
  danger:       '#bd3c40',  // コーポレートレッド（削除・危険操作）
  dangerLight:  '#fae8e9',

  // テキスト
  text:         '#0f0f0f',  // メインテキスト
  textSub:      '#757575',  // サブテキスト
  textMuted:    '#bdbdbd',  // ミュートテキスト

  // ボーダー・シャドウ
  border:       '#e0e0e0',
  shadow:       '0 1px 4px rgba(0,0,0,0.08)',
  shadowMd:     '0 4px 16px rgba(0,0,0,0.12)',
};

// ============================================================
// 定数
// ============================================================
const CATEGORIES = [
  { id: 'announcement', label: '告知',     color: '#4caf50', bg: '#e8f5e9' },
  { id: 'event',        label: 'イベント', color: '#bd3c40', bg: '#fae8e9' },
];
const CATEGORY_MAP = Object.fromEntries(CATEGORIES.map(c => [c.id, c]));

// メンバーランク（spec.md 2-8 参照）
// 完了したイベントへの参加回数（eventCount）と主催回数（hostCount）で判定
// ※ カウントは管理者がイベント完了処理した時に+1（管理画面実装後に動く）
const RANKS = {
  master: { id: 'master', label: 'マスター', icon: '👑', color: '#9c27b0' },
  gold:   { id: 'gold',   label: 'ゴールド', icon: '🥇', color: '#daa520' },
  silver: { id: 'silver', label: 'シルバー', icon: '🥈', color: '#9e9e9e' },
  bronze: { id: 'bronze', label: 'ブロンズ', icon: '🥉', color: '#cd7f32' },
};

function getMemberRank(profile) {
  const eventCount = profile?.eventCount || 0;
  const hostCount  = profile?.hostCount  || 0;
  if (eventCount >= 15 && hostCount >= 3) return RANKS.master;
  if (eventCount >= 15)                    return RANKS.gold;
  if (eventCount >= 5)                     return RANKS.silver;
  return RANKS.bronze;
}

// 次のランクまでの残り回数（マスターの場合は null）
function getNextRankProgress(profile) {
  const eventCount = profile?.eventCount || 0;
  const hostCount  = profile?.hostCount  || 0;
  if (eventCount >= 15 && hostCount >= 3) return null;
  if (eventCount >= 15) {
    // ゴールド → マスターへ：主催 3 回以上が必要
    return { next: RANKS.master, message: `あと主催 ${3 - hostCount} 回でマスター` };
  }
  if (eventCount >= 5) {
    return { next: RANKS.gold, message: `あと参加 ${15 - eventCount} 回でゴールド` };
  }
  return { next: RANKS.silver, message: `あと参加 ${5 - eventCount} 回でシルバー` };
}

// ============================================================
// 共通コンポーネント
// ============================================================

// ボトムナビゲーション
function BottomNav({ currentScreen, onNavigate }) {
  const tabs = [
    { id: 'home',    label: 'ホーム',     icon: '🏠' },
    { id: 'threads', label: '掲示板',     icon: '📋' },
    { id: 'members', label: 'メンバー',   icon: '👥' },
    { id: 'shop',    label: 'ポイント交換', icon: '🛍️' },
    { id: 'profile', label: 'マイページ', icon: '👤' },
  ];

  return (
    <nav style={{
      position: 'fixed',
      bottom: 0,
      left: '50%',
      transform: 'translateX(-50%)',
      width: '100%',
      maxWidth: 430,
      backgroundColor: C.card,
      borderTop: `1px solid ${C.border}`,
      display: 'flex',
      justifyContent: 'space-around',
      padding: '6px 0 8px',
      boxShadow: '0 -2px 8px rgba(0,0,0,0.06)',
      zIndex: 100,
    }}>
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onNavigate(tab.id)}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 2,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '4px 8px',
            color: currentScreen === tab.id ? C.accent : C.textSub,
            fontSize: 10,
            fontWeight: currentScreen === tab.id ? 600 : 400,
            minWidth: 52,
          }}
        >
          <span style={{ fontSize: 20 }}>{tab.icon}</span>
          {tab.label}
        </button>
      ))}
    </nav>
  );
}

// ヘッダー
// 全画面で同じ高さ・幅・レイアウトになるよう固定。
// 構造：[左 56px ← 戻るボタン枠] [中央 タイトル] [右 80px → コイン残高枠]
//       コインがない画面でも右側のスペースは確保し、左右対称を保つ
function Header({ title, coinBalance, onBack }) {
  const sideWidth = 80; // 左右の固定幅。コイン残高枠の最大想定幅に合わせて確保
  return (
    <header style={{
      position: 'sticky',
      top: 0,
      width: '100%',
      height: 56,
      boxSizing: 'border-box',
      backgroundColor: C.card,
      borderBottom: `1px solid ${C.border}`,
      padding: '0 12px',
      display: 'flex',
      alignItems: 'center',
      zIndex: 90,
      boxShadow: C.shadow,
    }}>
      {/* 左：戻るボタン or 空のスペーサー */}
      <div style={{ width: sideWidth, display: 'flex', alignItems: 'center', flexShrink: 0 }}>
        {onBack && (
          <button
            onClick={onBack}
            aria-label="戻る"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 4,
              fontSize: 22,
              lineHeight: 1,
              color: C.text,
            }}
          >
            ←
          </button>
        )}
      </div>

      {/* 中央：タイトル */}
      <h1 style={{
        flex: 1,
        textAlign: 'center',
        fontSize: 18,
        fontWeight: 700,
        color: onBack ? C.text : C.accent,
        letterSpacing: '-0.4px',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        margin: 0,
        padding: '0 8px',
      }}>
        {title}
      </h1>

      {/* 右：コイン残高 or 空のスペーサー */}
      <div style={{ width: sideWidth, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', flexShrink: 0 }}>
        {coinBalance !== undefined && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            backgroundColor: C.coinLight,
            border: `1px solid ${C.coin}`,
            borderRadius: 20,
            padding: '3px 8px',
            fontSize: 12,
            fontWeight: 600,
            color: '#b8860b',
            whiteSpace: 'nowrap',
          }}>
            🪙 {coinBalance}
          </div>
        )}
      </div>
    </header>
  );
}

// メンバーランクバッジ
function RankBadge({ profile, size = 'md' }) {
  const rank = getMemberRank(profile);
  const fontSize = size === 'sm' ? 10 : 12;
  const padding  = size === 'sm' ? '2px 6px' : '3px 9px';
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 3,
      padding,
      backgroundColor: '#fff',
      border: `1px solid ${rank.color}`,
      borderRadius: 12,
      fontSize,
      fontWeight: 700,
      color: rank.color,
      whiteSpace: 'nowrap',
    }}>
      <span>{rank.icon}</span>
      <span>{rank.label}</span>
    </span>
  );
}

// Firestore `users/{uid}` を取得。存在しなければデフォルト値で作成する。
async function ensureUserProfile(user) {
  const ref = doc(db, 'users', user.uid);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    return { id: snap.id, ...snap.data() };
  }
  const defaultName = user.email ? user.email.split('@')[0] : '';
  const newProfile = {
    name: defaultName,
    department: '',
    bio: '',
    avatarUrl: '',
    role: 'member',
    azCoins: 0,
    tags: [],
    eventCount: 0,        // 完了したイベントへの参加回数（管理画面で完了処理時に+1）
    hostCount: 0,         // 完了したイベントの主催回数（管理画面で完了処理時に+1）
    favoriteUserIds: [],  // お気に入りメンバーのuserId配列
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  await setDoc(ref, newProfile);
  return { id: user.uid, ...newProfile };
}

// Firebase Auth エラーコードを日本語メッセージに変換
function getAuthErrorMessage(code) {
  switch (code) {
    case 'auth/invalid-email':
      return 'メールアドレスの形式が正しくありません';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'メールアドレスまたはパスワードが違います';
    case 'auth/too-many-requests':
      return '試行回数が多すぎます。しばらく待ってから再度お試しください';
    case 'auth/network-request-failed':
      return 'ネットワークエラーが発生しました';
    default:
      return 'ログインに失敗しました';
  }
}

// ============================================================
// 画面コンポーネント（スケルトン）
// ============================================================

// ログイン画面
function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email || !password) {
      setError('メールアドレスとパスワードを入力してください');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await onLogin(email, password);
    } catch (err) {
      setError(getAuthErrorMessage(err.code));
      setLoading(false);
    }
  };

  const inputStyle = {
    width: '100%',
    padding: '12px 14px',
    border: `1px solid ${C.border}`,
    borderRadius: 8,
    fontSize: 16,
    color: C.text,
    backgroundColor: C.card,
    outline: 'none',
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: C.bg,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    }}>
      {/* ロゴ */}
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <div style={{
          width: 72,
          height: 72,
          backgroundColor: C.accent,
          borderRadius: 20,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 36,
          margin: '0 auto 16px',
          boxShadow: C.shadowMd,
        }}>
          🤝
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: C.text }}>ShareAZ</h1>
        <p style={{ fontSize: 14, color: C.textSub, marginTop: 6 }}>社内コミュニティSNS</p>
      </div>

      {/* フォーム */}
      <div style={{
        width: '100%',
        maxWidth: 380,
        backgroundColor: C.card,
        borderRadius: 16,
        padding: 24,
        boxShadow: C.shadow,
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={{ fontSize: 14, fontWeight: 600, color: C.text }}>メールアドレス</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="example@company.com"
            style={inputStyle}
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={{ fontSize: 14, fontWeight: 600, color: C.text }}>パスワード</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="パスワードを入力"
            style={inputStyle}
          />
        </div>
        {error && (
          <div style={{
            padding: '10px 12px',
            backgroundColor: C.dangerLight,
            color: C.danger,
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 500,
          }}>
            {error}
          </div>
        )}
        <button
          onClick={handleSubmit}
          disabled={loading}
          style={{
            width: '100%',
            padding: '14px',
            backgroundColor: loading ? C.textMuted : C.accent,
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            fontSize: 16,
            fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer',
            marginTop: 4,
          }}
        >
          {loading ? 'ログイン中...' : 'ログイン'}
        </button>
      </div>
    </div>
  );
}

// セクション見出し
function SectionTitle({ icon, label }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      margin: '20px 0 10px',
      fontSize: 13,
      fontWeight: 700,
      color: C.textSub,
    }}>
      <span>{icon}</span>
      <span>{label}</span>
    </div>
  );
}

// ホーム画面
// 表示順序：①公式お知らせ（isOfficial=true）→ ②新着スレッド（告知・イベント）
function HomeScreen({ profile, onSelectThread }) {
  const [threads, setThreads] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'threads'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        setThreads(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        setError('');
      },
      (err) => {
        console.error('スレッド取得失敗', err);
        setError('スレッドの取得に失敗しました');
      }
    );
    return unsubscribe;
  }, []);

  const officialThreads = threads ? threads.filter(t => t.isOfficial) : [];
  const regularThreads  = threads ? threads.filter(t => !t.isOfficial) : [];

  return (
    <div>
      <Header title="ShareAZ" coinBalance={profile.azCoins} />
      <div style={{ padding: '0 16px 100px' }}>
        {error && (
          <div style={{
            margin: '16px 0',
            padding: '12px 14px',
            backgroundColor: C.dangerLight,
            color: C.danger,
            borderRadius: 8,
            fontSize: 13,
          }}>
            {error}
          </div>
        )}

        {threads === null ? (
          <div style={{ textAlign: 'center', color: C.textSub, marginTop: 60 }}>読み込み中...</div>
        ) : threads.length === 0 ? (
          <div style={{ textAlign: 'center', color: C.textSub, marginTop: 60 }}>
            <div style={{ fontSize: 48 }}>👋</div>
            <p style={{ marginTop: 12 }}>ShareAZ へようこそ！</p>
            <p style={{ marginTop: 4, fontSize: 13 }}>掲示板タブからスレッドを作成してみましょう</p>
          </div>
        ) : (
          <>
            {officialThreads.length > 0 && (
              <>
                <SectionTitle icon="📢" label="公式お知らせ" />
                {officialThreads.map(t => (
                  <ThreadCard key={t.id} thread={t} onClick={() => onSelectThread(t.id)} />
                ))}
              </>
            )}

            {regularThreads.length > 0 && (
              <>
                <SectionTitle icon="✨" label="新着" />
                {regularThreads.map(t => (
                  <ThreadCard key={t.id} thread={t} onClick={() => onSelectThread(t.id)} />
                ))}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// メンバーカード
function MemberCard({ member, isFavorite, onToggleFavorite, isMe }) {
  return (
    <div style={{
      backgroundColor: C.card,
      borderRadius: 12,
      padding: 14,
      marginBottom: 10,
      boxShadow: C.shadow,
      border: `1px solid ${C.border}`,
      display: 'flex',
      gap: 12,
      alignItems: 'flex-start',
    }}>
      {/* アバター */}
      <div style={{
        width: 48,
        height: 48,
        borderRadius: '50%',
        backgroundColor: C.accentLight,
        color: C.accent,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 18,
        fontWeight: 700,
        flexShrink: 0,
      }}>
        {(member.name || '?').charAt(0).toUpperCase()}
      </div>

      {/* メイン情報 */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2, flexWrap: 'wrap' }}>
          <h3 style={{
            fontSize: 15,
            fontWeight: 700,
            color: C.text,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {member.name || '(名前未設定)'}
          </h3>
          <RankBadge profile={member} size="sm" />
          {isMe && (
            <span style={{
              fontSize: 10,
              fontWeight: 600,
              color: C.textSub,
              backgroundColor: C.bg,
              padding: '1px 6px',
              borderRadius: 10,
              flexShrink: 0,
            }}>
              自分
            </span>
          )}
        </div>
        {member.department && (
          <div style={{ fontSize: 12, color: C.textSub, marginBottom: 6 }}>
            {member.department}
          </div>
        )}
        {member.tags && member.tags.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {member.tags.map(tag => (
              <span key={tag} style={{
                padding: '2px 7px',
                backgroundColor: C.accentLight,
                color: C.accent,
                borderRadius: 10,
                fontSize: 10,
                fontWeight: 600,
              }}>
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* お気に入りボタン（自分以外） */}
      {!isMe && (
        <button
          onClick={onToggleFavorite}
          aria-label={isFavorite ? 'お気に入り解除' : 'お気に入り追加'}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: 22,
            padding: 4,
            color: isFavorite ? C.coin : C.textMuted,
            flexShrink: 0,
            lineHeight: 1,
          }}
        >
          {isFavorite ? '★' : '☆'}
        </button>
      )}
    </div>
  );
}

// メンバー検索画面
function MembersScreen({ user }) {
  const [members, setMembers] = useState(null);
  const [myProfile, setMyProfile] = useState(null); // お気に入り判定用
  const [searchText, setSearchText] = useState('');
  const [selectedTag, setSelectedTag] = useState(null);
  const [tagSheetOpen, setTagSheetOpen] = useState(false);
  const [tab, setTab] = useState('all'); // 'all' | 'favorites'
  const [error, setError] = useState('');

  // 全メンバー購読（名前順）
  useEffect(() => {
    const q = query(collection(db, 'users'), orderBy('name', 'asc'));
    const unsubscribe = onSnapshot(q,
      (snap) => {
        setMembers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        setError('');
      },
      (err) => {
        console.error('メンバー取得失敗', err);
        setError('メンバー一覧の取得に失敗しました');
      }
    );
    return unsubscribe;
  }, []);

  // 自分のプロフィール購読（favoriteUserIds をリアルタイム反映）
  useEffect(() => {
    const ref = doc(db, 'users', user.uid);
    const unsubscribe = onSnapshot(ref, (snap) => {
      if (snap.exists()) setMyProfile({ id: snap.id, ...snap.data() });
    });
    return unsubscribe;
  }, [user.uid]);

  const favoriteIds = myProfile?.favoriteUserIds || [];

  // お気に入りトグル
  const toggleFavorite = async (memberId) => {
    if (memberId === user.uid) return;
    try {
      const ref = doc(db, 'users', user.uid);
      if (favoriteIds.includes(memberId)) {
        await updateDoc(ref, { favoriteUserIds: arrayRemove(memberId) });
      } else {
        await updateDoc(ref, { favoriteUserIds: arrayUnion(memberId) });
      }
    } catch (err) {
      console.error('お気に入りトグル失敗', err);
      alert('処理に失敗しました');
    }
  };

  // 全タグ集計
  const allTags = members
    ? [...new Set(members.flatMap(m => m.tags || []))].sort()
    : [];

  // フィルタリング
  const filtered = members ? members.filter(m => {
    if (tab === 'favorites' && (m.id === user.uid || !favoriteIds.includes(m.id))) return false;
    if (searchText) {
      const text = searchText.trim().toLowerCase();
      if (!(m.name || '').toLowerCase().includes(text)) return false;
    }
    if (selectedTag && !(m.tags || []).includes(selectedTag)) return false;
    return true;
  }) : null;

  const tabBtnStyle = (active) => ({
    flex: 1,
    padding: '8px',
    backgroundColor: active ? C.accent : C.card,
    color: active ? '#fff' : C.textSub,
    border: `1px solid ${active ? C.accent : C.border}`,
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
  });

  return (
    <div>
      <Header title="メンバー" />

      {/* 検索・絞り込みエリア */}
      <div style={{
        padding: '12px 16px',
        backgroundColor: C.card,
        borderBottom: `1px solid ${C.border}`,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}>
        {/* タブ */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setTab('all')} style={tabBtnStyle(tab === 'all')}>
            👥 すべて
          </button>
          <button onClick={() => setTab('favorites')} style={tabBtnStyle(tab === 'favorites')}>
            ★ お気に入り{favoriteIds.length > 0 ? ` (${favoriteIds.length})` : ''}
          </button>
        </div>

        {/* 検索ボックス */}
        <input
          type="text"
          value={searchText}
          onChange={e => setSearchText(e.target.value)}
          placeholder="🔍 名前で検索..."
          style={{
            width: '100%',
            padding: '10px 12px',
            border: `1px solid ${C.border}`,
            borderRadius: 8,
            fontSize: 14,
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />

        {/* タグフィルタボタン */}
        <button
          onClick={() => setTagSheetOpen(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 14px',
            backgroundColor: selectedTag ? C.accent : C.accentLight,
            color: selectedTag ? '#fff' : C.accent,
            border: 'none',
            borderRadius: 20,
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            alignSelf: 'flex-start',
          }}
        >
          🏷️ {selectedTag ? `#${selectedTag}` : 'タグで絞り込む'}
          <span style={{ fontSize: 10 }}>▼</span>
        </button>
      </div>

      {/* メンバーリスト */}
      <div style={{ padding: '16px 16px 100px' }}>
        {error ? (
          <div style={{
            padding: '12px 14px',
            backgroundColor: C.dangerLight,
            color: C.danger,
            borderRadius: 8,
            fontSize: 13,
          }}>
            {error}
          </div>
        ) : filtered === null ? (
          <div style={{ textAlign: 'center', color: C.textSub, marginTop: 60 }}>読み込み中...</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', color: C.textSub, marginTop: 60 }}>
            <div style={{ fontSize: 48 }}>{tab === 'favorites' ? '★' : '👥'}</div>
            <p style={{ marginTop: 12 }}>
              {tab === 'favorites'
                ? 'お気に入りメンバーはまだいません'
                : (searchText || selectedTag) ? '該当するメンバーがいません' : 'メンバーがいません'}
            </p>
            {tab === 'favorites' && (
              <p style={{ marginTop: 4, fontSize: 13 }}>
                メンバーカードの ☆ をタップで追加できます
              </p>
            )}
          </div>
        ) : (
          filtered.map(m => (
            <MemberCard
              key={m.id}
              member={m}
              isFavorite={favoriteIds.includes(m.id)}
              onToggleFavorite={() => toggleFavorite(m.id)}
              isMe={m.id === user.uid}
            />
          ))
        )}
      </div>

      <TagFilterSheet
        open={tagSheetOpen}
        allTags={allTags}
        selectedTag={selectedTag}
        onSelect={setSelectedTag}
        onClose={() => setTagSheetOpen(false)}
      />
    </div>
  );
}

// 日時フォーマット（2026/05/10 12:00）
function formatEventDate(timestamp) {
  if (!timestamp) return null;
  const d = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${yyyy}/${mm}/${dd} ${hh}:${mi}`;
}

// スレッドカード（一覧用）
function ThreadCard({ thread, onClick }) {
  const cat = CATEGORY_MAP[thread.category] || CATEGORY_MAP.chat;
  return (
    <div
      onClick={onClick}
      style={{
        backgroundColor: C.card,
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        boxShadow: C.shadow,
        border: `1px solid ${C.border}`,
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={{
          fontSize: 11,
          fontWeight: 600,
          color: cat.color,
          backgroundColor: cat.bg,
          padding: '2px 8px',
          borderRadius: 20,
        }}>
          {cat.label}
        </span>
      </div>
      <h3 style={{ fontSize: 15, fontWeight: 600, color: C.text, marginBottom: 8 }}>
        {thread.title}
      </h3>
      {thread.tags && thread.tags.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
          {thread.tags.map(tag => (
            <span key={tag} style={{
              padding: '2px 8px',
              backgroundColor: C.accentLight,
              color: C.accent,
              borderRadius: 12,
              fontSize: 11,
              fontWeight: 600,
            }}>
              #{tag}
            </span>
          ))}
        </div>
      )}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, fontSize: 13, color: C.textSub }}>
        <span>👤 {thread.authorName || '(匿名)'}</span>
        {thread.eventDate && <span>📅 {formatEventDate(thread.eventDate)}</span>}
        {thread.category === 'event' && (
          <span>👥 {thread.participantCount || 0}{thread.capacity > 0 ? `/${thread.capacity}` : ''}人</span>
        )}
        {thread.category === 'announcement' && thread.interestedCount > 0 && (
          <span>✋ 興味あり {thread.interestedCount}</span>
        )}
        {/* コメント数バッジ（両カテゴリ） */}
        {thread.commentCount > 0 && <span>💬 {thread.commentCount}</span>}
      </div>
    </div>
  );
}

// FAB（フローティング作成ボタン）
// 中央寄せされた max-width:430 コンテナの右下に表示
function FAB({ onClick, label = '+' }) {
  return (
    <button
      onClick={onClick}
      aria-label="新規作成"
      style={{
        position: 'fixed',
        bottom: 80,
        // ビューポート > 430px の場合は中央寄せされたコンテナの右端に、それ以下なら右端 16px に
        right: 'max(16px, calc(50vw - 199px))',
        width: 56,
        height: 56,
        borderRadius: '50%',
        backgroundColor: C.accent,
        color: '#fff',
        border: 'none',
        fontSize: 28,
        fontWeight: 300,
        cursor: 'pointer',
        boxShadow: C.shadowMd,
        zIndex: 95,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        lineHeight: 1,
      }}
    >
      {label}
    </button>
  );
}

// タグフィルタのボトムシート
// max-width: 430 のコンテナ内で下からスライド表示
function TagFilterSheet({ open, allTags, selectedTag, onSelect, onClose }) {
  const [search, setSearch] = useState('');

  // モーダル開閉時にスクロールロック
  useEffect(() => {
    if (open) {
      const original = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = original; };
    }
  }, [open]);

  if (!open) return null;

  const filteredTags = search.trim()
    ? allTags.filter(t => t.toLowerCase().includes(search.trim().toLowerCase()))
    : allTags;

  const handleSelect = (tag) => {
    onSelect(tag);
    setSearch('');
    onClose();
  };

  const handleClear = () => {
    onSelect(null);
    setSearch('');
    onClose();
  };

  return (
    <>
      {/* 背景オーバーレイ（タップで閉じる） */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          zIndex: 200,
        }}
      />

      {/* ボトムシート本体（中央寄せ・max-width 430）
          タグの数に関わらず常に画面中央付近まで開くよう height を固定 */}
      <div
        role="dialog"
        aria-label="タグで絞り込む"
        style={{
          position: 'fixed',
          bottom: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          width: '100%',
          maxWidth: 430,
          height: '60vh', // 画面中央付近まで開く
          backgroundColor: C.card,
          borderRadius: '16px 16px 0 0',
          boxShadow: '0 -4px 16px rgba(0,0,0,0.15)',
          zIndex: 201,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* ドラッグハンドル */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0 4px' }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: C.border }} />
        </div>

        {/* ヘッダー */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 16px 12px',
          borderBottom: `1px solid ${C.border}`,
        }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: C.text }}>タグで絞り込む</h3>
          <button
            onClick={onClose}
            aria-label="閉じる"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: 20,
              color: C.textSub,
              padding: 4,
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>

        {/* 検索ボックス */}
        <div style={{ padding: '12px 16px', borderBottom: `1px solid ${C.border}` }}>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="🔍 タグを検索..."
            style={{
              width: '100%',
              padding: '10px 12px',
              border: `1px solid ${C.border}`,
              borderRadius: 8,
              fontSize: 14,
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* タグリスト */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '12px 16px',
        }}>
          {allTags.length === 0 ? (
            <p style={{ textAlign: 'center', color: C.textSub, fontSize: 13, padding: 20 }}>
              まだタグが登録されていません
            </p>
          ) : filteredTags.length === 0 ? (
            <p style={{ textAlign: 'center', color: C.textSub, fontSize: 13, padding: 20 }}>
              「{search}」に一致するタグはありません
            </p>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {filteredTags.map(tag => {
                const selected = selectedTag === tag;
                return (
                  <button
                    key={tag}
                    onClick={() => handleSelect(tag)}
                    style={{
                      padding: '8px 14px',
                      backgroundColor: selected ? C.accent : C.accentLight,
                      color: selected ? '#fff' : C.accent,
                      border: `1px solid ${selected ? C.accent : 'transparent'}`,
                      borderRadius: 20,
                      fontSize: 14,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    #{tag}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* フッター：絞り込みクリア */}
        {selectedTag && (
          <div style={{ padding: 16, borderTop: `1px solid ${C.border}` }}>
            <button
              onClick={handleClear}
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: C.card,
                color: C.textSub,
                border: `1px solid ${C.border}`,
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              絞り込みをクリア
            </button>
          </div>
        )}
      </div>
    </>
  );
}

// 掲示板画面（スレッド一覧）
function ThreadsScreen({ onCreateThread, onSelectThread }) {
  const [threads, setThreads] = useState(null); // null=loading, []=empty
  const [error, setError] = useState('');
  const [selectedTag, setSelectedTag] = useState(null); // null=すべて
  const [tagSheetOpen, setTagSheetOpen] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'threads'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        setThreads(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        setError('');
      },
      (err) => {
        console.error('スレッド取得失敗', err);
        setError('スレッドの取得に失敗しました');
      }
    );
    return unsubscribe;
  }, []);

  // 全スレッドから使われているタグを集計（重複除去）
  const allTags = threads
    ? [...new Set(threads.flatMap(t => t.tags || []))].sort()
    : [];

  const filteredThreads = threads && selectedTag
    ? threads.filter(t => (t.tags || []).includes(selectedTag))
    : threads;

  return (
    <div>
      <Header title="掲示板" />

      {/* タグフィルタ起動ボタン */}
      <div style={{
        padding: '10px 16px',
        backgroundColor: C.card,
        borderBottom: `1px solid ${C.border}`,
      }}>
        <button
          onClick={() => setTagSheetOpen(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 14px',
            backgroundColor: selectedTag ? C.accent : C.accentLight,
            color: selectedTag ? '#fff' : C.accent,
            border: 'none',
            borderRadius: 20,
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          🏷️ {selectedTag ? `#${selectedTag}` : 'タグで絞り込む'}
          <span style={{ fontSize: 10 }}>▼</span>
        </button>
      </div>

      <div style={{ padding: '16px 16px 100px' }}>
        {error ? (
          <div style={{
            padding: '12px 14px',
            backgroundColor: C.dangerLight,
            color: C.danger,
            borderRadius: 8,
            fontSize: 13,
          }}>
            {error}
          </div>
        ) : threads === null ? (
          <div style={{ textAlign: 'center', color: C.textSub, marginTop: 60 }}>読み込み中...</div>
        ) : threads.length === 0 ? (
          <div style={{ textAlign: 'center', color: C.textSub, marginTop: 60 }}>
            <div style={{ fontSize: 48 }}>📋</div>
            <p style={{ marginTop: 12 }}>まだスレッドがありません</p>
            <p style={{ marginTop: 4, fontSize: 13 }}>右下の「＋」から最初のスレッドを作成しましょう</p>
          </div>
        ) : filteredThreads.length === 0 ? (
          <div style={{ textAlign: 'center', color: C.textSub, marginTop: 60 }}>
            <p>「#{selectedTag}」のスレッドはありません</p>
          </div>
        ) : (
          filteredThreads.map(t => (
            <ThreadCard key={t.id} thread={t} onClick={() => onSelectThread(t.id)} />
          ))
        )}
      </div>
      <FAB onClick={onCreateThread} />

      <TagFilterSheet
        open={tagSheetOpen}
        allTags={allTags}
        selectedTag={selectedTag}
        onSelect={setSelectedTag}
        onClose={() => setTagSheetOpen(false)}
      />
    </div>
  );
}

// 新規スレッド作成画面
function NewThreadScreen({ user, profile, onCancel, onCreated }) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [category, setCategory] = useState('announcement');
  const [eventDate, setEventDate] = useState(''); // datetime-local 文字列
  const [capacity, setCapacity] = useState(''); // 文字列で保持→送信時に数値化
  const [tags, setTags] = useState([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const isEvent = category === 'event';

  const handleSubmit = async () => {
    if (!title.trim()) {
      setError('タイトルを入力してください');
      return;
    }
    if (!body.trim()) {
      setError('本文を入力してください');
      return;
    }
    const capacityNum = capacity === '' ? 0 : parseInt(capacity, 10);
    if (isEvent && capacity !== '' && (isNaN(capacityNum) || capacityNum < 0)) {
      setError('定員は0以上の数値を入力してください（0=無制限）');
      return;
    }
    setError('');
    setSaving(true);
    try {
      const data = {
        authorId: user.uid,
        authorName: profile.name || '(匿名)',
        title: title.trim(),
        body: body.trim(),
        category,
        eventDate: isEvent && eventDate ? new Date(eventDate) : null,
        capacity: isEvent ? capacityNum : 0,
        status: 'open',
        participantCount: 0,
        commentCount: 0,
        interestedCount: 0,
        tags,
        promotedFrom: null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      const ref = await addDoc(collection(db, 'threads'), data);
      onCreated(ref.id);
    } catch (err) {
      console.error('スレッド作成失敗', err);
      setError('スレッドの作成に失敗しました');
      setSaving(false);
    }
  };

  const labelStyle = { fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 6, display: 'block' };
  const inputStyle = {
    width: '100%',
    padding: '10px 12px',
    border: `1px solid ${C.border}`,
    borderRadius: 8,
    fontSize: 15,
    color: C.text,
    backgroundColor: C.card,
    outline: 'none',
    boxSizing: 'border-box',
  };

  return (
    <div>
      <Header title="新規スレッド" onBack={onCancel} />
      <div style={{ padding: '16px 16px 100px' }}>
        <div style={{
          backgroundColor: C.card,
          borderRadius: 12,
          padding: 20,
          boxShadow: C.shadow,
          border: `1px solid ${C.border}`,
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
        }}>
          {/* カテゴリ */}
          <div>
            <label style={labelStyle}>カテゴリ <span style={{ color: C.danger }}>*</span></label>
            <div style={{ display: 'flex', gap: 8 }}>
              {CATEGORIES.map(c => {
                const selected = category === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setCategory(c.id)}
                    style={{
                      flex: 1,
                      padding: '10px 8px',
                      backgroundColor: selected ? c.bg : C.card,
                      color: selected ? c.color : C.textSub,
                      border: `1px solid ${selected ? c.color : C.border}`,
                      borderRadius: 8,
                      fontSize: 14,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {c.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* タイトル */}
          <div>
            <label style={labelStyle}>タイトル <span style={{ color: C.danger }}>*</span></label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              maxLength={100}
              style={inputStyle}
              placeholder="例：ゲーム部　毎週木曜集まりませんか？"
            />
          </div>

          {/* 本文 */}
          <div>
            <label style={labelStyle}>本文 <span style={{ color: C.danger }}>*</span></label>
            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              maxLength={5000}
              rows={6}
              style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
              placeholder="詳細・場所・持ち物などを記入"
            />
          </div>

          {/* イベントのみ：開催日時 */}
          {isEvent && (
            <div>
              <label style={labelStyle}>開催日時（任意）</label>
              <input
                type="datetime-local"
                value={eventDate}
                onChange={e => setEventDate(e.target.value)}
                style={inputStyle}
              />
            </div>
          )}

          {/* イベントのみ：定員 */}
          {isEvent && (
            <div>
              <label style={labelStyle}>定員（任意・0=無制限）</label>
              <input
                type="number"
                value={capacity}
                onChange={e => setCapacity(e.target.value)}
                min={0}
                style={inputStyle}
                placeholder="例：10"
              />
            </div>
          )}

          {/* タグ */}
          <div>
            <label style={labelStyle}>タグ（任意）</label>
            <TagInput tags={tags} onChange={setTags} />
            <p style={{ fontSize: 12, color: C.textSub, marginTop: 6 }}>
              例：「料理」「ゲーム」「勉強会」など。検索で見つけてもらいやすくなります
            </p>
          </div>

          {error && (
            <div style={{
              padding: '10px 12px',
              backgroundColor: C.dangerLight,
              color: C.danger,
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 500,
            }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <button
              onClick={onCancel}
              disabled={saving}
              style={{
                flex: 1,
                padding: '12px',
                backgroundColor: C.card,
                color: C.textSub,
                border: `1px solid ${C.border}`,
                borderRadius: 8,
                fontSize: 15,
                fontWeight: 600,
                cursor: saving ? 'not-allowed' : 'pointer',
              }}
            >
              キャンセル
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving}
              style={{
                flex: 2,
                padding: '12px',
                backgroundColor: saving ? C.textMuted : C.accent,
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                fontSize: 15,
                fontWeight: 600,
                cursor: saving ? 'not-allowed' : 'pointer',
              }}
            >
              {saving ? '投稿中...' : '投稿する'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// スレッド詳細画面
// ============================================================
// 機能：
// - スレッド情報の表示（タイトル・本文・タグ・主催者・カテゴリ別の追加情報）
// - 作成者本人のみ：編集（タイトル・本文・タグ）/ 削除申請ボタン
// - コメント一覧（古い順、リアルタイム）+ 投稿フォーム
// - 参加申請（イベント）/ 興味あり（告知）/ イベント昇華は Step 4b/4c/4d で実装
function ThreadDetailScreen({ threadId, user, profile, onBack }) {
  const [thread, setThread] = useState(null); // null=loading, false=not found
  const [comments, setComments] = useState(null);
  const [error, setError] = useState('');

  // 編集モード
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({ title: '', body: '', tags: [] });
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState('');

  // コメント投稿
  const [commentText, setCommentText] = useState('');
  const [postingComment, setPostingComment] = useState(false);
  const [commentError, setCommentError] = useState('');

  // 削除申請
  const [deletionDialogOpen, setDeletionDialogOpen] = useState(false);
  const [deletionReason, setDeletionReason] = useState('');
  const [submittingDeletion, setSubmittingDeletion] = useState(false);
  const [deletionSubmitted, setDeletionSubmitted] = useState(false);

  // 興味ありリアクション（告知のみ）
  const [hasInterested, setHasInterested] = useState(null); // null=loading, true/false
  const [togglingInterested, setTogglingInterested] = useState(false);

  // 参加申請（イベントのみ）
  const [participation, setParticipation] = useState(null); // null=loading, false=未参加, doc=参加中
  const [participants, setParticipants] = useState(null);    // null=loading, []=empty, [...]=list
  const [togglingParticipation, setTogglingParticipation] = useState(false);

  // 告知→イベント昇華
  const [promotionDialogOpen, setPromotionDialogOpen] = useState(false);
  const [promotionForm, setPromotionForm] = useState({ eventDate: '', capacity: '' });
  const [promoting, setPromoting] = useState(false);
  const [promotionError, setPromotionError] = useState('');

  // スレッド本体を購読
  useEffect(() => {
    const ref = doc(db, 'threads', threadId);
    const unsubscribe = onSnapshot(
      ref,
      (snap) => {
        if (snap.exists()) {
          setThread({ id: snap.id, ...snap.data() });
        } else {
          setThread(false);
        }
        setError('');
      },
      (err) => {
        console.error('スレッド取得失敗', err);
        setError('スレッドの取得に失敗しました');
      }
    );
    return unsubscribe;
  }, [threadId]);

  // コメントを購読（古い順）
  useEffect(() => {
    const q = query(
      collection(db, 'threads', threadId, 'comments'),
      orderBy('createdAt', 'asc')
    );
    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        setComments(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      },
      (err) => {
        console.error('コメント取得失敗', err);
      }
    );
    return unsubscribe;
  }, [threadId]);

  // 自分が「興味あり」をしているか購読（告知のみ）
  useEffect(() => {
    if (!thread || thread.category !== 'announcement') {
      setHasInterested(null);
      return;
    }
    const ref = doc(db, 'threads', threadId, 'interested', user.uid);
    const unsubscribe = onSnapshot(ref, (snap) => {
      setHasInterested(snap.exists());
    }, (err) => {
      console.error('興味あり状態の取得失敗', err);
    });
    return unsubscribe;
  }, [threadId, user.uid, thread]);

  // 自分の参加状況を購読（イベントのみ）
  useEffect(() => {
    if (!thread || thread.category !== 'event') {
      setParticipation(null);
      return;
    }
    const ref = doc(db, 'threads', threadId, 'participations', user.uid);
    const unsubscribe = onSnapshot(ref, (snap) => {
      setParticipation(snap.exists() ? { id: snap.id, ...snap.data() } : false);
    }, (err) => {
      console.error('参加状態の取得失敗', err);
    });
    return unsubscribe;
  }, [threadId, user.uid, thread]);

  // 参加者一覧を購読（イベントのみ、申請順）
  useEffect(() => {
    if (!thread || thread.category !== 'event') {
      setParticipants(null);
      return;
    }
    const q = query(
      collection(db, 'threads', threadId, 'participations'),
      orderBy('createdAt', 'asc')
    );
    const unsubscribe = onSnapshot(q, (snap) => {
      setParticipants(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => {
      console.error('参加者一覧の取得失敗', err);
    });
    return unsubscribe;
  }, [threadId, thread]);

  const isAuthor = thread && thread.authorId === user.uid;
  const isAdmin = profile?.role === 'admin';
  const canEdit = thread && (isAuthor || isAdmin); // adminは他人のスレッドも編集可
  const cat = thread ? CATEGORY_MAP[thread.category] : null;

  // 編集開始
  const startEdit = () => {
    setEditForm({
      title: thread.title || '',
      body: thread.body || '',
      tags: thread.tags || [],
    });
    setEditError('');
    setEditMode(true);
  };

  const saveEdit = async () => {
    if (!editForm.title.trim()) {
      setEditError('タイトルを入力してください');
      return;
    }
    if (!editForm.body.trim()) {
      setEditError('本文を入力してください');
      return;
    }
    setSavingEdit(true);
    setEditError('');
    try {
      await updateDoc(doc(db, 'threads', threadId), {
        title: editForm.title.trim(),
        body: editForm.body.trim(),
        tags: editForm.tags,
        updatedAt: serverTimestamp(),
      });
      setEditMode(false);
    } catch (err) {
      console.error('編集失敗', err);
      setEditError('保存に失敗しました');
    } finally {
      setSavingEdit(false);
    }
  };

  // コメント投稿
  const postComment = async () => {
    const body = commentText.trim();
    if (!body) return;
    setPostingComment(true);
    setCommentError('');
    try {
      await addDoc(collection(db, 'threads', threadId, 'comments'), {
        authorId: user.uid,
        authorName: profile.name || '(匿名)',
        body,
        createdAt: serverTimestamp(),
      });
      // commentCount をインクリメント
      await updateDoc(doc(db, 'threads', threadId), {
        commentCount: increment(1),
        updatedAt: serverTimestamp(),
      });
      setCommentText('');
    } catch (err) {
      console.error('コメント投稿失敗', err);
      setCommentError('コメントの投稿に失敗しました');
    } finally {
      setPostingComment(false);
    }
  };

  // 興味ありトグル（追加 / 取り消し）
  const toggleInterested = async () => {
    if (togglingInterested || hasInterested === null) return;
    setTogglingInterested(true);
    try {
      const ref = doc(db, 'threads', threadId, 'interested', user.uid);
      const threadRef = doc(db, 'threads', threadId);
      if (hasInterested) {
        await deleteDoc(ref);
        await updateDoc(threadRef, { interestedCount: increment(-1) });
      } else {
        await setDoc(ref, { createdAt: serverTimestamp() });
        await updateDoc(threadRef, { interestedCount: increment(1) });
      }
    } catch (err) {
      console.error('興味ありトグル失敗', err);
      alert('処理に失敗しました。再度お試しください');
    } finally {
      setTogglingInterested(false);
    }
  };

  // 参加申請トグル（参加 / キャンセル）
  // MVPでは自動承認（status: 'approved'）
  const toggleParticipation = async () => {
    if (togglingParticipation || participation === null) return;
    // 定員チェック（自分が未参加で満員のとき）
    const currentCount = thread.participantCount || 0;
    const isFull = thread.capacity > 0 && currentCount >= thread.capacity;
    if (!participation && isFull) {
      alert('このイベントは定員に達しています');
      return;
    }
    setTogglingParticipation(true);
    try {
      const ref = doc(db, 'threads', threadId, 'participations', user.uid);
      const threadRef = doc(db, 'threads', threadId);
      if (participation) {
        // キャンセル
        await deleteDoc(ref);
        await updateDoc(threadRef, { participantCount: increment(-1) });
      } else {
        // 参加（userIdを保存：マイページのcollectionGroupクエリ用）
        await setDoc(ref, {
          userId: user.uid,
          userName: profile.name || '(匿名)',
          status: 'approved',
          createdAt: serverTimestamp(),
        });
        await updateDoc(threadRef, { participantCount: increment(1) });
      }
    } catch (err) {
      console.error('参加トグル失敗', err);
      alert('処理に失敗しました。再度お試しください');
    } finally {
      setTogglingParticipation(false);
    }
  };

  // 告知→イベント昇華
  const openPromotionDialog = () => {
    setPromotionForm({ eventDate: '', capacity: '' });
    setPromotionError('');
    setPromotionDialogOpen(true);
  };

  const handlePromote = async () => {
    setPromoting(true);
    setPromotionError('');
    try {
      const capacityNum = promotionForm.capacity === '' ? 0 : parseInt(promotionForm.capacity, 10);
      if (promotionForm.capacity !== '' && (isNaN(capacityNum) || capacityNum < 0)) {
        setPromotionError('定員は0以上の数値を入力してください（0=無制限）');
        setPromoting(false);
        return;
      }
      await updateDoc(doc(db, 'threads', threadId), {
        category: 'event',
        promotedFrom: 'announcement',
        eventDate: promotionForm.eventDate ? new Date(promotionForm.eventDate) : null,
        capacity: capacityNum,
        updatedAt: serverTimestamp(),
      });
      setPromotionDialogOpen(false);
      setPromotionForm({ eventDate: '', capacity: '' });
    } catch (err) {
      console.error('昇華失敗', err);
      setPromotionError('処理に失敗しました');
    } finally {
      setPromoting(false);
    }
  };

  // 削除申請
  const submitDeletionRequest = async () => {
    setSubmittingDeletion(true);
    try {
      await addDoc(collection(db, 'deletionRequests'), {
        threadId,
        threadTitle: thread.title, // 管理者が見やすいよう非正規化
        requestedBy: user.uid,
        requestedByName: profile.name || '(匿名)',
        reason: deletionReason.trim(),
        status: 'pending',
        createdAt: serverTimestamp(),
      });
      setDeletionSubmitted(true);
      setDeletionReason('');
    } catch (err) {
      console.error('削除申請失敗', err);
      alert('削除申請に失敗しました。再度お試しください');
    } finally {
      setSubmittingDeletion(false);
    }
  };

  if (error) {
    return (
      <div>
        <Header title="スレッド" onBack={onBack} />
        <div style={{ padding: 24, color: C.danger, textAlign: 'center' }}>
          {error}
        </div>
      </div>
    );
  }

  if (thread === null) {
    return (
      <div>
        <Header title="スレッド" onBack={onBack} />
        <div style={{ padding: 24, color: C.textSub, textAlign: 'center' }}>
          読み込み中...
        </div>
      </div>
    );
  }

  if (thread === false) {
    return (
      <div>
        <Header title="スレッド" onBack={onBack} />
        <div style={{ padding: 40, color: C.textSub, textAlign: 'center' }}>
          <div style={{ fontSize: 48 }}>🗑️</div>
          <p style={{ marginTop: 12 }}>このスレッドは削除されました</p>
        </div>
      </div>
    );
  }

  const labelStyle = { fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 6, display: 'block' };
  const inputStyle = {
    width: '100%',
    padding: '10px 12px',
    border: `1px solid ${C.border}`,
    borderRadius: 8,
    fontSize: 15,
    color: C.text,
    backgroundColor: C.card,
    outline: 'none',
    boxSizing: 'border-box',
  };

  return (
    <div>
      <Header title={cat ? cat.label : 'スレッド'} onBack={onBack} />

      <div style={{ padding: '16px 16px 100px' }}>
        {/* スレッド情報カード */}
        <div style={{
          backgroundColor: C.card,
          borderRadius: 12,
          padding: 20,
          boxShadow: C.shadow,
          border: `1px solid ${C.border}`,
          marginBottom: 16,
        }}>
          {/* カテゴリ + 公式バッジ */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
            {cat && (
              <span style={{
                fontSize: 11,
                fontWeight: 600,
                color: cat.color,
                backgroundColor: cat.bg,
                padding: '2px 8px',
                borderRadius: 20,
              }}>
                {cat.label}
              </span>
            )}
            {thread.isOfficial && (
              <span style={{
                fontSize: 11,
                fontWeight: 600,
                color: '#fff',
                backgroundColor: C.accent,
                padding: '2px 8px',
                borderRadius: 20,
              }}>
                📢 公式
              </span>
            )}
            {thread.promotedFrom === 'announcement' && (
              <span style={{
                fontSize: 11,
                fontWeight: 600,
                color: C.textSub,
                padding: '2px 6px',
              }}>
                ↑ 告知から作成
              </span>
            )}
          </div>

          {editMode ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={labelStyle}>タイトル</label>
                <input
                  type="text"
                  value={editForm.title}
                  onChange={e => setEditForm({ ...editForm, title: e.target.value })}
                  maxLength={100}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>本文</label>
                <textarea
                  value={editForm.body}
                  onChange={e => setEditForm({ ...editForm, body: e.target.value })}
                  maxLength={5000}
                  rows={6}
                  style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
                />
              </div>
              <div>
                <label style={labelStyle}>タグ</label>
                <TagInput
                  tags={editForm.tags}
                  onChange={tags => setEditForm({ ...editForm, tags })}
                />
              </div>
              {editError && (
                <div style={{
                  padding: '8px 12px',
                  backgroundColor: C.dangerLight,
                  color: C.danger,
                  borderRadius: 8,
                  fontSize: 13,
                }}>
                  {editError}
                </div>
              )}
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => setEditMode(false)}
                  disabled={savingEdit}
                  style={{
                    flex: 1,
                    padding: '10px',
                    backgroundColor: C.card,
                    color: C.textSub,
                    border: `1px solid ${C.border}`,
                    borderRadius: 8,
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: savingEdit ? 'not-allowed' : 'pointer',
                  }}
                >
                  キャンセル
                </button>
                <button
                  onClick={saveEdit}
                  disabled={savingEdit}
                  style={{
                    flex: 2,
                    padding: '10px',
                    backgroundColor: savingEdit ? C.textMuted : C.accent,
                    color: '#fff',
                    border: 'none',
                    borderRadius: 8,
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: savingEdit ? 'not-allowed' : 'pointer',
                  }}
                >
                  {savingEdit ? '保存中...' : '保存'}
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* タイトル */}
              <h2 style={{ fontSize: 20, fontWeight: 700, color: C.text, lineHeight: 1.4, marginBottom: 12 }}>
                {thread.title}
              </h2>

              {/* タグ */}
              {thread.tags && thread.tags.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 12 }}>
                  {thread.tags.map(tag => (
                    <span key={tag} style={{
                      padding: '2px 8px',
                      backgroundColor: C.accentLight,
                      color: C.accent,
                      borderRadius: 12,
                      fontSize: 11,
                      fontWeight: 600,
                    }}>
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              {/* 主催者・イベント情報 */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, fontSize: 13, color: C.textSub, marginBottom: 16 }}>
                <span>👤 {thread.authorName || '(匿名)'}</span>
                {thread.eventDate && <span>📅 {formatEventDate(thread.eventDate)}</span>}
                {thread.category === 'event' && (
                  <span>👥 {thread.participantCount || 0}{thread.capacity > 0 ? `/${thread.capacity}` : ''}人</span>
                )}
              </div>

              {/* 本文 */}
              <div style={{
                fontSize: 15,
                color: C.text,
                lineHeight: 1.7,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}>
                {thread.body}
              </div>

              {/* アクションボタン群 */}
              <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {/* 主要アクション（参加・興味あり・昇華）— 後続ステップで実装 */}
                {thread.category === 'event' && (() => {
                  const currentCount = thread.participantCount || 0;
                  const isFull = thread.capacity > 0 && currentCount >= thread.capacity;
                  const isParticipating = !!participation;
                  const disabled = togglingParticipation || participation === null || (!isParticipating && isFull);
                  return (
                    <button
                      onClick={toggleParticipation}
                      disabled={disabled}
                      style={{
                        width: '100%',
                        padding: '12px',
                        backgroundColor: isParticipating ? C.accent : (isFull ? C.textMuted : C.card),
                        color: isParticipating ? '#fff' : (isFull ? '#fff' : C.accent),
                        border: `2px solid ${isFull && !isParticipating ? C.textMuted : C.accent}`,
                        borderRadius: 8,
                        fontSize: 15,
                        fontWeight: 600,
                        cursor: disabled ? 'not-allowed' : 'pointer',
                        transition: 'background-color 0.15s ease',
                      }}
                    >
                      {isParticipating
                        ? `✓ 参加済み (${currentCount}${thread.capacity > 0 ? `/${thread.capacity}` : ''})`
                        : isFull
                        ? `😥 満員です (${currentCount}/${thread.capacity})`
                        : `✋ 参加する (${currentCount}${thread.capacity > 0 ? `/${thread.capacity}` : ''})`}
                    </button>
                  );
                })()}
                {thread.category === 'announcement' && (
                  <>
                    <button
                      onClick={toggleInterested}
                      disabled={togglingInterested || hasInterested === null}
                      style={{
                        width: '100%',
                        padding: '12px',
                        backgroundColor: hasInterested ? C.accent : C.card,
                        color: hasInterested ? '#fff' : C.accent,
                        border: `2px solid ${C.accent}`,
                        borderRadius: 8,
                        fontSize: 15,
                        fontWeight: 600,
                        cursor: (togglingInterested || hasInterested === null) ? 'wait' : 'pointer',
                        transition: 'background-color 0.15s ease',
                      }}
                    >
                      {hasInterested ? '✓ 興味あり' : '✋ 興味あり'}
                      {(thread.interestedCount > 0) && ` (${thread.interestedCount})`}
                    </button>
                    {isAuthor && (
                      <button
                        onClick={openPromotionDialog}
                        style={{
                          width: '100%',
                          padding: '12px',
                          backgroundColor: C.card,
                          color: C.accent,
                          border: `2px solid ${C.accent}`,
                          borderRadius: 8,
                          fontSize: 14,
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        🚀 イベントを作成する
                      </button>
                    )}
                  </>
                )}

                {/* 編集・削除申請ボタン
                    - 編集：作成者本人 OR 管理者
                    - 削除申請：作成者本人のみ（管理者は管理画面で直接操作する想定） */}
                {(canEdit || isAuthor) && (
                  <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                    {canEdit && (
                      <button
                        onClick={startEdit}
                        style={{
                          flex: 1,
                          padding: '10px',
                          backgroundColor: C.accentLight,
                          color: C.accent,
                          border: 'none',
                          borderRadius: 8,
                          fontSize: 13,
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        ✏️ 編集{!isAuthor && isAdmin ? '（管理者）' : ''}
                      </button>
                    )}
                    {isAuthor && (
                      <button
                        onClick={() => { setDeletionDialogOpen(true); setDeletionSubmitted(false); }}
                        style={{
                          flex: 1,
                          padding: '10px',
                          backgroundColor: C.dangerLight,
                          color: C.danger,
                          border: 'none',
                          borderRadius: 8,
                          fontSize: 13,
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        🗑️ 削除申請
                      </button>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* 参加者一覧（イベントのみ） */}
        {thread.category === 'event' && (
          <div style={{
            backgroundColor: C.card,
            borderRadius: 12,
            padding: 20,
            boxShadow: C.shadow,
            border: `1px solid ${C.border}`,
            marginBottom: 16,
          }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 14 }}>
              👥 参加者 {participants ? `(${participants.length}${thread.capacity > 0 ? `/${thread.capacity}` : ''})` : ''}
            </h3>
            {participants === null ? (
              <p style={{ color: C.textSub, fontSize: 13, textAlign: 'center', padding: 12 }}>読み込み中...</p>
            ) : participants.length === 0 ? (
              <p style={{ color: C.textSub, fontSize: 13, textAlign: 'center', padding: 12 }}>
                まだ参加者はいません。最初に参加してみましょう！
              </p>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                {participants.map(p => (
                  <div key={p.id} style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 6,
                    width: 64,
                  }}>
                    <div style={{
                      width: 44,
                      height: 44,
                      borderRadius: '50%',
                      backgroundColor: C.accentLight,
                      color: C.accent,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 16,
                      fontWeight: 700,
                    }}>
                      {(p.userName || '?').charAt(0).toUpperCase()}
                    </div>
                    <div style={{
                      fontSize: 11,
                      color: C.text,
                      textAlign: 'center',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      width: '100%',
                    }}>
                      {p.userName || '(匿名)'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* コメントセクション */}
        <div style={{
          backgroundColor: C.card,
          borderRadius: 12,
          padding: 20,
          boxShadow: C.shadow,
          border: `1px solid ${C.border}`,
        }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 14 }}>
            💬 コメント {comments ? `(${comments.length})` : ''}
          </h3>

          {/* コメント一覧 */}
          {comments === null ? (
            <p style={{ color: C.textSub, fontSize: 13, textAlign: 'center', padding: 12 }}>読み込み中...</p>
          ) : comments.length === 0 ? (
            <p style={{ color: C.textSub, fontSize: 13, textAlign: 'center', padding: 12 }}>
              まだコメントがありません。最初のコメントを書きましょう！
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
              {comments.map(c => (
                <div key={c.id} style={{
                  display: 'flex',
                  gap: 10,
                  paddingBottom: 12,
                  borderBottom: `1px solid ${C.border}`,
                }}>
                  {/* アイコン（イニシャル） */}
                  <div style={{
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    backgroundColor: C.accentLight,
                    color: C.accent,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 14,
                    fontWeight: 700,
                    flexShrink: 0,
                  }}>
                    {(c.authorName || '?').charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 4 }}>
                      {c.authorName || '(匿名)'}
                    </div>
                    <div style={{
                      fontSize: 14,
                      color: C.text,
                      lineHeight: 1.6,
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                    }}>
                      {c.body}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* コメント投稿フォーム */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <textarea
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
              placeholder="コメントを書く..."
              maxLength={1000}
              rows={3}
              style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit', fontSize: 14 }}
            />
            {commentError && (
              <div style={{ color: C.danger, fontSize: 12 }}>{commentError}</div>
            )}
            <button
              onClick={postComment}
              disabled={postingComment || !commentText.trim()}
              style={{
                alignSelf: 'flex-end',
                padding: '8px 20px',
                backgroundColor: (postingComment || !commentText.trim()) ? C.textMuted : C.accent,
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                cursor: (postingComment || !commentText.trim()) ? 'not-allowed' : 'pointer',
              }}
            >
              {postingComment ? '投稿中...' : '送信'}
            </button>
          </div>
        </div>
      </div>

      {/* 告知→イベント昇華ダイアログ */}
      {promotionDialogOpen && (
        <>
          <div
            onClick={() => !promoting && setPromotionDialogOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0,0,0,0.5)',
              zIndex: 200,
            }}
          />
          <div style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 'min(90%, 400px)',
            backgroundColor: C.card,
            borderRadius: 12,
            padding: 20,
            zIndex: 201,
            boxShadow: C.shadowMd,
          }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>
              🚀 イベントを作成しますか？
            </h3>

            <div style={{
              padding: '10px 12px',
              backgroundColor: C.warningLight,
              color: C.warning,
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 600,
              marginBottom: 16,
              lineHeight: 1.5,
            }}>
              ⚠️ 一度イベントを作成すると、告知には戻せません
            </div>

            <p style={{ fontSize: 13, color: C.textSub, marginBottom: 14, lineHeight: 1.6 }}>
              開催日時と定員を設定してください（後から編集可能）
            </p>

            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>開催日時（任意）</label>
              <input
                type="datetime-local"
                value={promotionForm.eventDate}
                onChange={e => setPromotionForm({ ...promotionForm, eventDate: e.target.value })}
                style={inputStyle}
              />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>定員（任意・0=無制限）</label>
              <input
                type="number"
                value={promotionForm.capacity}
                onChange={e => setPromotionForm({ ...promotionForm, capacity: e.target.value })}
                min={0}
                placeholder="例：10"
                style={inputStyle}
              />
            </div>

            {promotionError && (
              <div style={{
                padding: '8px 12px',
                backgroundColor: C.dangerLight,
                color: C.danger,
                borderRadius: 8,
                fontSize: 13,
                marginBottom: 12,
              }}>
                {promotionError}
              </div>
            )}

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setPromotionDialogOpen(false)}
                disabled={promoting}
                style={{
                  flex: 1,
                  padding: '10px',
                  backgroundColor: C.card,
                  color: C.textSub,
                  border: `1px solid ${C.border}`,
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: promoting ? 'not-allowed' : 'pointer',
                }}
              >
                キャンセル
              </button>
              <button
                onClick={handlePromote}
                disabled={promoting}
                style={{
                  flex: 2,
                  padding: '10px',
                  backgroundColor: promoting ? C.textMuted : C.accent,
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: promoting ? 'not-allowed' : 'pointer',
                }}
              >
                {promoting ? '処理中...' : '作成する'}
              </button>
            </div>
          </div>
        </>
      )}

      {/* 削除申請ダイアログ */}
      {deletionDialogOpen && (
        <>
          <div
            onClick={() => !submittingDeletion && setDeletionDialogOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0,0,0,0.5)',
              zIndex: 200,
            }}
          />
          <div style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 'min(90%, 360px)',
            backgroundColor: C.card,
            borderRadius: 12,
            padding: 20,
            zIndex: 201,
            boxShadow: C.shadowMd,
          }}>
            {deletionSubmitted ? (
              <>
                <div style={{ textAlign: 'center', fontSize: 40, marginBottom: 12 }}>✅</div>
                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, textAlign: 'center' }}>
                  削除申請を受け付けました
                </h3>
                <p style={{ fontSize: 13, color: C.textSub, marginBottom: 16, textAlign: 'center', lineHeight: 1.6 }}>
                  管理者が確認後、削除されます
                </p>
                <button
                  onClick={() => setDeletionDialogOpen(false)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    backgroundColor: C.accent,
                    color: '#fff',
                    border: 'none',
                    borderRadius: 8,
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  閉じる
                </button>
              </>
            ) : (
              <>
                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>
                  このスレッドの削除を申請しますか？
                </h3>
                <p style={{ fontSize: 13, color: C.textSub, marginBottom: 12, lineHeight: 1.6 }}>
                  申請内容は管理者が確認します。承認されると削除されます
                </p>
                <textarea
                  value={deletionReason}
                  onChange={e => setDeletionReason(e.target.value)}
                  placeholder="削除理由（任意）"
                  rows={3}
                  maxLength={500}
                  style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit', marginBottom: 12 }}
                />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => setDeletionDialogOpen(false)}
                    disabled={submittingDeletion}
                    style={{
                      flex: 1,
                      padding: '10px',
                      backgroundColor: C.card,
                      color: C.textSub,
                      border: `1px solid ${C.border}`,
                      borderRadius: 8,
                      fontSize: 14,
                      fontWeight: 600,
                      cursor: submittingDeletion ? 'not-allowed' : 'pointer',
                    }}
                  >
                    キャンセル
                  </button>
                  <button
                    onClick={submitDeletionRequest}
                    disabled={submittingDeletion}
                    style={{
                      flex: 1,
                      padding: '10px',
                      backgroundColor: submittingDeletion ? C.textMuted : C.danger,
                      color: '#fff',
                      border: 'none',
                      borderRadius: 8,
                      fontSize: 14,
                      fontWeight: 600,
                      cursor: submittingDeletion ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {submittingDeletion ? '送信中...' : '申請する'}
                  </button>
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ショップ画面（スケルトン）
// ============================================================
// 交換確認モーダル（ShopScreen から表示）
// ============================================================
// 申請前の最終確認。ユーザーは取り消し不可なのでここで注意喚起する
function ExchangeConfirmModal({ item, profile, onClose, onConfirm, submitting, error }) {
  const remaining = (profile?.azCoins || 0) - (item?.coinCost || 0);
  return (
    <>
      <div
        onClick={submitting ? undefined : onClose}
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          zIndex: 200,
        }}
      />
      <div style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 'calc(100% - 32px)',
        maxWidth: 380,
        backgroundColor: C.card,
        borderRadius: 16,
        boxShadow: C.shadowMd,
        zIndex: 201,
        padding: 20,
        boxSizing: 'border-box',
      }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 12, textAlign: 'center' }}>
          🛍️ 交換申請の確認
        </h3>

        {/* 商品サマリー */}
        <div style={{
          padding: 12,
          backgroundColor: C.bg,
          borderRadius: 10,
          border: `1px solid ${C.border}`,
          marginBottom: 14,
        }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 6 }}>
            {item?.name}
          </div>
          <div style={{ fontSize: 13, color: C.textSub }}>
            必要コイン：<span style={{ color: '#b8860b', fontWeight: 700 }}>🪙 {item?.coinCost}</span>
          </div>
          <div style={{ fontSize: 12, color: C.textSub, marginTop: 4 }}>
            交換後の残高：🪙 {remaining}
          </div>
        </div>

        {/* 注意事項 */}
        <div style={{
          padding: 12,
          backgroundColor: C.warningLight,
          color: '#9a6700',
          borderRadius: 10,
          fontSize: 12,
          lineHeight: 1.6,
          marginBottom: 14,
          border: `1px solid ${C.warning}`,
        }}>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>⚠️ 申請前にご確認ください</div>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            <li>申請を送信すると、コイン {item?.coinCost} は<b>即時に引き当て</b>されます</li>
            <li><b>申請後の取り消しはできません</b></li>
            <li>管理者が却下した場合のみ、コインは返金されます</li>
            <li>承認・受け渡しは管理者の対応をお待ちください</li>
          </ul>
        </div>

        {error && (
          <div style={{
            padding: '8px 12px',
            backgroundColor: C.dangerLight,
            color: C.danger,
            borderRadius: 8,
            fontSize: 13,
            marginBottom: 12,
          }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={onClose}
            disabled={submitting}
            style={{
              flex: 1,
              padding: '12px',
              backgroundColor: C.bg,
              color: C.text,
              border: `1px solid ${C.border}`,
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              cursor: submitting ? 'not-allowed' : 'pointer',
            }}
          >
            キャンセル
          </button>
          <button
            onClick={onConfirm}
            disabled={submitting}
            style={{
              flex: 1,
              padding: '12px',
              backgroundColor: submitting ? C.textMuted : C.accent,
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 700,
              cursor: submitting ? 'not-allowed' : 'pointer',
            }}
          >
            {submitting ? '送信中...' : '申請する'}
          </button>
        </div>
      </div>
    </>
  );
}

// ============================================================
// ポイント交換画面（ShopScreen）
// ============================================================
// - 公開中の商品を一覧表示（在庫切れもグレーアウトで表示）
// - 「交換する」→ 確認モーダル → 申請処理
// - 申請時に writeBatch で：①exchangeRequests 作成 ②users.azCoins -= ③shopItems.stock -= ④coinTransactions 記録
function ShopScreen({ user, profile }) {
  const [items, setItems] = useState(null);
  const [confirmItem, setConfirmItem] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    // 公開中フィルタはクライアント側で実施（複合インデックス不要）
    const q = query(collection(db, 'shopItems'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snap) => {
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setItems(all.filter(i => i.isActive !== false));
    }, (err) => {
      console.error('商品取得失敗', err);
    });
  }, []);

  const openConfirm = (item) => {
    setSubmitError('');
    setConfirmItem(item);
  };
  const closeConfirm = () => {
    if (submitting) return;
    setConfirmItem(null);
    setSubmitError('');
  };

  const handleSubmit = async () => {
    if (!confirmItem) return;
    setSubmitting(true);
    setSubmitError('');
    try {
      // 最新状態で再チェック（在庫・公開状態・残高）
      const itemRef = doc(db, 'shopItems', confirmItem.id);
      const itemSnap = await getDoc(itemRef);
      if (!itemSnap.exists() || itemSnap.data().isActive === false) {
        throw new Error('この商品は現在交換できません');
      }
      const latest = itemSnap.data();
      if ((latest.stock ?? 0) === 0) {
        throw new Error('在庫切れになりました');
      }
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);
      const currentCoins = userSnap.data()?.azCoins || 0;
      if (currentCoins < latest.coinCost) {
        throw new Error('コインが不足しています');
      }

      const batch = writeBatch(db);
      const reqRef = doc(collection(db, 'exchangeRequests'));
      batch.set(reqRef, {
        userId: user.uid,
        userName: profile.name || '',
        itemId: confirmItem.id,
        itemName: latest.name,
        itemImageUrl: latest.imageUrl || '',
        coinCost: latest.coinCost,
        status: 'pending',
        createdAt: serverTimestamp(),
      });
      batch.update(userRef, {
        azCoins: increment(-latest.coinCost),
      });
      // 在庫が有限なら -1（無制限 = -1 はそのまま）
      if ((latest.stock ?? 0) > 0) {
        batch.update(itemRef, {
          stock: increment(-1),
        });
      }
      batch.set(doc(collection(db, 'coinTransactions')), {
        userId: user.uid,
        userName: profile.name || '',
        amount: -latest.coinCost,
        reason: `🛍️ 「${latest.name}」を交換申請`,
        grantedBy: 'system',
        relatedRequestId: reqRef.id,
        createdAt: serverTimestamp(),
      });
      await batch.commit();

      setConfirmItem(null);
      setSuccessMsg('交換申請を受け付けました。管理者の承認をお待ちください');
      setTimeout(() => setSuccessMsg(''), 6000);
    } catch (err) {
      console.error('交換申請失敗', err);
      setSubmitError(err.message || '交換申請に失敗しました');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <Header title="ポイント交換" coinBalance={profile.azCoins} />
      <div style={{ padding: '16px 16px 100px' }}>
        {successMsg && (
          <div style={{
            padding: '10px 14px',
            backgroundColor: C.successLight,
            color: C.success,
            borderRadius: 10,
            fontSize: 13,
            fontWeight: 600,
            marginBottom: 12,
            border: `1px solid ${C.success}`,
          }}>
            ✅ {successMsg}
          </div>
        )}

        {items === null ? (
          <p style={{ color: C.textSub, fontSize: 13, textAlign: 'center', padding: 20 }}>読み込み中...</p>
        ) : items.length === 0 ? (
          <div style={{ textAlign: 'center', color: C.textSub, marginTop: 60 }}>
            <div style={{ fontSize: 48 }}>🛍️</div>
            <p style={{ marginTop: 12, fontSize: 14 }}>交換できる商品はまだありません</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {items.map(item => {
              const stock = item.stock ?? 0;
              const soldOut = stock === 0;
              const notEnough = (profile.azCoins || 0) < (item.coinCost || 0);
              const disabled  = soldOut || notEnough;
              return (
                <div
                  key={item.id}
                  style={{
                    backgroundColor: C.card,
                    borderRadius: 12,
                    boxShadow: C.shadow,
                    border: `1px solid ${C.border}`,
                    overflow: 'hidden',
                    opacity: soldOut ? 0.55 : 1,
                  }}
                >
                  {/* 画像 */}
                  <div style={{
                    position: 'relative',
                    width: '100%',
                    aspectRatio: '16 / 9',
                    backgroundColor: C.bg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 56,
                    overflow: 'hidden',
                  }}>
                    <span style={{ position: 'absolute', zIndex: 0 }}>🛍️</span>
                    {item.imageUrl && (
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'relative', zIndex: 1 }}
                        onError={e => { e.target.style.display = 'none'; }}
                      />
                    )}
                    {soldOut && (
                      <div style={{
                        position: 'absolute',
                        top: 8,
                        left: 8,
                        padding: '4px 10px',
                        backgroundColor: C.danger,
                        color: '#fff',
                        borderRadius: 12,
                        fontSize: 11,
                        fontWeight: 700,
                        zIndex: 2,
                      }}>
                        在庫切れ
                      </div>
                    )}
                  </div>

                  {/* 内容 */}
                  <div style={{ padding: 14 }}>
                    <div style={{
                      fontSize: 15,
                      fontWeight: 700,
                      color: C.text,
                      marginBottom: 4,
                    }}>
                      {item.name}
                    </div>
                    {item.description && (
                      <div style={{
                        fontSize: 12,
                        color: C.textSub,
                        marginBottom: 10,
                        whiteSpace: 'pre-wrap',
                        lineHeight: 1.5,
                      }}>
                        {item.description}
                      </div>
                    )}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: 12,
                    }}>
                      <div style={{
                        fontSize: 16,
                        fontWeight: 700,
                        color: '#b8860b',
                      }}>
                        🪙 {item.coinCost}
                      </div>
                      <div style={{ fontSize: 11, color: C.textSub }}>
                        {stock < 0 ? '在庫: ∞' : `在庫: ${stock}`}
                      </div>
                    </div>
                    <button
                      onClick={() => openConfirm(item)}
                      disabled={disabled}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        backgroundColor: disabled ? C.bg : C.accent,
                        color: disabled ? C.textMuted : '#fff',
                        border: disabled ? `1px solid ${C.border}` : 'none',
                        borderRadius: 8,
                        fontSize: 14,
                        fontWeight: 700,
                        cursor: disabled ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {soldOut
                        ? '在庫切れ'
                        : notEnough
                          ? `🪙 あと ${item.coinCost - (profile.azCoins || 0)} 必要`
                          : '🛍️ 交換する'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {confirmItem && (
        <ExchangeConfirmModal
          item={confirmItem}
          profile={profile}
          onClose={closeConfirm}
          onConfirm={handleSubmit}
          submitting={submitting}
          error={submitError}
        />
      )}
    </div>
  );
}

// タグ入力（チップ形式）
function TagInput({ tags, onChange }) {
  const [input, setInput] = useState('');

  const addTag = (raw) => {
    const value = raw.trim();
    setInput(''); // 重複・空でも入力欄は必ずクリア
    if (!value || tags.includes(value)) return;
    onChange([...tags, value]);
  };

  const removeTag = (tag) => {
    onChange(tags.filter(t => t !== tag));
  };

  const handleKeyDown = (e) => {
    // IME（日本語）変換中の Enter は確定操作なのでタグ追加を無視
    if (e.nativeEvent.isComposing || e.keyCode === 229) return;
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(input);
    } else if (e.key === 'Backspace' && !input && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexWrap: 'wrap',
      gap: 6,
      padding: 8,
      border: `1px solid ${C.border}`,
      borderRadius: 8,
      backgroundColor: C.card,
      minHeight: 44,
    }}>
      {tags.map(tag => (
        <span key={tag} style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          padding: '4px 10px',
          backgroundColor: C.accentLight,
          color: C.accent,
          borderRadius: 20,
          fontSize: 13,
          fontWeight: 600,
        }}>
          {tag}
          <button
            type="button"
            onClick={() => removeTag(tag)}
            style={{
              background: 'none',
              border: 'none',
              color: C.accent,
              cursor: 'pointer',
              padding: 0,
              marginLeft: 2,
              fontSize: 16,
              lineHeight: 1,
            }}
          >×</button>
        </span>
      ))}
      <input
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => input && addTag(input)}
        placeholder={tags.length === 0 ? 'タグを入力（Enterで追加）' : ''}
        style={{
          flex: 1,
          minWidth: 120,
          border: 'none',
          outline: 'none',
          fontSize: 14,
          padding: '4px 6px',
          backgroundColor: 'transparent',
        }}
      />
    </div>
  );
}

// ============================================================
// 管理画面：お知らせタブ
// ============================================================
// - 新規お知らせ投稿フォーム（常に announcement + isOfficial: true）
// - 既存スレッド一覧で公式化/解除をトグル
function AdminAnnouncementTab({ user, profile }) {
  // 投稿フォーム
  const [title, setTitle] = useState('');
  const [body, setBody]   = useState('');
  const [tags, setTags]   = useState([]);
  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState('');
  const [postSuccess, setPostSuccess] = useState(false);

  // 既存スレッド一覧（公式化トグル用）
  const [threads, setThreads] = useState(null);
  const [togglingId, setTogglingId] = useState(null);

  useEffect(() => {
    const q = query(collection(db, 'threads'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snap) => {
      setThreads(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  }, []);

  const handlePost = async () => {
    if (!title.trim()) { setPostError('タイトルを入力してください'); return; }
    if (!body.trim())  { setPostError('本文を入力してください'); return; }
    setPostError('');
    setPosting(true);
    try {
      await addDoc(collection(db, 'threads'), {
        authorId: user.uid,
        authorName: profile.name || '管理者',
        title: title.trim(),
        body: body.trim(),
        category: 'announcement',
        tags,
        eventDate: null,
        capacity: 0,
        status: 'open',
        participantCount: 0,
        commentCount: 0,
        interestedCount: 0,
        promotedFrom: null,
        isOfficial: true,           // ← 公式お知らせフラグ
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setTitle(''); setBody(''); setTags([]);
      setPostSuccess(true);
      setTimeout(() => setPostSuccess(false), 3000);
    } catch (err) {
      console.error('お知らせ投稿失敗', err);
      setPostError('投稿に失敗しました');
    } finally {
      setPosting(false);
    }
  };

  const toggleOfficial = async (thread) => {
    setTogglingId(thread.id);
    try {
      await updateDoc(doc(db, 'threads', thread.id), {
        isOfficial: !thread.isOfficial,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.error('公式化トグル失敗', err);
      alert('処理に失敗しました');
    } finally {
      setTogglingId(null);
    }
  };

  const labelStyle = { fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 6, display: 'block' };
  const inputStyle = {
    width: '100%',
    padding: '10px 12px',
    border: `1px solid ${C.border}`,
    borderRadius: 8,
    fontSize: 15,
    color: C.text,
    backgroundColor: C.card,
    outline: 'none',
    boxSizing: 'border-box',
  };
  const cardStyle = {
    backgroundColor: C.card,
    borderRadius: 12,
    padding: 16,
    boxShadow: C.shadow,
    border: `1px solid ${C.border}`,
    marginBottom: 16,
  };

  return (
    <div>
      {/* 新規お知らせ投稿フォーム */}
      <div style={cardStyle}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 12 }}>
          📢 新規お知らせを投稿
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={labelStyle}>タイトル <span style={{ color: C.danger }}>*</span></label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              maxLength={100}
              placeholder="例：新オフィス開設のお知らせ"
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>本文 <span style={{ color: C.danger }}>*</span></label>
            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              maxLength={5000}
              rows={5}
              style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
              placeholder="お知らせの内容を記入..."
            />
          </div>
          <div>
            <label style={labelStyle}>タグ（任意）</label>
            <TagInput tags={tags} onChange={setTags} />
          </div>

          {postError && (
            <div style={{
              padding: '8px 12px',
              backgroundColor: C.dangerLight,
              color: C.danger,
              borderRadius: 8,
              fontSize: 13,
            }}>
              {postError}
            </div>
          )}
          {postSuccess && (
            <div style={{
              padding: '8px 12px',
              backgroundColor: C.successLight,
              color: C.success,
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
            }}>
              ✅ お知らせを投稿しました
            </div>
          )}

          <button
            onClick={handlePost}
            disabled={posting}
            style={{
              padding: '12px',
              backgroundColor: posting ? C.textMuted : C.accent,
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              fontSize: 15,
              fontWeight: 600,
              cursor: posting ? 'not-allowed' : 'pointer',
            }}
          >
            {posting ? '投稿中...' : '📢 公式お知らせとして投稿'}
          </button>
        </div>
      </div>

      {/* 既存スレッドの公式化トグル */}
      <div style={cardStyle}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 4 }}>
          📋 既存スレッドの公式化
        </h3>
        <p style={{ fontSize: 12, color: C.textSub, marginBottom: 12 }}>
          通常のスレッドを公式お知らせに昇格できます
        </p>

        {threads === null ? (
          <p style={{ color: C.textSub, fontSize: 13, textAlign: 'center', padding: 12 }}>
            読み込み中...
          </p>
        ) : threads.length === 0 ? (
          <p style={{ color: C.textSub, fontSize: 13, textAlign: 'center', padding: 12 }}>
            スレッドがありません
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {threads.map(t => (
              <div
                key={t.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: 10,
                  backgroundColor: t.isOfficial ? C.accentLight : C.bg,
                  borderRadius: 8,
                  border: `1px solid ${t.isOfficial ? C.accent : C.border}`,
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: C.text,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                  }}>
                    {t.isOfficial && <span style={{ fontSize: 10, color: C.accent, fontWeight: 700 }}>📢</span>}
                    {t.title}
                  </div>
                  <div style={{ fontSize: 11, color: C.textSub, marginTop: 2 }}>
                    {CATEGORY_MAP[t.category]?.label} / {t.authorName || '(匿名)'}
                  </div>
                </div>
                <button
                  onClick={() => toggleOfficial(t)}
                  disabled={togglingId === t.id}
                  style={{
                    padding: '6px 10px',
                    backgroundColor: t.isOfficial ? C.dangerLight : C.accent,
                    color: t.isOfficial ? C.danger : '#fff',
                    border: 'none',
                    borderRadius: 6,
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: togglingId === t.id ? 'not-allowed' : 'pointer',
                    flexShrink: 0,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {togglingId === t.id ? '処理中' : (t.isOfficial ? '公式から外す' : '公式にする')}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// 管理画面：イベント完了処理タブ
// ============================================================
// - 全イベントを 3 セクションに分けて表示：要対応 / 未開催 / 完了済み
// - 完了処理時は writeBatch でアトミックに：
//   * thread.status = 'completed'
//   * 参加者全員：eventCount +1, azCoins +10, coinTransactions に記録
//   * 主催者：hostCount +1, azCoins +30, coinTransactions に記録
function AdminEventCompletionTab({ user }) {
  const [events, setEvents] = useState(null);
  const [confirmThread, setConfirmThread] = useState(null);
  const [completing, setCompleting] = useState(false);

  useEffect(() => {
    // 全スレッドを取得して category=event でフィルタ（インデックス不要）
    const q = query(collection(db, 'threads'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snap) => {
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setEvents(all.filter(t => t.category === 'event'));
    }, (err) => {
      console.error('イベント取得失敗', err);
    });
    return unsubscribe;
  }, []);

  // 3セクションに分類
  const now = new Date();
  const pendingPast = [];          // 開催済み・未完了（要対応）
  const pendingUpcoming = [];      // 未開催・日時未設定（待機）
  const completed = [];            // 完了済み

  if (events) {
    events.forEach(t => {
      if (t.status === 'completed') {
        completed.push(t);
        return;
      }
      const date = t.eventDate && t.eventDate.toDate ? t.eventDate.toDate() : null;
      if (date && date < now) {
        pendingPast.push(t);
      } else {
        pendingUpcoming.push(t);
      }
    });
    // 並び替え
    pendingPast.sort((a, b) => b.eventDate.toDate() - a.eventDate.toDate());
    pendingUpcoming.sort((a, b) => {
      const da = a.eventDate?.toDate ? a.eventDate.toDate() : new Date(8640000000000000);
      const dbb = b.eventDate?.toDate ? b.eventDate.toDate() : new Date(8640000000000000);
      return da - dbb;
    });
  }

  // 完了処理（writeBatch でアトミック実行）
  const completeEvent = async () => {
    if (!confirmThread) return;
    const thread = confirmThread;
    setCompleting(true);
    try {
      // 1. 参加者IDリストを取得
      const participationsSnap = await getDocs(collection(db, 'threads', thread.id, 'participations'));
      const participantIds = participationsSnap.docs.map(d => d.id);

      // 2. アトミック更新
      const batch = writeBatch(db);

      // スレッドのステータス更新
      batch.update(doc(db, 'threads', thread.id), {
        status: 'completed',
        updatedAt: serverTimestamp(),
      });

      // 参加者全員：eventCount +1, azCoins +10, coinTransaction 記録
      for (const pid of participantIds) {
        batch.update(doc(db, 'users', pid), {
          eventCount: increment(1),
          azCoins:    increment(10),
        });
        const txRef = doc(collection(db, 'coinTransactions'));
        batch.set(txRef, {
          userId: pid,
          amount: 10,
          reason: 'イベント参加',
          relatedThreadId: thread.id,
          relatedThreadTitle: thread.title,
          grantedBy: user.uid,
          createdAt: serverTimestamp(),
        });
      }

      // 主催者：hostCount +1, azCoins +30, coinTransaction 記録
      // ※ 主催者が自身の参加申請も出していた場合は、上で参加者ボーナスも別途付与される
      if (thread.authorId) {
        batch.update(doc(db, 'users', thread.authorId), {
          hostCount: increment(1),
          azCoins:   increment(30),
        });
        const authorTxRef = doc(collection(db, 'coinTransactions'));
        batch.set(authorTxRef, {
          userId: thread.authorId,
          amount: 30,
          reason: 'イベント主催',
          relatedThreadId: thread.id,
          relatedThreadTitle: thread.title,
          grantedBy: user.uid,
          createdAt: serverTimestamp(),
        });
      }

      await batch.commit();
      setConfirmThread(null);
    } catch (err) {
      console.error('完了処理失敗', err);
      alert('処理に失敗しました：' + (err.message || err));
    } finally {
      setCompleting(false);
    }
  };

  const cardStyle = {
    backgroundColor: C.card,
    borderRadius: 12,
    padding: 16,
    boxShadow: C.shadow,
    border: `1px solid ${C.border}`,
    marginBottom: 16,
  };

  const renderEventRow = (t, actionable) => (
    <div
      key={t.id}
      style={{
        display: 'flex',
        gap: 10,
        padding: 10,
        backgroundColor: C.bg,
        borderRadius: 8,
        border: `1px solid ${C.border}`,
        marginBottom: 8,
        alignItems: 'center',
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 13,
          fontWeight: 600,
          color: C.text,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          marginBottom: 2,
        }}>
          {t.title}
        </div>
        <div style={{ fontSize: 11, color: C.textSub, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <span>👤 {t.authorName || '(匿名)'}</span>
          <span>📅 {t.eventDate ? formatEventDate(t.eventDate) : '日時未設定'}</span>
          <span>👥 {t.participantCount || 0}人</span>
        </div>
      </div>
      {actionable ? (
        <button
          onClick={() => setConfirmThread(t)}
          style={{
            padding: '8px 12px',
            backgroundColor: C.accent,
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            fontSize: 12,
            fontWeight: 700,
            cursor: 'pointer',
            flexShrink: 0,
            whiteSpace: 'nowrap',
          }}
        >
          ✅ 完了処理
        </button>
      ) : (
        <span style={{
          padding: '4px 10px',
          backgroundColor: C.successLight,
          color: C.success,
          borderRadius: 12,
          fontSize: 11,
          fontWeight: 700,
          flexShrink: 0,
          whiteSpace: 'nowrap',
        }}>
          ✓ 完了済み
        </span>
      )}
    </div>
  );

  return (
    <div>
      {events === null ? (
        <p style={{ textAlign: 'center', color: C.textSub, padding: 40 }}>読み込み中...</p>
      ) : (
        <>
          {/* 要対応：開催日時を過ぎた未完了 */}
          <div style={cardStyle}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 4 }}>
              🔴 開催済み・未完了 ({pendingPast.length})
            </h3>
            <p style={{ fontSize: 12, color: C.textSub, marginBottom: 12 }}>
              開催日時が過ぎたイベントです。完了処理してコイン・ランクを付与しましょう
            </p>
            {pendingPast.length === 0 ? (
              <p style={{ color: C.textSub, fontSize: 13, textAlign: 'center', padding: 12 }}>
                対応待ちのイベントはありません
              </p>
            ) : (
              pendingPast.map(t => renderEventRow(t, true))
            )}
          </div>

          {/* 未開催・日時未設定 */}
          <div style={cardStyle}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 4 }}>
              📅 未開催・日時未設定 ({pendingUpcoming.length})
            </h3>
            <p style={{ fontSize: 12, color: C.textSub, marginBottom: 12 }}>
              未来開催のイベント、または開催日時が未設定のイベント。必要に応じて完了処理可能です
            </p>
            {pendingUpcoming.length === 0 ? (
              <p style={{ color: C.textSub, fontSize: 13, textAlign: 'center', padding: 12 }}>
                未開催のイベントはありません
              </p>
            ) : (
              pendingUpcoming.map(t => renderEventRow(t, true))
            )}
          </div>

          {/* 完了済み */}
          <div style={cardStyle}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 12 }}>
              ✅ 完了済み ({completed.length})
            </h3>
            {completed.length === 0 ? (
              <p style={{ color: C.textSub, fontSize: 13, textAlign: 'center', padding: 12 }}>
                完了済みイベントはありません
              </p>
            ) : (
              completed.map(t => renderEventRow(t, false))
            )}
          </div>
        </>
      )}

      {/* 完了処理 確認ダイアログ */}
      {confirmThread && (
        <>
          <div
            onClick={() => !completing && setConfirmThread(null)}
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0,0,0,0.5)',
              zIndex: 200,
            }}
          />
          <div style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 'min(90%, 380px)',
            backgroundColor: C.card,
            borderRadius: 12,
            padding: 20,
            zIndex: 201,
            boxShadow: C.shadowMd,
          }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>
              ✅ イベントを完了処理しますか？
            </h3>
            <div style={{
              padding: '10px 12px',
              backgroundColor: C.bg,
              borderRadius: 8,
              fontSize: 13,
              marginBottom: 12,
              border: `1px solid ${C.border}`,
            }}>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>{confirmThread.title}</div>
              <div style={{ fontSize: 12, color: C.textSub }}>
                参加者：{confirmThread.participantCount || 0}人 / 主催：{confirmThread.authorName}
              </div>
            </div>
            <div style={{
              padding: '10px 12px',
              backgroundColor: C.warningLight,
              color: C.warning,
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 600,
              marginBottom: 12,
              lineHeight: 1.6,
            }}>
              ⚠️ 完了処理を取り消すことはできません<br />
              ・参加者全員に <strong>+10コイン</strong> と <strong>参加カウント+1</strong><br />
              ・主催者に <strong>+30コイン</strong> と <strong>主催カウント+1</strong>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setConfirmThread(null)}
                disabled={completing}
                style={{
                  flex: 1,
                  padding: '10px',
                  backgroundColor: C.card,
                  color: C.textSub,
                  border: `1px solid ${C.border}`,
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: completing ? 'not-allowed' : 'pointer',
                }}
              >
                キャンセル
              </button>
              <button
                onClick={completeEvent}
                disabled={completing}
                style={{
                  flex: 2,
                  padding: '10px',
                  backgroundColor: completing ? C.textMuted : C.accent,
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: completing ? 'not-allowed' : 'pointer',
                }}
              >
                {completing ? '処理中...' : '完了処理を実行'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ============================================================
// 管理画面：削除申請承認タブ
// ============================================================
// - deletionRequests/ を購読し、未処理 / 履歴 の2セクションに分けて表示
// - 承認：スレッド本体 + サブコレクション(comments, interested, participations) を完全削除
// - 却下：理由を入力可、申請ドキュメントのみ更新（スレッドは残る）
function AdminDeletionRequestsTab({ user }) {
  const [requests, setRequests] = useState(null);
  const [confirmApprove, setConfirmApprove] = useState(null); // 承認確認ダイアログ対象
  const [rejectingRequest, setRejectingRequest] = useState(null); // 却下対象
  const [rejectReason, setRejectReason] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'deletionRequests'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snap) => {
      setRequests(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => {
      console.error('削除申請取得失敗', err);
    });
    return unsubscribe;
  }, []);

  const pending = requests ? requests.filter(r => r.status === 'pending') : [];
  const processed = requests ? requests.filter(r => r.status !== 'pending') : [];

  // 承認処理：スレッドとサブコレクションを完全削除
  const approveRequest = async () => {
    if (!confirmApprove) return;
    const req = confirmApprove;
    setProcessing(true);
    try {
      // 1. サブコレクションを順に削除
      const subcollections = ['comments', 'interested', 'participations'];
      for (const subName of subcollections) {
        const subSnap = await getDocs(collection(db, 'threads', req.threadId, subName));
        if (subSnap.empty) continue;
        // 500件ずつバッチ削除（Firestoreのバッチ上限）
        let batch = writeBatch(db);
        let count = 0;
        for (const docSnap of subSnap.docs) {
          batch.delete(docSnap.ref);
          count++;
          if (count >= 500) {
            await batch.commit();
            batch = writeBatch(db);
            count = 0;
          }
        }
        if (count > 0) await batch.commit();
      }

      // 2. スレッド本体を削除（既に削除済みなら no-op）
      await deleteDoc(doc(db, 'threads', req.threadId));

      // 3. 申請ステータスを承認に更新
      await updateDoc(doc(db, 'deletionRequests', req.id), {
        status: 'approved',
        reviewedAt: serverTimestamp(),
        reviewedBy: user.uid,
        reviewedByName: user.email || '',
      });

      setConfirmApprove(null);
    } catch (err) {
      console.error('承認失敗', err);
      alert('処理に失敗しました：' + (err.message || err));
    } finally {
      setProcessing(false);
    }
  };

  // 却下処理（理由入力可）
  const submitReject = async () => {
    if (!rejectingRequest) return;
    setProcessing(true);
    try {
      await updateDoc(doc(db, 'deletionRequests', rejectingRequest.id), {
        status: 'rejected',
        rejectReason: rejectReason.trim(),
        reviewedAt: serverTimestamp(),
        reviewedBy: user.uid,
        reviewedByName: user.email || '',
      });
      setRejectingRequest(null);
      setRejectReason('');
    } catch (err) {
      console.error('却下失敗', err);
      alert('処理に失敗しました');
    } finally {
      setProcessing(false);
    }
  };

  const cardStyle = {
    backgroundColor: C.card,
    borderRadius: 12,
    padding: 16,
    boxShadow: C.shadow,
    border: `1px solid ${C.border}`,
    marginBottom: 16,
  };

  const renderPending = (req) => (
    <div
      key={req.id}
      style={{
        padding: 12,
        backgroundColor: C.dangerLight,
        borderRadius: 8,
        border: `1px solid ${C.danger}`,
        marginBottom: 8,
      }}
    >
      <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 4 }}>
        🗑️ {req.threadTitle || '(タイトル不明)'}
      </div>
      <div style={{ fontSize: 11, color: C.textSub, marginBottom: 6 }}>
        申請者：{req.requestedByName || '(匿名)'} / {req.createdAt ? formatEventDate(req.createdAt) : ''}
      </div>
      {req.reason && (
        <div style={{
          fontSize: 12,
          color: C.text,
          backgroundColor: C.card,
          padding: '8px 10px',
          borderRadius: 6,
          marginBottom: 8,
          lineHeight: 1.5,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}>
          理由：{req.reason}
        </div>
      )}
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={() => { setRejectingRequest(req); setRejectReason(''); }}
          style={{
            flex: 1,
            padding: '8px',
            backgroundColor: C.card,
            color: C.textSub,
            border: `1px solid ${C.border}`,
            borderRadius: 6,
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          却下
        </button>
        <button
          onClick={() => setConfirmApprove(req)}
          style={{
            flex: 1,
            padding: '8px',
            backgroundColor: C.danger,
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            fontSize: 12,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          承認して削除
        </button>
      </div>
    </div>
  );

  const renderProcessed = (req) => {
    const isApproved = req.status === 'approved';
    return (
      <div
        key={req.id}
        style={{
          padding: 10,
          backgroundColor: C.bg,
          borderRadius: 6,
          marginBottom: 6,
          fontSize: 12,
          border: `1px solid ${C.border}`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
          <span style={{
            padding: '1px 6px',
            backgroundColor: isApproved ? C.successLight : C.bg,
            color: isApproved ? C.success : C.textSub,
            borderRadius: 10,
            fontSize: 10,
            fontWeight: 700,
            border: `1px solid ${isApproved ? C.success : C.border}`,
          }}>
            {isApproved ? '✓ 承認' : '✕ 却下'}
          </span>
          <span style={{
            fontWeight: 600,
            color: C.text,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            flex: 1,
            minWidth: 0,
          }}>
            {req.threadTitle || '(削除済み)'}
          </span>
        </div>
        <div style={{ fontSize: 11, color: C.textSub }}>
          申請：{req.requestedByName || '(匿名)'}
          {req.reviewedAt && (
            <> / 処理：{formatEventDate(req.reviewedAt)}</>
          )}
        </div>
        {!isApproved && req.rejectReason && (
          <div style={{ fontSize: 11, color: C.textSub, marginTop: 4, fontStyle: 'italic' }}>
            却下理由：{req.rejectReason}
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      {requests === null ? (
        <p style={{ textAlign: 'center', color: C.textSub, padding: 40 }}>読み込み中...</p>
      ) : (
        <>
          {/* 未処理 */}
          <div style={cardStyle}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 4 }}>
              🔴 未処理の削除申請 ({pending.length})
            </h3>
            <p style={{ fontSize: 12, color: C.textSub, marginBottom: 12 }}>
              申請者の理由を確認の上、承認または却下してください
            </p>
            {pending.length === 0 ? (
              <p style={{ color: C.textSub, fontSize: 13, textAlign: 'center', padding: 12 }}>
                未処理の削除申請はありません
              </p>
            ) : (
              pending.map(renderPending)
            )}
          </div>

          {/* 履歴 */}
          <div style={cardStyle}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 12 }}>
              📜 処理済み履歴 ({processed.length})
            </h3>
            {processed.length === 0 ? (
              <p style={{ color: C.textSub, fontSize: 13, textAlign: 'center', padding: 12 }}>
                処理済みの履歴はありません
              </p>
            ) : (
              processed.map(renderProcessed)
            )}
          </div>
        </>
      )}

      {/* 承認確認ダイアログ */}
      {confirmApprove && (
        <>
          <div
            onClick={() => !processing && setConfirmApprove(null)}
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0,0,0,0.5)',
              zIndex: 200,
            }}
          />
          <div style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 'min(90%, 380px)',
            backgroundColor: C.card,
            borderRadius: 12,
            padding: 20,
            zIndex: 201,
            boxShadow: C.shadowMd,
          }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>
              🗑️ スレッドを削除しますか？
            </h3>
            <div style={{
              padding: '10px 12px',
              backgroundColor: C.bg,
              borderRadius: 8,
              fontSize: 13,
              marginBottom: 12,
              border: `1px solid ${C.border}`,
            }}>
              <div style={{ fontWeight: 700 }}>{confirmApprove.threadTitle}</div>
            </div>
            <div style={{
              padding: '10px 12px',
              backgroundColor: C.dangerLight,
              color: C.danger,
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 600,
              marginBottom: 12,
              lineHeight: 1.6,
            }}>
              ⚠️ この操作は取り消せません<br />
              スレッド本体・コメント・参加者情報・興味あり情報がすべて削除されます
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setConfirmApprove(null)}
                disabled={processing}
                style={{
                  flex: 1,
                  padding: '10px',
                  backgroundColor: C.card,
                  color: C.textSub,
                  border: `1px solid ${C.border}`,
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: processing ? 'not-allowed' : 'pointer',
                }}
              >
                キャンセル
              </button>
              <button
                onClick={approveRequest}
                disabled={processing}
                style={{
                  flex: 2,
                  padding: '10px',
                  backgroundColor: processing ? C.textMuted : C.danger,
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: processing ? 'not-allowed' : 'pointer',
                }}
              >
                {processing ? '削除中...' : '承認して完全削除'}
              </button>
            </div>
          </div>
        </>
      )}

      {/* 却下ダイアログ */}
      {rejectingRequest && (
        <>
          <div
            onClick={() => !processing && setRejectingRequest(null)}
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0,0,0,0.5)',
              zIndex: 200,
            }}
          />
          <div style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 'min(90%, 380px)',
            backgroundColor: C.card,
            borderRadius: 12,
            padding: 20,
            zIndex: 201,
            boxShadow: C.shadowMd,
          }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>
              削除申請を却下しますか？
            </h3>
            <p style={{ fontSize: 13, color: C.textSub, marginBottom: 12 }}>
              スレッドはそのまま残ります。却下理由は履歴に記録されます
            </p>
            <textarea
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              placeholder="却下理由（任意）"
              maxLength={500}
              rows={3}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: `1px solid ${C.border}`,
                borderRadius: 8,
                fontSize: 14,
                resize: 'vertical',
                fontFamily: 'inherit',
                outline: 'none',
                boxSizing: 'border-box',
                marginBottom: 12,
              }}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setRejectingRequest(null)}
                disabled={processing}
                style={{
                  flex: 1,
                  padding: '10px',
                  backgroundColor: C.card,
                  color: C.textSub,
                  border: `1px solid ${C.border}`,
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: processing ? 'not-allowed' : 'pointer',
                }}
              >
                キャンセル
              </button>
              <button
                onClick={submitReject}
                disabled={processing}
                style={{
                  flex: 1,
                  padding: '10px',
                  backgroundColor: processing ? C.textMuted : C.text,
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: processing ? 'not-allowed' : 'pointer',
                }}
              >
                {processing ? '送信中...' : '却下する'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ============================================================
// コイン取引履歴の1行（コイン付与タブ・履歴モーダル共通）
// ============================================================
function CoinTransactionRow({ tx, usersMap }) {
  const recipient = usersMap?.[tx.userId];
  const recipientName = tx.userName || recipient?.name || '(取得中)';
  const isPositive = (tx.amount || 0) >= 0;
  return (
    <div style={{
      display: 'flex',
      gap: 10,
      alignItems: 'center',
      padding: 10,
      backgroundColor: C.bg,
      borderRadius: 8,
      border: `1px solid ${C.border}`,
      marginBottom: 6,
    }}>
      {/* 金額バッジ */}
      <div style={{
        flexShrink: 0,
        minWidth: 56,
        textAlign: 'center',
        padding: '6px 8px',
        backgroundColor: isPositive ? C.coinLight : C.dangerLight,
        color: isPositive ? '#b8860b' : C.danger,
        border: `1px solid ${isPositive ? C.coin : C.danger}`,
        borderRadius: 8,
        fontSize: 13,
        fontWeight: 700,
      }}>
        {isPositive ? '+' : ''}{tx.amount}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 13,
          fontWeight: 600,
          color: C.text,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {recipientName}
        </div>
        <div style={{ fontSize: 11, color: C.textSub }}>
          {tx.reason || '(理由なし)'}
          {tx.relatedThreadTitle && ` / ${tx.relatedThreadTitle}`}
        </div>
        <div style={{ fontSize: 10, color: C.textMuted, marginTop: 2 }}>
          {tx.createdAt ? formatEventDate(tx.createdAt) : ''}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// 全履歴モーダル
// ============================================================
function CoinHistoryModal({ usersMap, onClose }) {
  const [transactions, setTransactions] = useState(null);

  useEffect(() => {
    const q = query(collection(db, 'coinTransactions'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snap) => {
      setTransactions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => {
      console.error('履歴取得失敗', err);
    });
    return unsubscribe;
  }, []);

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          zIndex: 200,
        }}
      />
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: '50%',
        transform: 'translateX(-50%)',
        width: '100%',
        maxWidth: 430,
        height: '85vh',
        backgroundColor: C.card,
        borderRadius: '16px 16px 0 0',
        boxShadow: '0 -4px 16px rgba(0,0,0,0.15)',
        zIndex: 201,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {/* ドラッグハンドル */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0 4px' }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: C.border }} />
        </div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 16px 12px',
          borderBottom: `1px solid ${C.border}`,
        }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: C.text }}>
            🪙 コイン取引の全履歴
          </h3>
          <button
            onClick={onClose}
            aria-label="閉じる"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: 20,
              color: C.textSub,
              padding: 4,
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
          {transactions === null ? (
            <p style={{ textAlign: 'center', color: C.textSub, padding: 20 }}>読み込み中...</p>
          ) : transactions.length === 0 ? (
            <p style={{ textAlign: 'center', color: C.textSub, padding: 20 }}>
              取引履歴はありません
            </p>
          ) : (
            <>
              <p style={{ fontSize: 12, color: C.textSub, marginBottom: 8 }}>
                全 {transactions.length} 件
              </p>
              {transactions.map(tx => (
                <CoinTransactionRow key={tx.id} tx={tx} usersMap={usersMap} />
              ))}
            </>
          )}
        </div>
      </div>
    </>
  );
}

// ============================================================
// 管理画面：コイン手動付与タブ
// ============================================================
// - ユーザー選択（検索可）
// - 金額（プラス/マイナス両方OK）
// - 理由入力
// - 直近10件の履歴 + 「全履歴」ボタンでモーダル表示
function AdminCoinGrantTab({ user }) {
  const [users, setUsers] = useState(null);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [confirmDialog, setConfirmDialog] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [recentTx, setRecentTx] = useState(null);
  const [showAllHistory, setShowAllHistory] = useState(false);

  // 全ユーザー購読
  useEffect(() => {
    const q = query(collection(db, 'users'), orderBy('name', 'asc'));
    const unsubscribe = onSnapshot(q, (snap) => {
      setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return unsubscribe;
  }, []);

  // 直近10件の取引履歴
  useEffect(() => {
    const q = query(
      collection(db, 'coinTransactions'),
      orderBy('createdAt', 'desc'),
      limit(10)
    );
    const unsubscribe = onSnapshot(q, (snap) => {
      setRecentTx(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => {
      console.error('履歴取得失敗', err);
    });
    return unsubscribe;
  }, []);

  const usersMap = users ? Object.fromEntries(users.map(u => [u.id, u])) : {};
  const selectedUser = selectedUserId ? usersMap[selectedUserId] : null;

  const filteredUsers = users
    ? users.filter(u => !searchText || (u.name || '').toLowerCase().includes(searchText.toLowerCase()))
    : [];

  const requestSubmit = () => {
    setError('');
    setSuccess('');
    if (!selectedUserId) { setError('対象ユーザーを選択してください'); return; }
    const amt = parseInt(amount, 10);
    if (isNaN(amt) || amt === 0) { setError('金額を入力してください（0以外、マイナス可）'); return; }
    if (!reason.trim()) { setError('付与理由を入力してください'); return; }
    setConfirmDialog(true);
  };

  const executeGrant = async () => {
    setSubmitting(true);
    try {
      const amt = parseInt(amount, 10);
      const batch = writeBatch(db);
      // ユーザー残高更新
      batch.update(doc(db, 'users', selectedUserId), {
        azCoins: increment(amt),
      });
      // 取引履歴記録
      const txRef = doc(collection(db, 'coinTransactions'));
      batch.set(txRef, {
        userId: selectedUserId,
        userName: selectedUser?.name || '(匿名)',
        amount: amt,
        reason: reason.trim(),
        relatedThreadId: null,
        relatedThreadTitle: null,
        grantedBy: user.uid,
        grantedByName: user.email || '',
        createdAt: serverTimestamp(),
      });
      await batch.commit();
      setSuccess(`${selectedUser?.name || '(匿名)'} に ${amt > 0 ? '+' : ''}${amt} コインを付与しました`);
      // フォームリセット
      setSelectedUserId(null);
      setSearchText('');
      setAmount('');
      setReason('');
      setConfirmDialog(false);
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      console.error('付与失敗', err);
      alert('処理に失敗しました：' + (err.message || err));
    } finally {
      setSubmitting(false);
    }
  };

  const cardStyle = {
    backgroundColor: C.card,
    borderRadius: 12,
    padding: 16,
    boxShadow: C.shadow,
    border: `1px solid ${C.border}`,
    marginBottom: 16,
  };
  const labelStyle = { fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 6, display: 'block' };
  const inputStyle = {
    width: '100%',
    padding: '10px 12px',
    border: `1px solid ${C.border}`,
    borderRadius: 8,
    fontSize: 15,
    color: C.text,
    backgroundColor: C.card,
    outline: 'none',
    boxSizing: 'border-box',
  };

  return (
    <div>
      {/* 付与フォーム */}
      <div style={cardStyle}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 12 }}>
          🪙 AZコインを付与する
        </h3>

        {/* ユーザー選択 */}
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>付与する相手 <span style={{ color: C.danger }}>*</span></label>
          {selectedUser ? (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: 10,
              backgroundColor: C.accentLight,
              border: `1px solid ${C.accent}`,
              borderRadius: 8,
            }}>
              <div style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                backgroundColor: C.accent,
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 14,
                fontWeight: 700,
              }}>
                {(selectedUser.name || '?').charAt(0).toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>
                  {selectedUser.name || '(名前未設定)'}
                </div>
                <div style={{ fontSize: 11, color: C.textSub }}>
                  現在の残高：🪙 {selectedUser.azCoins || 0}
                </div>
              </div>
              <button
                onClick={() => setSelectedUserId(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 16,
                  color: C.textSub,
                  padding: 4,
                }}
              >
                ✕
              </button>
            </div>
          ) : (
            <>
              <input
                type="text"
                value={searchText}
                onChange={e => setSearchText(e.target.value)}
                placeholder="🔍 名前で検索..."
                style={{ ...inputStyle, marginBottom: 8 }}
              />
              <div style={{
                maxHeight: 200,
                overflowY: 'auto',
                border: `1px solid ${C.border}`,
                borderRadius: 8,
                backgroundColor: C.bg,
              }}>
                {users === null ? (
                  <p style={{ textAlign: 'center', color: C.textSub, padding: 16, fontSize: 13 }}>
                    読み込み中...
                  </p>
                ) : filteredUsers.length === 0 ? (
                  <p style={{ textAlign: 'center', color: C.textSub, padding: 16, fontSize: 13 }}>
                    該当するユーザーがいません
                  </p>
                ) : (
                  filteredUsers.map(u => (
                    <button
                      key={u.id}
                      onClick={() => { setSelectedUserId(u.id); setSearchText(''); }}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '8px 12px',
                        background: 'none',
                        border: 'none',
                        borderBottom: `1px solid ${C.border}`,
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                    >
                      <div style={{
                        width: 28,
                        height: 28,
                        borderRadius: '50%',
                        backgroundColor: C.accentLight,
                        color: C.accent,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 12,
                        fontWeight: 700,
                        flexShrink: 0,
                      }}>
                        {(u.name || '?').charAt(0).toUpperCase()}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>
                          {u.name || '(名前未設定)'}
                          {u.id === user.uid && (
                            <span style={{ fontSize: 10, color: C.textSub, marginLeft: 6 }}>(自分)</span>
                          )}
                        </div>
                        <div style={{ fontSize: 11, color: C.textSub }}>
                          🪙 {u.azCoins || 0}
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </>
          )}
        </div>

        {/* 金額 */}
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>
            金額 <span style={{ color: C.danger }}>*</span>
            <span style={{ fontSize: 11, fontWeight: 400, color: C.textSub, marginLeft: 6 }}>
              （マイナスで減算可）
            </span>
          </label>
          <input
            type="number"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            placeholder="例: +20 / -10"
            style={inputStyle}
          />
        </div>

        {/* 理由 */}
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>付与理由 <span style={{ color: C.danger }}>*</span></label>
          <textarea
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="例: 〇〇プロジェクトへの貢献ボーナス"
            maxLength={500}
            rows={3}
            style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
          />
        </div>

        {error && (
          <div style={{
            padding: '8px 12px',
            backgroundColor: C.dangerLight,
            color: C.danger,
            borderRadius: 8,
            fontSize: 13,
            marginBottom: 12,
          }}>
            {error}
          </div>
        )}
        {success && (
          <div style={{
            padding: '8px 12px',
            backgroundColor: C.successLight,
            color: C.success,
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 600,
            marginBottom: 12,
          }}>
            ✅ {success}
          </div>
        )}

        <button
          onClick={requestSubmit}
          disabled={submitting}
          style={{
            width: '100%',
            padding: '12px',
            backgroundColor: submitting ? C.textMuted : C.accent,
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            fontSize: 15,
            fontWeight: 600,
            cursor: submitting ? 'not-allowed' : 'pointer',
          }}
        >
          🪙 付与する
        </button>
      </div>

      {/* 直近の履歴 */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: C.text }}>
            📜 直近の取引履歴
          </h3>
          <button
            onClick={() => setShowAllHistory(true)}
            style={{
              background: 'none',
              border: `1px solid ${C.border}`,
              borderRadius: 6,
              padding: '4px 10px',
              fontSize: 11,
              color: C.textSub,
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            全履歴を見る →
          </button>
        </div>
        {recentTx === null ? (
          <p style={{ textAlign: 'center', color: C.textSub, padding: 12, fontSize: 13 }}>
            読み込み中...
          </p>
        ) : recentTx.length === 0 ? (
          <p style={{ textAlign: 'center', color: C.textSub, padding: 12, fontSize: 13 }}>
            取引履歴はまだありません
          </p>
        ) : (
          recentTx.map(tx => (
            <CoinTransactionRow key={tx.id} tx={tx} usersMap={usersMap} />
          ))
        )}
      </div>

      {/* 付与確認ダイアログ */}
      {confirmDialog && (
        <>
          <div
            onClick={() => !submitting && setConfirmDialog(false)}
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0,0,0,0.5)',
              zIndex: 200,
            }}
          />
          <div style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 'min(90%, 380px)',
            backgroundColor: C.card,
            borderRadius: 12,
            padding: 20,
            zIndex: 201,
            boxShadow: C.shadowMd,
          }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>
              🪙 コイン付与の最終確認
            </h3>
            {(() => {
              const amt = parseInt(amount, 10);
              const isPositive = amt >= 0;
              return (
                <div style={{
                  padding: 14,
                  backgroundColor: C.bg,
                  borderRadius: 8,
                  marginBottom: 12,
                  border: `1px solid ${C.border}`,
                  fontSize: 14,
                  lineHeight: 1.7,
                }}>
                  <div><strong>受取人：</strong> {selectedUser?.name || '(匿名)'}</div>
                  <div>
                    <strong>金額：</strong>{' '}
                    <span style={{
                      color: isPositive ? '#b8860b' : C.danger,
                      fontWeight: 700,
                    }}>
                      {isPositive ? '+' : ''}{amt}
                    </span>
                    {' '}コイン
                  </div>
                  <div><strong>理由：</strong> {reason}</div>
                </div>
              );
            })()}
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setConfirmDialog(false)}
                disabled={submitting}
                style={{
                  flex: 1,
                  padding: '10px',
                  backgroundColor: C.card,
                  color: C.textSub,
                  border: `1px solid ${C.border}`,
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: submitting ? 'not-allowed' : 'pointer',
                }}
              >
                キャンセル
              </button>
              <button
                onClick={executeGrant}
                disabled={submitting}
                style={{
                  flex: 2,
                  padding: '10px',
                  backgroundColor: submitting ? C.textMuted : C.accent,
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: submitting ? 'not-allowed' : 'pointer',
                }}
              >
                {submitting ? '処理中...' : '付与する'}
              </button>
            </div>
          </div>
        </>
      )}

      {/* 全履歴モーダル */}
      {showAllHistory && (
        <CoinHistoryModal
          usersMap={usersMap}
          onClose={() => setShowAllHistory(false)}
        />
      )}
    </div>
  );
}

// ============================================================
// 管理画面：ユーザー管理タブ
// ============================================================
// - 全ユーザー一覧（名前順）+ 名前検索 + 所属で絞り込み
// - ロール変更（member ↔ admin）プルダウン → 確認ダイアログ
// - 自分自身のロール変更は禁止（管理画面から閉め出されないように）
function AdminUsersTab({ user }) {
  const [users, setUsers] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [filterDept, setFilterDept] = useState(''); // '' = すべて
  const [confirmChange, setConfirmChange] = useState(null); // { targetUser, newRole }
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'users'), orderBy('name', 'asc'));
    const unsubscribe = onSnapshot(q, (snap) => {
      setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => {
      console.error('ユーザー取得失敗', err);
    });
    return unsubscribe;
  }, []);

  // 所属部署のユニークリスト（ドロップダウン用）
  const departments = users
    ? [...new Set(users.map(u => u.department).filter(Boolean))].sort()
    : [];

  const filteredUsers = users ? users.filter(u => {
    if (searchText && !(u.name || '').toLowerCase().includes(searchText.toLowerCase())) return false;
    if (filterDept && u.department !== filterDept) return false;
    return true;
  }) : null;

  const requestRoleChange = (targetUser, newRole) => {
    if (targetUser.id === user.uid) {
      alert('自分自身のロールは変更できません');
      return;
    }
    if (newRole === (targetUser.role || 'member')) return;
    setConfirmChange({ targetUser, newRole });
  };

  const executeRoleChange = async () => {
    if (!confirmChange) return;
    setProcessing(true);
    try {
      await updateDoc(doc(db, 'users', confirmChange.targetUser.id), {
        role: confirmChange.newRole,
        updatedAt: serverTimestamp(),
      });
      setConfirmChange(null);
    } catch (err) {
      console.error('ロール変更失敗', err);
      alert('処理に失敗しました：' + (err.message || err));
    } finally {
      setProcessing(false);
    }
  };

  const cardStyle = {
    backgroundColor: C.card,
    borderRadius: 12,
    padding: 16,
    boxShadow: C.shadow,
    border: `1px solid ${C.border}`,
    marginBottom: 16,
  };
  const inputStyle = {
    width: '100%',
    padding: '10px 12px',
    border: `1px solid ${C.border}`,
    borderRadius: 8,
    fontSize: 14,
    color: C.text,
    backgroundColor: C.card,
    outline: 'none',
    boxSizing: 'border-box',
  };

  const renderUserRow = (u) => {
    const isMe = u.id === user.uid;
    const currentRole = u.role || 'member';
    return (
      <div
        key={u.id}
        style={{
          display: 'flex',
          gap: 10,
          padding: 10,
          backgroundColor: C.bg,
          borderRadius: 8,
          border: `1px solid ${C.border}`,
          marginBottom: 8,
          alignItems: 'center',
        }}
      >
        {/* アバター */}
        <div style={{
          width: 36,
          height: 36,
          borderRadius: '50%',
          backgroundColor: C.accentLight,
          color: C.accent,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 14,
          fontWeight: 700,
          flexShrink: 0,
        }}>
          {(u.name || '?').charAt(0).toUpperCase()}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 13,
            fontWeight: 600,
            color: C.text,
          }}>
            <span style={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              maxWidth: 140,
            }}>
              {u.name || '(名前未設定)'}
            </span>
            {isMe && (
              <span style={{
                fontSize: 10,
                fontWeight: 600,
                color: C.textSub,
                backgroundColor: C.card,
                padding: '1px 6px',
                borderRadius: 10,
                flexShrink: 0,
              }}>
                自分
              </span>
            )}
            {currentRole === 'admin' && (
              <span style={{
                fontSize: 10,
                fontWeight: 700,
                color: '#fff',
                backgroundColor: C.accent,
                padding: '1px 6px',
                borderRadius: 10,
                flexShrink: 0,
              }}>
                ADMIN
              </span>
            )}
          </div>
          <div style={{ fontSize: 11, color: C.textSub }}>
            {u.department || '(部署未設定)'} / 🪙 {u.azCoins || 0}
          </div>
        </div>

        {/* ロール切替プルダウン */}
        <select
          value={currentRole}
          onChange={(e) => requestRoleChange(u, e.target.value)}
          disabled={isMe}
          style={{
            padding: '6px 8px',
            border: `1px solid ${C.border}`,
            borderRadius: 6,
            fontSize: 12,
            fontWeight: 600,
            backgroundColor: isMe ? C.bg : C.card,
            color: isMe ? C.textMuted : C.text,
            cursor: isMe ? 'not-allowed' : 'pointer',
            outline: 'none',
            flexShrink: 0,
          }}
        >
          <option value="member">member</option>
          <option value="admin">admin</option>
        </select>
      </div>
    );
  };

  return (
    <div>
      {/* 絞り込み */}
      <div style={cardStyle}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 12 }}>
          🔍 絞り込み
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <input
            type="text"
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            placeholder="名前で検索..."
            style={inputStyle}
          />
          <select
            value={filterDept}
            onChange={e => setFilterDept(e.target.value)}
            style={{ ...inputStyle, cursor: 'pointer' }}
          >
            <option value="">すべての部署</option>
            {departments.map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
          {(searchText || filterDept) && (
            <button
              onClick={() => { setSearchText(''); setFilterDept(''); }}
              style={{
                padding: '6px 10px',
                backgroundColor: C.card,
                color: C.textSub,
                border: `1px solid ${C.border}`,
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                alignSelf: 'flex-start',
              }}
            >
              絞り込みをクリア
            </button>
          )}
        </div>
      </div>

      {/* ユーザー一覧 */}
      <div style={cardStyle}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 4 }}>
          👥 ユーザー一覧 {filteredUsers ? `(${filteredUsers.length})` : ''}
        </h3>
        <p style={{ fontSize: 12, color: C.textSub, marginBottom: 12 }}>
          ロールを変更するにはプルダウンから選択
        </p>
        {filteredUsers === null ? (
          <p style={{ textAlign: 'center', color: C.textSub, padding: 20 }}>読み込み中...</p>
        ) : filteredUsers.length === 0 ? (
          <p style={{ textAlign: 'center', color: C.textSub, padding: 20, fontSize: 13 }}>
            該当するユーザーがいません
          </p>
        ) : (
          filteredUsers.map(renderUserRow)
        )}

        <p style={{
          marginTop: 12,
          padding: '10px 12px',
          backgroundColor: C.bg,
          color: C.textSub,
          borderRadius: 6,
          fontSize: 11,
          lineHeight: 1.6,
        }}>
          ※ アカウント停止・削除は Firebase コンソールから操作してください
        </p>
      </div>

      {/* ロール変更確認ダイアログ */}
      {confirmChange && (
        <>
          <div
            onClick={() => !processing && setConfirmChange(null)}
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0,0,0,0.5)',
              zIndex: 200,
            }}
          />
          <div style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 'min(90%, 380px)',
            backgroundColor: C.card,
            borderRadius: 12,
            padding: 20,
            zIndex: 201,
            boxShadow: C.shadowMd,
          }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>
              ロールを変更しますか？
            </h3>
            <div style={{
              padding: 14,
              backgroundColor: C.bg,
              borderRadius: 8,
              marginBottom: 12,
              border: `1px solid ${C.border}`,
              fontSize: 14,
              lineHeight: 1.7,
            }}>
              <div><strong>対象：</strong> {confirmChange.targetUser.name || '(名前未設定)'}</div>
              <div>
                <strong>変更内容：</strong>{' '}
                <span style={{ color: C.textSub }}>{confirmChange.targetUser.role || 'member'}</span>
                {' → '}
                <span style={{ color: C.accent, fontWeight: 700 }}>{confirmChange.newRole}</span>
              </div>
            </div>
            {confirmChange.newRole === 'admin' && (
              <div style={{
                padding: '10px 12px',
                backgroundColor: C.warningLight,
                color: C.warning,
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 600,
                marginBottom: 12,
                lineHeight: 1.5,
              }}>
                ⚠️ 管理者権限を付与すると、すべてのスレッド編集・削除・コイン付与が可能になります
              </div>
            )}
            {confirmChange.newRole === 'member' && (
              <div style={{
                padding: '10px 12px',
                backgroundColor: C.bg,
                color: C.textSub,
                borderRadius: 8,
                fontSize: 12,
                marginBottom: 12,
                lineHeight: 1.5,
              }}>
                このユーザーは管理画面にアクセスできなくなります
              </div>
            )}
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setConfirmChange(null)}
                disabled={processing}
                style={{
                  flex: 1,
                  padding: '10px',
                  backgroundColor: C.card,
                  color: C.textSub,
                  border: `1px solid ${C.border}`,
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: processing ? 'not-allowed' : 'pointer',
                }}
              >
                キャンセル
              </button>
              <button
                onClick={executeRoleChange}
                disabled={processing}
                style={{
                  flex: 2,
                  padding: '10px',
                  backgroundColor: processing ? C.textMuted : C.accent,
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: processing ? 'not-allowed' : 'pointer',
                }}
              >
                {processing ? '更新中...' : '変更する'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ============================================================
// 管理画面：ノベルティ管理タブ
// ============================================================
// - 商品の追加 / 編集 / 公開トグル / 削除
// - 編集中はフォーム上部が「編集モード」になる
function AdminShopItemsTab() {
  const emptyForm = { name: '', description: '', imageUrl: '', coinCost: '', stock: '0', isActive: true };
  const [items, setItems] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    const q = query(collection(db, 'shopItems'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snap) => {
      setItems(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => {
      console.error('商品取得失敗', err);
    });
  }, []);

  const startEdit = (item) => {
    setEditingId(item.id);
    setForm({
      name: item.name || '',
      description: item.description || '',
      imageUrl: item.imageUrl || '',
      coinCost: String(item.coinCost ?? ''),
      stock: String(item.stock ?? '0'),
      isActive: item.isActive !== false,
    });
    setFormError('');
    setFormSuccess('');
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(emptyForm);
    setFormError('');
  };

  const handleSubmit = async () => {
    setFormError('');
    setFormSuccess('');
    const name = form.name.trim();
    if (!name) { setFormError('商品名を入力してください'); return; }
    const coinCost = parseInt(form.coinCost, 10);
    if (!Number.isFinite(coinCost) || coinCost < 1) {
      setFormError('必要コイン数は 1 以上の整数で入力してください');
      return;
    }
    const stock = parseInt(form.stock, 10);
    if (!Number.isFinite(stock) || stock < -1) {
      setFormError('在庫数は -1（無制限）または 0 以上の整数で入力してください');
      return;
    }

    setSubmitting(true);
    try {
      const data = {
        name,
        description: form.description.trim(),
        imageUrl: form.imageUrl.trim(),
        coinCost,
        stock,
        isActive: !!form.isActive,
        updatedAt: serverTimestamp(),
      };
      if (editingId) {
        await updateDoc(doc(db, 'shopItems', editingId), data);
        setFormSuccess('商品を更新しました');
      } else {
        await addDoc(collection(db, 'shopItems'), {
          ...data,
          createdAt: serverTimestamp(),
        });
        setFormSuccess('商品を追加しました');
      }
      setEditingId(null);
      setForm(emptyForm);
      setTimeout(() => setFormSuccess(''), 3000);
    } catch (err) {
      console.error('商品保存失敗', err);
      setFormError('保存に失敗しました');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleActive = async (item) => {
    setBusyId(item.id);
    try {
      await updateDoc(doc(db, 'shopItems', item.id), {
        isActive: !item.isActive,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.error('公開トグル失敗', err);
      alert('処理に失敗しました');
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`商品「${item.name}」を削除しますか？\nこの操作は取り消せません。\n（既存の交換申請は残ります）`)) return;
    setBusyId(item.id);
    try {
      await deleteDoc(doc(db, 'shopItems', item.id));
      if (editingId === item.id) cancelEdit();
    } catch (err) {
      console.error('商品削除失敗', err);
      alert('削除に失敗しました');
    } finally {
      setBusyId(null);
    }
  };

  const labelStyle = { fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 6, display: 'block' };
  const inputStyle = {
    width: '100%',
    padding: '10px 12px',
    border: `1px solid ${C.border}`,
    borderRadius: 8,
    fontSize: 15,
    color: C.text,
    backgroundColor: C.card,
    outline: 'none',
    boxSizing: 'border-box',
  };
  const cardStyle = {
    backgroundColor: C.card,
    borderRadius: 12,
    padding: 16,
    boxShadow: C.shadow,
    border: `1px solid ${C.border}`,
    marginBottom: 16,
  };

  const stockLabel = (n) => (n < 0 ? '∞ 無制限' : `残${n}`);

  return (
    <div>
      {/* 追加・編集フォーム */}
      <div style={cardStyle}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 12 }}>
          {editingId ? '✏️ 商品を編集中' : '🆕 新規ノベルティを追加'}
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={labelStyle}>商品名 <span style={{ color: C.danger }}>*</span></label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              maxLength={60}
              placeholder="例：ロゴ入りトートバッグ"
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>説明（任意）</label>
            <textarea
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              maxLength={500}
              rows={3}
              style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
              placeholder="商品の詳細・サイズ・色など"
            />
          </div>
          <div>
            <label style={labelStyle}>画像URL（任意）</label>
            <input
              type="url"
              value={form.imageUrl}
              onChange={e => setForm({ ...form, imageUrl: e.target.value })}
              placeholder="https://..."
              style={inputStyle}
            />
            <p style={{ fontSize: 11, color: C.textSub, marginTop: 4 }}>
              ※ 画像アップロードは未対応のため、外部の画像URLを貼り付けてください
            </p>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>必要コイン <span style={{ color: C.danger }}>*</span></label>
              <input
                type="number"
                value={form.coinCost}
                onChange={e => setForm({ ...form, coinCost: e.target.value })}
                min={1}
                placeholder="例：100"
                style={inputStyle}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>在庫数</label>
              <input
                type="number"
                value={form.stock}
                onChange={e => setForm({ ...form, stock: e.target.value })}
                min={-1}
                placeholder="-1=無制限"
                style={inputStyle}
              />
            </div>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: C.text, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={e => setForm({ ...form, isActive: e.target.checked })}
            />
            公開中（チェックを外すと一覧に表示されません）
          </label>

          {formError && (
            <div style={{
              padding: '8px 12px',
              backgroundColor: C.dangerLight,
              color: C.danger,
              borderRadius: 8,
              fontSize: 13,
            }}>
              {formError}
            </div>
          )}
          {formSuccess && (
            <div style={{
              padding: '8px 12px',
              backgroundColor: C.successLight,
              color: C.success,
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
            }}>
              ✅ {formSuccess}
            </div>
          )}

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              style={{
                flex: 1,
                padding: '12px',
                backgroundColor: submitting ? C.textMuted : C.accent,
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                fontSize: 15,
                fontWeight: 600,
                cursor: submitting ? 'not-allowed' : 'pointer',
              }}
            >
              {submitting ? '保存中...' : editingId ? '💾 更新する' : '➕ 追加する'}
            </button>
            {editingId && (
              <button
                onClick={cancelEdit}
                disabled={submitting}
                style={{
                  padding: '12px 16px',
                  backgroundColor: C.bg,
                  color: C.text,
                  border: `1px solid ${C.border}`,
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: submitting ? 'not-allowed' : 'pointer',
                }}
              >
                キャンセル
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 商品一覧 */}
      <div style={cardStyle}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 12 }}>
          🛍️ 登録済みノベルティ ({items?.length || 0})
        </h3>

        {items === null ? (
          <p style={{ color: C.textSub, fontSize: 13, textAlign: 'center', padding: 12 }}>読み込み中...</p>
        ) : items.length === 0 ? (
          <p style={{ color: C.textSub, fontSize: 13, textAlign: 'center', padding: 12 }}>
            まだ商品がありません。上のフォームから追加してください
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {items.map(item => (
              <div
                key={item.id}
                style={{
                  display: 'flex',
                  gap: 10,
                  padding: 10,
                  backgroundColor: editingId === item.id ? C.accentLight : C.bg,
                  borderRadius: 8,
                  border: `1px solid ${editingId === item.id ? C.accent : C.border}`,
                  alignItems: 'center',
                }}
              >
                {/* サムネ */}
                <div style={{
                  position: 'relative',
                  width: 56,
                  height: 56,
                  borderRadius: 8,
                  backgroundColor: C.card,
                  border: `1px solid ${C.border}`,
                  flexShrink: 0,
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 24,
                }}>
                  <span style={{ position: 'absolute', zIndex: 0 }}>🛍️</span>
                  {item.imageUrl && (
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'relative', zIndex: 1 }}
                      onError={e => { e.target.style.display = 'none'; }}
                    />
                  )}
                </div>

                {/* テキスト情報 */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: C.text,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {item.name}
                    {!item.isActive && (
                      <span style={{
                        marginLeft: 6,
                        fontSize: 10,
                        padding: '1px 6px',
                        backgroundColor: C.textMuted,
                        color: '#fff',
                        borderRadius: 10,
                        fontWeight: 700,
                      }}>非公開</span>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: C.textSub, marginTop: 2, display: 'flex', gap: 8 }}>
                    <span>🪙 {item.coinCost}</span>
                    <span>📦 {stockLabel(item.stock ?? 0)}</span>
                  </div>
                </div>

                {/* 操作ボタン */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0 }}>
                  <button
                    onClick={() => startEdit(item)}
                    disabled={busyId === item.id}
                    style={{
                      padding: '4px 10px',
                      backgroundColor: C.accent,
                      color: '#fff',
                      border: 'none',
                      borderRadius: 6,
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    ✏️ 編集
                  </button>
                  <button
                    onClick={() => toggleActive(item)}
                    disabled={busyId === item.id}
                    style={{
                      padding: '4px 10px',
                      backgroundColor: item.isActive ? C.bg : C.success,
                      color: item.isActive ? C.textSub : '#fff',
                      border: `1px solid ${item.isActive ? C.border : C.success}`,
                      borderRadius: 6,
                      fontSize: 10,
                      fontWeight: 700,
                      cursor: busyId === item.id ? 'not-allowed' : 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {item.isActive ? '非公開に' : '公開する'}
                  </button>
                  <button
                    onClick={() => handleDelete(item)}
                    disabled={busyId === item.id}
                    style={{
                      padding: '4px 10px',
                      backgroundColor: C.dangerLight,
                      color: C.danger,
                      border: `1px solid ${C.danger}`,
                      borderRadius: 6,
                      fontSize: 10,
                      fontWeight: 700,
                      cursor: busyId === item.id ? 'not-allowed' : 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    🗑️ 削除
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// 管理画面：交換申請タブ
// ============================================================
// - 申請時にユーザーのコイン・在庫はすでに減算済み
// - 承認：ステータス更新のみ
// - 却下：コイン返金 + 在庫戻し（無制限商品は戻し不要）+ 返金トランザクション記録
function AdminExchangeRequestsTab({ user }) {
  const [requests, setRequests] = useState(null);
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    const q = query(collection(db, 'exchangeRequests'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snap) => {
      setRequests(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => {
      console.error('交換申請取得失敗', err);
    });
  }, []);

  const handleApprove = async (req) => {
    if (!window.confirm(
      `「${req.itemName}」の交換申請を承認しますか？\n` +
      `申請者：${req.userName || '(取得中)'}\n` +
      `※ コイン と 在庫は申請時に引き当て済みです`
    )) return;
    setBusyId(req.id);
    try {
      await updateDoc(doc(db, 'exchangeRequests', req.id), {
        status: 'approved',
        processedBy: user.uid,
        processedAt: serverTimestamp(),
      });
    } catch (err) {
      console.error('承認失敗', err);
      alert('承認に失敗しました');
    } finally {
      setBusyId(null);
    }
  };

  const handleReject = async (req) => {
    const reason = window.prompt('却下理由を入力してください（任意・申請者には表示されません）', '');
    if (reason === null) return;
    if (!window.confirm(
      `「${req.itemName}」の申請を却下します。\n` +
      `申請者：${req.userName || '(取得中)'}\n` +
      `→ ${req.coinCost} コインを返金 / 在庫を 1 戻します`
    )) return;

    setBusyId(req.id);
    try {
      // 商品が無制限在庫かどうかを事前確認（在庫戻しの判定）
      let restoreStock = false;
      if (req.itemId) {
        try {
          const itemSnap = await getDoc(doc(db, 'shopItems', req.itemId));
          if (itemSnap.exists() && (itemSnap.data().stock ?? -1) >= 0) {
            restoreStock = true;
          }
        } catch (err) {
          console.warn('商品取得失敗（在庫戻しスキップ）', err);
        }
      }

      const batch = writeBatch(db);
      batch.update(doc(db, 'exchangeRequests', req.id), {
        status: 'rejected',
        rejectionReason: (reason || '').trim(),
        processedBy: user.uid,
        processedAt: serverTimestamp(),
      });
      batch.update(doc(db, 'users', req.userId), {
        azCoins: increment(req.coinCost || 0),
      });
      if (restoreStock) {
        batch.update(doc(db, 'shopItems', req.itemId), {
          stock: increment(1),
        });
      }
      batch.set(doc(collection(db, 'coinTransactions')), {
        userId: req.userId,
        userName: req.userName || '',
        amount: req.coinCost || 0,
        reason: `🛍️ 「${req.itemName}」交換却下による返金`,
        grantedBy: user.uid,
        relatedRequestId: req.id,
        createdAt: serverTimestamp(),
      });
      await batch.commit();
    } catch (err) {
      console.error('却下失敗', err);
      alert('却下に失敗しました');
    } finally {
      setBusyId(null);
    }
  };

  const cardStyle = {
    backgroundColor: C.card,
    borderRadius: 12,
    padding: 16,
    boxShadow: C.shadow,
    border: `1px solid ${C.border}`,
    marginBottom: 16,
  };

  const pending   = requests?.filter(r => r.status === 'pending') || [];
  const processed = requests?.filter(r => r.status !== 'pending').slice(0, 50) || [];

  const renderRow = (req, mode) => {
    const statusBadge = {
      pending:  { bg: C.warningLight, fg: C.warning, label: '⏳ 申請中' },
      approved: { bg: C.successLight, fg: C.success, label: '✅ 承認済み' },
      rejected: { bg: C.dangerLight,  fg: C.danger,  label: '❌ 却下' },
    }[req.status] || {};
    return (
      <div
        key={req.id}
        style={{
          padding: 12,
          backgroundColor: C.bg,
          borderRadius: 8,
          border: `1px solid ${C.border}`,
          marginBottom: 8,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <span style={{
            fontSize: 11,
            fontWeight: 700,
            padding: '2px 8px',
            backgroundColor: statusBadge.bg,
            color: statusBadge.fg,
            borderRadius: 10,
          }}>
            {statusBadge.label}
          </span>
          <span style={{ fontSize: 11, color: C.textSub }}>
            {req.createdAt ? formatEventDate(req.createdAt) : ''}
          </span>
        </div>
        <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 4 }}>
          {req.itemName || '(商品名不明)'}
        </div>
        <div style={{ fontSize: 12, color: C.textSub, marginBottom: 8, display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          <span>👤 {req.userName || '(取得中)'}</span>
          <span>🪙 {req.coinCost}</span>
        </div>
        {req.rejectionReason && (
          <div style={{
            padding: '6px 10px',
            backgroundColor: C.dangerLight,
            color: C.danger,
            borderRadius: 6,
            fontSize: 12,
            marginBottom: 8,
          }}>
            却下理由: {req.rejectionReason}
          </div>
        )}
        {mode === 'pending' && (
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => handleApprove(req)}
              disabled={busyId === req.id}
              style={{
                flex: 1,
                padding: '8px 12px',
                backgroundColor: C.success,
                color: '#fff',
                border: 'none',
                borderRadius: 6,
                fontSize: 13,
                fontWeight: 700,
                cursor: busyId === req.id ? 'not-allowed' : 'pointer',
              }}
            >
              ✅ 承認
            </button>
            <button
              onClick={() => handleReject(req)}
              disabled={busyId === req.id}
              style={{
                flex: 1,
                padding: '8px 12px',
                backgroundColor: C.dangerLight,
                color: C.danger,
                border: `1px solid ${C.danger}`,
                borderRadius: 6,
                fontSize: 13,
                fontWeight: 700,
                cursor: busyId === req.id ? 'not-allowed' : 'pointer',
              }}
            >
              ❌ 却下
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      <div style={cardStyle}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 12 }}>
          ⏳ 未処理の申請 ({pending.length})
        </h3>
        {requests === null ? (
          <p style={{ color: C.textSub, fontSize: 13, textAlign: 'center', padding: 12 }}>読み込み中...</p>
        ) : pending.length === 0 ? (
          <p style={{ color: C.textSub, fontSize: 13, textAlign: 'center', padding: 12 }}>
            未処理の申請はありません
          </p>
        ) : (
          pending.map(req => renderRow(req, 'pending'))
        )}
      </div>

      <div style={cardStyle}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 4 }}>
          📚 処理済み申請（直近50件）
        </h3>
        <p style={{ fontSize: 11, color: C.textSub, marginBottom: 12 }}>
          承認・却下済みの申請履歴
        </p>
        {processed.length === 0 ? (
          <p style={{ color: C.textSub, fontSize: 13, textAlign: 'center', padding: 12 }}>
            処理済み申請はありません
          </p>
        ) : (
          processed.map(req => renderRow(req, 'processed'))
        )}
      </div>
    </div>
  );
}

// ============================================================
// 管理画面（Admin専用）
// ============================================================
// タブ構造のみ実装。各タブの中身は段階的に実装していく。
// ナビゲーション：マイページの「⚙️ 管理画面」ボタン → サブビュー（admin）
function AdminScreen({ user, profile, onBack }) {
  const ADMIN_TABS = [
    { id: 'announce',    label: 'お知らせ',     icon: '📢' },
    { id: 'completion',  label: 'イベント完了', icon: '✅' },
    { id: 'deletion',    label: '削除申請',     icon: '🗑️' },
    { id: 'coins',       label: 'コイン付与',   icon: '🪙' },
    { id: 'users',       label: 'ユーザー',     icon: '👥' },
    { id: 'shop',        label: 'ノベルティ',   icon: '🛍️' },
    { id: 'exchange',    label: '交換申請',     icon: '🎁' },
  ];
  const [activeTab, setActiveTab] = useState('announce');

  // 二重ガード：profile.role が admin でない場合は表示拒否
  if (profile?.role !== 'admin') {
    return (
      <div>
        <Header title="管理画面" onBack={onBack} />
        <div style={{ padding: 40, textAlign: 'center', color: C.textSub }}>
          <div style={{ fontSize: 48 }}>🔒</div>
          <p style={{ marginTop: 12 }}>このページは管理者専用です</p>
        </div>
      </div>
    );
  }

  // 各タブの本体
  const renderTab = () => {
    switch (activeTab) {
      case 'announce':   return <AdminAnnouncementTab user={user} profile={profile} />;
      case 'completion': return <AdminEventCompletionTab user={user} />;
      case 'deletion':   return <AdminDeletionRequestsTab user={user} />;
      case 'coins':      return <AdminCoinGrantTab user={user} />;
      case 'users':      return <AdminUsersTab user={user} />;
      case 'shop':       return <AdminShopItemsTab />;
      case 'exchange':   return <AdminExchangeRequestsTab user={user} />;
      default:           return null;
    }
  };

  return (
    <div>
      <Header title="管理画面" onBack={onBack} />

      {/* タブバー（4列グリッド・自動折り返し） */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 6,
        padding: '10px 12px',
        backgroundColor: C.card,
        borderBottom: `1px solid ${C.border}`,
      }}>
        {ADMIN_TABS.map(tab => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 2,
                padding: '8px 4px',
                backgroundColor: active ? C.accent : C.bg,
                color: active ? '#fff' : C.textSub,
                border: 'none',
                borderRadius: 8,
                fontSize: 11,
                fontWeight: 600,
                cursor: 'pointer',
                lineHeight: 1.2,
                minHeight: 52,
              }}
            >
              <span style={{ fontSize: 18, lineHeight: 1 }}>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* タブコンテンツ */}
      <div style={{ padding: '16px 16px 100px' }}>
        {renderTab()}
      </div>
    </div>
  );
}

// 参加イベント履歴セクション（マイページに表示）
// collectionGroup('participations') で自分の参加レコードを取得し、
// 各 threadId の親スレッドを fetch して「予定」「済み」に分類して表示
function MyEventsSection({ user, onSelectThread }) {
  const [events, setEvents] = useState(null); // null=loading, []=empty, [...]=list
  const [error, setError] = useState('');

  useEffect(() => {
    const q = query(collectionGroup(db, 'participations'), where('userId', '==', user.uid));
    const unsubscribe = onSnapshot(
      q,
      async (snap) => {
        try {
          // 各 participation の親スレッドを取得
          const threadRefs = snap.docs.map(d => d.ref.parent.parent);
          const threadSnaps = await Promise.all(threadRefs.map(r => getDoc(r)));
          const threads = threadSnaps
            .filter(s => s.exists())
            .map(s => ({ id: s.id, ...s.data() }));
          setEvents(threads);
          setError('');
        } catch (err) {
          console.error('参加イベント取得失敗', err);
          setError('参加イベントの取得に失敗しました');
        }
      },
      (err) => {
        console.error('参加イベント購読失敗', err);
        // collectionGroup には Firestore インデックスが必要な場合あり
        if (err.code === 'failed-precondition') {
          setError('インデックスが必要です。コンソールから作成してください（エラー詳細はブラウザ Console を確認）');
        } else {
          setError('参加イベントの取得に失敗しました');
        }
      }
    );
    return unsubscribe;
  }, [user.uid]);

  // 開催前 / 開催後で分割（eventDate が null は「予定」扱い）
  const now = new Date();
  const upcoming = [];
  const past = [];
  if (events) {
    events.forEach(t => {
      const date = t.eventDate && t.eventDate.toDate ? t.eventDate.toDate() : null;
      if (!date || date >= now) upcoming.push(t);
      else past.push(t);
    });
    // 予定は開催日近い順、済みは新しい順
    upcoming.sort((a, b) => {
      const da = a.eventDate?.toDate ? a.eventDate.toDate() : new Date(8640000000000000);
      const db_ = b.eventDate?.toDate ? b.eventDate.toDate() : new Date(8640000000000000);
      return da - db_;
    });
    past.sort((a, b) => {
      const da = a.eventDate?.toDate ? a.eventDate.toDate() : new Date(0);
      const db_ = b.eventDate?.toDate ? b.eventDate.toDate() : new Date(0);
      return db_ - da;
    });
  }

  const renderItem = (t) => (
    <div
      key={t.id}
      onClick={() => onSelectThread && onSelectThread(t.id)}
      style={{
        padding: '10px 12px',
        backgroundColor: C.bg,
        borderRadius: 8,
        marginBottom: 8,
        cursor: onSelectThread ? 'pointer' : 'default',
        border: `1px solid ${C.border}`,
      }}
    >
      <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 4 }}>
        {t.title}
      </div>
      <div style={{ fontSize: 12, color: C.textSub, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {t.eventDate && <span>📅 {formatEventDate(t.eventDate)}</span>}
        <span>👥 {t.participantCount || 0}{t.capacity > 0 ? `/${t.capacity}` : ''}人</span>
      </div>
    </div>
  );

  return (
    <div style={{
      backgroundColor: C.card,
      borderRadius: 12,
      padding: 16,
      marginTop: 16,
      boxShadow: C.shadow,
      border: `1px solid ${C.border}`,
    }}>
      <h3 style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 12 }}>
        🎟️ 参加イベント
      </h3>

      {error && (
        <div style={{
          padding: '8px 12px',
          backgroundColor: C.dangerLight,
          color: C.danger,
          borderRadius: 8,
          fontSize: 12,
          marginBottom: 8,
        }}>
          {error}
        </div>
      )}

      {events === null ? (
        <p style={{ color: C.textSub, fontSize: 13, textAlign: 'center', padding: 12 }}>読み込み中...</p>
      ) : events.length === 0 ? (
        <p style={{ color: C.textSub, fontSize: 13, textAlign: 'center', padding: 12 }}>
          まだ参加したイベントはありません
        </p>
      ) : (
        <>
          {upcoming.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: C.textSub, marginBottom: 8 }}>
                ✨ 開催前 ({upcoming.length})
              </div>
              {upcoming.map(renderItem)}
            </div>
          )}
          {past.length > 0 && (
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: C.textSub, marginBottom: 8 }}>
                ✅ 開催済み ({past.length})
              </div>
              {past.map(renderItem)}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// 交換申請履歴セクション（マイページに表示）
// 自分の exchangeRequests を新着順で表示。pending / 処理済み の2セクションに分ける
function MyExchangeSection({ user }) {
  const [requests, setRequests] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    // where + orderBy の複合インデックス回避：where のみで取得し、クライアント側でソート
    const q = query(collection(db, 'exchangeRequests'), where('userId', '==', user.uid));
    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        list.sort((a, b) => {
          const ta = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
          const tb = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
          return tb - ta;
        });
        setRequests(list);
        setError('');
      },
      (err) => {
        console.error('交換申請取得失敗', err);
        setError('申請履歴の取得に失敗しました');
      }
    );
    return unsubscribe;
  }, [user.uid]);

  const pending  = requests?.filter(r => r.status === 'pending') || [];
  const finished = requests?.filter(r => r.status !== 'pending') || [];

  const renderRow = (r) => {
    const badge = {
      pending:  { bg: C.warningLight, fg: C.warning, label: '⏳ 申請中' },
      approved: { bg: C.successLight, fg: C.success, label: '✅ 承認済み' },
      rejected: { bg: C.dangerLight,  fg: C.danger,  label: '❌ 却下（返金済み）' },
    }[r.status] || {};
    return (
      <div
        key={r.id}
        style={{
          padding: '10px 12px',
          backgroundColor: C.bg,
          borderRadius: 8,
          marginBottom: 8,
          border: `1px solid ${C.border}`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span style={{
            fontSize: 11,
            fontWeight: 700,
            padding: '2px 8px',
            backgroundColor: badge.bg,
            color: badge.fg,
            borderRadius: 10,
          }}>
            {badge.label}
          </span>
          <span style={{ fontSize: 11, color: C.textSub }}>
            {r.createdAt ? formatEventDate(r.createdAt) : ''}
          </span>
        </div>
        <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 4 }}>
          {r.itemName || '(商品名不明)'}
        </div>
        <div style={{ fontSize: 12, color: C.textSub }}>
          🪙 {r.coinCost} {r.status === 'rejected' && '（返金済み）'}
        </div>
      </div>
    );
  };

  return (
    <div style={{
      backgroundColor: C.card,
      borderRadius: 12,
      padding: 16,
      marginTop: 16,
      boxShadow: C.shadow,
      border: `1px solid ${C.border}`,
    }}>
      <h3 style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 12 }}>
        🛍️ ポイント交換の申請履歴
      </h3>

      {error && (
        <div style={{
          padding: '8px 12px',
          backgroundColor: C.dangerLight,
          color: C.danger,
          borderRadius: 8,
          fontSize: 12,
          marginBottom: 8,
        }}>
          {error}
        </div>
      )}

      {requests === null ? (
        <p style={{ color: C.textSub, fontSize: 13, textAlign: 'center', padding: 12 }}>読み込み中...</p>
      ) : requests.length === 0 ? (
        <p style={{ color: C.textSub, fontSize: 13, textAlign: 'center', padding: 12 }}>
          まだ交換申請はありません
        </p>
      ) : (
        <>
          {pending.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: C.textSub, marginBottom: 8 }}>
                ⏳ 申請中 ({pending.length})
              </div>
              {pending.map(renderRow)}
            </div>
          )}
          {finished.length > 0 && (
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: C.textSub, marginBottom: 8 }}>
                📚 処理済み ({finished.length})
              </div>
              {finished.map(renderRow)}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// マイページ画面
function ProfileScreen({ user, profile, onLogout, onProfileUpdate, onSelectThread, onOpenAdmin }) {
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [form, setForm] = useState({
    name: profile.name || '',
    department: profile.department || '',
    bio: profile.bio || '',
    tags: profile.tags || [],
  });

  const startEdit = () => {
    setForm({
      name: profile.name || '',
      department: profile.department || '',
      bio: profile.bio || '',
      tags: profile.tags || [],
    });
    setSaveError('');
    setEditMode(true);
  };

  const cancelEdit = () => {
    setEditMode(false);
    setSaveError('');
  };

  const saveProfile = async () => {
    if (!form.name.trim()) {
      setSaveError('氏名は必須です');
      return;
    }
    setSaveError('');
    setSaving(true);
    try {
      const updates = {
        name: form.name.trim(),
        department: form.department.trim(),
        bio: form.bio.trim(),
        tags: form.tags,
        updatedAt: serverTimestamp(),
      };
      await updateDoc(doc(db, 'users', user.uid), updates);
      onProfileUpdate({ ...profile, ...updates, updatedAt: new Date() });
      setEditMode(false);
    } catch (err) {
      console.error(err);
      setSaveError('保存に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  const labelStyle = { fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 6, display: 'block' };
  const inputStyle = {
    width: '100%',
    padding: '10px 12px',
    border: `1px solid ${C.border}`,
    borderRadius: 8,
    fontSize: 15,
    color: C.text,
    backgroundColor: C.card,
    outline: 'none',
    boxSizing: 'border-box',
  };

  return (
    <div>
      <Header title="マイページ" coinBalance={profile.azCoins} />
      <div style={{ padding: '16px 16px 100px' }}>
        {/* プロフィールカード */}
        <div style={{
          backgroundColor: C.card,
          borderRadius: 12,
          padding: 20,
          boxShadow: C.shadow,
          border: `1px solid ${C.border}`,
        }}>
          {/* アイコン */}
          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            <div style={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              backgroundColor: C.accentLight,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 36,
              color: C.accent,
              fontWeight: 700,
            }}>
              {(profile.name || '?').charAt(0).toUpperCase()}
            </div>
          </div>

          {editMode ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={labelStyle}>氏名 <span style={{ color: C.danger }}>*</span></label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  style={inputStyle}
                  placeholder="山田 太郎"
                />
              </div>
              <div>
                <label style={labelStyle}>所属部署</label>
                <input
                  type="text"
                  value={form.department}
                  onChange={e => setForm({ ...form, department: e.target.value })}
                  style={inputStyle}
                  placeholder="開発部"
                />
              </div>
              <div>
                <label style={labelStyle}>自己紹介</label>
                <textarea
                  value={form.bio}
                  onChange={e => setForm({ ...form, bio: e.target.value })}
                  rows={4}
                  style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
                  placeholder="趣味や得意分野など..."
                />
              </div>
              <div>
                <label style={labelStyle}>タグ</label>
                <TagInput
                  tags={form.tags}
                  onChange={tags => setForm({ ...form, tags })}
                />
              </div>

              {saveError && (
                <div style={{
                  padding: '8px 12px',
                  backgroundColor: C.dangerLight,
                  color: C.danger,
                  borderRadius: 8,
                  fontSize: 13,
                }}>
                  {saveError}
                </div>
              )}

              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={cancelEdit}
                  disabled={saving}
                  style={{
                    flex: 1,
                    padding: '12px',
                    backgroundColor: C.card,
                    color: C.textSub,
                    border: `1px solid ${C.border}`,
                    borderRadius: 8,
                    fontSize: 15,
                    fontWeight: 600,
                    cursor: saving ? 'not-allowed' : 'pointer',
                  }}
                >
                  キャンセル
                </button>
                <button
                  onClick={saveProfile}
                  disabled={saving}
                  style={{
                    flex: 1,
                    padding: '12px',
                    backgroundColor: saving ? C.textMuted : C.accent,
                    color: '#fff',
                    border: 'none',
                    borderRadius: 8,
                    fontSize: 15,
                    fontWeight: 600,
                    cursor: saving ? 'not-allowed' : 'pointer',
                  }}
                >
                  {saving ? '保存中...' : '保存'}
                </button>
              </div>
            </div>
          ) : (
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: C.text, textAlign: 'center' }}>
                {profile.name || '(未設定)'}
              </h2>
              {profile.department && (
                <p style={{ fontSize: 14, color: C.textSub, textAlign: 'center', marginTop: 4 }}>
                  {profile.department}
                </p>
              )}

              {/* ランク表示 */}
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: 10 }}>
                <RankBadge profile={profile} />
              </div>
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                gap: 14,
                marginTop: 8,
                fontSize: 12,
                color: C.textSub,
              }}>
                <span>🎟️ 参加 {profile.eventCount || 0} 回</span>
                <span>🎤 主催 {profile.hostCount || 0} 回</span>
              </div>
              {(() => {
                const next = getNextRankProgress(profile);
                if (!next) {
                  return (
                    <div style={{ textAlign: 'center', marginTop: 6, fontSize: 11, color: '#9c27b0', fontWeight: 600 }}>
                      最高ランク達成！
                    </div>
                  );
                }
                return (
                  <div style={{ textAlign: 'center', marginTop: 6, fontSize: 11, color: C.textMuted }}>
                    {next.message}
                  </div>
                );
              })()}

              {profile.bio && (
                <p style={{
                  fontSize: 14,
                  color: C.text,
                  lineHeight: 1.6,
                  marginTop: 16,
                  whiteSpace: 'pre-wrap',
                }}>
                  {profile.bio}
                </p>
              )}

              {profile.tags && profile.tags.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 16 }}>
                  {profile.tags.map(tag => (
                    <span key={tag} style={{
                      padding: '4px 10px',
                      backgroundColor: C.accentLight,
                      color: C.accent,
                      borderRadius: 20,
                      fontSize: 13,
                      fontWeight: 600,
                    }}>
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              <button
                onClick={startEdit}
                style={{
                  width: '100%',
                  marginTop: 20,
                  padding: '10px',
                  backgroundColor: C.accentLight,
                  color: C.accent,
                  border: 'none',
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                プロフィールを編集
              </button>
            </div>
          )}
        </div>

        {/* 参加イベント履歴 */}
        <MyEventsSection user={user} onSelectThread={onSelectThread} />
        <MyExchangeSection user={user} />

        {/* 管理画面（admin のみ） */}
        {profile.role === 'admin' && onOpenAdmin && (
          <button
            onClick={onOpenAdmin}
            style={{
              width: '100%',
              marginTop: 16,
              padding: '14px',
              backgroundColor: C.text,
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
            }}
          >
            ⚙️ 管理画面を開く
          </button>
        )}

        {/* アカウント情報 */}
        <div style={{
          backgroundColor: C.card,
          borderRadius: 12,
          padding: 16,
          marginTop: 16,
          boxShadow: C.shadow,
          border: `1px solid ${C.border}`,
          fontSize: 13,
          color: C.textSub,
        }}>
          ログイン中：<strong style={{ color: C.text }}>{user.email}</strong>
        </div>

        <button
          onClick={onLogout}
          style={{
            width: '100%',
            marginTop: 16,
            padding: '12px',
            backgroundColor: C.card,
            color: C.danger,
            border: `1px solid ${C.danger}`,
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          ログアウト
        </button>
      </div>
    </div>
  );
}

// ============================================================
// メインアプリ
// ============================================================
export default function App() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [profileError, setProfileError] = useState('');
  const [authLoading, setAuthLoading] = useState(true);
  const [currentScreen, setCurrentScreen] = useState('home');
  // サブビュー（詳細・新規作成画面）。null のときはメインタブを表示
  // 例：{ type: 'new-thread' } / { type: 'thread-detail', threadId: 'xxx' }
  const [subView, setSubView] = useState(null);

  const loadProfile = async (firebaseUser) => {
    setProfileError('');
    try {
      const p = await ensureUserProfile(firebaseUser);
      setProfile(p);
    } catch (err) {
      console.error('プロフィール取得失敗', err);
      setProfile(null);
      setProfileError(err.message || String(err));
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      setAuthLoading(false);
      if (firebaseUser) {
        await loadProfile(firebaseUser);
      } else {
        setProfile(null);
        setProfileError('');
      }
    });
    return unsubscribe;
  }, []);

  // プロフィールをリアルタイム同期（role変更などを即時反映）
  useEffect(() => {
    if (!user) return;
    const ref = doc(db, 'users', user.uid);
    const unsubscribe = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        setProfile({ id: snap.id, ...snap.data() });
      }
    }, (err) => {
      console.error('プロフィール同期失敗', err);
    });
    return unsubscribe;
  }, [user]);

  const handleLogin = async (email, password) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const handleLogout = async () => {
    await signOut(auth);
    setCurrentScreen('home');
    setSubView(null);
  };

  const navigateTab = (tabId) => {
    setSubView(null);
    setCurrentScreen(tabId);
  };

  if (authLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: C.bg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: C.textSub,
        fontSize: 14,
      }}>
        読み込み中...
      </div>
    );
  }

  if (!user) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  if (!profile) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: C.bg,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: C.textSub,
        fontSize: 14,
        padding: 24,
        textAlign: 'center',
      }}>
        {profileError ? (
          <>
            <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
            <p style={{ color: C.danger, fontWeight: 600, marginBottom: 8 }}>
              プロフィールの取得に失敗しました
            </p>
            <p style={{ fontSize: 12, color: C.textSub, marginBottom: 20, maxWidth: 320, wordBreak: 'break-word' }}>
              {profileError}
            </p>
            <button
              onClick={() => loadProfile(user)}
              style={{
                padding: '10px 24px',
                backgroundColor: C.accent,
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                marginBottom: 8,
              }}
            >
              再試行
            </button>
            <button
              onClick={handleLogout}
              style={{
                padding: '8px 20px',
                backgroundColor: 'transparent',
                color: C.textSub,
                border: 'none',
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              ログアウト
            </button>
          </>
        ) : (
          'プロフィールを準備中...'
        )}
      </div>
    );
  }

  // サブビュー（戻る操作で抜ける画面）の描画
  let content;
  let showBottomNav = true;
  if (subView?.type === 'new-thread') {
    content = (
      <NewThreadScreen
        user={user}
        profile={profile}
        onCancel={() => setSubView(null)}
        onCreated={() => setSubView(null)}
      />
    );
    showBottomNav = false;
  } else if (subView?.type === 'thread-detail') {
    content = (
      <ThreadDetailScreen
        threadId={subView.threadId}
        user={user}
        profile={profile}
        onBack={() => setSubView(null)}
      />
    );
    showBottomNav = false;
  } else if (subView?.type === 'admin') {
    content = (
      <AdminScreen
        user={user}
        profile={profile}
        onBack={() => setSubView(null)}
      />
    );
    showBottomNav = false;
  } else {
    const selectThread = (threadId) => setSubView({ type: 'thread-detail', threadId });
    const screens = {
      home:    <HomeScreen profile={profile} onSelectThread={selectThread} />,
      members: <MembersScreen user={user} />,
      threads: <ThreadsScreen
                 onCreateThread={() => setSubView({ type: 'new-thread' })}
                 onSelectThread={selectThread}
               />,
      shop:    <ShopScreen user={user} profile={profile} />,
      profile: <ProfileScreen user={user} profile={profile} onLogout={handleLogout} onProfileUpdate={setProfile} onSelectThread={selectThread} onOpenAdmin={() => setSubView({ type: 'admin' })} />,
    };
    content = screens[currentScreen];
  }

  return (
    <div style={{
      maxWidth: 430,
      margin: '0 auto',
      minHeight: '100vh',
      backgroundColor: C.bg,
      position: 'relative',
    }}>
      {content}
      {showBottomNav && <BottomNav currentScreen={currentScreen} onNavigate={navigateTab} />}
    </div>
  );
}
