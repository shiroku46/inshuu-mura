'use client'

import { useState, useEffect, useRef } from 'react'
import type { GameState, Player, ActionCard, VisitorCard } from '@/types/game'
import {
  createInitialState,
  startGame,
  processCurseProgress,
  processEventPhase,
  useActionCard,
  castVote,
  resolveTiebreak,
  resolveChuzaiNullify,
  processCheckEnd,
  isCardUsable,
  previewCardEffect,
} from '@/lib/gameLogic'
import { OBJECTIVE_CARDS } from '@/data/cards'
import { supabase } from '@/lib/supabase'

// ─── 型・定数 ─────────────────────────────────────────────────

const PHASE_LABELS: Record<string, string> = {
  setup: '準備中',
  curseProgress: '祟り進行',
  event: 'イベントフェイズ',
  action: '行動フェイズ',
  sacrificeVote: '生贄投票',
  sacrificeTiebreak: '最終決定',
  checkEnd: 'ラウンド終了',
  gameEnd: 'ゲーム終了',
}

const CARD_TYPE_LABELS: Record<string, string> = {
  open: '開放', tradition: '因習', faith: '信仰',
  secret: '秘密', sacrifice: '生贄', event: 'イベント',
}

const CARD_TYPE_COLORS: Record<string, string> = {
  open: 'bg-sky-100 border-sky-400',
  tradition: 'bg-purple-100 border-purple-400',
  faith: 'bg-yellow-100 border-yellow-400',
  secret: 'bg-gray-200 border-gray-400',
  sacrifice: 'bg-red-100 border-red-400',
  event: 'bg-orange-100 border-orange-400',
}

const SLOT_LABELS: Record<string, string> = {
  player_1: 'P1（ホスト）',
  player_2: 'P2',
  player_3: 'P3',
  player_4: 'P4',
}

// ─── hydrateState ────────────────────────────────────────────

function hydrateState(raw: unknown): GameState {
  const s = raw as GameState
  return {
    ...s,
    players: s.players.map(p => ({
      ...p,
      objective: p.objective
        ? {
            ...p.objective,
            checkWin:
              OBJECTIVE_CARDS.find(o => o.id === p.objective!.id)?.checkWin ??
              (() => false),
          }
        : null,
    })),
  }
}

// ─── Supabase push ───────────────────────────────────────────

async function pushState(roomId: string, newState: GameState) {
  await supabase
    .from('game_rooms')
    .update({ game_state: newState, updated_at: new Date().toISOString() })
    .eq('id', roomId)
}

// ─── ゲージ ───────────────────────────────────────────────────

