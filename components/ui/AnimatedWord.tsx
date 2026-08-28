'use client'
import React, { useState } from 'react'

interface AnimatedTextProps {
  text: string
  className?: string
  style?: React.CSSProperties
  highlightColor?: string
  effect?: 'lift' | 'glow' | 'gradient' | '3d-card'
}

export function AnimatedWord({
  word,
  className = '',
  style = {},
  effect = 'lift'
}: {
  word: string
  className?: string
  style?: React.CSSProperties
  effect?: 'lift' | 'glow' | 'gradient' | '3d-card'
}) {
  const [hovered, setHovered] = useState(false)

  const getEffectStyle = (): React.CSSProperties => {
    if (!hovered) {
      return {
        display: 'inline-block',
        transition: 'all 240ms cubic-bezier(0.34, 1.56, 0.64, 1)',
        cursor: 'default',
        transform: 'translateY(0) scale(1)',
      }
    }

    switch (effect) {
      case '3d-card':
        return {
          display: 'inline-block',
          transform: 'translateY(-5px) scale(1.1) perspective(400px) rotateX(10deg) rotateY(-4deg)',
          background: 'linear-gradient(135deg, rgba(99,102,241,0.18), rgba(6,182,212,0.18))',
          padding: '2px 8px',
          borderRadius: '8px',
          boxShadow: '0 8px 20px rgba(99,102,241,0.3), inset 0 1px 1px rgba(255,255,255,0.6)',
          border: '1px solid rgba(99,102,241,0.4)',
          transition: 'all 200ms cubic-bezier(0.34, 1.56, 0.64, 1)',
          cursor: 'pointer',
        }
      case 'glow':
        return {
          display: 'inline-block',
          transform: 'translateY(-4px) scale(1.08)',
          textShadow: '0 0 20px rgba(99,102,241,0.7), 0 0 35px rgba(6,182,212,0.5)',
          color: 'var(--brand)',
          transition: 'all 200ms cubic-bezier(0.34, 1.56, 0.64, 1)',
          cursor: 'pointer',
        }
      case 'gradient':
        return {
          display: 'inline-block',
          transform: 'translateY(-4px) scale(1.06)',
          filter: 'drop-shadow(0 6px 16px rgba(99,102,241,0.6))',
          transition: 'all 200ms cubic-bezier(0.34, 1.56, 0.64, 1)',
          cursor: 'pointer',
        }
      case 'lift':
      default:
        return {
          display: 'inline-block',
          transform: 'translateY(-4px) scale(1.06)',
          textShadow: '0 8px 20px rgba(99,102,241,0.45)',
          transition: 'all 200ms cubic-bezier(0.34, 1.56, 0.64, 1)',
          cursor: 'pointer',
        }
    }
  }

  return (
    <span
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`animated-hover-word ${className}`}
      style={{
        ...getEffectStyle(),
        ...style,
      }}
    >
      {word}
    </span>
  )
}

export function AnimatedSentence({
  text,
  className = '',
  wordClassName = '',
  effect = 'lift',
  separator = ' '
}: {
  text: string
  className?: string
  wordClassName?: string
  effect?: 'lift' | 'glow' | 'gradient' | '3d-card'
  separator?: string
}) {
  const words = text.split(separator)

  return (
    <span className={className}>
      {words.map((w, i) => (
        <React.Fragment key={i}>
          <AnimatedWord word={w} className={wordClassName} effect={effect} />
          {i < words.length - 1 ? ' ' : ''}
        </React.Fragment>
      ))}
    </span>
  )
}
