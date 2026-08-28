'use client'
import React, { useEffect, useRef } from 'react'

export default function Background3D() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationFrameId: number
    let width = (canvas.width = window.innerWidth)
    let height = (canvas.height = window.innerHeight)

    const handleResize = () => {
      if (!canvas) return
      width = canvas.width = window.innerWidth
      height = canvas.height = window.innerHeight
    }
    window.addEventListener('resize', handleResize)

    // Particle nodes for 3D constellation & geometric shapes
    const particleCount = Math.min(Math.floor((width * height) / 24000), 70)
    interface Node3D {
      x: number
      y: number
      z: number
      vx: number
      vy: number
      vz: number
      radius: number
      baseHue: number
      rotation: number
      rotSpeed: number
      isGeometric: boolean
    }

    const nodes: Node3D[] = []
    for (let i = 0; i < particleCount; i++) {
      nodes.push({
        x: (Math.random() - 0.5) * width * 1.25,
        y: (Math.random() - 0.5) * height * 1.25,
        z: Math.random() * 850 + 100,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35,
        vz: (Math.random() - 0.5) * 0.25,
        radius: Math.random() * 2.6 + 1.2,
        baseHue: i % 2 === 0 ? 218 : 195, // Sapphire Blue / Cyan
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.015,
        isGeometric: i % 6 === 0
      })
    }

    let mouseX = 0
    let mouseY = 0
    let targetMouseX = 0
    let targetMouseY = 0

    const handleMouseMove = (e: MouseEvent) => {
      targetMouseX = (e.clientX - width / 2) * 0.04
      targetMouseY = (e.clientY - height / 2) * 0.04
    }
    window.addEventListener('mousemove', handleMouseMove, { passive: true })

    const fov = 420

    const render = () => {
      mouseX += (targetMouseX - mouseX) * 0.05
      mouseY += (targetMouseY - mouseY) * 0.05

      ctx.clearRect(0, 0, width, height)

      const isDark = document.documentElement.classList.contains('dark')
      const lineAlphaBase = isDark ? 0.22 : 0.1
      const pointAlphaBase = isDark ? 0.7 : 0.45

      nodes.sort((a, b) => b.z - a.z)

      const projected: { x: number; y: number; scale: number; node: Node3D; alpha: number }[] = []

      for (const node of nodes) {
        node.x += node.vx
        node.y += node.vy
        node.z += node.vz
        node.rotation += node.rotSpeed

        if (node.x < -width) node.x = width
        if (node.x > width) node.x = -width
        if (node.y < -height) node.y = height
        if (node.y > height) node.y = -height
        if (node.z < 50) node.z = 950
        if (node.z > 950) node.z = 50

        const scale = fov / (fov + node.z)
        const projX = (node.x - mouseX * (node.z / 200)) * scale + width / 2
        const projY = (node.y - mouseY * (node.z / 200)) * scale + height / 2
        const alpha = (1 - node.z / 1000) * pointAlphaBase

        projected.push({ x: projX, y: projY, scale, node, alpha })
      }

      // Draw connection lines
      for (let i = 0; i < projected.length; i++) {
        for (let j = i + 1; j < projected.length; j++) {
          const p1 = projected[i]
          const p2 = projected[j]
          const dx = p1.x - p2.x
          const dy = p1.y - p2.y
          const dist = Math.sqrt(dx * dx + dy * dy)

          if (dist < 140) {
            const lineAlpha = (1 - dist / 140) * lineAlphaBase * Math.min(p1.scale, p2.scale)
            ctx.beginPath()
            ctx.strokeStyle = p1.node.baseHue === 218
              ? `rgba(37, 99, 235, ${lineAlpha})`
              : `rgba(6, 182, 212, ${lineAlpha})`
            ctx.lineWidth = Math.min(p1.scale, p2.scale) * 1.3
            ctx.moveTo(p1.x, p1.y)
            ctx.lineTo(p2.x, p2.y)
            ctx.stroke()
          }
        }
      }

      // Draw nodes & 3D geometry
      for (const p of projected) {
        const { x, y, scale, node, alpha } = p
        const r = node.radius * scale * 1.8

        if (node.isGeometric) {
          ctx.save()
          ctx.translate(x, y)
          ctx.rotate(node.rotation)
          ctx.strokeStyle = `rgba(37, 99, 235, ${alpha * 1.3})`
          ctx.lineWidth = 1.2 * scale
          ctx.fillStyle = `rgba(6, 182, 212, ${alpha * 0.12})`

          ctx.beginPath()
          const sides = 6
          const size = r * 3.6
          for (let s = 0; s < sides; s++) {
            const angle = (s * 2 * Math.PI) / sides
            const sx = Math.cos(angle) * size
            const sy = Math.sin(angle) * size
            if (s === 0) ctx.moveTo(sx, sy)
            else ctx.lineTo(sx, sy)
          }
          ctx.closePath()
          ctx.fill()
          ctx.stroke()
          ctx.restore()
        } else {
          const gradient = ctx.createRadialGradient(x, y, 0, x, y, r * 3)
          gradient.addColorStop(0, node.baseHue === 218 ? `rgba(37, 99, 235, ${alpha})` : `rgba(6, 182, 212, ${alpha})`)
          gradient.addColorStop(1, 'rgba(37, 99, 235, 0)')

          ctx.beginPath()
          ctx.arc(x, y, r * 3, 0, Math.PI * 2)
          ctx.fillStyle = gradient
          ctx.fill()

          ctx.beginPath()
          ctx.arc(x, y, Math.max(r, 0.8), 0, Math.PI * 2)
          ctx.fillStyle = node.baseHue === 218 ? `rgba(96, 165, 250, ${alpha * 1.5})` : `rgba(34, 211, 238, ${alpha * 1.5})`
          ctx.fill()
        }
      }

      animationFrameId = requestAnimationFrame(render)
    }

    render()

    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('mousemove', handleMouseMove)
      cancelAnimationFrame(animationFrameId)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 0,
        opacity: 0.85
      }}
    />
  )
}
