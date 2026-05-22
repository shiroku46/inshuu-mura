export type SacrificeVoteCandidate =
  | { type: 'visitor'; id: string; name: string }
  | { type: 'player'; id: string; name: string }

export type Phase =
  | 'setup'
  | 'curseProgress'
  | 'event'
  | 'action'
  | 'sacrificeVote'
  | 'sacrificeTiebreak'
  | 'checkEnd'
  | 'gameEnd'

export type CardType = 'open' | 'tradition' | 'faith' | 'secret' | 'sacrifice' | 'event'

export type ObjectiveTag = '因習' | '開放' | '祟り' | '生存死亡'

export type CurseDebuffType =
  | 'openness_decrease'
  | 'discard_all_cards'

export type CurseCard = {
  id: string
  name: string
  description: string
  inshuPointGain: number
  triggersSacrifice: true
  debuffType: CurseDebuffType
  debuffAmount: number
  debuffDescription: string
}

export type FaithTarget = {
  id: string
  name: string
  description: string
  effects: string[]
}

export type CharacterCard = {
  id: string
  name: string
  description: string
  abilityDescription: string
}

export type ObjectiveCard = {
  id: string
  name: string
  description: string
  tags: ObjectiveTag[]
  checkWin: (state: GameStateSnapshot) => boolean
  immediateWin?: boolean
}

export type ActionCard = {
  id: string
  instanceId: string
  name: string
  type: CardType
  description: string
}

export type EventCard = {
  id: string
  name: string
  type: 'event'
  description: string
}

export type VisitorCard = {
  id: string
  name: string
  effectDescription: string
  description: string
}

export type Player = {
  id: string
  name: string
  character: CharacterCard | null
  objective: ObjectiveCard | null
  hand: ActionCard[]
  alive: boolean
  immediateWin: boolean
}

export type GameStateSnapshot = {
  tradition: number
  openness: number
  curse: number
  players: Player[]
}

export type GameState = {
  phase: Phase
  round: number
  currentPlayerIndex: number
  tradition: number
  openness: number
  curse: number
  faithTarget: FaithTarget | null
  players: Player[]
  actionDeck: ActionCard[]
  actionDiscard: ActionCard[]
  eventDeck: EventCard[]
  currentEvent: EventCard | null
  visitorDeck: VisitorCard[]
  visitorDiscard: VisitorCard[]
  visitorRow: VisitorCard[]
  curseDeck: CurseCard[]
  curseDiscard: CurseCard[]
  activeCurseCard: CurseCard | null
  activeCurseCardSacrifice: boolean
  skipActionsThisRound: boolean
  skipActionsNextRound: boolean
  log: string[]
  winnerPlayerIds: string[]
  endingName: string | null
  sacrificeNeeded: boolean
  sacrificeReturnPhase: Phase | null
  actedPlayerIds: string[]
  viewingObjectivePlayerId: string | null
  curseSacrificeTriggeredThisRound: boolean
  traditionCardPlayedThisRound: boolean
  sacrificeVoteCandidates: SacrificeVoteCandidate[]
  sacrificeVotes: { voterId: string; candidateId: string }[]
  sacrificeVoteRemainingIds: string[]
  sacrificeTiebreakerPlayerId: string | null
  sacrificeTiedCandidateIds: string[]
  sacrificeOriginPlayerIndex: number
  eventTraditionBonus: number
  eventOpennessBonus: number
  eventCurseBonus: number
  endOfRoundSacrificeRequired: boolean
  endOfRoundSacrificeIfCurse: boolean
  traditionCardEffectReduction: number
  sacrificeCount: number
  chuzaiNullifyPending: boolean
}
