import type { GameState, Player, ActionCard, EventCard, SacrificeVoteCandidate, CurseCard } from '@/types/game'
import {
  FAITH_TARGETS,
  CHARACTER_CARDS,
  OBJECTIVE_CARDS,
  ACTION_CARDS,
  EVENT_CARDS,
  VISITOR_CARDS,
  CURSE_CARDS,
} from '@/data/cards'

// ─── ユーティリティ ───────────────────────────────────────────

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function clampState(state: GameState): GameState {
  return {
    ...state,
    tradition: clamp(state.tradition, 0, 20),
    openness: clamp(state.openness, 0, 10),
    curse: clamp(state.curse, 0, 10),
  }
}

function addLog(state: GameState, message: string): GameState {
  return { ...state, log: [...state.log, message] }
}

// ─── ゲーム初期化 ─────────────────────────────────────────────

export function createInitialState(): GameState {
  return {
    phase: 'setup',
    round: 1,
    currentPlayerIndex: 0,
    tradition: 0,
    openness: 0,
    curse: 0,
    faithTarget: null,
    players: [],
    actionDeck: [],
    actionDiscard: [],
    eventDeck: [],
    currentEvent: null,
    visitorDeck: [],
    visitorDiscard: [],
    visitorRow: [],
    curseDeck: [],
    curseDiscard: [],
    activeCurseCard: null,
    activeCurseCardSacrifice: false,
    skipActionsThisRound: false,
    skipActionsNextRound: false,
    log: [],
    winnerPlayerIds: [],
    endingName: null,
    sacrificeNeeded: false,
    sacrificeReturnPhase: null,
    actedPlayerIds: [],
    viewingObjectivePlayerId: null,
    curseSacrificeTriggeredThisRound: false,
    traditionCardPlayedThisRound: false,
    sacrificeVoteCandidates: [],
    sacrificeVotes: [],
    sacrificeVoteRemainingIds: [],
    sacrificeTiebreakerPlayerId: null,
    sacrificeTiedCandidateIds: [],
    sacrificeOriginPlayerIndex: 0,
    eventTraditionBonus: 0,
    eventOpennessBonus: 0,
    eventCurseBonus: 0,
    endOfRoundSacrificeRequired: false,
    endOfRoundSacrificeIfCurse: false,
    traditionCardEffectReduction: 0,
    sacrificeCount: 0,
    chuzaiNullifyPending: false,
  }
}

export function startGame(
  state: GameState,
  playerNames?: Record<string, string>,
  activeSlots?: string[]
): GameState {
  let s = { ...state }

  const faith = shuffle(FAITH_TARGETS)[0]
  s = addLog(s, 'ゲームを開始しました')
  s = addLog(s, `信仰対象：${faith.name}`)

  const shuffledChars = shuffle(CHARACTER_CARDS)
  const shuffledObjs = shuffle(OBJECTIVE_CARDS)
  const shuffledActions = shuffle(ACTION_CARDS)
  const shuffledEvents = shuffle(EVENT_CARDS)
  const shuffledVisitors = shuffle(VISITOR_CARDS)
  const shuffledCurses = shuffle(CURSE_CARDS)

  const ALL_SLOTS = ['player_1', 'player_2', 'player_3', 'player_4']
  const SLOTS = activeSlots ?? ALL_SLOTS
  const players: Player[] = SLOTS.map((slotId, i) => ({
    id: slotId,
    name: playerNames?.[slotId] ?? `Player ${i + 1}`,
    character: shuffledChars[i],
    objective: shuffledObjs[i],
    hand: shuffledActions.slice(i * 3, i * 3 + 3),
    alive: true,
    immediateWin: false,
  }))

  players.forEach((p) => {
    s = addLog(s, `${p.name} のキャラクター：${p.character?.name}`)
  })

  s = addLog(s, '訪問者カード山札を作成しました')
  s = addLog(s, '来訪者欄を初期化しました')

  s = {
    ...s,
    phase: 'curseProgress',
    round: 1,
    currentPlayerIndex: 0,
    tradition: 0,
    openness: 2,
    curse: 0,
    faithTarget: faith,
    players,
    actionDeck: shuffledActions.slice(SLOTS.length * 3),
    actionDiscard: [],
    eventDeck: shuffledEvents,
    currentEvent: null,
    visitorDeck: shuffledVisitors,
    visitorDiscard: [],
    visitorRow: [],
    curseDeck: shuffledCurses,
    curseDiscard: [],
    activeCurseCard: null,
    activeCurseCardSacrifice: false,
    skipActionsThisRound: false,
    skipActionsNextRound: false,
    winnerPlayerIds: [],
    endingName: null,
    sacrificeNeeded: false,
    sacrificeReturnPhase: null,
    actedPlayerIds: [],
    curseSacrificeTriggeredThisRound: false,
    traditionCardPlayedThisRound: false,
    sacrificeVoteCandidates: [],
    sacrificeVotes: [],
    sacrificeVoteRemainingIds: [],
    sacrificeTiebreakerPlayerId: null,
    sacrificeTiedCandidateIds: [],
    sacrificeOriginPlayerIndex: 0,
    eventTraditionBonus: 0,
    eventOpennessBonus: 0,
    eventCurseBonus: 0,
    endOfRoundSacrificeRequired: false,
    endOfRoundSacrificeIfCurse: false,
    traditionCardEffectReduction: 0,
    sacrificeCount: 0,
    chuzaiNullifyPending: false,
  }

  s = addLog(s, 'ラウンド1が始まります。祟り進行フェイズに入りました')
  return s
}

