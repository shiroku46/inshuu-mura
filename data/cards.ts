import type {
  FaithTarget,
  CharacterCard,
  ObjectiveCard,
  ActionCard,
  EventCard,
  VisitorCard,
  CurseCard,
  GameStateSnapshot,
} from '@/types/game'

// ─── 信仰対象カード ───────────────────────────────────────────
export const FAITH_TARGETS: FaithTarget[] = [
  {
    id: 'faith_mountain_god',
    name: '山神',
    description: '山に宿る古き神。開放を嫌い、外来者の命を望む。',
    effects: [
      '開放度が上昇するたびに祟り+1',
      '訪問者を生贄にするたびに因習度+1',
    ],
  },
  {
    id: 'faith_water_god',
    name: '水神',
    description: '川と深淵を支配する神。祟りの減少を糧に、因習を深める。',
    effects: [
      '祟りが減少するたびに因習度+1',
      '祟りが0となった時点で因習度が即時消滅し、ゲーム終了',
    ],
  },
  {
    id: 'faith_thunder_god',
    name: '雷神',
    description: '嵐を呼ぶ荒ぶる神。祟りカードの発動を力に変える。',
    effects: [
      '祟りカードが発動したとき、因習度+1',
      '3ラウンドを超えた時点から毎ラウンド祟り+2',
    ],
  },
]

// ─── キャラクターカード ───────────────────────────────────────
export const CHARACTER_CARDS: CharacterCard[] = [
  {
    id: 'char_shinto_priest',
    name: '神主',
    description: '村の神事を取り仕切る。信仰の力に精通している。',
    abilityDescription: '信仰カードを使ったとき、祟りをさらに-1する。',
  },
  {
    id: 'char_village_officer',
    name: '村役場職員',
    description: '村の行政を担う職員。村の開放化を推進する。',
    abilityDescription: '開放カードを使ったとき、開放度をさらに+1する。',
  },
  {
    id: 'char_village_chief',
    name: '村長',
    description: '村の権力者。その一票は重い。',
    abilityDescription: '生贄投票で、自分の票を2票として数えてよい。',
  },
  {
    id: 'char_doctor',
    name: '医者',
    description: '村に赴任してきた医者。死を少しだけ遠ざける。',
    abilityDescription: '生存中、訪問者の生贄による開放度減少は-1で固定される。',
  },
  {
    id: 'char_villager',
    name: '村人',
    description: '普通の村人。特別な能力はない。',
    abilityDescription: '能力なし。',
  },
  {
    id: 'char_chuzai',
    name: '駐在',
    description: '村の駐在所に勤める警察官。不正を見逃さない。',
    abilityDescription: '生贄投票で、自分以外に投じられた票を1票だけ無効にしてよい。',
  },
]

// ─── 目的カード（ハンドアウト）────────────────────────────────
export const OBJECTIVE_CARDS: ObjectiveCard[] = [
  {
    id: 'obj_complete_tradition',
    name: '因習の完成',
    description: '因習村完成エンドかつ祟りが5以下で終了したら勝利。',
    tags: ['因習', '祟り'],
    checkWin: (_s: GameStateSnapshot) => false,
  },
  {
    id: 'obj_curse_manifestation',
    name: '祟りの顕現',
    description: '祟りエンドで終了したら勝利。',
    tags: ['祟り'],
    checkWin: (_s: GameStateSnapshot) => false,
  },
  {
    id: 'obj_tourist_village',
    name: '観光地化の皮',
    description: '観光地化エンドで終了、または因習村完成エンドかつ開放度5以上で勝利。',
    tags: ['因習', '開放'],
    checkWin: (_s: GameStateSnapshot) => false,
  },
  {
    id: 'obj_closed_village',
    name: '閉じた村',
    description: '過疎村エンド・停滞エンド・因習村完成エンドのいずれかで、開放度2以下なら勝利。',
    tags: ['因習', '開放'],
    checkWin: (_s: GameStateSnapshot) => false,
  },
  {
    id: 'obj_willing_sacrifice',
    name: '生贄志願',
    description: '自分が生贄として死亡したら即勝利。',
    tags: ['生存死亡'],
    checkWin: (_s: GameStateSnapshot) => false,
    immediateWin: true,
  },
  {
    id: 'obj_sacrifice_keeper',
    name: '贄帳の番人',
    description: 'ゲーム終了時に自身が生存しており、ゲーム中に4人以上が生贄となっていたら勝利。',
    tags: ['生存死亡'],
    checkWin: (_s: GameStateSnapshot) => false,
  },
  {
    id: 'obj_powerful_survivor',
    name: '権力者の生存',
    description: 'ゲーム終了時に自身が生存しており、祟りが5以上で終了したら勝利。',
    tags: ['生存死亡', '祟り'],
    checkWin: (_s: GameStateSnapshot) => false,
  },
]

