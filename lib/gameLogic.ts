import type { GameState, Player, VillageMap, VillageGrid, TerrainCard, FacilityCard, EventCard, MAP_COLS, MAP_ROWS, PlacedCard, Direction } from '@/types/game'
import { CHARACTER_CARDS, OBJECTIVE_CARDS, FAITH_CARDS, EVENT_CARDS, VISITOR_CARDS, TERRAIN_DECK, FACILITY_DECK, TERRAIN_CARDS, FACILITY_CARDS } from '@/data/cards'

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function getOppositeDirection(dir: Direction): Direction {
  return dir === 'up' ? 'down' : dir === 'down' ? 'up' : dir === 'left' ? 'right' : 'left'
}

function isConnected(state: GameState, col1: number, row1: number, col2: number, row2: number): boolean {
  const cell1 = state.villageMap.grid[row1]?.[col1]
  const cell2 = state.villageMap.grid[row2]?.[col2]

  if (!cell1 || !cell2) return false
  if (cell1.type === 'faith' || cell2.type === 'faith') return false

  // 隣接していない
  const diffCol = col2 - col1
  const diffRow = row2 - row1
  if ((Math.abs(diffCol) + Math.abs(diffRow)) !== 1) return false

  let dir1: Direction | null = null
  if (diffCol === 1) dir1 = 'right'
  else if (diffCol === -1) dir1 = 'left'
  else if (diffRow === 1) dir1 = 'down'
  else if (diffRow === -1) dir1 = 'up'

  if (!dir1) return false

  // cell1が dir1 方向に接続しているか、cell2がその逆方向に接続しているかチェック
  const dir2 = getOppositeDirection(dir1)

  // cell1は地形または施設カード
  if (cell1.type !== 'terrain' && cell1.type !== 'facility') return false
  if ((cell1 as any).disabled) return false
  if (!cell1.card.connections.includes(dir1)) return false

  // cell2は地形または施設カード
  if (cell2.type === 'terrain') {
    if ((cell2 as any).disabled) return false
    return cell2.card.connections.includes(dir2)
  } else if (cell2.type === 'facility') {
    if ((cell2 as any).disabled) return false
    return cell2.card.connections.includes(dir2)
  }

  return false
}

export function canPlaceTerrainCardAt(
  state: GameState,
  col: number,
  row: number,
  card: TerrainCard | FacilityCard
): boolean {
  // セルが範囲内か確認
  if (col < 0 || col >= 5 || row < 0 || row >= 4) return false

  // セルが空いているか確認
  const cell = state.villageMap.grid[row]?.[col]
  if (cell !== null && cell !== undefined) return false

  // 村の入口未選択時は配置不可
  const entranceCol = state.villageMap.entranceCol
  if (entranceCol < 0) return false

  const neighbors = [
    { col: col - 1, row },
    { col: col + 1, row },
    { col, row: row - 1 },
    { col, row: row + 1 },
  ]

  const cardConnections = card.connections

  // 村の入口の直上（row=3, col=entranceCol）のみに置ける
  if (col === entranceCol && row === 3 && card.type === 'terrain') {
    if (cardConnections.includes('down')) {
      return true
    }
  }

  // 隣接する接続済みカードと矢印が繋がるか確認
  const connectedTiles = findConnectedTiles(state)
  let hasConnection = false

  // 新規カードの各接続方向について、隣接セルが対応する接続を持つかチェック
  for (const dir of cardConnections) {
    let nextCol = col
    let nextRow = row

    if (dir === 'up') nextRow--
    else if (dir === 'down') nextRow++
    else if (dir === 'left') nextCol--
    else if (dir === 'right') nextCol++

    // 隣接セルが範囲外 → スキップ（配置不可ではない）
    if (nextCol < 0 || nextCol >= 5 || nextRow < 0 || nextRow >= 4) {
      continue
    }

    const neighborCell = state.villageMap.grid[nextRow]?.[nextCol]

    // 隣接セルが空 → スキップ（配置不可ではない）
    if (!neighborCell) {
      continue
    }

    // 隣接セルが信仰カード → 配置不可
    if (neighborCell.type === 'faith') {
      return false
    }

    // 隣接セルが無効 → 配置不可
    if ((neighborCell as any).disabled) {
      return false
    }

    // 隣接セルが対応する方向の接続を持つか確認
    const oppositeDir = getOppositeDirection(dir)
    if (!neighborCell.card.connections.includes(oppositeDir)) {
      return false
    }

    // 隣接セルが接続済みなら接続している
    if (connectedTiles.has(`${nextCol},${nextRow}`)) {
      hasConnection = true
    }
  }

  // カードが接続方向を持たない場合（connections: []）は、隣接する接続済みセルに接続する場合のみ配置可能
  if (cardConnections.length === 0) {
    for (const neighbor of neighbors) {
      if (neighbor.col < 0 || neighbor.col >= 5 || neighbor.row < 0 || neighbor.row >= 4) continue

      const isNeighborConnected = connectedTiles.has(`${neighbor.col},${neighbor.row}`)
      if (isNeighborConnected) {
        return true
      }
    }
    return false
  }

  // 接続方向を持つカードが、接続先を持つ場合のみ配置可能
  return hasConnection
}