// ─── 祟り進行フェイズ ─────────────────────────────────────────

export function processCurseProgress(state: GameState): GameState {
  let s = state
  s = addLog(s, '土着信仰の祟りが進行しました。祟り+1')
  s = { ...s, curse: s.curse + 1 }

  // 雷神：ラウンド4以降、毎ラウンド祟り+2
  if (s.faithTarget?.id === 'faith_thunder_god' && s.round > 3) {
    s = addLog(s, `雷神の効果でさらに祟り+2（ラウンド${s.round}）`)
    s = { ...s, curse: s.curse + 2 }
  }

  s = clampState(s)
  return { ...s, phase: 'event' }
}

// ─── イベントフェイズ ─────────────────────────────────────────

export function processEventPhase(state: GameState): GameState {
  if (state.eventDeck.length === 0) {
    let s = addLog(state, 'イベント山札が尽きました')
    return endGame(s, '停滞エンド')
  }

  const [card, ...remainingDeck] = state.eventDeck
  let s: GameState = {
    ...state,
    eventDeck: remainingDeck,
    currentEvent: card,
  }
  s = addLog(s, `イベント発生：${card.name}`)
  s = applyEventEffect(s, card)
  s = clampState(s)

  if (s.skipActionsThisRound) {
    s = addLog(s, '祟りカードの効果により、行動フェイズをスキップします')
    return transitionToCheckEnd({ ...s, actedPlayerIds: [] })
  }
  s = { ...s, phase: 'action', actedPlayerIds: [], currentPlayerIndex: 0 }
  s = advanceToNextAlivePlayer(s)
  return s
}

function applyEventEffect(state: GameState, card: EventCard): GameState {
  let s = state
  switch (card.id) {
    case 'evt_festival_season':
      s = addLog(s, '祭りの季節：このラウンドの全カードに因習度+1補正')
      s = { ...s, eventTraditionBonus: s.eventTraditionBonus + 1 }
      break
    case 'evt_village_revival':
      s = addLog(s, '村おこしの機運：このラウンドの全カードに開放度+1補正')
      s = { ...s, eventOpennessBonus: s.eventOpennessBonus + 1 }
      break
    case 'evt_ominous_rumor':
      s = addLog(s, '不穏な噂：このラウンドの祟りが上昇するカードに祟り+1補正')
      s = { ...s, eventCurseBonus: s.eventCurseBonus + 1 }
      break
    case 'evt_shrine_destroyed': {
      const hasSpecial = s.visitorRow.some(
        (v) => v.id === 'vis_tourist' || v.id === 'vis_streamer'
      )
      if (hasSpecial) {
        s = addLog(s, '祠の破壊：訪問者に観光客か配信者がいるため祟り+3')
        s = { ...s, curse: s.curse + 3 }
      } else {
        s = addLog(s, '祠の破壊：祟り+2')
        s = { ...s, curse: s.curse + 2 }
      }
      break
    }
    case 'evt_police_inquiry': {
      s = addLog(s, '警察の聞き込み：因習度-1、開放度-1')
      s = { ...s, tradition: s.tradition - 1, openness: s.openness - 1 }
      const policeCard = {
        id: 'vis_police',
        name: '警察官',
        effectDescription: '【生贄時】開放度-2',
        description: '村の怪異を調べに来た警察官。生贄にされると村の開放度が下がる。',
      }
      s = { ...s, visitorRow: [...s.visitorRow, policeCard] }
      s = addLog(s, '来訪者欄に警察官が加わりました')
      break
    }
    case 'evt_divine_kidnapping':
      s = addLog(s, '神隠しの夜：このラウンド終了時に生贄投票が発生します')
      s = { ...s, endOfRoundSacrificeRequired: true }
      break
  }
  return s
}

function triggerSacrificeEvent(state: GameState): GameState {
  return { ...state, sacrificeNeeded: true }
}

// ─── ラウンド終了への遷移 ─────────────────────────────────────

function transitionToCheckEnd(state: GameState): GameState {
  let s = state
  // ラウンド終了時の生贄チェック（神隠しの夜 or 贄の選定）
  const sacrificeFromKaminakushi = s.endOfRoundSacrificeRequired
  const sacrificeFromRumor = s.endOfRoundSacrificeIfCurse && s.curse >= 4
  if (sacrificeFromKaminakushi || sacrificeFromRumor) {
    const reason = sacrificeFromKaminakushi ? '神隠しの夜' : '贄の選定（祟り4以上）'
    s = addLog(s, `${reason}の効果でラウンド終了時の生贄投票が発生します`)
    s = { ...s, endOfRoundSacrificeRequired: false, endOfRoundSacrificeIfCurse: false }
    s = triggerSacrificeEvent(s)
    return startSacrificeVote({ ...s, sacrificeReturnPhase: 'checkEnd' })
  }
  s = { ...s, endOfRoundSacrificeIfCurse: false }
  return { ...s, phase: 'checkEnd' }
}

// ─── 行動フェイズ ─────────────────────────────────────────────

function advanceToNextAlivePlayer(state: GameState): GameState {
  const alivePlayers = state.players.filter((p) => p.alive)
  if (alivePlayers.length === 0) return state

  const remaining = alivePlayers.filter(
    (p) => !state.actedPlayerIds.includes(p.id)
  )
  if (remaining.length === 0) return state

  const idx = state.players.findIndex((p) => p.id === remaining[0].id)
  return { ...state, currentPlayerIndex: idx }
}

