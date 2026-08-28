'use client'
import React from 'react'

interface LogoProps {
  height?: number
  className?: string
  style?: React.CSSProperties
}

export default function Logo({ height = 32, className, style }: LogoProps) {
  // Ratio is 220 : 52
  const width = Math.round((height / 52) * 220)

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 220 52"
      fill="none"
      height={height}
      width={width}
      className={className}
      style={{
        display: 'inline-block',
        verticalAlign: 'middle',
        filter: 'drop-shadow(0 2px 8px rgba(37,99,235,0.25))',
        ...style
      }}
    >
      <defs>
        {/* Quantum Sapphire & Cyan Refraction Gradients */}
        <linearGradient id="prismTop" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="100%" stopColor="#0284c7" />
        </linearGradient>
        <linearGradient id="prismLeft" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#2563eb" />
          <stop offset="100%" stopColor="#1e3a8a" />
        </linearGradient>
        <linearGradient id="prismRight" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0ea5e9" />
          <stop offset="100%" stopColor="#1d4ed8" />
        </linearGradient>
        <linearGradient id="coreBeam" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="50%" stopColor="#38bdf8" />
          <stop offset="100%" stopColor="#00f2fe" />
        </linearGradient>
        <linearGradient id="wordGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="100%" stopColor="#06b6d4" />
        </linearGradient>
        <filter id="prismGlow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="3.5" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* 3D Quantum Hyper-Prism Icon */}
      <g transform="translate(6, 6)">
        {/* Ambient Sapphire Aura */}
        <circle cx="20" cy="20" r="16" fill="#2563eb" opacity="0.25" filter="url(#prismGlow)" />

        {/* 3D Isometric Crystal Cube Faces */}
        <polygon points="20,4 34,12 20,20 6,12" fill="url(#prismTop)" opacity="0.95" />
        <polygon points="6,12 20,20 20,36 6,28" fill="url(#prismLeft)" />
        <polygon points="20,20 34,12 34,28 20,36" fill="url(#prismRight)" />

        {/* Internal Crystalline Light Beam (Data Stream Core) */}
        <path d="M20,6 L20,34" stroke="url(#coreBeam)" strokeWidth="2.5" strokeLinecap="round" filter="url(#prismGlow)" />
        
        {/* Floating Center Data Shard */}
        <circle cx="20" cy="20" r="3.2" fill="#ffffff" filter="url(#prismGlow)" />
        <circle cx="20" cy="20" r="1.8" fill="#00f2fe" />

        {/* Specular Highlight Lines on Facets */}
        <polyline points="6,12 20,20 34,12" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="1.2" />
        <line x1="20" y1="20" x2="20" y2="36" stroke="rgba(255,255,255,0.35)" strokeWidth="1.2" />
      </g>

      {/* "Drop" text: light in dark mode, hard dark in light mode via CSS variable var(--text-1) */}
      <text
        x="56"
        y="34"
        fontFamily="'Plus Jakarta Sans', 'Inter', system-ui, -apple-system, sans-serif"
        fontWeight="900"
        fontSize="25"
        fill="var(--text-1, #0f172a)"
        letterSpacing="-0.04em"
      >
        Drop
      </text>

      {/* "Lync" gradient cyan/blue text */}
      <text
        x="119"
        y="34"
        fontFamily="'Plus Jakarta Sans', 'Inter', system-ui, -apple-system, sans-serif"
        fontWeight="900"
        fontSize="25"
        fill="url(#wordGrad)"
        letterSpacing="-0.04em"
      >
        Lync
      </text>

      {/* Quantum Pulse Dot */}
      <circle cx="182" cy="23" r="3.2" fill="#00f2fe" filter="url(#prismGlow)" />
    </svg>
  )
}
