// The animated "one move, applied three times" demos on the home page.
//
// This drives a few hundred absolutely-positioned slats through timed CSS
// transitions, so it works directly on the DOM rather than through React
// state. `startMoveDemo` builds everything inside `host` and returns a cleanup
// function that stops all timers and observers.

import DATA from './data.json'

export type DemoMove = 'mash' | 'overhand' | 'pile' | 'ohr'

interface MoveData {
  states: number[][]
  cuts?: number[]
  packs?: number[][]
  cut?: number
  mid?: number[]
}

const C = DATA.moveDemo as unknown as { M: number } & Record<DemoMove, MoveData>
const N = C.M

// Each move gets its own hue so the four demos read as different moves.
const MOVE_HUE: Record<DemoMove, [number, number]> = { mash: [150, 38], overhand: [24, 42], pile: [218, 40], ohr: [175, 30] }

function cardColor(op: DemoMove, v: number) {
  const [hue, sat] = MOVE_HUE[op]
  const t = v / (N - 1)
  return `hsl(${(hue + (t - 0.5) * 30).toFixed(0)},${(sat + 8).toFixed(0)}%,${(26 + t * 58).toFixed(0)}%)`
}

const ranks = (state: number[]) => {
  const r = new Array<number>(N)
  state.forEach((card, i) => (r[card] = i))
  return r
}

type Pos = { x: number; y: number }
type PosFn = (v: number) => Pos
const place = (el: HTMLElement, p: Pos) => (el.style.transform = `translate(${p.x.toFixed(1)}px,${p.y.toFixed(1)}px)`)