export function useActionCard(
  state: GameState,
  playerId: string,
  cardInstanceId: string,
  consumeVisitorId?: string
): GameState {
  const playerIdx = state.players.findIndex((p) => p.id === playerId)
  if (playerIdx < 0) return state
  const player = state.players[playerIdx]
  const cardIdx = player.hand.findIndex((c) => c.instanceId === cardInstanceId)
  if (cardIdx < 0) return state

  const card = player.hand[cardIdx]
  let s = state

  const newHand = player.hand.filter((_, i) => i !== cardIdx)
  const updatedPlayer = { ...player, hand: newHand }
  s = {
    ...s,
    players: s.players.map((p, i) => (i === playerIdx ? updatedPlayer : p)),
    actionDiscard: [...s.actionDiscard, card],
  }
  s = addLog(s, `${player.name} が「${card.name}」を使用しました`)

  s = applyActionCardEffect(s, card, playerIdx)
  s = clampState(s)
  s = checkWaterGodEnd(s)
  if (s.phase === 'gameEnd') return s

  // 行動デッキ補充（切れたら捨て札をシャッフルして再利用）
  if (s.actionDeck.length === 0 && s.actionDiscard.length > 0) {
    s = addLog(s, '行動カード山札が空のため、捨て札をシャッフルして補充します')
    s = { ...s, actionDeck: shuffle(s.actionDiscard), actionDiscard: [] }
  }
  if (s.actionDeck.length > 0) {
    const [drawn, ...remainingDeck] = s.actionDeck
    const drawnPlayer = s.players[playerIdx]
    const drawnUpdated = { ...drawnPlayer, hand: [...drawnPlayer.hand, drawn] }
    s = {
      ...s,
      actionDeck: remainingDeck,
      players: s.players.map((p, i) => (i === playerIdx ? drawnUpdated : p)),
    }
  }

  s = { ...s, actedPlayerIds: [...s.actedPlayerIds, playerId] }

  if (s.sacrificeNeeded) {
    return startSacrificeVote(s)
  }

  const alivePlayers = s.players.filter((p) => p.alive)
  const allActed = alivePlayers.every((p) => s.actedPlayerIds.includes(p.id))
  if (allActed) {
    return transitionToCheckEnd(s)
  }
  return advanceToNextAlivePlayer(s)
}

function applyActionCardEffect(
  state: GameState,
  card: ActionCard,
  playerIdx: number
): GameState {
  let s = state
  const player = s.players[playerIdx]

  // ── 基本カード効果 ──
  switch (card.id) {
    case 'act_revive_old_rules': {
      const tGain = Math.max(0, 1 - s.traditionCardEffectReduction)
      s = addLog(s, `因習度+${tGain}、開放度-1`)
      s = { ...s, tradition: s.tradition + tGain, openness: s.openness - 1 }
      break
    }
    case 'act_night_festival': {
      const baseGain = s.visitorRow.length >= 1 ? 2 : 1
      const tGain = Math.max(0, baseGain - s.traditionCardEffectReduction)
      if (s.visitorRow.length >= 1) {
        s = addLog(s, `来訪者がいるため因習度+${tGain}、開放度-1`)
      } else {
        s = addLog(s, `因習度+${tGain}、開放度-1`)
      }
      s = { ...s, tradition: s.tradition + tGain, openness: s.openness - 1 }
      break
    }
    case 'act_tourism_pamphlet':
      s = addLog(s, '開放度+1、因習度-1')
      s = increaseOpenness(s, 1)
      s = { ...s, tradition: s.tradition - 1 }
      s = applyCharacterOpenBonus(s, playerIdx)
      break
    case 'act_ghost_spot':
      s = addLog(s, '開放度+1、祟り+1')
      s = increaseOpenness(s, 1)
      s = { ...s, curse: s.curse + 1 }
      s = applyCharacterOpenBonus(s, playerIdx)
      break
    case 'act_repair_shrine':
      s = addLog(s, '祟り-2、開放度-1')
      s = applyDecreaseCurse(s, 2)
      s = { ...s, openness: s.openness - 1 }
      if (player.character?.id === 'char_shinto_priest') {
        s = addLog(s, `${player.name}（神主）の能力で祟りがさらに-1`)
        s = applyDecreaseCurse(s, 1)
      }
      break
    case 'act_touch_taboo':
      s = addLog(s, '祟り+2、因習度+1、開放度-1')
      s = { ...s, curse: s.curse + 2, tradition: s.tradition + 1, openness: s.openness - 1 }
      if (player.character?.id === 'char_shinto_priest') {
        s = addLog(s, `${player.name}（神主）の能力で祟りがさらに-1`)
        s = { ...s, curse: s.curse - 1 }
      }
      break
    case 'act_sacrifice_selection':
      s = addLog(s, '贄の選定：祟り+1')
      s = { ...s, curse: s.curse + 1 }
      s = addLog(s, 'このラウンド終了時、祟りが4以上なら生贄投票が発生します')
      s = { ...s, endOfRoundSacrificeIfCurse: true }
      break
  }

  // ── 訪問者パッシブ補正 ──
  const hasFolklorist = s.visitorRow.some((v) => v.id === 'vis_folklorist')
  const hasStreamer = s.visitorRow.some((v) => v.id === 'vis_streamer')
  const hasContractor = s.visitorRow.some((v) => v.id === 'vis_contractor')

  if (card.type === 'tradition' && hasFolklorist) {
    s = addLog(s, '【民俗学者】因習カードに因習度+1、祟り+1の補正')
    s = { ...s, tradition: s.tradition + 1, curse: s.curse + 1 }
  }
  if (card.type === 'open' && hasStreamer) {
    s = addLog(s, '【配信者】開放カードに開放度+1、祟り+1の補正')
    s = increaseOpenness(s, 1)
    s = { ...s, curse: s.curse + 1 }
  }
  if (card.type === 'faith' && hasContractor) {
    s = addLog(s, '【土木業者】信仰カードに祟り+2の補正')
    s = { ...s, curse: s.curse + 2 }
  }

  // ── イベント補正 ──
  if (s.eventTraditionBonus > 0) {
    s = addLog(s, `【イベント補正】因習度+${s.eventTraditionBonus}`)
    s = { ...s, tradition: s.tradition + s.eventTraditionBonus }
  }
  if (s.eventOpennessBonus > 0) {
    s = addLog(s, `【イベント補正】開放度+${s.eventOpennessBonus}`)
    s = increaseOpenness(s, s.eventOpennessBonus)
  }
  // 不穏な噂：祟りが上昇するカードのみに適用
  const CURSE_INCREASING_CARD_IDS = ['act_ghost_spot', 'act_touch_taboo', 'act_sacrifice_selection']
  if (s.eventCurseBonus > 0 && CURSE_INCREASING_CARD_IDS.includes(card.id)) {
    s = addLog(s, `【不穏な噂】祟り+${s.eventCurseBonus}の補正`)
    s = { ...s, curse: s.curse + s.eventCurseBonus }
  }

  return s
}

