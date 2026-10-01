import { useId, useMemo } from 'react'
import { ridge, rng, stars } from './scene'

export interface Palette {
  /** sky from top to horizon */
  sky: [string, string, string, string]
  /** ridges from farthest to nearest */
  ridges: string[]
  /** the glow low on the horizon */
  glow: string
  /** the moon or sun, or none */
  orb?: { x: number; y: number; r: number; color: string }
  starCount: number
  /** a keep on the second-nearest ridge, centred at x, y and scaled */
  keep?: { x: number; y: number; scale: number }
}

const W = 1600
const H = 900

/** Which part of a scene to draw: the sky and everything in it, or the ridges in front of it. */
export type SceneLayer = 'sky' | 'ridges'

/**
 * A seeded mountain scene that fills its box. The ridges get closer and darker toward the bottom, like painted depth.
 * `layer` draws only the sky or only the ridges, so the two can move at different speeds. Drawn from the same seed,
 * the two layers stacked make the whole scene.
 */
export default function Landscape({ seed, palette, layer }: { seed: number; palette: Palette; layer: SceneLayer }) {
  const id = useId().replace(/:/g, '')
  const scene = useMemo(() => {
    const random = rng(seed)
    const layers = palette.ridges.length
    const ridges = palette.ridges.map((fill, layer) => {
      const depth = layer / Math.max(1, layers - 1)
      return { fill, d: ridge(random, W, H, H * (0.52 + depth * 0.3), H * (0.34 - depth * 0.12), 0.5 + depth * 0.06) }
    })
    return { ridges, stars: stars(random, palette.starCount, W, H * 0.6) }
  }, [seed, palette])

  // Canvas grain, so the flat fills read as paint. On the ridges it is masked to their shapes, because overlay grain
  // over the ridge layer's empty sky would show as grey noise instead of blending with the sky below.
  const grain = (
    <filter id={`grain${id}`}>
      <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed={seed % 97} />
      <feColorMatrix values="0 0 0 0 0.5  0 0 0 0 0.45  0 0 0 0 0.4  0 0 0 0.55 0" />
      <feComposite in2="SourceGraphic" operator="in" />
    </filter>
  )

  if (layer === 'sky') {
    return (
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMax slice" aria-hidden="true">
        <defs>
          <linearGradient id={`sky${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={palette.sky[0]} />
            <stop offset="0.45" stopColor={palette.sky[1]} />
            <stop offset="0.72" stopColor={palette.sky[2]} />
            <stop offset="0.9" stopColor={palette.sky[3]} />
          </linearGradient>
          <radialGradient id={`glow${id}`} cx="0.5" cy="1" r="0.7">
            <stop offset="0" stopColor={palette.glow} stopOpacity="0.8" />
            <stop offset="1" stopColor={palette.glow} stopOpacity="0" />
          </radialGradient>
          {palette.orb && (
            <radialGradient id={`orb${id}`}>
              <stop offset="0" stopColor={palette.orb.color} stopOpacity="0.55" />
              <stop offset="0.25" stopColor={palette.orb.color} stopOpacity="0.18" />
              <stop offset="1" stopColor={palette.orb.color} stopOpacity="0" />
            </radialGradient>
          )}
          {grain}
        </defs>
        <rect width={W} height={H} fill={`url(#sky${id})`} />
        <rect width={W} height={H} fill={`url(#glow${id})`} />
        {scene.stars.map((star, index) => (
          <circle key={index} className={index % 7 === 0 ? 'twinkle' : undefined} cx={star.x} cy={star.y} r={star.r} fill="#fff6e0" opacity={star.opacity} style={{ animationDelay: `${(index % 13) * 0.37}s` }} />
        ))}
        {palette.orb && (
          <g>
            <circle cx={palette.orb.x} cy={palette.orb.y} r={palette.orb.r * 5} fill={`url(#orb${id})`} />
            <circle cx={palette.orb.x} cy={palette.orb.y} r={palette.orb.r} fill={palette.orb.color} />
          </g>
        )}
        <rect width={W} height={H} filter={`url(#grain${id})`} opacity="0.35" style={{ mixBlendMode: 'overlay' }} />
      </svg>
    )
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <defs>
        <filter id={`mist${id}`} x="-20%" y="-50%" width="140%" height="200%">
          <feGaussianBlur stdDeviation="28" />
        </filter>
        {grain}
        <mask id={`land${id}`}>
          {scene.ridges.map((layer, index) => (
            <path key={index} d={layer.d} fill="#fff" />
          ))}
        </mask>
      </defs>
      {scene.ridges.map((layer, index) => (
        <g key={index}>
          <path d={layer.d} fill={layer.fill} />
          {index < scene.ridges.length - 1 && (
            <ellipse cx={W * (0.3 + 0.4 * ((index * 37) % 10) / 10)} cy={H * (0.62 + index * 0.08)} rx={W * 0.5} ry={34} fill={palette.glow} opacity="0.16" filter={`url(#mist${id})`} />
          )}
          {palette.keep && index === scene.ridges.length - 2 && <Keep fill={layer.fill} {...palette.keep} />}
        </g>
      ))}
      <rect width={W} height={H} filter={`url(#grain${id})`} opacity="0.35" mask={`url(#land${id})`} style={{ mixBlendMode: 'overlay' }} />
    </svg>
  )
}

/** A far-off keep on a crag: towers with pointed roofs and one lit window. */
function Keep({ fill, x, y, scale }: { fill: string; x: number; y: number; scale: number }) {
  const towers = [
    { x: 1228, w: 26, h: 150 },
    { x: 1262, w: 40, h: 205 },
    { x: 1310, w: 22, h: 120 },
    { x: 1338, w: 30, h: 170 },
  ]
  const ground = 560
  return (
    <g transform={`translate(${x},${y}) scale(${scale}) translate(-1300,${-ground})`}>
      <path d={`M1180,${ground + 90} L1215,${ground} L1380,${ground} L1420,${ground + 110} Z`} fill={fill} />
      <rect x="1222" y={ground - 70} width="150" height="72" fill={fill} />
      {towers.map((tower) => (
        <g key={tower.x}>
          <rect x={tower.x} y={ground - tower.h} width={tower.w} height={tower.h} fill={fill} />
          <path d={`M${tower.x - 5},${ground - tower.h} L${tower.x + tower.w / 2},${ground - tower.h - tower.w * 1.6} L${tower.x + tower.w + 5},${ground - tower.h} Z`} fill={fill} />
        </g>
      ))}
      <rect className="window" x="1277" y={ground - 160} width="7" height="13" rx="3" fill="#ffc977" />
      <rect className="window" x="1346" y={ground - 120} width="6" height="10" rx="3" fill="#ffc977" />
    </g>
  )
}

const BAND_HEIGHT = 360
const STAR_FIELD = { width: 1600, height: 1000 }

/**
 * A section's stretch of the night below the hero. The sky layer is a sky behind the whole section with a few stars.
 * It ends in `fadeTo`, the colour the next section's sky starts with, so the skies join without a seam. The ridges
 * layer is ridges along the section's bottom edge, with the horizon's glow behind them. It sits behind the section's
 * content.
 */
export function Vista({ seed, palette, layer, fadeTo }: { seed: number; palette: Palette; layer: SceneLayer; fadeTo?: string }) {
  const id = useId().replace(/:/g, '')
  const scene = useMemo(() => {
    const random = rng(seed)
    const layers = palette.ridges.length
    const ridges = palette.ridges.map((fill, layer) => {
      const depth = layer / Math.max(1, layers - 1)
      return { fill, d: ridge(random, W, BAND_HEIGHT, BAND_HEIGHT * (0.38 + depth * 0.32), BAND_HEIGHT * (0.5 - depth * 0.2), 0.5 + depth * 0.06) }
    })
    return { ridges, stars: stars(random, palette.starCount, STAR_FIELD.width, STAR_FIELD.height * 0.7) }
  }, [seed, palette])
  const [top, upper, lower, horizon] = palette.sky

  if (layer === 'sky') {
    return (
      <div className="vista" style={{ background: `linear-gradient(${top}, ${upper} 35%, ${lower} 62%, ${horizon} 82%, ${fadeTo ?? horizon})` }}>
        <svg className="vista-stars" viewBox={`0 0 ${STAR_FIELD.width} ${STAR_FIELD.height}`} preserveAspectRatio="xMidYMin slice">
          {scene.stars.map((star, index) => (
            <circle key={index} className={index % 5 === 0 ? 'twinkle' : undefined} cx={star.x} cy={star.y} r={star.r} fill="#fff6e0" opacity={star.opacity * 0.8} style={{ animationDelay: `${(index % 11) * 0.41}s` }} />
          ))}
        </svg>
      </div>
    )
  }

  return (
    <div className="vista">
      <svg className="vista-ridges" viewBox={`0 0 ${W} ${BAND_HEIGHT}`} preserveAspectRatio="xMidYMax slice">
        <defs>
          <radialGradient id={`vglow${id}`} cx="0.5" cy="1" r="0.75">
            <stop offset="0" stopColor={palette.glow} stopOpacity="0.5" />
            <stop offset="1" stopColor={palette.glow} stopOpacity="0" />
          </radialGradient>
          <filter id={`vmist${id}`} x="-20%" y="-100%" width="140%" height="300%">
            <feGaussianBlur stdDeviation="22" />
          </filter>
        </defs>
        <rect width={W} height={BAND_HEIGHT} fill={`url(#vglow${id})`} />
        {scene.ridges.map((layer, index) => (
          <g key={index}>
            <path d={layer.d} fill={layer.fill} />
            {index < scene.ridges.length - 1 && (
              <ellipse cx={W * (0.25 + (0.5 * ((index * 37 + seed) % 10)) / 10)} cy={BAND_HEIGHT * (0.55 + index * 0.14)} rx={W * 0.45} ry={22} fill={palette.glow} opacity="0.2" filter={`url(#vmist${id})`} />
            )}
            {palette.keep && index === scene.ridges.length - 2 && <Keep fill={layer.fill} {...palette.keep} />}
          </g>
        ))}
      </svg>
    </div>
  )
}
