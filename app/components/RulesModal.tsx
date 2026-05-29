'use client'

import { useState } from 'react'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <h3 className="text-amber-400 font-bold text-base border-b border-stone-600 pb-1 mb-2">{title}</h3>
      {children}
    </div>
  )
}

function Row({ label, desc }: { label: string; desc: string }) {
  return (
    <div className="flex gap-2 text-sm mb-1">
      <span className="font-bold text-stone-200 shrink-0 min-w-[7rem]">{label}</span>
      <span className="text-stone-400">{desc}</span>
    </div>
  )
}

function Tag({ color, children }: { color: string; children: React.ReactNode }) {
  return <span className={`px-1.5 py-0.5 rounded text-xs font-bold mr-1 ${color}`}>{children}</span>
}

export default function RulesModal() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="px-3 py-1.5 bg-stone-700 hover:bg-stone-600 text-stone-300 text-sm rounded-lg border border-stone-600 transition"
      >
        ルール確認
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 p-4 overflow-y-auto">
          <div className="bg-stone-900 border border-stone-600 rounded-2xl w-full max-w-2xl my-4 shadow-2xl">
            {/* ヘッダー */}
            <div className="flex items-center justify-between p-4 border-b border-stone-700">
              <h2 className="text-xl font-bold text-amber-400 tracking-widest">ゲームルール</h2>
              <button
                onClick={() => setOpen(false)}
                className="text-stone-400 hover:text-white text-2xl leading-none px-2"
              >
                ×
              </button>
            </div>

            <div className="p-5 text-stone-300 text-sm leading-relaxed overflow-y-auto max-h-[80vh]">

              {/* 概要 */}
              <Section title="ゲーム概要">
                <p className="text-stone-400 mb-2">
                  3〜4人用の半協力・半競争ボードゲームです。
                  プレイヤーはそれぞれ秘密の目的カードを持ち、村の3つのステータスをコントロールしながら自分の勝利条件を満たすエンディングへ導きます。
                </p>
              </Section>

              {/* ラウンドの流れ */}
              <Section title="1ラウンドの流れ">
                <ol className="list-decimal list-inside space-y-1 text-stone-400">
                  <li><span className="text-red-400 font-bold">祟り進行</span> ─ 祟り+1（信仰対象によって追加効果）</li>
                  <li><span className="text-orange-400 font-bold">イベント</span> ─ イベントカードを1枚めくり効果を適用（補正系はラウンド中持続）</li>
                  <li><span className="text-blue-400 font-bold">行動</span> ─ 各プレイヤーが手札から1枚使用（補充あり）</li>
                  <li><span className="text-green-400 font-bold">ラウンド終了</span> ─ 来訪者による開放度上昇→終了条件チェック→祟り6以上なら祟りカード発動（生贄と重複しない）</li>
                </ol>
              </Section>

              {/* ステータス */}
              <Section title="ステータス">
                <Row label="📜 因習度（0〜20）" desc="村の因習の深さ。20になると因習村完成エンド" />
                <Row label="🌐 開放度（0〜10）" desc="村の外部への開放度。0で過疎村エンド、10で観光地化エンド" />
                <Row label="🔴 祟り（0〜10）" desc="神の怒り。10で祟りエンド。6を超えた瞬間に祟りカードが即時発動" />
                <div className="mt-2 text-xs text-yellow-400 bg-yellow-900/30 border border-yellow-700 rounded px-3 py-2">
                  ⚠ ステータスが限界値に達すると警告マークが表示されます。ラウンド終了時にゲームオーバーとなります。
                </div>
              </Section>

              {/* エンディング */}
              <Section title="エンディング（ゲーム終了条件）">
                <Row label="因習村完成エンド" desc="因習度が20に到達" />
                <Row label="祟りエンド" desc="祟りが10に到達" />
                <Row label="観光地化エンド" desc="開放度が10に到達" />
                <Row label="過疎村エンド" desc="開放度が0に到達" />
                <Row label="停滞エンド" desc="イベントカード山札が尽きた" />
                <p className="text-xs text-stone-500 mt-1">各プレイヤーの目的カードによって、どのエンディングで勝利するかが異なります。</p>
              </Section>

              {/* 行動カード */}
              <Section title="行動カード">
                <p className="text-stone-500 text-xs mb-2">7種×2枚。ゲーム開始時に3枚配られ、使用後に1枚補充。</p>
                <div className="space-y-1">
                  <div className="flex items-start gap-2">
                    <Tag color="bg-purple-900 text-purple-300">因習</Tag>
                    <div>
                      <div className="font-bold text-stone-200">古い掟の復活</div>
                      <div className="text-stone-500 text-xs">因習度+1、開放度-1</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Tag color="bg-purple-900 text-purple-300">因習</Tag>
                    <div>
                      <div className="font-bold text-stone-200">夜祭の準備</div>
                      <div className="text-stone-500 text-xs">因習度+1（来訪者がいれば+2）、開放度-1</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Tag color="bg-sky-900 text-sky-300">開放</Tag>
                    <div>
                      <div className="font-bold text-stone-200">観光パンフレット</div>
                      <div className="text-stone-500 text-xs">開放度+1、因習度-1</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Tag color="bg-sky-900 text-sky-300">開放</Tag>
                    <div>
                      <div className="font-bold text-stone-200">心霊スポットとして売り出す</div>
                      <div className="text-stone-500 text-xs">開放度+1、祟り+1</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Tag color="bg-yellow-900 text-yellow-300">信仰</Tag>
                    <div>
                      <div className="font-bold text-stone-200">祠の修繕</div>
                      <div className="text-stone-500 text-xs">祟り-2、開放度-1</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Tag color="bg-yellow-900 text-yellow-300">信仰</Tag>
                    <div>
                      <div className="font-bold text-stone-200">禁忌の術式</div>
                      <div className="text-stone-500 text-xs">祟り+2、因習度+1、開放度-1</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Tag color="bg-red-900 text-red-300">生贄</Tag>
                    <div>
                      <div className="font-bold text-stone-200">贄の選定</div>
                      <div className="text-stone-500 text-xs">祟り+1。ラウンド終了時、祟り4以上なら生贄投票が発生</div>
                    </div>
                  </div>
                </div>
              </Section>

              {/* 訪問者カード */}
              <Section title="訪問者カード">
                <p className="text-stone-500 text-xs mb-2">
                  ラウンド開始時、開放度3〜5なら1人、6以上なら2人が来訪。<br />
                  ラウンド終了時、来訪者欄の人数ぶん開放度が上昇する。生贄の対象にもなる。
                </p>
                <Row label="民俗学者" desc="【パッシブ】因習カードの因習度と祟りに+1" />
                <Row label="配信者" desc="【パッシブ】開放カードの開放度と祟りに+1" />
                <Row label="土木業者" desc="【パッシブ】信仰カードの祟りに+2" />
                <Row label="観光客" desc="【生贄時】因習度+1の追加効果" />
                <Row label="警察官" desc="【生贄時】開放度-2の追加効果（イベントで出現）" />
              </Section>

              {/* 生贄投票 */}
              <Section title="生贄投票">
                <p className="text-stone-400 mb-2">全生存プレイヤーで投票。自分自身には投票できない。最多票が生贄に。同票の場合は最終決定者が選択。</p>
                <p className="text-stone-400 mb-2">選ばれた対象の「生贄時効果」が適用される。祟りカード起因の生贄は代わりに祟り-1のみ。</p>
                <div className="text-xs text-stone-500 mb-1 font-bold">来訪者の生贄時効果</div>
                <Row label="観光客" desc="因習度+3、開放度-3、祟り-2" />
                <Row label="土木業者" desc="因習度+3、開放度-3、祟り-3" />
                <Row label="民俗学者" desc="因習度+4、開放度-3、祟り-2" />
                <Row label="配信者" desc="因習度+4、開放度-4、祟り-3" />
                <Row label="警察官" desc="因習度+4、開放度-4、祟り-2" />
                <div className="text-xs text-stone-500 mb-1 mt-2 font-bold">プレイヤー（キャラクター）の生贄時効果</div>
                <Row label="村長" desc="因習度+7、開放度-1、祟り-4" />
                <Row label="神主" desc="因習度+6、祟り-1" />
                <Row label="駐在" desc="因習度+5、開放度-2、祟り-3" />
                <Row label="村役場職員" desc="因習度+4、開放度-1、祟り-3" />
                <Row label="医者" desc="因習度+4、祟り-3" />
                <Row label="村人" desc="因習度+4、祟り-3" />
              </Section>

              {/* イベントカード */}
              <Section title="イベントカード">
                <p className="text-stone-500 text-xs mb-2">毎ラウンド1枚めくられる。補正系は行動フェイズ中持続。</p>
                <Row label="祭りの季節" desc="このラウンドの「因習」カード使用時、因習度+1補正" />
                <Row label="村おこしの機運" desc="このラウンドの「開放」カード使用時、開放度+1補正" />
                <Row label="不穏な噂" desc="このラウンドの「信仰」カード使用時、祟り+1補正" />
                <Row label="祠の破壊" desc="ラウンド開始時に祟り+2。来訪者に観光客か配信者がいれば祟り+3" />
                <Row label="警察の聞き込み" desc="即時に因習度-1、開放度-1。来訪者欄に警察官を置く" />
                <Row label="神隠しの夜" desc="このラウンド終了時に必ず生贄投票が発生する" />
              </Section>

              {/* 祟りカード */}
              <Section title="祟りカード">
                <p className="text-stone-500 text-xs mb-2">ラウンド終了時に祟りが6以上で発動。因習度上昇＋デバフ＋生贄投票（祟り-1）。1ラウンドに1回まで。生贄イベントと重複しない（祟りカードが優先）。</p>
                <Row label="山鳴り" desc="因習度+5、開放度-3" />
                <Row label="水底の呼び声" desc="因習度+6、開放度-2、以降の因習カード効果-1" />
                <Row label="雷鎚鳴る" desc="因習度+4、全プレイヤーの手持ちカードを捨て札" />
              </Section>

              {/* キャラクター */}
              <Section title="キャラクター（ゲーム開始時にランダム割り当て）">
                <Row label="神主" desc="信仰カード使用時、祟りをさらに-1" />
                <Row label="村役場職員" desc="開放カード使用時、開放度をさらに+1" />
                <Row label="村長" desc="生贄投票の自分の票が2票として数えられる" />
                <Row label="医者" desc="生存中、訪問者生贄による開放度減少が-1に固定" />
                <Row label="駐在" desc="生贄投票で、他の誰かの票を1票だけ無効にできる" />
                <Row label="村人" desc="特別な能力なし" />
              </Section>

              {/* 信仰対象 */}
              <Section title="信仰対象（ゲーム開始時にランダム決定）">
                <Row label="山神" desc="開放カードを使用するたびに祟り+1 / 訪問者生贄のたびに因習度+1" />
                <Row label="水神" desc="祟りが減少するたびに因習度+1 / 祟りが0になったら因習度消滅・ゲーム終了" />
                <Row label="雷神" desc="祟りカード発動時に因習度+1 / ラウンド4以降、毎ラウンド祟り+2" />
              </Section>

              {/* 目的カード */}
              <Section title="目的カード（秘密・ゲーム開始時に配布）">
                <p className="text-stone-500 text-xs mb-2">自分の目的カードは他プレイヤーに秘密。ゲーム終了時に条件を満たしていれば勝利。</p>
                <Row label="因習の完成" desc="因習村完成エンドかつ祟り5以下" />
                <Row label="祟りの顕現" desc="祟りエンドで終了" />
                <Row label="観光地化の皮" desc="観光地化エンド、または因習村完成エンドかつ開放度5以上" />
                <Row label="閉じた村" desc="過疎村・停滞・因習村完成エンドのいずれかで開放度2以下" />
                <Row label="生贄志願" desc="自分が生贄として死亡したら即勝利" />
                <Row label="贄帳の番人" desc="生存してゲーム終了、かつ合計4人以上が生贄になっていた" />
                <Row label="権力者の生存" desc="生存してゲーム終了、かつ祟り5以上" />
              </Section>

            </div>
          </div>
        </div>
      )}
    </>
  )
}