// ─── 行動カード（7種×2枚）────────────────────────────────────
const ACTION_CARD_DEFINITIONS: Omit<ActionCard, 'instanceId'>[] = [
  // 因習カード
  {
    id: 'act_revive_old_rules',
    name: '古い掟の復活',
    type: 'tradition',
    description: '因習度+1、開放度-1',
  },
  {
    id: 'act_night_festival',
    name: '夜祭の準備',
    type: 'tradition',
    description: '因習度+1、開放度-1。来訪者欄に訪問者がいれば因習度+2に変わる。',
  },
  // 開放カード
  {
    id: 'act_tourism_pamphlet',
    name: '観光パンフレット',
    type: 'open',
    description: '開放度+1、因習度-1',
  },
  {
    id: 'act_ghost_spot',
    name: '心霊スポットとして売り出す',
    type: 'open',
    description: '開放度+1、祟り+1',
  },
  // 信仰カード
  {
    id: 'act_repair_shrine',
    name: '祠の修繕',
    type: 'faith',
    description: '祟り-2、開放度-1',
  },
  {
    id: 'act_touch_taboo',
    name: '禁忌の術式',
    type: 'faith',
    description: '祟り+2、因習度+1、開放度-1',
  },
  // 生贄カード
  {
    id: 'act_sacrifice_selection',
    name: '贄の選定',
    type: 'sacrifice',
    description: '祟り+1。このラウンド終了時、祟りが4以上なら生贄投票が発生する。',
  },
]

export const ACTION_CARDS: ActionCard[] = ACTION_CARD_DEFINITIONS.flatMap((def) => [
  { ...def, instanceId: `${def.id}_a` },
  { ...def, instanceId: `${def.id}_b` },
])

// ─── 訪問者カード ─────────────────────────────────────────────
// 通常デッキに入る4種。警察官はイベント「警察の聞き込み」で来訪者欄に直接追加される。
export const VISITOR_CARDS: VisitorCard[] = [
  {
    id: 'vis_folklorist',
    name: '民俗学者',
    effectDescription: '【パッシブ】場にある限り、因習カードの因習度と祟りに+1補正',
    description: '村の伝承を調べに来た研究者。',
  },
  {
    id: 'vis_streamer',
    name: '配信者',
    effectDescription: '【パッシブ】場にある限り、開放カードの開放度と祟りに+1補正',
    description: '村を動画で紹介する配信者。',
  },
  {
    id: 'vis_contractor',
    name: '土木業者',
    effectDescription: '【パッシブ】場にある限り、信仰カードの祟りに+2補正',
    description: '道路や施設の整備に関わる業者。',
  },
  {
    id: 'vis_tourist',
    name: '観光客',
    effectDescription: '【生贄時】因習度+1',
    description: '村を訪れた観光客。生贄にされると村の因習が深まる。',
  },
]

// ─── 祟りカード ───────────────────────────────────────────────
// 発動条件：ラウンド終了時に祟りが6以上
// 共通構造：因習+X → デバフ適用 → 生贄投票（祟り-1）
export const CURSE_CARDS: CurseCard[] = [
  {
    id: 'curse_mountain_roar',
    name: '山鳴り',
    description: '山が轟音を上げ、神の怒りが村を揺るがす。',
    inshuPointGain: 5,
    triggersSacrifice: true,
    debuffType: 'openness_decrease',
    debuffAmount: 3,
    debuffDescription: '開放度-3',
  },
  {
    id: 'curse_abyss_call',
    name: '水底の呼び声',
    description: '深淵から声が聞こえ、外界との繋がりが水底に沈んでいく。',
    inshuPointGain: 6,
    triggersSacrifice: true,
    debuffType: 'openness_decrease',
    debuffAmount: 2,
    debuffDescription: '開放度-2。以降、因習カードによる因習度上昇-1',
  },
  {
    id: 'curse_thunder_strike',
    name: '雷鎚鳴る',
    description: '雷神の槌が降り注ぎ、村人の持ち物を焼き尽くす。',
    inshuPointGain: 4,
    triggersSacrifice: true,
    debuffType: 'discard_all_cards',
    debuffAmount: 0,
    debuffDescription: '全プレイヤーの手持ちのカードをすべて捨て札にする',
  },
]

// ─── イベントカード ───────────────────────────────────────────
export const EVENT_CARDS: EventCard[] = [
  {
    id: 'evt_festival_season',
    name: '祭りの季節',
    type: 'event',
    description: 'このラウンドに使用するカードの因習度に+1補正',
  },
  {
    id: 'evt_village_revival',
    name: '村おこしの機運',
    type: 'event',
    description: 'このラウンドに使用するカードの開放度に+1補正',
  },
  {
    id: 'evt_ominous_rumor',
    name: '不穏な噂',
    type: 'event',
    description: 'このラウンドに使用する祟りが上昇するカードの祟りに+1補正',
  },
  {
    id: 'evt_shrine_destroyed',
    name: '祠の破壊',
    type: 'event',
    description: '即時に祟り+2。訪問者に観光客か配信者がいれば祟り+3（重複なし）',
  },
  {
    id: 'evt_police_inquiry',
    name: '警察の聞き込み',
    type: 'event',
    description: '即時に因習度-1、開放度-1。来訪者欄に警察官を置く',
  },
  {
    id: 'evt_divine_kidnapping',
    name: '神隠しの夜',
    type: 'event',
    description: 'このラウンド終了時、必ず生贄投票が発生する',
  },
]
