/**
 * Hand-drawn SVG art for the CHUM Bucket UI.
 *
 * Everything the app draws lives here — no icon library, no stock shapes. The
 * whole set is one ink-and-marker sketch: thick round-capped strokes, outlines
 * that wobble off true, and the Bikini Bottom flower palette.
 */

import type { CSSProperties, ReactNode } from 'react'

export const FLOWER_COLORS = [
  'coral',
  'tangerine',
  'sunny',
  'lime',
  'violet',
  'indigo',
  'foam',
] as const

export type FlowerColor = (typeof FLOWER_COLORS)[number]

/** Marker colors, kept in sync with the custom properties in index.css. */
export const FLOWER_HEX: Record<FlowerColor, string> = {
  coral: '#e8563f',
  tangerine: '#f2a15b',
  sunny: '#f2dc4e',
  lime: '#c3dc4b',
  violet: '#9b5de5',
  indigo: '#4e5bd6',
  foam: '#ffffff',
}

function resolveColor(color: FlowerColor | string): string {
  return color in FLOWER_HEX ? FLOWER_HEX[color as FlowerColor] : color
}

function n(value: number): string {
  return String(Math.round(value * 100) / 100)
}

/** Smooth closed curve through `points`, Catmull-Rom converted to cubics. */
function closedCurve(points: Array<[number, number]>): string {
  const len = points.length
  let d = `M ${n(points[0][0])} ${n(points[0][1])}`

  for (let i = 0; i < len; i++) {
    const [x0, y0] = points[(i - 1 + len) % len]
    const [x1, y1] = points[i]
    const [x2, y2] = points[(i + 1) % len]
    const [x3, y3] = points[(i + 2) % len]

    d += ` C ${n(x1 + (x2 - x0) / 6)} ${n(y1 + (y2 - y0) / 6)}`
    d += ` ${n(x2 - (x3 - x1) / 6)} ${n(y2 - (y3 - y1) / 6)}`
    d += ` ${n(x2)} ${n(y2)}`
  }

  return `${d} Z`
}

const flowerCache = new Map<string, string>()

/**
 * A blobby petal outline in a -100..100 box. Petals bulge out to r=100 and
 * pinch to `neck` between lobes; `seed` rotates the bloom and shifts the wobble
 * so no two flowers on screen trace quite the same line.
 *
 * `plump` (< 1) fattens the lobes so petals read as rounded paddles rather than
 * spikes — outlined blooms can stay slim, but a filled one needs the extra
 * body or it turns into a starburst.
 */
export function flowerPath(petals = 5, seed = 0, neck = 34, plump = 0.42): string {
  const key = `${petals}:${seed}:${neck}:${plump}`
  const cached = flowerCache.get(key)
  if (cached) return cached

  const samples = petals * 14
  const points: Array<[number, number]> = []

  for (let i = 0; i < samples; i++) {
    const angle = (i / samples) * Math.PI * 2
    const lobe = (1 + Math.cos(petals * angle + seed)) / 2
    const radius =
      (neck + (100 - neck) * Math.pow(lobe, plump)) *
      (1 + 0.03 * Math.sin(3 * angle + seed * 1.7))
    points.push([radius * Math.cos(angle), radius * Math.sin(angle)])
  }

  const path = closedCurve(points)
  flowerCache.set(key, path)
  return path
}

interface FlowerProps {
  color?: FlowerColor | string
  size?: number
  petals?: number
  seed?: number
  /** Radius at the pinch between petals, 0-100. Higher = chunkier bloom. */
  neck?: number
  /** Lobe fatness; lower = wider petals. */
  plump?: number
  strokeWidth?: number
  fill?: string
  core?: boolean
  className?: string
  style?: CSSProperties
}

/** The signature bloom: thick marker outline, optional pale fill, oval core. */
export function Flower({
  color = 'coral',
  size = 96,
  petals = 5,
  seed = 0,
  neck = 34,
  plump = 0.42,
  strokeWidth = 9,
  fill = 'none',
  core = true,
  className,
  style,
}: FlowerProps) {
  const stroke = resolveColor(color)

  return (
    <svg
      className={className}
      style={style}
      width={size}
      height={size}
      viewBox="-118 -118 236 236"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d={flowerPath(petals, seed, neck, plump)}
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />
      {core && (
        <ellipse
          rx="19"
          ry="13"
          transform="rotate(-14)"
          fill="none"
          stroke={stroke}
          strokeWidth={strokeWidth * 0.82}
        />
      )}
    </svg>
  )
}

interface BubbleProps {
  color?: FlowerColor | string
  size?: number
  strokeWidth?: number
  className?: string
  style?: CSSProperties
}

/** A ring with a crescent glint, exactly like the bubbles in the pattern. */
export function Bubble({
  color = 'foam',
  size = 26,
  strokeWidth = 7,
  className,
  style,
}: BubbleProps) {
  const stroke = resolveColor(color)

  return (
    <svg
      className={className}
      style={style}
      width={size}
      height={size}
      viewBox="-50 -50 100 100"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <circle r="42" stroke={stroke} strokeWidth={strokeWidth} />
      <path
        d="M -27 -12 A 30 30 0 0 1 -9 -30"
        stroke={stroke}
        strokeWidth={strokeWidth * 0.8}
        strokeLinecap="round"
      />
    </svg>
  )
}

interface BucketProps {
  size?: number
  className?: string
  title?: string
}

