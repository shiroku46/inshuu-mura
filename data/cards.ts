import type { FaithCard, TerrainCard, FacilityCard, EventCard, VisitorCard, CharacterCard, ObjectiveCard } from '@/types/game'

// ─── 信仰対象カード ───────────────────────────────────────────
export const FAITH_CARDS: FaithCard[] = [
  {
    id: 'faith_mountain_god',
    type: 'faith',
    name: '山奥の地主神',
    description: '山奥に宿る古き神。開放が進むほど祟りも増す。',
    tags: ['因習', '祟り'],
    effectText: '開放度上昇時：祟り+1（上昇量分）。訪問者生贄時：因習度+1',
  },
  {
    id: 'faith_festival_god',
    type: 'faith',
    name: '祭囃子に宿るもの',
    description: '祭りの音に宿る霊。生贄の儀式を喜ぶ。',
    tags: ['因習', '祟り', '生贄'],
    effectText: '生贄イベント発生時：祟り+1。開放度3以上で訪問者生贄時：因習度+1',
  },
]

// ─── キャラクターカード ───────────────────────────────────────
export const CHARACTER_CARDS: CharacterCard[] = [
  {
    id: 'char_village_chief',
    type: 'character',
    name: '村長',
    description: '村の権力者。その言葉は重い。',
    tags: ['因習', '権力'],
    effectText: 'ラウンド終了時：因習度+1',
    passiveEffectText: 'ラウンド終了時：因習度+1',
    passiveEffectType: 'roundEnd',
  },
  {
    id: 'char_shinto_priest',
    type: 'character',
    name: '神主',
    description: '村の神事を取り仕切る人物。',
    tags: ['信仰', '因習'],
    effectText: '生贄成立時：祟り-1',
    passiveEffectText: '生贄成立時：祟り-1',
    passiveEffectType: 'sacrifice',
  },
  {
    id: 'char_doctor',
    type: 'character',
    name: '医師',
    description: '村に赴任してきた医者。',
    tags: ['開放', '祟り'],
    effectText: 'ラウンド終了時：祟り+1、開放度+1',
    passiveEffectText: 'ラウンド終了時：祟り+1、開放度+1',
    passiveEffectType: 'roundEnd',
  },
  {
    id: 'char_tourism_officer',
    type: 'character',
    name: '観光課長',
    description: '村の開放化を推進する職員。',
    tags: ['開放', '祟り'],
    effectText: 'ラウンド終了時：開放度+1',
    passiveEffectText: 'ラウンド終了時：開放度+1',
    passiveEffectType: 'roundEnd',
  },
  {
    id: 'char_villager',
    type: 'character',
    name: '村人',
    description: '普通の村人。',
    tags: ['生存'],
    effectText: 'パッシブ能力なし',
    passiveEffectText: 'パッシブ能力なし',
    passiveEffectType: 'none',
  },
  {
    id: 'char_elder',
    type: 'character',
    name: '古老',
    description: '村の歴史を知る高齢者。',
    tags: ['因習', '知識'],
    effectText: 'パッシブ能力なし',
    passiveEffectText: 'パッシブ能力なし',
    passiveEffectType: 'none',
  },
]