export function findConnectedTiles(state: GameState): Set<string> {
  const connected = new Set<string>()
  const queue: Array<{ col: number; row: number }> = []

  // 村の入口未選択時は接続チェックなし
  if (state.villageMap.entranceCol < 0) {
    return connected
  }

  // 村の入口：下辺（row=3、col は可変）
  const entranceCol = state.villageMap.entranceCol
  const entranceRow = 3
  const entranceCell = state.villageMap.grid[entranceRow]?.[entranceCol]
  if (entranceCell && (entranceCell.type === 'terrain' || entranceCell.type === 'facility') && !entranceCell.disabled && entranceCell.card.connections.includes('down')) {
    const key = `${entranceCol},${entranceRow}`
    connected.add(key)
    queue.push({ col: entranceCol, row: entranceRow })
  }

  // BFS
  while (queue.length > 0) {
    const { col, row } = queue.shift()!
    const directions: Array<{ col: number; row: number }> = [
      { col: col - 1, row },
      { col: col + 1, row },
      { col, row: row - 1 },
      { col, row: row + 1 },
    ]

    for (const neighbor of directions) {
      if (neighbor.col < 0 || neighbor.col >= 5 || neighbor.row < 0 || neighbor.row >= 4) continue
      const key = `${neighbor.col},${neighbor.row}`
      if (connected.has(key)) continue

      if (isConnected(state, col, row, neighbor.col, neighbor.row)) {
        connected.add(key)
        const cell = state.villageMap.grid[neighbor.row][neighbor.col]
        if (cell && (cell.type === 'terrain' || cell.type === 'facility')) {
          queue.push(neighbor)
        }
      }
    }
  }

  return connected
}

function updateConnectivity(state: GameState): GameState {
  const connectedTiles = findConnectedTiles(state)
  const newGrid: typeof state.villageMap.grid = state.villageMap.grid.map((row) => [...row])

  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 5; col++) {
      const cell = newGrid[row][col]
      if (!cell) continue

      if (cell.type === 'terrain') {
        // 地形カードの connectedToEntrance を更新
        const isConnected = connectedTiles.has(`${col},${row}`)
        newGrid[row][col] = { ...cell, connectedToEntrance: isConnected }
      } else if (cell.type === 'facility') {
        // 施設カードの connectedToEntrance を更新
        const neighbors = [
          { col: col - 1, row },
          { col: col + 1, row },
          { col, row: row - 1 },
          { col, row: row + 1 },
        ]

        let isConnectedToEntrance = false
        for (const neighbor of neighbors) {
          if (neighbor.col < 0 || neighbor.col >= 5 || neighbor.row < 0 || neighbor.row >= 4) continue
          if (connectedTiles.has(`${neighbor.col},${neighbor.row}`)) {
            isConnectedToEntrance = true
            break
          }
        }

        newGrid[row][col] = { ...cell, connectedToEntrance: isConnectedToEntrance }
      }
    }
  }

  return {
    ...state,
    villageMap: { ...state.villageMap, grid: newGrid },
  }
}

