'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import RulesModal from '@/app/components/RulesModal'
import { createInitialState } from '@/lib/gameLogic'

function generateRoomId(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

const DEBUG_PLAYER_NAMES: Record<string, string> = {
  player_1: 'デバッグP1',
  player_2: 'デバッグP2',
  player_3: 'デバッグP3',
  player_4: 'デバッグP4',
}
const DEBUG_SLOTS = ['player_1', 'player_2', 'player_3', 'player_4']

export default function LobbyPage() {
  const router = useRouter()
  const [playerName, setPlayerName] = useState('')
  const [roomCode, setRoomCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleCreate() {
    if (!playerName.trim()) { setError('名前を入力してください'); return }
    setLoading(true)
    setError(null)
    const roomId = generateRoomId()
    const { error: err } = await supabase.from('game_rooms').insert({
      id: roomId,
      game_state: null,
      player_names: { player_1: playerName.trim() },
      connected_slots: ['player_1'],
    })
    if (err) { setError(err.message); setLoading(false); return }
    sessionStorage.setItem(`mySlot_${roomId}`, 'player_1')
    router.push(`/room/${roomId}`)
  }

  async function handleJoin() {
    if (!playerName.trim()) { setError('名前を入力してください'); return }
    const code = roomCode.trim().toUpperCase()
    if (!code) { setError('部屋コードを入力してください'); return }
    setLoading(true)
    setError(null)

    const { data, error: err } = await supabase
      .from('game_rooms')
      .select('connected_slots, player_names, game_state')
      .eq('id', code)
      .single()

    if (err || !data) { setError('部屋が見つかりません'); setLoading(false); return }
    if (data.game_state) { setError('ゲームはすでに開始されています'); setLoading(false); return }

    const slots = ['player_1', 'player_2', 'player_3', 'player_4']
    const taken: string[] = data.connected_slots ?? []
    const available = slots.find(s => !taken.includes(s))
    if (!available) { setError('この部屋は満員です'); setLoading(false); return }

    const newSlots = [...taken, available]
    const newNames = { ...(data.player_names ?? {}), [available]: playerName.trim() }
    const { error: updateErr } = await supabase
      .from('game_rooms')
      .update({ connected_slots: newSlots, player_names: newNames })
      .eq('id', code)

    if (updateErr) { setError(updateErr.message); setLoading(false); return }
    sessionStorage.setItem(`mySlot_${code}`, available)
    router.push(`/room/${code}`)
  }

  async function handleDebugStart() {
    setLoading(true)
    setError(null)
    const roomId = generateRoomId()
    const playerNamesList = Object.values(DEBUG_PLAYER_NAMES)
    const gameState = createInitialState(playerNamesList)
    const { error: err } = await supabase.from('game_rooms').insert({
      id: roomId,
      game_state: gameState,
      player_names: DEBUG_PLAYER_NAMES,
      connected_slots: DEBUG_SLOTS,
    })
    if (err) { setError(err.message); setLoading(false); return }
    sessionStorage.setItem(`mySlot_${roomId}`, 'player_1')
    sessionStorage.setItem(`debugMode_${roomId}`, 'true')
    router.push(`/room/${roomId}`)
  }

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col items-center justify-center gap-8 p-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-amber-400 tracking-widest mb-2">因習村をつくろう</h1>
        <p className="text-stone-400 text-sm mb-3">3〜4人用オンライン対応ボードゲーム</p>
        <RulesModal />
      </div>

      <div className="w-full max-w-sm flex flex-col gap-4 bg-stone-900 rounded-xl p-6 border border-stone-700">
        <div>
          <label className="text-xs text-stone-400 mb-1 block">あなたの名前</label>
          <input
            type="text"
            value={playerName}
            onChange={e => setPlayerName(e.target.value)}
            placeholder="名前を入力"
            maxLength={20}
            className="w-full px-4 py-3 bg-stone-800 border border-stone-600 rounded-lg text-white placeholder-stone-500 focus:outline-none focus:border-amber-500"
          />
        </div>

        <button
          onClick={handleCreate}
          disabled={loading}
          className="py-3 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-bold rounded-lg transition"
        >
          {loading ? '処理中...' : '部屋を作る（ホスト）'}
        </button>

        <div className="border-t border-stone-700 pt-4 flex flex-col gap-3">
          <div>
            <label className="text-xs text-stone-400 mb-1 block">部屋コード</label>
            <input
              type="text"
              value={roomCode}
              onChange={e => setRoomCode(e.target.value.toUpperCase())}
              placeholder="ABCD12"
              maxLength={6}
              className="w-full px-4 py-3 bg-stone-800 border border-stone-600 rounded-lg text-white placeholder-stone-500 focus:outline-none focus:border-sky-500 font-mono tracking-widest text-center text-lg"
            />
          </div>
          <button
            onClick={handleJoin}
            disabled={loading}
            className="py-3 bg-sky-700 hover:bg-sky-600 disabled:opacity-50 text-white font-bold rounded-lg transition"
          >
            {loading ? '処理中...' : '部屋に参加する'}
          </button>
        </div>

        {error && (
          <div className="text-red-400 text-sm text-center bg-red-950/50 border border-red-800 rounded-lg px-3 py-2">
            {error}
          </div>
        )}
      </div>

      {/* デバッグ */}
      <div className="w-full max-w-sm border-t border-stone-800 pt-4">
        <button
          onClick={handleDebugStart}
          disabled={loading}
          className="w-full py-2 bg-yellow-700 hover:bg-yellow-600 disabled:opacity-50 text-white text-sm font-bold rounded-lg transition border border-yellow-600"
        >
          {loading ? '処理中...' : '⚡ デバッグ開始（4人・即時）'}
        </button>
        <p className="text-xs text-stone-600 text-center mt-1">
          4人分のダミープレイヤーでゲームを即座に開始します
        </p>
      </div>
    </div>
  )
}
