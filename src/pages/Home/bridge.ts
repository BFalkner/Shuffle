// The hero's deck: it sits for a moment, splits in two, starts to bridge, and then flies apart and lands all over the
// ground.
//
// Like moveDemo.ts, this works on the DOM directly. Each card gets one Web Animations keyframe list for the whole
// show. `startBridge` builds the cards inside `stage`, sizes them from `spot`, and returns controls to replay and stop.

import { colorFor } from '../../components/deckColors'

const CARD_COUNT = 60
const HALF = CARD_COUNT / 2
/** height over width: a Magic card is 63 × 88 mm */
const CARD_RATIO = 88 / 63
/** how far each card in the stack sits up and left of the one below it, px */
const STACK = { x: 0.22, y: 0.28 }

/** when each part of the show ends, ms */
const FADE_IN = 300
const REST = 1300
const SPLIT = 2200
const BRIDGE = 3000
const STRAIN = 3350
/** the most a card waits after the strain before it flies, ms */
const LAUNCH_SPREAD = 160
/** how long a landed card takes to lie down, ms */
const SETTLE = 200

/** px/s² */
const GRAVITY = 2600
/** air drag, per second: falls top out at GRAVITY / DRAG px/s, so the cards float down instead of dropping */
const DRAG = 2.6
/** how fast a card's spin dies away, per second */
const SPIN_DRAG = 0.7
/** keyframe spacing in flight, s */
const FRAME = 1 / 30
/** the longest flight, s; a card still in the air by then is cut off where it is */
const LONGEST_FLIGHT = 6
/** the band the cards land in, px up from the bottom of the stage */
const GROUND = { nearest: 12, farthest: 80 }
/** how far a landed card is tipped back to lie on the ground, degrees */
const LIE = 72

interface Pose {
  x: number
  y: number
  rotateX: number
  rotateY: number
  rotateZ: number
}

/** A pose at a time in the show, and the easing into the next one. */
interface Step {
  time: number
  pose: Pose
  easing?: string
}

/** Where a landed card lies, kept relative to the stage so a resize can put it back. */
interface Landing {
  fractionX: number
  /** px up from the bottom of the stage */
  height: number
  pose: Pose
}

export interface Bridge {
  replay: () => void
  stop: () => void
}

const random = (lowest: number, highest: number) => lowest + Math.random() * (highest - lowest)
const transformOf = (pose: Pose) =>
  `translate3d(${pose.x.toFixed(1)}px,${pose.y.toFixed(1)}px,0) rotateX(${pose.rotateX.toFixed(1)}deg) rotateY(${pose.rotateY.toFixed(1)}deg) rotateZ(${pose.rotateZ.toFixed(1)}deg)`
/** the value nearest `angle` that is `target` plus a whole number of `period`s */
const nearestTurn = (angle: number, target: number, period: number) => target + Math.round((angle - target) / period) * period

/**
 * The deck lies face down, so each card is turned over (rotateY 180°). Turned over, a card's own rotateZ shows on the
 * screen the other way round, so `tilt` takes the angle as seen and flips it.
 */
const faceDown = (x: number, y: number, tilt = 0, bend = 0): Pose => ({ x, y, rotateX: 0, rotateY: 180 + bend, rotateZ: -tilt })

interface Geometry {
  width: number
  height: number
  /** the deck's centre on the stage */
  centreX: number
  centreY: number
  stageWidth: number
  stageHeight: number
}

