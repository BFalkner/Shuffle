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

const DEMO = DATA.moveDemo as unknown as { M: number } & Record<DemoMove, MoveData>
const CARD_COUNT = DEMO.M

// Each move gets its own hue so the four demos read as different moves. The page is dark, so even the top card,
// the darkest, stays well above the background.
const MOVE_HUE: Record<DemoMove, [number, number]> = { mash: [150, 38], overhand: [24, 42], pile: [218, 40], ohr: [175, 30] }

function cardColor(op: DemoMove, card: number) {
  const [hue, sat] = MOVE_HUE[op]
  const depth = card / (CARD_COUNT - 1)
  return `hsl(${(hue + (depth - 0.5) * 30).toFixed(0)},${(sat + 14).toFixed(0)}%,${(40 + depth * 46).toFixed(0)}%)`
}

const ranks = (state: number[]) => {
  const rank = new Array<number>(CARD_COUNT)
  state.forEach((card, position) => (rank[card] = position))
  return rank
}

type Pos = { x: number; y: number }
type PosFn = (card: number) => Pos
const place = (element: HTMLElement, position: Pos) => (element.style.transform = `translate(${position.x.toFixed(1)}px,${position.y.toFixed(1)}px)`)

export function startMoveDemo(host: HTMLElement, caption: HTMLElement, op: DemoMove): () => void {
  // Timer bookkeeping so everything can be cancelled on unmount.
  const timers = new Set<ReturnType<typeof setTimeout>>()
  const frames = new Set<number>()
  const later = (callback: () => void, delay: number) => {
    const timer = setTimeout(() => {
      timers.delete(timer)
      callback()
    }, delay)
    timers.add(timer)
  }
  const nextFrame = (callback: () => void) => {
    const frame = requestAnimationFrame(() => {
      frames.delete(frame)
      callback()
    })
    frames.add(frame)
  }

  const padX = 10
  const padTop = 9
  const padBot = 20
  const innerW = host.clientWidth - padX * 2
  const innerH = host.clientHeight - padTop - padBot
  const COLS = 4
  const colGap = 8
  const colW = (innerW - (COLS - 1) * colGap) / COLS
  const cardW = Math.min(colW, 30)
  const rowStep = innerH / CARD_COUNT
  const cardH = Math.max(2, rowStep - 1)
  const data = DEMO[op]
  const states = data.states
  const colX = (column: number) => padX + column * (colW + colGap) + (colW - cardW) / 2
  const yOf = (rank: number) => padTop + rank * rowStep
  const RANK = states.map(ranks)

  const cap = (text: string) => (caption.textContent = text)

  // Four columns of slats: sorted, ×1, ×2, ×3.
  const colCards: HTMLDivElement[][] = []
  for (let column = 0; column < COLS; column++) {
    const arr: HTMLDivElement[] = []
    for (let card = 0; card < CARD_COUNT; card++) {
      const element = document.createElement('div')
      element.className = 'slat'
      element.style.width = `${cardW.toFixed(1)}px`
      element.style.height = `${cardH.toFixed(1)}px`
      element.style.background = cardColor(op, card)
      element.style.opacity = '0'
      host.appendChild(element)
      arr.push(element)
    }
    colCards.push(arr)
  }
  const labs: HTMLDivElement[] = []
  for (let column = 0; column < COLS; column++) {
    const labelElement = document.createElement('div')
    labelElement.className = 'collab'
    labelElement.style.left = `${colX(column) + cardW / 2}px`
    labelElement.textContent = column === 0 ? 'sorted' : `×${column}`
    host.appendChild(labelElement)
    labs.push(labelElement)
  }

  function instant(set: HTMLElement[], posFn: PosFn, visible: boolean) {
    set.forEach((element, card) => {
      element.style.transition = 'none'
      element.style.transitionDelay = '0ms'
      place(element, posFn(card))
      element.style.opacity = visible ? '1' : '0'
    })
    nextFrame(() => set.forEach((element) => (element.style.transition = '')))
  }

  function wave(set: HTMLElement[], posFn: PosFn, order: number[], per: number, done?: () => void) {
    order.forEach((card, index) => {
      set[card].style.transitionDelay = `${index * per}ms`
      set[card].style.opacity = '1'
      place(set[card], posFn(card))
    })
    if (done) later(done, order.length * per + 700)
  }

  /** One group at a time, in order. */
  function sequence(set: HTMLElement[], posFn: PosFn, order: number[], sizes: number[], dur: number, done?: () => void) {
    let groupIndex = 0
    let cardOffset = 0
    const nextGroup = () => {
      if (groupIndex >= sizes.length) {
        done?.()
        return
      }
      const grp = order.slice(cardOffset, cardOffset + sizes[groupIndex])
      cardOffset += sizes[groupIndex]
      groupIndex++
      grp.forEach((card) => {
        set[card].style.transition = `transform ${dur}ms cubic-bezier(0.3,0.05,0.3,1)`
        set[card].style.transitionDelay = '0ms'
        set[card].style.opacity = '1'
        place(set[card], posFn(card))
      })
      later(nextGroup, dur + 25)
    }
    nextGroup()
  }

  const pos0: PosFn = (card) => ({ x: colX(0), y: yOf(RANK[0][card]) })
  const posCol =
    (column: number): PosFn =>
    (card) => ({ x: colX(column), y: yOf(RANK[column][card]) })

  const moveWorking = (posFn: PosFn, dur: number, onDone: () => void) => {
    colCards[1].forEach((element, card) => {
      element.style.transition = `transform ${dur}ms cubic-bezier(0.4,0.05,0.25,1)`
      element.style.transitionDelay = '0ms'
      element.style.opacity = '1'
      place(element, posFn(card))
    })
    later(onDone, dur + 60)
  }

  const interweave = (done: () => void) => {
    cap('they interweave, flowing downward')
    const order = states[1].slice()
    order.forEach((card, index) => {
      const element = colCards[1][card]
      element.style.transition = 'transform 520ms cubic-bezier(0.4,0.05,0.25,1)'
      element.style.transitionDelay = `${index * 11}ms`
      element.style.opacity = '1'
      place(element, { x: colX(1), y: yOf(RANK[1][card]) })
    })
    later(() => {
      colCards[1].forEach((element) => (element.style.transition = ''))
      done()
    }, order.length * 11 + 600)
  }

  // The first application of the move, shown step by step on the working column.
  let runFirst: (done: () => void) => void
  if (op === 'mash' || op === 'ohr') {
    const cutAt = op === 'mash' ? data.cuts![0] : data.cut!
    const half = (card: number) => (RANK[0][card] < cutAt ? 0 : 1) // 0 top, 1 bottom
    const contigTopY = (card: number) => padTop + (half(card) ? RANK[0][card] - cutAt : RANK[0][card]) * rowStep
    if (op === 'mash') {
      runFirst = (done) => {
        cap('cut in two — bottom half moves over')
        moveWorking((card) => ({ x: half(card) ? colX(2) : colX(0), y: contigTopY(card) }), 560, () => {
          cap('bring them together at column one')
          moveWorking((card) => ({ x: colX(1) + (half(card) ? 1 : -1) * cardW * 0.5, y: contigTopY(card) }), 700, () => interweave(done))
        })
      }
    } else {
      const MID = ranks(data.mid!)
      const midTopY = (card: number) => padTop + MID[card] * rowStep
      runFirst = (done) => {
        cap('cut in two — overhand the top half')
        moveWorking((card) => ({ x: half(card) ? colX(2) : colX(0), y: contigTopY(card) }), 520, () => {
          cap('overhand the top half — packets reverse')
          colCards[1].forEach((element, card) => {
            if (half(card) === 0) {
              element.style.transition = 'transform 520ms cubic-bezier(0.4,0.05,0.25,1)'
              element.style.transitionDelay = '0ms'
              place(element, { x: colX(0), y: midTopY(card) })
            }
          })
          later(() => {
            cap('bring them together at column one')
            moveWorking(
              (card) => ({ x: colX(1) + (half(card) ? 1 : -1) * cardW * 0.5, y: half(card) ? contigTopY(card) : midTopY(card) }),
              620,
              () => interweave(done),
            )
          }, 620)
        })
      }
    }
  } else if (op === 'pile') {
    const dealPos: PosFn = (card) => {
      const pile = card % 6
      const band = innerH / 3
      const blockH = Math.ceil(CARD_COUNT / 6) * rowStep
      return { x: colX(1 + (pile % 2)), y: padTop + Math.floor(pile / 2) * band + (band - blockH) / 2 + Math.floor(card / 6) * rowStep }
    }
    const pileSizes: number[] = []
    for (let pile = 0; pile < 6; pile++) {
      let count = 0
      for (let card = 0; card < CARD_COUNT; card++) if (card % 6 === pile) count++
      pileSizes.push(count)
    }
    const everyCard = Array.from({ length: CARD_COUNT }, (_, card) => card)
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
        (card) => ({ x: colX(1), y: yOf(RANK[1][card]) }),
        Array.from({ length: CARD_COUNT }, (_, card) => card),
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
      colCards[0].forEach((element) => {
        element.style.transitionDelay = '0ms'
        element.style.opacity = '1'
      })
      labs[0].style.opacity = '1'
    })
  }
  function copyStep(column: number, done: () => void) {
    colCards[column].forEach((element, card) => {
      element.style.transition = 'none'
      element.style.transitionDelay = '0ms'
      place(element, posCol(column - 1)(card))
      element.style.opacity = '1'
    })
    void host.offsetWidth // commit the start state so the slide is real
    colCards[column].forEach((element) => (element.style.transition = ''))
    cap(`apply it again → ×${column}`)
    nextFrame(() => wave(colCards[column], posCol(column), states[column].slice(), 9, done))
  }
  function reset() {
    instant(colCards[1], pos0, true)
    labs.forEach((label) => (label.style.opacity = '0'))
    for (let column = 2; column < COLS; column++) instant(colCards[column], posCol(column), false)
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
  const observer = new IntersectionObserver(
    (entries) => entries.forEach((entry) => entry.isIntersecting && state === 'waiting' && run()),
    { threshold: 0.45 },
  )
  observer.observe(host)
  const onClick = () => state === 'stopped' && run()
  host.addEventListener('click', onClick)

  return () => {
    observer.disconnect()
    host.removeEventListener('click', onClick)
    timers.forEach(clearTimeout)
    frames.forEach(cancelAnimationFrame)
    host.replaceChildren()
  }
}