// ─── 祟り減少（水神トリガー付き） ────────────────────────────

function applyDecreaseCurse(state: GameState, amount: number): GameState {
  if (amount <= 0 || state.curse <= 0) return state
  let s = { ...state, curse: state.curse - amount }
  if (s.faithTarget?.id === 'faith_water_god') {
    s = addLog(s, '水神の効果で因習度+1')
    s = { ...s, tradition: s.tradition + 1 }
  }
  return s
}

function checkWaterGodEnd(state: GameState): GameState {
  if (state.faithTarget?.id === 'faith_water_god' && state.curse <= 0) {
    let s = addLog(state, '水神の効果により祟りが0になりました。因習度が消滅します')
    s = { ...s, tradition: 0 }
    return endGame(s, '消滅エンド')
  }
  return state
}

// ─── 開放度上昇（共通） ───────────────────────────────────────

function increaseOpenness(state: GameState, amount: number): GameState {
  const before = state.openness
  const after = Math.min(10, before + amount)
  const actual = after - before

  if (actual === 0) {
    return addLog(state, '開放度はすでに最大です')
  }

  let s: GameState = { ...state, openness: after }
  s = addLog(s, `開放度が${actual}上がりました`)

  // 山神：開放度が上昇するたびに祟り+1
  if (s.faithTarget?.id === 'faith_mountain_god') {
    s = addLog(s, '山神の効果で祟り+1')
    s = { ...s, curse: s.curse + 1 }
  }

  // 訪問者カードを開放度4・6・8の通過タイミングで1枚ずつ公開
  const VISITOR_THRESHOLDS = [4, 6, 8]
  const visitorsToReveal = VISITOR_THRESHOLDS.filter((t) => before < t && after >= t).length
  for (let i = 0; i < visitorsToReveal; i++) {
    if (s.visitorDeck.length === 0) {
      if (s.visitorDiscard.length === 0) {
        s = addLog(s, '訪問者カードが残っていないため、来訪者は増えませんでした')
        break
      }
      s = addLog(s, '訪問者カード山札が空のため、捨て札をシャッフルしました')
      s = { ...s, visitorDeck: shuffle(s.visitorDiscard), visitorDiscard: [] }
    }
    const [card, ...rest] = s.visitorDeck
    s = { ...s, visitorDeck: rest, visitorRow: [...s.visitorRow, card] }
    s = addLog(s, `訪問者：${card.name} が来訪者欄に公開されました`)
  }

  return s
}

function applyCharacterOpenBonus(state: GameState, playerIdx: number): GameState {
  let s = state
  const player = s.players[playerIdx]
  if (player.character?.id === 'char_village_officer') {
    s = addLog(s, `${player.name}（村役場職員）の能力で開放度がさらに+1`)
    s = increaseOpenness(s, 1)
  }
  return s
}

// ─── 生贄投票フェイズ ─────────────────────────────────────────

function startSacrificeVote(state: GameState): GameState {
  const alivePlayers = state.players.filter((p) => p.alive)
  const candidates: SacrificeVoteCandidate[] = [
    ...state.visitorRow.map((v) => ({ type: 'visitor' as const, id: v.id, name: v.name })),
    ...alivePlayers.map((p) => ({ type: 'player' as const, id: p.id, name: p.name })),
  ]
  const remainingIds = alivePlayers.map((p) => p.id)
  const firstVoterIdx = state.players.findIndex((p) => p.id === remainingIds[0])

  let s = addLog(state, '生贄投票を開始します。全員で生贄を決定してください')
  s = addLog(s, `候補：${candidates.map((c) => c.name).join('、')}`)
  const chiefPlayer = state.players.find((p) => p.alive && p.character?.id === 'char_village_chief')
  if (chiefPlayer) {
    s = addLog(s, `${chiefPlayer.name}（村長）の票は2票として数えます`)
  }

  return {
    ...s,
    phase: 'sacrificeVote',
    sacrificeNeeded: false,
    sacrificeVoteCandidates: candidates,
    sacrificeVotes: [],
    sacrificeVoteRemainingIds: remainingIds,
    sacrificeTiebreakerPlayerId: null,
    sacrificeTiedCandidateIds: [],
    sacrificeOriginPlayerIndex: state.currentPlayerIndex,
    currentPlayerIndex: firstVoterIdx >= 0 ? firstVoterIdx : 0,
  }
}