/** Card `card` (0 at the bottom of the deck) at rest, split, bridged and straining. */
function deckSteps(card: number, geometry: Geometry): { steps: Step[]; strained: Pose; side: number; depth: number } {
  const { width, height, centreX, centreY } = geometry
  const stacked = (index: number, x: number, y: number) => ({ x: x - index * STACK.x, y: y - index * STACK.y })
  // The bottom half stays on the left; the top half is lifted off and set down on the right.
  const side = card < HALF ? -1 : 1
  const index = card % HALF
  /** 0 for the bottom card of a half, near 1 for its top */
  const depth = index / HALF
  const rest = stacked(card, centreX, centreY)
  const split = stacked(index, centreX + side * width * 0.62, centreY)
  // The halves lean in with their inner edges raised, the top cards of each bent the most, so they arch toward the middle.
  const bridge = stacked(index, centreX + side * width * 0.52, centreY - depth * height * 0.07)
  const tilt = side * (12 + depth * 8)
  const bend = side * 22
  const strained = faceDown(bridge.x, bridge.y - 2, tilt + side * 3, bend + side * 4)

  const lifted = side > 0 ? [{ time: (REST + SPLIT) / 2, pose: faceDown(centreX + width * 0.3 - index * STACK.x, rest.y - height * 0.35), easing: 'ease-in' }] : []
  const steps: Step[] = [
    { time: 0, pose: faceDown(rest.x, rest.y) },
    { time: REST, pose: faceDown(rest.x, rest.y), easing: side > 0 ? 'ease-out' : 'ease-in-out' },
    ...lifted,
    { time: SPLIT, pose: faceDown(split.x, split.y), easing: 'ease-in-out' },
    { time: BRIDGE, pose: faceDown(bridge.x, bridge.y, tilt, bend) },
    // The strain: the halves tremble as the thumbs bend them further.
    ...[0.25, 0.5, 0.75].map((fraction, step) => ({
      time: BRIDGE + (STRAIN - BRIDGE) * fraction,
      pose: faceDown(bridge.x + (step % 2 ? -1.5 : 1.5), bridge.y - 2 * fraction, tilt + side * 3 * fraction, bend + side * 4 * fraction),
    })),
    { time: STRAIN, pose: strained },
  ]
  return { steps, strained, side, depth }
}

/**
 * A card's flight from `start`, under gravity with linear drag, so it has a closed form. A card drifts side to side
 * as it falls, and lands somewhere in the ground band. The flight ends on the first frame at or below its landing
 * height while falling.
 */
function flightSteps(start: Pose, launch: number, side: number, geometry: Geometry): { steps: Step[]; landing: Landing } {
  const velocity = { x: side * random(250, 1600) + random(-500, 500), y: -random(1500, 3400) }
  const spin = { x: random(-700, 700), y: random(-700, 700), z: random(-900, 900) }
  const flutter = { size: random(20, 90), speed: random(3, 7), phase: random(0, Math.PI * 2) }
  const landingY = geometry.stageHeight - random(GROUND.nearest, GROUND.farthest)
  const terminal = GRAVITY / DRAG

  const poseAt = (seconds: number): Pose => {
    const slowed = (1 - Math.exp(-DRAG * seconds)) / DRAG
    const spun = (1 - Math.exp(-SPIN_DRAG * seconds)) / SPIN_DRAG
    const drift = flutter.size * (Math.sin(flutter.speed * seconds + flutter.phase) - Math.sin(flutter.phase))
    return {
      x: start.x + velocity.x * slowed + drift,
      y: start.y + terminal * seconds + (velocity.y - terminal) * slowed,
      rotateX: start.rotateX + spin.x * spun,
      rotateY: start.rotateY + spin.y * spun,
      rotateZ: start.rotateZ + spin.z * spun,
    }
  }
  const fallingAt = (seconds: number) => velocity.y * Math.exp(-DRAG * seconds) + terminal * (1 - Math.exp(-DRAG * seconds)) > 0

  const frames = Array.from({ length: Math.ceil(LONGEST_FLIGHT / FRAME) }, (_, frame) => frame * FRAME)
  const landed = frames.findIndex((seconds) => fallingAt(seconds) && poseAt(seconds).y >= landingY)
  const flight = frames.slice(1, landed < 0 ? undefined : landed + 1)
  const last = poseAt(flight[flight.length - 1])

  // Lying down: tipped back onto the ground, face up or face down, whichever side it was nearer.
  const lying: Pose = {
    x: last.x,
    y: landingY,
    rotateX: nearestTurn(last.rotateX, LIE, 360),
    rotateY: nearestTurn(last.rotateY, 0, 180),
    rotateZ: last.rotateZ + random(-10, 10),
  }
  const touchdown = launch + flight[flight.length - 1] * 1000
  return {
    steps: [
      ...flight.slice(0, -1).map((seconds) => ({ time: launch + seconds * 1000, pose: poseAt(seconds) })),
      { time: touchdown, pose: { ...last, y: Math.min(last.y, landingY) }, easing: 'ease-out' },
      { time: touchdown + SETTLE, pose: lying },
    ],
    landing: { fractionX: lying.x / geometry.stageWidth, height: geometry.stageHeight - landingY, pose: lying },
  }
}

/** One card's whole show, and where it lands. */
function plan(card: number, geometry: Geometry): { steps: Step[]; landing: Landing } {
  const { steps, strained, side, depth } = deckSteps(card, geometry)
  // The top cards of each half, bent the most, let go first.
  const launch = STRAIN + (1 - depth) * LAUNCH_SPREAD * random(0.4, 1)
  const flight = flightSteps(strained, launch, side, geometry)
  return { steps: [...steps, { time: launch, pose: strained }, ...flight.steps], landing: flight.landing }
}