// ─── 目的カード ───────────────────────────────────────────────
export const OBJECTIVE_CARDS: ObjectiveCard[] = [
  {
    id: 'obj_tradition_village',
    type: 'objective',
    name: '因習村化',
    description: 'ゲーム終了時、因習度8以上で勝利',
    tags: ['因習', '勝利'],
    effectText: '因習度 ≥ 8 で勝利',
    victoryConditionType: 'tradition',
    victoryCondition: { traditionMin: 8 },
  },
  {
    id: 'obj_tourist_development',
    type: 'objective',
    name: '観光地化',
    description: 'ゲーム終了時、開放度6以上で勝利',
    tags: ['開放', '勝利'],
    effectText: '開放度 ≥ 6 で勝利',
    victoryConditionType: 'openness',
    victoryCondition: { openessMax: 6 },
  },
  {
    id: 'obj_curse_suppression',
    type: 'objective',
    name: '祟りの鎮静',
    description: 'ゲーム終了時、祟り2以下で勝利',
    tags: ['祟り', '勝利'],
    effectText: '祟り ≤ 2 で勝利',
    victoryConditionType: 'curseMin',
    victoryCondition: { curseMax: 2 },
  },
  {
    id: 'obj_curse_expansion',
    type: 'objective',
    name: '災厄の拡大',
    description: 'ゲーム終了時、祟り7以上で勝利',
    tags: ['祟り', '勝利'],
    effectText: '祟り ≥ 7 で勝利',
    victoryConditionType: 'curseMax',
    victoryCondition: { curseMin: 7 },
  },
  {
    id: 'obj_closed_village',
    type: 'objective',
    name: '閉鎖集落',
    description: 'ゲーム終了時、因習度5以上かつ開放度2以下で勝利',
    tags: ['因習', '開放', '勝利'],
    effectText: '因習度 ≥ 5 AND 開放度 ≤ 2 で勝利',
    victoryConditionType: 'closedVillage',
    victoryCondition: { traditionMin: 5, openessMax: 2 },
  },
  {
    id: 'obj_balance_maintenance',
    type: 'objective',
    name: '均衡維持',
    description: 'ゲーム終了時、各トークンが指定範囲内で勝利',
    tags: ['均衡', '勝利'],
    effectText: '因習度: 3-7, 開放度: 3-7, 祟り: 3-5 で勝利',
    victoryConditionType: 'balance',
    victoryCondition: { traditionMin: 3, curseMin: 3, curseMax: 5 },
  },
]

// ─── 地形カード出力値を定義 ────────────────────────────────────
const terrainOutputs: Record<string, { inshuOutput: number; opennessOutput: number; curseOutput: number }> = {
  terrain_straight_vertical: { inshuOutput: 0, opennessOutput: 0, curseOutput: 0 },
  terrain_straight_horizontal: { inshuOutput: 0, opennessOutput: 0, curseOutput: 0 },
  terrain_curve_ur: { inshuOutput: 0, opennessOutput: 0, curseOutput: 0 },
  terrain_curve_rd: { inshuOutput: 0, opennessOutput: 0, curseOutput: 0 },
  terrain_curve_dl: { inshuOutput: 0, opennessOutput: 0, curseOutput: 0 },
  terrain_curve_lu: { inshuOutput: 0, opennessOutput: 0, curseOutput: 0 },
  terrain_t_urd: { inshuOutput: 0, opennessOutput: 0, curseOutput: 0 },
  terrain_t_rdl: { inshuOutput: 0, opennessOutput: 0, curseOutput: 0 },
  terrain_t_dlu: { inshuOutput: 0, opennessOutput: 0, curseOutput: 0 },
  terrain_t_lur: { inshuOutput: 0, opennessOutput: 0, curseOutput: 0 },
  terrain_crossroads: { inshuOutput: 0, opennessOutput: 0, curseOutput: 0 },
  terrain_mountain_vertical: { inshuOutput: 1, opennessOutput: 0, curseOutput: 0 },
  terrain_mountain_horizontal: { inshuOutput: 1, opennessOutput: 0, curseOutput: 0 },
  terrain_river: { inshuOutput: 0, opennessOutput: 1, curseOutput: 0 },
  terrain_lake: { inshuOutput: 0, opennessOutput: 0, curseOutput: 1 },
}