export function castVote(state: GameState, voterId: string, candidateId: string): GameState {
  if (!state.sacrificeVoteRemainingIds.includes(voterId)) return state
  const voter = state.players.find((p) => p.id === voterId)
  if (!voter) return state

  const candidate = state.sacrificeVoteCandidates.find((c) => c.id === candidateId)
  if (!candidate) return state

  // 自分自身への投票は不可
  if (candidate.type === 'player' && candidateId === voterId) return state

  const isChief = voter.character?.id === 'char_village_chief'
  let s: GameState = {
    ...state,
    sacrificeVotes: [...state.sacrificeVotes, { voterId, candidateId }],
    sacrificeVoteRemainingIds: state.sacrificeVoteRemainingIds.filter((id) => id !== voterId),
  }
  s = addLog(s, `${voter.name}${isChief ? '（村長・2票）' : ''} が「${candidate.name}」に投票しました`)

  if (s.sacrificeVoteRemainingIds.length > 0) {
    const nextId = s.sacrificeVoteRemainingIds[0]
    const nextIdx = s.players.findIndex((p) => p.id === nextId)
    return { ...s, currentPlayerIndex: nextIdx }
  }

  // 駐在チェック：他プレイヤーの票が1票以上あれば無効化を問う
  const chuzai = s.players.find((p) => p.alive && p.character?.id === 'char_chuzai')
  if (chuzai) {
    const nullifiable = s.sacrificeVotes.filter((v) => v.voterId !== chuzai.id)
    if (nullifiable.length > 0) {
      s = addLog(s, `${chuzai.name}（駐在）は1票を無効にする権利があります`)
      return {
        ...s,
        chuzaiNullifyPending: true,
        currentPlayerIndex: s.players.findIndex((p) => p.id === chuzai.id),
      }
    }
  }

  return tallyVotes(s)
}

export function resolveChuzaiNullify(
  state: GameState,
  nullifyVoterId: string | null,
  nullifyCandidateId: string | null,
): GameState {
  let s = { ...state, chuzaiNullifyPending: false }
  if (nullifyVoterId !== null && nullifyCandidateId !== null) {
    const voter = s.players.find((p) => p.id === nullifyVoterId)
    const candidate = s.sacrificeVoteCandidates.find((c) => c.id === nullifyCandidateId)
    s = addLog(s, `駐在の能力：${voter?.name ?? nullifyVoterId} の「${candidate?.name ?? nullifyCandidateId}」への票を無効にしました`)
    s = {
      ...s,
      sacrificeVotes: s.sacrificeVotes.filter(
        (v) => !(v.voterId === nullifyVoterId && v.candidateId === nullifyCandidateId)
      ),
    }
  } else {
    s = addLog(s, '駐在は票の無効化を見送りました')
  }
  return tallyVotes(s)
}

function tallyVotes(state: GameState): GameState {
  let s = state
  const voteCounts: Record<string, number> = {}
  s.sacrificeVotes.forEach(({ voterId, candidateId }) => {
    const voter = s.players.find((p) => p.id === voterId)
    const weight = voter?.character?.id === 'char_village_chief' ? 2 : 1
    voteCounts[candidateId] = (voteCounts[candidateId] ?? 0) + weight
  })

  const tally = Object.entries(voteCounts)
    .map(([id, count]) => {
      const c = s.sacrificeVoteCandidates.find((c) => c.id === id)
      return `${c?.name ?? id}：${count}票`
    })
    .join('、')
  s = addLog(s, `投票結果 → ${tally}`)

  const maxVotes = Math.max(...Object.values(voteCounts))
  const topCandidates = Object.entries(voteCounts)
    .filter(([, count]) => count === maxVotes)
    .map(([id]) => id)

  if (topCandidates.length === 1) {
    return executeSacrificeById(s, topCandidates[0])
  }

  const tiebreakerId = findTiebreaker(s)
  const tbPlayer = s.players.find((p) => p.id === tiebreakerId)
  const isChief = tbPlayer?.character?.id === 'char_village_chief'
  s = addLog(s, `同票のため、${tbPlayer?.name ?? '???'}${isChief ? '（村長）' : ''} が最終決定します`)

  return {
    ...s,
    phase: 'sacrificeTiebreak',
    sacrificeTiebreakerPlayerId: tiebreakerId,
    sacrificeTiedCandidateIds: topCandidates,
    currentPlayerIndex: s.players.findIndex((p) => p.id === tiebreakerId),
  }
}

function findTiebreaker(state: GameState): string {
  // 村長が生存していれば村長が最終決定
  const chief = state.players.find((p) => p.alive && p.character?.id === 'char_village_chief')
  if (chief) return chief.id

  // 手番プレイヤーから時計回りに最も近い生存プレイヤー
  const total = state.players.length
  const origin = state.sacrificeOriginPlayerIndex
  for (let i = 1; i <= total; i++) {
    const idx = (origin + i) % total
    if (state.players[idx].alive) return state.players[idx].id
  }
  return state.players.find((p) => p.alive)!.id
}

export function resolveTiebreak(state: GameState, candidateId: string): GameState {
  if (!state.sacrificeTiedCandidateIds.includes(candidateId)) return state
  const tbPlayer = state.players.find((p) => p.id === state.sacrificeTiebreakerPlayerId)
  const candidate = state.sacrificeVoteCandidates.find((c) => c.id === candidateId)
  let s = addLog(state, `${tbPlayer?.name ?? '???'} が「${candidate?.name ?? candidateId}」を最終決定しました`)
  return executeSacrificeById(s, candidateId)
}

