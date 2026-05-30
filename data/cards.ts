import type { TerrainCard, FacilityCard, EventCard, VisitorCard, CharacterCard, ObjectiveCard } from '@/types/game'

// ─── 信仰対象データ ───────────────────────────────────────────
export interface FaithTarget {
  id: string
  name: string
  type: string
  initialCardId: string
  affinityCardIds: string[]
}

export const FAITH_TARGETS: FaithTarget[] = [
  {
    id: 'mountain_god',
    name: '山神',
    type: '神系',
    initialCardId: 'terrain_mountain',
    affinityCardIds: ['facility_shrine', 'facility_small_shrine', 'terrain_mountain_path'],
  },
  {
    id: 'water_god',
    name: '水神',
    type: '神系',
    initialCardId: 'terrain_lake',
    affinityCardIds: ['facility_graveyard', 'facility_clinic', 'facility_inn'],
  },
  {
    id: 'ancestral_spirits',
    name: '祖霊',
    type: '霊系',
    initialCardId: 'facility_graveyard',
    affinityCardIds: ['facility_graveyard', 'facility_village_office', 'facility_branch_school'],
  },
  {
    id: 'cursed_relic',
    name: '呪具',
    type: '物品系',
    initialCardId: 'facility_ritual_storehouse',
    affinityCardIds: ['facility_shrine', 'facility_village_office', 'facility_local_museum', 'facility_small_shrine'],
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
  terrain_curve_ld: { inshuOutput: 0, opennessOutput: 0, curseOutput: 0 },
  terrain_curve_lu: { inshuOutput: 0, opennessOutput: 0, curseOutput: 0 },
  terrain_curve_ru: { inshuOutput: 0, opennessOutput: 0, curseOutput: 0 },
  terrain_curve_rd: { inshuOutput: 0, opennessOutput: 0, curseOutput: 0 },
  terrain_t_udr: { inshuOutput: 0, opennessOutput: 0, curseOutput: 0 },
  terrain_t_udl: { inshuOutput: 0, opennessOutput: 0, curseOutput: 0 },
  terrain_t_lrd: { inshuOutput: 0, opennessOutput: 0, curseOutput: 0 },
  terrain_t_lru: { inshuOutput: 0, opennessOutput: 0, curseOutput: 0 },
  terrain_crossroads: { inshuOutput: 0, opennessOutput: 0, curseOutput: 0 },
  terrain_lake: { inshuOutput: 0, opennessOutput: 0, curseOutput: 1 },
  terrain_mountain: { inshuOutput: 1, opennessOutput: 0, curseOutput: 0 },
  terrain_mountain_path: { inshuOutput: 1, opennessOutput: 0, curseOutput: 0 },
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
    id: 'terrain_curve_ld',
    name: '曲がり道（左下）',
    description: '左下。右側と上側に向かう曲がった道。',
    tags: ['移動', '複雑'],
    effectText: '方向を変える接続が可能',
    connections: ['right', 'up'],
  },
  {
    id: 'terrain_curve_lu',
    name: '曲がり道（左上）',
    description: '左上。右側と下側に向かう曲がった道。',
    tags: ['移動', '複雑'],
    effectText: '方向を変える接続が可能',
    connections: ['right', 'down'],
  },
  {
    id: 'terrain_curve_ru',
    name: '曲がり道（右上）',
    description: '右上。左側と下側に向かう曲がった道。',
    tags: ['移動', '複雑'],
    effectText: '方向を変える接続が可能',
    connections: ['left', 'down'],
  },
  {
    id: 'terrain_curve_rd',
    name: '曲がり道（右下）',
    description: '右下。左側と上側に向かう曲がった道。',
    tags: ['移動', '複雑'],
    effectText: '方向を変える接続が可能',
    connections: ['left', 'up'],
  },
  // T字路（4方向：閉じている方向で表記）
  {
    id: 'terrain_t_udr',
    name: 'T字路（左）',
    description: '上・下・右に向かう3方向の分岐。左が閉じている。',
    tags: ['移動', '分岐'],
    effectText: '3つの方向に接続可能',
    connections: ['up', 'down', 'right'],
  },
  {
    id: 'terrain_t_udl',
    name: 'T字路（右）',
    description: '上・下・左に向かう3方向の分岐。右が閉じている。',
    tags: ['移動', '分岐'],
    effectText: '3つの方向に接続可能',
    connections: ['up', 'down', 'left'],
  },
  {
    id: 'terrain_t_lrd',
    name: 'T字路（上）',
    description: '左・右・下に向かう3方向の分岐。上が閉じている。',
    tags: ['移動', '分岐'],
    effectText: '3つの方向に接続可能',
    connections: ['left', 'right', 'down'],
  },
  {
    id: 'terrain_t_lru',
    name: 'T字路（下）',
    description: '左・右・上に向かう3方向の分岐。下が閉じている。',
    tags: ['移動', '分岐'],
    effectText: '3つの方向に接続可能',
    connections: ['left', 'right', 'up'],
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
  // 水系
  {
    id: 'terrain_lake',
    name: '湖',
    description: '村近郊の湖。',
    tags: ['水', '祟り'],
    effectText: '祟りと関連する場所として機能',
    connections: [],
  },
  // 山系
  {
    id: 'terrain_mountain',
    name: '山',
    description: '村奥の山。古き信仰の場所。',
    tags: ['山岳', '信仰'],
    effectText: '因習度に影響する信仰地点',
    connections: [],
  },
  {
    id: 'terrain_mountain_path',
    name: '山道',
    description: '山へと向かう山道。',
    tags: ['移動', '山岳'],
    effectText: '山への道を形成',
    connections: ['up', 'down'],
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
  facility_shrine: { inshuOutput: 1, opennessOutput: 0, curseOutput: 0 },
  facility_graveyard: { inshuOutput: 1, opennessOutput: 0, curseOutput: -1 },
  facility_village_office: { inshuOutput: 0, opennessOutput: 1, curseOutput: 0 },
  facility_police_box: { inshuOutput: 0, opennessOutput: 1, curseOutput: -1 },
  facility_clinic: { inshuOutput: 0, opennessOutput: 1, curseOutput: 0 },
  facility_branch_school: { inshuOutput: 0, opennessOutput: 1, curseOutput: 0 },
  facility_inn: { inshuOutput: 0, opennessOutput: 2, curseOutput: 0 },
  facility_small_shrine: { inshuOutput: 1, opennessOutput: 0, curseOutput: 0 },
  facility_local_museum: { inshuOutput: 1, opennessOutput: 0, curseOutput: 0 },
  facility_ritual_storehouse: { inshuOutput: 1, opennessOutput: 0, curseOutput: 0 },
}

// ─── 施設カード ───────────────────────────────────────────────
const FACILITY_CARD_DEFS: Omit<FacilityCard, 'type' | 'connectedToEntrance' | 'inshuOutput' | 'opennessOutput' | 'curseOutput'>[] = [
  {
    id: 'facility_shrine',
    name: '神社',
    description: '信仰の中心となる大きな神社。',
    tags: ['信仰', '中心'],
    effectText: 'ラウンド終了時：因習度+1',
    connections: ['up'],
  },
  {
    id: 'facility_graveyard',
    name: '墓地',
    description: '村の古い歴史を埋葬する場所。',
    tags: ['因習', '祟り'],
    effectText: 'ラウンド終了時：因習度+1、祟り-1',
    connections: ['down'],
  },
  {
    id: 'facility_village_office',
    name: '村役場',
    description: '村政を司る中心施設。',
    tags: ['開放', '行政'],
    effectText: 'ラウンド終了時：開放度+1',
    connections: ['right', 'down'],
  },
  {
    id: 'facility_police_box',
    name: '駐在所',
    description: '警察の詰所。秩序を守る場所。',
    tags: ['開放', '秩序'],
    effectText: 'ラウンド終了時：開放度+1、祟り-1',
    connections: ['left', 'down'],
  },
  {
    id: 'facility_clinic',
    name: '診療所',
    description: '村民の健康を守る診療所。',
    tags: ['開放', '医療'],
    effectText: 'ラウンド終了時：開放度+1',
    connections: ['right', 'up'],
  },
  {
    id: 'facility_branch_school',
    name: '分校',
    description: '村の子どもたちが学ぶ学校。',
    tags: ['開放', '教育'],
    effectText: 'ラウンド終了時：開放度+1',
    connections: ['left', 'up'],
  },
  {
    id: 'facility_inn',
    name: '旅館',
    description: '旅人を泊める旅館。村外との交流点。',
    tags: ['開放', '交流'],
    effectText: 'ラウンド終了時：開放度+2',
    connections: ['up', 'left', 'right'],
  },
  {
    id: 'facility_small_shrine',
    name: '祠',
    description: '小さな祠。信仰の拠点。',
    tags: ['信仰'],
    effectText: 'ラウンド終了時：因習度+1',
    connections: ['up'],
  },
  {
    id: 'facility_local_museum',
    name: '郷土資料館',
    description: '村の歴史と文化を保存する施設。',
    tags: ['因習', '文化'],
    effectText: 'ラウンド終了時：因習度+1',
    connections: ['left', 'right'],
  },
  {
    id: 'facility_ritual_storehouse',
    name: '祭具殿',
    description: '祭具や呪物を保管する場所。',
    tags: ['信仰', '呪具'],
    effectText: 'ラウンド終了時：因習度+1',
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