// ─── 地形カード ───────────────────────────────────────────────
const TERRAIN_CARD_DEFS: Omit<TerrainCard, 'type' | 'inshuOutput' | 'opennessOutput' | 'curseOutput'>[] = [
  // 直線道
  {
    id: 'terrain_straight_vertical',
    name: '縦の道',
    description: '村を南北に通る道。',
    tags: ['移動', '繋がり'],
    effectText: '他のカードへの接続を可能にする',
    connections: ['up', 'down'],
  },
  {
    id: 'terrain_straight_horizontal',
    name: '横の道',
    description: '村を東西に通る道。',
    tags: ['移動', '繋がり'],
    effectText: '他のカードへの接続を可能にする',
    connections: ['left', 'right'],
  },
  // 曲がり道（4方向：角の位置で定義）
  {
    id: 'terrain_curve_ur',
    name: '曲がり道（上右角）',
    description: '上右の角。上と右に向かう曲がった道。',
    tags: ['移動', '複雑'],
    effectText: '方向を変える接続が可能',
    connections: ['up', 'right'],
  },
  {
    id: 'terrain_curve_rd',
    name: '曲がり道（右下角）',
    description: '右下の角。右と下に向かう曲がった道。',
    tags: ['移動', '複雑'],
    effectText: '方向を変える接続が可能',
    connections: ['right', 'down'],
  },
  {
    id: 'terrain_curve_dl',
    name: '曲がり道（下左角）',
    description: '下左の角。下と左に向かう曲がった道。',
    tags: ['移動', '複雑'],
    effectText: '方向を変える接続が可能',
    connections: ['down', 'left'],
  },
  {
    id: 'terrain_curve_lu',
    name: '曲がり道（左上角）',
    description: '左上の角。左と上に向かう曲がった道。',
    tags: ['移動', '複雑'],
    effectText: '方向を変える接続が可能',
    connections: ['left', 'up'],
  },
  // T字路（4方向）
  {
    id: 'terrain_t_urd',
    name: 'T字路（上右下）',
    description: '上・右・下に向かう3方向の分岐。',
    tags: ['移動', '分岐'],
    effectText: '3つの方向に接続可能',
    connections: ['up', 'right', 'down'],
  },
  {
    id: 'terrain_t_rdl',
    name: 'T字路（右下左）',
    description: '右・下・左に向かう3方向の分岐。',
    tags: ['移動', '分岐'],
    effectText: '3つの方向に接続可能',
    connections: ['right', 'down', 'left'],
  },
  {
    id: 'terrain_t_dlu',
    name: 'T字路（下左上）',
    description: '下・左・上に向かう3方向の分岐。',
    tags: ['移動', '分岐'],
    effectText: '3つの方向に接続可能',
    connections: ['down', 'left', 'up'],
  },
  {
    id: 'terrain_t_lur',
    name: 'T字路（左上右）',
    description: '左・上・右に向かう3方向の分岐。',
    tags: ['移動', '分岐'],
    effectText: '3つの方向に接続可能',
    connections: ['left', 'up', 'right'],
  },
  // 十字路
  {
    id: 'terrain_crossroads',
    name: '辻道',
    description: '複数の道が交わる中心地点。',
    tags: ['移動', '中心'],
    effectText: '4つの方向すべてに接続可能',
    connections: ['up', 'right', 'down', 'left'],
  },
  // 山道（2方向）
  {
    id: 'terrain_mountain_vertical',
    name: '山道（南北）',
    description: '険しい山越えの南北の道。',
    tags: ['移動', '困難'],
    effectText: '困難な接続を表す',
    connections: ['up', 'down'],
  },
  {
    id: 'terrain_mountain_horizontal',
    name: '山道（東西）',
    description: '険しい山越えの東西の道。',
    tags: ['移動', '困難'],
    effectText: '困難な接続を表す',
    connections: ['left', 'right'],
  },
  // 水系
  {
    id: 'terrain_river',
    name: '川',
    description: '村を流れる川。',
    tags: ['水', '境界'],
    effectText: '区域を分ける境界線として機能',
    connections: ['left', 'right'],
  },
  {
    id: 'terrain_lake',
    name: '湖',
    description: '村近郊の湖。',
    tags: ['水', '祟り'],
    effectText: '祟りと関連する場所として機能',
    connections: [],
  },
]

export const TERRAIN_CARDS: TerrainCard[] = TERRAIN_CARD_DEFS.map(card => {
  const outputs = terrainOutputs[card.id] || { inshuOutput: 0, opennessOutput: 0, curseOutput: 0 }
  return {
    ...card,
    type: 'terrain' as const,
    ...outputs,
  }
})

// ─── 地形カードデッキ（各2枚） ────────────────────────────────
export const TERRAIN_DECK: TerrainCard[] = TERRAIN_CARD_DEFS.flatMap(def => {
  const outputs = terrainOutputs[def.id] || { inshuOutput: 0, opennessOutput: 0, curseOutput: 0 }
  return [
    { ...def, type: 'terrain' as const, ...outputs },
    { ...def, type: 'terrain' as const, ...outputs },
  ]
})