export function createInitialState(playerNames: string[] = ['プレイヤー1', 'プレイヤー2', 'プレイヤー3', 'プレイヤー4']): GameState {
  const shuffledChars = shuffle(CHARACTER_CARDS)
  const shuffledObjs = shuffle(OBJECTIVE_CARDS)
  const shuffledFaith = shuffle(FAITH_CARDS)
  const shuffledEvents = shuffle(EVENT_CARDS)
  const shuffledVisitors = shuffle(VISITOR_CARDS)
  const shuffledTerrain = shuffle(TERRAIN_DECK)
  const shuffledFacility = shuffle(FACILITY_DECK)

  const players: Player[] = playerNames.slice(0, 4).map((name, i) => {
    const hand: string[] = []
    // 地形カード 2枚
    for (let j = 0; j < 2 && shuffledTerrain.length > 0; j++) {
      hand.push(shuffledTerrain.pop()!.id)
    }
    // 施設カード 2枚
    for (let j = 0; j < 2 && shuffledFacility.length > 0; j++) {
      hand.push(shuffledFacility.pop()!.id)
    }
    // イベントカード 1枚
    for (let j = 0; j < 1 && shuffledEvents.length > 0; j++) {
      hand.push(shuffledEvents.pop()!.id)
    }

    return {
      id: `player_${i}`,
      name,
      character: shuffledChars[i],
      objective: shuffledObjs[i],
      hand,
    }
  })

  const faithCard = shuffledFaith[0]
  const faithCol = Math.floor(Math.random() * 5) // MAP_COLS = 5

  // 5×4 グリッドを初期化
  const grid: VillageGrid = Array.from({ length: 4 }, () => Array(5).fill(null))
  grid[0][faithCol] = { type: 'faith', card: faithCard }

  const villageMap: VillageMap = {
    faithCard,
    faithPosition: { col: faithCol, row: 0 },
    entranceCol: -1,
    grid,
  }

  return {
    round: 1,
    currentPlayerIndex: 0,
    phase: 'selectEntrance' as const,
    settledRound: 0,
    visitorAppeared: 0,
    sacrificeEventTriggered: 0,
    tradition: 0,
    openness: 0,
    curse: 0,
    players,
    villageMap,
    visitorRow: [],
    eventDeck: shuffledEvents,
    visitorDeck: shuffledVisitors,
    terrainDeck: shuffledTerrain,
    facilityDeck: shuffledFacility,
    discardedCards: [],
    placedThisRound: players.map(() => false),
    logs: [],
  }
}

export function selectEntrance(state: GameState, col: number): GameState {
  // バリデーション
  if (state.phase !== 'selectEntrance') return state
  if (col < 0 || col >= 5) return state
  if (state.currentPlayerIndex !== 0) return state
  if (state.villageMap.entranceCol >= 0) return state

  // 入口を設定して roundStart フェーズへ遷移
  return {
    ...state,
    villageMap: { ...state.villageMap, entranceCol: col },
    phase: 'roundStart' as const,
  }
}

export function placeCard(
  state: GameState,
  col: number,
  row: number,
  card: TerrainCard | FacilityCard,
  playerIndex: number = state.currentPlayerIndex
): GameState {
  // バリデーション
  if (col < 0 || col >= 5 || row < 0 || row >= 4) return state
  if (state.villageMap.grid[row][col] !== null) return state
  if (col === state.villageMap.faithPosition.col && row === state.villageMap.faithPosition.row) return state

  // 配置制限チェック：このラウンドで既に配置済みならエラー
  if (state.placedThisRound[playerIndex]) return state

  // グリッドを更新
  const newGrid = state.villageMap.grid.map((r) => [...r])
  if (card.type === 'terrain') {
    newGrid[row][col] = { type: 'terrain', card, disabled: false, connectedToEntrance: false }
  } else if (card.type === 'facility') {
    newGrid[row][col] = { type: 'facility', card, disabled: false, connectedToEntrance: false }
  }

  // デッキから消費
  let newTerrainDeck = state.terrainDeck
  let newFacilityDeck = state.facilityDeck

  if (card.type === 'terrain') {
    const idx = newTerrainDeck.findIndex((c) => c.id === card.id)
    if (idx >= 0) {
      newTerrainDeck = newTerrainDeck.filter((_, i) => i !== idx)
    }
  } else if (card.type === 'facility') {
    const idx = newFacilityDeck.findIndex((c) => c.id === card.id)
    if (idx >= 0) {
      newFacilityDeck = newFacilityDeck.filter((_, i) => i !== idx)
    }
  }

  // 配置フラグを更新
  const newPlacedThisRound = [...state.placedThisRound]
  newPlacedThisRound[playerIndex] = true

  const intermediateState = {
    ...state,
    villageMap: { ...state.villageMap, grid: newGrid },
    terrainDeck: newTerrainDeck,
    facilityDeck: newFacilityDeck,
    placedThisRound: newPlacedThisRound,
  }

  // 接続判定を更新
  return updateConnectivity(intermediateState)
}

