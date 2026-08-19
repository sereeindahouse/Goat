import { useEffect, useRef, useState } from 'react'
import { heroConfig } from '../config'

const TYPE_SPEED = 38
const DELAY_BEFORE_TYPE = 600

export default function HeroOverlay() {
  const subtitleSource = heroConfig.subtitleLines.join('\n')
  const [displayedText, setDisplayedText] = useState('')
  const [typingDone, setTypingDone] = useState(false)
  const [cursorVisible, setCursorVisible] = useState(true)
  const [showButton, setShowButton] = useState(false)
  const indexRef = useRef(0)

  useEffect(() => {
    if (!subtitleSource) {
      setTypingDone(true)
      return
    }
    const delayTimer = setTimeout(() => {
      const typeInterval = setInterval(() => {
        indexRef.current += 1
        if (indexRef.current <= subtitleSource.length) {
          setDisplayedText(subtitleSource.slice(0, indexRef.current))
        } else {
          clearInterval(typeInterval)
          setTypingDone(true)
        }
      }, TYPE_SPEED)
      return () => clearInterval(typeInterval)
    }, DELAY_BEFORE_TYPE)

    return () => clearTimeout(delayTimer)
  }, [subtitleSource])

  useEffect(() => {
    if (!typingDone) return
    let blinkCount = 0
    const blinkInterval = setInterval(() => {
      blinkCount++
      setCursorVisible((v) => !v)
      if (blinkCount >= 6) {
        clearInterval(blinkInterval)
        setCursorVisible(false)
        setTimeout(() => setShowButton(true), 200)
      }
    }, 400)
    return () => clearInterval(blinkInterval)
  }, [typingDone])

  const handleScroll = () => {
    window.scrollTo({ top: window.innerHeight, behavior: 'smooth' })
  }

  if (!heroConfig.titleText && !subtitleSource && !heroConfig.ctaLabel) {
    return null
  }

  const subtitleLines = displayedText ? displayedText.split('\n') : []

  return (
    <div
      style={{
        position: 'relative',
        zIndex: 1,
        width: '100%',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0 24px',
      }}
    >
      {/* Main title */}
      {heroConfig.titleText && (
        <h1
          className="font-geist-mono"
          style={{
            fontSize: 'clamp(3rem, 8vw, 7rem)',
            fontWeight: 400,
            lineHeight: 1.0,
            letterSpacing: '-0.03em',
            color: '#ffffff',
            textShadow: '0 2px 30px rgba(0,0,0,0.5)',
            margin: 0,
            textAlign: 'center',
          }}
        >
          {heroConfig.titleText}
        </h1>
      )}

      {/* Typewritten subtitle */}
      {subtitleSource && (
        <div
          style={{
            marginTop: '32px',
            maxWidth: '820px',
            minHeight: '160px',
            textAlign: 'center',
          }}
        >
          {subtitleLines.map((line, i) => (
            <div
              key={i}
              style={{
                fontFamily: '"Inter", sans-serif',
                fontSize: 'clamp(1rem, 1.6vw, 1.2rem)',
                fontWeight: 500,
                lineHeight: 1.7,
                color: '#ffffff',
                textShadow: '0 2px 20px rgba(0,0,0,0.9), 0 0 8px rgba(0,0,0,0.6)',
                letterSpacing: '0.01em',
                whiteSpace: 'pre-wrap',
              }}
            >
              {line}
              {i === subtitleLines.length - 1 && (
                <span
                  style={{
                    display: 'inline-block',
                    width: '2px',
                    height: '1em',
                    background: cursorVisible ? 'rgba(255,255,255,0.8)' : 'transparent',
                    marginLeft: '4px',
                    verticalAlign: 'text-bottom',
                    transition: 'background 0.1s',
                  }}
                />
              )}
            </div>
          ))}
        </div>
      )}

      {/* CTA */}
      {heroConfig.ctaLabel && (
        <div
          style={{
            marginTop: '120px',
            opacity: showButton ? 1 : 0,
            transform: showButton ? 'translateY(0)' : 'translateY(20px)',
            transition: 'opacity 0.8s ease, transform 0.8s ease',
          }}
        >
          <button
            onClick={handleScroll}
            className="liquid-glass-strong"
            style={{
              padding: '14px 40px',
              fontSize: '0.9rem',
              fontWeight: 400,
              color: '#ffffff',
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              borderRadius: '2px',
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.25)',
              cursor: 'none',
              fontFamily: '"Geist Mono", monospace',
            }}
          >
            {heroConfig.ctaLabel}
          </button>
        </div>
      )}

      {heroConfig.roomLabel && (
        <div
          className="font-mono-data"
          style={{
            position: 'absolute',
            bottom: '32px',
            left: '50%',
            transform: 'translateX(-50%)',
            fontSize: '0.7rem',
            color: 'rgba(255,255,255,0.35)',
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
          }}
        >
          {heroConfig.roomLabel}
        </div>
      )}
    </div>
  )
}