// ─── 施設カード出力値を定義 ────────────────────────────────────
const facilityOutputs: Record<string, { inshuOutput: number; opennessOutput: number; curseOutput: number }> = {
  facility_shrine: { inshuOutput: 2, opennessOutput: 0, curseOutput: -1 },
  facility_old_well: { inshuOutput: 1, opennessOutput: 0, curseOutput: 1 },
  facility_police_box: { inshuOutput: 0, opennessOutput: 2, curseOutput: 0 },
  facility_information_center: { inshuOutput: 0, opennessOutput: 3, curseOutput: 0 },
  facility_graveyard: { inshuOutput: 1, opennessOutput: 0, curseOutput: 1 },
  facility_small_shrine: { inshuOutput: 2, opennessOutput: 0, curseOutput: 0 },
}

// ─── 施設カード ───────────────────────────────────────────────
const FACILITY_CARD_DEFS: Omit<FacilityCard, 'type' | 'connectedToEntrance' | 'inshuOutput' | 'opennessOutput' | 'curseOutput'>[] = [
  {
    id: 'facility_shrine',
    name: '神社',
    description: '信仰の中心となる大きな神社。',
    tags: ['信仰', '中心'],
    effectText: '（将来実装：信仰関連の効果）',
    connections: ['up', 'down'],
  },
  {
    id: 'facility_old_well',
    name: '古井戸',
    description: '村の古い井戸。祟りの源？',
    tags: ['祟り', '秘密'],
    effectText: '（将来実装：祟り関連の効果）',
    connections: [],
  },
  {
    id: 'facility_police_box',
    name: '駐在所',
    description: '警察の詰所。秩序を守る場所。',
    tags: ['開放', '秩序'],
    effectText: '（将来実装：開放度関連の効果）',
    connections: ['up', 'right'],
  },
  {
    id: 'facility_information_center',
    name: '観光案内所',
    description: '村の観光情報を発信する場所。',
    tags: ['開放', '訪問者'],
    effectText: '（将来実装：訪問者・開放度関連の効果）',
    connections: ['left', 'right'],
  },
  {
    id: 'facility_graveyard',
    name: '墓地',
    description: '村の古い歴史を埋葬する場所。',
    tags: ['因習', '祟り'],
    effectText: '（将来実装：因習・祟り関連の効果）',
    connections: ['up'],
  },
  {
    id: 'facility_small_shrine',
    name: '祠',
    description: '小さな祠。信仰の拠点。',
    tags: ['信仰'],
    effectText: '（将来実装：信仰関連の効果）',
    connections: ['down'],
  },
]

export const FACILITY_CARDS: FacilityCard[] = FACILITY_CARD_DEFS.map(card => {
  const outputs = facilityOutputs[card.id] || { inshuOutput: 0, opennessOutput: 0, curseOutput: 0 }
  return {
    ...card,
    type: 'facility' as const,
    connectedToEntrance: false,
    ...outputs,
  }
})

// ─── 施設カードデッキ（各1枚） ────────────────────────────────
export const FACILITY_DECK: FacilityCard[] = FACILITY_CARD_DEFS.map(def => {
  const outputs = facilityOutputs[def.id] || { inshuOutput: 0, opennessOutput: 0, curseOutput: 0 }
  return {
    ...def,
    type: 'facility' as const,
    connectedToEntrance: false,
    ...outputs,
  }
})