function executeSacrificeById(state: GameState, candidateId: string): GameState {
  const candidate = state.sacrificeVoteCandidates.find((c) => c.id === candidateId)
  if (!candidate) return state
  if (candidate.type === 'visitor') return executeVisitorSacrifice(state, candidateId)
  return executePlayerSacrifice(state, candidateId)
}

function executeVisitorSacrifice(state: GameState, visitorId: string): GameState {
  let s = state
  const consumed = s.visitorRow.find((v) => v.id === visitorId) ?? s.visitorRow[0]
  if (!consumed) return resumeAfterSacrifice(s)

  s = addLog(s, `訪問者：${consumed.name} を生贄にしました`)
  s = {
    ...s,
    visitorRow: s.visitorRow.filter((v) => v !== consumed),
    visitorDiscard: [...s.visitorDiscard, consumed],
    sacrificeCount: s.sacrificeCount + 1,
  }

  if (s.activeCurseCardSacrifice) {
    s = addLog(s, '祟りカードによる生贄のため、祟り-1のみ')
    s = applyDecreaseCurse(s, 1)
  } else {
    const doctorAlive = s.players.some((p) => p.alive && p.character?.id === 'char_doctor')
    const opennessChange = doctorAlive ? -1 : -3
    s = addLog(s, `訪問者生贄により、因習度+3、開放度${opennessChange}、祟り-2`)
    s = { ...s, tradition: s.tradition + 3, openness: s.openness + opennessChange }
    s = applyDecreaseCurse(s, 2)
    if (doctorAlive) {
      s = addLog(s, '医者が生存しているため、開放度の減少が-1に軽減されました')
    }

    // 訪問者固有の生贄効果
    if (consumed.id === 'vis_tourist') {
      s = addLog(s, '【観光客】生贄により因習度+1')
      s = { ...s, tradition: s.tradition + 1 }
    }
    if (consumed.id === 'vis_police') {
      s = addLog(s, '【警察官】生贄により開放度-2')
      s = { ...s, openness: s.openness - 2 }
    }
  }

  // 山神：訪問者生贄で因習度+1（祟りカード生贄でも適用）
  if (s.faithTarget?.id === 'faith_mountain_god') {
    s = addLog(s, '山神の効果で因習度+1')
    s = { ...s, tradition: s.tradition + 1 }
  }
  s = { ...s, sacrificeNeeded: false }
  s = clampState(s)
  s = checkWaterGodEnd(s)
  if (s.phase === 'gameEnd') return s
  s = addLog(s, `生贄後の祟り：${s.curse}`)
  return resumeAfterSacrifice(s)
}

function executePlayerSacrifice(state: GameState, targetPlayerId: string): GameState {
  const targetIdx = state.players.findIndex((p) => p.id === targetPlayerId)
  if (targetIdx < 0) return resumeAfterSacrifice(state)

  const target = state.players[targetIdx]
  let s = state

  s = addLog(s, `${target.name} を生贄にしました`)
  s = { ...s, sacrificeCount: s.sacrificeCount + 1 }
  if (s.activeCurseCardSacrifice) {
    s = addLog(s, '祟りカードによる生贄のため、祟り-1のみ')
    s = applyDecreaseCurse(s, 1)
  } else {
    s = addLog(s, 'プレイヤー生贄により、因習度+4、祟り-3')
    s = { ...s, tradition: s.tradition + 4 }
    s = applyDecreaseCurse(s, 3)
  }

  if (target.objective?.id === 'obj_willing_sacrifice') {
    const updated = { ...target, alive: false, immediateWin: true }
    s = { ...s, players: s.players.map((p, i) => (i === targetIdx ? updated : p)) }
    s = addLog(s, `${target.name} は生贄志願を達成しました`)
  } else {
    const updated = { ...target, alive: false }
    s = { ...s, players: s.players.map((p, i) => (i === targetIdx ? updated : p)) }
  }
  s = addLog(s, `${target.name} は死亡しました`)

  s = { ...s, sacrificeNeeded: false }
  s = clampState(s)
  s = checkWaterGodEnd(s)
  if (s.phase === 'gameEnd') return s
  s = addLog(s, `生贄後の祟り：${s.curse}`)
  return resumeAfterSacrifice(s)
}

function resumeAfterSacrifice(state: GameState): GameState {
  const s0 = { ...state, activeCurseCardSacrifice: false }
  if (s0.sacrificeReturnPhase) {
    const returnPhase = s0.sacrificeReturnPhase
    let s = s0
    if (returnPhase === 'checkEnd') {
      s = addLog(s, '生贄処理後、ラウンド終了判定へ進みます')
    }
    return { ...s, phase: returnPhase, sacrificeReturnPhase: null }
  }
  const alivePlayers = s0.players.filter((p) => p.alive)
  const allActed = alivePlayers.every((p) => s0.actedPlayerIds.includes(p.id))
  if (allActed) {
    return transitionToCheckEnd(s0)
  }
  const next = advanceToNextAlivePlayer(s0)
  return { ...next, phase: 'action' }
}

// ─── ラウンド終了処理 ─────────────────────────────────────────