function Gauge({ label, value, max, color, previewValue }: {
  label: string; value: number; max: number; color: string; previewValue?: number
}) {
  const display = previewValue ?? value
  const delta = previewValue !== undefined ? previewValue - value : 0
  const pct = Math.min(100, (display / max) * 100)
  return (
    <div className="flex flex-col gap-1 min-w-[100px]">
      <div className="flex justify-between text-xs font-semibold">
        <span>{label}</span>
        <span className="flex items-center gap-1">
          <span className={previewValue !== undefined ? 'text-amber-300' : ''}>{display}/{max}</span>
          {delta !== 0 && (
            <span className={`text-[10px] font-bold ${delta > 0 ? 'text-green-400' : 'text-red-400'}`}>
              ({delta > 0 ? `+${delta}` : delta})
            </span>
          )}
        </span>
      </div>
      <div className="w-full bg-gray-700 rounded-full h-3">
        <div className={`h-3 rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

// ─── メインコンポーネント ──────────────────────────────────────

export default function GameRoom({ roomId }: { roomId: string }) {
  const [gs, setGs] = useState<GameState | null>(null)
  const [mySlot, setMySlot] = useState<string | null>(null)
  const [connectedSlots, setConnectedSlots] = useState<string[]>([])
  const [playerNames, setPlayerNames] = useState<Record<string, string>>({})
  const [roomNotFound, setRoomNotFound] = useState(false)
  const [viewingObjectiveId, setViewingObjectiveId] = useState<string | null>(null)
  const [hoverDeltas, setHoverDeltas] = useState<{ tradition: number; openness: number; curse: number } | null>(null)
  const logRef = useRef<HTMLDivElement>(null)

  // ─ 初期ロード ─────────────────────────────────────────────
  useEffect(() => {
    const slot = sessionStorage.getItem(`mySlot_${roomId}`)
    setMySlot(slot)

    async function load() {
      const { data, error } = await supabase
        .from('game_rooms')
        .select('*')
        .eq('id', roomId)
        .single()

      if (error || !data) { setRoomNotFound(true); return }

      setConnectedSlots(data.connected_slots ?? [])
      setPlayerNames(data.player_names ?? {})
      if (data.game_state) {
        setGs(hydrateState(data.game_state))
      }
    }
    load()
  }, [roomId])

  // ─ リアルタイム購読 ───────────────────────────────────────
  useEffect(() => {
    const channel = supabase
      .channel(`room:${roomId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'game_rooms', filter: `id=eq.${roomId}` },
        (payload) => {
          const row = payload.new as {
            game_state: unknown
            connected_slots: string[]
            player_names: Record<string, string>
          }
          setConnectedSlots(row.connected_slots ?? [])
          setPlayerNames(row.player_names ?? {})
          if (row.game_state) {
            setGs(hydrateState(row.game_state))
          } else {
            setGs(null)
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [roomId])

  // ─ ログ自動スクロール ────────────────────────────────────
  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight
  }, [gs?.log])

  // ─ 権限チェック ──────────────────────────────────────────
  const isHost = mySlot === 'player_1'

  function isMyActionTurn(): boolean {
    if (!gs || gs.phase !== 'action') return false
    return gs.players[gs.currentPlayerIndex]?.id === mySlot
  }

  function isMyVoteTurn(): boolean {
    if (!gs || gs.phase !== 'sacrificeVote' || gs.chuzaiNullifyPending) return false
    return gs.players[gs.currentPlayerIndex]?.id === mySlot
  }

  function isMyChuzaiTurn(): boolean {
    if (!gs || !gs.chuzaiNullifyPending) return false
    const chuzai = gs.players.find(p => p.alive && p.character?.id === 'char_chuzai')
    return chuzai?.id === mySlot
  }

  function isMyTiebreakTurn(): boolean {
    if (!gs || gs.phase !== 'sacrificeTiebreak') return false
    return gs.sacrificeTiebreakerPlayerId === mySlot
  }

  // ─ アクションハンドラ ─────────────────────────────────────
  async function handleStart() {
    if (!isHost) return
    const newState = startGame(createInitialState(), playerNames, connectedSlots)
    await pushState(roomId, newState)
    setViewingObjectiveId(null)
  }

  async function handleUseCard(playerId: string, cardInstanceId: string) {
    if (!gs || playerId !== mySlot) return
    const newState = useActionCard(gs, playerId, cardInstanceId)
    await pushState(roomId, newState)
  }

  async function handleCastVote(voterId: string, candidateId: string) {
    if (!gs || voterId !== mySlot) return
    const newState = castVote(gs, voterId, candidateId)
    await pushState(roomId, newState)
  }

  async function handleResolveTiebreak(candidateId: string) {
    if (!gs || !isMyTiebreakTurn()) return
    const newState = resolveTiebreak(gs, candidateId)
    await pushState(roomId, newState)
  }

  async function handleResolveChuzaiNullify(voterId: string | null, candidateId: string | null) {
    if (!gs || !isMyChuzaiTurn()) return
    const newState = resolveChuzaiNullify(gs, voterId, candidateId)
    await pushState(roomId, newState)
  }

  async function handleCurseProgress() {
    if (!gs || !isHost) return
    const newState = processCurseProgress(gs)
    await pushState(roomId, newState)
  }

  async function handleEventPhase() {
    if (!gs || !isHost) return
    const newState = processEventPhase(gs)
    await pushState(roomId, newState)
  }

  async function handleCheckEnd() {
    if (!gs || !isHost) return
    const newState = processCheckEnd(gs)
    await pushState(roomId, newState)
  }

  // ─ ルームコードのコピー ───────────────────────────────────
  async function copyRoomId() {
    await navigator.clipboard.writeText(roomId)
  }

  // ─ ロード中・エラー ───────────────────────────────────────
  if (roomNotFound) {
    return (
      <div className="min-h-screen bg-stone-950 text-stone-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-400 text-xl mb-4">部屋が見つかりません</div>
          <a href="/" className="text-amber-400 underline">ロビーに戻る</a>
        </div>
      </div>
    )
  }

  // ─ ロビー画面（ゲーム未開始） ─────────────────────────────
  if (!gs || gs.phase === 'setup') {
    return (
      <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col items-center justify-center gap-6 p-6">
        <h1 className="text-2xl font-bold text-amber-400 tracking-widest">因習村をつくろう</h1>

        <div className="w-full max-w-sm bg-stone-900 rounded-xl p-6 border border-stone-700 flex flex-col gap-4">
          <div className="text-center">
            <div className="text-xs text-stone-400 mb-1">部屋コード</div>
            <button
              onClick={copyRoomId}
              className="font-mono text-3xl font-bold text-amber-300 tracking-widest hover:text-amber-200 transition"
              title="クリックでコピー"
            >
              {roomId}
            </button>
            <div className="text-xs text-stone-500 mt-1">クリックでコピー</div>
          </div>

          <div className="border-t border-stone-700 pt-4">
            <div className="text-xs text-stone-400 mb-2">参加中のプレイヤー（{connectedSlots.length}/4）</div>
            <div className="space-y-1">
              {(['player_1', 'player_2', 'player_3', 'player_4'] as const).map(slot => {
                const joined = connectedSlots.includes(slot)
                const name = playerNames[slot]
                const isMe = slot === mySlot
                return (
                  <div
                    key={slot}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
                      joined ? 'bg-stone-700' : 'bg-stone-800 opacity-50'
                    }`}
                  >
                    <span className={`text-xs ${joined ? 'text-green-400' : 'text-stone-600'}`}>●</span>
                    <span className="text-stone-400 text-xs w-20">{SLOT_LABELS[slot]}</span>
                    <span className="font-semibold">{name ?? (joined ? '接続中...' : '空席')}</span>
                    {isMe && <span className="ml-auto text-xs text-amber-400 font-bold">あなた</span>}
                  </div>
                )
              })}
            </div>
          </div>

          {isHost ? (
            <div className="flex flex-col gap-2">
              <button
                onClick={handleStart}
                disabled={connectedSlots.length < 3}
                className="py-3 bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white font-bold rounded-lg transition"
              >
                ゲーム開始（{connectedSlots.length}人）
              </button>
              {connectedSlots.length < 3 && (
                <div className="text-center text-stone-500 text-xs">
                  最低3人必要です（あと{3 - connectedSlots.length}人）
                </div>
              )}
            </div>
          ) : (
            <div className="text-center text-stone-400 text-sm py-2">
              ホスト（P1）がゲームを開始するまでお待ちください
            </div>
          )}
        </div>
      </div>
    )
  }

  // ─ ゲーム画面 ─────────────────────────────────────────────
  const currentPlayer = gs.players[gs.currentPlayerIndex]
  const aliveCount = gs.players.filter(p => p.alive).length
  const myPlayer = gs.players.find(p => p.id === mySlot)

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 p-3 font-sans">
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-xl font-bold text-amber-400 tracking-widest">因習村をつくろう</h1>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-stone-500">部屋：</span>
          <span className="font-mono text-amber-300 font-bold">{roomId}</span>
          {myPlayer && (
            <span className="bg-stone-700 text-stone-200 px-2 py-0.5 rounded">
              {myPlayer.name}（{SLOT_LABELS[mySlot ?? '']}）
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {/* 村の状態バー */}
        <div className="bg-stone-800 rounded-xl p-3 shadow">
          <div className="flex flex-wrap gap-4 items-start justify-between">
            <div className="flex flex-wrap gap-4 flex-1">
              <Gauge label="因習度" value={gs.tradition} max={20} color="bg-purple-500"
                previewValue={hoverDeltas ? Math.max(0, Math.min(20, gs.tradition + hoverDeltas.tradition)) : undefined} />
              <Gauge label="開放度" value={gs.openness} max={10} color="bg-sky-500"
                previewValue={hoverDeltas ? Math.max(0, Math.min(10, gs.openness + hoverDeltas.openness)) : undefined} />
              <Gauge label="祟り" value={gs.curse} max={10} color="bg-red-500"
                previewValue={hoverDeltas ? Math.max(0, Math.min(10, gs.curse + hoverDeltas.curse)) : undefined} />
            </div>
            <div className="text-right text-sm text-stone-400 shrink-0">
              <div>ラウンド <span className="text-white font-bold text-lg">{gs.round}</span></div>
              <div className="mt-1">
                <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                  gs.phase === 'curseProgress' ? 'bg-red-900 text-red-300' :
                  gs.phase === 'sacrificeVote' ? 'bg-red-700 text-white' :
                  gs.phase === 'sacrificeTiebreak' ? 'bg-red-900 text-white' :
                  gs.phase === 'event' ? 'bg-orange-700 text-white' :
                  gs.phase === 'action' ? 'bg-blue-700 text-white' :
                  gs.phase === 'checkEnd' ? 'bg-green-800 text-white' :
                  gs.phase === 'gameEnd' ? 'bg-gray-700 text-white' :
                  'bg-stone-600 text-white'
                }`}>
                  {PHASE_LABELS[gs.phase]}
                </span>
              </div>
              {gs.phase === 'action' && currentPlayer && (
                <div className="mt-1 text-amber-400 font-semibold text-xs">
                  手番：{currentPlayer.name}
                  {currentPlayer.id === mySlot && ' ← あなた'}
                </div>
              )}
              {(gs.phase === 'sacrificeVote' || gs.phase === 'sacrificeTiebreak') && currentPlayer && (
                <div className="mt-1 text-red-400 font-semibold text-xs">
                  投票：{currentPlayer.name}
                  {currentPlayer.id === mySlot && ' ← あなた'}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          {/* 左カラム */}
          <div className="flex flex-col gap-3">
            {/* 信仰対象 */}
            {gs.faithTarget && (
              <div className="bg-stone-800 rounded-xl p-3 shadow border border-amber-700">
                <div className="text-xs text-amber-400 font-bold mb-1">【信仰対象】</div>
                <div className="font-bold text-amber-300 text-base">{gs.faithTarget.name}</div>
                <ul className="mt-1 text-xs text-stone-300 list-disc list-inside space-y-0.5">
                  {gs.faithTarget.effects.map((e, i) => <li key={i}>{e}</li>)}
                </ul>
              </div>
            )}

            {/* 今回のイベント */}
            <div className="bg-stone-800 rounded-xl p-3 shadow border border-orange-700">
              <div className="text-xs text-orange-400 font-bold mb-1">【今回のイベント】</div>
              {gs.currentEvent ? (
                <>
                  <div className="font-bold text-orange-300">{gs.currentEvent.name}</div>
                  <div className="text-xs text-stone-300 mt-1">{gs.currentEvent.description}</div>
                </>
              ) : (
                <div className="text-stone-500 text-sm">なし</div>
              )}
              <div className="text-xs text-stone-500 mt-1">山札残り：{gs.eventDeck.length}枚</div>
            </div>

            {/* 発動中の祟りカード */}
            {gs.activeCurseCard && (
              <div className="bg-stone-800 rounded-xl p-3 shadow border-2 border-rose-700 animate-pulse">
                <div className="text-xs text-rose-400 font-bold mb-1">【祟りカード発動中】</div>
                <div className="font-bold text-rose-300 text-base">{gs.activeCurseCard.name}</div>
                <div className="text-xs text-stone-400 mt-0.5">{gs.activeCurseCard.description}</div>
                <div className="mt-1 space-y-0.5">
                  <div className="text-xs text-rose-400">因習+{gs.activeCurseCard.inshuPointGain}・生贄発生（祟り-1）</div>
                  <div className="text-xs text-rose-600">{gs.activeCurseCard.debuffDescription}</div>
                </div>
              </div>
            )}

            {/* 来訪者欄 */}
            <VisitorRowPanel gs={gs} />

            {/* フェイズ操作 */}
            <PhaseControls
              gs={gs}
              aliveCount={aliveCount}
              mySlot={mySlot}
              isHost={isHost}
              isMyVoteTurn={isMyVoteTurn()}
              isMyChuzaiTurn={isMyChuzaiTurn()}
              isMyTiebreakTurn={isMyTiebreakTurn()}
              onCurseProgress={handleCurseProgress}
              onEventPhase={handleEventPhase}
              onCheckEnd={handleCheckEnd}
              onCastVote={handleCastVote}
              onResolveTiebreak={handleResolveTiebreak}
              onResolveChuzaiNullify={handleResolveChuzaiNullify}
              onRestart={handleStart}
            />
          </div>

          {/* プレイヤーエリア */}
          <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {gs.players.map((player, idx) => (
              <PlayerPanel
                key={player.id}
                player={player}
                isCurrentTurn={gs.phase === 'action' && gs.currentPlayerIndex === idx}
                isCurrentVoter={
                  (gs.phase === 'sacrificeVote' || gs.phase === 'sacrificeTiebreak') &&
                  gs.currentPlayerIndex === idx
                }
                isMe={player.id === mySlot}
                gs={gs}
                viewingObjectiveId={viewingObjectiveId}
                onViewObjective={id => setViewingObjectiveId(viewingObjectiveId === id ? null : id)}
                onUseCard={isMyActionTurn() ? handleUseCard : undefined}
                onHoverCard={setHoverDeltas}
                onLeaveCard={() => setHoverDeltas(null)}
              />
            ))}
          </div>
        </div>

        {/* ゲームログ */}
        <div className="bg-stone-900 rounded-xl p-3 shadow">
          <div className="text-xs text-stone-400 font-bold mb-1">ゲームログ</div>
          <div ref={logRef} className="h-32 overflow-y-auto text-xs text-stone-300 space-y-0.5">
            {gs.log.map((line, i) => (
              <div key={i} className="border-b border-stone-800 pb-0.5">{line}</div>
            ))}
          </div>
        </div>
      </div>

      {/* ゲーム終了モーダル */}
      {gs.phase === 'gameEnd' && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-stone-800 rounded-xl p-6 max-w-lg w-full mx-4 shadow-2xl border border-amber-600">
            <h2 className="text-2xl font-bold text-amber-400 text-center mb-2">{gs.endingName}</h2>
            <div className="text-center text-stone-300 text-sm mb-4">
              因習度：{gs.tradition}　開放度：{gs.openness}　祟り：{gs.curse}
            </div>
            <div className="space-y-2 mb-4">
              {gs.players.map(p => {
                const isWinner = gs.winnerPlayerIds.includes(p.id)
                return (
                  <div key={p.id} className={`rounded-lg p-3 ${isWinner ? 'bg-amber-900 border border-amber-400' : 'bg-stone-700'}`}>
                    <div className="flex justify-between items-center">
                      <span className="font-bold">{p.name}</span>
                      <span className={`text-xs px-2 py-0.5 rounded ${isWinner ? 'bg-amber-500 text-white' : 'bg-stone-600 text-stone-300'}`}>
                        {isWinner ? '勝利' : '敗北'}
                      </span>
                    </div>
                    <div className="text-xs text-stone-300 mt-0.5">
                      {p.character?.name}　目的：{p.objective?.name}
                    </div>
                    <div className="text-xs text-stone-400">{p.objective?.description}</div>
                  </div>
                )
              })}
            </div>
            {isHost && (
              <button
                onClick={handleStart}
                className="w-full py-3 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg transition"
              >
                もう一度プレイ
              </button>
            )}
            {!isHost && (
              <div className="text-center text-stone-400 text-sm">ホストが新しいゲームを開始するまでお待ちください</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── カード効果プレビュー ─────────────────────────────────────

const EFFECT_META = {
  tradition: { label: '因習', color: 'text-purple-800' },
  openness:  { label: '開放', color: 'text-sky-800' },
  curse:     { label: '祟り',  color: 'text-red-800' },
} as const

function CardDeltaPreview({ preview }: { preview: ReturnType<typeof previewCardEffect> }) {
  if (preview.length === 0) return <span className="text-[10px] text-stone-500">変化なし</span>
  return (
    <span className="flex gap-1.5 flex-wrap">
      {preview.map(({ key, value }) => {
        const meta = EFFECT_META[key]
        return (
          <span key={key} className={`text-[11px] font-bold ${meta.color}`}>
            {meta.label}{value > 0 ? `+${value}` : value}
          </span>
        )
      })}
    </span>
  )
}

// ─── 来訪者欄パネル ───────────────────────────────────────────

function VisitorRowPanel({ gs }: { gs: GameState }) {
  return (
    <div className="bg-stone-800 rounded-xl p-3 shadow border border-green-800">
      <div className="text-xs text-green-400 font-bold mb-1">
        【来訪者欄】（{gs.visitorRow.length}人 / 山札{gs.visitorDeck.length}枚）
      </div>
      {gs.visitorRow.length === 0 ? (
        <div className="text-stone-500 text-xs">訪問者なし</div>
      ) : (
        <div className="space-y-2">
          {gs.visitorRow.map((v, i) => (
            <div key={`${v.id}-${i}`} className="bg-stone-700 rounded-lg p-2 text-xs border border-stone-600">
              <div className="font-bold text-green-300 mb-0.5">{v.name}</div>
              <div className="text-amber-300 mb-0.5">{v.effectDescription}</div>
              <div className="text-stone-400">{v.description}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── フェイズ操作パネル ───────────────────────────────────────

function PhaseControls({
  gs, aliveCount, mySlot, isHost,
  isMyVoteTurn, isMyChuzaiTurn, isMyTiebreakTurn,
  onCurseProgress, onEventPhase, onCheckEnd,
  onCastVote, onResolveTiebreak, onResolveChuzaiNullify,
  onRestart,
}: {
  gs: GameState
  aliveCount: number
  mySlot: string | null
  isHost: boolean
  isMyVoteTurn: boolean
  isMyChuzaiTurn: boolean
  isMyTiebreakTurn: boolean
  onCurseProgress: () => void
  onEventPhase: () => void
  onCheckEnd: () => void
  onCastVote: (voterId: string, candidateId: string) => void
  onResolveTiebreak: (candidateId: string) => void
  onResolveChuzaiNullify: (voterId: string | null, candidateId: string | null) => void
  onRestart: () => void
}) {
  if (gs.phase === 'curseProgress') {
    return (
      <div className="bg-stone-800 rounded-xl p-3 border border-red-900">
        <div className="text-xs text-red-400 font-bold mb-2">【祟り進行フェイズ】</div>
        <div className="flex justify-between text-xs text-stone-400 mb-1 bg-stone-700 rounded px-3 py-2">
          <span>祟り：<span className={gs.curse >= 6 ? 'text-red-400 font-bold' : 'text-white font-bold'}>{gs.curse}</span> / 10</span>
          <span>生贄投票：6以上（R2以降）</span>
        </div>
        <div className="flex justify-between text-xs text-stone-400 mb-3 bg-stone-700 rounded px-3 py-2 mt-1">
          <span>因習度：<span className={gs.tradition >= 20 ? 'text-purple-400 font-bold' : 'text-white font-bold'}>{gs.tradition}</span> / 20</span>
          <span>完成エンド：ラウンド終了時判定</span>
        </div>
        {isHost ? (
          <button onClick={onCurseProgress} className="w-full py-2 bg-red-900 hover:bg-red-800 text-white font-bold rounded-lg transition">
            祟りを進行させる
          </button>
        ) : (
          <div className="text-center text-stone-500 text-xs py-2">ホスト（P1）の操作待ち</div>
        )}
      </div>
    )
  }

  if (gs.phase === 'gameEnd') {
    return (
      <div className="bg-stone-800 rounded-xl p-3 text-center">
        <div className="text-amber-400 font-bold mb-2">{gs.endingName}</div>
        {isHost && (
          <button onClick={onRestart} className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-sm font-semibold transition">
            もう一度プレイ
          </button>
        )}
      </div>
    )
  }

  if (gs.phase === 'event') {
    return (
      <div className="bg-stone-800 rounded-xl p-3">
        <div className="text-sm text-stone-400 mb-2">
          {gs.eventDeck.length === 0 ? '⚠ イベント山札が尽きています！' : 'イベントカードを引いてください'}
        </div>
        {isHost ? (
          <button onClick={onEventPhase} className="w-full py-2 bg-orange-700 hover:bg-orange-600 text-white font-bold rounded-lg transition">
            イベントカードを引く
          </button>
        ) : (
          <div className="text-center text-stone-500 text-xs py-2">ホスト（P1）の操作待ち</div>
        )}
      </div>
    )
  }

  if (gs.phase === 'action') {
    const alivePlayers = gs.players.filter(p => p.alive)
    const acted = gs.actedPlayerIds.filter(id => alivePlayers.some(p => p.id === id)).length
    const currentActorName = gs.players[gs.currentPlayerIndex]?.name
    return (
      <div className="bg-stone-800 rounded-xl p-3">
        <div className="text-sm text-stone-400">行動済み：{acted}/{aliveCount}人</div>
        <div className="text-xs text-amber-400 mt-1">手番：{currentActorName}</div>
        {!gs.players.find(p => p.id === mySlot)?.alive && (
          <div className="text-xs text-stone-500 mt-1">（あなたは死亡しています）</div>
        )}
      </div>
    )
  }

  if (gs.phase === 'sacrificeVote') {
    if (gs.chuzaiNullifyPending) {
      return (
        <div className="bg-stone-800 rounded-xl p-3 border border-yellow-700">
          <div className="text-yellow-400 font-bold mb-2 text-sm">駐在の能力</div>
          {isMyChuzaiTurn ? (
            <ChuzaiNullifyControls gs={gs} onResolve={onResolveChuzaiNullify} />
          ) : (
            <div className="text-stone-500 text-xs text-center py-2">駐在の操作待ち</div>
          )}
        </div>
      )
    }
    const currentVoterId = gs.players[gs.currentPlayerIndex]?.id
    if (!currentVoterId) return null
    return (
      <div className="bg-stone-800 rounded-xl p-3 border border-red-700">
        <div className="text-red-400 font-bold mb-2 text-sm">⚠ 生贄投票フェイズ</div>
        {isMyVoteTurn ? (
          <VoteControls gs={gs} voterId={currentVoterId} onCastVote={onCastVote} />
        ) : (
          <div className="text-stone-500 text-xs text-center py-2">
            {gs.players.find(p => p.id === currentVoterId)?.name} の投票待ち
          </div>
        )}
      </div>
    )
  }

  if (gs.phase === 'sacrificeTiebreak') {
    return (
      <div className="bg-stone-800 rounded-xl p-3 border border-red-900">
        <div className="text-red-400 font-bold mb-2 text-sm">⚠ 最終決定フェイズ</div>
        {isMyTiebreakTurn ? (
          <TiebreakControls gs={gs} onResolveTiebreak={onResolveTiebreak} />
        ) : (
          <div className="text-stone-500 text-xs text-center py-2">
            {gs.players.find(p => p.id === gs.sacrificeTiebreakerPlayerId)?.name} の決定待ち
          </div>
        )}
      </div>
    )
  }

  if (gs.phase === 'checkEnd') {
    return (
      <div className="bg-stone-800 rounded-xl p-3">
        <div className="text-sm text-stone-400 mb-2">ラウンド終了</div>
        {isHost ? (
          <button onClick={onCheckEnd} className="w-full py-2 bg-green-700 hover:bg-green-600 text-white font-bold rounded-lg transition">
            次のラウンドへ
          </button>
        ) : (
          <div className="text-center text-stone-500 text-xs py-2">ホスト（P1）の操作待ち</div>
        )}
      </div>
    )
  }

  return null
}

// ─── 生贄投票コントロール ─────────────────────────────────────

function VoteControls({
  gs, voterId, onCastVote,
}: {
  gs: GameState
  voterId: string
  onCastVote: (voterId: string, candidateId: string) => void
}) {
  const voter = gs.players.find(p => p.id === voterId)
  const remaining = gs.sacrificeVoteRemainingIds.length
  const total = gs.players.filter(p => p.alive).length
  const isChief = voter?.character?.id === 'char_village_chief'
  const visitorCandidates = gs.sacrificeVoteCandidates.filter(c => c.type === 'visitor')
  const playerCandidates = gs.sacrificeVoteCandidates.filter(c => c.type === 'player')

  return (
    <div className="space-y-3">
      <div className="bg-stone-700 rounded px-3 py-2 text-xs">
        <span className="text-amber-400 font-bold">{voter?.name}</span>
        {isChief && <span className="ml-1 text-yellow-400 text-[10px]">（村長・2票）</span>}
        <span className="text-stone-300"> が投票中</span>
        <span className="ml-2 text-stone-500">残り{remaining}/{total}人</span>
      </div>
      {visitorCandidates.length > 0 && (
        <div>
          <div className="text-xs text-amber-400 font-bold mb-1">訪問者を生贄に（因習+3、開放-3、祟り-2）：</div>
          <div className="space-y-1">
            {visitorCandidates.map(c => (
              <button
                key={c.id}
                onClick={() => onCastVote(voterId, c.id)}
                className="w-full text-left px-3 py-2 bg-red-900/50 hover:bg-red-800/70 border border-red-700 rounded-lg text-xs transition"
              >
                <span className="font-bold text-red-300">{c.name}</span>
                <span className="ml-2 text-stone-500 text-[10px]">訪問者</span>
              </button>
            ))}
          </div>
        </div>
      )}
      <div>
        <div className="text-xs text-amber-400 font-bold mb-1">プレイヤーを生贄に（因習+4、祟り-3）：</div>
        <div className="space-y-1">
          {playerCandidates.map(c => {
            const p = gs.players.find(pl => pl.id === c.id)
            const pIsChief = p?.character?.id === 'char_village_chief'
            return (
              <button
                key={c.id}
                onClick={() => onCastVote(voterId, c.id)}
                className="w-full text-left px-3 py-2 bg-stone-700 hover:bg-stone-600 border border-stone-500 rounded-lg text-xs transition"
              >
                <span className="font-bold text-white">{c.name}</span>
                {pIsChief && <span className="ml-1 text-yellow-400 text-[10px]">（村長）</span>}
                <span className="ml-2 text-stone-500 text-[10px]">プレイヤー</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── タイブレークコントロール ─────────────────────────────────

function TiebreakControls({
  gs, onResolveTiebreak,
}: {
  gs: GameState
  onResolveTiebreak: (candidateId: string) => void
}) {
  const tbPlayer = gs.players.find(p => p.id === gs.sacrificeTiebreakerPlayerId)
  const isChief = tbPlayer?.character?.id === 'char_village_chief'
  const tiedCandidates = gs.sacrificeVoteCandidates.filter(c =>
    gs.sacrificeTiedCandidateIds.includes(c.id)
  )

  return (
    <div className="space-y-3">
      <div className="text-xs text-stone-300">投票が同票になりました。</div>
      <div className="bg-stone-700 rounded px-3 py-2 text-xs">
        <span className="text-amber-400 font-bold">{tbPlayer?.name ?? '???'}</span>
        {isChief && <span className="ml-1 text-yellow-400 text-[10px]">（村長の権限）</span>}
        <span className="text-stone-300"> が最終決定します</span>
      </div>
      <div className="text-xs text-amber-400 font-bold mb-1">同票の候補から選択：</div>
      <div className="space-y-1">
        {tiedCandidates.map(c => (
          <button
            key={c.id}
            onClick={() => onResolveTiebreak(c.id)}
            className={`w-full text-left px-3 py-2 border rounded-lg text-xs transition ${
              c.type === 'visitor'
                ? 'bg-red-900/50 hover:bg-red-800/70 border-red-700'
                : 'bg-stone-700 hover:bg-stone-600 border-stone-500'
            }`}
          >
            <span className={`font-bold ${c.type === 'visitor' ? 'text-red-300' : 'text-white'}`}>
              {c.name}
            </span>
            <span className="ml-2 text-stone-500 text-[10px]">
              {c.type === 'visitor' ? '訪問者' : 'プレイヤー'}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── 駐在コントロール ─────────────────────────────────────────

function ChuzaiNullifyControls({
  gs, onResolve,
}: {
  gs: GameState
  onResolve: (voterId: string | null, candidateId: string | null) => void
}) {
  const chuzai = gs.players.find(p => p.alive && p.character?.id === 'char_chuzai')
  const nullifiable = gs.sacrificeVotes.filter(v => v.voterId !== chuzai?.id)

  return (
    <div className="space-y-3">
      <div className="text-xs text-stone-300">
        <span className="text-yellow-400 font-bold">{chuzai?.name}（駐在）</span>
        が1票を無効にできます。
      </div>
      <div className="text-xs text-stone-400 mb-1">無効にする票を選択：</div>
      <div className="space-y-1">
        {nullifiable.map((v, i) => {
          const voter = gs.players.find(p => p.id === v.voterId)
          const candidate = gs.sacrificeVoteCandidates.find(c => c.id === v.candidateId)
          return (
            <button
              key={i}
              onClick={() => onResolve(v.voterId, v.candidateId)}
              className="w-full text-left px-3 py-2 bg-stone-700 hover:bg-red-900/50 border border-stone-500 hover:border-red-700 rounded-lg text-xs transition"
            >
              <span className="text-amber-300">{voter?.name ?? v.voterId}</span>
              <span className="text-stone-400"> → </span>
              <span className="font-bold text-white">{candidate?.name ?? v.candidateId}</span>
              <span className="ml-2 text-stone-500">への票を無効に</span>
            </button>
          )
        })}
      </div>
      <button
        onClick={() => onResolve(null, null)}
        className="w-full py-2 bg-stone-600 hover:bg-stone-500 text-stone-300 rounded-lg text-xs transition"
      >
        無効化しない（スキップ）
      </button>
    </div>
  )
}

// ─── プレイヤーパネル ─────────────────────────────────────────

function PlayerPanel({
  player, isCurrentTurn, isCurrentVoter, isMe, gs,
  viewingObjectiveId, onViewObjective, onUseCard, onHoverCard, onLeaveCard,
}: {
  player: Player
  isCurrentTurn: boolean
  isCurrentVoter: boolean
  isMe: boolean
  gs: GameState
  viewingObjectiveId: string | null
  onViewObjective: (id: string) => void
  onUseCard?: (playerId: string, cardInstanceId: string) => void
  onHoverCard?: (deltas: { tradition: number; openness: number; curse: number }) => void
  onLeaveCard?: () => void
}) {
  const isViewingObjective = viewingObjectiveId === player.id

  return (
    <div className={`bg-stone-800 rounded-xl p-3 shadow transition border-2 ${
      !player.alive
        ? 'border-stone-700 opacity-60'
        : isMe
        ? 'border-amber-600 ring-1 ring-amber-600/50'
        : isCurrentTurn
        ? 'border-amber-500 ring-1 ring-amber-500'
        : isCurrentVoter
        ? 'border-red-500 ring-1 ring-red-500'
        : 'border-stone-700'
    }`}>
      {/* ヘッダー */}
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center gap-1 flex-wrap">
          <span className="font-bold text-base">{player.name}</span>
          {isMe && <span className="text-xs bg-amber-700 text-amber-200 px-1.5 py-0.5 rounded font-bold">あなた</span>}
          {isCurrentTurn && <span className="text-xs bg-amber-600 text-white px-1.5 py-0.5 rounded font-bold">手番</span>}
          {isCurrentVoter && <span className="text-xs bg-red-700 text-white px-1.5 py-0.5 rounded font-bold">投票中</span>}
          {player.immediateWin && <span className="text-xs bg-amber-500 text-white px-1.5 py-0.5 rounded font-bold">即時勝利済</span>}
        </div>
        <span className={`text-xs px-2 py-0.5 rounded font-bold ${
          player.alive ? 'bg-green-800 text-green-300' : 'bg-stone-700 text-stone-400'
        }`}>
          {player.alive ? '生存' : '死亡'}
        </span>
      </div>

      {/* キャラクターカード */}
      <div className="text-xs bg-stone-700 rounded-lg p-2 mb-2">
        <span className="text-yellow-400 font-bold">[キャラ] </span>
        <span className="font-semibold">{player.character?.name}</span>
        <div className="text-stone-400 mt-0.5">{player.character?.abilityDescription}</div>
      </div>

      {/* 目的カード（自分のみ表示可能） */}
      {isMe && (
        <div className="mb-2">
          <button
            onClick={e => { e.stopPropagation(); onViewObjective(player.id) }}
            className="text-xs px-2 py-1 bg-stone-600 hover:bg-stone-500 text-stone-200 rounded transition"
          >
            {isViewingObjective ? '▲ 目的を隠す' : '▼ 目的を見る（自分のみ）'}
          </button>
          {isViewingObjective && (
            <div className="mt-1 bg-stone-700 rounded-lg p-2 text-xs border border-purple-700">
              <div className="font-bold text-purple-300">{player.objective?.name}</div>
              <div className="text-stone-300 mt-0.5">{player.objective?.description}</div>
            </div>
          )}
        </div>
      )}
      {!isMe && (
        <div className="mb-2">
          <div className="text-xs px-2 py-1 bg-stone-700 text-stone-500 rounded inline-block">
            目的：非公開
          </div>
        </div>
      )}

      {/* 手札 */}
      <div>
        <div className="text-xs text-stone-400 mb-1">手札（{player.hand.length}枚）</div>
        <div className="space-y-1.5">
          {player.hand.map(card => {
            const usable = isCardUsable(card, gs)
            const canUse = isMe && isCurrentTurn && player.alive && gs.phase === 'action' && usable && !!onUseCard
            const playerIdx = gs.players.findIndex(p => p.id === player.id)
            const preview = previewCardEffect(gs, card, playerIdx)
            const previewDeltas = { tradition: 0, openness: 0, curse: 0, ...Object.fromEntries(preview.map(({ key, value }) => [key, value])) }
            return (
              <div
                key={card.instanceId}
                className={`rounded-lg border p-2 text-xs ${CARD_TYPE_COLORS[card.type] ?? 'bg-stone-700 border-stone-500'}`}
              >
                <div className="flex justify-between items-start gap-1">
                  <div className="flex-1">
                    <span className="font-bold text-stone-800">{card.name}</span>
                    <span className="ml-1 text-stone-600 text-[10px]">[{CARD_TYPE_LABELS[card.type]}]</span>
                    <div className="text-stone-600 mt-0.5">{card.description}</div>
                    <div className="mt-1 flex items-center gap-1">
                      <span className="text-[10px] text-stone-500">使用時：</span>
                      <CardDeltaPreview preview={preview} />
                    </div>
                  </div>
                  {isMe && isCurrentTurn && player.alive && (
                    <button
                      onClick={e => { e.stopPropagation(); if (canUse) onUseCard!(player.id, card.instanceId) }}
                      onMouseEnter={() => canUse && onHoverCard?.(previewDeltas)}
                      onMouseLeave={() => onLeaveCard?.()}
                      disabled={!canUse}
                      className={`shrink-0 px-2 py-1 rounded text-[10px] font-bold transition ${
                        canUse
                          ? 'bg-amber-600 hover:bg-amber-500 text-white'
                          : 'bg-stone-400 text-stone-600 cursor-not-allowed'
                      }`}
                    >
                      使用
                    </button>
                  )}
                </div>
              </div>
            )
          })}
          {player.hand.length === 0 && (
            <div className="text-stone-500 text-xs">手札なし</div>
          )}
        </div>
      </div>
    </div>
  )
}