function keyframesOf(steps: Step[]): Keyframe[] {
  const total = steps[steps.length - 1].time
  return steps.map(({ time, pose, easing }) => ({ offset: time / total, transform: transformOf(pose), easing: easing ?? 'linear' }))
}

function cardElement(card: number): HTMLElement {
  const element = document.createElement('div')
  element.className = 'bcard'
  const face = document.createElement('div')
  face.className = 'bcard-face'
  face.style.setProperty('--gem', colorFor(card, CARD_COUNT))
  const back = document.createElement('div')
  back.className = 'bcard-back'
  element.append(face, back)
  return element
}

/**
 * Builds the deck in `stage`, over the deck's place in `spot`, and plays the show once unless motion is reduced.
 * `onLanded` runs when every card is down.
 */
export function startBridge(stage: HTMLElement, spot: HTMLElement, onLanded: () => void): Bridge {
  const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const cards = Array.from({ length: CARD_COUNT }, (_, card) => cardElement(card))
  stage.append(...cards)
  // Hidden until the show starts, which fades the deck in. The fade is on the stage, because opacity on a card would
  // flatten it and show both its sides at once.
  if (!still) stage.style.opacity = '0'
  let animations: Animation[] = []
  let landings: Landing[] | null = null
  let stopped = false

  const measure = (): Geometry => {
    const stageBox = stage.getBoundingClientRect()
    const spotBox = spot.getBoundingClientRect()
    const width = spotBox.width
    const height = width * CARD_RATIO
    stage.style.setProperty('--card-w', `${width}px`)
    stage.style.setProperty('--card-h', `${height}px`)
    return {
      width,
      height,
      centreX: spotBox.left - stageBox.left + width / 2,
      centreY: spotBox.top - stageBox.top + spotBox.height / 2,
      stageWidth: stageBox.width,
      stageHeight: stageBox.height,
    }
  }

  // Without the show, or before it, the deck just sits in its place.
  const placeAtRest = () => {
    const geometry = measure()
    cards.forEach((element, card) => {
      element.style.transform = transformOf(faceDown(geometry.centreX - card * STACK.x, geometry.centreY - card * STACK.y))
      element.style.zIndex = ''
    })
  }

  // Landed cards keep their place across the stage and their height off the ground when the stage changes size.
  const placeLanded = (placed: Landing[]) => {
    const geometry = measure()
    cards.forEach((element, card) => {
      const { fractionX, height, pose } = placed[card]
      const y = geometry.stageHeight - height
      element.style.transform = transformOf({ ...pose, x: fractionX * geometry.stageWidth, y })
      // Nearer the viewer, lower on the screen, drawn on top.
      element.style.zIndex = String(Math.round(y))
    })
  }

  const play = () => {
    animations.forEach((animation) => animation.cancel())
    landings = null
    const geometry = measure()
    const plans = cards.map((_, card) => plan(card, geometry))
    cards.forEach((element) => (element.style.zIndex = ''))
    stage.style.opacity = ''
    stage.animate([{ opacity: 0 }, { opacity: 1 }], { duration: FADE_IN })
    animations = cards.map((element, card) => {
      const steps = plans[card].steps
      return element.animate(keyframesOf(steps), { duration: steps[steps.length - 1].time, fill: 'forwards' })
    })
    const playing = animations
    Promise.all(playing.map((animation) => animation.finished)).then(
      () => {
        if (stopped || animations !== playing) return
        landings = plans.map(({ landing }) => landing)
        playing.forEach((animation) => animation.cancel())
        placeLanded(landings)
        onLanded()
      },
      // A cancelled show rejects `finished`; a replay or stop has taken over.
      () => {},
    )
  }

  const resize = new ResizeObserver(() => {
    if (landings) placeLanded(landings)
    else if (still) placeAtRest()
  })
  resize.observe(stage)

  // The show starts once the deck is in view, which on a phone is below the fold.
  const inView = new IntersectionObserver(
    ([entry]) => {
      if (!entry.isIntersecting) return
      inView.disconnect()
      document.fonts.ready.then(() => !stopped && play())
    },
    { threshold: 0.6 },
  )

  placeAtRest()
  if (!still) inView.observe(spot)

  return {
    replay: play,
    stop: () => {
      stopped = true
      inView.disconnect()
      resize.disconnect()
      animations.forEach((animation) => animation.cancel())
      cards.forEach((element) => element.remove())
    },
  }
}