/** The pail itself — handle, tapered body, elliptical rim. */
export function Bucket({ size = 96, className, title }: BucketProps) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      {title && <title>{title}</title>}
      <path
        d="M23 42 C 24 14 76 14 77 42"
        stroke="var(--ink)"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <path
        d="M14 38 C 15 58 20 80 25 87 C 30 93 70 93 75 87 C 80 80 85 58 86 38 A 36 10 0 0 1 14 38 Z"
        fill="var(--pail)"
        stroke="var(--ink)"
        strokeWidth="4"
        strokeLinejoin="round"
      />
      <ellipse
        cx="50"
        cy="38"
        rx="36"
        ry="10"
        fill="var(--pail-light)"
        stroke="var(--ink)"
        strokeWidth="4"
      />
      <path
        d="M24 55 C 32 62 68 62 76 55"
        stroke="var(--ink)"
        strokeWidth="2.6"
        strokeLinecap="round"
        opacity="0.4"
      />
    </svg>
  )
}

interface IconProps {
  size?: number
  className?: string
}

function icon(children: ReactNode, { size = 20, className }: IconProps) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  )
}

/** Two sheets, drawn freehand and slightly out of square. */
export function CopyDoodle(props: IconProps) {
  return icon(
    <>
      <path d="M9.4 8.4 C 9.2 7.4 9.9 6.5 10.9 6.5 L 19.3 6.7 C 20.3 6.8 21.1 7.6 21 8.6 L 20.7 18.5 C 20.6 19.5 19.8 20.3 18.8 20.2 L 10.4 20 C 9.4 20 8.7 19.1 8.8 18.1 Z" />
      <path d="M6.1 15.6 C 5.1 15.7 4.2 15 4.1 14 L 3.4 5.7 C 3.3 4.7 4 3.8 5 3.7 L 13.3 3 C 14.3 2.9 15.1 3.6 15.3 4.6" />
    </>,
    props,
  )
}

export function CheckDoodle(props: IconProps) {
  return icon(<path d="M4 12.6 C 6.4 14 8 16.2 9.5 19 C 12 13 15.6 8 20.4 4.9" />, props)
}

export function ArrowDoodle(props: IconProps) {
  return icon(
    <>
      <path d="M3.5 12.2 C 8 11.4 14 11.7 19.8 12.1" />
      <path d="M15.4 7.4 C 17 9.4 18.6 11 20.2 12.1 C 18.5 13.2 16.9 14.9 15.5 16.8" />
    </>,
    props,
  )
}

export function BackDoodle(props: IconProps) {
  return icon(
    <>
      <path d="M20.5 12 C 16 11.3 10 11.6 4.2 12.1" />
      <path d="M8.6 7.4 C 7 9.4 5.4 11 3.8 12.1 C 5.5 13.2 7.1 14.9 8.5 16.8" />
    </>,
    props,
  )
}

export function PencilDoodle(props: IconProps) {
  return icon(
    <>
      <path d="M4.2 19.9 C 4.4 18.4 4.6 17.1 5 16 L 15.9 5.2 C 16.7 4.4 17.9 4.4 18.7 5.2 C 19.5 6 19.5 7.2 18.7 8 L 7.9 18.9 C 6.7 19.3 5.5 19.7 4.2 19.9 Z" />
      <path d="M15.1 6 C 16.4 7.2 17.6 8.4 18.8 9.5" />
    </>,
    props,
  )
}

export function TrashDoodle(props: IconProps) {
  return icon(
    <>
      <path d="M4.4 6.4 C 9 5.6 15.1 5.4 19.7 6" />
      <path d="M9.5 5.9 C 9.6 4.3 10.3 3.4 12 3.3 C 13.7 3.2 14.4 4.1 14.6 5.7" />
      <path d="M6.2 7.7 C 6.6 12.4 7 16.6 7.4 19.1 C 7.6 20.3 8.4 21 9.6 21 L 14.5 21 C 15.7 21 16.5 20.3 16.7 19.1 C 17.1 16.6 17.5 12.4 17.9 7.7" />
      <path d="M10.3 10.4 C 10.4 13.4 10.5 16.1 10.6 17.7" />
      <path d="M13.7 10.4 C 13.6 13.4 13.5 16.1 13.4 17.7" />
    </>,
    props,
  )
}

export function RefreshDoodle(props: IconProps) {
  return icon(
    <>
      <path d="M20 9.4 C 18.4 5.6 14.4 3.3 10.4 4.1 C 5.9 5 3 9.4 3.9 13.9 C 4.8 18.4 9.1 21.4 13.6 20.5 C 16.6 19.9 18.9 17.7 19.8 15" />
      <path d="M14.6 8.6 C 16.5 9.3 18.4 9.6 20.2 9.5 C 20 7.7 20.2 5.9 20.8 4.1" />
    </>,
    props,
  )
}

const WAVE_WIDTH = 300

/** One tiled period of a hand-drawn wave across `WAVE_WIDTH`. */
function wavePath(): string {
  const period = 25
  let d = 'M 0 7'
  for (let x = 0; x < WAVE_WIDTH; x += period) {
    d += ` q ${period / 4} -6 ${period / 2} 0 t ${period / 2} 0`
  }
  return d
}

const WAVE_D = wavePath()

interface WavyRuleProps {
  color?: string
  className?: string
}

/** Stands in for every horizontal rule — no flat lines anywhere in this UI. */
export function WavyRule({ color = 'var(--ink)', className }: WavyRuleProps) {
  return (
    <svg
      className={className ? `wavy-rule ${className}` : 'wavy-rule'}
      viewBox={`0 0 ${WAVE_WIDTH} 14`}
      preserveAspectRatio="none"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <path d={WAVE_D} stroke={color} strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}
