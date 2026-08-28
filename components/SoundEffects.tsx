'use client'
import { useEffect } from 'react'
import { playTickSound } from '@/lib/sound'

export default function SoundEffects() {
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const target = e.target as HTMLElement | null
      if (!target) return

      // Check if target or any parent is interactive
      const interactiveEl = target.closest(
        'button, a, input, select, label, [role="button"], [tabindex], .btn-primary, .btn-secondary, .btn-ghost, .card-hover, .theme-toggle, .toggle, [data-sound]'
      )

      if (interactiveEl) {
        playTickSound('click')
      }
    }

    // Attach to window capture phase for instant low-latency response
    window.addEventListener('pointerdown', handleClick, { passive: true, capture: true })

    return () => {
      window.removeEventListener('pointerdown', handleClick, { capture: true })
    }
  }, [])

  return null
}