export function startMoveDemo(host: HTMLElement, caption: HTMLElement, op: DemoMove): () => void {
  // Timer bookkeeping so everything can be cancelled on unmount.
  const timers = new Set<ReturnType<typeof setTimeout>>()
  const frames = new Set<number>()
  const later = (fn: () => void, ms: number) => {
    const t = setTimeout(() => {
      timers.delete(t)
      fn()
    }, ms)
    timers.add(t)
  }
  const nextFrame = (fn: () => void) => {
    const f = requestAnimationFrame(() => {
      frames.delete(f)
      fn()
    })
    frames.add(f)
  }

  const padX = 10
  const padTop = 9
  const padBot = 20
  const innerW = host.clientWidth - padX * 2
  const innerH = host.clientHeight - padTop - padBot
  const COLS = 4
  const colGap = 8
  const colW = (innerW - (COLS - 1) * colGap) / COLS
  const cardW = Math.min(colW, 20)
  const rowStep = innerH / N
  const cardH = Math.max(2, rowStep - 1)
  const data = C[op]
  const states = data.states
  const colX = (c: number) => padX + c * (colW + colGap) + (colW - cardW) / 2
  const yOf = (rank: number) => padTop + rank * rowStep
  const RANK = states.map(ranks)

  const cap = (t: string) => (caption.textContent = t)

  // Four columns of slats: sorted, ×1, ×2, ×3.
  const colCards: HTMLDivElement[][] = []
  for (let c = 0; c < COLS; c++) {
    const arr: HTMLDivElement[] = []
    for (let v = 0; v < N; v++) {
      const el = document.createElement('div')
      el.className = 'slat'
      el.style.width = `${cardW.toFixed(1)}px`
      el.style.height = `${cardH.toFixed(1)}px`
      el.style.background = cardColor(op, v)
      el.style.opacity = '0'
      host.appendChild(el)
      arr.push(el)
    }
    colCards.push(arr)
  }
  const labs: HTMLDivElement[] = []
  for (let c = 0; c < COLS; c++) {
    const t = document.createElement('div')
    t.className = 'collab'
    t.style.left = `${colX(c) + cardW / 2}px`
    t.textContent = c === 0 ? 'sorted' : `×${c}`
    host.appendChild(t)
    labs.push(t)
  }

  function instant(set: HTMLElement[], posFn: PosFn, visible: boolean) {
    set.forEach((el, v) => {
      el.style.transition = 'none'
      el.style.transitionDelay = '0ms'
      place(el, posFn(v))
      el.style.opacity = visible ? '1' : '0'
    })
    nextFrame(() => set.forEach((el) => (el.style.transition = '')))
  }

  function wave(set: HTMLElement[], posFn: PosFn, order: number[], per: number, done?: () => void) {
    order.forEach((v, i) => {
      set[v].style.transitionDelay = `${i * per}ms`
      set[v].style.opacity = '1'
      place(set[v], posFn(v))
    })
    if (done) later(done, order.length * per + 700)
  }

  /** One group at a time, in order. */
  function sequence(set: HTMLElement[], posFn: PosFn, order: number[], sizes: number[], dur: number, done?: () => void) {
    let ci = 0
    let oi = 0
    const go = () => {
      if (ci >= sizes.length) {
        done?.()
        return
      }
      const grp = order.slice(oi, oi + sizes[ci])
      oi += sizes[ci]
      ci++
      grp.forEach((v) => {
        set[v].style.transition = `transform ${dur}ms cubic-bezier(0.3,0.05,0.3,1)`
        set[v].style.transitionDelay = '0ms'
        set[v].style.opacity = '1'
        place(set[v], posFn(v))
      })
      later(go, dur + 25)
    }
    go()
  }

  const pos0: PosFn = (v) => ({ x: colX(0), y: yOf(RANK[0][v]) })
  const posCol =
    (c: number): PosFn =>
    (v) => ({ x: colX(c), y: yOf(RANK[c][v]) })

  const moveWorking = (posFn: PosFn, dur: number, cb: () => void) => {
    colCards[1].forEach((el, v) => {
      el.style.transition = `transform ${dur}ms cubic-bezier(0.4,0.05,0.25,1)`
      el.style.transitionDelay = '0ms'
      el.style.opacity = '1'
      place(el, posFn(v))
    })
    later(cb, dur + 60)
  }

  const interweave = (done: () => void) => {
    cap('they interweave, flowing downward')
    const order = states[1].slice()
    order.forEach((v, i) => {
      const el = colCards[1][v]
      el.style.transition = 'transform 520ms cubic-bezier(0.4,0.05,0.25,1)'
      el.style.transitionDelay = `${i * 11}ms`
      el.style.opacity = '1'
      place(el, { x: colX(1), y: yOf(RANK[1][v]) })
    })
    later(() => {
      colCards[1].forEach((el) => (el.style.transition = ''))
      done()
    }, order.length * 11 + 600)
  }

  // The first application of the move, shown step by step on the working column.
  let runFirst: (done: () => void) => void
  if (op === 'mash' || op === 'ohr') {
    const cutAt = op === 'mash' ? data.cuts![0] : data.cut!
    const half = (v: number) => (RANK[0][v] < cutAt ? 0 : 1) // 0 top, 1 bottom
    const contigTopY = (v: number) => padTop + (half(v) ? RANK[0][v] - cutAt : RANK[0][v]) * rowStep
    if (op === 'mash') {
      runFirst = (done) => {
        cap('cut in two — bottom half moves over')
        moveWorking((v) => ({ x: half(v) ? colX(2) : colX(0), y: contigTopY(v) }), 560, () => {
          cap('bring them together at column one')
          moveWorking((v) => ({ x: colX(1) + (half(v) ? 1 : -1) * cardW * 0.5, y: contigTopY(v) }), 700, () => interweave(done))
        })
      }
    } else {
      const MID = ranks(data.mid!)
      const midTopY = (v: number) => padTop + MID[v] * rowStep
      runFirst = (done) => {
        cap('cut in two — overhand the top half')
        moveWorking((v) => ({ x: half(v) ? colX(2) : colX(0), y: contigTopY(v) }), 520, () => {
          cap('overhand the top half — packets reverse')
          colCards[1].forEach((el, v) => {
            if (half(v) === 0) {
              el.style.transition = 'transform 520ms cubic-bezier(0.4,0.05,0.25,1)'
              el.style.transitionDelay = '0ms'
              place(el, { x: colX(0), y: midTopY(v) })
            }
          })
          later(() => {
            cap('bring them together at column one')
            moveWorking(
              (v) => ({ x: colX(1) + (half(v) ? 1 : -1) * cardW * 0.5, y: half(v) ? contigTopY(v) : midTopY(v) }),
              620,
              () => interweave(done),
            )
          }, 620)
        })
      }
    }
  } else if (op === 'pile') {
    const dealPos: PosFn = (v) => {
      const p = v % 6
      const band = innerH / 3
      const blockH = Math.ceil(N / 6) * rowStep
      return { x: colX(1 + (p % 2)), y: padTop + Math.floor(p / 2) * band + (band - blockH) / 2 + Math.floor(v / 6) * rowStep }
    }
    const pileSizes: number[] = []
    for (let p = 0; p < 6; p++) {
      let c = 0
      for (let v = 0; v < N; v++) if (v % 6 === p) c++
      pileSizes.push(c)
    }
    const everyCard = Array.from({ length: N }, (_, i) => i)
    runFirst = (done) => {
      cap('deal into 6 piles, one card at a time')
      sequence(colCards[1], dealPos, everyCard, everyCard.map(() => 1), 70, () => {
        cap('gather the piles, one at a time')
        sequence(colCards[1], posCol(1), states[1].slice(), pileSizes, 230, done)
      })
    }
  } else {
    const packs = data.packs![0]
    runFirst = (done) => {
      cap('peel packets off the top, one at a time')
      sequence(
        colCards[1],
        (v) => ({ x: colX(1), y: yOf(RANK[1][v]) }),
        Array.from({ length: N }, (_, i) => i),
        packs,
        180,
        done,
      )
    }
  }

  function dock(done: () => void) {
    cap('one application → ×1')
    later(done, 250)
  }
  function sortedAppear() {
    instant(colCards[0], pos0, false)
    nextFrame(() => {
      colCards[0].forEach((el) => {
        el.style.transitionDelay = '0ms'
        el.style.opacity = '1'
      })
      labs[0].style.opacity = '1'
    })
  }
  function copyStep(c: number, done: () => void) {
    colCards[c].forEach((el, v) => {
      el.style.transition = 'none'
      el.style.transitionDelay = '0ms'
      place(el, posCol(c - 1)(v))
      el.style.opacity = '1'
    })
    void host.offsetWidth // commit the start state so the slide is real
    colCards[c].forEach((el) => (el.style.transition = ''))
    cap(`apply it again → ×${c}`)
    nextFrame(() => wave(colCards[c], posCol(c), states[c].slice(), 9, done))
  }
  function reset() {
    instant(colCards[1], pos0, true)
    labs.forEach((l) => (l.style.opacity = '0'))
    for (let c = 2; c < COLS; c++) instant(colCards[c], posCol(c), false)
    instant(colCards[0], pos0, false)
    cap('a sorted deck')
  }

  let state: 'waiting' | 'playing' | 'stopped' = 'waiting'
  function run() {
    if (state === 'playing') return
    state = 'playing'
    reset()
    later(
      () =>
        runFirst(() =>
          later(
            () =>
              dock(() => {
                labs[1].style.opacity = '1'
                sortedAppear()
                later(
                  () =>
                    copyStep(2, () => {
                      labs[2].style.opacity = '1'
                      later(
                        () =>
                          copyStep(3, () => {
                            labs[3].style.opacity = '1'
                            state = 'stopped'
                            cap('↺ tap to shuffle again')
                          }),
                        350,
                      )
                    }),
                  350,
                )
              }),
            350,
          ),
        ),
      300,
    )
  }

  reset()
  // Play once when scrolled into view; replay on tap.
  const io = new IntersectionObserver(
    (entries) => entries.forEach((e) => e.isIntersecting && state === 'waiting' && run()),
    { threshold: 0.45 },
  )
  io.observe(host)
  const onClick = () => state === 'stopped' && run()
  host.addEventListener('click', onClick)

  return () => {
    io.disconnect()
    host.removeEventListener('click', onClick)
    timers.forEach(clearTimeout)
    frames.forEach(cancelAnimationFrame)
    host.replaceChildren()
  }
}