export function getCardById(cardId: string): TerrainCard | FacilityCard | EventCard | null {
  // 地形カード
  const terrain = TERRAIN_CARDS.find((c) => c.id === cardId)
  if (terrain) return terrain

  // 施設カード
  const facility = FACILITY_CARDS.find((c) => c.id === cardId)
  if (facility) return facility

  // イベントカード
  const event = EVENT_CARDS.find((c) => c.id === cardId)
  if (event) return event

  return null
}

export function playCard(
  state: GameState,
  playerIndex: number,
  cardIndex: number,
  col?: number,
  row?: number,
  targetCardId?: string
): GameState {
  if (playerIndex < 0 || playerIndex >= state.players.length) return state
  const player = state.players[playerIndex]
  if (cardIndex < 0 || cardIndex >= player.hand.length) return state

  const cardId = player.hand[cardIndex]
  const card = getCardById(cardId)
  if (!card) return state

  // 地形カード
  if (card.type === 'terrain') {
    if (col === undefined || row === undefined) return state
    const newState = placeCard(state, col, row, card)
    if (newState === state) return state

    // 手札から削除
    const newPlayers = state.players.map((p, i) => {
      if (i === playerIndex) {
        return { ...p, hand: p.hand.filter((_, j) => j !== cardIndex) }
      }
      return p
    })

    return { ...newState, players: newPlayers }
  }

  // 施設カード
  if (card.type === 'facility') {
    if (col === undefined || row === undefined) return state
    const newState = placeCard(state, col, row, card)
    if (newState === state) return state

    // 手札から削除
    const newPlayers = state.players.map((p, i) => {
      if (i === playerIndex) {
        return { ...p, hand: p.hand.filter((_, j) => j !== cardIndex) }
      }
      return p
    })

    return { ...newState, players: newPlayers }
  }

  // イベントカード
  if (card.type === 'event') {
    if (!targetCardId) return state

    // グリッド上のカードを探す
    const newGrid = state.villageMap.grid.map((row) => [...row])
    let found = false

    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 5; c++) {
        const cell = newGrid[r][c]
        if (cell && cell.type !== 'faith' && cell.card.id === targetCardId) {
          (cell as any).overlayEvent = card
          found = true
          break
        }
      }
      if (found) break
    }

    if (!found) return state

    // 手札から削除
    const newPlayers = state.players.map((p, i) => {
      if (i === playerIndex) {
        return { ...p, hand: p.hand.filter((_, j) => j !== cardIndex) }
      }
      return p
    })

    return {
      ...state,
      players: newPlayers,
      villageMap: { ...state.villageMap, grid: newGrid },
    }
  }

  return state
}

export function startPlayerTurn(state: GameState): GameState {
  return {
    ...state,
    phase: 'playerTurn' as const,
  }
}

export function endPlayerTurn(state: GameState): GameState {
  const nextPlayerIndex = state.currentPlayerIndex + 1

  // 全員のターンが終わったか
  if (nextPlayerIndex >= state.players.length) {
    return {
      ...state,
      phase: 'roundEnd' as const,
    }
  }

  // 次のプレイヤーへ
  return {
    ...state,
    currentPlayerIndex: nextPlayerIndex,
    phase: 'playerTurn' as const,
  }
}

