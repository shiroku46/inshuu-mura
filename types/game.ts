// ─── グリッド定数・型 ──────────────────────────────────────────
export const MAP_COLS = 5
export const MAP_ROWS = 4

export type Direction = 'up' | 'right' | 'down' | 'left'

// ─── カード型 ───────────────────────────────────────────────
export type CardType = 'terrain' | 'facility' | 'event' | 'visitor' | 'character' | 'objective'

export type CardBase = {
  id: string
  name: string
  type: CardType
  description: string
  tags: string[]
  effectText: string
}

// ─── 地形カード ───────────────────────────────────────────────
export type TerrainCard = CardBase & {
  type: 'terrain'
  connections: Direction[]
  inshuOutput: number
  opennessOutput: number
  curseOutput: number
}

// ─── 施設カード ───────────────────────────────────────────────
export type FacilityCard = CardBase & {
  type: 'facility'
  connections: Direction[]
  connectedToEntrance: boolean
  inshuOutput: number
  opennessOutput: number
  curseOutput: number
}

// ─── イベントカード ───────────────────────────────────────────
export type EventCard = CardBase & { type: 'event'; targetCardId: string | null }

// ─── 来訪者カード ───────────────────────────────────────────────
export type VisitorCard = CardBase & {
  type: 'visitor'
  requiredOpenness: number
  isSacrifice?: boolean
  stackedEventCardId?: string
}

// ─── キャラクターカード ───────────────────────────────────────
export type PassiveEffectType = 'none' | 'roundEnd' | 'sacrifice' | 'placeCard'

export type CharacterCard = CardBase & {
  type: 'character'
  passiveEffectText: string
  passiveEffectType: PassiveEffectType
}

// ─── 目的カード ───────────────────────────────────────────────
export type VictoryConditionType = 'tradition' | 'openness' | 'curseMin' | 'curseMax' | 'closedVillage' | 'balance'

export type ObjectiveCard = CardBase & {
  type: 'objective'
  victoryConditionType: VictoryConditionType
  victoryCondition: {
    traditionMin?: number
    openessMax?: number
    curseMin?: number
    curseMax?: number
  }
}

// ─── グリッド上のカード ─────────────────────────────────────
export type PlacedTerrainCard = {
  type: 'terrain'
  card: TerrainCard
  disabled: boolean
  connectedToEntrance: boolean
  overlayEvent?: EventCard
}

export type PlacedFacilityCard = {
  type: 'facility'
  card: FacilityCard
  disabled: boolean
  connectedToEntrance: boolean
  overlayEvent?: EventCard
}

export type PlacedCard = PlacedTerrainCard | PlacedFacilityCard

export type VillageGrid = (PlacedCard | null)[][]

// ─── プレイヤー ───────────────────────────────────────────────
export type Player = {
  id: string
  name: string
  character: CharacterCard
  objective: ObjectiveCard
  hand: string[]
}

// ─── 村マップ ───────────────────────────────────────────────
export type VillageMap = {
  grid: VillageGrid
}

// ─── ゲームステート ───────────────────────────────────────────
export type GamePhase = 'roundStart' | 'playerTurn' | 'roundEnd' | 'gameEnd'

export type GameState = {
  round: number
  currentPlayerIndex: number
  phase: GamePhase
  settledRound: number
  visitorAppeared: number
  sacrificeEventTriggered: number
  tradition: number
  openness: number
  curse: number
  players: Player[]
  villageMap: VillageMap
  selectedFaithTargetId: string | null
  visitorRow: VisitorCard[]
  eventDeck: EventCard[]
  visitorDeck: VisitorCard[]
  terrainDeck: TerrainCard[]
  facilityDeck: FacilityCard[]
  discardedCards: string[]
  placedThisRound: boolean[]
  logs: Array<{ message: string }>
}
