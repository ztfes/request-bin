/**
 * The primary action, drawn as a bloom instead of a button: thick marker
 * outline, colored fill, label sitting in the middle of the petals.
 *
 * The focus ring is a second, larger dashed bloom rather than a rectangle, so
 * keyboard focus stays inside the same visual language.
 */

import type { ReactNode } from 'react'
import { FLOWER_HEX, type FlowerColor, flowerPath } from './Doodles'
import './FlowerButton.css'

interface FlowerButtonProps {
  children: ReactNode
  onClick?: () => void
  /** Petal color; the label is drawn in cream on top of it. */
  color?: FlowerColor
  petals?: number
  seed?: number
  size?: number
  className?: string
  type?: 'button' | 'submit'
}

function FlowerButton({
  children,
  onClick,
  color = 'coral',
  petals = 5,
  // Puts a petal at top dead centre, so the bloom reads as a flower head-on.
  seed = Math.PI / 2,
  size = 200,
  className,
  type = 'button',
}: FlowerButtonProps) {
  // Filled bloom: fat petals and a wide neck, so the label clears the outline
  // even at this smaller size.
  const d = flowerPath(petals, seed, 58, 0.32)
  const hex = FLOWER_HEX[color]

  return (
    <button
      type={type}
      onClick={onClick}
      className={className ? `flower-button ${className}` : 'flower-button'}
      style={{ ['--fb-size' as string]: `${size}px`, ['--fb-color' as string]: hex }}
    >
      <svg
        className="flower-button-art"
        viewBox="-132 -132 264 264"
        fill="none"
        aria-hidden="true"
        focusable="false"
      >
        <path
          className="flower-button-halo"
          d={d}
          transform="scale(1.16)"
          strokeDasharray="10 12"
        />
        <path className="flower-button-face" d={d} />
      </svg>
      <span className="flower-button-label">{children}</span>
    </button>
  )
}

export default FlowerButton
