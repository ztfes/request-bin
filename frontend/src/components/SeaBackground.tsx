/**
 * The Bikini Bottom wallpaper: outlined flowers and bubbles scattered over the
 * sea-blue ground, sitting behind every route.
 *
 * Layout is generated once from a fixed seed, so the pattern is identical on
 * every render and every reload — it reads as artwork, not as noise that
 * reshuffles under the user.
 */

import { Bubble, FLOWER_COLORS, Flower, type FlowerColor } from './Doodles'
import './SeaBackground.css'

function mulberry32(seed: number): () => number {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

interface Bloom {
  left: number
  top: number
  size: number
  color: FlowerColor
  petals: number
  seed: number
  rotate: number
  duration: number
  delay: number
}

interface Fizz {
  left: number
  top: number
  size: number
  color: FlowerColor
  duration: number
  delay: number
}

function buildPattern() {
  const rand = mulberry32(0x6c48)
  const blooms: Bloom[] = []
  const fizz: Fizz[] = []

  // A sparse jittered grid: enough blooms to read as the pattern, few enough
  // that the page in front of them stays quiet.
  const cols = 3
  const rows = 3
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      blooms.push({
        left: ((col + 0.5 + (rand() - 0.5) * 0.7) / cols) * 100,
        top: ((row + 0.5 + (rand() - 0.5) * 0.7) / rows) * 100,
        size: 6 + rand() * 5,
        color: FLOWER_COLORS[Math.floor(rand() * FLOWER_COLORS.length)],
        petals: rand() > 0.72 ? 6 : 5,
        seed: rand() * Math.PI * 2,
        rotate: rand() * 360,
        duration: 11 + rand() * 9,
        delay: -rand() * 12,
      })
    }
  }

  for (let i = 0; i < 9; i++) {
    fizz.push({
      left: rand() * 100,
      top: rand() * 100,
      size: 0.9 + rand() * 1.6,
      color: FLOWER_COLORS[Math.floor(rand() * FLOWER_COLORS.length)],
      duration: 9 + rand() * 8,
      delay: -rand() * 14,
    })
  }

  return { blooms, fizz }
}

const { blooms, fizz } = buildPattern()

function SeaBackground() {
  return (
    <div className="sea" aria-hidden="true">
      {blooms.map((bloom, i) => (
        <span
          key={`bloom-${i}`}
          className="sea-bloom"
          style={{
            left: `${bloom.left}%`,
            top: `${bloom.top}%`,
            width: `${bloom.size}vmax`,
            height: `${bloom.size}vmax`,
            animationDuration: `${bloom.duration}s`,
            animationDelay: `${bloom.delay}s`,
            ['--spin' as string]: `${bloom.rotate}deg`,
          }}
        >
          <Flower
            color={bloom.color}
            petals={bloom.petals}
            seed={bloom.seed}
            size={0}
            strokeWidth={8}
            className="sea-bloom-art"
          />
        </span>
      ))}

      {fizz.map((bubble, i) => (
        <span
          key={`fizz-${i}`}
          className="sea-fizz"
          style={{
            left: `${bubble.left}%`,
            top: `${bubble.top}%`,
            width: `${bubble.size}vmax`,
            height: `${bubble.size}vmax`,
            animationDuration: `${bubble.duration}s`,
            animationDelay: `${bubble.delay}s`,
          }}
        >
          <Bubble color={bubble.color} size={0} strokeWidth={7} className="sea-fizz-art" />
        </span>
      ))}
    </div>
  )
}

export default SeaBackground