export function startNextRound(state: GameState): GameState {
  const nextRound = state.round + 1

  // ラウンド7が終わったらゲーム終了
  if (nextRound > 7) {
    return {
      ...state,
      phase: 'gameEnd' as const,
    }
  }

  // 次のラウンド開始
  return {
    ...state,
    round: nextRound,
    currentPlayerIndex: 0,
    phase: 'roundStart' as const,
    settledRound: 0,
    visitorAppeared: 0,
    sacrificeEventTriggered: 0,
    placedThisRound: state.players.map(() => false),
  }
}

export function getVisitorCapacity(openness: number): number {
  if (openness >= 6) return 4
  if (openness >= 3) return 2
  return 0
}

export function getVisitorCountToAppear(openness: number): number {
  if (openness >= 6) return 2
  if (openness >= 3) return 1
  return 0
}

export function appearVisitors(state: GameState): GameState {
  // 既に登場処理済みならスキップ
  if (state.visitorAppeared === state.round) {
    return state
  }

  const countToAppear = getVisitorCountToAppear(state.openness)
  const capacity = getVisitorCapacity(state.openness)
  const currentCount = state.visitorRow.length

  // 登場させられる上限を計算
  const canAppear = Math.min(countToAppear, capacity - currentCount)

  if (canAppear <= 0) {
    return {
      ...state,
      visitorAppeared: state.round,
    }
  }

  // 訪問者デッキからランダムに選択
  const shuffledVisitors = shuffle(state.visitorDeck)
  const newVisitors = shuffledVisitors.slice(0, canAppear)

  // 残りの訪問者デッキから登場した分を除外
  const remainingVisitors = state.visitorDeck.filter(
    (v) => !newVisitors.some((nv) => nv.id === v.id)
  )

  return {
    ...state,
    visitorRow: [...state.visitorRow, ...newVisitors],
    visitorDeck: remainingVisitors,
    visitorAppeared: state.round,
  }
}

export function calculateRoundOutput(state: GameState): { inshu: number; openness: number; curse: number } {
  let totalInshu = 0
  let totalOpenness = 0
  let totalCurse = 0

  // グリッド上のカードから出力を集計
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 5; col++) {
      const cell = state.villageMap.grid[row][col]
      if (!cell) continue

      if (cell.type === 'terrain' && !(cell as any).disabled) {
        // 地形カード：disabled でなければ対象
        totalInshu += cell.card.inshuOutput
        totalOpenness += cell.card.opennessOutput
        totalCurse += cell.card.curseOutput
      } else if (cell.type === 'facility' && cell.connectedToEntrance) {
        // 施設カード：connectedToEntrance: true のみ対象
        totalInshu += cell.card.inshuOutput
        totalOpenness += cell.card.opennessOutput
        totalCurse += cell.card.curseOutput
      }
    }
  }

  // 訪問者による開放度増加
  const nonSacrificeVisitorCount = state.visitorRow.filter((v) => !(v as any).isSacrifice).length
  totalOpenness += nonSacrificeVisitorCount

  // 訪問者の生贄状態による補正
  const sacrificeCount = state.visitorRow.filter((v) => (v as any).isSacrifice).length
  if (sacrificeCount > 0) {
    totalOpenness -= 1
  }

  return {
    inshu: totalInshu,
    openness: totalOpenness,
    curse: totalCurse,
  }
}

export function executeSettlement(state: GameState): GameState {
  // 二重精算チェック
  if (state.settledRound === state.round) {
    return state
  }

  const output = calculateRoundOutput(state)

  let newState = {
    ...state,
    tradition: state.tradition + output.inshu,
    openness: state.openness + output.openness,
    curse: state.curse + output.curse,
    settledRound: state.round,
    logs: [...state.logs, { message: `基本出力：因習度${output.inshu > 0 ? '+' : ''}${output.inshu}, 開放度${output.openness > 0 ? '+' : ''}${output.openness}, 祟り${output.curse > 0 ? '+' : ''}${output.curse}` }],
  }

  // キャラクター能力（ラウンド終了時）
  for (const player of newState.players) {
    const char = player.character
    if (char.id === 'char_village_chief') {
      newState = {
        ...newState,
        tradition: newState.tradition + 1,
        logs: [...newState.logs, { message: `${char.name}の能力：因習度+1` }],
      }
    } else if (char.id === 'char_doctor') {
      newState = {
        ...newState,
        curse: Math.max(0, newState.curse + 1),
        openness: newState.openness + 1,
        logs: [...newState.logs, { message: `${char.name}の能力：祟り+1, 開放度+1` }],
      }
    } else if (char.id === 'char_tourism_officer') {
      newState = {
        ...newState,
        openness: newState.openness + 1,
        logs: [...newState.logs, { message: `${char.name}の能力：開放度+1` }],
      }
    }
  }

  return newState
}