// ─── イベントカード ───────────────────────────────────────────
export const EVENT_CARDS: EventCard[] = [
  {
    id: 'evt_festival_season',
    type: 'event',
    name: '祭りの季節',
    description: '村で大きな祭りが催される。',
    tags: ['因習', 'イベント'],
    effectText: '因習度+1。来訪者がいれば生贄イベント発生',
    targetCardId: null,
  },
  {
    id: 'evt_foreign_journalist',
    type: 'event',
    name: '外部記者が来る',
    description: '外部のマスコミが村を取材に来た。',
    tags: ['開放', 'イベント'],
    effectText: '開放度3以上なら祟り+1',
    targetCardId: null,
  },
  {
    id: 'evt_youth_disappearance',
    type: 'event',
    name: '若者の失踪',
    description: '村の若者が忽然と姿を消す。',
    tags: ['祟り', 'イベント'],
    effectText: '祟り+1。来訪者欄の訪問者1人を捨て札',
    targetCardId: null,
  },
  {
    id: 'evt_shrine_destruction',
    type: 'event',
    name: '祠が壊れる',
    description: '村の祠が何らかの理由で破壊される。',
    tags: ['祟り', 'イベント'],
    effectText: '祟り+2',
    targetCardId: null,
  },
  {
    id: 'evt_spiritual_spot_spread',
    type: 'event',
    name: '心霊スポットとして拡散',
    description: 'SNSで心霊スポットとして話題になる。',
    tags: ['開放', '祟り', 'イベント'],
    effectText: '開放度+1、祟り+1',
    targetCardId: null,
  },
  {
    id: 'evt_relocation_candidate_visit',
    type: 'event',
    name: '移住希望者の視察',
    description: '移住を考えている人が村を訪れる。',
    tags: ['開放', 'イベント'],
    effectText: '開放度+1',
    targetCardId: null,
  },
  {
    id: 'evt_kamikakushi_night',
    type: 'event',
    name: '神隠しの夜',
    description: 'この夜、何かが村を訪れる。',
    tags: ['祟り', 'イベント'],
    effectText: '生贄イベント発生',
    targetCardId: null,
  },
  {
    id: 'evt_police_inquiry',
    type: 'event',
    name: '警察の聞き込み',
    description: '警察がやってきて村人に聞き込みをする。',
    tags: ['開放', 'イベント'],
    effectText: '開放度4以上なら祟り+2、3以下なら祟り+1',
    targetCardId: null,
  },
  {
    id: 'evt_sacrifice_ritual',
    type: 'event',
    name: '生贄の儀式',
    description: '祟りを鎮めるための儀式が執り行われる。',
    tags: ['祟り', '生贄', 'イベント'],
    effectText: '因習度+3、開放度-2、祟り-2',
    targetCardId: null,
  },
]

// ─── 訪問者カード ───────────────────────────────────────────────
export const VISITOR_CARDS: VisitorCard[] = [
  {
    id: 'vis_tourist',
    type: 'visitor',
    name: '観光客',
    description: '村を訪れた観光客。',
    tags: ['開放', '訪問者'],
    effectText: '因習度+1',
    requiredOpenness: 1,
  },
  {
    id: 'vis_folklorist',
    type: 'visitor',
    name: '民俗学者',
    description: '村の伝承を調べに来た研究者。',
    tags: ['因習', '知識', '訪問者'],
    effectText: '他プレイヤー1人の目的のタグを確認できる',
    requiredOpenness: 2,
  },
  {
    id: 'vis_relocation_candidate',
    type: 'visitor',
    name: '移住希望者',
    description: '村への移住を検討している人。',
    tags: ['開放', '訪問者'],
    effectText: '因習度+1',
    requiredOpenness: 2,
  },
  {
    id: 'vis_urban_legend_fan',
    type: 'visitor',
    name: '都市伝説マニア',
    description: '心霊スポット好きの愛好家。',
    tags: ['祟り', '訪問者'],
    effectText: '祟り+1、因習度+1',
    requiredOpenness: 2,
  },
  {
    id: 'vis_content_creator',
    type: 'visitor',
    name: '配信者',
    description: '動画配信で村を紹介する。',
    tags: ['開放', '祟り', '訪問者'],
    effectText: '開放度+1、祟り+1',
    requiredOpenness: 3,
  },
  {
    id: 'vis_journalist',
    type: 'visitor',
    name: '記者',
    description: '新聞社から村を取材に来た記者。',
    tags: ['開放', '知識', '訪問者'],
    effectText: '他プレイヤー1人の目的のタグを確認できる、祟り+1',
    requiredOpenness: 3,
  },
  {
    id: 'vis_construction_worker',
    type: 'visitor',
    name: '土木業者',
    description: '村の道路や施設の整備に関わる。',
    tags: ['開放', '訪問者'],
    effectText: '開放度+1',
    requiredOpenness: 2,
  },
  {
    id: 'vis_government_official',
    type: 'visitor',
    name: '行政職員',
    description: '市町村役場の職員。',
    tags: ['開放', '秩序', '訪問者'],
    effectText: '祟り-2',
    requiredOpenness: 4,
  },
]
