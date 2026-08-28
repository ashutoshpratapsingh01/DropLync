'use client'
import { useEffect } from 'react'

export function useScrollReveal(deps: unknown[] = []) {
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => entries.forEach(e => e.isIntersecting && e.target.classList.add('is-visible')),
      { threshold: 0.12 }
    )
    const timer = setTimeout(() => {
      document.querySelectorAll('.reveal').forEach(el => io.observe(el))
    }, 50)
    return () => { clearTimeout(timer); io.disconnect() }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
}