export function getSettlementDetails(state: GameState): {
  terrainCards: Array<{ card: TerrainCard; inshuOutput: number; opennessOutput: number; curseOutput: number }>
  facilityCards: Array<{ card: FacilityCard; connectedToEntrance: boolean; inshuOutput: number; opennessOutput: number; curseOutput: number }>
} {
  const terrainCards: Array<{ card: TerrainCard; inshuOutput: number; opennessOutput: number; curseOutput: number }> = []
  const facilityCards: Array<{ card: FacilityCard; connectedToEntrance: boolean; inshuOutput: number; opennessOutput: number; curseOutput: number }> = []

  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 5; col++) {
      const cell = state.villageMap.grid[row][col]
      if (!cell) continue

      if (cell.type === 'terrain' && !(cell as any).disabled) {
        terrainCards.push({
          card: cell.card,
          inshuOutput: cell.card.inshuOutput,
          opennessOutput: cell.card.opennessOutput,
          curseOutput: cell.card.curseOutput,
        })
      } else if (cell.type === 'facility') {
        facilityCards.push({
          card: cell.card,
          connectedToEntrance: cell.connectedToEntrance,
          inshuOutput: cell.connectedToEntrance ? cell.card.inshuOutput : 0,
          opennessOutput: cell.connectedToEntrance ? cell.card.opennessOutput : 0,
          curseOutput: cell.connectedToEntrance ? cell.card.curseOutput : 0,
        })
      }
    }
  }

  return { terrainCards, facilityCards }
}

export function shouldTriggerSacrificeEvent(state: GameState): boolean {
  return state.curse >= 6 && state.sacrificeEventTriggered !== state.round
}

export function triggerSacrificeEvent(state: GameState): GameState {
  // 既に発火済みならスキップ
  if (state.sacrificeEventTriggered === state.round) {
    return state
  }

  // 祟りが6未満ならスキップ
  if (state.curse < 6) {
    return state
  }

  // 生贄対象がない場合は失敗ログのみ
  if (state.visitorRow.length === 0) {
    return {
      ...state,
      sacrificeEventTriggered: state.round,
    }
  }

  // 生贄イベント発火：祜り-1
  return {
    ...state,
    curse: state.curse - 1,
    sacrificeEventTriggered: state.round,
  }
}

export function sacrificeVisitor(
  state: GameState,
  visitorIndex: number
): GameState {
  if (visitorIndex < 0 || visitorIndex >= state.visitorRow.length) {
    return state
  }

  const visitorToSacrifice = state.visitorRow[visitorIndex]
  const sacrificeCard = EVENT_CARDS.find((c) => c.id === 'evt_sacrifice_ritual')

  if (!sacrificeCard) {
    return state
  }

  // 訪問者を生贄状態に
  let newVisitorRow = state.visitorRow.map((v, idx) => {
    if (idx === visitorIndex) {
      return {
        ...v,
        isSacrifice: true,
        stackedEventCardId: sacrificeCard.id,
      }
    }
    return v
  })

  // 即時効果を適用
  let newState = {
    ...state,
    visitorRow: newVisitorRow,
    tradition: state.tradition + 3,
    openness: Math.max(0, state.openness - 2),
    curse: Math.max(0, state.curse - 2),
    logs: [...state.logs, { message: '生贄イベント成立：因習度+3, 開放度-2, 祟り-2' }],
  }

  // 神主の能力をチェック
  for (const player of newState.players) {
    if (player.character.id === 'char_shinto_priest') {
      newState = {
        ...newState,
        curse: Math.max(0, newState.curse - 1),
        logs: [...newState.logs, { message: `${player.character.name}の能力：祟り-1` }],
      }
      break
    }
  }

  return newState
}

