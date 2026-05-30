'use client'

import { useState, useEffect, useRef } from 'react'
import type { GameState, EventCard } from '@/types/game'
import { createInitialState, findConnectedTiles, playCard, endPlayerTurn, startPlayerTurn, startNextRound, calculateRoundOutput, executeSettlement, getSettlementDetails, appearVisitors, getVisitorCapacity, getVisitorCountToAppear, shouldTriggerSacrificeEvent, triggerSacrificeEvent, sacrificeVisitor, canPlaceTerrainCardAt } from '@/lib/gameLogic'
import { supabase } from '@/lib/supabase'
import RulesModal from '@/app/components/RulesModal'
import { TERRAIN_CARDS, FACILITY_CARDS, EVENT_CARDS } from '@/data/cards'

const SLOT_LABELS: Record<string, string> = {
  player_1: 'P1（ホスト）',
  player_2: 'P2',
  player_3: 'P3',
  player_4: 'P4',
}

function getConnectionSymbol(connections: string[]): string {
  const has = {
    up: connections.includes('up'),
    down: connections.includes('down'),
    left: connections.includes('left'),
    right: connections.includes('right'),
  }

  // 十字路
  if (has.up && has.down && has.left && has.right) return '┼'

  // 3本線
  if (has.down && has.left && has.right) return '┬'
  if (has.up && has.left && has.right) return '┴'
  if (has.up && has.down && has.right) return '├'
  if (has.up && has.down && has.left) return '┤'

  // 2本線（角）
  if (has.up && has.right) return '└'
  if (has.up && has.left) return '┘'
  if (has.down && has.right) return '┐'
  if (has.down && has.left) return '┌'

  // 1本線
  if (has.up || has.down) return '│'
  if (has.left || has.right) return '─'

  return ' '
}

async function pushState(roomId: string, newState: GameState) {
  await supabase
    .from('game_rooms')
    .update({ game_state: newState, updated_at: new Date().toISOString() })
    .eq('id', roomId)
}