export function processCheckEnd(state: GameState): GameState {
  let s = state

  // ラウンド終了時の祟りカード発動（祟り6以上、1ラウンド1回）
  if (s.curse >= 6 && !s.curseSacrificeTriggeredThisRound) {
    s = { ...s, curseSacrificeTriggeredThisRound: true }

    // 祟りカードを山札から引く
    let deck = s.curseDeck
    let discard = s.curseDiscard
    if (deck.length === 0 && discard.length > 0) {
      deck = shuffle(discard)
      discard = []
      s = addLog(s, '祟りカード山札が空のため、捨て札をシャッフルして補充しました')
    }

    if (deck.length > 0) {
      const [curseCard, ...remainingDeck] = deck
      s = { ...s, curseDeck: remainingDeck, curseDiscard: [...discard, curseCard], activeCurseCard: curseCard }
      s = addLog(s, `━━━ 祟りカード発動：「${curseCard.name}」 ━━━`)
      s = addLog(s, curseCard.description)
      s = addLog(s, `因習度+${curseCard.inshuPointGain}`)
      s = { ...s, tradition: s.tradition + curseCard.inshuPointGain }
      // 雷神：祟りカード発動時に因習度+1
      if (s.faithTarget?.id === 'faith_thunder_god') {
        s = addLog(s, '雷神の効果で因習度+1')
        s = { ...s, tradition: s.tradition + 1 }
      }
      s = applyCurseCardDebuff(s, curseCard)
      s = clampState(s)
      s = addLog(s, '生贄投票が発生します（生贄の祟り変化は-1）')
      s = { ...s, activeCurseCardSacrifice: true }
      s = triggerSacrificeEvent(s)
      return startSacrificeVote({ ...s, sacrificeReturnPhase: 'checkEnd' })
    } else {
      // 祟りカードが完全に尽きた場合は通常の生贄投票
      s = addLog(s, `祟りが${s.curse}に達しました。祟りカードがないため通常の生贄投票が発生します`)
      return startSacrificeVote({ ...s, sacrificeReturnPhase: 'checkEnd' })
    }
  }

  s = checkEndCondition(s)
  if (s.phase === 'gameEnd') return s

  if (s.curse >= 10) {
    s = addLog(s, '祟りが10に達しました')
    return endGame(s, '祟りエンド')
  }

  if (s.openness >= 10) {
    s = addLog(s, '開放度が10に達しました')
    return endGame(s, '観光地化エンド')
  }

  if (s.openness <= 0) {
    s = addLog(s, '開放度が0になりました。村が孤立しました')
    return endGame(s, '過疎村エンド')
  }

  s = {
    ...s,
    phase: 'curseProgress',
    round: s.round + 1,
    currentEvent: null,
    currentPlayerIndex: 0,
    actedPlayerIds: [],
    sacrificeNeeded: false,
    sacrificeReturnPhase: null,
    curseSacrificeTriggeredThisRound: false,
    traditionCardPlayedThisRound: false,
    skipActionsThisRound: s.skipActionsNextRound,
    skipActionsNextRound: false,
    activeCurseCard: null,
    eventTraditionBonus: 0,
    eventOpennessBonus: 0,
    eventCurseBonus: 0,
    endOfRoundSacrificeRequired: false,
    endOfRoundSacrificeIfCurse: false,
  }
  s = addLog(s, `ラウンド${s.round}が始まります。祟り進行フェイズに入りました`)
  if (s.skipActionsThisRound) {
    s = addLog(s, '（前ラウンドの祟りカード効果：このラウンドは行動フェイズがありません）')
  }
  return s
}

// ─── 終了判定 ─────────────────────────────────────────────────

function checkEndCondition(state: GameState): GameState {
  if (state.tradition >= 20) {
    let s = addLog(state, '因習度が20に到達しました')
    return endGame(s, '因習村完成エンド')
  }
  return state
}

function checkObjectiveWin(
  player: Player,
  endingName: string,
  openness: number,
  curse: number,
  sacrificeCount: number,
): boolean {
  switch (player.objective?.id) {
    case 'obj_complete_tradition':
      return endingName === '因習村完成エンド' && curse <= 5
    case 'obj_curse_manifestation':
      return endingName === '祟りエンド'
    case 'obj_tourist_village':
      return endingName === '観光地化エンド' || (endingName === '因習村完成エンド' && openness >= 5)
    case 'obj_closed_village':
      return (
        endingName === '過疎村エンド' ||
        endingName === '停滞エンド' ||
        endingName === '因習村完成エンド'
      ) && openness <= 2
    case 'obj_willing_sacrifice':
      return false
    case 'obj_sacrifice_keeper':
      return player.alive && sacrificeCount >= 4
    case 'obj_powerful_survivor':
      return player.alive && curse >= 5
    default:
      return false
  }
}

function endGame(state: GameState, endingName: string): GameState {
  let s = state
  s = addLog(s, `${endingName}でゲームが終了しました`)

  const winners: string[] = []
  s.players.forEach((p) => {
    if (p.immediateWin) {
      winners.push(p.id)
      return
    }
    if (checkObjectiveWin(p, endingName, s.openness, s.curse, s.sacrificeCount)) {
      winners.push(p.id)
    }
  })

  const winnerNames = winners
    .map((id) => s.players.find((p) => p.id === id)?.name ?? id)
    .join(', ')
  s = addLog(s, winners.length > 0 ? `勝利者：${winnerNames}` : '勝利者なし')

  return { ...s, phase: 'gameEnd', endingName, winnerPlayerIds: winners }
}

// ─── 祟りカード・デバフ適用 ───────────────────────────────────