export function addLog(state: GameState, message: string): GameState {
  return {
    ...state,
    logs: [...state.logs, { message }],
  }
}

export function drawCard(state: GameState, playerIndex: number): GameState {
  if (playerIndex < 0 || playerIndex >= state.players.length) {
    return state
  }

  const player = state.players[playerIndex]

  // 手札が7枚以상이면 드로우하지 않음
  if (player.hand.length >= 7) {
    return state
  }

  // 드로우할 카드를 결정
  let drawDeck = state.eventDeck
  let newEventDeck = drawDeck

  if (drawDeck.length === 0) {
    // 산재된 카드를 섞어서 산재 덱으로 복구
    if (state.discardedCards.length === 0) {
      return state // 드로우할 수 없음
    }
    // discardedCards는 카드 ID 배열이므로, 실제 카드 객체를 찾아야 함
    // 이 단계에서는 단순히 카드 ID만 이동
    drawDeck = []
    newEventDeck = []
  }

  // 드로우 실행
  let newDiscardedCards = state.discardedCards
  let newEventDeck2 = newEventDeck
  let drawnCardId: string | null = null

  if (newEventDeck2.length > 0) {
    const drawn = newEventDeck2.pop()!
    drawnCardId = drawn.id
    newEventDeck2 = newEventDeck2.slice(0, -1)
  } else if (newDiscardedCards.length > 0) {
    // 산재 덱에서 가져오기
    const shuffledDiscarded = shuffle(newDiscardedCards)
    drawnCardId = shuffledDiscarded[0]
    newDiscardedCards = shuffledDiscarded.slice(1)
  }

  if (!drawnCardId) {
    return state
  }

  // 손패에 카드 추가
  const newPlayers = state.players.map((p, i) => {
    if (i === playerIndex) {
      return { ...p, hand: [...p.hand, drawnCardId] }
    }
    return p
  })

  return {
    ...state,
    players: newPlayers,
    eventDeck: newEventDeck2,
    discardedCards: newDiscardedCards,
  }
}

export function discardCard(state: GameState, playerIndex: number, cardIndex: number): GameState {
  if (playerIndex < 0 || playerIndex >= state.players.length) {
    return state
  }

  const player = state.players[playerIndex]
  if (cardIndex < 0 || cardIndex >= player.hand.length) {
    return state
  }

  const cardIdToDiscard = player.hand[cardIndex]

  const newPlayers = state.players.map((p, i) => {
    if (i === playerIndex) {
      return { ...p, hand: p.hand.filter((_, j) => j !== cardIndex) }
    }
    return p
  })

  return {
    ...state,
    players: newPlayers,
    discardedCards: [...state.discardedCards, cardIdToDiscard],
  }
}

export function checkVictory(state: GameState): { winners: number[]; allDefeated: boolean } {
  const winners: number[] = []

  for (let i = 0; i < state.players.length; i++) {
    const player = state.players[i]
    const objective = player.objective

    let victorious = false

    switch (objective.victoryConditionType) {
      case 'tradition':
        victorious = state.tradition >= (objective.victoryCondition.traditionMin || 0)
        break
      case 'openness':
        victorious = state.openness >= (objective.victoryCondition.openessMax || 0)
        break
      case 'curseMin':
        victorious = state.curse <= (objective.victoryCondition.curseMax || 999)
        break
      case 'curseMax':
        victorious = state.curse >= (objective.victoryCondition.curseMin || 0)
        break
      case 'closedVillage':
        victorious =
          state.tradition >= (objective.victoryCondition.traditionMin || 0) &&
          state.openness <= (objective.victoryCondition.openessMax || 999)
        break
      case 'balance':
        victorious =
          state.tradition >= (objective.victoryCondition.traditionMin || 0) &&
          state.curse >= (objective.victoryCondition.curseMin || 0) &&
          state.curse <= (objective.victoryCondition.curseMax || 999)
        break
    }

    if (victorious) {
      winners.push(i)
    }
  }

  return {
    winners,
    allDefeated: winners.length === 0,
  }
}