export default function GameRoom({ roomId }: { roomId: string }) {
  const [gs, setGs] = useState<GameState | null>(null)
  const [mySlot, setMySlot] = useState<string | null>(null)
  const [connectedSlots, setConnectedSlots] = useState<string[]>([])
  const [playerNames, setPlayerNames] = useState<Record<string, string>>({})
  const [roomNotFound, setRoomNotFound] = useState(false)
  const [selectedHandCardIndex, setSelectedHandCardIndex] = useState<number | null>(null)
  const [selectedPlayerSlot, setSelectedPlayerSlot] = useState<string | null>(null)
  const [selectingEventTarget, setSelectingEventTarget] = useState(false)
  const [selectingSacrificeTarget, setSelectingSacrificeTarget] = useState(false)

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

      if (error || !data) {
        setRoomNotFound(true)
        return
      }

      setConnectedSlots(data.connected_slots ?? [])
      setPlayerNames(data.player_names ?? {})
      if (data.game_state) {
        setGs(data.game_state)
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
            setGs(row.game_state as GameState)
          } else {
            setGs(null)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [roomId])

  // ─ 権限チェック ──────────────────────────────────────────
  const isHost = mySlot === 'player_1'

  async function handleStart() {
    if (!isHost) return
    const playerNamesList = (['player_1', 'player_2', 'player_3', 'player_4'] as const)
      .filter(slot => connectedSlots.includes(slot))
      .map(slot => playerNames[slot] || `Player ${slot}`)
    const newState = createInitialState(playerNamesList)
    await pushState(roomId, newState)
  }

  async function handlePlayHandCard(col: number, row: number) {
    if (!gs || selectedHandCardIndex === null || !selectedPlayerSlot) return

    // ターンフェーズ且つ現在のプレイヤーのみ配置可能
    if (gs.phase !== 'playerTurn') return

    const playerIndex = gs.players.findIndex((p) => p.id === selectedPlayerSlot)
    if (playerIndex < 0) return

    // デバッグモード以外は、自分のプレイヤーのみ操作可能
    if (!debugMode && selectedPlayerSlot !== mySlot) return

    // 現在のプレイヤーでない場合は操作不可
    if (playerIndex !== gs.currentPlayerIndex) return

    // 選択カードを確認
    const cardId = gs.players[playerIndex].hand[selectedHandCardIndex]
    const terrain = TERRAIN_CARDS.find((c) => c.id === cardId)
    const facility = FACILITY_CARDS.find((c) => c.id === cardId)
    const card = terrain || facility

    // 地形・施設カードの場合、配置可能な場所かチェック
    if (card && (card.type === 'terrain' || card.type === 'facility') && !canPlaceTerrainCardAt(gs, col, row, card)) {
      return
    }

    const newState = playCard(gs, playerIndex, selectedHandCardIndex, col, row)
    setSelectedHandCardIndex(null)
    setSelectedPlayerSlot(null)
    await pushState(roomId, newState)
  }

  async function handlePlayEventCard(targetCardId: string) {
    if (!gs || selectedHandCardIndex === null || !mySlot) return
    const playerIndex = gs.players.findIndex((p) => p.id === mySlot)
    if (playerIndex < 0) return

    const newState = playCard(gs, playerIndex, selectedHandCardIndex, undefined, undefined, targetCardId)
    setSelectedHandCardIndex(null)
    setSelectingEventTarget(false)
    await pushState(roomId, newState)
  }

  async function handleEndTurn() {
    if (!gs) return
    const newState = endPlayerTurn(gs)
    setSelectedHandCardIndex(null)
    setSelectingEventTarget(false)
    await pushState(roomId, newState)
  }

  async function handlePassTurn() {
    if (!gs) return
    const newState = endPlayerTurn(gs)
    setSelectedHandCardIndex(null)
    setSelectingEventTarget(false)
    await pushState(roomId, newState)
  }

  async function handleStartRoundOrTurn() {
    // ラウンド開始ボタン押下時は何もしない
    // useEffect で自動的に遷移する
  }

  async function handleStartNextRound() {
    if (!gs) return
    const newState = startNextRound(gs)
    setSelectedHandCardIndex(null)
    setSelectingEventTarget(false)
    await pushState(roomId, newState)
  }

  async function handleSettlement() {
    if (!gs) return
    const newState = executeSettlement(gs)
    await pushState(roomId, newState)
  }

  async function handleAppearVisitors() {
    if (!gs) return
    const newState = appearVisitors(gs)
    await pushState(roomId, newState)
  }

  async function handleTriggerSacrificeEvent() {
    if (!gs) return
    const newState = triggerSacrificeEvent(gs)
    await pushState(roomId, newState)
  }

  async function handleSacrificeVisitor(visitorIndex: number) {
    if (!gs) return
    const newState = sacrificeVisitor(gs, visitorIndex)
    setSelectingSacrificeTarget(false)
    await pushState(roomId, newState)
  }

  // ─ ルームコードのコピー ───────────────────────────────────
  async function copyRoomId() {
    await navigator.clipboard.writeText(roomId)
  }

  // ─ ラウンド開始フロー：生贄イベント完了後に自動進行 ───────────
  useEffect(() => {
    if (!gs || gs.phase !== 'roundStart') return

    const shouldTrigger = shouldTriggerSacrificeEvent(gs)
    const hasTriggered = gs.sacrificeEventTriggered === gs.round

    // 生贄イベントが発動しない、または既に処理済み
    if (!shouldTrigger || hasTriggered) {
      // 訪問者が登場済みで、自動的にプレイヤーターンに遷移
      if (gs.visitorAppeared === gs.round && isHost) {
        const newState = startPlayerTurn(gs)
        pushState(roomId, newState)
      }
    }
  }, [gs, isHost, roomId])

  // ─ ロード中・エラー ───────────────────────────────────────
  if (roomNotFound) {
    return (
      <div className="min-h-screen bg-stone-950 text-stone-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-400 text-xl mb-4">部屋が見つかりません</div>
          <a href="/" className="text-amber-400 underline">
            ロビーに戻る
          </a>
        </div>
      </div>
    )
  }

  // ─ ロビー画面（ゲーム未開始） ─────────────────────────────
  if (!gs) {
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
              {(['player_1', 'player_2', 'player_3', 'player_4'] as const).map((slot) => {
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
  const debugMode = process.env.NEXT_PUBLIC_DEBUG_MODE === 'true'
  const myPlayer = gs.players.find((p) => p.id === mySlot)
  const currentPlayer = gs.players[gs.currentPlayerIndex]
  const isMyTurn = (myPlayer && myPlayer.id === currentPlayer.id && gs.phase === 'playerTurn') || debugMode

  // ゲーム終了画面
  if (gs.phase === 'gameEnd') {
    return (
      <div className="min-h-screen bg-stone-950 text-stone-100 flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-amber-400 mb-4 tracking-widest">ゲーム終了</h1>
          <p className="text-lg text-stone-300 mb-8">7ラウンド完了</p>
          <a href="/" className="text-amber-400 underline hover:text-amber-300">
            ロビーに戻る
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen bg-stone-950 text-stone-100 flex flex-col p-4">
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-3 flex-shrink-0">
        <div>
          <h1 className="text-xl font-bold text-amber-400 tracking-widest">因習村をつくろう</h1>
          {myPlayer && <p className="text-xs text-stone-400">{myPlayer.name}</p>}
        </div>
        <div className="flex items-center gap-4">
          <RulesModal />
          <div className="text-right">
            <div className="text-xs text-stone-500">部屋コード</div>
            <div className="font-mono text-amber-300 font-bold">{roomId}</div>
          </div>
        </div>
      </div>

      {/* ラウンド・フェーズ・ターン情報 */}
      <div className="bg-stone-800 rounded-xl p-3 border border-stone-700 shadow mb-3 flex-shrink-0">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <div className="text-xs text-stone-400">ラウンド</div>
            <div className="text-2xl font-bold text-amber-300">{gs.round}</div>
          </div>
          <div>
            <div className="text-xs text-stone-400">フェーズ</div>
            <div className="text-sm font-bold text-sky-300">
              {gs.phase === 'roundStart' && 'ラウンド開始'}
              {gs.phase === 'playerTurn' && 'プレイヤーターン'}
              {gs.phase === 'roundEnd' && 'ラウンド終了'}
            </div>
          </div>
          <div>
            <div className="text-xs text-stone-400">現在のプレイヤー</div>
            <div className="text-sm font-bold text-amber-300">{currentPlayer.name}</div>
          </div>
          <div>
            <div className="text-xs text-stone-400">進行状況</div>
            <div className="text-sm">
              {gs.currentPlayerIndex + 1}/{gs.players.length}
            </div>
          </div>
        </div>

        {/* ラウンド開始 & 訪問者登場 */}
        {gs.phase === 'roundStart' && (
          <div className="mt-4 space-y-2">
            {gs.visitorAppeared !== gs.round && isHost && (
              <button
                onClick={handleAppearVisitors}
                className="w-full py-2 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-lg transition"
              >
                訪問者を確認する
              </button>
            )}
            {gs.visitorAppeared === gs.round && isHost && (
              <button
                onClick={handleStartRoundOrTurn}
                className="w-full py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg transition"
              >
                ラウンド開始
              </button>
            )}
            {!isHost && (
              <div className="text-center text-stone-400 text-sm py-2">
                ホストが訪問者処理を行っています...
              </div>
            )}
          </div>
        )}

        {/* ターン操作ボタン */}
        {gs.phase === 'playerTurn' && (
          <div className="mt-4 space-y-2">
            {isMyTurn && (
              <>
                <button
                  onClick={handleEndTurn}
                  className="w-full py-2 bg-green-600 hover:bg-green-500 text-white font-bold rounded-lg transition"
                >
                  ターン終了
                </button>
                <button
                  onClick={handlePassTurn}
                  className="w-full py-2 bg-stone-600 hover:bg-stone-500 text-stone-100 font-bold rounded-lg transition"
                >
                  パス（手札を使用しない）
                </button>
              </>
            )}
            {!isMyTurn && (
              <div className="text-center text-stone-400 text-sm py-2">
                {currentPlayer.name} のターン待機中...
              </div>
            )}
          </div>
        )}

        {/* ラウンド終了・精算パネル */}
        {gs.phase === 'roundEnd' && (
          <div className="mt-4">
            {gs.settledRound !== gs.round ? (
              <button
                onClick={handleSettlement}
                className="w-full py-2 bg-yellow-600 hover:bg-yellow-500 text-white font-bold rounded-lg transition"
              >
                ラウンド精算
              </button>
            ) : (
              <button
                onClick={handleStartNextRound}
                disabled={!isHost}
                className="w-full py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold rounded-lg transition"
              >
                次のラウンドへ {!isHost && '(ホストが実行)'}
              </button>
            )}
          </div>
        )}
      </div>

      {/* メインエリア：村マップ + ステータス */}
      <div className="flex gap-3 mb-3 h-auto">
        {/* 左：村マップグリッド */}
        <div className="flex flex-col">
          {/* 村マップグリッド */}
          <div className="bg-stone-800 rounded-lg p-3 border border-stone-700 shadow">
            <h2 className="text-sm font-bold text-amber-400 mb-2">村マップ</h2>

            {/* グリッド */}
            <div className="border-2 border-stone-600 rounded-lg p-2 bg-stone-900 inline-block">

              {gs.villageMap.grid.map((row, rowIdx) => (
                <div key={rowIdx} className="flex gap-1 mb-1 last:mb-0">
                  {row.map((cell, colIdx) => {
                    const isFaith = colIdx === gs.villageMap.faithPosition.col && rowIdx === gs.villageMap.faithPosition.row
                    const isConnected = cell?.type === 'terrain' ? cell.connectedToEntrance : false
                    const isCellDisabled = cell?.type === 'terrain' || cell?.type === 'facility' ? cell.disabled : false

                    // 配置可能かチェック
                    let canClick = !isFaith && cell === null && selectedHandCardIndex !== null && gs.phase === 'playerTurn' && selectedPlayerSlot && selectedPlayerSlot === gs.players[gs.currentPlayerIndex]?.id
                    if (canClick && selectedHandCardIndex !== null && selectedPlayerSlot) {
                      const selectedPlayerIdx = gs.players.findIndex((p) => p.id === selectedPlayerSlot)
                      const cardId = selectedPlayerIdx >= 0 ? gs.players[selectedPlayerIdx]?.hand[selectedHandCardIndex] : null
                      const card = cardId ? TERRAIN_CARDS.find((c) => c.id === cardId) || FACILITY_CARDS.find((c) => c.id === cardId) : null
                      // 地形・施設カードは接続可能な場所にしか置けない
                      if (card && (card.type === 'terrain' || card.type === 'facility')) {
                        canClick = canPlaceTerrainCardAt(gs, colIdx, rowIdx, card)
                      }
                    }

                    return (
                      <button
                        key={`${colIdx}-${rowIdx}`}
                        onClick={() => {
                          if (!isFaith && selectedHandCardIndex !== null) {
                            handlePlayHandCard(colIdx, rowIdx)
                          }
                        }}
                        disabled={!canClick}
                        className={`w-16 h-16 rounded border-2 text-center text-xs font-bold transition flex flex-col items-center justify-center ${
                          isFaith
                            ? 'border-purple-600 bg-purple-950 text-purple-300 cursor-default'
                            : isCellDisabled
                            ? 'border-gray-600 bg-gray-800 text-gray-500 cursor-default'
                            : cell?.type === 'terrain'
                            ? isConnected
                              ? 'border-green-500 bg-green-900 text-green-200 cursor-default'
                              : 'border-green-700 bg-green-950 text-green-400 cursor-default'
                            : cell?.type === 'facility'
                            ? (cell as any).connectedToEntrance
                              ? 'border-orange-500 bg-orange-900 text-orange-200 cursor-default'
                              : 'border-orange-700 bg-orange-950 text-orange-400 cursor-default'
                            : selectedHandCardIndex !== null
                            ? 'border-yellow-500 bg-stone-700 text-yellow-300 cursor-pointer hover:bg-stone-600'
                            : 'border-stone-600 bg-stone-700 text-stone-500 cursor-pointer hover:bg-stone-600'
                        }`}
                        title={
                          cell?.type === 'terrain'
                            ? isConnected
                              ? '接続済み'
                              : '未接続'
                            : cell?.type === 'facility'
                            ? cell.connectedToEntrance
                              ? '施設有効'
                              : '施設無効'
                            : ''
                        }
                      >
                        {isFaith ? (
                          <>
                            <div className="text-xs">⛩️</div>
                            <div className="text-xs font-semibold">{gs.villageMap.faithCard.name}</div>
                          </>
                        ) : cell?.type === 'terrain' ? (
                          <>
                            <div className="text-xs">🌲</div>
                            <div className="text-xs font-semibold">{cell.card.name}</div>
                            <div className="text-xs">{getConnectionSymbol(cell.card.connections)}</div>
                            <div className="text-xs mt-0.5">{isCellDisabled ? '封鎖' : isConnected ? '接続' : '未接続'}</div>
                          </>
                        ) : cell?.type === 'facility' ? (
                          <>
                            <div className="text-xs">🏘️</div>
                            <div className="text-xs font-semibold">{cell.card.name}</div>
                            <div className="text-xs mt-0.5">{isCellDisabled ? '封鎖' : (cell as any).connectedToEntrance ? '有効' : '未接続'}</div>
                          </>
                        ) : null}
                      </button>
                      )
                    })}
                  </div>
                ))}

              {/* グリッドの下に村入口位置インジケーター */}
              <div className="flex gap-1 mt-1 justify-start">
                {[0, 1, 2, 3, 4].map((col) => (
                  <div key={col} className={`w-16 h-6 flex items-center justify-center text-sm font-bold ${
                    col === 2 ? 'text-amber-400' : 'text-stone-600'
                  }`}>
                    {col === 2 ? '↓ 入口' : ''}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 右：ステータス・イベント・精算 */}
        <div className="w-56 flex flex-col gap-3 overflow-y-auto pr-2">
          {/* 共通ステータス */}
          <div className="bg-stone-800 rounded-lg p-3 border border-stone-700 shadow">
            <h2 className="text-xs font-bold text-amber-400 mb-2">村の状態</h2>
            <div className="space-y-1.5">
              <div className="flex justify-between items-center p-2 bg-stone-700 rounded text-xs">
                <span className="text-stone-400">ラウンド</span>
                <span className="font-bold text-amber-300">{gs.round}</span>
              </div>
              <div className="flex justify-between items-center p-2 bg-stone-700 rounded text-xs">
                <span className="text-stone-400">因習度</span>
                <span className="font-bold text-purple-400">{gs.tradition}</span>
              </div>
              <div className="flex justify-between items-center p-2 bg-stone-700 rounded text-xs">
                <span className="text-stone-400">開放度</span>
                <span className="font-bold text-sky-400">{gs.openness}</span>
              </div>
              <div className="flex justify-between items-center p-2 bg-stone-700 rounded text-xs">
                <span className="text-stone-400">祟り</span>
                <span className="font-bold text-red-400">{gs.curse}</span>
              </div>
              <div className="flex justify-between items-center p-2 bg-stone-700 rounded text-xs">
                <span className="text-stone-400">山札</span>
                <span className="font-bold">{gs.eventDeck.length}/{gs.terrainDeck.length}/{gs.facilityDeck.length}</span>
              </div>
            </div>
          </div>

          {/* ラウンド開始・訪問者登場パネル */}
          {gs.phase === 'roundStart' && (
            <div className="bg-stone-800 rounded-lg p-3 border border-stone-700 shadow">
              <h2 className="text-xs font-bold text-sky-400 mb-2">訪問者</h2>

              {(() => {
                const capacity = getVisitorCapacity(gs.openness)
                const countToAppear = getVisitorCountToAppear(gs.openness)
                const currentCount = gs.visitorRow.length
                const isAppeared = gs.visitorAppeared === gs.round

                return (
                  <div className="space-y-1.5 text-xs">
                    <div className="grid grid-cols-2 gap-1">
                      <div className="bg-stone-700 rounded p-1.5">
                        <div className="text-stone-400 text-xs">開放度</div>
                        <div className="font-bold text-sky-300">{gs.openness}</div>
                      </div>
                      <div className="bg-stone-700 rounded p-1.5">
                        <div className="text-stone-400 text-xs">上限</div>
                        <div className="font-bold text-stone-300">{capacity}</div>
                      </div>
                    </div>

                    {isAppeared && countToAppear > 0 && currentCount < capacity && (
                      <div className="text-xs text-sky-300 bg-sky-950 border border-sky-600 rounded p-1.5">
                        訪問者が登場！
                      </div>
                    )}
                  </div>
                )
              })()}
            </div>
          )}

          {/* 生贄イベントパネル */}
          {gs.phase === 'roundStart' && gs.visitorAppeared === gs.round && (
            <div className="bg-stone-800 rounded-lg p-3 border border-stone-700 shadow">
              <h2 className="text-xs font-bold text-red-400 mb-2">祟り</h2>

              {(() => {
                const shouldTrigger = shouldTriggerSacrificeEvent(gs)
                const hasTriggered = gs.sacrificeEventTriggered === gs.round

                return (
                  <div className="space-y-1.5">
                    <div className={`flex justify-between items-center p-2 rounded text-xs ${
                      gs.curse >= 6 ? 'bg-red-950 border border-red-600' : 'bg-stone-700'
                    }`}>
                      <span className="text-stone-400">祟り</span>
                      <span className={`font-bold ${gs.curse >= 6 ? 'text-red-300' : 'text-red-400'}`}>
                        {gs.curse}
                      </span>
                    </div>

                    {shouldTrigger && !hasTriggered && (
                      <button
                        onClick={handleTriggerSacrificeEvent}
                        disabled={!isHost}
                        className="w-full py-1.5 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-xs font-bold rounded transition"
                      >
                        イベント発生
                      </button>
                    )}
                  </div>
                )
              })()}
            </div>
          )}

          {/* ラウンド終了精算パネル */}
          {gs.phase === 'roundEnd' && (
            <div className="bg-stone-800 rounded-lg p-3 border border-stone-700 shadow">
              <h2 className="text-xs font-bold text-yellow-400 mb-2">精算</h2>

              {(() => {
                const output = calculateRoundOutput(gs)
                const details = getSettlementDetails(gs)
                const isSettled = gs.settledRound === gs.round

                return (
                  <div className="space-y-1.5 text-xs">
                    {!isSettled && (
                      <div className="grid grid-cols-3 gap-1">
                        <div className={`bg-stone-700 rounded p-1.5 ${output.inshu !== 0 ? 'border border-purple-500' : ''}`}>
                          <div className="text-stone-400">因習度</div>
                          <div className={`font-bold ${output.inshu > 0 ? 'text-green-400' : output.inshu < 0 ? 'text-red-400' : 'text-stone-400'}`}>
                            {output.inshu > 0 ? '+' : ''}{output.inshu}
                          </div>
                        </div>
                        <div className={`bg-stone-700 rounded p-1.5 ${output.openness !== 0 ? 'border border-sky-500' : ''}`}>
                          <div className="text-stone-400">開放度</div>
                          <div className={`font-bold ${output.openness > 0 ? 'text-green-400' : output.openness < 0 ? 'text-red-400' : 'text-stone-400'}`}>
                            {output.openness > 0 ? '+' : ''}{output.openness}
                          </div>
                        </div>
                        <div className={`bg-stone-700 rounded p-1.5 ${output.curse !== 0 ? 'border border-red-500' : ''}`}>
                          <div className="text-stone-400">祟り</div>
                          <div className={`font-bold ${output.curse > 0 ? 'text-green-400' : output.curse < 0 ? 'text-red-400' : 'text-stone-400'}`}>
                            {output.curse > 0 ? '+' : ''}{output.curse}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })()}
            </div>
          )}

        </div>
      </div>

      {/* 下部エリア：手札・来訪者・プレイヤー */}
      <div className="flex-shrink-0 flex gap-3 overflow-x-auto pb-2">
        {/* 手札（デバッグモード時は全プレイヤー表示） */}
        {(myPlayer || debugMode) && (
          <div className="flex-1 min-w-max bg-stone-800 rounded-lg p-3 border border-stone-700 shadow">
            <h2 className="text-xs font-bold text-amber-400 mb-2">
              {debugMode ? `手札【デバッグ】` : '手札'}
            </h2>

            {debugMode ? (
              // デバッグモード：全プレイヤーの手札を表示
              <div className="space-y-1.5">
                {gs.players.map((player, playerIdx) => (
                  <div key={player.id} className={`text-xs p-1.5 rounded border ${
                    playerIdx === gs.currentPlayerIndex
                      ? 'bg-yellow-950 border-yellow-600'
                      : 'bg-stone-700 border-stone-600'
                  }`}>
                    <div className="font-bold text-amber-300 mb-1">
                      {player.name} {playerIdx === gs.currentPlayerIndex && '【現在】'}
                    </div>
                    <div className="space-y-0.5">
                      {player.hand.map((cardId, idx) => {
                        const terrain = TERRAIN_CARDS.find((c) => c.id === cardId)
                        const facility = FACILITY_CARDS.find((c) => c.id === cardId)
                        const event = EVENT_CARDS.find((c) => c.id === cardId)
                        const card = terrain || facility || event
                        if (!card) return null

                        let icon = '?'
                        let color = 'bg-stone-900'
                        if (card.type === 'terrain') { icon = '🌲'; color = 'bg-green-950' }
                        if (card.type === 'facility') { icon = '🏘️'; color = 'bg-orange-950' }
                        if (card.type === 'event') { icon = '⚡'; color = 'bg-red-950' }

                        const arrows = card.type === 'terrain' ? getConnectionSymbol(card.connections) : ''
                        const canSelectCard = gs.phase === 'playerTurn' && playerIdx === gs.currentPlayerIndex && !gs.placedThisRound[playerIdx]
                        return (
                          <button
                            key={`${player.id}-${idx}`}
                            onClick={() => {
                              if (canSelectCard) {
                                setSelectedHandCardIndex(idx)
                                setSelectedPlayerSlot(player.id)
                              }
                            }}
                            disabled={!canSelectCard}
                            className={`w-full text-left px-1 py-0.5 rounded text-xs transition ${
                              selectedHandCardIndex === idx && selectedPlayerSlot === player.id
                                ? 'bg-yellow-900 border border-yellow-600 text-yellow-300 font-bold'
                                : `${color} border border-stone-600 text-stone-300 hover:brightness-110 disabled:opacity-50`
                            }`}
                          >
                            {icon} {card.name} {arrows && <span className="text-xs ml-0.5">{arrows}</span>}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              // 通常モード：自分の手札のみ表示
              <>
                {selectedHandCardIndex !== null && myPlayer && (
                  <div className="mb-2 p-2 bg-yellow-950 border border-yellow-600 rounded text-xs">
                    <div className="font-bold text-yellow-300">
                      {(() => {
                        const cardId = myPlayer.hand[selectedHandCardIndex]
                        const card = TERRAIN_CARDS.find((c) => c.id === cardId) ||
                                     FACILITY_CARDS.find((c) => c.id === cardId) ||
                                     EVENT_CARDS.find((c) => c.id === cardId)
                        const arrows = card?.type === 'terrain' ? getConnectionSymbol(card.connections) : ''
                        return (
                          <>
                            {card?.name || '？'} {arrows && <span className="ml-0.5">{arrows}</span>}
                          </>
                        )
                      })()}
                    </div>
                    <button
                      onClick={() => {
                        setSelectedHandCardIndex(null)
                        setSelectingEventTarget(false)
                      }}
                      className="mt-1 w-full px-1.5 py-0.5 bg-stone-700 hover:bg-stone-600 text-stone-300 text-xs rounded transition"
                    >
                      解除
                    </button>
                  </div>
                )}

                <div className="space-y-1 flex flex-col max-h-24 overflow-y-auto mb-2">
                  {myPlayer && myPlayer.hand.length === 0 && (
                    <div className="text-stone-500 text-xs text-center py-2">なし</div>
                  )}

                  {myPlayer && myPlayer.hand.map((cardId, idx) => {
                    const terrain = TERRAIN_CARDS.find((c) => c.id === cardId)
                    const facility = FACILITY_CARDS.find((c) => c.id === cardId)
                    const event = EVENT_CARDS.find((c) => c.id === cardId)
                    const card = terrain || facility || event
                    if (!card) return null

                    let icon = '?'
                    let color = 'bg-stone-900'
                    if (card.type === 'terrain') { icon = '🌲'; color = 'bg-green-950' }
                    if (card.type === 'facility') { icon = '🏘️'; color = 'bg-orange-950' }
                    if (card.type === 'event') { icon = '⚡'; color = 'bg-red-950' }

                    const arrows = card.type === 'terrain' ? getConnectionSymbol(card.connections) : ''
                    const canSelectCard = gs.phase === 'playerTurn' && isMyTurn && !gs.placedThisRound[gs.currentPlayerIndex]

                    return (
                      <button
                        key={idx}
                        onClick={() => {
                          if (canSelectCard) {
                            setSelectedHandCardIndex(idx)
                            setSelectedPlayerSlot(mySlot)
                          }
                        }}
                        disabled={!canSelectCard}
                        className={`text-left px-1.5 py-1 rounded text-xs transition ${
                          selectedHandCardIndex === idx
                            ? 'bg-yellow-900 border border-yellow-600 text-yellow-300 font-bold'
                            : `${color} border border-stone-600 text-stone-300 hover:brightness-110 disabled:opacity-50`
                        }`}
                      >
                        {icon} {card.name} {arrows && <span className="text-xs ml-0.5">{arrows}</span>}
                      </button>
                    )
                  })}
                </div>
              </>
            )}

            {/* 配置完了時のターン終了ボタン */}
            {gs.placedThisRound[gs.currentPlayerIndex] && gs.phase === 'playerTurn' && (debugMode || isMyTurn) && (
              <button
                onClick={handleEndTurn}
                className="w-full py-1.5 bg-green-600 hover:bg-green-500 text-white text-xs font-bold rounded transition"
              >
                ✓ ターン終了
              </button>
            )}
          </div>
        )}

        {/* 来訪者欄 */}
        {gs.visitorRow.length > 0 && (
          <div className="w-48 bg-stone-800 rounded-lg p-3 border border-stone-700 shadow">
            <h2 className="text-xs font-bold text-sky-400 mb-2">来訪者({gs.visitorRow.length})</h2>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {gs.visitorRow.map((visitor) => (
                <div
                  key={visitor.id}
                  className={`text-xs rounded px-1.5 py-0.5 ${
                    (visitor as any).isSacrifice
                      ? 'text-red-300 bg-red-950'
                      : 'text-sky-300 bg-sky-950'
                  }`}
                >
                  {visitor.name}
                  {(visitor as any).isSacrifice && ' 🔴'}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* プレイヤー一覧 */}
        <div className="flex-1 min-w-max bg-stone-800 rounded-lg p-3 border border-stone-700 shadow">
          <h2 className="text-xs font-bold text-amber-400 mb-2">プレイヤー</h2>
          <div className="space-y-1.5 flex flex-col max-h-32 overflow-y-auto">
            {gs.players.map((player) => {
              const isMe = player.id === mySlot
              return (
                <div
                  key={player.id}
                  className={`rounded text-xs p-1.5 border ${
                    isMe ? 'bg-amber-950 border-amber-600 text-amber-200' : 'bg-stone-700 border-stone-600 text-stone-300'
                  }`}
                >
                  <div className="font-bold">{player.name}</div>
                  <div className="text-xs text-stone-400">{player.character.name}</div>
                  <div className="text-xs text-stone-400">{player.objective.name}</div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