function applyCurseCardDebuff(state: GameState, card: CurseCard): GameState {
  let s = state
  switch (card.debuffType) {
    case 'openness_decrease':
      s = addLog(s, `【デバフ】開放度-${card.debuffAmount}`)
      s = { ...s, openness: s.openness - card.debuffAmount }
      // 水底の呼び声：以降の因習カード因習度上昇に-1ペナルティ
      if (card.id === 'curse_abyss_call') {
        s = addLog(s, '【デバフ】以降、因習カードによる因習度上昇が1減少します')
        s = { ...s, traditionCardEffectReduction: s.traditionCardEffectReduction + 1 }
      }
      break
    case 'discard_all_cards': {
      s = addLog(s, '【デバフ】全プレイヤーの手持ちカードをすべて捨て札にします')
      let allDiscarded: ActionCard[] = []
      const updatedPlayers = s.players.map((p) => {
        allDiscarded = [...allDiscarded, ...p.hand]
        return { ...p, hand: [] }
      })
      if (allDiscarded.length > 0) {
        s = addLog(s, `捨て札：${allDiscarded.map((c) => c.name).join('、')}`)
      } else {
        s = addLog(s, '（手持ちカードを持っているプレイヤーはいませんでした）')
      }
      s = { ...s, players: updatedPlayers, actionDiscard: [...s.actionDiscard, ...allDiscarded] }
      break
    }
  }
  return s
}

// ─── カード使用可能判定 ───────────────────────────────────────

export function isCardUsable(_card: ActionCard, _state: GameState): boolean {
  return true
}

// ─── カード効果プレビュー ─────────────────────────────────────

export type CardEffectKey = 'tradition' | 'openness' | 'curse'
export type CardEffectPreview = { key: CardEffectKey; value: number }[]

// カードの説明文に合わせた表示順
const CARD_DISPLAY_ORDER: Record<string, CardEffectKey[]> = {
  act_revive_old_rules:   ['tradition', 'openness'],
  act_night_festival:     ['tradition', 'openness'],
  act_tourism_pamphlet:   ['openness', 'tradition'],
  act_ghost_spot:         ['openness', 'curse'],
  act_repair_shrine:      ['curse', 'openness'],
  act_touch_taboo:        ['curse', 'tradition', 'openness'],
  act_sacrifice_selection:['curse'],
}

export function previewCardEffect(
  state: GameState,
  card: ActionCard,
  playerIdx: number
): CardEffectPreview {
  const player = state.players[playerIdx]
  let dt = 0, dOpen = 0, dc = 0
  let opennessCallCount = 0

  // ── 基本効果 ──
  switch (card.id) {
    case 'act_revive_old_rules':
      dt += Math.max(0, 1 - state.traditionCardEffectReduction)
      dOpen -= 1
      break
    case 'act_night_festival': {
      const base = state.visitorRow.length >= 1 ? 2 : 1
      dt += Math.max(0, base - state.traditionCardEffectReduction)
      dOpen -= 1
      break
    }
    case 'act_tourism_pamphlet':
      opennessCallCount += 1
      dt -= 1
      if (player?.character?.id === 'char_village_officer') opennessCallCount += 1
      break
    case 'act_ghost_spot':
      opennessCallCount += 1
      dc += 1
      if (player?.character?.id === 'char_village_officer') opennessCallCount += 1
      break
    case 'act_repair_shrine':
      dc -= 2
      dOpen -= 1
      if (player?.character?.id === 'char_shinto_priest') dc -= 1
      break
    case 'act_touch_taboo':
      dc += 2
      dt += 1
      dOpen -= 1
      if (player?.character?.id === 'char_shinto_priest') dc -= 1
      break
    case 'act_sacrifice_selection':
      dc += 1
      break
  }

  // ── 訪問者パッシブ ──
  if (card.type === 'tradition' && state.visitorRow.some(v => v.id === 'vis_folklorist')) {
    dt += 1; dc += 1
  }
  if (card.type === 'open' && state.visitorRow.some(v => v.id === 'vis_streamer')) {
    opennessCallCount += 1; dc += 1
  }
  if (card.type === 'faith' && state.visitorRow.some(v => v.id === 'vis_contractor')) {
    dc += 2
  }

  // ── イベント補正 ──
  dt += state.eventTraditionBonus
  if (state.eventOpennessBonus > 0) opennessCallCount += 1
  const CURSE_INCREASING = ['act_ghost_spot', 'act_touch_taboo', 'act_sacrifice_selection']
  if (state.eventCurseBonus > 0 && CURSE_INCREASING.includes(card.id)) {
    dc += state.eventCurseBonus
  }

  // ── openness 増加分を集約（上限10まで） ──
  const opennessRoom = Math.max(0, 10 - state.openness)
  dOpen += Math.min(opennessCallCount, opennessRoom)

  // ── 山神：increaseOpenness 発動回数だけ祟り+1 ──
  if (state.faithTarget?.id === 'faith_mountain_god' && opennessCallCount > 0 && opennessRoom > 0) {
    dc += Math.min(opennessCallCount, opennessRoom)
  }

  // ── 水神：祟り減少が発生する場合は因習度+1（概算） ──
  if (state.faithTarget?.id === 'faith_water_god' && dc < 0 && state.curse > 0) {
    dt += 1
  }

  const vals: Record<CardEffectKey, number> = { tradition: dt, openness: dOpen, curse: dc }

  // カード説明文の順番で出力し、それ以外の非ゼロ値を末尾に追加
  const baseOrder: CardEffectKey[] = CARD_DISPLAY_ORDER[card.id] ?? ['tradition', 'openness', 'curse']
  const result: CardEffectPreview = []
  const seen = new Set<CardEffectKey>()

  for (const key of baseOrder) {
    if (vals[key] !== 0) result.push({ key, value: vals[key] })
    seen.add(key)
  }
  for (const key of ['tradition', 'openness', 'curse'] as CardEffectKey[]) {
    if (!seen.has(key) && vals[key] !== 0) result.push({ key, value: vals[key] })
  }

  return result
}
